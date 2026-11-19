/**
 * StarkiT Authoritative Pricing & Configurable Promotion Engine
 * Ensures identical integer-BDT calculations on storefront UI and server API.
 * Promotions are strictly inactive until approved & activated by store owner.
 */

export const DEFAULT_PROMOTIONS = [
  {
    code: 'SINGLE_PIECE',
    title: 'Single Piece',
    subtitle: 'Standard Archive Tier',
    tier_type: 'SINGLE',
    min_qty: 1,
    applies_to: 'hoodies',
    discount_type: 'NONE',
    discount_value: 0,
    free_shipping: false,
    combinable: false,
    active: true,
    requires_approval: false,
    badge: 'Standard Order',
    description: 'Order any single hoodie at its official four-tier price (Core ৳1,099 to Premium ৳1,499) with nationwide Cash on Delivery.'
  },
  {
    code: 'DUO_SELECTION',
    title: 'Duo Selection',
    subtitle: '2 Hoodies · Configurable Offer Slot',
    tier_type: 'DUO',
    min_qty: 2,
    applies_to: 'hoodies',
    discount_type: 'FIXED_BDT',
    discount_value: 0,
    free_shipping: false,
    combinable: false,
    active: false,
    requires_approval: true,
    badge: 'Pending Owner Rule',
    description: 'Configurable 2-hoodie bundle rule. Owner can assign a fixed BDT discount or free delivery inside Admin when launching this offer.'
  },
  {
    code: 'TRIO_PLUS',
    title: 'Three or More',
    subtitle: '3+ Hoodies · Multi-Piece Offer Slot',
    tier_type: 'TRIO_PLUS',
    min_qty: 3,
    applies_to: 'hoodies',
    discount_type: 'FIXED_BDT',
    discount_value: 0,
    free_shipping: false,
    combinable: false,
    active: false,
    requires_approval: true,
    badge: 'Pending Owner Rule',
    description: 'Configurable 3+ hoodie volume offer. Activated only after owner sets exact margin-verified savings in Admin.'
  },
  {
    code: 'WHOLESALE_RESELLER',
    title: 'Wholesale & Reseller',
    subtitle: '10+ Units · Studio Inquiry',
    tier_type: 'WHOLESALE',
    min_qty: 10,
    applies_to: 'hoodies',
    discount_type: 'INQUIRY',
    discount_value: 0,
    free_shipping: false,
    combinable: false,
    active: false,
    requires_approval: true,
    badge: 'Inquiry / Custom Quote',
    description: 'Stockists, campus clubs, and bulk orders (10+ pieces). Configure reseller percentage rules in Admin or contact Dhaka support.'
  }
];

export function evaluatePromotionSavings(promo, { hoodieCount, hoodieSubtotal, totalQty, subtotal }) {
  if (!promo || promo.active !== true || promo.requires_approval === true) {
    return { eligible: false, discount_bdt: 0, free_shipping: false };
  }
  const count = promo.applies_to === 'hoodies' ? hoodieCount : totalQty;
  const base = promo.applies_to === 'hoodies' ? hoodieSubtotal : subtotal;
  const minQty = Number(promo.min_qty || 1);
  if (count < minQty || base <= 0) {
    return { eligible: false, discount_bdt: 0, free_shipping: false };
  }

  let discount = 0;
  const val = Number(promo.discount_value || 0);
  if (promo.discount_type === 'FIXED_BDT' && Number.isInteger(val) && val > 0) {
    discount = Math.min(base, val);
  } else if (promo.discount_type === 'PERCENT' && Number.isFinite(val) && val > 0 && val <= 80) {
    discount = Math.min(base, Math.round((base * val) / 100));
  }

  return {
    eligible: true,
    discount_bdt: discount,
    free_shipping: promo.free_shipping === true
  };
}

