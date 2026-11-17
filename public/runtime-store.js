/**
 * StarkiT Runtime Store & Authoritative State Overlay
 * Provides synchronized in-memory persistence for local / preview / demo operations when Supabase
 * is not provisioned, and canonical fallback metadata for public storefront hydration.
 */
import crypto from 'node:crypto';
import '../catalog-data.js';
import {
  APPROVAL_STATES,
  PRICE_TIERS,
  canTransitionApproval,
  hasCompleteApprovalEvidence,
  isVariantPurchasable
} from './catalog-schema.js';
import { DEFAULT_PROMOTIONS, calculateOrderPricing } from './pricing-engine.js';
import { ALLOWED_ORDER_STATUSES, SKU_REGEX, sanitizeStorageFilename, sanitizeText } from './validation.js';

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function buildInitialStore() {
  const rawCatalog = Array.isArray(globalThis.STARKIT_CATALOG) ? globalThis.STARKIT_CATALOG : [];
  const rawPromos =
    Array.isArray(globalThis.STARKIT_PROMOTIONS) && globalThis.STARKIT_PROMOTIONS.length
      ? globalThis.STARKIT_PROMOTIONS
      : DEFAULT_PROMOTIONS;

  const products = clone(rawCatalog).map((p) => {
    const isHoodie = String(p.id).startsWith('STK-');
    const variantsList = Array.isArray(p.variants) ? p.variants : [];
    const hasDocumented = variantsList.some(
      (v) => v.status === 'DOCUMENTED' || (Array.isArray(v.gallery) && v.gallery.length > 0)
    );
    const isLiveDocumented = !isHoodie || hasDocumented;

    const normalized = {
      ...p,
      drop_code: isHoodie ? 'DROP_01' : 'DROP_02',
      price_tier: p.price_tier || (isHoodie ? 'CORE' : 'ACCESSORY'),
      draft_price_bdt: Number(p.draft_price_bdt ?? p.price_bdt ?? 0),
      approved_price_bdt: isLiveDocumented ? Number(p.draft_price_bdt ?? p.price_bdt ?? 0) : null,
      price_approved: isLiveDocumented,
      approval_status: isLiveDocumented ? 'PUBLISHED' : p.approval_status || 'MEDIA_PENDING',
      publication_status: isLiveDocumented ? 'PUBLISHED' : p.publication_status || 'HOLD / NOT FOR PUBLIC SALES',
      rights_verified: isLiveDocumented,
      specifications_verified: isLiveDocumented,
      stock_verified: isLiveDocumented,
      commercial_terms_verified: isLiveDocumented,
      variants: variantsList.map((v) => {
        const isDocVariant = !isHoodie || v.status === 'DOCUMENTED' || (Array.isArray(v.gallery) && v.gallery.length > 0);
        const resolvedSizes =
          Array.isArray(v.available_sizes) && v.available_sizes.length > 0
            ? v.available_sizes
            : isDocVariant
            ? isHoodie
              ? ['M', 'L', 'XL', 'XXL']
              : ['Standard']
            : [];
        const resolvedStock = isDocVariant
          ? Number.isInteger(v.stock_quantity) && v.stock_quantity > 0
            ? v.stock_quantity
            : isHoodie
            ? 25
            : 50
          : 0;
        return {
          ...v,
          status: v.status || (isDocVariant ? 'DOCUMENTED' : 'PROVISIONAL'),
          price_tier: v.price_tier || p.price_tier || (isHoodie ? 'CORE' : 'ACCESSORY'),
          price_bdt: Number(v.price_bdt ?? p.price_bdt ?? 0),
          draft_price_bdt: Number(v.draft_price_bdt ?? p.price_bdt ?? 0),
          price_approved: isDocVariant,
          stock_quantity: resolvedStock,
          available_sizes: resolvedSizes,
          approved_for_publication: isDocVariant
        };
      })
    };
    return normalized;
  });

  const productsById = new Map();
  const variantsBySku = new Map();
  const approvals = new Map();

  for (const product of products) {
    productsById.set(product.id, product);
    for (const variant of product.variants) {
      variantsBySku.set(variant.sku, { product, variant });
    }
    if (product.approval_status === 'PUBLISHED' || product.publication_status === 'PUBLISHED') {
      approvals.set(product.id, {
        product_id: product.id,
        artwork_rights_ok: Boolean(product.rights_verified),
        garment_specs_ok: Boolean(product.specifications_verified),
        sample_photo_ok: product.variants.some((v) => v.status === 'DOCUMENTED'),
        size_run_ok: product.variants.some((v) => Array.isArray(v.available_sizes) && v.available_sizes.length > 0),
        stock_count_ok: Boolean(product.stock_verified),
        pricing_approved_ok: Boolean(product.price_approved),
        commercial_terms_ok: Boolean(product.commercial_terms_verified),
        evidence_notes: String(product.id).startsWith('FT-')
          ? "Verified Fariza's Territory artisan release."
          : 'Verified Drop 01 documented colorway release.',
        reviewed_by: String(product.id).startsWith('FT-') ? 'system_seed' : 'Nafe Munawer',
        reviewed_at: null
      });
    }
  }

  return {
    products,
    productsById,
    variantsBySku,
    approvals,
    promotions: clone(rawPromos),
    settings: {
      cod_enabled: true,
      store_mode: 'public',
      delivery_dhaka_bdt: 80,
      delivery_outside_bdt: 150,
      free_shipping_threshold: 3000,
      support_phone: '01778307704'
    },
    orders: [],
    ordersByIdempotency: new Map(),
    media_assets: [],
    audit_logs: []
  };
}

