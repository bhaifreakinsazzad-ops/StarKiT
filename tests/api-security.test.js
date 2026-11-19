import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import orderHandler from '../api/orders.js';
import adminHandler from '../api/admin.js';
import { app } from '../server.js';
import { resetRuntimeStore } from '../assets/js/core/runtime-store.js';

function createMockRes() {
  const state = { statusCode: 200, headers: {}, body: null };
  return {
    state,
    status(code) {
      state.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      state.headers[name.toLowerCase()] = value;
      return this;
    },
    end(raw) {
      try {
        state.body = JSON.parse(raw);
      } catch {
        state.body = raw;
      }
      return this;
    }
  };
}

test('Orders API rejects non-POST methods cleanly with 405', async () => {
  const res = createMockRes();
  await orderHandler({ method: 'GET', headers: {} }, res);
  assert.equal(res.state.statusCode, 405);
});

test('Orders API rejects cross-origin browser submissions with 403', async () => {
  const res = createMockRes();
  await orderHandler(
    {
      method: 'POST',
      headers: { host: 'starkit.bd', origin: 'https://evil-attacker.example' },
      body: {}
    },
    res
  );
  assert.equal(res.state.statusCode, 403);
});

test('Orders API fails closed with 503 when STARKIT_ORDERS_ENABLED !== true', async () => {
  const prev = process.env.STARKIT_ORDERS_ENABLED;
  process.env.STARKIT_ORDERS_ENABLED = 'false';
  const res = createMockRes();
  await orderHandler({ method: 'POST', headers: { host: 'starkit.bd' }, body: {} }, res);
  assert.equal(res.state.statusCode, 503);
  if (prev === undefined) delete process.env.STARKIT_ORDERS_ENABLED;
  else process.env.STARKIT_ORDERS_ENABLED = prev;
});

