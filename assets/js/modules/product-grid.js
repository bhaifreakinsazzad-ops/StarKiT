import { escapeHtml, formatBdt } from '../core/validation.js';
import {
  PRICE_TIERS,
  getPrimaryVariant,
  getPrimaryImage,
  getBackImage,
  isVariantPurchasable
} from '../core/catalog-schema.js';

export function initProductGrid({ products, base, storeConfig, onAddToCart }) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return null;

  const searchInput = document.getElementById('catalogSearch');
  const sortSelect = document.getElementById('catalogSort');
  const tierSelect = document.getElementById('catalogTierFilter');
  const colorSelect = document.getElementById('catalogColorFilter');
  const countEl = document.getElementById('resultsCount');
  const categoryButtons = document.querySelectorAll('#categoryFilters [data-category], [data-category]');

  function loadWishlist() {
    try {
      const raw = JSON.parse(sessionStorage.getItem('starkit_wishlist') || '[]');
      return new Set(Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : []);
    } catch {
      return new Set();
    }
  }

  const urlParams = new URLSearchParams(window.location.search);
  const state = {
    category: urlParams.get('category') || 'All',
    tier: urlParams.get('tier') || 'All',
    color: urlParams.get('color') || 'All',
    query: urlParams.get('q') || '',
    sort: urlParams.get('sort') || 'featured',
    compareIds: [],
    selectedVariants: new Map(), // productId -> sku
    wishlist: loadWishlist()
  };

  if (searchInput && state.query) searchInput.value = state.query;
  if (sortSelect && state.sort) sortSelect.value = state.sort;
  if (tierSelect && state.tier) tierSelect.value = state.tier;
  if (colorSelect && state.color) colorSelect.value = state.color;
  if (state.category !== 'All' && categoryButtons.length) {
    categoryButtons.forEach((b) => {
      b.classList.toggle('active', (b.dataset.category || 'All').toLowerCase() === state.category.toLowerCase());
    });
  }

  function syncUrlState() {
    if (!window.location.pathname.includes('shop')) return;
    const params = new URLSearchParams();
    if (state.category && state.category !== 'All') params.set('category', state.category);
    if (state.tier && state.tier !== 'All') params.set('tier', state.tier);
    if (state.color && state.color !== 'All') params.set('color', state.color);
    if (state.query.trim()) params.set('q', state.query.trim());
    if (state.sort && state.sort !== 'featured') params.set('sort', state.sort);
    const qs = params.toString();
    const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    try {
      window.history.replaceState(null, '', nextUrl);
    } catch {}
  }

  function resetAllFilters() {
    state.category = 'All';
    state.tier = 'All';
    state.color = 'All';
    state.query = '';
    if (searchInput) searchInput.value = '';
    if (tierSelect) tierSelect.value = 'All';
    if (colorSelect) colorSelect.value = 'All';
    categoryButtons.forEach((b) => b.classList.toggle('active', (b.dataset.category || 'All') === 'All'));
    syncUrlState();
    render();
  }

  function getFilteredProducts() {
    const q = state.query.trim().toLowerCase();
    const list = (products || []).filter((p) => {
      if (state.category === 'Streetwear' && !String(p.id).startsWith('STK-')) return false;
      if (state.category !== 'All' && state.category !== 'Streetwear') {
        const prodCategory = String(p.category || p.collection || '').toLowerCase();
        if (prodCategory !== state.category.toLowerCase()) return false;
      }
      if (state.tier !== 'All') {
        const tierCode = String(p.price_tier || p.tier || '').toUpperCase();
        if (tierCode !== state.tier.toUpperCase()) return false;
      }
      if (state.color !== 'All') {
        const hasColor = (p.variants || []).some(
          (v) => String(v.color || '').toLowerCase() === state.color.toLowerCase()
        );
        if (!hasColor) return false;
      }
      if (q) {
        const tierLabel = PRICE_TIERS[p.price_tier]?.label || '';
        const hay = [
          p.id,
          p.name,
          p.bengali_name,
          p.collection,
          p.category,
          tierLabel,
          ...(p.tags || []),
          ...(p.variants || []).map((v) => `${v.sku} ${v.color}`)
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (state.sort === 'price-asc') {
      list.sort((a, b) => Number(a.price_bdt || 0) - Number(b.price_bdt || 0));
    } else if (state.sort === 'price-desc') {
      list.sort((a, b) => Number(b.price_bdt || 0) - Number(a.price_bdt || 0));
    } else if (state.sort === 'name') {
      list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    } else {
      list.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    }
    return list;
  }

  function renderQuickView(p, activeSku) {
    const modal = document.getElementById('quickViewModal');
    const body = document.getElementById('quickViewBody');
    if (!modal || !body) return;

    let currentVariant =
      (p.variants || []).find((v) => v.sku === activeSku) || getPrimaryVariant(p);
    let selectedSize =
      currentVariant?.available_sizes && currentVariant.available_sizes.length
        ? currentVariant.available_sizes[0]
        : '';

    let selectedImgIdx = 0;

    const paint = () => {
      const gallery = Array.isArray(currentVariant?.gallery) ? currentVariant.gallery : [];
      const activeGalleryItem = gallery[selectedImgIdx] || getPrimaryImage(p, currentVariant);
      const imgPath = activeGalleryItem?.url
        ? String(activeGalleryItem.url).replace(/^\//, '')
        : activeGalleryItem?.path
        ? String(activeGalleryItem.path).replace(/^\//, '')
        : '';
      const purchasable = isVariantPurchasable(p, currentVariant, storeConfig);
      const sizes = currentVariant?.available_sizes || [];
      const pdpHref = `${base}products/${escapeHtml(p.slug)}.html`;
      const tierLabel = PRICE_TIERS[p.price_tier]?.label || p.collection || '';
      const kickerLabel = p.collection || p.category || 'Drop 01';

      const thumbsHtml =
        gallery.length > 1
          ? `<div class="qv-thumbs">
               ${gallery
                 .map((g, idx) => {
                   const gPath = String(g.url || g.path || '').replace(/^\//, '');
                   return `<button type="button" class="qv-thumb ${idx === selectedImgIdx ? 'active' : ''}" data-qv-img-idx="${idx}" aria-label="View angle ${idx + 1}">
                     <img src="${base}${escapeHtml(gPath)}" alt="${escapeHtml(p.name)} view ${idx + 1}" loading="lazy" referrerpolicy="no-referrer">
                   </button>`;
                 })
                 .join('')}
             </div>`
          : '';

      body.innerHTML = `
        <div class="qv-grid">
          <div>
            <div class="qv-photo">
              ${
                imgPath
                  ? `<img src="${base}${escapeHtml(imgPath)}" alt="${escapeHtml(p.name)}" referrerpolicy="no-referrer">`
                  : `<div class="concept-slate">
                       <div class="stage-swatch-disc" style="width:58px;height:58px;background:${escapeHtml(currentVariant?.hex || '#170000')};"></div>
                       <strong>${escapeHtml(p.name)}</strong>
                       <small>${escapeHtml(currentVariant?.color || '')} · Media Pending</small>
                     </div>`
              }
            </div>
            ${thumbsHtml}
          </div>
          <div>
            <div class="eyebrow" style="margin-bottom:6px;">${escapeHtml(kickerLabel)}</div>
            <h3 style="margin:0 0 4px;font-size:1.55rem;font-weight:800;">${escapeHtml(p.name)}</h3>
            <div class="panel-sku">${escapeHtml(currentVariant?.sku || p.id)}${tierLabel ? ` · ${escapeHtml(tierLabel)}` : ''}</div>
            <div class="price tabular" style="font-size:1.4rem;font-weight:800;margin:12px 0;">${formatBdt(p.price_bdt)}</div>
            <p style="font-size:0.9rem;color:var(--mute);line-height:1.55;">${escapeHtml(p.copy_en || '')}</p>
            <div class="panel-label"><span>Colorway · ${escapeHtml(currentVariant?.color || '')}</span></div>
            <div class="panel-swatches" style="margin-bottom:12px;">
              ${(p.variants || [])
                .map(
                  (v) => `
                  <button type="button" class="panel-swatch-btn ${v.sku === currentVariant?.sku ? 'active' : ''}" data-qv-sku="${escapeHtml(v.sku)}">
                    <span class="color-dot" style="background:${escapeHtml(v.hex)}"></span>${escapeHtml(v.color)}
                  </button>`
                )
                .join('')}
            </div>
            ${
              sizes.length
                ? `<div class="panel-label"><span>Size</span></div>
                   <div class="panel-sizes" style="margin-bottom:14px;">
                     ${sizes
                       .map(
                         (sz) =>
                           `<button type="button" class="size-chip ${sz === selectedSize ? 'selected' : ''}" data-qv-size="${escapeHtml(sz)}">${escapeHtml(sz)}</button>`
                       )
                       .join('')}
                   </div>`
                : `<div class="notice" style="margin:10px 0;">Select an available colorway or reserve via WhatsApp.</div>`
            }
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
              ${
                purchasable
                  ? `<button type="button" class="btn" id="qvAddCart" style="flex:1;">Add to Bag · ${formatBdt(p.price_bdt)}</button>`
                  : `<a href="https://wa.me/8801778307704?text=${encodeURIComponent(
                      `Hello StarkiT! I am inquiring about "${p.name}" (SKU: ${currentVariant?.sku || p.id}, Color: ${currentVariant?.color || ''}, Size: ${selectedSize || 'Standard'}, Price: ${formatBdt(p.price_bdt)}).`
                    )}" target="_blank" rel="noopener noreferrer" class="btn" style="flex:1;text-align:center;">Reserve via WhatsApp ↗</a>`
              }
              <a href="${pdpHref}" class="btn btn-outline">Full Details ↗</a>
            </div>
          </div>
        </div>`;

      body.querySelectorAll('[data-qv-img-idx]').forEach((btn) => {
        btn.addEventListener('click', () => {
          selectedImgIdx = parseInt(btn.dataset.qvImgIdx, 10) || 0;
          paint();
        });
      });

      body.querySelectorAll('[data-qv-sku]').forEach((btn) => {
        btn.addEventListener('click', () => {
          currentVariant = (p.variants || []).find((v) => v.sku === btn.dataset.qvSku) || currentVariant;
          selectedImgIdx = 0;
          selectedSize =
            currentVariant?.available_sizes && currentVariant.available_sizes.length
              ? currentVariant.available_sizes[0]
              : '';
          paint();
        });
      });

      body.querySelectorAll('[data-qv-size]').forEach((btn) => {
        btn.addEventListener('click', () => {
          selectedSize = btn.dataset.qvSize;
          paint();
        });
      });

      body.querySelector('#qvAddCart')?.addEventListener('click', () => {
        if (onAddToCart && purchasable) {
          onAddToCart(p, currentVariant, selectedSize || 'Standard', 1);
          modal.classList.remove('open');
        }
      });
    };

    paint();
    modal.classList.add('open');
  }

  function renderCompareTray() {
    const tray = document.getElementById('compareTray');
    const summary = document.getElementById('compareSummary');
    if (!tray || !summary) return;
    if (state.compareIds.length === 0) {
      tray.classList.remove('visible');
      return;
    }
    const items = state.compareIds
      .map((id) => (products || []).find((p) => p.id === id))
      .filter(Boolean);
    summary.textContent = `Compare (${items.length}/2): ${items.map((x) => x.name).join(' vs ')}`;
    tray.classList.add('visible');
  }

  function openCompareModal() {
    const modal = document.getElementById('compareModal');
    const body = document.getElementById('compareModalBody');
    if (!modal || !body) return;
    const items = state.compareIds
      .map((id) => (products || []).find((p) => p.id === id))
      .filter(Boolean);
    if (!items.length) return;

    body.innerHTML = `
      <div style="overflow-x:auto;">
        <table class="fit-table" style="text-align:left;">
          <thead>
            <tr>
              <th>Specification</th>
              ${items.map((p) => `<th>${escapeHtml(p.name)} (${escapeHtml(p.id)})</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>Collection</strong></td>${items.map((p) => `<td>${escapeHtml(p.collection || p.category || 'Drop 01')}</td>`).join('')}</tr>
            <tr><td><strong>Tier &amp; Price</strong></td>${items.map((p) => `<td>${escapeHtml(PRICE_TIERS[p.price_tier]?.label || 'Standard')} · ${formatBdt(p.price_bdt)}</td>`).join('')}</tr>
            <tr><td><strong>Fabric</strong></td>${items.map((p) => `<td>${escapeHtml(p.fabric_claim || '—')}</td>`).join('')}</tr>
            <tr><td><strong>Colorways</strong></td>${items.map((p) => `<td>${(p.variants || []).map((v) => `${escapeHtml(v.color)} (Studio Ready)`).join(', ')}</td>`).join('')}</tr>
            <tr><td><strong>Detail View</strong></td>${items.map((p) => `<td><a class="link-arrow" href="${base}products/${escapeHtml(p.slug)}.html">Inspect Page ↗</a></td>`).join('')}</tr>
          </tbody>
        </table>
      </div>`;
    modal.classList.add('open');
  }

  function render() {
    syncUrlState();
    const items = getFilteredProducts();
    const hasActiveFilters =
      state.category !== 'All' || state.tier !== 'All' || state.color !== 'All' || state.query.trim() !== '';

    if (countEl) {
      countEl.innerHTML = `${items.length} ${items.length === 1 ? 'hoodie' : 'hoodies'}${
        hasActiveFilters
          ? `<button type="button" class="filter-reset-inline" id="inlineResetFiltersBtn" aria-label="Clear active filters">Reset ×</button>`
          : ''
      }`;
      countEl.querySelector('#inlineResetFiltersBtn')?.addEventListener('click', resetAllFilters);
    }

    if (!items.length) {
      grid.innerHTML = `
        <div class="no-results">
          <h3>No matching designs</h3>
          <p class="muted">Adjust your collection, colorway, tier filter, or search term.</p>
          <button type="button" class="btn btn-outline" id="resetCatalogFilters">Reset Filters</button>
        </div>`;
      grid.querySelector('#resetCatalogFilters')?.addEventListener('click', resetAllFilters);
      return;
    }

    grid.innerHTML = items
      .map((p) => {
        const chosenSku = state.selectedVariants.get(p.id);
        const activeVariant =
          (p.variants || []).find((v) => v.sku === chosenSku) || getPrimaryVariant(p);
        const frontObj = getPrimaryImage(p, activeVariant);
        const frontPath = frontObj?.url ? String(frontObj.url).replace(/^\//, '') : '';
        const secondaryGalleryItem = Array.isArray(activeVariant?.gallery)
          ? activeVariant.gallery.find((g) => g.view === 'back' || g.role === 'back' || g.view === 'lifestyle')
          : null;
        const backObj = secondaryGalleryItem || (Array.isArray(activeVariant?.gallery) && activeVariant.gallery.some((g) => g.view === 'back') ? getBackImage(p, activeVariant) : null);
        const backPath = backObj?.url ? String(backObj.url).replace(/^\//, '') : backObj?.path ? String(backObj.path).replace(/^\//, '') : '';
        const pdpHref = `${base}products/${escapeHtml(p.slug)}.html`;
        const isFav = state.wishlist.has(p.id);
        const isComp = state.compareIds.includes(p.id);
        const docCount = (p.variants || []).length;
        const tierLabel = PRICE_TIERS[p.price_tier]?.label || '';
        const kickerText = `${p.category || 'Drop 01'}${tierLabel ? ` · ${tierLabel}` : ''}`;

        let mediaContent = '';
        if (frontPath) {
          mediaContent = `
            <a href="${pdpHref}" aria-label="Inspect ${escapeHtml(p.name)}" style="position:absolute;inset:0;display:block;">
              <img class="front ${backPath ? '' : 'single-view'}" src="${base}${escapeHtml(frontPath)}" alt="${escapeHtml(p.name)} front" loading="lazy" referrerpolicy="no-referrer">
              ${backPath ? `<img class="back" src="${base}${escapeHtml(backPath)}" alt="${escapeHtml(p.name)} back" loading="lazy" referrerpolicy="no-referrer">` : ''}
            </a>`;
        } else {
          mediaContent = `
            <a href="${pdpHref}" class="concept-slate" aria-label="Inspect ${escapeHtml(p.name)}">
              <div class="stage-swatch-disc" style="width:52px;height:52px;margin-bottom:10px;background:${escapeHtml(activeVariant?.hex || '#170000')};"></div>
              <strong>${escapeHtml(p.name)}</strong>
              <small>${escapeHtml(activeVariant?.color || '')}</small>
            </a>`;
        }

        const swatchesHtml = (p.variants || [])
          .map((v) => {
            const active = activeVariant && v.sku === activeVariant.sku;
            return `<button type="button" class="swatch ${active ? 'active' : ''}" data-card-product="${escapeHtml(p.id)}" data-card-sku="${escapeHtml(v.sku)}" style="background:${escapeHtml(v.hex)};" aria-label="${escapeHtml(v.color)} (Studio Ready)" title="${escapeHtml(v.color)}"></button>`;
          })
          .join('');

        return `
          <article class="card" data-product-id="${escapeHtml(p.id)}">
            <div class="card-media">
              ${mediaContent}
              <div class="card-tools-top">
                <button type="button" class="compare-toggle ${isComp ? 'active' : ''}" data-compare-id="${escapeHtml(p.id)}" aria-label="Compare ${escapeHtml(p.name)}" title="Compare design">⇄</button>
                <button type="button" class="fav ${isFav ? 'active' : ''}" data-fav-id="${escapeHtml(p.id)}" aria-label="Save ${escapeHtml(p.name)} to wishlist">${isFav ? '♥' : '♡'}</button>
              </div>
              <div class="card-overlay">
                <button type="button" data-quick-view="${escapeHtml(p.id)}">Quick View</button>
                <a href="${pdpHref}">Inspect ↗</a>
              </div>
            </div>
            <div class="card-meta">
              <div>
                <span class="card-kicker">${escapeHtml(kickerText)}</span>
                <a href="${pdpHref}">${escapeHtml(p.name)}</a>
                ${p.bengali_name ? `<span class="card-bn">${escapeHtml(p.bengali_name)}</span>` : ''}
              </div>
              <span class="price tabular">${formatBdt(p.price_bdt)}</span>
            </div>
            <div class="swatches">
              ${swatchesHtml}
              <span class="craft-note" style="margin-left:auto;">${docCount} ${docCount === 1 ? 'Colorway' : 'Colorways'}</span>
            </div>
            <a href="${pdpHref}" class="card-cta-mobile">Inspect Design ↗</a>
          </article>`;
      })
      .join('');

    grid.querySelectorAll('[data-card-sku]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedVariants.set(btn.dataset.cardProduct, btn.dataset.cardSku);
        render();
      });
    });

    grid.querySelectorAll('[data-quick-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = (products || []).find((x) => x.id === btn.dataset.quickView);
        if (p) renderQuickView(p, state.selectedVariants.get(p.id));
      });
    });

    grid.querySelectorAll('[data-fav-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.favId;
        if (state.wishlist.has(id)) state.wishlist.delete(id);
        else state.wishlist.add(id);
        try {
          sessionStorage.setItem('starkit_wishlist', JSON.stringify([...state.wishlist]));
        } catch {}
        render();
      });
    });

    grid.querySelectorAll('[data-compare-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.compareId;
        if (state.compareIds.includes(id)) {
          state.compareIds = state.compareIds.filter((x) => x !== id);
        } else {
          if (state.compareIds.length >= 2) state.compareIds.shift();
          state.compareIds.push(id);
        }
        renderCompareTray();
        render();
      });
    });
  }

  categoryButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      categoryButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.category = btn.dataset.category || 'All';
      render();
    });
  });

  document.querySelectorAll('[data-jump-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetCat = btn.dataset.jumpFilter || 'All';
      state.category = targetCat;
      state.tier = 'All';
      state.color = 'All';
      if (tierSelect) tierSelect.value = 'All';
      if (colorSelect) colorSelect.value = 'All';
      categoryButtons.forEach((b) => b.classList.toggle('active', b.dataset.category === targetCat));
      render();
      const collectionEl = document.getElementById('collection');
      if (collectionEl) {
        collectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  searchInput?.addEventListener('input', (e) => {
    state.query = e.target.value;
    render();
  });

  sortSelect?.addEventListener('change', (e) => {
    state.sort = e.target.value;
    render();
  });

  tierSelect?.addEventListener('change', (e) => {
    state.tier = e.target.value;
    render();
  });

  colorSelect?.addEventListener('change', (e) => {
    state.color = e.target.value;
    render();
  });

  document.getElementById('openCompareBtn')?.addEventListener('click', openCompareModal);
  document.getElementById('clearCompareBtn')?.addEventListener('click', () => {
    state.compareIds = [];
    renderCompareTray();
    render();
  });
  document.getElementById('closeQuickView')?.addEventListener('click', () => {
    document.getElementById('quickViewModal')?.classList.remove('open');
  });
  document.getElementById('closeCompareModal')?.addEventListener('click', () => {
    document.getElementById('compareModal')?.classList.remove('open');
  });

  render();

  return {
    setTierFilter(tierCode) {
      state.tier = tierCode || 'All';
      if (tierSelect) tierSelect.value = state.tier;
      render();
    },
    refresh() {
      render();
    }
  };
}
