import { escapeHtml, formatBdt } from '../core/validation.js';
import { calculateOrderPricing, DEFAULT_PROMOTIONS } from '../core/pricing-engine.js';
import { getPrimaryImage } from '../core/catalog-schema.js';
import { animateCartOpen, animateSpringPop, luxuryToast } from '../interactive-anime.js';

const CART_STORAGE_KEY = 'starkit_cart_v2';

export function initCartDrawer({ products, base, storeConfig }) {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('overlay');
  const itemsEl = document.getElementById('cartItems');
  const footEl = document.getElementById('cartFoot');
  const subtotalEl = document.getElementById('cartSubtotal');
  const countEls = document.querySelectorAll('[data-cart-count]');

  function loadCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  let cart = loadCart();

  function saveCart() {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {}
    updateBadges();
  }

  function updateBadges() {
    const qtyTotal = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    countEls.forEach((el) => {
      el.textContent = String(qtyTotal);
    });
  }

  function getPromotions() {
    return Array.isArray(window.STARKIT_PROMOTIONS) && window.STARKIT_PROMOTIONS.length
      ? window.STARKIT_PROMOTIONS
      : DEFAULT_PROMOTIONS;
  }

  function resolveCatalogPair(sku) {
    for (const p of products || []) {
      const v = (p.variants || []).find((item) => item.sku === sku);
      if (v) return { product: p, variant: v };
    }
    return { product: null, variant: null };
  }

  function buildCatalogMap() {
    const map = new Map();
    for (const p of products || []) {
      for (const v of p.variants || []) {
        map.set(v.sku, { product: p, variant: v });
      }
    }
    return map;
  }

  const catalogMap = buildCatalogMap();

  function getPricingSummary(zone = 'dhaka') {
    const lineDetails = cart
      .map((item) => {
        const { product, variant } = resolveCatalogPair(item.sku);
        if (!product || !variant) return null;
        const qty = Number(item.quantity) || 1;
        return {
          sku: variant.sku,
          product_name: product.name,
          color: variant.color,
          size: item.size || 'Standard',
          quantity: qty,
          unit_price_bdt: Number(product.price_bdt || 0),
          line_total_bdt: Number(product.price_bdt || 0) * qty
        };
      })
      .filter(Boolean);

    const calc = calculateOrderPricing({
      items: lineDetails,
      catalogMap,
      zone,
      config: storeConfig || {},
      promotions: getPromotions()
    });
    return { ...calc, items: lineDetails };
  }

  function render() {
    updateBadges();
    if (!itemsEl || !footEl) return;

    if (!cart.length) {
      footEl.hidden = true;
      itemsEl.innerHTML = `
        <div class="empty-cart">
          <h3>Your Bag is Empty</h3>
          <p class="muted">Explore Drop 01 graphic hoodies or Fariza's Territory artisan pieces to build your bag.</p>
          <a href="${base}shop.html" class="btn btn-outline">Browse Collection ↗</a>
        </div>`;
      return;
    }

    const pricing = getPricingSummary('dhaka');
    const threshold = Number(storeConfig?.free_shipping_threshold ?? 3000);
    const pct = threshold > 0 ? Math.min(100, Math.round((pricing.subtotal_bdt / threshold) * 100)) : 100;
    const remaining = Math.max(0, threshold - pricing.subtotal_bdt);

    const meterHtml = `
      <div class="cart-meter-wrap">
        <div class="meter-header">
          <span>${pricing.is_free_shipping ? 'Free Nationwide Shipping Unlocked' : `Add ${formatBdt(remaining)} for Free Shipping`}</span>
          <span class="meter-badge ${pricing.is_free_shipping ? 'unlocked' : ''}">${pct}%</span>
        </div>
        <div class="meter-track"><div class="meter-fill ${pricing.is_free_shipping ? 'full' : ''}" style="width:${pct}%"></div></div>
      </div>`;

    const linesHtml = cart
      .map((item, idx) => {
        const { product, variant } = resolveCatalogPair(item.sku);
        const imgObj = product && variant ? getPrimaryImage(product, variant) : null;
        const imgPath = imgObj?.url ? String(imgObj.url).replace(/^\//, '') : '';
        const name = product ? product.name : item.sku;
        const unitPrice = product ? Number(product.price_bdt) : 0;
        const qty = Number(item.quantity) || 1;
        return `
          <div class="cart-line">
            <img src="${imgPath ? base + escapeHtml(imgPath) : base + 'assets/images/starkit-favicon.png'}" alt="${escapeHtml(name)}" referrerpolicy="no-referrer">
            <div>
              <h4>${escapeHtml(name)}</h4>
              <div class="small">${escapeHtml(variant?.color || '')} · Size ${escapeHtml(item.size)} · ${escapeHtml(item.sku)}</div>
              <b class="tabular">${formatBdt(unitPrice * qty)}</b>
              <div class="qty">
                <button type="button" data-cart-dec="${idx}" aria-label="Decrease quantity">−</button>
                <span>${qty}</span>
                <button type="button" data-cart-inc="${idx}" aria-label="Increase quantity">+</button>
                <button type="button" class="remove" data-cart-rm="${idx}">Remove</button>
              </div>
            </div>
          </div>`;
      })
      .join('');

    itemsEl.innerHTML = meterHtml + linesHtml;
    footEl.hidden = false;

    if (subtotalEl) {
      subtotalEl.textContent =
        pricing.discount_bdt > 0
          ? `${formatBdt(pricing.subtotal_bdt - pricing.discount_bdt)} (−${formatBdt(pricing.discount_bdt)} promo)`
          : formatBdt(pricing.subtotal_bdt);
    }

    itemsEl.querySelectorAll('[data-cart-dec]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.cartDec);
        if (cart[idx].quantity > 1) cart[idx].quantity -= 1;
        else cart.splice(idx, 1);
        saveCart();
        render();
        window.dispatchEvent(new CustomEvent('starkit:cart-updated'));
      });
    });

    itemsEl.querySelectorAll('[data-cart-inc]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.cartInc);
        cart[idx].quantity = Math.min(20, (cart[idx].quantity || 1) + 1);
        saveCart();
        render();
        window.dispatchEvent(new CustomEvent('starkit:cart-updated'));
      });
    });

    itemsEl.querySelectorAll('[data-cart-rm]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.cartRm);
        cart.splice(idx, 1);
        saveCart();
        render();
        window.dispatchEvent(new CustomEvent('starkit:cart-updated'));
      });
    });
  }

  function open() {
    if (!drawer || !overlay) return;
    render();
    overlay.classList.add('open');
    drawer.classList.add('open');
    document.body.classList.add('locked');
    animateCartOpen();
  }

  function close() {
    if (!drawer || !overlay) return;
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    document.body.classList.remove('locked');
  }

  function addItem(product, variant, size = 'L', quantity = 1) {
    if (!product || !variant) return;
    const qtyToAdd = Math.max(1, Math.min(20, Number(quantity) || 1));
    const existing = cart.find((x) => x.sku === variant.sku && x.size === size);
    if (existing) {
      existing.quantity = Math.min(20, existing.quantity + qtyToAdd);
    } else {
      cart.push({ sku: variant.sku, size, quantity: qtyToAdd });
    }
    saveCart();
    render();
    animateSpringPop('[data-cart-count]');
    luxuryToast(`Added ${product.name} (${variant.color}, ${size}) to bag.`);
    if (typeof window.fbq === 'function') {
      try {
        window.fbq('track', 'AddToCart', {
          content_ids: [variant.sku],
          content_type: 'product',
          value: Number(product.price_bdt) * qtyToAdd,
          currency: 'BDT'
        });
      } catch {}
    }
    window.dispatchEvent(new CustomEvent('starkit:cart-updated'));
    open();
  }

  function clear() {
    cart = [];
    saveCart();
    render();
    window.dispatchEvent(new CustomEvent('starkit:cart-updated'));
  }

  document.querySelectorAll('[data-open-cart]').forEach((btn) => btn.addEventListener('click', open));
  document.querySelectorAll('[data-close-cart]').forEach((btn) => btn.addEventListener('click', close));
  overlay?.addEventListener('click', close);

  updateBadges();

  return {
    open,
    close,
    addItem,
    clear,
    getItems: () => [...cart],
    getPricingSummary
  };
}
