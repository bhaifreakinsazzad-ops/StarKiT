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

  const isHoodieProduct = String(product.id).startsWith('STK-');
  let activeVariant = getPrimaryVariant(product);
  let activeGalleryIndex = 0;
  let selectedSize =
    activeVariant && Array.isArray(activeVariant.available_sizes) && activeVariant.available_sizes[0]
      ? activeVariant.available_sizes[0]
      : '';
  let qty = 1;

  function viewLabel(view) {
    if (view === 'front') return isHoodieProduct ? 'Front View' : 'Artisan Piece';
    if (view === 'back') return 'Back Print';
    if (view === 'lifestyle') return 'Studio Lifestyle';
    if (view === 'atelier_campaign') return 'Dhaka Atelier';
    if (String(view || '').startsWith('detail')) return isHoodieProduct ? 'Craft Detail' : 'Editorial Styling';
    return 'Studio Look';
  }

  function renderGallery() {
    if (!galleryEl || !thumbsEl || !activeVariant) return;
    const gallery = Array.isArray(activeVariant.gallery) ? activeVariant.gallery : [];

    if (!gallery.length) {
      galleryEl.innerHTML = `
        <div class="stage-provisional-slate">
          <div class="stage-swatch-disc" style="background:${escapeHtml(activeVariant.hex)};"></div>
          <div class="eyebrow" style="margin-bottom:8px;">Drop 01 Archive</div>
          <h3 style="margin:0 0 8px;">${escapeHtml(product.name)} · ${escapeHtml(activeVariant.color)}</h3>
          <p style="margin:0;color:var(--mute);max-width:34ch;font-size:0.9rem;">
            SKU <strong>${escapeHtml(activeVariant.sku)}</strong> studio image unavailable. Select an available colorway above or inquire via WhatsApp.
          </p>
        </div>`;
      thumbsEl.innerHTML = '';
      return;
    }

    const item = gallery[activeGalleryIndex] || gallery[0];
    const src = base + String(item.url || item.path || '').replace(/^\//, '');

    galleryEl.innerHTML = `
      <img src="${escapeHtml(src)}" alt="${escapeHtml(product.name)} — ${escapeHtml(activeVariant.color)} (${escapeHtml(viewLabel(item.view))})" referrerpolicy="no-referrer">
      <span class="view-tag">${escapeHtml(viewLabel(item.view))}</span>`;

    galleryEl.onclick = () => {
      if (onOpenZoom) onOpenZoom(src, `${product.name} — ${activeVariant.color}`);
    };
    galleryEl.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (onOpenZoom) onOpenZoom(src, `${product.name} — ${activeVariant.color}`);
      } else if (e.key === 'ArrowRight' && gallery.length > 1) {
        e.preventDefault();
        activeGalleryIndex = (activeGalleryIndex + 1) % gallery.length;
        renderGallery();
        animateGallerySwap(galleryEl);
      } else if (e.key === 'ArrowLeft' && gallery.length > 1) {
        e.preventDefault();
        activeGalleryIndex = (activeGalleryIndex - 1 + gallery.length) % gallery.length;
        renderGallery();
        animateGallerySwap(galleryEl);
      }
    };

    thumbsEl.innerHTML = gallery
      .map((g, idx) => {
        const thumbSrc = base + String(g.url || g.path || '').replace(/^\//, '');
        return `
          <button type="button" class="thumb ${idx === activeGalleryIndex ? 'active' : ''}" data-thumb-idx="${idx}" aria-label="Show ${escapeHtml(viewLabel(g.view))}">
            <img src="${escapeHtml(thumbSrc)}" alt="" loading="lazy" referrerpolicy="no-referrer">
          </button>`;
      })
      .join('');

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
        const selected = activeVariant && v.sku === activeVariant.sku;
        return `
          <button
            type="button"
            class="color-chip ${selected ? 'selected' : ''}"
            data-variant="${escapeHtml(v.sku)}"
          >
            <span class="color-dot" style="background:${escapeHtml(v.hex)}"></span>
            <span>${escapeHtml(v.color)}</span>
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
          ${isHoodieProduct ? `<div style="margin-top:8px;"><button type="button" class="fit-trigger-link" data-open-fit-guide>Open Fit &amp; Size Guide (M–XXL)</button></div>` : ''}
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
    } else if (isHoodieProduct && activeVariant.status !== 'DOCUMENTED') {
      purchaseBtn.disabled = true;
      purchaseBtn.textContent = 'Unavailable for Order';
      if (mobileStickyBtn) {
        mobileStickyBtn.disabled = true;
        mobileStickyBtn.textContent = 'Unavailable';
      }
      if (purchaseStatus) {
        purchaseStatus.textContent = `${activeVariant.sku} is currently unavailable for online checkout.`;
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

  function renderRelatedDesigns() {
    if (document.getElementById('relatedArchiveMount')) return;
    const isHoodie = String(product.id).startsWith('STK-');
    const candidates = (products || []).filter((p) => {
      if (p.id === product.id) return false;
      const pv = getPrimaryVariant(p);
      if (!pv || !Array.isArray(pv.gallery) || pv.gallery.length === 0) return false;
      if (isHoodie) return String(p.id).startsWith('STK-');
      return String(p.collection || p.category) === String(product.collection || product.category);
    });
    const picks = candidates.slice(0, 4);
    if (!picks.length) return;

    const section = document.createElement('section');
    section.id = 'relatedArchiveMount';
    section.className = 'related-archive-section';
    section.innerHTML = `
      <div class="section-head" style="margin-bottom:18px;">
        <div>
          <div class="eyebrow">Continue Exploring</div>
          <h2 style="margin:4px 0 0;font-size:clamp(1.45rem,2.6vw,2rem);font-weight:800;">More From Drop 01 · The Graphic Archive</h2>
        </div>
        <a href="${base}shop.html?category=${encodeURIComponent(product.category || 'All')}" class="btn btn-outline btn-sm">View Full Collection ↗</a>
      </div>
      <div class="related-archive-grid">
        ${picks
          .map((item) => {
            const pv = getPrimaryVariant(item);
            const imgObj = pv?.gallery?.[0];
            const imgPath = imgObj?.url ? String(imgObj.url).replace(/^\//, '') : '';
            const href = `${base}products/${escapeHtml(item.slug)}.html`;
            return `
              <article class="card">
                <div class="card-media">
                  <a href="${href}" aria-label="Inspect ${escapeHtml(item.name)}" style="position:absolute;inset:0;display:block;">
                    <img class="front single-view" src="${base}${escapeHtml(imgPath)}" alt="${escapeHtml(item.name)}" loading="lazy" referrerpolicy="no-referrer">
                  </a>
                </div>
                <div class="card-meta">
                  <div>
                    <span class="card-kicker">${escapeHtml(item.collection || item.category || 'Archive')}</span>
                    <a href="${href}">${escapeHtml(item.name)}</a>
                  </div>
                  <span class="price tabular">${formatBdt(item.price_bdt)}</span>
                </div>
              </article>`;
          })
          .join('')}
      </div>`;
    detailRoot.parentElement?.appendChild(section);
  }

  if (skuEl && activeVariant) skuEl.textContent = activeVariant.sku;
  renderColors();
  renderGallery();
  renderSizes();
  updatePurchaseState();
  renderRelatedDesigns();

  if (typeof window.fbq === 'function' && activeVariant) {
    try {
      window.fbq('track', 'ViewContent', {
        content_ids: [activeVariant.sku],
        content_name: product.name,
        content_category: product.collection || product.category || 'Archive',
        content_type: 'product',
        value: Number(product.price_bdt) || 0,
        currency: 'BDT'
      });
    } catch {}
  }

  return {
    refresh() {
      if (activeVariant) {
        activeVariant = (product.variants || []).find((v) => v.sku === activeVariant.sku) || getPrimaryVariant(product);
      }
      const priceEl = detailRoot.querySelector('.detail-price');
      if (priceEl) priceEl.textContent = formatBdt(product.price_bdt);
      renderColors();
      renderGallery();
      renderSizes();
      updatePurchaseState();
    }
  };
}
