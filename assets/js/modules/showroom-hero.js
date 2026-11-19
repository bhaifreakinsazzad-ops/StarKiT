import { escapeHtml, formatBdt, resolveAssetUrl } from '../core/validation.js';
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

  function renderWardrobe(restoreWardrobeFocus = false) {
    const total = state.hoodies.length;
    railEl.innerHTML = state.hoodies
      .map((p, idx) => {
        const pv = getPrimaryVariant(p);
        const pvPrice = Number(pv?.price_bdt ?? p.price_bdt ?? 0);
        const imgObj = getPrimaryImage(p, pv);
        const imgPath = imgObj?.url ? resolveAssetUrl(imgObj.url, base) : '';
        const active = idx === state.designIndex;
        const thumbHtml = imgPath
          ? `<img src="${escapeHtml(imgPath)}" alt="${escapeHtml(p.name)}" loading="lazy" referrerpolicy="no-referrer">`
          : `<span>${escapeHtml(p.id.replace('STK-', ''))}</span>`;
        return `
          <button
            type="button"
            class="wardrobe-item ${active ? 'active' : ''}"
            data-wardrobe-idx="${idx}"
            data-product-id="${escapeHtml(p.id)}"
            aria-pressed="${active ? 'true' : 'false'}"
            aria-current="${active ? 'true' : 'false'}"
            aria-label="Inspect ${escapeHtml(p.name)} (${escapeHtml(p.id)}, ${formatBdt(pvPrice)}) — Look ${idx + 1} of ${total}"
          >
            <div class="wardrobe-thumb" aria-hidden="true">${thumbHtml}</div>
            <div class="wardrobe-meta">
              <strong>${escapeHtml(p.name)}</strong>
              <small>${escapeHtml(p.id)} · ${formatBdt(pvPrice)}</small>
            </div>
          </button>`;
      })
      .join('');

    const activateWardrobeIndex = (nextIdx, focusAfter = false) => {
      if (!Number.isInteger(nextIdx) || nextIdx < 0 || nextIdx >= state.hoodies.length) return;
      if (nextIdx === state.designIndex) {
        if (focusAfter) {
          railEl.querySelector(`[data-wardrobe-idx="${nextIdx}"]`)?.focus();
        }
        return;
      }
      const dir = nextIdx > state.designIndex ? 1 : -1;
      state.designIndex = nextIdx;
      const prod = getActiveProduct();
      const pv = getPrimaryVariant(prod);
      state.variantSku = pv ? pv.sku : null;
      state.viewMode = 'front';
      render(dir, focusAfter ? { type: 'wardrobe', idx: nextIdx } : null);
    };

    railEl.querySelectorAll('[data-wardrobe-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextIdx = Number(btn.dataset.wardrobeIdx);
        const keepFocus = document.activeElement === btn;
        activateWardrobeIndex(nextIdx, keepFocus);
      });

      btn.addEventListener('keydown', (e) => {
        const currentIdx = Number(btn.dataset.wardrobeIdx);
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIdx = (currentIdx + 1) % state.hoodies.length;
          activateWardrobeIndex(nextIdx, true);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIdx = (currentIdx - 1 + state.hoodies.length) % state.hoodies.length;
          activateWardrobeIndex(prevIdx, true);
        } else if (e.key === 'Home') {
          e.preventDefault();
          activateWardrobeIndex(0, true);
        } else if (e.key === 'End') {
          e.preventDefault();
          activateWardrobeIndex(state.hoodies.length - 1, true);
        }
      });
    });

    const activeBtn = railEl.querySelector(`[data-wardrobe-idx="${state.designIndex}"]`);
    if (activeBtn && restoreWardrobeFocus) {
      activeBtn.focus();
      if (typeof activeBtn.scrollIntoView === 'function') {
        const reduced =
          typeof window !== 'undefined' &&
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        activeBtn.scrollIntoView({
          behavior: reduced ? 'auto' : 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }
  }

  function render(direction = 1, focusTarget = null) {
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
    const fullImgUrl = currentPhoto ? resolveAssetUrl(currentPhoto.url || currentPhoto.path || '', base) : '';

    const stageMediaHtml = fullImgUrl
      ? `<img id="showroomHeroImg" src="${escapeHtml(fullImgUrl)}" alt="${escapeHtml(p.name)} — ${escapeHtml(v.color)} (${escapeHtml(state.viewMode)} view)" referrerpolicy="no-referrer">`
      : `<div class="stage-provisional-slate">
           <div class="stage-swatch-disc" style="background:${escapeHtml(v.hex)};" aria-hidden="true"></div>
           <div class="eyebrow" style="margin-bottom:8px;">Drop 01 Studio Preview</div>
           <h3 style="margin:0 0 6px;font-size:1.35rem;font-weight:800;">${escapeHtml(p.name)}</h3>
           <p style="margin:0;color:var(--mute);font-size:0.88rem;max-width:30ch;">
             ${escapeHtml(v.color)} (${escapeHtml(v.sku)}) in the Drop 01 hoodie archive.
           </p>
         </div>`;

    const activeTabId = `stage-tab-${state.viewMode}`;
    const zoomAttrs = currentPhoto
      ? `role="button" tabindex="0" aria-label="Zoom studio image for ${escapeHtml(p.name)} — ${escapeHtml(v.color)} (${escapeHtml(state.viewMode)} view)"`
      : `role="region" aria-label="${escapeHtml(p.name)} — ${escapeHtml(v.color)} studio preview"`;

    stageEl.innerHTML = `
      <div class="stage-frame" id="heroPicture" aria-labelledby="${escapeHtml(activeTabId)}" aria-live="polite" data-testid="showroom-stage" ${zoomAttrs}>
        ${stageMediaHtml}
      </div>
      <div class="stage-view-tabs" role="tablist" aria-label="Garment studio view angles">
        <button
          type="button"
          role="tab"
          id="stage-tab-front"
          class="stage-view-tab ${state.viewMode === 'front' ? 'active' : ''}"
          data-stage-view="front"
          aria-selected="${state.viewMode === 'front' ? 'true' : 'false'}"
          aria-controls="heroPicture"
          aria-label="Front studio view — ${escapeHtml(p.name)} (${escapeHtml(v.color)})${!gallery.length ? ' (Unavailable)' : ''}"
          ${!gallery.length ? 'disabled aria-disabled="true"' : ''}
        >Front</button>
        <button
          type="button"
          role="tab"
          id="stage-tab-back"
          class="stage-view-tab ${state.viewMode === 'back' ? 'active' : ''}"
          data-stage-view="back"
          aria-selected="${state.viewMode === 'back' ? 'true' : 'false'}"
          aria-controls="heroPicture"
          aria-label="Back studio view — ${escapeHtml(p.name)} (${escapeHtml(v.color)})${!hasBack ? ' (Unavailable)' : ''}"
          ${!hasBack ? 'disabled aria-disabled="true"' : ''}
        >Back</button>
        <button
          type="button"
          role="tab"
          id="stage-tab-detail"
          class="stage-view-tab ${state.viewMode === 'detail' ? 'active' : ''}"
          data-stage-view="detail"
          aria-selected="${state.viewMode === 'detail' ? 'true' : 'false'}"
          aria-controls="heroPicture"
          aria-label="Fabric and print detail view — ${escapeHtml(p.name)} (${escapeHtml(v.color)})${!hasDetail ? ' (Unavailable)' : ''}"
          ${!hasDetail ? 'disabled aria-disabled="true"' : ''}
        >Detail</button>
      </div>`;

    const frameEl = stageEl.querySelector('#heroPicture');
    const imgEl = stageEl.querySelector('#showroomHeroImg');
    if (imgEl && frameEl && onOpenZoom) {
      const triggerZoom = () => onOpenZoom(imgEl.src, imgEl.alt);
      frameEl.addEventListener('click', triggerZoom);
      frameEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          triggerZoom();
        }
      });
    }

    const enabledTabs = Array.from(stageEl.querySelectorAll('[data-stage-view]:not([disabled])'));
    stageEl.querySelectorAll('[data-stage-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const keepFocus = document.activeElement === btn;
        state.viewMode = btn.dataset.stageView;
        render(0, keepFocus ? { type: 'tab', view: state.viewMode } : null);
      });

      btn.addEventListener('keydown', (e) => {
        if (!enabledTabs.length) return;
        const idx = enabledTabs.indexOf(btn);
        if (idx === -1) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const nextTab = enabledTabs[(idx + 1) % enabledTabs.length];
          state.viewMode = nextTab.dataset.stageView;
          render(0, { type: 'tab', view: state.viewMode });
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prevTab = enabledTabs[(idx - 1 + enabledTabs.length) % enabledTabs.length];
          state.viewMode = prevTab.dataset.stageView;
          render(0, { type: 'tab', view: state.viewMode });
        } else if (e.key === 'Home') {
          e.preventDefault();
          const firstTab = enabledTabs[0];
          state.viewMode = firstTab.dataset.stageView;
          render(0, { type: 'tab', view: state.viewMode });
        } else if (e.key === 'End') {
          e.preventDefault();
          const lastTab = enabledTabs[enabledTabs.length - 1];
          state.viewMode = lastTab.dataset.stageView;
          render(0, { type: 'tab', view: state.viewMode });
        }
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
            aria-pressed="${isSelected ? 'true' : 'false'}"
            aria-label="Colorway ${escapeHtml(variant.color)}${isProv ? ' (Media Pending)' : ''}"
          >
            <span class="color-dot" style="background:${escapeHtml(variant.hex)}" aria-hidden="true"></span>
            <span>${escapeHtml(variant.color)}</span>
          </button>`;
      })
      .join('');

    const sizesHtml = sizes
      .map((sz) => {
        const disabled = v.status !== 'DOCUMENTED';
        const isSelected = state.selectedSize === sz;
        return `<button
          type="button"
          class="size-chip ${isSelected ? 'selected' : ''}"
          data-panel-size="${escapeHtml(sz)}"
          aria-pressed="${isSelected ? 'true' : 'false'}"
          aria-label="Size ${escapeHtml(sz)}${disabled ? ' (Unavailable — Media Pending)' : ''}"
          ${disabled ? 'disabled aria-disabled="true"' : ''}
        >${escapeHtml(sz)}</button>`;
      })
      .join('');

    const tierInfo = PRICE_TIERS[p.price_tier];
    const tierLabel = tierInfo ? tierInfo.label : p.price_tier || 'Drop 01';
    const collectionLabel = p.collection || p.category || 'Drop 01';
    const activePrice = Number(v.price_bdt ?? p.price_bdt ?? 0);

    let statusMessage = '';
    if (v.status !== 'DOCUMENTED') {
      statusMessage = `${escapeHtml(v.color)} (${escapeHtml(v.sku)}) photography and stock verification are pending in Admin.`;
    } else if (!p.price_approved) {
      statusMessage = `Tier pricing (${escapeHtml(tierLabel)} · ${formatBdt(activePrice)}) and 7-gate approval are pending owner sign-off.`;
    } else if (!purchasable) {
      statusMessage = 'Preview mode active — online Cash on Delivery opens once storefront is enabled in Admin.';
    } else {
      statusMessage = `In Stock (${Number(v.stock_quantity || 0)} units) · Cash on Delivery across 64 districts.`;
    }

    const ctaLabel = purchasable
      ? `Add to Bag · ${formatBdt(activePrice)}`
      : v.status !== 'DOCUMENTED'
      ? 'Media Pending'
      : 'Preview Only — Inspect PDP';

    const pdpHref = `${base}products/${escapeHtml(p.slug)}.html`;
    const waReserveHref = `https://wa.me/8801778307704?text=${encodeURIComponent(
      `Hello StarkiT! I would like to reserve/inquire about "${p.name}" (SKU: ${v.sku}, Color: ${v.color}, Size: ${state.selectedSize || 'L'}, Tier Price: ${formatBdt(activePrice)}).`
    )}`;

    panelEl.innerHTML = `
      <div class="panel-kicker">
        <span>${escapeHtml(collectionLabel)}</span>
        <span class="panel-sku">${escapeHtml(v.sku)}</span>
      </div>
      <h2 id="heroName">${escapeHtml(p.name)}</h2>
      ${p.bengali_name || p.copy_bn ? `<div class="bn" style="font-size:0.88rem;color:var(--mute);margin-top:2px;">${escapeHtml(p.bengali_name || p.copy_bn)}</div>` : ''}
      <div class="panel-price-row">
        <span class="panel-price tabular">${formatBdt(activePrice)}</span>
        <span class="panel-tier-note">${escapeHtml(tierLabel)} · ${p.price_approved ? 'Approved' : 'Draft Price'}</span>
      </div>
      <div class="panel-label">
        <span>Colorway · ${escapeHtml(v.color)}</span>
        <span>${v.status === 'DOCUMENTED' ? 'Studio Assets Ready' : 'Media Pending'}</span>
      </div>
      <div class="panel-swatches" role="group" aria-label="Select garment colorway">${swatchesHtml}</div>
      <div class="panel-label">
        <span>Size</span>
        <a href="${pdpHref}" class="link-arrow" aria-label="Open full size guide and product page for ${escapeHtml(p.name)}">Full Size Guide ↗</a>
      </div>
      <div class="panel-sizes" role="group" aria-label="Select garment size">${sizesHtml}</div>
      <div class="panel-status" role="status" aria-live="polite">${statusMessage}</div>
      <div class="panel-actions">
        <button
          type="button"
          class="btn"
          id="panelPrimaryCta"
          aria-label="${escapeHtml(ctaLabel)} — ${escapeHtml(p.name)} (${escapeHtml(v.color)}, Size ${escapeHtml(state.selectedSize)})"
          ${!purchasable && v.status !== 'DOCUMENTED' ? 'disabled aria-disabled="true"' : ''}
        >${ctaLabel}</button>
        <a href="${pdpHref}" class="btn btn-outline" aria-label="View full page for ${escapeHtml(p.name)}">Details ↗</a>
      </div>
      ${
        !purchasable
          ? `<div style="margin-top:8px;text-align:center;">
               <a href="${waReserveHref}" target="_blank" rel="noopener noreferrer" class="link-arrow" style="font-size:0.78rem;">Reserve or Inquire via WhatsApp (+8801778307704) ↗</a>
             </div>`
          : ''
      }`;

    panelEl.querySelectorAll('[data-panel-sku]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const keepFocus = document.activeElement === btn;
        state.variantSku = btn.dataset.panelSku;
        state.viewMode = 'front';
        render(0, keepFocus ? { type: 'swatch', sku: state.variantSku } : null);
      });
    });

    panelEl.querySelectorAll('[data-panel-size]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const keepFocus = document.activeElement === btn;
        state.selectedSize = btn.dataset.panelSize;
        render(0, keepFocus ? { type: 'size', size: state.selectedSize } : null);
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

    renderWardrobe(focusTarget?.type === 'wardrobe');

    const escCss = (v) =>
      typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(String(v))
        : String(v).replace(/[^a-zA-Z0-9_-]/g, '\\$&');

    if (focusTarget?.type === 'tab') {
      stageEl.querySelector(`[data-stage-view="${escCss(focusTarget.view)}"]`)?.focus();
    } else if (focusTarget?.type === 'swatch') {
      panelEl.querySelector(`[data-panel-sku="${escCss(focusTarget.sku)}"]`)?.focus();
    } else if (focusTarget?.type === 'size') {
      panelEl.querySelector(`[data-panel-size="${escCss(focusTarget.size)}"]`)?.focus();
    }

    if (direction !== 0) {
      animateHeroSwap(stageEl.querySelector('#heroPicture'), panelEl.querySelector('#heroName'), direction);
    }
  }

  document.getElementById('wardrobePrevBtn')?.addEventListener('click', () => {
    state.designIndex = (state.designIndex - 1 + state.hoodies.length) % state.hoodies.length;
    state.variantSku = null;
    state.viewMode = 'front';
    render(-1);
    const activeBtn = railEl.querySelector(`[data-wardrobe-idx="${state.designIndex}"]`);
    if (activeBtn && typeof activeBtn.scrollIntoView === 'function') {
      const reduced =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      activeBtn.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' });
    }
  });

  document.getElementById('wardrobeNextBtn')?.addEventListener('click', () => {
    state.designIndex = (state.designIndex + 1) % state.hoodies.length;
    state.variantSku = null;
    state.viewMode = 'front';
    render(1);
    const activeBtn = railEl.querySelector(`[data-wardrobe-idx="${state.designIndex}"]`);
    if (activeBtn && typeof activeBtn.scrollIntoView === 'function') {
      const reduced =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      activeBtn.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' });
    }
  });

  render(0);

  return {
    refresh() {
      render(0);
    }
  };
}
