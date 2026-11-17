/**
 * StarkiT Hardened Administrator API
 * Supports X-Admin-Key (32+ char timing-safe) OR Supabase Auth JWT verified against store_admin_users.
 * Includes rate limiting, evidence-gated SKU approval, configurable promotions,
 * validated Supabase Storage media upload + Google Drive import, and audit trail logging.
 */
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import {
  APPROVAL_STATES,
  PRICE_TIERS,
  canTransitionApproval,
  hasCompleteApprovalEvidence
} from '../assets/js/core/catalog-schema.js';
import {
  ALLOWED_ORDER_STATUSES,
  ORDER_REF_REGEX,
  SKU_REGEX,
  detectImageSignature,
  sanitizeStorageFilename,
  sanitizeText
} from '../assets/js/core/validation.js';

const authFailBuckets = new Map();
const AUTH_WINDOW_MS = 300_000;
const AUTH_MAX_FAILS = 20;

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'] || '';
  return String(fwd).split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  const times = (authFailBuckets.get(ip) || []).filter((t) => now - t < AUTH_WINDOW_MS);
  authFailBuckets.set(ip, times);
  return times.length >= AUTH_MAX_FAILS;
}

function recordAuthFailure(ip) {
  const now = Date.now();
  const times = (authFailBuckets.get(ip) || []).filter((t) => now - t < AUTH_WINDOW_MS);
  times.push(now);
  authFailBuckets.set(ip, times);
}

function send(res, status, payload) {
  return res
    .status(status)
    .setHeader('Content-Type', 'application/json; charset=utf-8')
    .setHeader('Cache-Control', 'no-store')
    .end(JSON.stringify(payload));
}

function safeAdminKey(value) {
  const configured = process.env.STARKIT_ADMIN_API_KEY;
  if (!configured || configured.length < 32 || typeof value !== 'string') return false;
  const expected = Buffer.from(configured, 'utf8');
  const supplied = Buffer.from(value, 'utf8');
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
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

const settingTypes = {
  cod_enabled: 'boolean',
  delivery_dhaka_bdt: 'number',
  delivery_outside_bdt: 'number',
  free_shipping_threshold: 'number',
  support_phone: 'string',
  store_mode: 'string'
};

async function authenticateAdmin(req, db) {
  const keyHeader = req.headers['x-admin-key'];
  if (keyHeader) {
    if (!process.env.STARKIT_ADMIN_API_KEY || process.env.STARKIT_ADMIN_API_KEY.length < 32) {
      return { ok: false, status: 503, error: 'Administrator API key is not configured.' };
    }
    if (safeAdminKey(keyHeader)) {
      return { ok: true, actor: 'api_key_owner', role: 'owner', authMethod: 'api_key' };
    }
    return { ok: false, status: 401, error: 'Administrator authentication required.' };
  }

  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ') && db) {
    const jwt = authHeader.slice(7).trim();
    if (!jwt) return { ok: false, status: 401, error: 'Missing bearer token.' };
    const { data, error } = await db.auth.getUser(jwt);
    if (error || !data?.user?.id) {
      return { ok: false, status: 401, error: 'Invalid or expired Supabase session.' };
    }
    const { data: profile, error: roleErr } = await db
      .from('store_admin_users')
      .select('role, active, email')
      .eq('user_id', data.user.id)
      .maybeSingle();
    if (roleErr || !profile || !profile.active || !['owner', 'admin', 'merchandiser'].includes(profile.role)) {
      return { ok: false, status: 403, error: 'User lacks StarkiT administrator role permissions.' };
    }
    return {
      ok: true,
      actor: profile.email || data.user.email || data.user.id,
      role: profile.role,
      authMethod: 'supabase_jwt'
    };
  }

  if (!process.env.STARKIT_ADMIN_API_KEY || process.env.STARKIT_ADMIN_API_KEY.length < 32) {
    return { ok: false, status: 503, error: 'Administrator access is not configured.' };
  }
  return { ok: false, status: 401, error: 'Administrator authentication required.' };
}

async function writeAuditLog(db, { actor, authMethod, action, targetType, targetId, details }) {
  try {
    await db.from('store_audit_logs').insert({
      actor,
      auth_method: authMethod,
      action,
      target_type: targetType,
      target_id: String(targetId || ''),
      details: details || {}
    });
  } catch {
    // Non-fatal if migration 005 audit table hasn't been applied yet
  }
}

