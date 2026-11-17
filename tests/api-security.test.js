import test from 'node:test';
import assert from 'node:assert/strict';

import orderHandler from '../api/orders.js';
import adminHandler from '../api/admin.js';

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

test('Orders API blocks PROVISIONAL / unapproved SKUs with 409 even if ordering is enabled', async () => {
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