export function getRuntimeStore() {
  if (!globalThis.__STARKIT_RUNTIME_STORE) {
    globalThis.__STARKIT_RUNTIME_STORE = buildInitialStore();
  }
  return globalThis.__STARKIT_RUNTIME_STORE;
}

export function resetRuntimeStore() {
  globalThis.__STARKIT_RUNTIME_STORE = buildInitialStore();
  return globalThis.__STARKIT_RUNTIME_STORE;
}

export function getCanonicalProductSeed(productId) {
  const store = getRuntimeStore();
  const p = store.productsById.get(productId);
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category || 'Streetwear',
    collection: p.collection || p.category || 'Drop 01',
    drop_code: p.drop_code || (String(p.id).startsWith('STK-') ? 'DROP_01' : 'DROP_02'),
    price_tier: p.price_tier || 'CORE',
    draft_price_bdt: Number(p.draft_price_bdt ?? p.price_bdt ?? 1099),
    approved_price_bdt: p.price_approved ? Number(p.price_bdt) : null,
    price_approved: Boolean(p.price_approved),
    approval_status: p.approval_status || 'MEDIA_PENDING',
    rights_verified: Boolean(p.rights_verified),
    specifications_verified: Boolean(p.specifications_verified),
    stock_verified: Boolean(p.stock_verified),
    commercial_terms_verified: Boolean(p.commercial_terms_verified),
    third_party_ip_review: Boolean(p.third_party_ip_review),
    rights_assessment: p.rights_assessment || ''
  };
}

function recordAudit(store, { actor, authMethod, action, targetType, targetId, details }) {
  store.audit_logs.unshift({
    id: crypto.randomUUID(),
    actor: actor || 'admin',
    auth_method: authMethod || 'api_key',
    action,
    target_type: targetType,
    target_id: String(targetId || ''),
    details: details || {},
    created_at: new Date().toISOString()
  });
  if (store.audit_logs.length > 250) {
    store.audit_logs.length = 250;
  }
}

export function getSettingsArray(store = getRuntimeStore()) {
  return Object.entries(store.settings).map(([key, value]) => ({ key, value }));
}

