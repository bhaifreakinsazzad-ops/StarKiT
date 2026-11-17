/**
 * StarkiT Application Orchestrator
 * Coordinates Interactive Showroom, Modular Product Grid, PDP Viewer, Fit Guide,
 * Cart & Checkout, Order Confirmation, and Hardened Admin Portal.
 */
import { initSpatialHero } from './spatial-three.js';
import { initMotionEngine, luxuryToast } from './interactive-anime.js';
import { escapeHtml } from './core/validation.js';
import { getPrimaryVariant, getPrimaryImage } from './core/catalog-schema.js';
import { initCartDrawer } from './modules/cart-drawer.js';
import { initShowroomHero } from './modules/showroom-hero.js';
import { initOfferDisplay } from './modules/offer-display.js';
import { initProductGrid } from './modules/product-grid.js';
import { initProductViewer } from './modules/product-viewer.js';
import { initCheckoutForm } from './modules/checkout-form.js';
import { initOrderConfirmation } from './modules/order-confirmation.js';
import { initAdminManager } from './modules/admin-manager.js';

function setupNavigation() {
  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.getElementById('mainNav');

  // Ensure accurate active link highlight across all storefront and policy pages
  if (mainNav) {
    const path = (window.location.pathname || '').toLowerCase();
    const links = Array.from(mainNav.querySelectorAll('a'));
    links.forEach((a) => a.classList.remove('active'));
    const matchLink = links.find((a) => {
      const href = (a.getAttribute('href') || '').toLowerCase();
      if ((path === '/' || path.endsWith('/index.html') || path.endsWith('/index')) && href.includes('index.html')) {
        return true;
      }
      if ((path.includes('/shop') || path.includes('/products/')) && href.includes('shop.html')) {
        return true;
      }
      if (path.includes('/about') && href.includes('about.html')) {
        return true;
      }
      if (path.includes('/shipping') && href.includes('shipping.html')) {
        return true;
      }
      return false;
    });
    if (matchLink) matchLink.classList.add('active');
  }

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = mainNav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(open));
    });

    mainNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', (e) => {
      if (mainNav.classList.contains('open') && !mainNav.contains(e.target) && e.target !== menuToggle) {
        mainNav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Global Escape & backdrop dismissal for modals and drawers
  const modalIds = ['quickViewModal', 'compareModal', 'fitModal'];
  modalIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        if (e.target === el) el.classList.remove('open');
      });
    }
  });

  ['sevenGateModal', 'invoiceModal', 'drivePreviewModal', 'driveImportConfirmModal'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        if (e.target === el) el.style.display = 'none';
      });
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (mainNav && mainNav.classList.contains('open')) {
      mainNav.classList.remove('open');
      menuToggle?.setAttribute('aria-expanded', 'false');
    }
    ['quickViewModal', 'compareModal', 'fitModal'].forEach((id) => {
      document.getElementById(id)?.classList.remove('open');
    });
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('overlay');
    if (drawer?.classList.contains('open')) {
      drawer.classList.remove('open');
      overlay?.classList.remove('open');
      document.body.classList.remove('locked');
    }
    ['sevenGateModal', 'invoiceModal', 'drivePreviewModal', 'driveImportConfirmModal'].forEach((id) => {
      const m = document.getElementById(id);
      if (m && m.style.display && m.style.display !== 'none') {
        m.style.display = 'none';
      }
    });
  });
}

function setupLightbox() {
  const zoomEl = document.getElementById('zoom');
  const zoomImg = document.getElementById('zoomImg');
  if (!zoomEl || !zoomImg) return () => {};

  const closeZoom = () => {
    zoomEl.classList.remove('open');
    document.body.classList.remove('locked');
  };

  zoomEl.querySelector('button')?.addEventListener('click', closeZoom);
  zoomEl.addEventListener('click', (e) => {
    if (e.target === zoomEl) closeZoom();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && zoomEl.classList.contains('open')) closeZoom();
  });

  return (src, alt = '') => {
    if (!src) return;
    zoomImg.src = src;
    zoomImg.alt = alt;
    zoomEl.classList.add('open');
    document.body.classList.add('locked');
  };
}

