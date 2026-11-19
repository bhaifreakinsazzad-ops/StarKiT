/**
 * StarkiT Canonical Catalog Schema, State Machine & 4-Tier Pricing Constants
 * Isomorphic module shared by browser UI, API handlers, build scripts, and unit tests.
 */

export const WORKING_PALETTE = [
  { name: 'Black', code: 'BLK', hex: '#170000', labelBn: 'কালো' },
  { name: 'Cream', code: 'CRM', hex: '#F3EFE6', labelBn: 'ক্রিম' },
  { name: 'Maroon', code: 'MRN', hex: '#5B1A24', labelBn: 'মেরুন' },
  { name: 'Chocolate Brown', code: 'BRN', hex: '#4B2E24', labelBn: 'চকলেট ব্রাউন' }
];

export const PRICE_TIERS = {
  CORE: {
    code: 'CORE',
    label: 'Core Archive',
    price_bdt: 1099,
    badge: 'Tier 01 · Core',
    description: 'Essential graphic streetwear hoodies crafted on 330–350 GSM fleece.'
  },
  SELECT: {
    code: 'SELECT',
    label: 'Select Studio',
    price_bdt: 1250,
    badge: 'Tier 02 · Select',
    description: 'Multi-pass heritage and city editorial stories with layered screen detail.'
  },
  SIGNATURE: {
    code: 'SIGNATURE',
    label: 'Signature Drop',
    price_bdt: 1369,
    badge: 'Tier 03 · Signature',
    description: 'High-density multi-placement front, back, and sleeve compositions.'
  },
  PREMIUM: {
    code: 'PREMIUM',
    label: 'Premium Collector',
    price_bdt: 1499,
    badge: 'Tier 04 · Premium',
    description: 'Flagship archival editions with maximal print density and collector finish.'
  }
};

export const APPROVAL_STATES = [
  'DRAFT',
  'MEDIA_PENDING',
  'RIGHTS_REVIEW',
  'QUALITY_REVIEW',
  'READY_FOR_APPROVAL',
  'APPROVED',
  'PUBLISHED',
  'ARCHIVED'
];

export const APPROVAL_TRANSITIONS = {
  DRAFT: ['MEDIA_PENDING', 'RIGHTS_REVIEW', 'ARCHIVED'],
  MEDIA_PENDING: ['RIGHTS_REVIEW', 'QUALITY_REVIEW', 'READY_FOR_APPROVAL', 'ARCHIVED'],
  RIGHTS_REVIEW: ['MEDIA_PENDING', 'QUALITY_REVIEW', 'READY_FOR_APPROVAL', 'ARCHIVED'],
  QUALITY_REVIEW: ['MEDIA_PENDING', 'RIGHTS_REVIEW', 'READY_FOR_APPROVAL', 'ARCHIVED'],
  READY_FOR_APPROVAL: ['QUALITY_REVIEW', 'RIGHTS_REVIEW', 'APPROVED', 'ARCHIVED'],
  APPROVED: ['PUBLISHED', 'READY_FOR_APPROVAL', 'ARCHIVED'],
  PUBLISHED: ['APPROVED', 'ARCHIVED'],
  ARCHIVED: ['DRAFT']
};

export function canTransitionApproval(fromState, toState) {
  if (fromState === toState) return true;
  const allowed = APPROVAL_TRANSITIONS[fromState];
  return Array.isArray(allowed) && allowed.includes(toState);
}

export function hasCompleteApprovalEvidence(evidence) {
  if (!evidence || typeof evidence !== 'object') return false;
  return (
    evidence.artwork_rights_ok === true &&
    evidence.garment_specs_ok === true &&
    evidence.sample_photo_ok === true &&
    evidence.size_run_ok === true &&
    evidence.stock_count_ok === true &&
    evidence.pricing_approved_ok === true &&
    evidence.commercial_terms_ok === true
  );
}

export function getPrimaryVariant(product) {
  if (!product || !Array.isArray(product.variants) || product.variants.length === 0) return null;
  return (
    product.variants.find((v) => v.status === 'DOCUMENTED' && Array.isArray(v.gallery) && v.gallery.length > 0) ||
    product.variants.find((v) => Array.isArray(v.gallery) && v.gallery.length > 0) ||
    product.variants[0]
  );
}

export function getPrimaryImage(product, variant) {
  const v = variant || getPrimaryVariant(product);
  if (!v || !Array.isArray(v.gallery) || v.gallery.length === 0) return null;
  return (
    v.gallery.find((g) => g.view === 'front') ||
    v.gallery.find((g) => g.view === 'reference_composite') ||
    v.gallery[0]
  );
}

export function getBackImage(product, variant) {
  const v = variant || getPrimaryVariant(product);
  if (!v || !Array.isArray(v.gallery) || v.gallery.length === 0) return null;
  return v.gallery.find((g) => g.view === 'back') || getPrimaryImage(product, v);
}

