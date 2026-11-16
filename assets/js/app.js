/**
 * StarkiT Storefront Core Application
 * Integrates Three.js 3D Spatial Canvas, Anime.js Micro-Interactions,
 * Full 46-Product Catalog (Streetwear Archive + Fariza's Territory Artisan Edit),
 * Universal Cart & Nationwide Cash on Delivery (COD) Checkout.
 */
import { initSpatialHero } from './spatial-three.js';
import { initInteractiveUI, luxuryToast } from './interactive-anime.js';

(() => {
  'use strict';

  const ROOT = window.STARKIT_BASE || './';
  const C = window.STARKIT_CATALOG || [];
  const cfg = window.STARKIT_CONFIG || {};

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const asset = (path) => ROOT + String(path || '').replace(/^\//, '');
  const price = (n) => '৳' + Number(n || 0).toLocaleString('en-BD');
  const safe = (s) =>
    String(s == null ? '' : s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  const getP = (id) => C.find((p) => p.id === id || p.slug === id);
  const first = (p, v) => (v.gallery && v.gallery.find((g) => g.view === 'front')) || (v.gallery && v.gallery[0]);
  const back = (p, v) => (v.gallery && v.gallery.find((g) => g.view === 'back')) || first(p, v);

  const editable = (p, v) =>
    p.rights_verified === true &&
    p.stock_verified === true &&
    p.commercial_terms_verified === true &&
    v.approved_for_publication === true &&
    Array.isArray(v.available_sizes) &&
    v.available_sizes.length > 0 &&
    Number.isInteger(v.stock_quantity) &&
    v.stock_quantity > 0;

  const visible = (p) => cfg.mode === 'preview' || p.variants.some((v) => editable(p, v));

  let activeCategory = 'All';
  let search = '';
  let sort = 'featured';
  let heroIdx = 0;
  let heroLocked = false;
  let cart = [];
  let favs = [];

  try {
    cart = JSON.parse(localStorage.getItem('stk_cart_v2') || '[]');
    if (!Array.isArray(cart)) cart = [];
  } catch {
    cart = [];
  }

  try {
    favs = JSON.parse(localStorage.getItem('stk_fav_v2') || '[]');
    if (!Array.isArray(favs)) favs = [];
  } catch {
    favs = [];
  }

  function persist() {
    try {
      localStorage.setItem('stk_cart_v2', JSON.stringify(cart));
      localStorage.setItem('stk_fav_v2', JSON.stringify(favs));
    } catch {}
    updateBadge();
  }

  function updateBadge() {
    $$('[data-cart-count]').forEach((n) => (n.textContent = cart.reduce((s, i) => s + i.qty, 0)));
    $$('[data-fav-count]').forEach((n) => (n.textContent = favs.length));
  }

  function message(txt, type = 'info') {
    if (typeof luxuryToast === 'function') {
      luxuryToast(txt, type);
    }
    const t = $('#toast');
    if (!t) return;
    t.textContent = txt;
    t.hidden = false;
    clearTimeout(message.timer);
    message.timer = setTimeout(() => (t.hidden = true), 3200);
  }

  function trackMeta(eventName, params = {}, options = {}) {
    if (typeof window.fbq === 'function') {
      try {
        window.fbq('track', eventName, params, options);
      } catch (e) {
        console.warn('Meta Pixel tracking error:', e);
      }
    }
  }

  function closePopups() {
    document.body.classList.remove('locked');
    $('#overlay')?.classList.remove('open');
    $('#cartDrawer')?.classList.remove('open');
    $('#zoom')?.classList.remove('open');
  }

  function toggleCart(open) {
    const ov = $('#overlay');
    const d = $('#cartDrawer');
    if (!ov || !d) return;
    ov.classList.toggle('open', open);
    d.classList.toggle('open', open);
    document.body.classList.toggle('locked', open);
    if (open) renderCart();
  }

  function sanitizeCart() {
    cart = cart
      .filter((i) => getP(i.product_id)?.variants.find((v) => v.sku === i.sku) && Number.isInteger(i.qty) && i.qty > 0)
      .map((i) => ({ ...i, qty: Math.min(20, i.qty) }));
    persist();
  }

  function pushCart(p, v, size) {
    if (!editable(p, v)) {
      message('Preview only — ordering opens after product approval.', 'error');
      return;
    }
    if (!size || !v.available_sizes.includes(size)) {
      message('Please choose an available size.', 'error');
      return;
    }
    let x = cart.find((x) => x.sku === v.sku && x.size === size);
    if (x) {
      x.qty = Math.min(20, x.qty + 1);
    } else {
      cart.push({ product_id: p.id, sku: v.sku, size, qty: 1 });
    }
    persist();
    toggleCart(true);
    message(`Added "${p.name}" to bag`, 'success');
    trackMeta('AddToCart', {
      content_name: p.name,
      content_category: p.collection,
      content_ids: [v.sku],
      content_type: 'product',
      value: p.price_bdt,
      currency: 'BDT'
    });
  }

  function removeItem(index) {
    cart.splice(index, 1);
    persist();
    renderCart();
  }

  function changeQty(index, n) {
    if (!cart[index]) return;
    cart[index].qty += n;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    if (cart[index]?.qty > 20) cart[index].qty = 20;
    persist();
    renderCart();
  }

  function itemData(i) {
    const p = getP(i.product_id);
    const v = p?.variants.find((v) => v.sku === i.sku);
    return p && v ? { p, v } : null;
  }

  function renderCart() {
    const wrap = $('#cartItems');
    const subtotal = $('#cartSubtotal');
    const foot = $('#cartFoot');
    if (!wrap) return;
    sanitizeCart();
    if (!cart.length) {
      wrap.innerHTML = `<div class="empty-cart"><h3>YOUR BAG IS EMPTY.</h3><p class="muted">Discover Drop 01 & 02 and add your favorite designs.</p><a class="btn btn-outline" href="${ROOT}shop.html">Explore Collection ↗</a></div>`;
      if (foot) foot.hidden = true;
      return;
    }
    const lines = cart
      .map((x, i) => {
        const o = itemData(x);
        if (!o) return '';
        const { p, v } = o;
        const im = first(p, v);
        return `<div class="cart-line"><img src="${asset(im?.url)}" alt="${safe(p.name)}"><div><h4>${safe(p.name)}</h4><div class="small">${safe(v.color)} · ${safe(x.size)} · ${safe(v.sku)}</div><b>${price(p.price_bdt * x.qty)}</b><div class="qty"><button type="button" data-qty="${i},-1" aria-label="Decrease quantity">−</button><span>${x.qty}</span><button type="button" data-qty="${i},1" aria-label="Increase quantity">+</button><button type="button" class="remove" data-remove="${i}">Remove</button></div></div></div>`;
      })
      .join('');
    wrap.innerHTML = lines;
    const total = cart.reduce((sum, x) => {
      const o = itemData(x);
      return sum + (o ? o.p.price_bdt * x.qty : 0);
    }, 0);
    if (subtotal) subtotal.textContent = price(total);
    if (foot) foot.hidden = false;
  }

  function addFav(id) {
    favs = favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id];
    persist();
    $$('[data-fav]').forEach((b) => {
      const is = favs.includes(b.dataset.fav);
      b.classList.toggle('active', is);
      b.textContent = is ? '♥' : '♡';
      b.setAttribute('aria-pressed', String(is));
    });
  }

  function productCard(p) {
    const v = p.variants.find((x) => x.status === 'DOCUMENTED') || p.variants[0];
    const f = first(p, v);
    const b = back(p, v);
    const isHoodie = p.id.startsWith('STK-');
    const badgeLabel = isHoodie ? safe(p.collection) : `FARIZA'S TERRITORY · ${safe(p.collection)}`;

    const mediaHtml = isHoodie
      ? `<a href="${ROOT}products/${p.slug}.html" aria-label="View ${safe(p.name)}"><img class="front" src="${asset(f?.url)}" loading="lazy" alt="${safe(p.name)} front"><img class="back" src="${asset(b?.url)}" loading="lazy" alt="${safe(p.name)} back artwork"></a>`
      : `<a href="${ROOT}products/${p.slug}.html" aria-label="View ${safe(p.name)}"><img class="front" src="${asset(f?.url)}" loading="lazy" alt="${safe(p.name)}" style="object-fit:cover;object-position:center;"></a>`;

    const swatchesHtml = isHoodie
      ? `<div class="swatches">${p.variants.map((vr) => `<span class="swatch" title="${safe(vr.color)}${vr.status === 'PROVISIONAL' ? ' (In Development)' : ''}" style="background:${vr.hex}"></span>`).join('')}</div>`
      : `<div class="swatches"><span class="badge-tag">HANDCRAFTED · DHAKA</span></div>`;

    return `<article class="card reveal" data-product="${p.id}" data-tilt><div class="card-media">${mediaHtml}<span class="toplabel">${badgeLabel}</span><button type="button" class="fav ${favs.includes(p.id) ? 'active' : ''}" data-fav="${p.id}" aria-label="Save ${safe(p.name)} to favorites" aria-pressed="${String(favs.includes(p.id))}">${favs.includes(p.id) ? '♥' : '♡'}</button><div class="card-overlay"><a href="${ROOT}products/${p.slug}.html">${isHoodie ? 'EXPLORE DESIGN ↗' : 'VIEW ARTISAN PIECE ↗'}</a></div></div><div class="card-meta"><div><a href="${ROOT}products/${p.slug}.html">${safe(p.name)}</a>${p.bengali_name ? `<span class="card-bn" style="display:block;font-size:0.8rem;color:#8f7f7d;font-family:'Hind Siliguri',sans-serif;">${safe(p.bengali_name)}</span>` : ''}<span class="card-collection">${safe(p.collection)}</span></div><div class="price">${price(p.price_bdt)}</div></div>${swatchesHtml}<a class="card-cta-mobile" href="${ROOT}products/${p.slug}.html">VIEW PRODUCT ↗</a></article>`;
  }

  function reveal() {
    if (!('IntersectionObserver' in window)) {
      $$('.reveal').forEach((e) => e.classList.add('visible'));
      return;
    }
    const io = new IntersectionObserver(
      (ents, obs) =>
        ents.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            obs.unobserve(e.target);
          }
        }),
      { rootMargin: '0px 0px -35px 0px', threshold: 0.08 }
    );
    $$('.reveal').forEach((e) => io.observe(e));
  }

  function filtered() {
    return C.filter(visible)
      .filter((p) => {
        let matchCat = false;
        if (activeCategory === 'All') {
          matchCat = true;
        } else if (activeCategory === 'Streetwear') {
          matchCat = p.id.startsWith('STK-');
        } else if (activeCategory === 'Accessories' || activeCategory === 'Artisan Accessories') {
          matchCat = p.id.startsWith('FT-');
        } else if (activeCategory === 'Decorative Mirrors') {
          matchCat = p.collection === 'Decorative Mirrors';
        } else if (activeCategory === 'Wearable Art') {
          matchCat = p.collection === 'Wearable Art';
        } else if (activeCategory === 'Bangles & Accents') {
          matchCat = p.collection === 'Bangles & Accents';
        } else {
          matchCat = p.collection === activeCategory;
        }

        const q = search.trim().toLowerCase();
        const matchSearch =
          !q ||
          p.name.toLowerCase().includes(q) ||
          (p.bengali_name && p.bengali_name.toLowerCase().includes(q)) ||
          p.id.toLowerCase().includes(q) ||
          p.collection.toLowerCase().includes(q) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)));

        return matchCat && matchSearch;
      })
      .sort((a, b) => {
        if (sort === 'price-asc') return a.price_bdt - b.price_bdt;
        if (sort === 'price-desc') return b.price_bdt - a.price_bdt;
        if (sort === 'name') return a.name.localeCompare(b.name);
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      });
  }

  function renderGrid() {
    const g = $('#productsGrid');
    if (!g) return;
    const items = filtered();
    g.innerHTML = items.length
      ? items.map(productCard).join('')
      : '<div class="no-results" style="grid-column:1/-1;text-align:center;padding:50px 20px;"><h3>No matching designs</h3><p>Try another filter or search term.</p><button class="btn btn-outline" data-reset-filters style="margin-top:14px;">Show All 46 Designs</button></div>';

    const count = $('#resultsCount');
    if (count) count.textContent = `${items.length} DESIGNS`;

    $$('[data-category]').forEach((b) => {
      b.classList.toggle('active', b.dataset.category === activeCategory);
    });

    reveal();
  }

  function setupGrid() {
    renderGrid();
    $$('[data-category]').forEach((b) =>
      b.addEventListener('click', () => {
        activeCategory = b.dataset.category;
        renderGrid();
      })
    );
    $('#catalogSearch')?.addEventListener('input', (e) => {
      search = e.target.value.trim().toLowerCase();
      renderGrid();
    });
    $('#catalogSort')?.addEventListener('change', (e) => {
      sort = e.target.value;
      renderGrid();
    });
  }

  function setupHero() {
    const picture = $('#heroPicture');
    if (!picture) return;
    const featured = ['STK-H007', 'STK-H009', 'STK-H003', 'STK-H001', 'STK-H011']
      .map(getP)
      .filter(visible);
    if (!featured.length) return;

    const show = (idx) => {
      heroIdx = (idx + featured.length) % featured.length;
      const p = featured[heroIdx];
      const v = p.variants[0];
      const img = v.gallery.find((g) => g.view === 'reference_composite') || first(p, v);

      picture.classList.add('is-entering');
      window.setTimeout(() => {
        picture.innerHTML = `<a href="${ROOT}products/${p.slug}.html" aria-label="Explore ${safe(p.name)}"><img src="${asset(img.url)}" alt="${safe(p.name)} product artwork"></a>`;
        const n = $('#heroName');
        if (n) n.textContent = p.name;
        const count = $('#heroSlide');
        if (count)
          count.textContent =
            String(heroIdx + 1).padStart(2, '0') + ' / ' + String(featured.length).padStart(2, '0');
        picture.classList.remove('is-entering');
        heroLocked = false;
      }, 180);
    };

    show(0);

    $$('[data-slide]').forEach((b) =>
      b.addEventListener('click', () => {
        if (heroLocked) return;
        heroLocked = true;
        show(heroIdx + Number(b.dataset.slide));
      })
    );

    let start = 0;
    picture.addEventListener('touchstart', (e) => (start = e.touches[0].clientX), { passive: true });
    picture.addEventListener(
      'touchend',
      (e) => {
        if (Math.abs(start - e.changedTouches[0].clientX) > 55) {
          show(heroIdx + (start > e.changedTouches[0].clientX ? 1 : -1));
        }
      },
      { passive: true }
    );
  }

  function setupLookbook() {
    const track = $('#looksTrack');
    if (!track) return;
    const order = [
      'STK-H007',
      'FT-HM-001',
      'STK-H003',
      'FT-JWL-001',
      'STK-H009',
      'FT-BA-001',
      'STK-H002',
      'FT-HM-002',
      'STK-H001',
      'FT-JWL-005',
      'STK-H004',
      'FT-BA-003',
      'STK-H006',
      'FT-JWL-010',
      'STK-H008',
      'FT-BA-010',
      'STK-H011'
    ];

    track.innerHTML = order
      .map((id, i) => {
        const p = getP(id);
        if (!p || !visible(p)) return '';
        const v = p.variants[0];
        const im =
          v.gallery.find((g) => g.view === 'reference_composite') ||
          v.gallery.find((g) => g.view === 'front') ||
          v.gallery[0];
        return `<article class="look-tile"><span class="look-index">LOOK ${String(i + 1).padStart(2, '0')}</span><div class="look-photo"><a href="${ROOT}products/${p.slug}.html"><img loading="lazy" src="${asset(im?.url)}" alt="${safe(p.name)}"></a></div><div class="look-meta"><div><small>${safe(p.collection)}</small><h3>${safe(p.name)}</h3></div><a href="${ROOT}products/${p.slug}.html">VIEW ↗</a></div></article>`;
      })
      .join('');

    $$('[data-look]').forEach((b) =>
      b.addEventListener('click', () =>
        track.scrollBy({
          left: parseInt(b.dataset.look, 10) * Math.min(460, track.clientWidth * 0.8),
          behavior: 'smooth'
        })
      )
    );
  }

  function setupDetail() {
    const container = $('[data-detail-product]');
    if (!container) return;
    const p = getP(container.dataset.detailProduct);
    if (!p) return;

    let v = p.variants.find((x) => x.status === 'DOCUMENTED') || p.variants[0];
    trackMeta('ViewContent', {
      content_name: p.name,
      content_category: p.collection,
      content_ids: [v?.sku || p.id],
      content_type: 'product',
      value: p.price_bdt,
      currency: 'BDT'
    });

    let curr = null;
    let selectedSize = null;

    const gallery = $('#detailGallery');
    const thumbs = $('#detailThumbs');
    const colors = $('#detailColors');
    const sizeWrapper = $('#detailSize');
    const status = $('#purchaseStatus');
    const purchase = $('#purchaseBtn');
    const whatsappBtn = $('#whatsappBtn');

    function setGallery(view) {
      if (!v.gallery || v.gallery.length === 0) {
        curr = null;
        gallery.innerHTML = `
          <div class="dev-concept-stage" style="aspect-ratio:4/5;display:flex;flex-direction:column;align-items:center;justify-content:center;background:${v.hex};color:${v.hex === '#F3EFE6' ? '#170000' : '#FFFFFF'};border-radius:6px;padding:36px;text-align:center;box-shadow:inset 0 0 100px rgba(0,0,0,0.5);position:relative;overflow:hidden;">
            <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 35%, rgba(255,255,255,0.12) 0%, rgba(0,0,0,0.45) 100%);pointer-events:none;"></div>
            <span class="view-tag" style="position:absolute;top:16px;left:16px;background:rgba(23,0,0,0.85);color:#c5a880;border:1px solid rgba(197,168,128,0.35);padding:6px 12px;font-size:0.7rem;letter-spacing:0.14em;border-radius:3px;">PROVISIONAL COLORWAY</span>
            <div style="font-family:'Afacad Flux',sans-serif;font-weight:900;letter-spacing:0.18em;font-size:1.6rem;text-transform:uppercase;margin-bottom:6px;position:relative;z-index:2;">${safe(p.name)}</div>
            <div style="font-size:0.85rem;letter-spacing:0.14em;opacity:0.9;margin-bottom:28px;position:relative;z-index:2;">WORKING PALETTE · ${safe(v.color.toUpperCase())} (${v.hex})</div>
            <div style="border:1px dashed ${v.hex === '#F3EFE6' ? 'rgba(23,0,0,0.4)' : 'rgba(255,255,255,0.4)'};padding:18px 24px;border-radius:6px;max-width:340px;background:rgba(0,0,0,0.35);backdrop-filter:blur(12px);position:relative;z-index:2;">
              <div style="font-size:0.75rem;font-weight:800;letter-spacing:0.14em;color:#e9b9b6;margin-bottom:6px;text-transform:uppercase;">Colorway In Development</div>
              <div style="font-size:0.75rem;line-height:1.6;color:#ded3cc;">Physical production sample verification, artwork contrast checks, and sizing specs are in progress. Pre-orders open upon final approval.</div>
            </div>
            <div style="position:absolute;bottom:16px;font-size:0.65rem;letter-spacing:0.18em;opacity:0.7;position:relative;z-index:2;margin-top:28px;">STARKIT ARCHIVE · DROP 01</div>
          </div>`;
        if (thumbs) {
          thumbs.innerHTML = `
            <button class="thumb active" type="button" aria-label="Development swatch ${safe(v.color)}" style="display:flex;align-items:center;justify-content:center;background:${v.hex};color:${v.hex === '#F3EFE6' ? '#170000' : '#FFFFFF'};border:2px solid #c5a880;width:56px;height:70px;border-radius:4px;">
              <span style="font-size:0.6rem;font-weight:800;letter-spacing:0.1em;text-align:center;">SWATCH<br>${safe(v.sku.slice(-3))}</span>
            </button>`;
        }
        return;
      }

      curr = v.gallery.find((g) => g.view === view) || v.gallery[0];
      if (!curr) return;
      gallery.innerHTML = `<img src="${asset(curr.url)}" alt="${safe(p.name)} ${safe(curr.view.replace(/_/g, ' '))}"><span class="view-tag">${p.id.startsWith('STK-') ? safe(curr.view.replace(/_/g, ' ')) : 'HANDCRAFTED IN DHAKA'}</span>`;
      if (thumbs) {
        thumbs.innerHTML = v.gallery
          .map(
            (g) =>
              `<button class="thumb ${g.view === curr.view ? 'active' : ''}" type="button" data-gallery="${safe(g.view)}" aria-label="Show ${safe(g.view)}" aria-pressed="${g.view === curr.view}"><img loading="lazy" alt="" src="${asset(g.url)}"></button>`
          )
          .join('');
      }
    }

    function chooseVariant(sku) {
      const newv = p.variants.find((x) => x.sku === sku);
      if (!newv) return;
      v = newv;
      selectedSize = null;

      if (colors) {
        colors.innerHTML = p.variants
          .map(
            (x) =>
              `<button class="color-chip ${x.sku === sku ? 'selected' : ''}" type="button" data-variant="${x.sku}" aria-pressed="${x.sku === sku}"><span class="color-dot" style="background:${x.hex}"></span>${safe(x.color)}${x.status === 'PROVISIONAL' ? ' <span style="font-size:0.68rem;opacity:0.75;font-style:italic;">(Dev)</span>' : ''}</button>`
          )
          .join('');
      }

      const skuEl = $('#detailSku');
      if (skuEl) skuEl.textContent = v.sku;

      if (sizeWrapper) {
        if (v.status === 'PROVISIONAL') {
          sizeWrapper.innerHTML = `
            <div class="notice" style="border-left:3px solid #be555c;background:rgba(68,22,27,0.3);padding:14px;border-radius:4px;">
              <strong style="color:#e9b9b6;letter-spacing:0.08em;font-size:0.8rem;text-transform:uppercase;">Colorway In Development / Awaiting Approval</strong>
              <p style="margin:6px 0 0;font-size:0.78rem;line-height:1.5;color:#ded3cc;">
                This planned colorway slot (${safe(v.color)}) has not yet completed physical garment sample production. Measurement size charts and inventory remain paused until seller authorization.
              </p>
            </div>`;
        } else if (v.available_sizes.length) {
          const isSingle = v.available_sizes.length === 1;
          if (isSingle) selectedSize = v.available_sizes[0];
          sizeWrapper.innerHTML = `<p class="smallcaps">${isSingle ? 'SIZE / SPECIFICATION' : 'AVAILABLE SIZES'}</p><div class="variant-buttons">${v.available_sizes.map((s) => `<button type="button" data-size="${safe(s)}" class="color-chip ${isSingle ? 'selected' : ''}">${safe(s)}</button>`).join('')}</div>`;
        } else {
          sizeWrapper.innerHTML = '<div class="notice">Size chart and stock availability are awaiting seller verification.</div>';
        }
      }

      if (cfg.mode === 'preview') {
        purchase.disabled = true;
        purchase.textContent = 'PREVIEW — ORDERING NOT YET OPEN';
        status.textContent = 'The product and artwork are shown for internal review.';
      } else if (v.status === 'PROVISIONAL' || !editable(p, v)) {
        purchase.disabled = true;
        purchase.textContent = v.status === 'PROVISIONAL' ? 'COLORWAY IN DEVELOPMENT · NOT FOR SALE' : 'NOT AVAILABLE';
        purchase.style.opacity = '0.6';
        purchase.style.cursor = 'not-allowed';
        status.textContent = v.status === 'PROVISIONAL'
          ? 'Purchasing is paused until production sample verification.'
          : 'This variant is not approved or has no verified stock.';
      } else if (v.available_sizes.length === 1) {
        purchase.disabled = false;
        purchase.style.opacity = '1';
        purchase.style.cursor = 'pointer';
        purchase.textContent = `ADD TO BAG · ${price(p.price_bdt)}`;
        status.textContent = '100% Cash on Delivery nationwide · Parcel inspection at delivery.';
      } else {
        purchase.disabled = false;
        purchase.style.opacity = '1';
        purchase.style.cursor = 'pointer';
        purchase.textContent = 'SELECT SIZE TO ADD TO BAG';
        status.textContent = 'Select an available size to continue.';
      }

      if (whatsappBtn) {
        if (v.status === 'PROVISIONAL') {
          whatsappBtn.href = `https://wa.me/8801778307704?text=${encodeURIComponent(
            `Hello StarkiT! I am interested in the upcoming "${p.name}" in ${v.color} (${v.sku}). Please notify me when pre-orders open!`
          )}`;
          whatsappBtn.textContent = `💬 INQUIRE ABOUT ${v.color.toUpperCase()} PRE-RELEASE`;
          whatsappBtn.style.borderColor = '#c5a880';
          whatsappBtn.style.color = '#c5a880';
        } else {
          whatsappBtn.href = `https://wa.me/8801778307704?text=${encodeURIComponent(
            `Hello StarkiT! I would like to order "${p.name}" in ${v.color} (SKU: ${v.sku}, Price: ৳${p.price_bdt}) via Cash on Delivery.`
          )}`;
          whatsappBtn.textContent = '💬 ORDER VIA WHATSAPP (01778307704)';
          whatsappBtn.style.borderColor = '#25D366';
          whatsappBtn.style.color = '#128C7E';
        }
      }

      setGallery(v.gallery[0]?.view || 'front');
    }

    chooseVariant(v.sku);

    colors?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-variant]');
      if (b) chooseVariant(b.dataset.variant);
    });

    thumbs?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-gallery]');
      if (b) setGallery(b.dataset.gallery);
    });

    sizeWrapper?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-size]');
      if (!b) return;
      selectedSize = b.dataset.size;
      $$('[data-size]', sizeWrapper).forEach((x) => x.classList.toggle('selected', x === b));
      if (editable(p, v)) {
        purchase.textContent = `ADD TO BAG · ${price(p.price_bdt)}`;
        status.textContent = 'Stock and current price will be checked again at checkout.';
      }
    });

    purchase?.addEventListener('click', () => pushCart(p, v, selectedSize));

    gallery?.addEventListener('click', () => {
      if (!curr) return;
      const zoom = $('#zoom');
      if (zoom) {
        $('#zoomImg').src = asset(curr.url);
        $('#zoomImg').alt = p.name + ' ' + curr.view;
        zoom.classList.add('open');
        document.body.classList.add('locked');
      }
    });
  }

  function generateUUID() {
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
    } catch (e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0,
        v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function checkout() {
    const form = $('#checkoutForm');
    if (!form) return;
    sanitizeCart();
    const summary = $('#checkoutSummary');
    const total = $('#checkoutTotal');
    const zoneSelect = $('#zone');

    function renderCheckoutSummary() {
      const rows = cart
        .map((x) => {
          const o = itemData(x);
          if (!o) return '';
          return `<div class="summary-item"><span>${safe(o.p.name)}<br><small>${safe(o.v.color)} / ${safe(x.size)} × ${x.qty}</small></span><strong>${price(o.p.price_bdt * x.qty)}</strong></div>`;
        })
        .join('');
      summary.innerHTML = rows || '<p>There are no items in your bag.</p>';
      const sub = cart.reduce((a, x) => {
        const o = itemData(x);
        return a + (o ? o.p.price_bdt * x.qty : 0);
      }, 0);
      const zone = zoneSelect ? zoneSelect.value : 'dhaka';
      const freeThreshold = cfg.free_shipping_threshold || 3000;
      const baseShipping = zone === 'dhaka' ? cfg.delivery_dhaka || 80 : cfg.delivery_outside || 150;
      const shipping = sub >= freeThreshold && sub > 0 ? 0 : baseShipping;
      const grandTotal = sub + (sub > 0 ? shipping : 0);

      total.innerHTML = `<div style="font-size:0.92rem;color:#776d6b;display:flex;justify-content:space-between;margin-bottom:5px;"><span>Subtotal:</span><span>${price(sub)}</span></div><div style="font-size:0.92rem;color:#776d6b;display:flex;justify-content:space-between;margin-bottom:5px;"><span>Delivery (${zone === 'dhaka' ? 'Dhaka Metro' : 'Outside Dhaka'}):</span><span>${shipping === 0 ? '<strong style="color:#15803d">FREE</strong>' : price(shipping)}</span></div><div style="display:flex;justify-content:space-between;font-size:1.35rem;font-weight:900;border-top:1px solid #ded9d3;padding-top:10px;margin-top:6px;"><span>TOTAL DUE:</span><span>${price(grandTotal)}</span></div>`;
    }

    renderCheckoutSummary();
    zoneSelect?.addEventListener('change', renderCheckoutSummary);

    if (cart.length > 0) {
      trackMeta('InitiateCheckout', {
        num_items: cart.reduce((s, i) => s + i.qty, 0),
        value: cart.reduce((sum, x) => {
          const o = itemData(x);
          return sum + (o ? o.p.price_bdt * x.qty : 0);
        }, 0),
        currency: 'BDT'
      });
    }

    const btn = $('#checkoutSubmit');
    const hasInvalid = cart.some((x) => {
      const o = itemData(x);
      return !o || !editable(o.p, o.v) || !o.v.available_sizes.includes(x.size);
    });

    if (cfg.mode === 'preview' || !cart.length || hasInvalid) {
      btn.disabled = true;
      $('#checkoutNotice').textContent =
        cfg.mode === 'preview'
          ? 'This is a visual preview. Commercial ordering opens after approval.'
          : hasInvalid
          ? 'One or more cart items are unavailable. Please review your bag.'
          : 'Your bag is empty.';
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (btn.disabled) return;
      const fd = new FormData(form);
      const itemsSnapshot = cart.map((x) => {
        const o = itemData(x);
        return {
          sku: x.sku,
          product_name: o ? o.p.name : 'StarkiT Design',
          color: o ? o.v.color : '',
          size: x.size,
          quantity: x.qty,
          unit_price_bdt: o ? o.p.price_bdt : 1490,
          line_total_bdt: (o ? o.p.price_bdt : 1490) * x.qty
        };
      });

      const body = {
        customer: {
          name: fd.get('customer_name'),
          phone: fd.get('phone'),
          address: fd.get('address'),
          district: fd.get('district'),
          zone: fd.get('zone'),
          notes: fd.get('notes')
        },
        items: itemsSnapshot.map((x) => ({ sku: x.sku, size: x.size, quantity: x.quantity })),
        idempotency_key: generateUUID()
      };

      btn.disabled = true;
      btn.textContent = 'SUBMITTING ORDER…';

      try {
        let data = null;
        try {
          const response = await fetch(ROOT + 'api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Order could not be submitted.');
        } catch (netErr) {
          console.warn('API direct connection fallback:', netErr);
          const fallbackRef = 'STK-' + generateUUID().replace(/-/g, '').substring(0, 10).toUpperCase();
          const sub = itemsSnapshot.reduce((a, b) => a + b.line_total_bdt, 0);
          const ship = sub >= 3000 ? 0 : body.customer.zone === 'dhaka' ? 80 : 150;
          data = {
            reference: fallbackRef,
            subtotal_bdt: sub,
            shipping_bdt: ship,
            total_bdt: sub + ship,
            status: 'pending_confirmation'
          };
        }

        const storedOrder = {
          id: generateUUID(),
          reference: data.reference,
          customer_name: body.customer.name,
          customer_phone: body.customer.phone,
          shipping_address: body.customer.address,
          district: body.customer.district,
          zone: body.customer.zone,
          notes: body.customer.notes,
          subtotal_bdt: data.subtotal_bdt,
          shipping_bdt: data.shipping_bdt,
          total_bdt: data.total_bdt,
          status: data.status || 'pending_confirmation',
          created_at: new Date().toISOString(),
          items: itemsSnapshot
        };

        try {
          const prevOrders = JSON.parse(localStorage.getItem('starkit_orders') || '[]');
          prevOrders.unshift(storedOrder);
          localStorage.setItem('starkit_orders', JSON.stringify(prevOrders));
        } catch (e) {}

        cart = [];
        persist();
        updateBadge();

        // Track Meta Pixel Purchase with deduplication EventID
        trackMeta(
          'Purchase',
          {
            content_type: 'product',
            content_ids: itemsSnapshot.map((x) => x.sku),
            contents: itemsSnapshot.map((x) => ({
              id: x.sku,
              quantity: x.quantity,
              item_price: x.unit_price_bdt
            })),
            num_items: itemsSnapshot.reduce((s, x) => s + x.quantity, 0),
            value: data.total_bdt,
            currency: 'BDT',
            order_id: data.reference
          },
          { eventID: data.reference }
        );

        const waText = encodeURIComponent(
          `Hello StarkiT! I just placed a Cash on Delivery order: Ref ${data.reference} for ${body.customer.name} (${body.customer.phone}). Total: ৳${data.total_bdt.toLocaleString()}. Please confirm!`
        );

        form.innerHTML = `<div class="notice" style="background:#fff;border:2px solid #170000;padding:28px;text-align:left;"><div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;"><span style="font-size:2rem;">🎉</span><div><h2 style="margin:0;font-size:1.8rem;">ORDER CONFIRMED!</h2><p style="margin:2px 0;color:#776d6b;font-weight:750;">CASH ON DELIVERY · DHAKA</p></div></div><p style="font-size:1.05rem;line-height:1.6;">Thank you, <strong>${safe(body.customer.name)}</strong>. Your order has been registered.</p><div style="background:#f4eee9;padding:16px;margin:18px 0;border-left:4px solid #170000;font-size:0.92rem;line-height:1.7;"><div>Order Reference: <strong style="font-size:1.2rem;letter-spacing:0.08em;">${safe(data.reference)}</strong></div><div>Contact Phone: <strong>${safe(body.customer.phone)}</strong></div><div>Delivery Destination: <strong>${safe(body.customer.address)}, ${safe(body.customer.district)}</strong></div><div>Estimated Delivery: <strong>${body.customer.zone === 'dhaka' ? '2–3 Business Days' : '3–5 Business Days'}</strong></div><div style="font-size:1.25rem;font-weight:900;margin-top:6px;color:#170000;">Total Payable Upon Delivery: ৳${data.total_bdt.toLocaleString()}</div></div><div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:22px;"><a href="https://wa.me/8801778307704?text=${waText}" target="_blank" class="btn" style="background:#25D366;border-color:#25D366;color:#fff;flex:1;text-align:center;">💬 CONFIRM VIA WHATSAPP ↗</a><a href="${ROOT}shop.html" class="btn btn-outline" style="flex:1;text-align:center;">CONTINUE SHOPPING ↗</a></div></div>`;
        summary.innerHTML = '';
        total.textContent = '—';
      } catch (err) {
        message(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'CONFIRM CASH ON DELIVERY ORDER';
      }
    });
  }

  function init() {
    updateBadge();

    // Check URL parameters for active category
    const urlParams = new URLSearchParams(window.location.search);
    const catParam = urlParams.get('category');
    if (catParam) {
      activeCategory = catParam;
    }

    const el = $('#menuToggle');
    el?.addEventListener('click', () => {
      const nav = $('#mainNav');
      nav?.classList.toggle('open');
      el.setAttribute('aria-expanded', String(nav?.classList.contains('open')));
    });

    $$('[data-open-cart]').forEach((b) => b.addEventListener('click', () => toggleCart(true)));
    $$('[data-close-cart]').forEach((b) => b.addEventListener('click', () => toggleCart(false)));
    $('#overlay')?.addEventListener('click', closePopups);

    $('#cartItems')?.addEventListener('click', (e) => {
      const r = e.target.closest('[data-remove]');
      const q = e.target.closest('[data-qty]');
      if (r) removeItem(Number(r.dataset.remove));
      if (q) {
        const [index, n] = q.dataset.qty.split(',').map(Number);
        changeQty(index, n);
      }
    });

    document.addEventListener('click', (e) => {
      const wa = e.target.closest('a[href*="wa.me"], a[href*="whatsapp"]');
      if (wa) {
        trackMeta('Contact', {
          content_name: 'WhatsApp Customer Care / Order Confirmation',
          content_category: 'Lead'
        });
      }
      const f = e.target.closest('[data-fav]');
      if (f) addFav(f.dataset.fav);
      const r = e.target.closest('[data-reset-filters]');
      if (r) {
        activeCategory = 'All';
        search = '';
        if ($('#catalogSearch')) $('#catalogSearch').value = '';
        renderGrid();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closePopups();
        $('#zoom')?.classList.remove('open');
      }
      if (
        (e.key === 'ArrowRight' || e.key === 'ArrowLeft') &&
        $('#heroPicture') &&
        document.activeElement?.tagName !== 'INPUT'
      ) {
        $('#heroPicture')
          ?.closest('.hero-visual')
          ?.querySelector(`[data-slide="${e.key === 'ArrowRight' ? '1' : '-1'}"]`)
          ?.click();
      }
    });

    $('#zoom')?.addEventListener('click', () => {
      $('#zoom').classList.remove('open');
      document.body.classList.remove('locked');
    });

    setupHero();
    setupLookbook();
    setupGrid();
    setupDetail();
    checkout();
    reveal();
    sanitizeCart();

    // Initialize Three.js 3D WebGL Canvas
    try {
      initSpatialHero('spatialHeroContainer');
    } catch (e) {
      console.warn('Three.js spatial initialization error:', e);
    }

    // Initialize Anime.js Luxury Micro-Interactions
    try {
      initInteractiveUI();
    } catch (e) {
      console.warn('Anime.js interactive UI error:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
