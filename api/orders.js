/**
 * Vercel Serverless Function — Secure Cash on Delivery (COD) Order Processing.
 * Executes server-side validations, inventory locks, and PostgreSQL transactional insertion via Supabase.
 */
import { createClient } from '@supabase/supabase-js';

const json = (res, code, data) => {
  res.status(code).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
};

function validPhone(v) {
  const normalized = String(v || '').replace(/[\s-]/g, '');
  return /^(?:\+?880|0)1[3-9]\d{8}$/.test(normalized) ? normalized : null;
}

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export default async function handler(req, res) {
  // CORS Preflight & Method Validation
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed. Only POST is accepted.' });
  }

  // Environment checks
  if (process.env.STARKIT_ORDERS_ENABLED !== 'true') {
    return json(res, 503, {
      error: 'Order submission is not yet enabled. Contact the store to confirm availability.'
    });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 503, { error: 'Store database is not configured.' });
  }

  let data = req.body;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return json(res, 400, { error: 'Malformed JSON payload.' });
    }
  }

  if (!data || typeof data !== 'object' || Array.isArray(data) || JSON.stringify(data).length > 12000) {
    return json(res, 400, { error: 'Invalid order request payload.' });
  }

  const customer = data.customer || {};
  const items = data.items;

  const phone = validPhone(customer.phone);
  const name = clean(customer.name, 120);
  const address = clean(customer.address, 600);
  const district = clean(customer.district, 80);
  const notes = clean(customer.notes, 500);
  const zone = customer.zone;

  if (name.length < 2 || !phone || address.length < 10 || district.length < 2 || !['dhaka', 'outside'].includes(zone)) {
    return json(res, 400, {
      error: 'Enter a valid full name, Bangladesh mobile number (e.g. 017XXXXXXXX), delivery address, district, and delivery zone.'
    });
  }

  if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
    return json(res, 400, { error: 'Your bag must contain 1–20 items.' });
  }

  let quantityTotal = 0;
  const rows = [];
  for (const i of items) {
    if (
      !i ||
      !/^STK-H\d{3}-(?:BLK|BRN|MRN|CRM)$/.test(i.sku) ||
      typeof i.size !== 'string' ||
      i.size.length < 1 ||
      i.size.length > 10 ||
      !Number.isInteger(i.quantity) ||
      i.quantity < 1 ||
      i.quantity > 20
    ) {
      return json(res, 400, { error: 'An item has an invalid SKU, size, or quantity.' });
    }
    quantityTotal += i.quantity;
    rows.push({ sku: i.sku, size: i.size, quantity: i.quantity });
  }

  if (quantityTotal > 40) {
    return json(res, 400, { error: 'Order quantity limit exceeded (maximum 40 garments per order).' });
  }

  if (
    typeof data.idempotency_key !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.idempotency_key)
  ) {
    return json(res, 400, { error: 'Please refresh the checkout page and submit again.' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  try {
    const { data: order, error } = await supabase.rpc('submit_starkit_order', {
      p_idempotency: data.idempotency_key,
      p_customer_name: name,
      p_customer_phone: phone,
      p_address: address,
      p_district: district,
      p_zone: zone,
      p_notes: notes,
      p_items: rows
    });

    if (error) {
      console.error('order_rpc_error', error.code || 'unknown', error.message);
      const status = error.code === 'P0001' ? 409 : 500;
      return json(res, status, {
        error:
          status === 409
            ? 'A product or checkout rule requires attention. Check size availability, inventory, and delivery zone rates.'
            : 'Unable to submit order. Please try again later.'
      });
    }

    return json(res, 201, order);
  } catch (err) {
    console.error('order_unexpected_error', err);
    return json(res, 500, { error: 'Unable to submit order. Please try again later.' });
  }
}