test('Orders API blocks unapproved or non-catalog SKUs with 409 even if ordering is enabled', async () => {
  const prevEnabled = process.env.STARKIT_ORDERS_ENABLED;
  const prevUrl = process.env.SUPABASE_URL;
  const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.STARKIT_ORDERS_ENABLED = 'true';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-service-role-key-for-unit-test';

  const res = createMockRes();
  await orderHandler(
    {
      method: 'POST',
      headers: { host: 'starkit.bd', 'x-forwarded-for': '10.10.10.2' },
      body: {
        customer: {
          name: 'Tanvir Ahmed',
          phone: '01778307704',
          address: 'House 20, Road 4, Dhanmondi, Dhaka',
          district: 'Dhaka',
          zone: 'dhaka'
        },
        items: [{ sku: 'STK-H013-BLK', size: 'L', quantity: 1 }]
      }
    },
    res
  );
  assert.equal(res.state.statusCode, 409);

  if (prevEnabled === undefined) delete process.env.STARKIT_ORDERS_ENABLED;
  else process.env.STARKIT_ORDERS_ENABLED = prevEnabled;
  if (prevUrl === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = prevUrl;
  if (prevKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey;
});

test('Admin API fails closed (401/503) when unauthenticated or key is weak/mismatched', async () => {
  const prevKey = process.env.STARKIT_ADMIN_API_KEY;
  delete process.env.STARKIT_ADMIN_API_KEY;

  const resNoConfig = createMockRes();
  await adminHandler({ method: 'GET', url: '/api/admin', headers: {} }, resNoConfig);
  assert.equal(resNoConfig.state.statusCode, 503);

  process.env.STARKIT_ADMIN_API_KEY = 'a'.repeat(40);
  const resBadKey = createMockRes();
  await adminHandler(
    {
      method: 'GET',
      url: '/api/admin',
      headers: { 'x-admin-key': 'wrong-key-value', 'x-forwarded-for': '10.10.10.3' }
    },
    resBadKey
  );
  assert.equal(resBadKey.state.statusCode, 401);

  if (prevKey === undefined) delete process.env.STARKIT_ADMIN_API_KEY;
  else process.env.STARKIT_ADMIN_API_KEY = prevKey;
});

test('Admin API rejects direct approved_for_publication bypass inside update_stock with 403', async () => {
  const prevKey = process.env.STARKIT_ADMIN_API_KEY;
  const prevUrl = process.env.SUPABASE_URL;
  const prevSrv = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.STARKIT_ADMIN_API_KEY = 'b'.repeat(40);
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-service-role-key-for-unit-test';

  const res = createMockRes();
  await adminHandler(
    {
      method: 'POST',
      url: '/api/admin?action=update_stock',
      headers: {
        host: 'starkit.bd',
        'x-admin-key': 'b'.repeat(40),
        'x-forwarded-for': '10.10.10.4'
      },
      body: {
        sku: 'STK-H002-BLK',
        approved_for_publication: true
      }
    },
    res
  );
  assert.equal(res.state.statusCode, 403);

  if (prevKey === undefined) delete process.env.STARKIT_ADMIN_API_KEY;
  else process.env.STARKIT_ADMIN_API_KEY = prevKey;
  if (prevUrl === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = prevUrl;
  if (prevSrv === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = prevSrv;
});

test('Admin public_storefront_state hydrates non-PII catalog/settings without exposing orders or audit logs', async () => {
  resetRuntimeStore();
  const prevUrl = process.env.SUPABASE_URL;
  const prevSrv = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const res = createMockRes();
    await adminHandler({ method: 'GET', url: '/api/admin?action=public_storefront_state', headers: {} }, res);
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.orders, undefined);
    assert.equal(res.state.body.audit_logs, undefined);
    assert.equal(Array.isArray(res.state.body.settings), true);
    assert.equal(Array.isArray(res.state.body.promotions), true);
    assert.equal(res.state.body.products.length, 11);
    assert.equal(res.state.body.variants.length, 15);
  } finally {
    if (prevUrl !== undefined) process.env.SUPABASE_URL = prevUrl;
    if (prevSrv !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = prevSrv;
  }
});

test('Runtime admin 7-gate approval & promo activation unlock live storefront COD checkout end-to-end', async () => {
  resetRuntimeStore();
  const prevKey = process.env.STARKIT_ADMIN_API_KEY;
  const prevUrl = process.env.SUPABASE_URL;
  const prevSrv = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const prevEnabled = process.env.STARKIT_ORDERS_ENABLED;

  const adminKey = 'c'.repeat(40);
  process.env.STARKIT_ADMIN_API_KEY = adminKey;
  process.env.STARKIT_ORDERS_ENABLED = 'true';
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    // 1. Update stock on documented STK-H002-BLK
    const stockRes = createMockRes();
    await adminHandler(
      {
        method: 'POST',
        url: '/api/admin?action=update_stock',
        headers: { host: 'starkit.bd', 'x-admin-key': adminKey, 'x-forwarded-for': '10.10.20.1' },
        body: { sku: 'STK-H002-BLK', stock_quantity: 12 }
      },
      stockRes
    );
    assert.equal(stockRes.state.statusCode, 200);
    assert.equal(stockRes.state.body.variant.stock_quantity, 12);

    const allSevenEvidence = {
      artwork_rights_ok: true,
      garment_specs_ok: true,
      sample_photo_ok: true,
      size_run_ok: true,
      stock_count_ok: true,
      pricing_approved_ok: true,
      commercial_terms_ok: true,
      evidence_notes: 'Verified by Nafe Munawer'
    };

    // 2. Transition READY_FOR_APPROVAL -> APPROVED -> PUBLISHED
    const approveRes = createMockRes();
    await adminHandler(
      {
        method: 'POST',
        url: '/api/admin?action=submit_approval_evidence',
        headers: { host: 'starkit.bd', 'x-admin-key': adminKey, 'x-forwarded-for': '10.10.20.1' },
        body: { product_id: 'STK-H002', next_status: 'APPROVED', approve_tier_price: true, evidence: allSevenEvidence }
      },
      approveRes
    );
    assert.equal(approveRes.state.statusCode, 200);
    assert.equal(approveRes.state.body.product.approval_status, 'APPROVED');

    const publishRes = createMockRes();
    await adminHandler(
      {
        method: 'POST',
        url: '/api/admin?action=submit_approval_evidence',
        headers: { host: 'starkit.bd', 'x-admin-key': adminKey, 'x-forwarded-for': '10.10.20.1' },
        body: { product_id: 'STK-H002', next_status: 'PUBLISHED', approve_tier_price: true, evidence: allSevenEvidence }
      },
      publishRes
    );
    assert.equal(publishRes.state.statusCode, 200);
    assert.equal(publishRes.state.body.product.approval_status, 'PUBLISHED');

    // 3. Activate DUO_SELECTION promo rule
    const promoRes = createMockRes();
    await adminHandler(
      {
        method: 'POST',
        url: '/api/admin?action=update_promotion',
        headers: { host: 'starkit.bd', 'x-admin-key': adminKey, 'x-forwarded-for': '10.10.20.1' },
        body: {
          code: 'DUO_SELECTION',
          title: 'Duo Selection',
          tier_type: 'DUO',
          min_qty: 2,
          applies_to: 'hoodies',
          discount_type: 'FIXED_BDT',
          discount_value: 200,
          free_shipping: true,
          combinable: false,
          active: true,
          requires_approval: false
        }
      },
      promoRes
    );
    assert.equal(promoRes.state.statusCode, 200);
    assert.equal(promoRes.state.body.promotion.active, true);

    // 4. Verify public hydration reflects approved SKU & active promo
    const pubRes = createMockRes();
    await adminHandler({ method: 'GET', url: '/api/admin?action=public_storefront_state', headers: {} }, pubRes);
    const pubVariant = pubRes.state.body.variants.find((v) => v.sku === 'STK-H002-BLK');
    assert.equal(pubVariant.approved_for_publication, true);
    assert.equal(pubVariant.stock_quantity, 12);

    // 5. Place COD order for 2x STK-H002-BLK (2 * 1099 - 200 + 0 shipping = 1998)
    const orderRes = createMockRes();
    await orderHandler(
      {
        method: 'POST',
        headers: { host: 'starkit.bd', 'x-forwarded-for': '10.10.20.2' },
        body: {
          customer: {
            name: 'Tanvir Ahmed',
            phone: '01778307704',
            address: 'House 20, Road 4, Dhanmondi, Dhaka',
            district: 'Dhaka',
            zone: 'outside'
          },
          items: [{ sku: 'STK-H002-BLK', size: 'L', quantity: 2 }]
        }
      },
      orderRes
    );
    assert.equal(orderRes.state.statusCode, 201);
    assert.match(orderRes.state.body.reference, /^STK-[A-Z0-9]{8,16}$/);
    assert.equal(orderRes.state.body.subtotal_bdt, 2198);
    assert.equal(orderRes.state.body.discount_bdt, 200);
    assert.equal(orderRes.state.body.shipping_bdt, 0);
    assert.equal(orderRes.state.body.total_bdt, 1998);

    // 6. Verify admin dashboard records the order and decremented stock
    const dashRes = createMockRes();
    await adminHandler(
      {
        method: 'GET',
        url: '/api/admin?action=get_dashboard',
        headers: { 'x-admin-key': adminKey, 'x-forwarded-for': '10.10.20.1' }
      },
      dashRes
    );
    assert.equal(dashRes.state.statusCode, 200);
    assert.equal(dashRes.state.body.orders.length, 1);
    assert.equal(dashRes.state.body.orders[0].reference, orderRes.state.body.reference);
    const updatedVariant = dashRes.state.body.variants.find((v) => v.sku === 'STK-H002-BLK');
    assert.equal(updatedVariant.stock_quantity, 10);
  } finally {
    resetRuntimeStore();
    if (prevKey === undefined) delete process.env.STARKIT_ADMIN_API_KEY;
    else process.env.STARKIT_ADMIN_API_KEY = prevKey;
    if (prevUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = prevUrl;
    if (prevSrv === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = prevSrv;
    if (prevEnabled === undefined) delete process.env.STARKIT_ORDERS_ENABLED;
    else process.env.STARKIT_ORDERS_ENABLED = prevEnabled;
  }
});

test('firebase-applet-config.json contains no hardcoded Google/Gemini API keys', () => {
  const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  const raw = fs.readFileSync(cfgPath, 'utf8');
  assert.equal(/AIza[0-9A-Za-z_-]{20,}/.test(raw), false);
  const parsed = JSON.parse(raw);
  assert.equal(parsed.apiKey, '');
});

test('Admin API get_drive_config fails closed when unauthenticated and reads strictly from env when authenticated', async () => {
  const prevKey = process.env.STARKIT_ADMIN_API_KEY;
  const prevFbKey = process.env.FIREBASE_API_KEY;
  const prevFbDomain = process.env.FIREBASE_AUTH_DOMAIN;
  const prevFbProj = process.env.FIREBASE_PROJECT_ID;

  const adminKey = 'd'.repeat(40);
  process.env.STARKIT_ADMIN_API_KEY = adminKey;
  delete process.env.FIREBASE_API_KEY;
  delete process.env.FIREBASE_AUTH_DOMAIN;
  delete process.env.FIREBASE_PROJECT_ID;

  try {
    const unauthRes = createMockRes();
    await adminHandler(
      { method: 'GET', url: '/api/admin?action=get_drive_config', headers: { 'x-forwarded-for': '10.10.30.1' } },
      unauthRes
    );
    assert.equal(unauthRes.state.statusCode, 401);

    const emptyCfgRes = createMockRes();
    await adminHandler(
      {
        method: 'GET',
        url: '/api/admin?action=get_drive_config',
        headers: { 'x-admin-key': adminKey, 'x-forwarded-for': '10.10.30.2' }
      },
      emptyCfgRes
    );
    assert.equal(emptyCfgRes.state.statusCode, 200);
    assert.equal(emptyCfgRes.state.body.configured, false);
    assert.equal(emptyCfgRes.state.body.config, null);

    process.env.FIREBASE_API_KEY = 'test-env-only-key';
    process.env.FIREBASE_AUTH_DOMAIN = 'example.firebaseapp.com';
    process.env.FIREBASE_PROJECT_ID = 'example-proj';

    const envCfgRes = createMockRes();
    await adminHandler(
      {
        method: 'GET',
        url: '/api/admin?action=get_drive_config',
        headers: { 'x-admin-key': adminKey, 'x-forwarded-for': '10.10.30.2' }
      },
      envCfgRes
    );
    assert.equal(envCfgRes.state.statusCode, 200);
    assert.equal(envCfgRes.state.body.configured, true);
    assert.equal(envCfgRes.state.body.config.apiKey, 'test-env-only-key');
    assert.equal(envCfgRes.state.body.config.projectId, 'example-proj');
  } finally {
    if (prevKey === undefined) delete process.env.STARKIT_ADMIN_API_KEY;
    else process.env.STARKIT_ADMIN_API_KEY = prevKey;
    if (prevFbKey === undefined) delete process.env.FIREBASE_API_KEY;
    else process.env.FIREBASE_API_KEY = prevFbKey;
    if (prevFbDomain === undefined) delete process.env.FIREBASE_AUTH_DOMAIN;
    else process.env.FIREBASE_AUTH_DOMAIN = prevFbDomain;
    if (prevFbProj === undefined) delete process.env.FIREBASE_PROJECT_ID;
    else process.env.FIREBASE_PROJECT_ID = prevFbProj;
  }
});

test('Express HTTP server blocks /api/*.js source leaks, /public, and sensitive files with 404 while keeping storefront iFrame-compatible', async () => {
  const prevUrl = process.env.SUPABASE_URL;
  const prevSrv = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  try {
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    for (const blockedPath of [
      '/api/admin.js',
      '/api/orders.js',
      '/server.js',
      '/public/index.html',
      '/package.json',
      '/firebase-applet-config.json',
      '/catalog/starkit_products.json'
    ]) {
      const res = await fetch(`${baseUrl}${blockedPath}`);
      assert.equal(res.status, 404, `Expected 404 for ${blockedPath}, got ${res.status}`);
    }

    const homeRes = await fetch(`${baseUrl}/`);
    assert.equal(homeRes.status, 200);
    assert.equal(homeRes.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(homeRes.headers.get('x-frame-options'), null);
    assert.match(homeRes.headers.get('content-security-policy') || '', /default-src 'self'/);

    const adminPageRes = await fetch(`${baseUrl}/admin.html`);
    assert.equal(adminPageRes.status, 200);

    const stateRes = await fetch(`${baseUrl}/api/admin?action=public_storefront_state`);
    assert.equal(stateRes.status, 200);
    const stateJson = await stateRes.json();
    assert.equal(stateJson.products.length, 11);
    assert.equal(stateJson.variants.length, 15);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    if (prevUrl !== undefined) process.env.SUPABASE_URL = prevUrl;
    if (prevSrv !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = prevSrv;
  }
});

test('submit_approval_evidence with approve_tier_price syncs variant price_bdt and price_approved into storefront & orders', async () => {
  resetRuntimeStore();
  const prevKey = process.env.STARKIT_ADMIN_API_KEY;
  const prevUrl = process.env.SUPABASE_URL;
  const prevSrv = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const prevEnabled = process.env.STARKIT_ORDERS_ENABLED;

  const adminKey = 'e'.repeat(40);
  process.env.STARKIT_ADMIN_API_KEY = adminKey;
  process.env.STARKIT_ORDERS_ENABLED = 'true';
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const evidence = {
      artwork_rights_ok: true,
      garment_specs_ok: true,
      sample_photo_ok: true,
      size_run_ok: true,
      stock_count_ok: true,
      pricing_approved_ok: true,
      commercial_terms_ok: true,
      evidence_notes: 'Tier price sign-off verification'
    };

    const res = createMockRes();
    await adminHandler(
      {
        method: 'POST',
        url: '/api/admin?action=submit_approval_evidence',
        headers: { host: 'starkit.bd', 'x-admin-key': adminKey, 'x-forwarded-for': '10.10.40.1' },
        body: { product_id: 'STK-H001', next_status: 'PUBLISHED', approve_tier_price: true, evidence }
      },
      res
    );
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.product.price_approved, true);
    assert.equal(res.state.body.product.approved_price_bdt, 1369);

    const pubRes = createMockRes();
    await adminHandler({ method: 'GET', url: '/api/admin?action=public_storefront_state', headers: {} }, pubRes);
    const blk = pubRes.state.body.variants.find((v) => v.sku === 'STK-H001-BLK');
    const crm = pubRes.state.body.variants.find((v) => v.sku === 'STK-H001-CRM');
    assert.equal(blk.price_bdt, 1369);
    assert.equal(blk.price_approved, true);
    assert.equal(crm.price_bdt, 1369);
    assert.equal(crm.price_approved, true);
  } finally {
    resetRuntimeStore();
    if (prevKey === undefined) delete process.env.STARKIT_ADMIN_API_KEY;
    else process.env.STARKIT_ADMIN_API_KEY = prevKey;
    if (prevUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = prevUrl;
    if (prevSrv === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = prevSrv;
    if (prevEnabled === undefined) delete process.env.STARKIT_ORDERS_ENABLED;
    else process.env.STARKIT_ORDERS_ENABLED = prevEnabled;
  }
});