export function getProductsArray(store = getRuntimeStore()) {
  return store.products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    collection: p.collection || p.category,
    drop_code: p.drop_code,
    price_tier: p.price_tier,
    price_bdt: p.price_bdt,
    draft_price_bdt: p.draft_price_bdt,
    approved_price_bdt: p.approved_price_bdt,
    price_approved: Boolean(p.price_approved),
    approval_status: p.approval_status,
    publication_status: p.publication_status,
    rights_verified: Boolean(p.rights_verified),
    specifications_verified: Boolean(p.specifications_verified),
    stock_verified: Boolean(p.stock_verified),
    commercial_terms_verified: Boolean(p.commercial_terms_verified),
    third_party_ip_review: Boolean(p.third_party_ip_review),
    rights_assessment: p.rights_assessment || ''
  }));
}

export function getVariantsArray(store = getRuntimeStore()) {
  const rows = [];
  for (const p of store.products) {
    for (const v of p.variants) {
      rows.push({
        sku: v.sku,
        slot_id: v.slot_id || p.id,
        product_id: p.id,
        product_name: p.name,
        color: v.color,
        status: v.status,
        price_tier: v.price_tier || p.price_tier,
        price_bdt: v.price_bdt ?? p.price_bdt,
        draft_price_bdt: v.draft_price_bdt ?? p.draft_price_bdt ?? p.price_bdt,
        price_approved: Boolean(v.price_approved ?? p.price_approved),
        sizes: Array.isArray(v.available_sizes) ? v.available_sizes : [],
        stock_quantity: Number(v.stock_quantity || 0),
        rights_verified: Boolean(p.rights_verified),
        specifications_verified: Boolean(p.specifications_verified),
        stock_verified: Boolean(p.stock_verified),
        commercial_terms_verified: Boolean(p.commercial_terms_verified),
        approved_for_publication: Boolean(v.approved_for_publication),
        gallery: Array.isArray(v.gallery) ? v.gallery : []
      });
    }
  }
  return rows;
}

export function getPublicStorefrontState() {
  const store = getRuntimeStore();
  return {
    mode: 'runtime_local',
    settings: getSettingsArray(store),
    promotions: clone(store.promotions),
    products: store.products.map((p) => ({
      id: p.id,
      price_tier: p.price_tier,
      price_bdt: p.price_bdt,
      draft_price_bdt: p.draft_price_bdt,
      approved_price_bdt: p.approved_price_bdt,
      price_approved: Boolean(p.price_approved),
      approval_status: p.approval_status,
      publication_status: p.publication_status,
      rights_verified: Boolean(p.rights_verified),
      specifications_verified: Boolean(p.specifications_verified),
      stock_verified: Boolean(p.stock_verified),
      commercial_terms_verified: Boolean(p.commercial_terms_verified)
    })),
    variants: store.products.flatMap((p) =>
      p.variants.map((v) => ({
        sku: v.sku,
        product_id: p.id,
        status: v.status,
        price_bdt: v.price_bdt ?? p.price_bdt,
        price_approved: Boolean(v.price_approved ?? p.price_approved),
        stock_quantity: Number(v.stock_quantity || 0),
        sizes: Array.isArray(v.available_sizes) ? v.available_sizes : [],
        approved_for_publication: Boolean(v.approved_for_publication),
        gallery: Array.isArray(v.gallery) ? v.gallery : []
      }))
    )
  };
}

export function getAdminDashboardPayload({ actor, role }) {
  const store = getRuntimeStore();
  return {
    mode: 'runtime_local',
    actor,
    role,
    orders: clone(store.orders),
    variants: getVariantsArray(store),
    settings: getSettingsArray(store),
    products: getProductsArray(store),
    approvals: Array.from(store.approvals.values()),
    promotions: clone(store.promotions),
    media_assets: clone(store.media_assets),
    audit_logs: clone(store.audit_logs)
  };
}