async function uploadBufferToSupabaseStorage(db, { bucket, storagePath, bytes, mimeType, replacePath }) {
  if (replacePath && typeof replacePath === 'string' && !replacePath.includes('..')) {
    try {
      await db.storage.from(bucket).remove([replacePath]);
    } catch {
      // Ignore cleanup failure for old assets
    }
  }
  const { error: uploadError } = await db.storage.from(bucket).upload(storagePath, bytes, {
    contentType: mimeType,
    upsert: true,
    cacheControl: '31536000'
  });
  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }
  const { data: pub } = db.storage.from(bucket).getPublicUrl(storagePath);
  return pub?.publicUrl || '';
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'Method not allowed.' });
  }
  if (req.method === 'POST' && !isAllowedOrigin(req)) {
    return send(res, 403, { error: 'Cross-origin admin request forbidden.' });
  }

  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp)) {
    return send(res, 429, { error: 'Too many authentication attempts. Try again later.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db =
    supabaseUrl && serviceRole
      ? createClient(supabaseUrl, serviceRole, {
          auth: { persistSession: false, autoRefreshToken: false }
        })
      : null;

  const auth = await authenticateAdmin(req, db);
  if (!auth.ok) {
    if (auth.status === 401 || auth.status === 403) recordAuthFailure(clientIp);
    return send(res, auth.status, { error: auth.error });
  }

  if (!db) {
    return send(res, 503, { error: 'Database not configured.' });
  }

  const url = new URL(req.url, 'https://internal.invalid');
  const action = url.searchParams.get('action') || 'get_orders';

  try {
    if (req.method === 'GET' && (action === 'get_orders' || action === 'get_dashboard')) {
      const [ordersResult, variantsResult, settingsResult] = await Promise.all([
        db
          .from('store_orders')
          .select(
            'id,reference,customer_name,customer_phone,shipping_address,district,zone,notes,subtotal_bdt,discount_bdt,shipping_bdt,total_bdt,applied_promotions,status,created_at,store_order_items(id,sku,product_name,color,size,quantity,unit_price_bdt,line_total_bdt)'
          )
          .order('created_at', { ascending: false })
          .limit(100),
        db.from('store_variants').select('*').order('sku'),
        db.from('store_settings').select('*')
      ]);
      if (ordersResult.error || variantsResult.error || settingsResult.error) {
        throw new Error('Database query error');
      }

      // Optional migration 005 tables (fail-soft if not yet migrated)
      const [productsRes, approvalsRes, promosRes, mediaRes, auditRes] = await Promise.all([
        db.from('store_products').select('*').order('id'),
        db.from('store_product_approvals').select('*'),
        db.from('store_promotions').select('*').order('min_qty'),
        db.from('store_media_assets').select('*').order('created_at', { ascending: false }).limit(200),
        db.from('store_audit_logs').select('*').order('created_at', { ascending: false }).limit(50)
      ]);

      return send(res, 200, {
        mode: 'supabase_live',
        actor: auth.actor,
        role: auth.role,
        orders: ordersResult.data || [],
        variants: variantsResult.data || [],
        settings: settingsResult.data || [],
        products: productsRes.error ? [] : productsRes.data || [],
        approvals: approvalsRes.error ? [] : approvalsRes.data || [],
        promotions: promosRes.error ? [] : promosRes.data || [],
        media_assets: mediaRes.error ? [] : mediaRes.data || [],
        audit_logs: auditRes.error ? [] : auditRes.data || []
      });
    }

    if (req.method !== 'POST') return send(res, 405, { error: 'Unsupported GET action.' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return send(res, 400, { error: 'Invalid request body.' });
    }

    if (action === 'update_status') {
      const { reference, status } = body;
      if (typeof reference !== 'string' || !ORDER_REF_REGEX.test(reference) || !ALLOWED_ORDER_STATUSES.has(status)) {
        return send(res, 400, { error: 'Invalid order reference or status.' });
      }
      const { data, error } = await db
        .from('store_orders')
        .update({ status })
        .eq('reference', reference)
        .select('reference,status')
        .single();
      if (error) throw new Error('Unable to update order status');
      await writeAuditLog(db, {
        actor: auth.actor,
        authMethod: auth.authMethod,
        action: 'update_order_status',
        targetType: 'order',
        targetId: reference,
        details: { status }
      });
      return send(res, 200, { success: true, order: data });
    }

    if (action === 'update_stock') {
      const { sku, stock_quantity, sizes, price_bdt, approved_for_publication } = body;
      if (typeof sku !== 'string' || !SKU_REGEX.test(sku)) {
        return send(res, 400, { error: 'Invalid SKU.' });
      }
      if (approved_for_publication === true) {
        return send(res, 403, {
          error: 'Publication requires completed 7-gate evidence via submit_approval_evidence.'
        });
      }
      const update = { updated_at: new Date().toISOString() };
      if (Number.isInteger(stock_quantity) && stock_quantity >= 0 && stock_quantity <= 100000) {
        update.stock_quantity = stock_quantity;
      }
      if (Array.isArray(sizes) && sizes.length > 0 && sizes.length <= 20 && sizes.every((x) => typeof x === 'string' && x.length < 32)) {
        update.sizes = sizes;
      }
      if (Number.isInteger(price_bdt) && price_bdt > 0 && price_bdt < 1000000) {
        update.price_bdt = price_bdt;
      }
      if (approved_for_publication === false) {
        update.approved_for_publication = false;
      }
      if (Object.keys(update).length === 1) {
        return send(res, 400, { error: 'No valid stock, sizes, price, or disabling change supplied.' });
      }
      const { data, error } = await db.from('store_variants').update(update).eq('sku', sku).select('*').single();
      if (error) throw new Error('Unable to update inventory');
      await writeAuditLog(db, {
        actor: auth.actor,
        authMethod: auth.authMethod,
        action: 'update_stock',
        targetType: 'variant',
        targetId: sku,
        details: update
      });
      return send(res, 200, { success: true, variant: data });
    }

    if (action === 'submit_approval_evidence') {
      if (!['owner', 'admin'].includes(auth.role)) {
        return send(res, 403, { error: 'Only owner or admin role may approve product publication.' });
      }
      const { product_id, evidence, next_status, approve_tier_price } = body;
      if (typeof product_id !== 'string' || !/^(?:STK-H\d{3}|FT-(?:HM|JWL|BA)-\d{3})$/.test(product_id)) {
        return send(res, 400, { error: 'Invalid product_id.' });
      }
      if (product_id === 'STK-H012') {
        return send(res, 403, { error: 'STK-H012 is on commercial/IP hold and cannot be published.' });
      }
      if (!APPROVAL_STATES.includes(next_status)) {
        return send(res, 400, { error: 'Invalid target approval_status.' });
      }

      const { data: currentProd, error: prodErr } = await db
        .from('store_products')
        .select('*')
        .eq('id', product_id)
        .single();
      if (prodErr || !currentProd) {
        return send(res, 404, { error: 'Product not found in store_products.' });
      }

      if (!canTransitionApproval(currentProd.approval_status, next_status)) {
        return send(res, 409, {
          error: `Illegal state transition from ${currentProd.approval_status} to ${next_status}.`
        });
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
        reviewed_by: auth.actor,
        reviewed_at: new Date().toISOString()
      };

      const complete = hasCompleteApprovalEvidence(ev);
      if ((next_status === 'APPROVED' || next_status === 'PUBLISHED') && !complete) {
        return send(res, 409, {
          error: 'All 7 verification evidence gates must be checked before transitioning to APPROVED or PUBLISHED.'
        });
      }

      await db.from('store_product_approvals').upsert(ev);

      const prodUpdate = {
        approval_status: next_status,
        rights_verified: ev.artwork_rights_ok,
        specifications_verified: ev.garment_specs_ok,
        stock_verified: ev.stock_count_ok,
        commercial_terms_verified: ev.commercial_terms_ok,
        updated_at: new Date().toISOString()
      };

      if (approve_tier_price === true && PRICE_TIERS[currentProd.price_tier]) {
        prodUpdate.approved_price_bdt = currentProd.draft_price_bdt;
        prodUpdate.price_approved = true;
      }

      const { data: updatedProd, error: updErr } = await db
        .from('store_products')
        .update(prodUpdate)
        .eq('id', product_id)
        .select('*')
        .single();
      if (updErr) throw new Error('Unable to update store_products');

      if (next_status === 'PUBLISHED' && complete) {
        await db
          .from('store_variants')
          .update({
            rights_verified: true,
            specifications_verified: true,
            stock_verified: true,
            commercial_terms_verified: true,
            price_approved: Boolean(updatedProd.price_approved),
            approved_for_publication: true,
            updated_at: new Date().toISOString()
          })
          .eq('product_id', product_id)
          .eq('status', 'DOCUMENTED')
          .gt('stock_quantity', 0);
      } else if (next_status !== 'PUBLISHED') {
        await db
          .from('store_variants')
          .update({ approved_for_publication: false, updated_at: new Date().toISOString() })
          .eq('product_id', product_id);
      }

      await writeAuditLog(db, {
        actor: auth.actor,
        authMethod: auth.authMethod,
        action: 'submit_approval_evidence',
        targetType: 'product',
        targetId: product_id,
        details: { next_status, complete, approve_tier_price: Boolean(approve_tier_price) }
      });
      return send(res, 200, { success: true, product: updatedProd, evidence: ev });
    }

    if (action === 'update_promotion') {
      if (!['owner', 'admin'].includes(auth.role)) {
        return send(res, 403, { error: 'Only owner or admin role may modify promotions.' });
      }
      const { code, title, subtitle, tier_type, min_qty, applies_to, discount_type, discount_value, free_shipping, combinable, active, requires_approval, description } = body;
      if (typeof code !== 'string' || !/^[A-Z0-9_]{3,40}$/.test(code)) {
        return send(res, 400, { error: 'Invalid promotion code.' });
      }
      if (!['SINGLE', 'DUO', 'TRIO_PLUS', 'WHOLESALE'].includes(tier_type)) {
        return send(res, 400, { error: 'Invalid tier_type.' });
      }
      if (!['NONE', 'FIXED_BDT', 'PERCENT', 'INQUIRY'].includes(discount_type)) {
        return send(res, 400, { error: 'Invalid discount_type.' });
      }
      const val = Number(discount_value || 0);
      if (!Number.isInteger(val) || val < 0 || (discount_type === 'PERCENT' && val > 80) || val > 50000) {
        return send(res, 400, { error: 'Invalid discount_value.' });
      }
      const promoRecord = {
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
        approved_by: active && !requires_approval ? auth.actor : null,
        updated_at: new Date().toISOString()
      };
      const { data, error } = await db.from('store_promotions').upsert(promoRecord).select('*').single();
      if (error) throw new Error('Unable to update promotion');
      await writeAuditLog(db, {
        actor: auth.actor,
        authMethod: auth.authMethod,
        action: 'update_promotion',
        targetType: 'promotion',
        targetId: code,
        details: promoRecord
      });
      return send(res, 200, { success: true, promotion: data });
    }

    if (action === 'update_settings') {
      if (!Array.isArray(body.settings) || body.settings.length > 10) {
        return send(res, 400, { error: 'Invalid settings array.' });
      }
      for (const entry of body.settings) {
        if (!entry || !(entry.key in settingTypes) || typeof entry.value !== settingTypes[entry.key]) {
          return send(res, 400, { error: 'Unknown or invalid setting.' });
        }
        if (typeof entry.value === 'number' && (!Number.isInteger(entry.value) || entry.value < 0 || entry.value > 100000)) {
          return send(res, 400, { error: 'Invalid setting amount.' });
        }
        if (typeof entry.value === 'string' && entry.value.length > 80) {
          return send(res, 400, { error: 'Setting exceeds length limit.' });
        }
      }
      for (const entry of body.settings) {
        const { error } = await db
          .from('store_settings')
          .upsert({ key: entry.key, value: entry.value, updated_at: new Date().toISOString() });
        if (error) throw new Error('Unable to update store settings');
      }
      await writeAuditLog(db, {
        actor: auth.actor,
        authMethod: auth.authMethod,
        action: 'update_settings',
        targetType: 'settings',
        targetId: 'global',
        details: { keys: body.settings.map((s) => s.key) }
      });
      return send(res, 200, { success: true });
    }

    if (action === 'upload_media') {
      const { sku, design_id, view_type, base64_data, replace_storage_path } = body;
      if (typeof sku !== 'string' || !SKU_REGEX.test(sku) || typeof base64_data !== 'string') {
        return send(res, 400, { error: 'Valid SKU and base64_data image payload required.' });
      }
      const rawB64 = base64_data.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '');
      const bytes = Buffer.from(rawB64, 'base64');
      if (bytes.length < 32 || bytes.length > 5 * 1024 * 1024) {
        return send(res, 400, { error: 'Image file must be between 32 bytes and 5 MB.' });
      }
      const sig = detectImageSignature(bytes);
      if (!sig) {
        return send(res, 400, { error: 'Unsupported or corrupted image signature. Use PNG, JPEG, or WebP.' });
      }
      const bucket = process.env.STARKIT_MEDIA_BUCKET || 'starkit-media';
      const view = sanitizeText(view_type || 'front', 24).toLowerCase() || 'front';
      const safeName = sanitizeStorageFilename(sku, view, sig.ext);
      const storagePath = `variants/${sku}/${safeName}`;
      const publicUrl = await uploadBufferToSupabaseStorage(db, {
        bucket,
        storagePath,
        bytes,
        mimeType: sig.mime,
        replacePath: replace_storage_path
      });
      const checksum = crypto.createHash('sha256').update(bytes).digest('hex');
      const designId = sanitizeText(design_id || sku.slice(0, 8), 16);
      await db.from('store_media_assets').insert({
        design_id: designId,
        sku,
        view_type: view,
        storage_bucket: bucket,
        storage_path: storagePath,
        public_url: publicUrl,
        mime_type: sig.mime,
        byte_size: bytes.length,
        source_type: 'UPLOAD',
        checksum_sha256: checksum,
        created_by: auth.actor
      });
      await writeAuditLog(db, {
        actor: auth.actor,
        authMethod: auth.authMethod,
        action: 'upload_media',
        targetType: 'media',
        targetId: sku,
        details: { storagePath, mime: sig.mime, byte_size: bytes.length }
      });
      return send(res, 200, { success: true, sku, view_type: view, storage_path: storagePath, url: publicUrl });
    }

    if (action === 'import_drive_asset') {
      const { fileId, fileName, sku, view_type } = body;
      if (typeof fileId !== 'string' || !/^[a-zA-Z0-9_-]{10,128}$/.test(fileId)) {
        return send(res, 400, { error: 'Invalid Google Drive fileId.' });
      }
      const driveToken =
        body.driveAccessToken ||
        (req.headers['x-drive-token'] ? String(req.headers['x-drive-token']) : '') ||
        (auth.authMethod === 'api_key' && String(req.headers.authorization || '').startsWith('Bearer ')
          ? String(req.headers.authorization).slice(7).trim()
          : '');
      if (!driveToken) {
        return send(res, 401, { error: 'Google Drive read-only OAuth access token is required to import.' });
      }
      const driveRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
        {
          headers: { Authorization: `Bearer ${driveToken}` },
          signal: AbortSignal.timeout(15000)
        }
      );
      if (!driveRes.ok) {
        return send(res, driveRes.status === 401 || driveRes.status === 403 ? 401 : 502, {
          error: `Google Drive download failed (HTTP ${driveRes.status}).`
        });
      }
      const arrBuf = await driveRes.arrayBuffer();
      const bytes = Buffer.from(arrBuf);
      if (bytes.length < 32 || bytes.length > 8 * 1024 * 1024) {
        return send(res, 400, { error: 'Drive image exceeds 8 MB safety cap or is empty.' });
      }
      const sig = detectImageSignature(bytes);
      if (!sig) {
        return send(res, 400, { error: 'Imported Drive file is not a valid PNG, JPEG, or WebP image.' });
      }
      const bucket = process.env.STARKIT_MEDIA_BUCKET || 'starkit-media';
      const targetSku = typeof sku === 'string' && SKU_REGEX.test(sku) ? sku : 'UNASSIGNED';
      const view = sanitizeText(view_type || 'front', 24).toLowerCase() || 'front';
      const safeName = sanitizeStorageFilename(targetSku, view, sig.ext);
      const storagePath = `drive-imports/${targetSku}/${safeName}`;
      const publicUrl = await uploadBufferToSupabaseStorage(db, {
        bucket,
        storagePath,
        bytes,
        mimeType: sig.mime
      });
      const checksum = crypto.createHash('sha256').update(bytes).digest('hex');
      await db.from('store_media_assets').insert({
        design_id: targetSku.startsWith('STK-') ? targetSku.slice(0, 8) : targetSku,
        sku: targetSku,
        view_type: view,
        storage_bucket: bucket,
        storage_path: storagePath,
        public_url: publicUrl,
        mime_type: sig.mime,
        byte_size: bytes.length,
        source_type: 'DRIVE_IMPORT',
        checksum_sha256: checksum,
        created_by: auth.actor
      });
      await writeAuditLog(db, {
        actor: auth.actor,
        authMethod: auth.authMethod,
        action: 'import_drive_asset',
        targetType: 'media',
        targetId: targetSku,
        details: { fileId, fileName: sanitizeText(fileName || '', 120), storagePath }
      });
      return send(res, 200, {
        success: true,
        fileName: sanitizeText(fileName || safeName, 120),
        storage_path: storagePath,
        url: publicUrl
      });
    }

    return send(res, 400, { error: 'Unknown admin action.' });
  } catch (err) {
    console.error('[StarkiT] Admin operation failed:', err?.name || 'error');
    return send(res, 503, { error: 'Administrator service temporarily unavailable.' });
  }
}