export function isVariantPurchasable(arg1, arg2, storeConfig = {}) {
  if (!arg1 || !arg2) return false;
  const isSwapped = Boolean(arg1.sku && !arg1.variants && (arg2.variants || arg2.publication_status));
  const product = isSwapped ? arg2 : arg1;
  const variant = isSwapped ? arg1 : arg2;

  if (storeConfig.mode === 'preview' || storeConfig.cod_enabled === false) return false;
  if (product.publication_status !== 'PUBLISHED') return false;
  if (product.rights_verified !== true) return false;
  if (product.stock_verified !== true) return false;
  if (product.specifications_verified !== true) return false;
  if (product.commercial_terms_verified !== true) return false;
  if (product.price_approved === false) return false;
  if (variant.status === 'PROVISIONAL') return false;
  if (variant.status ? variant.status !== 'DOCUMENTED' : !Array.isArray(variant.gallery) || variant.gallery.length === 0) {
    return false;
  }
  if (variant.approved_for_publication !== true) return false;
  if (!Number.isInteger(variant.stock_quantity) || variant.stock_quantity <= 0) return false;
  if (!Array.isArray(variant.available_sizes) || variant.available_sizes.length === 0) return false;
  return true;
}

export function isProductVisibleOnStorefront(product, storeConfig = {}) {
  if (!product) return false;
  if (product.approval_status === 'ARCHIVED') return false;
  if (storeConfig.mode === 'preview') return true;
  if (product.id && product.id.startsWith('STK-')) {
    return true;
  }
  return Array.isArray(product.variants) && product.variants.some((v) => v.approved_for_publication === true);
}

export function validateCatalogArchitecture(products, expected = {}) {
  const {
    expectedHoodies = 11,
    expectedVariants = 15,
    expectedDocumented = 15,
    expectedProvisional = 0,
    expectedAccessories = 0
  } = expected;

  const errors = [];
  if (!Array.isArray(products)) {
    return { valid: false, errors: ['Catalog products must be an array.'] };
  }

  const hoodies = products.filter((p) => String(p.id).startsWith('STK-'));
  const accessories = products.filter((p) => String(p.id).startsWith('FT-'));
  const nonHoodies = products.filter((p) => !String(p.id).startsWith('STK-'));

  if (hoodies.length !== expectedHoodies) {
    errors.push(`Expected ${expectedHoodies} hoodie designs, found ${hoodies.length}.`);
  }
  if (accessories.length !== expectedAccessories || nonHoodies.length > 0) {
    errors.push(`Expected ${expectedAccessories} accessories and 0 non-hoodie products, found ${nonHoodies.length}.`);
  }
  if (hoodies.some((p) => p.id === 'STK-H012' || Number(String(p.id).replace('STK-H', '')) > 11)) {
    errors.push('Catalog must only contain the 11 verified Drop 01 hoodie designs (STK-H001 through STK-H011).');
  }

  const seenSkus = new Set();
  const seenSlots = new Set();
  let totalVariants = 0;
  let documentedCount = 0;
  let provisionalCount = 0;

  for (const h of hoodies) {
    if (!h.price_tier || !PRICE_TIERS[h.price_tier]) {
      errors.push(`Hoodie ${h.id} has invalid price_tier: ${h.price_tier}`);
    } else if (Number(h.draft_price_bdt ?? h.price_bdt) !== PRICE_TIERS[h.price_tier].price_bdt) {
      errors.push(`Hoodie ${h.id} price ${h.price_bdt} mismatches tier ${h.price_tier} (${PRICE_TIERS[h.price_tier].price_bdt}).`);
    }

    if (!Array.isArray(h.variants) || h.variants.length < 1) {
      errors.push(`Hoodie ${h.id} must have at least 1 documented color variant, found ${h.variants?.length ?? 0}.`);
      continue;
    }

    for (const v of h.variants) {
      totalVariants++;
      if (seenSkus.has(v.sku)) errors.push(`Duplicate SKU: ${v.sku}`);
      seenSkus.add(v.sku);

      if (v.slot_id) {
        if (seenSlots.has(v.slot_id)) errors.push(`Duplicate slot_id: ${v.slot_id}`);
        seenSlots.add(v.slot_id);
      }

      if (v.status === 'DOCUMENTED') {
        documentedCount++;
        if (!Array.isArray(v.gallery) || v.gallery.length === 0) {
          errors.push(`Documented variant ${v.sku} must have at least 1 verified gallery image.`);
        }
      } else if (v.status === 'PROVISIONAL') {
        provisionalCount++;
        errors.push(`Provisional variant ${v.sku} is not permitted in the handover catalog.`);
      } else {
        errors.push(`Invalid status on ${v.sku}: ${v.status}`);
      }
    }
  }

  if (totalVariants !== expectedVariants) {
    errors.push(`Expected ${expectedVariants} hoodie variants, found ${totalVariants}.`);
  }
  if (documentedCount !== expectedDocumented) {
    errors.push(`Expected ${expectedDocumented} documented variants, found ${documentedCount}.`);
  }
  if (provisionalCount !== expectedProvisional) {
    errors.push(`Expected ${expectedProvisional} provisional variants, found ${provisionalCount}.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: {
      hoodies: hoodies.length,
      hoodieVariants: totalVariants,
      documentedVariants: documentedCount,
      provisionalVariants: provisionalCount,
      accessories: accessories.length
    }
  };
}
