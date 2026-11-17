/**
 * Vercel Serverless Function — Admin Command Center API.
 * Securely manages orders, stock quantities, and store settings with Supabase.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const json = (res, code, data) => {
  res.status(code).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
};

export default async function handler(req, res) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');
    return res.status(204).end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const action = url.searchParams.get('action') || 'get_orders';

  const supabaseUrl = process.env.SUPABASE_URL || 'https://cahxfaizkqcufhctqlhi.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const memoryOrders = (globalThis.__STARKIT_MEMORY_ORDERS__ = globalThis.__STARKIT_MEMORY_ORDERS__ || []);

  if (req.method === 'POST' && action === 'import_drive_asset') {
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    if (!authHeader.startsWith('Bearer ') || authHeader.length < 20) {
      return json(res, 401, { error: 'Missing or invalid Google Drive Bearer token.' });
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const fileId = String(body.fileId || '').trim();
    if (!/^[a-zA-Z0-9_-]{10,80}$/.test(fileId)) {
      return json(res, 400, { error: 'Invalid Google Drive file ID.' });
    }
    try {
      const metaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size&supportsAllDrives=true`,
        { headers: { Authorization: authHeader } }
      );
      if (!metaRes.ok) {
        return json(res, metaRes.status, { error: 'Unable to verify file on Google Drive. Please sign in again.' });
      }
      const meta = await metaRes.json();
      if (!meta.mimeType || !meta.mimeType.startsWith('image/')) {
        return json(res, 400, { error: `Only image assets can be imported to storefront (received ${meta.mimeType || 'unknown'}).` });
      }
      if (Number(meta.size || 0) > 15 * 1024 * 1024) {
        return json(res, 400, { error: 'Image file exceeds 15 MB limit.' });
      }

      const dlRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
        { headers: { Authorization: authHeader } }
      );
      if (!dlRes.ok) {
        return json(res, dlRes.status, { error: 'Failed to download image bytes from Google Drive.' });
      }
      const arrayBuf = await dlRes.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      if (buf.length > 15 * 1024 * 1024) {
        return json(res, 400, { error: 'Downloaded image exceeds 15 MB limit.' });
      }

      const rawName = String(body.fileName || meta.name || `drive-${fileId}`).replace(/[^a-zA-Z0-9._-]/g, '_');
      const extFromMime = meta.mimeType === 'image/webp' ? '.webp' : meta.mimeType === 'image/png' ? '.png' : '.jpg';
      const finalName = /\.(webp|png|jpe?g|gif|avif)$/i.test(rawName) ? rawName : `${rawName}${extFromMime}`;
      const targetDir = path.join(ROOT_DIR, 'assets', 'images', 'drive-imports');
      fs.mkdirSync(targetDir, { recursive: true });
      const targetPath = path.join(targetDir, finalName);
      fs.writeFileSync(targetPath, buf);

      return json(res, 200, {
        success: true,
        fileName: finalName,
        mimeType: meta.mimeType,
        size: buf.length,
        url: `/assets/images/drive-imports/${finalName}`
      });
    } catch (err) {
      console.error('Drive import error:', err);
      return json(res, 500, { error: err.message || 'Failed to import asset from Google Drive.' });
    }
  }

  const handleLocalFallback = () => {
    if (req.method === 'GET' && action === 'get_orders') {
      return json(res, 200, {
        mode: 'local_storage',
        message: 'Running in local admin mode.',
        orders: memoryOrders,
        variants: []
      });
    }
    if (req.method === 'POST' && action === 'update_status') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { reference, status } = body || {};
      const found = memoryOrders.find(o => o.reference === reference);
      if (found && status) found.status = status;
      return json(res, 200, { success: true, mode: 'local_storage', order: { reference, status } });
    }
    if (req.method === 'POST' && action === 'update_stock') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      return json(res, 200, { success: true, mode: 'local_storage', variant: body });
    }
    if (req.method === 'POST' && action === 'update_settings') {
      return json(res, 200, { success: true, mode: 'local_storage', message: 'Settings saved locally.' });
    }
    return json(res, 200, { mode: 'local_storage', orders: memoryOrders, variants: [] });
  };

  // If Supabase key is not configured, inform the client to use local data mode
  if (!supabaseKey) {
    return handleLocalFallback();
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  try {
    // 1. GET ORDERS & ANALYTICS
    if (req.method === 'GET' && action === 'get_orders') {
      const { data: orders, error: ordersErr } = await supabase
        .from('store_orders')
        .select(`
          id,
          reference,
          customer_name,
          customer_phone,
          shipping_address,
          district,
          zone,
          notes,
          subtotal_bdt,
          shipping_bdt,
          total_bdt,
          status,
          created_at,
          store_order_items (
            id,
            sku,
            product_name,
            color,
            size,
            quantity,
            unit_price_bdt,
            line_total_bdt
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (ordersErr) throw ordersErr;

      const { data: variants } = await supabase
        .from('store_variants')
        .select('*')
        .order('sku');

      const { data: settings } = await supabase
        .from('store_settings')
        .select('*');

      return json(res, 200, {
        mode: 'supabase_live',
        orders: orders || [],
        variants: variants || [],
        settings: settings || []
      });
    }

    // 2. UPDATE ORDER STATUS
    if (req.method === 'POST' && action === 'update_status') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { reference, status } = body;

      if (!reference || !status) {
        return json(res, 400, { error: 'Missing order reference or status' });
      }

      const { data: updated, error } = await supabase
        .from('store_orders')
        .update({ status: status })
        .eq('reference', reference)
        .select('reference, status')
        .single();

      if (error) throw error;
      return json(res, 200, { success: true, order: updated });
    }

    // 3. UPDATE INVENTORY STOCK & SIZES
    if (req.method === 'POST' && action === 'update_stock') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { sku, stock_quantity, sizes, price_bdt, approved_for_publication } = body;

      if (!sku) {
        return json(res, 400, { error: 'Missing SKU identifier' });
      }

      const updatePayload = { updated_at: new Date().toISOString() };
      if (typeof stock_quantity === 'number') updatePayload.stock_quantity = stock_quantity;
      if (Array.isArray(sizes)) updatePayload.sizes = sizes;
      if (typeof price_bdt === 'number') updatePayload.price_bdt = price_bdt;
      if (typeof approved_for_publication === 'boolean') updatePayload.approved_for_publication = approved_for_publication;

      const { data: updated, error } = await supabase
        .from('store_variants')
        .update(updatePayload)
        .eq('sku', sku)
        .select('*')
        .single();

      if (error) throw error;
      return json(res, 200, { success: true, variant: updated });
    }

    // 4. UPDATE STORE SETTINGS
    if (req.method === 'POST' && action === 'update_settings') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { settings } = body;

      if (!Array.isArray(settings)) {
        return json(res, 400, { error: 'Settings array required' });
      }

      for (const item of settings) {
        await supabase
          .from('store_settings')
          .upsert({
            key: item.key,
            value: item.value,
            updated_at: new Date().toISOString()
          });
      }

      return json(res, 200, { success: true, message: 'Settings saved.' });
    }

    return json(res, 400, { error: 'Unsupported action or method' });
  } catch (err) {
    const errMsg = String(err?.message || err || '');
    if (errMsg.includes('fetch failed') || errMsg.includes('ENOTFOUND') || errMsg.includes('ECONNREFUSED') || errMsg.includes('ETIMEDOUT')) {
      console.warn('Admin API Supabase unreachable — falling back to local mode:', errMsg);
      return handleLocalFallback();
    }
    console.error('Admin API error:', err);
    return json(res, 500, { error: err.message || 'Server error processing admin request' });
  }
}
