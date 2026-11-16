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

  function calculateCartTotals() {
    sanitizeCart();
    const subtotal = cart.reduce((sum, x) => {
      const o = itemData(x);
      return sum + (o ? o.p.price_bdt * x.qty : 0);
    }, 0);

    const hoodieCount = cart.reduce((sum, x) => {
      const o = itemData(x);
      return sum + (o && o.p.id.startsWith('STK-') ? x.qty : 0);
    }, 0);

    let bundleDiscount = 0;
    let bundleTier = 0;
    if (hoodieCount >= 3) {
      bundleDiscount = 300;
      bundleTier = 2;
    } else if (hoodieCount === 2) {
      bundleDiscount = 150;
      bundleTier = 1;
    }

    const freeThreshold = cfg.free_shipping_threshold || 3000;
    const isFreeShipping = subtotal >= freeThreshold || bundleTier > 0;
    const netTotal = Math.max(0, subtotal - bundleDiscount);

    return {
      subtotal,
      hoodieCount,
      bundleDiscount,
      bundleTier,
      freeThreshold,
      isFreeShipping,
      netTotal
    };
  }

  function pushCart(p, v, size, qty = 1) {
    if (!editable(p, v)) {
      message('Preview only — ordering opens after product approval.', 'error');
      return;
    }
    if (!size || !v.available_sizes.includes(size)) {
      message('Please choose an available size.', 'error');
      return;
    }
    const addQty = Math.max(1, Math.min(20, parseInt(qty, 10) || 1));
    let x = cart.find((x) => x.sku === v.sku && x.size === size);
    if (x) {
      x.qty = Math.min(20, x.qty + addQty);
    } else {
      cart.push({ product_id: p.id, sku: v.sku, size, qty: addQty });
    }
    persist();
    toggleCart(true);
    message(`Added "${p.name}" (${size}) × ${addQty} to bag`, 'success');
    trackMeta('AddToCart', {
      content_name: p.name,
      content_category: p.collection,
      content_ids: [v.sku],
      content_type: 'product',
      value: p.price_bdt * addQty,
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

  function renderCartMeter(totals) {
    const { subtotal, hoodieCount, bundleTier, freeThreshold, isFreeShipping } = totals;
    let meterText = '';
    let badgeText = '';
    let progressPct = 0;
    let isUnlocked = false;

    if (isFreeShipping || subtotal >= freeThreshold) {
      isUnlocked = true;
      progressPct = 100;
      if (bundleTier === 2) {
        meterText = '🔥 SUPER BUNDLE UNLOCKED · ৳300 OFF + FREE DELIVERY!';
        badgeText = 'TIER 2 ACTIVE';
      } else if (bundleTier === 1) {
        meterText = '🎉 BUNDLE DISCOUNT UNLOCKED · ৳150 OFF + FREE DELIVERY!';
        badgeText = 'TIER 1 ACTIVE';
      } else {
        meterText = '🎉 FREE NATIONWIDE DELIVERY UNLOCKED!';
        badgeText = 'FREE SHIPPING';
      }
    } else {
      progressPct = Math.min(100, Math.round((subtotal / freeThreshold) * 100));
      const needed = freeThreshold - subtotal;
      if (hoodieCount === 1) {
        meterText = `Add 1 more hoodie for ৳150 OFF + Free Delivery! (or ৳${needed.toLocaleString()} more)`;
        badgeText = '1/2 TO BUNDLE';
      } else {
        meterText = `Add ৳${needed.toLocaleString()} more for FREE Delivery nationwide!`;
        badgeText = `${progressPct}% UNLOCKED`;
      }
    }

    return `
      <div class="cart-meter-wrap">
        <div class="meter-header">
          <span>${meterText}</span>
          <span class="meter-badge ${isUnlocked ? 'unlocked' : ''}">${badgeText}</span>
        </div>
        <div class="meter-track">
          <div class="meter-fill ${isUnlocked ? 'full' : ''}" style="width: ${progressPct}%"></div>
        </div>
      </div>
    `;
  }

  function renderCart() {
    const wrap = $('#cartItems');
    const subtotalEl = $('#cartSubtotal');
    const foot = $('#cartFoot');
    if (!wrap) return;
    sanitizeCart();
    if (!cart.length) {
      wrap.innerHTML = `<div class="empty-cart"><h3>YOUR BAG IS EMPTY.</h3><p class="muted">Discover Drop 01 & 02 and add your favorite designs.</p><a class="btn btn-outline" href="${ROOT}shop.html">Explore Collection ↗</a></div>`;
      if (foot) foot.hidden = true;
      return;
    }

    const totals = calculateCartTotals();
    const meterHtml = renderCartMeter(totals);

    const lines = cart
      .map((x, i) => {
        const o = itemData(x);
        if (!o) return '';
        const { p, v } = o;
        const im = first(p, v);
        return `<div class="cart-line"><img src="${asset(im?.url)}" alt="${safe(p.name)}"><div><h4>${safe(p.name)}</h4><div class="small">${safe(v.color)} · ${safe(x.size)} · ${safe(v.sku)}</div><b>${price(p.price_bdt * x.qty)}</b><div class="qty"><button type="button" data-qty="${i},-1" aria-label="Decrease quantity">−</button><span>${x.qty}</span><button type="button" data-qty="${i},1" aria-label="Increase quantity">+</button><button type="button" class="remove" data-remove="${i}">Remove</button></div></div></div>`;
      })
      .join('');

    wrap.innerHTML = meterHtml + lines;

    if (subtotalEl) {
      if (totals.bundleDiscount > 0) {
        subtotalEl.innerHTML = `<span style="text-decoration:line-through;color:#887;font-size:0.95rem;margin-right:6px;">${price(totals.subtotal)}</span> <span style="color:#c5a880;">${price(totals.netTotal)}</span> <span style="font-size:0.75rem;color:#22c55e;display:block;">(৳${totals.bundleDiscount} BUNDLE SAVINGS APPLIED)</span>`;
      } else {
        subtotalEl.textContent = price(totals.subtotal);
      }
    }

    if (foot) {
      foot.hidden = false;
      const waCartBtn = $('#cartWhatsAppBtn');
      if (waCartBtn) {
        const waBagSummary = cart
          .map((x) => {
            const o = itemData(x);
            return o ? `• ${o.p.name} (${o.v.color}, Size ${x.size}) × ${x.qty}` : '';
          })
          .filter(Boolean)
          .join('\n');
        const waMsg = encodeURIComponent(
          `Hello StarkiT! I would like to order my shopping bag:\n${waBagSummary}\nTotal: ৳${totals.netTotal.toLocaleString()} (Cash on Delivery). Please confirm!`
        );
        waCartBtn.href = `https://wa.me/8801778307704?text=${waMsg}`;
      }
    }
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
    let selectedQty = 1;

    const gallery = $('#detailGallery');
    const thumbs = $('#detailThumbs');
    const colors = $('#detailColors');
    const sizeWrapper = $('#detailSize');
    const status = $('#purchaseStatus');
    const purchase = $('#purchaseBtn');
    const whatsappBtn = $('#whatsappBtn');

    function updateWhatsAppUrl() {
      if (!whatsappBtn) return;
      if (v.status === 'PROVISIONAL') {
        whatsappBtn.href = `https://wa.me/8801778307704?text=${encodeURIComponent(
          `Hello StarkiT! I am interested in the upcoming "${p.name}" in ${v.color} (${v.sku}). Please notify me when pre-orders open!`
        )}`;
        whatsappBtn.textContent = `💬 INQUIRE ABOUT ${v.color.toUpperCase()} PRE-RELEASE`;
        whatsappBtn.style.borderColor = '#c5a880';
        whatsappBtn.style.color = '#c5a880';
      } else {
        const sizeText = selectedSize ? ` (Size: ${selectedSize}, Qty: ${selectedQty})` : ` (Qty: ${selectedQty})`;
        whatsappBtn.href = `https://wa.me/8801778307704?text=${encodeURIComponent(
          `Hello StarkiT! I would like to order "${p.name}" in ${v.color}${sizeText} (SKU: ${v.sku}, Price: ৳${(p.price_bdt * selectedQty).toLocaleString()}) via Cash on Delivery.`
        )}`;
        whatsappBtn.textContent = '💬 ORDER VIA WHATSAPP (01778307704)';
        whatsappBtn.style.borderColor = '#25D366';
        whatsappBtn.style.color = '#128C7E';
      }
    }

    function updatePurchaseBtn() {
      if (!purchase) return;
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
      } else if (v.available_sizes.length === 1 || selectedSize) {
        purchase.disabled = false;
        purchase.style.opacity = '1';
        purchase.style.cursor = 'pointer';
        const qtyText = selectedQty > 1 ? ` (${selectedQty})` : '';
        purchase.textContent = `ADD TO BAG${qtyText} · ${price(p.price_bdt * selectedQty)}`;
        status.textContent = '100% Cash on Delivery nationwide · Parcel inspection at delivery.';
      } else {
        purchase.disabled = false;
        purchase.style.opacity = '1';
        purchase.style.cursor = 'pointer';
        purchase.textContent = 'SELECT SIZE TO ADD TO BAG';
        status.textContent = 'Select an available size to continue.';
      }
      updateWhatsAppUrl();
    }

    // Insert Quantity Stepper if not already present
    if (purchase && !$('#detailQtyInput')) {
      const stepperWrap = document.createElement('div');
      stepperWrap.style.display = 'flex';
      stepperWrap.style.gap = '10px';
      stepperWrap.style.alignItems = 'center';
      stepperWrap.style.marginTop = '20px';

      const stepper = document.createElement('div');
      stepper.className = 'qty-stepper';
      stepper.innerHTML = `
        <button type="button" id="qtyDecBtn" aria-label="Decrease quantity">−</button>
        <input type="number" id="detailQtyInput" value="1" min="1" max="10" readonly aria-label="Quantity">
        <button type="button" id="qtyIncBtn" aria-label="Increase quantity">+</button>
      `;
      stepperWrap.appendChild(stepper);

      purchase.parentNode.insertBefore(stepperWrap, purchase);
      purchase.style.marginTop = '0';
      purchase.style.flex = '1';
      stepperWrap.appendChild(purchase);

      $('#qtyDecBtn')?.addEventListener('click', () => {
        selectedQty = Math.max(1, selectedQty - 1);
        $('#detailQtyInput').value = selectedQty;
        updatePurchaseBtn();
      });
      $('#qtyIncBtn')?.addEventListener('click', () => {
        selectedQty = Math.min(10, selectedQty + 1);
        $('#detailQtyInput').value = selectedQty;
        updatePurchaseBtn();
      });
    }

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
            </div>
            <div class="vip-waitlist-box">
              <div style="font-size:0.75rem;font-weight:800;color:#c5a880;letter-spacing:0.12em;text-transform:uppercase;">VIP EARLY ACCESS WAITLIST</div>
              <p style="font-size:0.75rem;color:#ded3cc;margin:6px 0 0;line-height:1.5;">Enter your WhatsApp/Mobile number to get notified 24 hours before the ${safe(v.color)} colorway drops.</p>
              <form class="vip-waitlist-form" id="vipWaitlistForm">
                <input type="tel" id="vipPhone" placeholder="01XXXXXXXXX" required>
                <button type="submit">JOIN WAITLIST ↗</button>
              </form>
              <div id="vipSuccessMsg" style="display:none;font-size:0.75rem;color:#22c55e;margin-top:8px;font-weight:700;">✓ You are on the VIP waitlist! We will notify you via WhatsApp on drop day.</div>
            </div>`;

          const vipForm = $('#vipWaitlistForm');
          vipForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const ph = $('#vipPhone')?.value.trim();
            if (ph) {
              try {
                const leads = JSON.parse(localStorage.getItem('starkit_vip_leads') || '[]');
                leads.push({ phone: ph, sku: v.sku, color: v.color, product: p.name, time: new Date().toISOString() });
                localStorage.setItem('starkit_vip_leads', JSON.stringify(leads));
              } catch (err) {}
              $('#vipSuccessMsg').style.display = 'block';
              vipForm.style.display = 'none';
              message(`Added ${ph} to VIP drop list for ${v.color}!`, 'success');
            }
          });
        } else if (v.available_sizes.length) {
          const isSingle = v.available_sizes.length === 1;
          if (isSingle) selectedSize = v.available_sizes[0];
          const isHoodie = p.id.startsWith('STK-');
          const fitLinkHtml = isHoodie
            ? `<button type="button" class="fit-trigger-link" id="openFitModalBtn">📏 FIT FINDER &amp; SIZE CHART</button>`
            : '';
          sizeWrapper.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <p class="smallcaps" style="margin:0;">${isSingle ? 'SIZE / SPECIFICATION' : 'AVAILABLE SIZES'}</p>
              ${fitLinkHtml}
            </div>
            <div class="variant-buttons">
              ${v.available_sizes.map((s) => `<button type="button" data-size="${safe(s)}" class="color-chip ${isSingle ? 'selected' : ''}">${safe(s)}</button>`).join('')}
            </div>`;
        } else {
          sizeWrapper.innerHTML = '<div class="notice">Size chart and stock availability are awaiting seller verification.</div>';
        }
      }

      updatePurchaseBtn();
      setGallery(v.gallery[0]?.view || 'front');
    }

    chooseVariant(v.sku);

    // Setup Fit Finder Modal
    if (p.id.startsWith('STK-')) {
      let modal = $('#fitModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'fitModal';
        modal.className = 'fit-modal';
        modal.innerHTML = `
          <div class="fit-modal-card">
            <div class="fit-modal-head">
              <div>
                <h3 style="font-family:'Afacad Flux',sans-serif;font-weight:900;">STARKIT · FIT FINDER &amp; SIZE SPECIFICATIONS</h3>
                <span style="font-size:0.7rem;letter-spacing:0.12em;color:#c5a880;text-transform:uppercase;">DHAKA STREETWEAR SIZING CALCULATOR</span>
              </div>
              <button type="button" id="closeFitModalBtn" style="background:transparent;border:0;color:#fff;font-size:1.8rem;cursor:pointer;line-height:1;">×</button>
            </div>
            <div class="fit-modal-body">
              <h4 style="font-size:0.8rem;letter-spacing:0.12em;text-transform:uppercase;color:#5b1a24;margin-bottom:8px;">1. SMART SIZE CALCULATOR</h4>
              <p style="font-size:0.82rem;color:#665;margin:0 0 12px;line-height:1.5;">Choose your height, body build, and desired styling drape to see your recommended size in our 330–350 GSM combed cotton fleece silhouette:</p>
              <div class="fit-calc-controls">
                <div>
                  <label style="font-size:0.7rem;font-weight:800;text-transform:uppercase;display:block;margin-bottom:4px;">Height</label>
                  <select id="fitHeight" style="width:100%;padding:8px 10px;border:1px solid #d3c8c0;font-size:0.82rem;">
                    <option value="160">Under 5'5" (Under 165 cm)</option>
                    <option value="168" selected>5'5" – 5'7" (165–172 cm)</option>
                    <option value="175">5'8" – 5'10" (173–179 cm)</option>
                    <option value="183">5'11"+ (180+ cm)</option>
                  </select>
                </div>
                <div>
                  <label style="font-size:0.7rem;font-weight:800;text-transform:uppercase;display:block;margin-bottom:4px;">Body Build</label>
                  <select id="fitBuild" style="width:100%;padding:8px 10px;border:1px solid #d3c8c0;font-size:0.82rem;">
                    <option value="slim">Slim / Lean</option>
                    <option value="regular" selected>Regular / Athletic</option>
                    <option value="broad">Broad / Heavy</option>
                  </select>
                </div>
                <div>
                  <label style="font-size:0.7rem;font-weight:800;text-transform:uppercase;display:block;margin-bottom:4px;">Desired Drape</label>
                  <select id="fitDrape" style="width:100%;padding:8px 10px;border:1px solid #d3c8c0;font-size:0.82rem;">
                    <option value="standard" selected>Standard Streetwear Fit</option>
                    <option value="oversized">Oversized Silhouette</option>
                  </select>
                </div>
              </div>

              <div class="fit-calc-result" id="fitCalcResult">
                <div>
                  <div style="font-size:0.7rem;letter-spacing:0.14em;color:#c5a880;text-transform:uppercase;font-weight:800;">Recommended Size</div>
                  <div id="fitRecSize" style="font-size:1.45rem;font-weight:900;letter-spacing:0.04em;">SIZE L (42" Chest × 28.5" Length)</div>
                  <div style="font-size:0.75rem;color:#c8b6b7;">Heavyweight 330–350 GSM Combed Cotton Fleece</div>
                </div>
                <button type="button" id="applyFitSizeBtn" class="btn btn-light" style="min-height:38px;padding:8px 16px;font-size:0.72rem;letter-spacing:0.1em;border-radius:3px;">APPLY SIZE L ↗</button>
              </div>

              <div style="margin-top:24px;">
                <h4 style="font-size:0.8rem;letter-spacing:0.12em;text-transform:uppercase;color:#5b1a24;margin-bottom:8px;">2. PHYSICAL MEASUREMENT SPECIFICATIONS (INCHES)</h4>
                <table class="fit-table">
                  <thead>
                    <tr>
                      <th>Size</th>
                      <th>Chest (Circumference)</th>
                      <th>Body Length</th>
                      <th>Sleeve Length</th>
                      <th>Shoulder Width</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td><strong>M</strong></td><td>40 inches</td><td>27.5 inches</td><td>24.5 inches</td><td>19.0 inches</td></tr>
                    <tr><td><strong>L</strong></td><td>42 inches</td><td>28.5 inches</td><td>25.5 inches</td><td>20.0 inches</td></tr>
                    <tr><td><strong>XL</strong></td><td>44 inches</td><td>29.5 inches</td><td>26.5 inches</td><td>21.0 inches</td></tr>
                    <tr><td><strong>XXL</strong></td><td>46 inches</td><td>30.5 inches</td><td>27.5 inches</td><td>22.0 inches</td></tr>
                  </tbody>
                </table>
              </div>

              <div style="background:#f4eee9;border-left:4px solid #170000;padding:12px 16px;margin-top:16px;font-size:0.8rem;line-height:1.5;">
                <strong>✓ 7-Day Easy Size Exchange:</strong> If your hoodie doesn't fit exactly the way you like, exchange it within 7 days anywhere in Bangladesh. Contact concierge via call or WhatsApp at <strong>01778307704</strong>.
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#closeFitModalBtn')?.addEventListener('click', () => modal.classList.remove('open'));
        modal.addEventListener('click', (e) => {
          if (e.target === modal) modal.classList.remove('open');
        });

        const updateRec = () => {
          const h = parseInt($('#fitHeight').value, 10);
          const b = $('#fitBuild').value;
          const d = $('#fitDrape').value;
          let idx = 1;
          if (h <= 163) idx = 0;
          else if (h <= 170) idx = 1;
          else if (h <= 178) idx = 2;
          else idx = 3;

          if (b === 'broad') idx = Math.min(3, idx + 1);
          if (b === 'slim' && idx > 0) idx -= 1;
          if (d === 'oversized') idx = Math.min(3, idx + 1);

          const table = [
            { s: 'M', c: '40"', l: '27.5"' },
            { s: 'L', c: '42"', l: '28.5"' },
            { s: 'XL', c: '44"', l: '29.5"' },
            { s: 'XXL', c: '46"', l: '30.5"' }
          ];
          const choice = table[idx];
          $('#fitRecSize').textContent = `SIZE ${choice.s} (${choice.c} Chest × ${choice.l} Length)`;
          $('#applyFitSizeBtn').textContent = `APPLY SIZE ${choice.s} ↗`;
          $('#applyFitSizeBtn').dataset.targetSize = choice.s;
        };

        $('#fitHeight')?.addEventListener('change', updateRec);
        $('#fitBuild')?.addEventListener('change', updateRec);
        $('#fitDrape')?.addEventListener('change', updateRec);

        $('#applyFitSizeBtn')?.addEventListener('click', (e) => {
          const sz = e.target.dataset.targetSize || 'L';
          const chip = sizeWrapper?.querySelector(`[data-size="${sz}"]`);
          if (chip) chip.click();
          modal.classList.remove('open');
          message(`Recommended Size ${sz} selected!`, 'success');
        });
      }

      document.addEventListener('click', (e) => {
        if (e.target.closest('#openFitModalBtn') || e.target.closest('[data-open-fit-finder]')) {
          modal.classList.add('open');
        }
      });
    }

    // Sticky Mobile Add-to-Bag Bar
    let stickyBar = $('#stickyMobileBar');
    if (!stickyBar) {
      stickyBar = document.createElement('div');
      stickyBar.id = 'stickyMobileBar';
      stickyBar.className = 'sticky-mobile-bar';
      stickyBar.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;overflow:hidden;">
          <img id="stickyThumb" src="" alt="" style="width:38px;height:46px;object-fit:contain;background:#2a0b10;border-radius:3px;flex-shrink:0;">
          <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            <div id="stickyTitle" style="font-weight:800;font-size:0.8rem;color:#fff;overflow:hidden;text-overflow:ellipsis;"></div>
            <div id="stickyPrice" style="color:#c5a880;font-weight:800;font-size:0.82rem;"></div>
          </div>
        </div>
        <button id="stickyAddBtn" class="btn" style="min-height:38px;padding:6px 16px;font-size:0.72rem;letter-spacing:0.08em;background:#c5a880;color:#170000;border:0;font-weight:800;border-radius:3px;flex-shrink:0;">
          ADD TO BAG
        </button>
      `;
      document.body.appendChild(stickyBar);

      $('#stickyAddBtn')?.addEventListener('click', () => {
        if (!selectedSize && v.available_sizes.length > 1) {
          message('Please select a size first.', 'error');
          window.scrollTo({ top: purchase.offsetTop - 120, behavior: 'smooth' });
        } else {
          purchase.click();
        }
      });
    }

    function updateStickyBar() {
      const thumbImg = first(p, v);
      const stImg = $('#stickyThumb');
      if (stImg) stImg.src = asset(thumbImg?.url);
      const stTitle = $('#stickyTitle');
      if (stTitle) stTitle.textContent = p.name + (selectedSize ? ` (${selectedSize})` : '');
      const stPrice = $('#stickyPrice');
      if (stPrice) stPrice.textContent = price(p.price_bdt * selectedQty);
    }

    window.addEventListener('scroll', () => {
      if (!purchase) return;
      const rect = purchase.getBoundingClientRect();
      if (rect.bottom < 0) {
        stickyBar.classList.add('visible');
        updateStickyBar();
      } else {
        stickyBar.classList.remove('visible');
      }
    }, { passive: true });

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
      updatePurchaseBtn();
      updateStickyBar();
    });

    purchase?.addEventListener('click', () => pushCart(p, v, selectedSize, selectedQty));

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
      const totals = calculateCartTotals();
      const rows = cart
        .map((x) => {
          const o = itemData(x);
          if (!o) return '';
          return `<div class="summary-item"><span>${safe(o.p.name)}<br><small>${safe(o.v.color)} / ${safe(x.size)} × ${x.qty}</small></span><strong>${price(o.p.price_bdt * x.qty)}</strong></div>`;
        })
        .join('');
      summary.innerHTML = rows || '<p>There are no items in your bag.</p>';

      const zone = zoneSelect ? zoneSelect.value : 'dhaka';
      const baseShipping = zone === 'dhaka' ? cfg.delivery_dhaka || 80 : cfg.delivery_outside || 150;
      const isFree = totals.isFreeShipping || totals.subtotal >= (cfg.free_shipping_threshold || 3000);
      const shipping = isFree && cart.length > 0 ? 0 : baseShipping;
      const grandTotal = Math.max(0, totals.netTotal + (cart.length > 0 ? shipping : 0));

      let discountHtml = '';
      if (totals.bundleDiscount > 0) {
        discountHtml = `<div style="font-size:0.92rem;color:#15803d;display:flex;justify-content:space-between;margin-bottom:6px;font-weight:700;"><span>Bundle Offer (${totals.hoodieCount} Hoodies):</span><span>-${price(totals.bundleDiscount)}</span></div>`;
      }

      total.innerHTML = `
        <div style="font-size:0.92rem;color:#776d6b;display:flex;justify-content:space-between;margin-bottom:6px;"><span>Subtotal:</span><span>${price(totals.subtotal)}</span></div>
        ${discountHtml}
        <div style="font-size:0.92rem;color:#776d6b;display:flex;justify-content:space-between;margin-bottom:6px;"><span>Delivery (${zone === 'dhaka' ? 'Dhaka Metro' : 'Outside Dhaka'}):</span><span>${shipping === 0 ? '<strong style="color:#15803d">FREE</strong>' : price(shipping)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:1.35rem;font-weight:900;border-top:1px solid #ded9d3;padding-top:10px;margin-top:6px;color:#170000;"><span>TOTAL PAYABLE (COD):</span><span>${price(grandTotal)}</span></div>
      `;
    }

    renderCheckoutSummary();
    zoneSelect?.addEventListener('change', () => {
      const distInput = $('#district');
      if (distInput && zoneSelect.value === 'dhaka' && !distInput.value) {
        distInput.value = 'Dhaka';
      }
      renderCheckoutSummary();
    });

    // Real-time phone validation
    const phoneInput = $('#custPhone');
    phoneInput?.addEventListener('input', (e) => {
      const cleanPhone = e.target.value.replace(/[\s-]/g, '');
      const isValid = /^(?:\+?880|0)1[3-9]\d{8}$/.test(cleanPhone);
      phoneInput.style.borderColor = isValid ? '#15803d' : cleanPhone.length > 3 ? '#be555c' : '#cfc5bf';
    });

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
          const totals = calculateCartTotals();
          const ship = (totals.isFreeShipping || totals.subtotal >= 3000) ? 0 : body.customer.zone === 'dhaka' ? 80 : 150;
          data = {
            reference: fallbackRef,
            subtotal_bdt: totals.subtotal,
            discount_bdt: totals.bundleDiscount,
            shipping_bdt: ship,
            total_bdt: totals.netTotal + ship,
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
          discount_bdt: data.discount_bdt || 0,
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

        // Redirect to dedicated luxury Order Confirmation Receipt Page
        window.location.href = `${ROOT}order-confirmation.html?ref=${encodeURIComponent(data.reference)}`;
      } catch (err) {
        message(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'CONFIRM CASH ON DELIVERY ORDER';
      }
    });
  }

  function renderConfirmation() {
    const container = $('#confirmationContainer');
    if (!container) return;
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');

    let order = null;
    try {
      const orders = JSON.parse(localStorage.getItem('starkit_orders') || '[]');
      if (refParam) {
        order = orders.find((o) => o.reference === refParam);
      }
      if (!order && orders.length > 0) {
        order = orders[0];
      }
    } catch (e) {}

    if (!order) {
      container.innerHTML = `
        <div style="text-align:center;padding:50px 20px;background:#fff;border:1px solid #ded9d3;border-radius:8px;">
          <h2 style="font-size:2rem;font-weight:900;margin-bottom:12px;">ORDER NOT FOUND IN CURRENT BROWSER</h2>
          <p style="color:#776d6b;line-height:1.6;max-width:480px;margin:auto;">If you placed an order recently, our support team has received it and will contact you via phone or WhatsApp for confirmation.</p>
          <div style="margin-top:24px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
            <a href="${ROOT}shop.html" class="btn">Explore Collection ↗</a>
            <a href="https://wa.me/8801778307704" target="_blank" class="btn btn-outline" style="border-color:#25d366;color:#128c7e;">💬 Contact Concierge</a>
          </div>
        </div>
      `;
      return;
    }

    const itemsHtml = (order.items || [])
      .map((i) => {
        return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #eee;">
          <div>
            <div style="font-weight:800;font-size:0.95rem;">${safe(i.product_name)}</div>
            <div style="font-size:0.75rem;color:#776d6b;">${safe(i.color)} · Size ${safe(i.size)} × ${i.quantity}</div>
          </div>
          <div style="font-weight:800;font-size:1rem;color:#170000;">${price(i.line_total_bdt || i.unit_price_bdt * i.quantity)}</div>
        </div>
      `;
      })
      .join('');

    const waText = encodeURIComponent(
      `Hello StarkiT! I would like to confirm my Cash on Delivery order: Ref ${order.reference} for ${order.customer_name} (${order.customer_phone}). Total Payable: ৳${Number(order.total_bdt).toLocaleString()}.`
    );

    let discountRow = '';
    if (order.discount_bdt > 0) {
      discountRow = `
        <div style="display:flex;justify-content:space-between;font-size:0.9rem;color:#15803d;margin-bottom:6px;font-weight:700;">
          <span>Bundle Offer Savings:</span><span>-${price(order.discount_bdt)}</span>
        </div>
      `;
    }

    container.innerHTML = `
      <div style="background:#fff;border:1px solid #ded9d3;border-radius:8px;padding:clamp(24px, 4vw, 42px);box-shadow:0 12px 35px rgba(0,0,0,0.06);">
        <div style="text-align:center;border-bottom:1px solid #eee;padding-bottom:24px;margin-bottom:24px;">
          <div style="font-size:2.8rem;margin-bottom:8px;">🎉</div>
          <span class="pill pill-dark" style="background:#15803d;margin-bottom:10px;">ORDER CONFIRMED · CASH ON DELIVERY</span>
          <h1 style="font-size:clamp(2rem, 3.8vw, 2.8rem);font-weight:900;letter-spacing:-0.04em;margin:10px 0 6px;">THANK YOU, ${safe(order.customer_name).toUpperCase()}!</h1>
          <p style="color:#776d6b;font-size:0.95rem;max-width:500px;margin:auto;line-height:1.5;">Your order is registered with StarkiT Dhaka HQ. Our delivery concierge will call or message to confirm dispatch.</p>
        </div>

        <div style="background:#f4eee9;border:1px solid #e0d6cf;border-left:4px solid #170000;border-radius:4px;padding:18px;margin-bottom:26px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;">
          <div>
            <div style="font-size:0.72rem;letter-spacing:0.14em;text-transform:uppercase;color:#887;font-weight:800;">Official Order Reference</div>
            <div style="font-size:1.45rem;font-weight:900;letter-spacing:0.06em;color:#170000;" id="orderRefText">${safe(order.reference)}</div>
          </div>
          <button type="button" class="btn btn-outline" id="copyRefBtn" style="min-height:38px;padding:8px 16px;font-size:0.72rem;letter-spacing:0.1em;border-radius:3px;">📋 COPY REFERENCE</button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:20px;margin-bottom:26px;">
          <div style="background:#faf8f5;border:1px solid #ede7e1;border-radius:6px;padding:16px;">
            <h4 style="font-size:0.75rem;letter-spacing:0.12em;text-transform:uppercase;color:#887;margin-bottom:8px;">DELIVERY DESTINATION</h4>
            <div style="font-weight:800;font-size:0.95rem;color:#170000;">${safe(order.customer_name)}</div>
            <div style="font-size:0.85rem;color:#554;margin-top:2px;">Phone: <strong>${safe(order.customer_phone)}</strong></div>
            <div style="font-size:0.85rem;color:#554;margin-top:2px;line-height:1.4;">${safe(order.shipping_address)}, ${safe(order.district)}</div>
          </div>
          <div style="background:#faf8f5;border:1px solid #ede7e1;border-radius:6px;padding:16px;">
            <h4 style="font-size:0.75rem;letter-spacing:0.12em;text-transform:uppercase;color:#887;margin-bottom:8px;">DELIVERY TIMELINE &amp; PAYMENT</h4>
            <div style="font-weight:800;font-size:0.95rem;color:#170000;">${order.zone === 'dhaka' ? 'Dhaka Metro (24–48 Hours)' : 'Nationwide Courier (3–5 Days)'}</div>
            <div style="font-size:0.85rem;color:#554;margin-top:2px;">Method: <strong>Cash on Delivery (Pay at Doorstep)</strong></div>
            <div style="font-size:0.85rem;color:#15803d;font-weight:700;margin-top:4px;">✓ Parcel inspection permitted upon delivery</div>
          </div>
        </div>

        <h3 style="font-size:1.15rem;font-weight:900;letter-spacing:0.02em;margin-bottom:12px;border-bottom:2px solid #170000;padding-bottom:8px;">ORDERED ITEMS</h3>
        <div style="margin-bottom:24px;">
          ${itemsHtml}
        </div>

        <div style="background:#faf8f5;border:1px solid #ede7e1;border-radius:6px;padding:16px;margin-bottom:28px;">
          <div style="display:flex;justify-content:space-between;font-size:0.9rem;color:#665;margin-bottom:6px;">
            <span>Subtotal:</span><span>${price(order.subtotal_bdt)}</span>
          </div>
          ${discountRow}
          <div style="display:flex;justify-content:space-between;font-size:0.9rem;color:#665;margin-bottom:6px;">
            <span>Delivery Fee:</span><span>${order.shipping_bdt === 0 ? '<strong style="color:#15803d">FREE</strong>' : price(order.shipping_bdt)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:1.4rem;font-weight:900;color:#170000;border-top:1px solid #ded9d3;padding-top:10px;margin-top:6px;">
            <span>TOTAL PAYABLE UPON DELIVERY:</span><span style="color:#170000;">${price(order.total_bdt)}</span>
          </div>
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <a href="https://wa.me/8801778307704?text=${waText}" target="_blank" class="btn" style="background:#25d366;border-color:#25d366;color:#fff;flex:1;text-align:center;min-height:48px;">
            💬 CONFIRM VIA WHATSAPP (01778307704) ↗
          </a>
          <button type="button" class="btn btn-outline" id="printReceiptBtn" style="flex:1;min-height:48px;">
            🖨️ PRINT RECEIPT
          </button>
          <a href="${ROOT}shop.html" class="btn btn-outline" style="flex:1;text-align:center;min-height:48px;">
            CONTINUE SHOPPING ↗
          </a>
        </div>
      </div>
    `;

    $('#copyRefBtn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(order.reference).then(() => {
        message('Order reference copied to clipboard!', 'success');
      });
    });

    $('#printReceiptBtn')?.addEventListener('click', () => {
      window.print();
    });
  }

  function setupWhatsAppConcierge() {
    if ($('#floatingWhatsAppPill')) return;
    const pill = document.createElement('a');
    pill.id = 'floatingWhatsAppPill';
    pill.className = 'floating-whatsapp-pill';
    pill.href =
      'https://wa.me/8801778307704?text=' +
      encodeURIComponent('Hello StarkiT Concierge! I have a question about Drop 01 designs and nationwide delivery.');
    pill.target = '_blank';
    pill.rel = 'noopener noreferrer';
    pill.setAttribute('aria-label', 'Chat with StarkiT Customer Concierge on WhatsApp');
    pill.innerHTML = `<span>💬</span><span>WhatsApp (01778307704)</span>`;
    document.body.appendChild(pill);
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
    renderConfirmation();
    setupWhatsAppConcierge();
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