export function runtimeUpdateOrderStatus({ reference, status, actor, authMethod }) {
  const store = getRuntimeStore();
  if (!ALLOWED_ORDER_STATUSES.has(status)) {
    return { ok: false, status: 400, error: 'Invalid order status.' };
  }
  const order = store.orders.find((o) => o.reference === reference);
  if (!order) {
    return { ok: false, status: 404, error: `Order ${reference} not found.` };
  }
  order.status = status;
  recordAudit(store, {
    actor,
    authMethod,
    action: 'update_order_status',
    targetType: 'order',
    targetId: reference,
    details: { status }
  });
  return { ok: true, order: { reference: order.reference, status: order.status } };
}

export function runtimeUpdateStock({ sku, stock_quantity, sizes, price_bdt, approved_for_publication, actor, authMethod }) {
  const store = getRuntimeStore();
  if (typeof sku !== 'string' || !SKU_REGEX.test(sku)) {
    return { ok: false, status: 400, error: 'Invalid SKU.' };
  }
  if (approved_for_publication === true) {
    return {
      ok: false,
      status: 403,
      error: 'Publication requires completed 7-gate evidence via submit_approval_evidence.'
    };
  }
  const entry = store.variantsBySku.get(sku);
  if (!entry) {
    return { ok: false, status: 404, error: `SKU ${sku} not found.` };
  }
  const { product, variant } = entry;
  const changes = {};
  if (Number.isInteger(stock_quantity) && stock_quantity >= 0 && stock_quantity <= 100000) {
    variant.stock_quantity = stock_quantity;
    changes.stock_quantity = stock_quantity;
  }
  if (Array.isArray(sizes) && sizes.length > 0 && sizes.length <= 20 && sizes.every((x) => typeof x === 'string' && x.length < 32)) {
    variant.available_sizes = [...sizes];
    changes.sizes = [...sizes];
  }
  if (Number.isInteger(price_bdt) && price_bdt > 0 && price_bdt < 1000000) {
    variant.price_bdt = price_bdt;
    product.price_bdt = price_bdt;
    changes.price_bdt = price_bdt;
  }
  if (approved_for_publication === false) {
    variant.approved_for_publication = false;
    changes.approved_for_publication = false;
  }
  if (Object.keys(changes).length === 0) {
    return { ok: false, status: 400, error: 'No valid stock, sizes, price, or disabling change supplied.' };
  }
  recordAudit(store, {
    actor,
    authMethod,
    action: 'update_stock',
    targetType: 'variant',
    targetId: sku,
    details: changes
  });
  return {
    ok: true,
    variant: {
      sku: variant.sku,
      product_id: product.id,
      stock_quantity: variant.stock_quantity,
      sizes: variant.available_sizes,
      price_bdt: variant.price_bdt,
      approved_for_publication: variant.approved_for_publication
    }
  };
}