function setupLookbook({ products, base }) {
  const track = document.getElementById('looksTrack');
  if (!track || !Array.isArray(products)) return;

  const order = [
    'STK-H007',
    'FT-HM-001',
    'STK-H009',
    'FT-JWL-001',
    'STK-H001',
    'FT-BA-001',
    'STK-H004',
    'FT-HM-002',
    'STK-H003',
    'FT-JWL-005',
    'STK-H005',
    'FT-BA-010',
    'STK-H011',
    'STK-H013',
    'STK-H014'
  ];

  const byId = new Map(products.map((p) => [p.id, p]));
  track.innerHTML = order
    .map((id, i) => {
      const p = byId.get(id);
      if (!p) return '';
      const v = getPrimaryVariant(p);
      const imgObj = getPrimaryImage(p, v);
      const imgPath = imgObj?.url ? String(imgObj.url).replace(/^\//, '') : '';
      const pdpHref = `${base}products/${escapeHtml(p.slug)}.html`;
      const categoryLabel = p.collection || p.category || 'Drop 01';

      return `
        <article class="look-tile">
          <div class="look-photo">
            <a href="${pdpHref}">
              ${
                imgPath
                  ? `<img loading="lazy" referrerpolicy="no-referrer" src="${base}${escapeHtml(imgPath)}" alt="${escapeHtml(p.name)}">`
                  : `<div class="concept-slate">
                       <div class="stage-swatch-disc" style="width:48px;height:48px;background:${escapeHtml(v?.hex || '#170000')};"></div>
                       <strong>${escapeHtml(p.name)}</strong>
                       <small>Concept Design · Media Pending</small>
                     </div>`
              }
            </a>
          </div>
          <div class="look-meta">
            <div>
              <small>Look ${String(i + 1).padStart(2, '0')} · ${escapeHtml(categoryLabel)}</small>
              <h3>${escapeHtml(p.name)}</h3>
            </div>
            <a href="${pdpHref}">Inspect →</a>
          </div>
        </article>`;
    })
    .join('');

  document.querySelectorAll('[data-look]').forEach((btn) => {
    btn.addEventListener('click', () => {
      track.scrollBy({
        left: parseInt(btn.dataset.look, 10) * Math.min(460, track.clientWidth * 0.8),
        behavior: 'smooth'
      });
    });
  });
}

function setupFitGuideModal({ base }) {
  const fitTrigger = document.querySelectorAll('[data-open-fit-guide]');
  if (!fitTrigger.length && !document.querySelector('[data-detail-product]')) return;

  let modal = document.getElementById('fitModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'fitModal';
    modal.className = 'fit-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'StarkiT Fit Guide & Size Calculator');
    modal.innerHTML = `
      <div class="fit-modal-card">
        <div class="fit-modal-head">
          <div style="display:flex;align-items:center;gap:12px;">
            <img src="${base}assets/images/starkit-logo-transparent.png" alt="StarkiT" style="height:24px;width:auto;">
            <h3>Fit Finder &amp; Garment Specs</h3>
          </div>
          <button type="button" id="closeFitModalBtn" class="close-btn" aria-label="Close fit guide">×</button>
        </div>
        <div class="fit-modal-body">
          <p class="muted" style="font-size:0.9rem;margin-bottom:14px;">Heavyweight 330–350 GSM fleece specification (pending batch verification on unapproved runs). Select your stats for a tailored drape suggestion:</p>
          <div class="form-grid fit-finder-grid">
            <div class="form-row" style="margin:0;">
              <label for="fitHeight">Height</label>
              <select id="fitHeight">
                <option value="160">Under 5'5"</option>
                <option value="168" selected>5'5" – 5'7"</option>
                <option value="175">5'8" – 5'10"</option>
                <option value="183">5'11"+</option>
              </select>
            </div>
            <div class="form-row" style="margin:0;">
              <label for="fitBuild">Build</label>
              <select id="fitBuild">
                <option value="slim">Slim</option>
                <option value="regular" selected>Regular</option>
                <option value="broad">Broad</option>
              </select>
            </div>
            <div class="form-row" style="margin:0;">
              <label for="fitDrape">Drape</label>
              <select id="fitDrape">
                <option value="standard" selected>Standard</option>
                <option value="oversized">Oversized</option>
              </select>
            </div>
          </div>
          <div class="notice" id="fitCalcResult" style="margin:16px 0;">
            <strong>Recommended Fit:</strong> <span id="fitRecSize">Size L (42" Chest × 28" Length)</span>
          </div>
          <table class="fit-table">
            <thead><tr><th>Size</th><th>Chest</th><th>Body Length</th><th>Sleeve</th></tr></thead>
            <tbody>
              <tr><td><strong>M</strong></td><td>40 in</td><td>27 in</td><td>24.5 in</td></tr>
              <tr><td><strong>L</strong></td><td>42 in</td><td>28 in</td><td>25.5 in</td></tr>
              <tr><td><strong>XL</strong></td><td>44 in</td><td>29 in</td><td>26.5 in</td></tr>
              <tr><td><strong>XXL</strong></td><td>46 in</td><td>30 in</td><td>27.5 in</td></tr>
            </tbody>
          </table>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  const updateRec = () => {
    const h = parseInt(document.getElementById('fitHeight')?.value || '168', 10);
    const b = document.getElementById('fitBuild')?.value || 'regular';
    const d = document.getElementById('fitDrape')?.value || 'standard';
    let idx = h <= 163 ? 0 : h <= 170 ? 1 : h <= 178 ? 2 : 3;
    if (b === 'broad') idx = Math.min(3, idx + 1);
    if (b === 'slim' && idx > 0) idx -= 1;
    if (d === 'oversized') idx = Math.min(3, idx + 1);
    const specs = ['M (40" Chest × 27" Length)', 'L (42" Chest × 28" Length)', 'XL (44" Chest × 29" Length)', 'XXL (46" Chest × 30" Length)'];
    const recEl = document.getElementById('fitRecSize');
    if (recEl) recEl.textContent = `Size ${specs[idx]}`;
  };

  modal.querySelectorAll('select').forEach((s) => s.addEventListener('change', updateRec));
  modal.querySelector('#closeFitModalBtn')?.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-fit-guide]') || e.target.closest('#openFitModalBtn')) {
      modal.classList.add('open');
    }
  });
}

function setupVipEarlyAccess() {
  const form = document.getElementById('vipNotifyForm');
  const noteEl = document.getElementById('vipNotifyStatus');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="tel"]');
    const phone = input ? input.value.trim() : '';
    if (!phone || !/^(?:\+?880|0)1[3-9]\d{8}$/.test(phone.replace(/[\s-]/g, ''))) {
      luxuryToast('Please enter a valid Bangladesh mobile number (01XXXXXXXXX).');
      return;
    }
    // Zero persistent localStorage PII — transient confirmation only + optional Meta Lead pixel event
    form.reset();
    if (noteEl) {
      noteEl.hidden = false;
      noteEl.textContent = 'Request noted for this session. Drop release updates are also announced via WhatsApp at 01778307704.';
    }
    luxuryToast('Early release notification noted.');
    if (typeof window.fbq === 'function') {
      try {
        window.fbq('track', 'Lead', { content_name: 'StarkiT Drop 01 Early Access' });
      } catch {}
    }
  });
}

function applyPublicStorefrontState({ stateJson, products, storeConfig }) {
  if (!stateJson || typeof stateJson !== 'object') return false;
  let mutated = false;

  if (Array.isArray(stateJson.settings) && stateJson.settings.length) {
    const lookup = Object.fromEntries(stateJson.settings.map((s) => [s.key, s.value]));
    if (typeof lookup.cod_enabled === 'boolean') {
      storeConfig.cod_enabled = lookup.cod_enabled;
      mutated = true;
    }
    if (typeof lookup.store_mode === 'string' && lookup.store_mode) {
      storeConfig.mode = lookup.store_mode;
      mutated = true;
    }
    if (Number.isFinite(Number(lookup.delivery_dhaka_bdt))) {
      storeConfig.delivery_dhaka = Number(lookup.delivery_dhaka_bdt);
      mutated = true;
    }
    if (Number.isFinite(Number(lookup.delivery_outside_bdt))) {
      storeConfig.delivery_outside = Number(lookup.delivery_outside_bdt);
      mutated = true;
    }
    if (Number.isFinite(Number(lookup.free_shipping_threshold))) {
      storeConfig.free_shipping_threshold = Number(lookup.free_shipping_threshold);
      mutated = true;
    }
    if (typeof lookup.support_phone === 'string' && lookup.support_phone) {
      storeConfig.support_phone = lookup.support_phone;
      mutated = true;
    }
  }

  if (Array.isArray(stateJson.promotions) && stateJson.promotions.length) {
    window.STARKIT_PROMOTIONS = stateJson.promotions;
    mutated = true;
  }

  if (Array.isArray(stateJson.products) && stateJson.products.length && Array.isArray(products)) {
    const prodMap = new Map(stateJson.products.map((p) => [p.id, p]));
    for (const p of products) {
      const remote = prodMap.get(p.id);
      if (!remote) continue;
      if (remote.price_tier) p.price_tier = remote.price_tier;
      if (Number.isFinite(Number(remote.price_bdt)) && Number(remote.price_bdt) > 0) p.price_bdt = Number(remote.price_bdt);
      if (Number.isFinite(Number(remote.draft_price_bdt)) && Number(remote.draft_price_bdt) > 0) p.draft_price_bdt = Number(remote.draft_price_bdt);
      if (typeof remote.price_approved === 'boolean') p.price_approved = remote.price_approved;
      if (remote.approval_status) p.approval_status = remote.approval_status;
      if (remote.publication_status) p.publication_status = remote.publication_status;
      if (typeof remote.rights_verified === 'boolean') p.rights_verified = remote.rights_verified;
      if (typeof remote.specifications_verified === 'boolean') p.specifications_verified = remote.specifications_verified;
      if (typeof remote.stock_verified === 'boolean') p.stock_verified = remote.stock_verified;
      if (typeof remote.commercial_terms_verified === 'boolean') p.commercial_terms_verified = remote.commercial_terms_verified;
      mutated = true;
    }
  }

  if (Array.isArray(stateJson.variants) && stateJson.variants.length && Array.isArray(products)) {
    const varMap = new Map(stateJson.variants.map((v) => [v.sku, v]));
    for (const p of products) {
      for (const v of p.variants || []) {
        const remote = varMap.get(v.sku);
        if (!remote) continue;
        if (remote.status) v.status = remote.status;
        if (Number.isFinite(Number(remote.price_bdt)) && Number(remote.price_bdt) > 0) v.price_bdt = Number(remote.price_bdt);
        if (typeof remote.price_approved === 'boolean') v.price_approved = remote.price_approved;
        if (Number.isInteger(remote.stock_quantity)) v.stock_quantity = remote.stock_quantity;
        if (Array.isArray(remote.sizes)) v.available_sizes = remote.sizes;
        if (typeof remote.approved_for_publication === 'boolean') v.approved_for_publication = remote.approved_for_publication;
        if (Array.isArray(remote.gallery) && remote.gallery.length > 0) v.gallery = remote.gallery;
        mutated = true;
      }
    }
  }

  return mutated;
}

async function boot() {
  const base = window.STARKIT_BASE || './';
  const storeConfig = (window.STARKIT_CONFIG = window.STARKIT_CONFIG || {});
  const products = window.STARKIT_CATALOG || [];

  setupNavigation();
  const openZoom = setupLightbox();

  // Admin portal initializes only when loginGate exists
  if (document.getElementById('loginGate')) {
    initAdminManager();
    return;
  }

  const cartApi = initCartDrawer({ products, base, storeConfig });

  let spatialScene = null;
  if (document.getElementById('spatialHeroContainer')) {
    spatialScene = initSpatialHero('spatialHeroContainer');
  }

  let showroomApi = null;
  if (document.getElementById('showroomStage')) {
    showroomApi = initShowroomHero({
      products,
      base,
      spatialScene,
      storeConfig,
      onAddToCart: (p, v, sz, qty) => cartApi.addItem(p, v, sz, qty),
      onOpenZoom: openZoom
    });
  }

  const gridApi = initProductGrid({
    products,
    base,
    storeConfig,
    onAddToCart: (p, v, sz, qty) => cartApi.addItem(p, v, sz, qty)
  });

  if (document.getElementById('priceTiersMount') || document.getElementById('offerDisplayMount')) {
    initOfferDisplay({
      products,
      onSelectTier: (tierCode) => gridApi?.setTierFilter(tierCode)
    });
  }

  setupLookbook({ products, base });
  const viewerApi = initProductViewer({
    products,
    base,
    storeConfig,
    onAddToCart: (p, v, sz, qty) => cartApi.addItem(p, v, sz, qty),
    onOpenZoom: openZoom
  });
  const checkoutApi = initCheckoutForm({ base, storeConfig, cartApi });
  initOrderConfirmation({ base });
  setupFitGuideModal({ base });
  setupVipEarlyAccess();
  initMotionEngine();

  // Async sync of live backend storefront state (falls back cleanly to static promotions.json)
  let hydrated = false;
  try {
    const stateRes = await fetch(`${base}api/admin?action=public_storefront_state`, { cache: 'no-store' });
    if (stateRes.ok) {
      const stateJson = await stateRes.json();
      hydrated = applyPublicStorefrontState({ stateJson, products, storeConfig });
    }
  } catch {
    // API unavailable in pure offline preview; fall back below
  }

  if (!hydrated && storeConfig.promotions_endpoint) {
    try {
      const promoUrl = `${base}${String(storeConfig.promotions_endpoint).replace(/^\//, '')}`;
      const res = await fetch(promoUrl, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.promotions)) {
          window.STARKIT_PROMOTIONS = json.promotions;
          hydrated = true;
        }
      }
    } catch {
      // Fall back silently to DEFAULT_PROMOTIONS bundled in pricing-engine
    }
  }

  if (hydrated) {
    showroomApi?.refresh();
    gridApi?.refresh();
    viewerApi?.refresh();
    cartApi?.refresh();
    checkoutApi?.refresh();
    if (document.getElementById('priceTiersMount') || document.getElementById('offerDisplayMount')) {
      initOfferDisplay({
        products,
        onSelectTier: (tierCode) => gridApi?.setTierFilter(tierCode)
      });
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
