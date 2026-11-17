/**
 * StarkiT — Hardened Fail-Closed Cash-on-Delivery Order API
 * Validates origin, rate limits, Bangladesh customer payload, catalog/approval gating,
 * and invokes atomic Supabase submit_starkit_order RPC for server-authoritative totals.
 */
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import '../assets/js/catalog-data.js';
import { isVariantPurchasable } from '../assets/js/core/catalog-schema.js';
import { UUID_REGEX, validateOrderRequestBody } from '../assets/js/core/validation.js';

const catalog = globalThis.STARKIT_CATALOG || [];
const catalogBySku = new Map();
for (const product of catalog) {
  for (const variant of product.variants || []) {
    catalogBySku.set(variant.sku, { product, variant });
  }
}

// Lightweight per-IP sliding window rate limiter
const rateBuckets = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 20;

function checkRateLimit(req) {
  const forwarded = req.headers['x-forwarded-for'] || '';
  const ip = String(forwarded).split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || [];
  const recent = bucket.filter((ts) => now - ts < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX_REQUESTS) {
    return false;
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  if (rateBuckets.size > 2000) {
    for (const [key, times] of rateBuckets) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) rateBuckets.delete(key);
    }
  }
  return true;
}

function isAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host.toLowerCase();
    const hostHeader = String(req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
    if (hostHeader && originHost === hostHeader) return true;
    const publicUrl = process.env.STARKIT_PUBLIC_URL;
    if (publicUrl && new URL(publicUrl).host.toLowerCase() === originHost) return true;
  } catch {
    return false;
  }
  return false;
}

function respond(res, status, payload) {
  return res
    .status(status)
    .setHeader('Content-Type', 'application/json; charset=utf-8')
    .setHeader('Cache-Control', 'no-store')
    .end(JSON.stringify(payload));
}

async function dispatchMetaPurchase({ order, customer, items, req }) {
  const pixelId = process.env.META_PIXEL_ID;
  const token = process.env.META_ACCESS_TOKEN;
  if (!pixelId || !token || !/^[0-9]{6,25}$/.test(pixelId)) return;
  const hash = (s) => crypto.createHash('sha256').update(String(s).toLowerCase()).digest('hex');
  const phone = customer.phone.replace(/[\s+\-]/g, '').replace(/^0/, '88');
  const firstName = customer.name.split(/\s+/)[0];
  const payload = {
    data: [
      {
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
      }
    ]
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
  if (!isAllowedOrigin(req)) {
    return respond(res, 403, { error: 'Cross-origin order submission is forbidden.' });
  }
  if (!checkRateLimit(req)) {
    return respond(res, 429, { error: 'Too many order requests. Please wait a minute and retry.' });
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
  if (JSON.stringify(body || {}).length > 15000) {
    return respond(res, 400, { error: 'Order payload exceeds maximum size.' });
  }

  const parsed = validateOrderRequestBody(body);
  if (!parsed.ok) {
    return respond(res, parsed.status, { error: parsed.error });
  }

  for (const item of parsed.items) {
    const entry = catalogBySku.get(item.sku);
    if (!entry) {
      return respond(res, 409, { error: `SKU ${item.sku} does not exist in catalog.` });
    }
    if (
      entry.variant.status === 'PROVISIONAL' ||
      !Array.isArray(entry.variant.available_sizes) ||
      !entry.variant.available_sizes.includes(item.size)
    ) {
      return respond(res, 409, { error: `SKU ${item.sku} or size ${item.size} is not available.` });
    }
    // Enforce catalog commercial readiness when catalog is static-gated, while permitting
    // Supabase-promoted documented items when STARKIT_DB_APPROVAL_AUTHORITATIVE === 'true'
    const dbAuthoritative = process.env.STARKIT_DB_APPROVAL_AUTHORITATIVE === 'true';
    if (!dbAuthoritative && !isVariantPurchasable(entry.product, entry.variant, { mode: 'public', cod_enabled: true })) {
      return respond(res, 409, { error: `SKU ${item.sku} is not approved or currently available for sale.` });
    }
  }

  const idempotencyKey =
    typeof body.idempotency_key === 'string' && UUID_REGEX.test(body.idempotency_key)
      ? body.idempotency_key
      : crypto.randomUUID();

  try {
    const db = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: order, error } = await db.rpc('submit_starkit_order', {
      p_idempotency: idempotencyKey,
      p_customer_name: parsed.customer.name,
      p_customer_phone: parsed.customer.phone,
      p_address: parsed.customer.address,
      p_district: parsed.customer.district,
      p_zone: parsed.customer.zone,
      p_notes: parsed.customer.notes,
      p_items: parsed.items
    });
    if (error) {
      const expectedRejection = error.code === 'P0001' || error.code === '23505' || error.code === '23514';
      console.error('[StarkiT] Order RPC rejected', error.code || 'unknown');
      return respond(res, expectedRejection ? 409 : 503, {
        error: expectedRejection
          ? 'Order not available. Please review your bag.'
          : 'Checkout service is temporarily unavailable.'
      });
    }
    if (!order?.reference || !Number.isFinite(Number(order.total_bdt))) {
      return respond(res, 503, { error: 'Order confirmation could not be verified.' });
    }
    if (order.status !== 'already_submitted') {
      await dispatchMetaPurchase({ order, customer: parsed.customer, items: parsed.items, req });
    }
    return respond(res, 201, order);
  } catch (error) {
    console.error('[StarkiT] Order service unavailable:', error?.code || error?.name || 'unknown');
    return respond(res, 503, { error: 'Checkout service temporarily unavailable. No order has been confirmed.' });
  }
}
