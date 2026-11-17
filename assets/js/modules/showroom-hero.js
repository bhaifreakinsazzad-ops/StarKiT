import { escapeHtml, formatBdt } from '../core/validation.js';
import {
  PRICE_TIERS,
  getPrimaryVariant,
  getPrimaryImage,
  getBackImage,
  isVariantPurchasable
} from '../core/catalog-schema.js';
import { animateHeroSwap } from '../interactive-anime.js';

export function initShowroomHero({ products, base, spatialScene, onAddToCart, onOpenZoom, storeConfig }) {
  const stageEl = document.getElementById('showroomStage');
  const panelEl = document.getElementById('floatingPurchasePanel');
  const railEl = document.getElementById('wardrobeRail');
  if (!stageEl || !panelEl || !railEl) return;

  const hoodies = (products || []).filter((p) => p.id && p.id.startsWith('STK-'));
  if (!hoodies.length) return;

  const state = {
    hoodies,
    designIndex: 0,
    variantSku: null,
    selectedSize: 'L',
    viewMode: 'front' // 'front' | 'back' | 'detail'
  };

  function getActiveProduct() {
    return state.hoodies[state.designIndex] || state.hoodies[0];
  }

  function getActiveVariant(product) {
    const found = (product.variants || []).find((v) => v.sku === state.variantSku);
    return found || getPrimaryVariant(product);
  }

  function resolveImageForView(variant, mode) {
    const gallery = variant && Array.isArray(variant.gallery) ? variant.gallery : [];
    if (!gallery.length) return null;
    if (mode === 'back') {
      const back = gallery.find((g) => g.view === 'back');
      if (back) return back;
    }
    if (mode === 'detail') {
      const det = gallery.find((g) => String(g.view || '').startsWith('detail'));
      if (det) return det;
    }
    return gallery.find((g) => g.view === 'front') || gallery[0];
  }

  function renderWardrobe() {
    railEl.innerHTML = state.hoodies
      .map((p, idx) => {
        const pv = getPrimaryVariant(p);
        const imgObj = getPrimaryImage(p, pv);
        const imgPath = imgObj?.url ? String(imgObj.url).replace(/^\//, '') : '';
        const active = idx === state.designIndex;
        const thumbHtml = imgPath
          ? `<img src="${base}${escapeHtml(imgPath)}" alt="${escapeHtml(p.name)}" loading="lazy" referrerpolicy="no-referrer">`
          : `<span>${escapeHtml(p.id.replace('STK-', ''))}</span>`;
        return `
          <button
            type="button"
            class="wardrobe-item ${active ? 'active' : ''}"
            data-wardrobe-idx="${idx}"
            aria-pressed="${active ? 'true' : 'false'}"
            aria-label="Inspect ${escapeHtml(p.name)} (${escapeHtml(p.id)})"
          >
            <div class="wardrobe-thumb">${thumbHtml}</div>
            <div class="wardrobe-meta">
              <strong>${escapeHtml(p.name)}</strong>
              <small>${escapeHtml(p.id)} · ${formatBdt(p.price_bdt)}</small>
            </div>
          </button>`;
      })
      .join('');

    railEl.querySelectorAll('[data-wardrobe-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextIdx = Number(btn.dataset.wardrobeIdx);
        if (!Number.isInteger(nextIdx) || nextIdx === state.designIndex) return;
        const dir = nextIdx > state.designIndex ? 1 : -1;
        state.designIndex = nextIdx;
        const prod = getActiveProduct();
        const pv = getPrimaryVariant(prod);
        state.variantSku = pv ? pv.sku : null;
        state.viewMode = 'front';
        render(dir);
      });
    });
  }

  function render(direction = 1) {
    const p = getActiveProduct();
    const v = getActiveVariant(p);
    if (!v) return;
    state.variantSku = v.sku;

    if (spatialScene && typeof spatialScene.setAccentColor === 'function') {
      spatialScene.setAccentColor(v.hex);
      if (direction !== 0 && typeof spatialScene.pulse === 'function') {
        spatialScene.pulse(direction);
      }
    }

    const gallery = Array.isArray(v.gallery) ? v.gallery : [];
    const hasBack = gallery.some((g) => g.view === 'back') && Boolean(getBackImage(p, v));
    const hasDetail = gallery.some((g) => String(g.view || '').startsWith('detail'));
    const currentPhoto = resolveImageForView(v, state.viewMode);
    const fullImgUrl = currentPhoto ? base + String(currentPhoto.url || '').replace(/^\//, '') : '';

    const stageMediaHtml = currentPhoto
      ? `<img id="showroomHeroImg" src="${escapeHtml(fullImgUrl)}" alt="${escapeHtml(p.name)} — ${escapeHtml(v.color)}" referrerpolicy="no-referrer">`
      : `<div class="stage-provisional-slate">
           <div class="stage-swatch-disc" style="background:${escapeHtml(v.hex)};"></div>
           <div class="eyebrow" style="margin-bottom:8px;">${p.is_concept || p.concept_stage ? 'Concept Design · Media Pending' : 'Colorway Slot · Media Pending'}</div>
           <h3 style="margin:0 0 6px;font-size:1.35rem;font-weight:800;">${escapeHtml(p.name)}</h3>
           <p style="margin:0;color:var(--mute);font-size:0.88rem;max-width:30ch;">
             ${escapeHtml(v.color)} (${escapeHtml(v.sku)}) is registered in the 60-variant catalog architecture. Photography upload is pending in Admin.
           </p>
         </div>`;

    stageEl.innerHTML = `
      <div class="stage-frame" id="heroPicture" data-testid="showroom-stage">
        ${stageMediaHtml}
      </div>
      <div class="stage-view-tabs" role="tablist" aria-label="Garment studio view">
        <button type="button" role="tab" class="stage-view-tab ${state.viewMode === 'front' ? 'active' : ''}" data-stage-view="front" ${!gallery.length ? 'disabled' : ''}>Front</button>
        <button type="button" role="tab" class="stage-view-tab ${state.viewMode === 'back' ? 'active' : ''}" data-stage-view="back" ${!hasBack ? 'disabled' : ''}>Back</button>
        <button type="button" role="tab" class="stage-view-tab ${state.viewMode === 'detail' ? 'active' : ''}" data-stage-view="detail" ${!hasDetail ? 'disabled' : ''}>Detail</button>
        <button type="button" role="tab" class="stage-view-tab" disabled title="Model photography pending studio shoot">Model Shoot Pending</button>
      </div>`;

    const imgEl = stageEl.querySelector('#showroomHeroImg');
    if (imgEl && onOpenZoom) {
      imgEl.addEventListener('click', () => onOpenZoom(imgEl.src, imgEl.alt));
    }

    stageEl.querySelectorAll('[data-stage-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        state.viewMode = btn.dataset.stageView;
        render(0);
      });
    });

    // Right Floating Purchase Panel
    const purchasable = isVariantPurchasable(p, v, storeConfig);
    const sizes = v.available_sizes && v.available_sizes.length ? v.available_sizes : ['M', 'L', 'XL', 'XXL'];
    if (!sizes.includes(state.selectedSize)) state.selectedSize = sizes[0];

    const swatchesHtml = (p.variants || [])
      .map((variant) => {
        const isProv = variant.status !== 'DOCUMENTED';
        const isSelected = variant.sku === v.sku;
        return `
          <button
            type="button"
            class="panel-swatch-btn ${isSelected ? 'active' : ''} ${isProv ? 'provisional' : ''}"
            data-panel-sku="${escapeHtml(variant.sku)}"
            aria-label="Colorway ${escapeHtml(variant.color)}${isProv ? ' (Media Pending)' : ''}"
          >
            <span class="color-dot" style="background:${escapeHtml(variant.hex)}"></span>
            <span>${escapeHtml(variant.color)}</span>
          </button>`;
      })
      .join('');

    const sizesHtml = sizes
      .map((sz) => {
        const disabled = v.status !== 'DOCUMENTED';
        return `<button type="button" class="size-chip ${state.selectedSize === sz ? 'selected' : ''}" data-panel-size="${escapeHtml(sz)}" ${disabled ? 'disabled' : ''}>${escapeHtml(sz)}</button>`;
      })
      .join('');

    const tierInfo = PRICE_TIERS[p.price_tier];
    const tierLabel = tierInfo ? tierInfo.label : p.price_tier || 'Drop 01';
    const collectionLabel = p.collection || p.category || 'Drop 01';

    let statusMessage = '';
    if (v.status !== 'DOCUMENTED') {
      statusMessage = `${escapeHtml(v.color)} (${escapeHtml(v.sku)}) photography and stock verification are pending in Admin.`;
    } else if (!p.price_approved) {
      statusMessage = `Tier pricing (${escapeHtml(tierLabel)} · ${formatBdt(p.price_bdt)}) and 7-gate approval are pending owner sign-off.`;
    } else if (!purchasable) {
      statusMessage = 'Preview mode active — online Cash on Delivery opens once storefront is enabled in Admin.';
    } else {
      statusMessage = `In Stock (${Number(v.stock_quantity || 0)} units) · Cash on Delivery across 64 districts.`;
    }

    const ctaLabel = purchasable
      ? `Add to Bag · ${formatBdt(p.price_bdt)}`
      : v.status !== 'DOCUMENTED'
      ? 'Media Pending'
      : 'Preview Only — Inspect PDP';

    const pdpHref = `${base}products/${escapeHtml(p.slug)}.html`;

    panelEl.innerHTML = `
      <div class="panel-kicker">
        <span>${escapeHtml(collectionLabel)}</span>
        <span class="panel-sku">${escapeHtml(v.sku)}</span>
      </div>
      <h2 id="heroName">${escapeHtml(p.name)}</h2>
      ${p.bengali_name || p.copy_bn ? `<div class="bn" style="font-size:0.88rem;color:var(--mute);margin-top:2px;">${escapeHtml(p.bengali_name || p.copy_bn)}</div>` : ''}
      <div class="panel-price-row">
        <span class="panel-price tabular">${formatBdt(p.price_bdt)}</span>
        <span class="panel-tier-note">${escapeHtml(tierLabel)} · ${p.price_approved ? 'Approved' : 'Draft Price'}</span>
      </div>
      <div class="panel-label">
        <span>Colorway · ${escapeHtml(v.color)}</span>
        <span>${v.status === 'DOCUMENTED' ? 'Studio Assets Ready' : 'Media Pending'}</span>
      </div>
      <div class="panel-swatches">${swatchesHtml}</div>
      <div class="panel-label">
        <span>Size</span>
        <a href="${pdpHref}" class="link-arrow">Full Size Guide ↗</a>
      </div>
      <div class="panel-sizes">${sizesHtml}</div>
      <div class="panel-status">${statusMessage}</div>
      <div class="panel-actions">
        <button
          type="button"
          class="btn"
          id="panelPrimaryCta"
          ${!purchasable && v.status !== 'DOCUMENTED' ? 'disabled' : ''}
        >${ctaLabel}</button>
        <a href="${pdpHref}" class="btn btn-outline" aria-label="View full page for ${escapeHtml(p.name)}">Details ↗</a>
      </div>`;

    panelEl.querySelectorAll('[data-panel-sku]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.variantSku = btn.dataset.panelSku;
        state.viewMode = 'front';
        render(0);
      });
    });

    panelEl.querySelectorAll('[data-panel-size]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        state.selectedSize = btn.dataset.panelSize;
        render(0);
      });
    });

    const ctaBtn = panelEl.querySelector('#panelPrimaryCta');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', () => {
        if (purchasable && onAddToCart) {
          onAddToCart(p, v, state.selectedSize, 1);
        } else if (v.status === 'DOCUMENTED') {
          window.location.href = pdpHref;
        }
      });
    }

    renderWardrobe();
    if (direction !== 0) {
      animateHeroSwap(stageEl.querySelector('#heroPicture'), panelEl.querySelector('#heroName'), direction);
    }
  }

  document.getElementById('wardrobePrevBtn')?.addEventListener('click', () => {
    state.designIndex = (state.designIndex - 1 + state.hoodies.length) % state.hoodies.length;
    state.variantSku = null;
    state.viewMode = 'front';
    render(-1);
  });

  document.getElementById('wardrobeNextBtn')?.addEventListener('click', () => {
    state.designIndex = (state.designIndex + 1) % state.hoodies.length;
    state.variantSku = null;
    state.viewMode = 'front';
    render(1);
  });

  render(0);
}