export function calculateOrderPricing({
  items = [],
  catalogMap,
  zone = 'dhaka',
  config = {},
  promotions = DEFAULT_PROMOTIONS
}) {
  let subtotalBdt = 0;
  let hoodieSubtotalBdt = 0;
  let hoodieCount = 0;
  let totalQty = 0;

  for (const item of items) {
    if (!item || !item.sku) continue;
    const qty = Number(item.qty ?? item.quantity ?? 0);
    if (!Number.isInteger(qty) || qty <= 0) continue;

    const entry =
      catalogMap instanceof Map
        ? catalogMap.get(item.sku)
        : catalogMap && Object.hasOwn(catalogMap, item.sku)
        ? catalogMap[item.sku]
        : undefined;
    if (!entry) continue;

    const product = entry.product || entry;
    const unitPrice = Number(product.price_bdt || 0);
    const lineTotal = unitPrice * qty;

    subtotalBdt += lineTotal;
    totalQty += qty;
    if (String(product.id || item.sku).startsWith('STK-')) {
      hoodieCount += qty;
      hoodieSubtotalBdt += lineTotal;
    }
  }

  const activePromos = (Array.isArray(promotions) ? promotions : DEFAULT_PROMOTIONS).filter(
    (p) => p && p.active === true && p.requires_approval !== true
  );

  const candidates = [];
  for (const promo of activePromos) {
    const res = evaluatePromotionSavings(promo, {
      hoodieCount,
      hoodieSubtotal: hoodieSubtotalBdt,
      totalQty,
      subtotal: subtotalBdt
    });
    if (res.eligible && (res.discount_bdt > 0 || res.free_shipping)) {
      candidates.push({ promo, ...res });
    }
  }

  let discountBdt = 0;
  let promoFreeShipping = false;
  const appliedPromotions = [];

  if (candidates.length > 0) {
    const combinable = candidates.filter((c) => c.promo.combinable === true);
    const nonCombinable = candidates.filter((c) => c.promo.combinable !== true);

    let bestSingle = null;
    for (const c of nonCombinable) {
      if (!bestSingle || c.discount_bdt > bestSingle.discount_bdt || (c.discount_bdt === bestSingle.discount_bdt && c.free_shipping && !bestSingle.free_shipping)) {
        bestSingle = c;
      }
    }

    const combinableDiscount = combinable.reduce((s, c) => s + c.discount_bdt, 0);
    const combinableFreeShip = combinable.some((c) => c.free_shipping);

    if (bestSingle && bestSingle.discount_bdt >= combinableDiscount) {
      discountBdt = bestSingle.discount_bdt;
      promoFreeShipping = bestSingle.free_shipping;
      appliedPromotions.push({
        code: bestSingle.promo.code,
        title: bestSingle.promo.title,
        discount_bdt: bestSingle.discount_bdt,
        free_shipping: bestSingle.free_shipping
      });
    } else if (combinable.length > 0) {
      discountBdt = Math.min(subtotalBdt, combinableDiscount);
      promoFreeShipping = combinableFreeShip;
      for (const c of combinable) {
        appliedPromotions.push({
          code: c.promo.code,
          title: c.promo.title,
          discount_bdt: c.discount_bdt,
          free_shipping: c.free_shipping
        });
      }
    }
  }

  const netSubtotalBdt = Math.max(0, subtotalBdt - discountBdt);
  const deliveryDhaka = Number.isFinite(Number(config.delivery_dhaka)) ? Number(config.delivery_dhaka) : 80;
  const deliveryOutside = Number.isFinite(Number(config.delivery_outside)) ? Number(config.delivery_outside) : 150;
  const freeThreshold = Number.isFinite(Number(config.free_shipping_threshold))
    ? Number(config.free_shipping_threshold)
    : 3000;

  const baseShipping = zone === 'outside' ? deliveryOutside : deliveryDhaka;
  const thresholdFree = freeThreshold > 0 && netSubtotalBdt >= freeThreshold;
  const isFreeShipping = totalQty > 0 && (thresholdFree || promoFreeShipping);
  const shippingBdt = totalQty === 0 ? 0 : isFreeShipping ? 0 : baseShipping;
  const totalBdt = netSubtotalBdt + shippingBdt;

  return {
    subtotal_bdt: subtotalBdt,
    discount_bdt: discountBdt,
    net_subtotal_bdt: netSubtotalBdt,
    shipping_bdt: shippingBdt,
    total_bdt: totalBdt,
    is_free_shipping: isFreeShipping,
    free_threshold_bdt: freeThreshold,
    hoodie_count: hoodieCount,
    item_count: totalQty,
    applied_promotions: appliedPromotions
  };
}