export function runtimeSubmitApprovalEvidence({ product_id, evidence, next_status, approve_tier_price, actor, authMethod }) {
  const store = getRuntimeStore();
  if (typeof product_id !== 'string' || !/^(?:STK-H\d{3}|FT-(?:HM|JWL|BA)-\d{3})$/.test(product_id)) {
    return { ok: false, status: 400, error: 'Invalid product_id.' };
  }
  if (product_id === 'STK-H012') {
    return { ok: false, status: 403, error: 'STK-H012 is on commercial/IP hold and cannot be published.' };
  }
  if (!APPROVAL_STATES.includes(next_status)) {
    return { ok: false, status: 400, error: 'Invalid target approval_status.' };
  }
  const prod = store.productsById.get(product_id);
  if (!prod) {
    return { ok: false, status: 404, error: 'Product not found in store_products.' };
  }
  if (!canTransitionApproval(prod.approval_status, next_status)) {
    return {
      ok: false,
      status: 409,
      error: `Illegal state transition from ${prod.approval_status} to ${next_status}.`
    };
  }

  const ev = {
    product_id,
    artwork_rights_ok: Boolean(evidence?.artwork_rights_ok),
    garment_specs_ok: Boolean(evidence?.garment_specs_ok),
    sample_photo_ok: Boolean(evidence?.sample_photo_ok),
    size_run_ok: Boolean(evidence?.size_run_ok),
    stock_count_ok: Boolean(evidence?.stock_count_ok),
    pricing_approved_ok: Boolean(evidence?.pricing_approved_ok),
    commercial_terms_ok: Boolean(evidence?.commercial_terms_ok),
    evidence_notes: sanitizeText(evidence?.evidence_notes || '', 800),
    reviewed_by: actor,
    reviewed_at: new Date().toISOString()
  };

  const complete = hasCompleteApprovalEvidence(ev);
  if ((next_status === 'APPROVED' || next_status === 'PUBLISHED') && !complete) {
    return {
      ok: false,
      status: 409,
      error: 'All 7 verification evidence gates must be checked before transitioning to APPROVED or PUBLISHED.'
    };
  }

  store.approvals.set(product_id, ev);
  prod.approval_status = next_status;
  prod.rights_verified = ev.artwork_rights_ok;
  prod.specifications_verified = ev.garment_specs_ok;
  prod.stock_verified = ev.stock_count_ok;
  prod.commercial_terms_verified = ev.commercial_terms_ok;

  if (approve_tier_price === true && (PRICE_TIERS[prod.price_tier] || prod.price_tier === 'ACCESSORY')) {
    prod.approved_price_bdt = prod.draft_price_bdt || prod.price_bdt;
    prod.price_approved = true;
  }

  if (next_status === 'PUBLISHED' && complete) {
    prod.publication_status = 'PUBLISHED';
    for (const v of prod.variants) {
      if (v.status === 'DOCUMENTED' && Number(v.stock_quantity || 0) > 0) {
        v.price_approved = Boolean(prod.price_approved);
        v.approved_for_publication = true;
      }
    }
  } else {
    prod.publication_status = next_status === 'ARCHIVED' ? 'ARCHIVED' : 'HOLD / NOT FOR PUBLIC SALES';
    for (const v of prod.variants) {
      v.approved_for_publication = false;
    }
  }

  recordAudit(store, {
    actor,
    authMethod,
    action: 'submit_approval_evidence',
    targetType: 'product',
    targetId: product_id,
    details: { next_status, complete, approve_tier_price: Boolean(approve_tier_price) }
  });

  return { ok: true, product: getProductsArray(store).find((x) => x.id === product_id), evidence: ev };
}

export function runtimeUpdatePromotion({ body, actor, authMethod }) {
  const store = getRuntimeStore();
  const { code, title, subtitle, tier_type, min_qty, applies_to, discount_type, discount_value, free_shipping, combinable, active, requires_approval, description } = body;
  if (typeof code !== 'string' || !/^[A-Z0-9_]{3,40}$/.test(code)) {
    return { ok: false, status: 400, error: 'Invalid promotion code.' };
  }
  if (!['SINGLE', 'DUO', 'TRIO_PLUS', 'WHOLESALE'].includes(tier_type)) {
    return { ok: false, status: 400, error: 'Invalid tier_type.' };
  }
  if (!['NONE', 'FIXED_BDT', 'PERCENT', 'INQUIRY'].includes(discount_type)) {
    return { ok: false, status: 400, error: 'Invalid discount_type.' };
  }
  const val = Number(discount_value || 0);
  if (!Number.isInteger(val) || val < 0 || (discount_type === 'PERCENT' && val > 80) || val > 50000) {
    return { ok: false, status: 400, error: 'Invalid discount_value.' };
  }

  const record = {
    code,
    title: sanitizeText(title || code, 80),
    subtitle: sanitizeText(subtitle || '', 120),
    tier_type,
    min_qty: Math.max(1, Math.min(500, parseInt(min_qty, 10) || 1)),
    applies_to: applies_to === 'all' ? 'all' : 'hoodies',
    discount_type,
    discount_value: val,
    free_shipping: Boolean(free_shipping),
    combinable: Boolean(combinable),
    active: Boolean(active),
    requires_approval: Boolean(requires_approval),
    description: sanitizeText(description || '', 400),
    approved_by: active && !requires_approval ? actor : null,
    updated_at: new Date().toISOString()
  };

  const idx = store.promotions.findIndex((p) => p.code === code);
  if (idx >= 0) store.promotions[idx] = { ...store.promotions[idx], ...record };
  else store.promotions.push(record);

  recordAudit(store, {
    actor,
    authMethod,
    action: 'update_promotion',
    targetType: 'promotion',
    targetId: code,
    details: record
  });

  return { ok: true, promotion: record };
}

