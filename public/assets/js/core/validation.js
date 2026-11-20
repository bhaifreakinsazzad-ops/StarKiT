/**
 * StarkiT Input Validation, Sanitization & Binary Media Guards
 */

export const BD_PHONE_REGEX = /^(?:\+?880|0)1[3-9]\d{8}$/;
export const SKU_REGEX = /^STK-H\d{3}-(BLK|CRM|MRN|BRN)$/;
export const ORDER_REF_REGEX = /^STK-[A-Z0-9]{8,16}$/;
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const ALLOWED_ORDER_STATUSES = new Set([
  'pending_confirmation',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled'
]);

export function sanitizeText(value, maxLength = 250) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, maxLength);
}

export function escapeHtml(str) {
  return String(str == null ? '' : str).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

export function normalizeBdPhone(phone) {
  return sanitizeText(phone, 32).replace(/[\s-]/g, '');
}

export function isValidBdPhone(phone) {
  return BD_PHONE_REGEX.test(normalizeBdPhone(phone));
}

export function maskPhoneForDisplay(phone) {
  const clean = normalizeBdPhone(phone);
  if (clean.length < 7) return '****';
  return `${clean.slice(0, 3)}****${clean.slice(-4)}`;
}

export function formatBdt(amount) {
  const num = Number(amount || 0);
  if (!Number.isFinite(num)) return '৳0';
  return `৳${Math.round(num).toLocaleString('en-BD')}`;
}

export function resolveAssetUrl(rawUrl, base = './') {
  const raw = String(rawUrl == null ? '' : rawUrl).trim();
  if (!raw) return '';
  if (/^(?:javascript|vbscript):/i.test(raw)) return '';
  if (/^data:/i.test(raw)) {
    return /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i.test(raw) ? raw : '';
  }
  if (/^(?:https?:\/\/|blob:)/i.test(raw)) {
    return raw;
  }
  const cleanBase = typeof base === 'string' && base ? base : './';
  return `${cleanBase}${raw.replace(/^\/+/, '')}`;
}

export function sanitizeCsvCell(value) {
  const normalized = String(value == null ? '' : value).replace(/[\r\n]+/g, ' ');
  const neutralized = /^[=+\-@\t]/.test(normalized) ? `'${normalized}` : normalized;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

export function sanitizeStorageFilename(sku, view, ext) {
  const cleanSku = String(sku || 'ASSET').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32) || 'ASSET';
  const cleanView = String(view || 'view').toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 24) || 'view';
  const cleanExt = ['webp', 'png', 'jpg', 'jpeg'].includes(String(ext || '').toLowerCase())
    ? String(ext).toLowerCase()
    : 'webp';
  return `${cleanSku}__${cleanView}__${Date.now()}.${cleanExt}`;
}

export function detectImageSignature(bytes) {
  if (!bytes || bytes.length < 12) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { ext: 'png', mime: 'image/png' };
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  // WebP: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}

export function validateOrderRequestBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, status: 400, error: 'Invalid order payload.' };
  }
  const customer = body.customer || {};
  const name = sanitizeText(customer.name, 120);
  const phone = normalizeBdPhone(customer.phone);
  const address = sanitizeText(customer.address, 600);
  const district = sanitizeText(customer.district, 80);
  const notes = sanitizeText(customer.notes, 500);
  const zone = customer.zone;

  if (
    name.length < 2 ||
    !BD_PHONE_REGEX.test(phone) ||
    address.length < 10 ||
    district.length < 2 ||
    !['dhaka', 'outside'].includes(zone)
  ) {
    return {
      ok: false,
      status: 400,
      error: 'Enter a valid name, Bangladesh phone, address, district, and delivery zone.'
    };
  }

  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 20) {
    return { ok: false, status: 400, error: 'Bag must contain 1–20 line items.' };
  }

  const items = [];
  let totalQty = 0;
  for (const rawItem of body.items) {
    if (
      !rawItem ||
      typeof rawItem.sku !== 'string' ||
      !SKU_REGEX.test(rawItem.sku.trim()) ||
      !Number.isInteger(rawItem.quantity) ||
      rawItem.quantity < 1 ||
      rawItem.quantity > 20 ||
      typeof rawItem.size !== 'string'
    ) {
      return { ok: false, status: 400, error: 'Invalid SKU, size, or quantity.' };
    }
    const size = sanitizeText(rawItem.size, 32);
    if (!size) {
      return { ok: false, status: 400, error: 'Size is required for every item.' };
    }
    totalQty += rawItem.quantity;
    items.push({ sku: rawItem.sku.trim(), size, quantity: rawItem.quantity });
  }

  if (totalQty > 50) {
    return { ok: false, status: 400, error: 'Maximum total quantity is 50.' };
  }

  return {
    ok: true,
    customer: { name, phone, address, district, zone, notes },
    items,
    totalQty
  };
}
