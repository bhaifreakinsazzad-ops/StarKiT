/** StarkiT authenticated administrator API. Service-role key never leaves server. */
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function send(res, status, payload) {
  return res.status(status)
    .setHeader('Content-Type', 'application/json; charset=utf-8')
    .setHeader('Cache-Control', 'no-store')
    .end(JSON.stringify(payload));
}
function safeKey(value) {
  const configured = process.env.STARKIT_ADMIN_API_KEY;
  if (!configured || configured.length < 32 || typeof value !== 'string') return false;
  const expected = Buffer.from(configured, 'utf8');
  const supplied = Buffer.from(value, 'utf8');
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
}
const allowedStates = new Set(['pending_confirmation', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']);
const settingTypes = {
  cod_enabled: 'boolean',
  delivery_dhaka_bdt: 'number',
  delivery_outside_bdt: 'number',
  free_shipping_threshold: 'number',
  support_phone: 'string',
  store_mode: 'string'
};

export default async function handler(req, res) {
  if (!['GET','POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'Method not allowed.' });
  }
  if (!process.env.STARKIT_ADMIN_API_KEY || process.env.STARKIT_ADMIN_API_KEY.length < 32) {
    return send(res, 503, { error: 'Administrator access is not configured.' });
  }
  if (!safeKey(req.headers['x-admin-key'])) {
    return send(res, 401, { error: 'Administrator authentication required.' });
  }
  const url = new URL(req.url, 'https://internal.invalid');
  const action = url.searchParams.get('action') || 'get_orders';
  if (action === 'import_drive_asset') {
    return send(res, 501, { error: 'Drive asset imports must use persistent object storage; Vercel filesystem uploads are disabled.' });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return send(res, 503, { error: 'Database not configured.' });
  }
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  try {
    if (req.method === 'GET' && action === 'get_orders') {
      const [ordersResult, variantsResult, settingsResult] = await Promise.all([
        db.from('store_orders').select('id,reference,customer_name,customer_phone,shipping_address,district,zone,notes,subtotal_bdt,shipping_bdt,total_bdt,status,created_at,store_order_items(id,sku,product_name,color,size,quantity,unit_price_bdt,line_total_bdt)').order('created_at', { ascending: false }).limit(100),
        db.from('store_variants').select('*').order('sku'),
        db.from('store_settings').select('*')
      ]);
      if (ordersResult.error || variantsResult.error || settingsResult.error) throw new Error('Database query error');
      return send(res, 200, { mode: 'supabase_live', orders: ordersResult.data || [], variants: variantsResult.data || [], settings: settingsResult.data || [] });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Unsupported GET action.' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return send(res, 400, { error: 'Invalid request body.' });

    if (action === 'update_status') {
      const { reference, status } = body;
      if (typeof reference !== 'string' || !/^STK-[A-Z0-9]{8,16}$/.test(reference) || !allowedStates.has(status)) {
        return send(res, 400, { error: 'Invalid order reference or status.' });
      }
      const { data, error } = await db.from('store_orders').update({ status }).eq('reference', reference).select('reference,status').single();
      if (error) throw new Error('Unable to update order status');
      return send(res, 200, { success: true, order: data });
    }
    if (action === 'update_stock') {
      const { sku, stock_quantity, sizes, price_bdt, approved_for_publication } = body;
      if (typeof sku !== 'string' || !/^(?:STK-H\d{3}-(?:BLK|CRM|MRN|BRN)|FT-(?:HM|JWL|BA)-\d{3})$/.test(sku)) {
        return send(res, 400, { error: 'Invalid SKU.' });
      }
      if (approved_for_publication === true) {
        return send(res, 403, { error: 'Publication requires separately verified artwork, stock, specs and commercial approval.' });
      }
      const update = { updated_at: new Date().toISOString() };
      if (Number.isInteger(stock_quantity) && stock_quantity >= 0 && stock_quantity <= 100000) update.stock_quantity = stock_quantity;
      if (Array.isArray(sizes) && sizes.length > 0 && sizes.length <= 20 && sizes.every(x => typeof x === 'string' && x.length < 32)) update.sizes = sizes;
      if (Number.isInteger(price_bdt) && price_bdt > 0 && price_bdt < 1000000) update.price_bdt = price_bdt;
      if (approved_for_publication === false) update.approved_for_publication = false;
      if (Object.keys(update).length === 1) return send(res, 400, { error: 'No valid stock, sizes, price, or disabling change supplied.' });
      const { data, error } = await db.from('store_variants').update(update).eq('sku', sku).select('*').single();
      if (error) throw new Error('Unable to update inventory');
      return send(res, 200, { success: true, variant: data });
    }
    if (action === 'update_settings') {
      if (!Array.isArray(body.settings) || body.settings.length > 10) return send(res, 400, { error: 'Invalid settings array.' });
      for (const entry of body.settings) {
        if (!entry || !(entry.key in settingTypes) || typeof entry.value !== settingTypes[entry.key]) {
          return send(res, 400, { error: 'Unknown or invalid setting.' });
        }
        if (typeof entry.value === 'number' && (!Number.isInteger(entry.value) || entry.value < 0 || entry.value > 100000)) return send(res, 400, { error: 'Invalid setting amount.' });
        if (typeof entry.value === 'string' && entry.value.length > 80) return send(res, 400, { error: 'Setting exceeds length limit.' });
      }
      for (const entry of body.settings) {
        const { error } = await db.from('store_settings').upsert({ key: entry.key, value: entry.value, updated_at: new Date().toISOString() });
        if (error) throw new Error('Unable to update store settings');
      }
      return send(res, 200, { success: true });
    }
    return send(res, 400, { error: 'Unknown admin action.' });
  } catch (err) {
    console.error('[StarkiT] Admin database operation failed:', err?.name || 'error');
    return send(res, 503, { error: 'Administrator service temporarily unavailable.' });
  }
}