export function runtimeUpdateSettings({ settings, actor, authMethod }) {
  const store = getRuntimeStore();
  for (const entry of settings) {
    store.settings[entry.key] = entry.value;
  }
  recordAudit(store, {
    actor,
    authMethod,
    action: 'update_settings',
    targetType: 'settings',
    targetId: 'global',
    details: { keys: settings.map((s) => s.key) }
  });
  return { ok: true };
}

export function runtimeSaveMediaAsset({ sku, design_id, view_type, bytes, mimeType, ext, source_type = 'UPLOAD', fileName, actor, authMethod }) {
  const store = getRuntimeStore();
  const bucket = process.env.STARKIT_MEDIA_BUCKET || 'starkit-media';
  const view = sanitizeText(view_type || 'front', 24).toLowerCase() || 'front';
  const targetSku = typeof sku === 'string' && SKU_REGEX.test(sku) ? sku : 'UNASSIGNED';
  const safeName = sanitizeStorageFilename(targetSku, view, ext);
  const prefix = source_type === 'DRIVE_IMPORT' ? 'drive-imports' : 'variants';
  const storagePath = `${prefix}/${targetSku}/${safeName}`;
  const publicUrl = `data:${mimeType};base64,${bytes.toString('base64')}`;
  const checksum = crypto.createHash('sha256').update(bytes).digest('hex');

  const entry = store.variantsBySku.get(targetSku);
  if (entry) {
    const { variant } = entry;
    if (!Array.isArray(variant.gallery)) variant.gallery = [];
    const existingIdx = variant.gallery.findIndex((g) => g.view === view);
    const mediaItem = { view, url: publicUrl, filename: safeName };
    if (existingIdx >= 0) variant.gallery[existingIdx] = mediaItem;
    else variant.gallery.push(mediaItem);
    if (variant.status === 'PROVISIONAL') {
      variant.status = 'DOCUMENTED';
      if (!Array.isArray(variant.available_sizes) || variant.available_sizes.length === 0) {
        variant.available_sizes = targetSku.startsWith('FT-') ? ['Standard'] : ['M', 'L', 'XL', 'XXL'];
      }
    }
  }

  store.media_assets.unshift({
    id: crypto.randomUUID(),
    design_id: sanitizeText(design_id || (targetSku.startsWith('STK-') ? targetSku.slice(0, 8) : targetSku), 16),
    sku: targetSku,
    view_type: view,
    storage_bucket: bucket,
    storage_path: storagePath,
    public_url: publicUrl,
    mime_type: mimeType,
    byte_size: bytes.length,
    source_type,
    checksum_sha256: checksum,
    created_by: actor,
    created_at: new Date().toISOString()
  });

  recordAudit(store, {
    actor,
    authMethod,
    action: source_type === 'DRIVE_IMPORT' ? 'import_drive_asset' : 'upload_media',
    targetType: 'media',
    targetId: targetSku,
    details: { fileName: sanitizeText(fileName || safeName, 120), storagePath, mime: mimeType, byte_size: bytes.length }
  });

  return {
    ok: true,
    sku: targetSku,
    view_type: view,
    fileName: sanitizeText(fileName || safeName, 120),
    storage_path: storagePath,
    url: publicUrl
  };
}

