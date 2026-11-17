/**
 * StarkiT — fail-closed COD order endpoint (release-candidate replacement).
 * Requires explicit commercial activation, verified catalog SKUs, and an atomic
 * database transaction. Never sends a successful receipt for an unsaved order.
 */
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import '../assets/js/catalog-data.js';

const catalog = globalThis.STARKIT_CATALOG || [];
const purchasable = new Map();
for (const product of catalog) {
  for (const variant of product.variants || []) {
    purchasable.set(variant.sku, {
      product,
      variant,
      live:
        product.rights_verified === true &&
        product.stock_verified === true &&
        product.commercial_terms_verified === true &&
        variant.approved_for_publication === true &&
        variant.status !== 'PROVISIONAL' &&
        Number.isInteger(variant.stock_quantity) &&
        variant.stock_quantity > 0 &&
        Array.isArray(variant.available_sizes) &&
        variant.available_sizes.length > 0
    });
  }
}

function respond(res, status, payload) {
  return res.status(status)
    .setHeader('Content-Type', 'application/json; charset=utf-8')
    .setHeader('Cache-Control', 'no-store')
    .end(JSON.stringify(payload));
}
const str = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const phoneRegex = /^(?:\+?880|0)1[3-9]\d{8}$/;
const skuRegex = /^(?:STK-H\d{3}-(?:BLK|CRM|MRN|BRN)|FT-(?:HM|JWL|BA)-\d{3})$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function dispatchMetaPurchase({ order, customer, items, req }) {
  const pixelId = process.env.META_PIXEL_ID;
  const token = process.env.META_ACCESS_TOKEN;
  if (!pixelId || !token || !/^[0-9]{6,25}$/.test(pixelId)) return;
  const hash = (s) => crypto.createHash('sha256').update(String(s).toLowerCase()).digest('hex');
  const phone = customer.phone.replace(/[\s+\-]/g, '').replace(/^0/, '88');
  const firstName = customer.name.split(/\s+/)[0];
  const payload = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: order.reference,
      event_source_url: process.env.STARKIT_PUBLIC_URL || undefined,
      action_source: 'website',
      user_data: {
        ph: [hash(phone)],
        fn: [hash(firstName)],
        client_user_agent: req.headers['user-agent'] || ''
      },
      custom_data: {
        currency: 'BDT',
        value: Number(order.total_bdt),
        order_id: order.reference,
        content_type: 'product',
        contents: items.map((i) => ({ id: i.sku, quantity: i.quantity }))
      }
    }]
  };
  if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  try {
    const endpoint = `https://graph.facebook.com/v21.0/${encodeURIComponent(pixelId)}/events`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(2500)
    });
    if (!response.ok) console.warn('[StarkiT] Meta Purchase dispatch returned', response.status);
  } catch {
    console.warn('[StarkiT] Meta event dispatch unavailable; durable order is still recorded.');
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return respond(res, 405, { error: 'Only POST is allowed.' });
  }
  if (process.env.STARKIT_ORDERS_ENABLED !== 'true') {
    return respond(res, 503, { error: 'Online ordering is not active. Please contact customer support.' });
  }
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    return respond(res, 503, { error: 'Checkout is temporarily unavailable.' });
  }

  let body = req.body;
  try {
    if (typeof body === 'string') body = JSON.parse(body);
  } catch {
    return respond(res, 400, { error: 'Invalid JSON payload.' });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body) || JSON.stringify(body).length > 15000) {
    return respond(res, 400, { error: 'Invalid order payload.' });
  }
  const customer = body.customer || {};
  const name = str(customer.name, 120);
  const phone = str(customer.phone, 32).replace(/[\s-]/g, '');
  const address = str(customer.address, 600);
  const district = str(customer.district, 80);
  const notes = str(customer.notes, 500);
  const zone = customer.zone;
  if (name.length < 2 || !phoneRegex.test(phone) || address.length < 10 || district.length < 2 || !['dhaka','outside'].includes(zone)) {
    return respond(res, 400, { error: 'Enter a valid name, Bangladesh phone, address, district, and delivery zone.' });
  }
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 20) {
    return respond(res, 400, { error: 'Bag must contain 1–20 line items.' });
  }
  const items = [];
  let totalQty = 0;
  for (const item of body.items) {
    if (!item || !skuRegex.test(item.sku) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20 || typeof item.size !== 'string') {
      return respond(res, 400, { error: 'Invalid SKU, size, or quantity.' });
    }
    const meta = purchasable.get(item.sku);
    const size = item.size.trim();
    if (!meta?.live || !meta.variant.available_sizes.includes(size)) {
      return respond(res, 409, { error: `SKU ${item.sku} is not approved or currently available for sale.` });
    }
    totalQty += item.quantity;
    items.push({ sku: item.sku, size, quantity: item.quantity });
  }
  if (totalQty > 50) return respond(res, 400, { error: 'Maximum total quantity is 50.' });

  const idempotencyKey = typeof body.idempotency_key === 'string' && uuidRegex.test(body.idempotency_key)
    ? body.idempotency_key
    : crypto.randomUUID();
  try {
    const db = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: order, error } = await db.rpc('submit_starkit_order', {
      p_idempotency: idempotencyKey,
      p_customer_name: name,
      p_customer_phone: phone,
      p_address: address,
      p_district: district,
      p_zone: zone,
      p_notes: notes,
      p_items: items
    });
    if (error) {
      const expectedRejection = error.code === 'P0001' || error.code === '23505' || error.code === '23514';
      console.error('[StarkiT] Order RPC rejected', error.code || 'unknown');
      return respond(res, expectedRejection ? 409 : 503, { error: expectedRejection ? 'Order not available. Please review your bag.' : 'Checkout service is temporarily unavailable.' });
    }
    if (!order?.reference || !Number.isFinite(Number(order.total_bdt))) {
      return respond(res, 503, { error: 'Order confirmation could not be verified.' });
    }
    // Only the database RPC can confirm a purchase. Never create a fake reference.
    if (order.status !== 'already_submitted') {
      await dispatchMetaPurchase({ order, customer: { name, phone }, items, req });
    }
    return respond(res, 201, order);
  } catch (error) {
    console.error('[StarkiT] Order service unavailable:', error?.code || error?.name || 'unknown');
    return respond(res, 503, { error: 'Checkout service temporarily unavailable. No order has been confirmed.' });
  }
}
