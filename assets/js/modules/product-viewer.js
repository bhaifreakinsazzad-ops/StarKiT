import { escapeHtml, formatBdt } from '../core/validation.js';
import { getPrimaryVariant, isVariantPurchasable } from '../core/catalog-schema.js';
import { animateGallerySwap } from '../interactive-anime.js';

export function initProductViewer({ products, base, storeConfig, onAddToCart, onOpenZoom }) {
  const detailRoot = document.querySelector('[data-detail-product]');
  if (!detailRoot) return;

  const productId = detailRoot.dataset.detailProduct;
  const product = (products || []).find((p) => p.id === productId);
  if (!product) return;

  const colorsEl = document.getElementById('detailColors');
  const thumbsEl = document.getElementById('detailThumbs');
  const galleryEl = document.getElementById('detailGallery');
  const skuEl = document.getElementById('detailSku');
  const sizeContainer = document.getElementById('detailSize');
  const purchaseBtn = document.getElementById('purchaseBtn');
  const purchaseStatus = document.getElementById('purchaseStatus');
  const whatsappBtn = document.getElementById('whatsappBtn');
  const mobileStickyBtn = document.getElementById('mobileStickyBtn');
  const mobileStickyLabel = document.getElementById('mobileStickyLabel');

  let activeVariant = getPrimaryVariant(product);
  let activeGalleryIndex = 0;
  let selectedSize =
    activeVariant && Array.isArray(activeVariant.available_sizes) && activeVariant.available_sizes[0]
      ? activeVariant.available_sizes[0]
      : '';
  let qty = 1;

  function viewLabel(view) {
    if (view === 'front') return 'Front View';
    if (view === 'back') return 'Back Print';
    if (String(view || '').startsWith('detail')) return 'Craft Detail';
    return 'Studio Look';
  }

  function renderGallery() {
    if (!galleryEl || !thumbsEl || !activeVariant) return;
    const gallery = Array.isArray(activeVariant.gallery) ? activeVariant.gallery : [];

    if (!gallery.length) {
      galleryEl.innerHTML = `
        <div class="stage-provisional-slate">
          <div class="stage-swatch-disc" style="background:${escapeHtml(activeVariant.hex)};"></div>
          <div class="eyebrow" style="margin-bottom:8px;">${product.is_concept || product.concept_stage ? 'Concept Design · Media Pending' : 'Colorway Slot · Media Pending'}</div>
          <h3 style="margin:0 0 8px;">${escapeHtml(product.name)} · ${escapeHtml(activeVariant.color)}</h3>
          <p style="margin:0;color:var(--mute);max-width:34ch;font-size:0.9rem;">
            SKU <strong>${escapeHtml(activeVariant.sku)}</strong> is allocated in the 60-variant catalog architecture. Product photography and fit verification must be uploaded in Admin before checkout is enabled.
          </p>
        </div>`;
      thumbsEl.innerHTML = `
        <button class="thumb" type="button" disabled title="Model shoot pending">
          <span style="font-size:0.65rem;font-family:var(--font-mono);color:var(--mute);">Model Pending</span>
        </button>`;
      return;
    }

    const item = gallery[activeGalleryIndex] || gallery[0];
    const src = base + String(item.url || '').replace(/^\//, '');

    galleryEl.innerHTML = `
      <img src="${escapeHtml(src)}" alt="${escapeHtml(product.name)} — ${escapeHtml(activeVariant.color)} (${escapeHtml(viewLabel(item.view))})" referrerpolicy="no-referrer">
      <span class="view-tag">${escapeHtml(viewLabel(item.view))}</span>`;

    galleryEl.onclick = () => {
      if (onOpenZoom) onOpenZoom(src, `${product.name} — ${activeVariant.color}`);
    };

    thumbsEl.innerHTML =
      gallery
        .map((g, idx) => {
          const thumbSrc = base + String(g.url || '').replace(/^\//, '');
          return `
            <button type="button" class="thumb ${idx === activeGalleryIndex ? 'active' : ''}" data-thumb-idx="${idx}" aria-label="Show ${escapeHtml(viewLabel(g.view))}">
              <img src="${escapeHtml(thumbSrc)}" alt="" loading="lazy" referrerpolicy="no-referrer">
            </button>`;
        })
        .join('') +
      `<button type="button" class="thumb" disabled aria-label="Model shoot pending studio schedule" title="Model View — Shoot Pending">
         <span style="display:grid;place-items:center;height:100%;font-size:0.64rem;font-family:var(--font-mono);color:var(--mute);line-height:1.15;">Model<br>Pending</span>
       </button>`;

    thumbsEl.querySelectorAll('[data-thumb-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeGalleryIndex = Number(btn.dataset.thumbIdx) || 0;
        renderGallery();
        animateGallerySwap(galleryEl);
      });
    });
  }

  function renderColors() {
    if (!colorsEl) return;
    colorsEl.innerHTML = (product.variants || [])
      .map((v) => {
        const isProv = v.status !== 'DOCUMENTED';
        const selected = activeVariant && v.sku === activeVariant.sku;
        return `
          <button
            type="button"
            class="color-chip ${selected ? 'selected' : ''}"
            data-variant="${escapeHtml(v.sku)}"
          >
            <span class="color-dot" style="background:${escapeHtml(v.hex)}"></span>
            <span>${escapeHtml(v.color)}${isProv ? ' · Pending' : ''}</span>
          </button>`;
      })
      .join('');

    colorsEl.querySelectorAll('[data-variant]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = (product.variants || []).find((v) => v.sku === btn.dataset.variant);
        if (!next) return;
        activeVariant = next;
        activeGalleryIndex = 0;
        selectedSize =
          next.available_sizes && next.available_sizes.length ? next.available_sizes[0] : '';
        if (skuEl) skuEl.textContent = next.sku;
        renderColors();
        renderGallery();
        renderSizes();
        updatePurchaseState();
      });
    });
  }

  function renderSizes() {
    if (!sizeContainer || !activeVariant) return;
    const sizes = activeVariant.available_sizes || [];
    if (!sizes.length) {
      sizeContainer.innerHTML = `
        <div class="notice">
          Size availability is paused for <strong>${escapeHtml(activeVariant.sku)}</strong> while photography and garment inspection remain pending.
        </div>`;
      return;
    }
    if (!sizes.includes(selectedSize)) selectedSize = sizes[0];

    sizeContainer.innerHTML = `
      <div class="detail-choice">
        <strong>Select Size</strong>
        <button type="button" class="fit-trigger-link" data-open-fit-guide>Fit &amp; Size Guide</button>
      </div>
      <div class="panel-sizes" style="margin-bottom:14px;">
        ${sizes
          .map(
            (sz) =>
              `<button type="button" class="size-chip ${selectedSize === sz ? 'selected' : ''}" data-size-val="${escapeHtml(sz)}">${escapeHtml(sz)}</button>`
          )
          .join('')}
      </div>
      <div class="detail-choice">
        <strong>Quantity</strong>
        <div class="qty-stepper">
          <button type="button" id="pdpQtyDec" aria-label="Decrease quantity">−</button>
          <input type="number" id="pdpQtyInput" value="${qty}" min="1" max="20" aria-label="Quantity">
          <button type="button" id="pdpQtyInc" aria-label="Increase quantity">+</button>
        </div>
      </div>`;

    sizeContainer.querySelectorAll('[data-size-val]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedSize = btn.dataset.sizeVal;
        renderSizes();
        updatePurchaseState();
      });
    });

    sizeContainer.querySelector('#pdpQtyDec')?.addEventListener('click', () => {
      qty = Math.max(1, qty - 1);
      renderSizes();
    });
    sizeContainer.querySelector('#pdpQtyInc')?.addEventListener('click', () => {
      qty = Math.min(20, qty + 1);
      renderSizes();
    });
    sizeContainer.querySelector('#pdpQtyInput')?.addEventListener('change', (e) => {
      const n = parseInt(e.target.value, 10);
      qty = Number.isInteger(n) && n >= 1 && n <= 20 ? n : 1;
      e.target.value = String(qty);
    });
  }

  function updatePurchaseState() {
    if (!purchaseBtn || !activeVariant) return;
    const purchasable = isVariantPurchasable(product, activeVariant, storeConfig);

    if (whatsappBtn) {
      const msg = encodeURIComponent(
        `Hello StarkiT! I am inquiring about "${product.name}" (SKU: ${activeVariant.sku}, Color: ${activeVariant.color}, Size: ${selectedSize || 'Standard'}, Tier Price: ${formatBdt(product.price_bdt)}).`
      );
      whatsappBtn.href = `https://wa.me/8801778307704?text=${msg}`;
    }

    if (mobileStickyLabel) {
      mobileStickyLabel.textContent = `${activeVariant.color} · ${formatBdt(product.price_bdt)}`;
    }

    if (purchasable) {
      purchaseBtn.disabled = false;
      purchaseBtn.textContent = `Add to Bag · ${formatBdt(product.price_bdt)}`;
      if (mobileStickyBtn) {
        mobileStickyBtn.disabled = false;
        mobileStickyBtn.textContent = `Add · ${formatBdt(product.price_bdt)}`;
      }
      if (purchaseStatus) {
        purchaseStatus.textContent = `${Number(activeVariant.stock_quantity)} units in stock · Cash on Delivery nationwide.`;
      }
    } else if (activeVariant.status !== 'DOCUMENTED') {
      purchaseBtn.disabled = true;
      purchaseBtn.textContent = 'Media Pending · Unavailable for Order';
      if (mobileStickyBtn) {
        mobileStickyBtn.disabled = true;
        mobileStickyBtn.textContent = 'Media Pending';
      }
      if (purchaseStatus) {
        purchaseStatus.textContent = `${activeVariant.sku} is a provisional colorway slot awaiting verified photography and stock.`;
      }
    } else {
      purchaseBtn.disabled = true;
      purchaseBtn.textContent = !product.price_approved
        ? 'Pending Owner Sign-Off · Preview Mode'
        : 'Preview Mode · Checkout Paused';
      if (mobileStickyBtn) {
        mobileStickyBtn.disabled = true;
        mobileStickyBtn.textContent = 'Preview Mode';
      }
      if (purchaseStatus) {
        purchaseStatus.textContent = !product.price_approved
          ? 'This design requires 7-gate evidence sign-off and live store activation in Admin before accepting orders.'
          : 'Enable live Cash on Delivery in Admin Settings to accept orders.';
      }
    }
  }

  purchaseBtn?.addEventListener('click', () => {
    if (!isVariantPurchasable(product, activeVariant, storeConfig)) return;
    if (onAddToCart) {
      onAddToCart(product, activeVariant, selectedSize || 'Standard', qty);
    }
  });

  mobileStickyBtn?.addEventListener('click', () => {
    purchaseBtn?.click();
  });

  if (skuEl && activeVariant) skuEl.textContent = activeVariant.sku;
  renderColors();
  renderGallery();
  renderSizes();
  updatePurchaseState();
}