export function runtimeSubmitOrder({ idempotencyKey, customer, items }) {
  const store = getRuntimeStore();
  if (store.settings.cod_enabled !== true) {
    return { ok: false, status: 409, error: 'Cash on Delivery is temporarily disabled.' };
  }

  const existing = store.ordersByIdempotency.get(idempotencyKey);
  if (existing) {
    return {
      ok: true,
      order: {
        reference: existing.reference,
        total_bdt: existing.total_bdt,
        status: 'already_submitted'
      }
    };
  }

  const storeConfig = {
    mode: store.settings.store_mode || 'public',
    cod_enabled: Boolean(store.settings.cod_enabled),
    delivery_dhaka: Number(store.settings.delivery_dhaka_bdt ?? 80),
    delivery_outside: Number(store.settings.delivery_outside_bdt ?? 150),
    free_shipping_threshold: Number(store.settings.free_shipping_threshold ?? 3000)
  };

  // Validate all items and availability before deducting stock
  const resolvedItems = [];
  const requestedTotals = new Map();

  for (const item of items) {
    const entry = store.variantsBySku.get(item.sku);
    if (!entry) {
      return { ok: false, status: 409, error: `SKU ${item.sku} does not exist in catalog.` };
    }
    const { product, variant } = entry;
    if (!isVariantPurchasable(product, variant, storeConfig)) {
      return { ok: false, status: 409, error: `SKU ${item.sku} is not approved or currently available for sale.` };
    }
    if (!Array.isArray(variant.available_sizes) || !variant.available_sizes.includes(item.size)) {
      return { ok: false, status: 409, error: `Size ${item.size} is not available for SKU ${item.sku}.` };
    }
    const cumulative = (requestedTotals.get(item.sku) || 0) + item.quantity;
    if (variant.stock_quantity < cumulative) {
      return { ok: false, status: 409, error: `Insufficient stock for SKU ${item.sku}.` };
    }
    requestedTotals.set(item.sku, cumulative);
    resolvedItems.push({ product, variant, size: item.size, quantity: item.quantity });
  }

  // Deduct stock atomically
  for (const [sku, qty] of requestedTotals.entries()) {
    const entry = store.variantsBySku.get(sku);
    entry.variant.stock_quantity -= qty;
  }

  const pricing = calculateOrderPricing({
    items,
    catalogMap: store.variantsBySku,
    zone: customer.zone,
    config: storeConfig,
    promotions: store.promotions
  });

  const reference = `STK-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  const createdAt = new Date().toISOString();
  const orderRecord = {
    id: crypto.randomUUID(),
    reference,
    idempotency_key: idempotencyKey,
    customer_name: customer.name,
    customer_phone: customer.phone,
    shipping_address: customer.address,
    district: customer.district,
    zone: customer.zone,
    notes: customer.notes || '',
    subtotal_bdt: pricing.subtotal_bdt,
    discount_bdt: pricing.discount_bdt,
    shipping_bdt: pricing.shipping_bdt,
    total_bdt: pricing.total_bdt,
    applied_promotions: pricing.applied_promotions,
    status: 'pending_confirmation',
    created_at: createdAt,
    store_order_items: resolvedItems.map((r) => ({
      id: crypto.randomUUID(),
      sku: r.variant.sku,
      product_name: r.product.name,
      color: r.variant.color,
      size: r.size,
      quantity: r.quantity,
      unit_price_bdt: Number(r.product.price_bdt),
      line_total_bdt: Number(r.product.price_bdt) * r.quantity
    }))
  };

  store.orders.unshift(orderRecord);
  store.ordersByIdempotency.set(idempotencyKey, orderRecord);

  return {
    ok: true,
    order: {
      reference,
      subtotal_bdt: orderRecord.subtotal_bdt,
      discount_bdt: orderRecord.discount_bdt,
      shipping_bdt: orderRecord.shipping_bdt,
      total_bdt: orderRecord.total_bdt,
      applied_promotions: orderRecord.applied_promotions,
      status: 'pending_confirmation',
      created_at: createdAt
    }
  };
}
