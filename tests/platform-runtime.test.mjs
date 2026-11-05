import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import worker from '../services/lorapok-api/src/worker.js';
import { createCommerceClient } from '../services/lorapok-api/src/client.js';
import { sha256 } from '../services/lorapok-api/src/registry.js';
import { createSession } from '../functions/_lib/admin-auth.js';
import { onRequestGet, onRequestPost, onRequestPatch } from '../functions/api/admin/orders/[id]/shipment.js';

const networkFetch = globalThis.fetch;
beforeEach(() => { globalThis.fetch = async () => assert.fail('External network is forbidden'); });
afterEach(() => { globalThis.fetch = networkFetch; });
const tokens = { admin: 'a'.repeat(48), storefront: 's'.repeat(48), courier: 'c'.repeat(48) };
const scope = { merchant: 'synthetic', product: 'bnp' };
const key = Buffer.alloc(32, 37).toString('base64');
function migrate(sql, service) {
  const directory = new URL(`../services/${service}/migrations/`, import.meta.url);
  for (const name of readdirSync(directory).filter(n => n.endsWith('.sql')).sort()) sql.exec(readFileSync(new URL(name, directory), 'utf8'));
}
function binding(sql) {
  return { batch(statements) {
    sql.exec("BEGIN IMMEDIATE");
    try { const result = statements.map(s => s.run()); sql.exec("COMMIT"); return result; }
    catch (error) { sql.exec("ROLLBACK"); throw error; }
  }, prepare(query) { let values = []; return {
    bind(...args) { values = args; return this; },
    first() { return sql.prepare(query).get(...values) || null; },
    all() { return { results: sql.prepare(query).all(...values) }; },
    run() { return { meta: { changes: Number(sql.prepare(query).run(...values).changes) } }; },
  }; } };
}
async function seedRegistries(platform, courier) {
  platform.prepare('INSERT INTO platform_registrations VALUES(?,?,?,1)').run(scope.merchant, scope.product, 'sandbox');
  for (const [role, permissions] of [
    ['admin', ['catalog:read', 'catalog:write', 'orders:read', 'orders:update']],
    ['storefront', ['catalog:read', 'orders:create']],
  ]) platform.prepare('INSERT INTO platform_api_clients VALUES(?,?,?,?,?,1)').run(await sha256(tokens[role]), scope.merchant, scope.product, 'sandbox', JSON.stringify(permissions));
  // The disabled provider needs no real credentials or decryptable provider config.
  courier.prepare('INSERT INTO courier_merchants VALUES(?,?,?,?,1)').run(scope.merchant, scope.product, 'sandbox', '{}');
  courier.prepare('INSERT INTO courier_api_clients VALUES(?,?,?,?,?,NULL,1)').run(await sha256(tokens.courier), scope.merchant, scope.product, 'sandbox', '["courier:read"]');
}
async function fixture(t) {
  const platform = new DatabaseSync(':memory:'), courier = new DatabaseSync(':memory:');
  t.after(() => { platform.close(); courier.close(); });
  migrate(platform, 'lorapok-api'); migrate(courier, 'pathao-api');
  await seedRegistries(platform, courier);
  const env = { PLATFORM_DB: binding(platform), COURIER_DB: binding(courier), PLATFORM_ORDER_INTAKE_ENABLED: 'true',
    COURIER_ENCRYPTION_KEY: key, COURIER_KEY_VERSION: 'synthetic', COURIER_ENABLED: 'false' };
  const calls = [];
  const fetcher = async (url, options) => { const request = new Request(url, options); calls.push({ path: new URL(url).pathname, method: request.method }); return worker.fetch(request, env); };
  const client = (role = 'admin', changes = {}) => createCommerceClient({ baseUrl: 'https://platform.test', apiToken: tokens[role], scope, environment: 'sandbox', ...changes }, { fetcher });
  const call = (path, token = tokens.admin, method = 'GET', body) => fetcher('https://platform.test' + path, { method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  async function order() {
    await client().saveProduct('plate', { expected_version: 0, title: 'Synthetic plate', unit_price_minor: 38000, currency: 'BDT', active: true, kind: 'plate', metadata: { model: 'A' } });
    await client().saveShipping('city', { expected_version: 0, label: 'Synthetic delivery', price_minor: 6000, active: true });
    return (await client('storefront').createOrder({ request_id: crypto.randomUUID(), customer: { name: 'Synthetic Person', phone: '01700000000', address: 'Synthetic test address', district: 'Dhaka' },
      items: [{ sku: 'plate', quantity: 1, customization: {} }], shipping_code: 'city', expected_catalog_versions: { plate: 1 }, expected_shipping_version: 1 })).order;
  }
  return { platform, courier, env, client, call, calls, fetcher, order };
}

test('parent health and capabilities report payment deferral; unconfigured commerce fails closed', async t => {
  const response = await worker.fetch(new Request('https://platform.test/health'), {});
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  const health = await response.json();
  assert.equal(health.service, 'platform-api'); assert.equal(health.brand, 'Lorapok Labs');
  assert.equal(health.payment_gateway, 'deferred'); assert.equal(health.commerce, 'unconfigured');
  for (const path of ['/v1/context', '/v1/catalog', '/v1/orders']) {
    const result = await worker.fetch(new Request('https://platform.test' + path), {});
    assert.equal(result.status, 503); assert.equal((await result.json()).error.code, 'service_unavailable');
  }
  const f = await fixture(t);
  assert.deepEqual((await f.client().capabilities()).capabilities, { order_intake: true, payment_capture: false, paid_dispatch: false });
  for (const path of ['/v1/payments', '/v1/dispatch']) assert.equal((await f.call(path, tokens.admin, 'POST', {})).status, 503);
});

test('SDK authenticates scope before mutation, rejects invalid origins and does not retry writes', async t => {
  const f = await fixture(t);
  for (const changes of [{ scope: { ...scope, merchant: 'other' } }, { scope: { ...scope, product: 'other' } }, { environment: 'production' }, { apiToken: 'z'.repeat(48) }]) {
    f.calls.length = 0;
    await assert.rejects(f.client('storefront', changes).createOrder({}), error => [401, 503].includes(error.status));
    assert.deepEqual(f.calls, [{ path: '/v1/context', method: 'GET' }]);
  }
  for (const baseUrl of ['http://platform.test', 'https://platform.test/courier', 'https://user:pass@platform.test', 'https://platform.test/?x=1']) assert.throws(() => f.client('admin', { baseUrl }));
  const calls = [];
  const client = createCommerceClient({ baseUrl: 'https://platform.test', apiToken: tokens.storefront, scope, environment: 'sandbox' }, { fetcher: async (url, options) => {
    calls.push(options.method);
    if (url.endsWith('/v1/context')) return Response.json({ scope, environment: 'sandbox' });
    throw Error('Synthetic uncertain transport outcome');
  } });
  await assert.rejects(client.createOrder({ request_id: crypto.randomUUID() }), /Retain the request ID/);
  assert.deepEqual(calls, ['GET', 'POST']);
  assert.equal(f.platform.prepare('SELECT count(*) n FROM commerce_orders').get().n, 0);
});

test('parent and mounted courier credentials are independent and storefront cannot administer commerce', async t => {
  const f = await fixture(t);
  assert.equal((await f.call('/v1/context', tokens.storefront)).status, 200);
  for (const path of ['/v1/admin/orders', '/v1/admin/catalog']) assert.equal((await f.call(path, tokens.storefront)).status, 403);
  assert.equal((await f.call('/v1/admin/catalog/products/forbidden', tokens.storefront, 'PUT', {})).status, 403);
  assert.equal((await f.call('/v1/context', tokens.courier)).status, 401);
  assert.equal((await f.call('/courier/v1/context', tokens.admin)).status, 401);
  assert.equal((await f.call('/courier/v1/context', tokens.storefront)).status, 401);
  const courier = await f.call('/courier/v1/context', tokens.courier);
  assert.equal(courier.status, 200); assert.deepEqual(await courier.json(), { scope, environment: 'sandbox' });
  for (const path of ['/courierx/v1/context', '/other/courier/v1/context', '/courier/courier/v1/context']) assert.notEqual((await f.call(path, tokens.courier)).status, 200);
  assert.equal((await f.call('/courier/v1/stores', tokens.courier)).status, 503);
  assert.equal(f.courier.prepare('SELECT count(*) n FROM courier_operations').get().n, 0);
});

test('default parent shipment BFF reads central order and blocks POST/PATCH despite legacy paid flags', async t => {
  const f = await fixture(t), central = await f.order();
  let legacyReads = 0;
  const env = { ...f.env, PLATFORM_API_BINDING: { fetch: f.fetcher }, PLATFORM_ADMIN_API_TOKEN: tokens.admin,
    PLATFORM_MERCHANT_KEY: scope.merchant, PLATFORM_PRODUCT_KEY: scope.product, PLATFORM_ENVIRONMENT: 'sandbox',
    ADMIN_EMAIL: 'admin@example.test', ADMIN_PASSWORD: 'synthetic-password-long-enough', ADMIN_SESSION_SECRET: 'synthetic-session-secret-'.repeat(3),
    PATHAO_DISPATCH_ENABLED: 'true', COURIER_DISPATCH_ENABLED: 'true',
    DB: { prepare() { legacyReads++; return { bind() { return this; }, first() { return { id: central.id, eligible: 1, payment_status: 'paid', status: 'qc' }; } }; } } };
  const cookie = 'bnp_admin_session=' + await createSession(env);
  const context = (method, id = central.id, auth = true) => ({ env, params: { id }, request: new Request(`https://bnp.test/api/admin/orders/${id}/shipment`, {
    method, headers: { Origin: 'https://bnp.test', ...(auth ? { Cookie: cookie } : {}) },
  }) });
  f.calls.length = 0;
  const response = await onRequestGet(context('GET'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { shipment: null, eligible: false, enabled: false, reason: 'payment_gateway_deferred' });
  assert.deepEqual(f.calls.map(c => c.path), ['/v1/context', '/v1/admin/orders/' + central.id]);
  assert.equal((await onRequestGet(context('GET', crypto.randomUUID()))).status, 404);
  for (const [method, handler] of [['POST', onRequestPost], ['PATCH', onRequestPatch]]) {
    f.calls.length = 0;
    const result = await handler(context(method));
    assert.equal(result.status, 503); assert.equal((await result.json()).code, 'payment_gateway_deferred');
    assert.deepEqual(f.calls, []);
    assert.equal((await handler(context(method, central.id, false))).status, 401);
  }
  assert.equal(legacyReads, 0);
  assert.equal(f.courier.prepare('SELECT count(*) n FROM courier_operations').get().n, 0);
});

test('actual Node parent host serves SDK requests and mounted courier using separate migrated SQLite files', { timeout: 15000 }, async t => {
  const directory = mkdtempSync(join(tmpdir(), 'platform-node-test-'));
  const platformPath = join(directory, 'platform.sqlite'), courierPath = join(directory, 'courier.sqlite');
  const platform = new DatabaseSync(platformPath), courier = new DatabaseSync(courierPath);
  migrate(platform, 'lorapok-api'); migrate(courier, 'pathao-api'); await seedRegistries(platform, courier);
  platform.close(); courier.close();
  const child = spawn(process.execPath, ['services/lorapok-api/src/server.js'], { cwd: new URL('../', import.meta.url), stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH, HOST: '127.0.0.1', PORT: '0', PLATFORM_DATABASE_PATH: platformPath, COURIER_DATABASE_PATH: courierPath,
      PLATFORM_ORDER_INTAKE_ENABLED: 'true', COURIER_ENCRYPTION_KEY: key, COURIER_KEY_VERSION: 'synthetic', COURIER_ENABLED: 'false' } });
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) { const exited = new Promise(resolve => child.once('exit', resolve)); child.kill(); await exited; } rmSync(directory, { recursive: true, force: true }); });
  let stderr = ''; child.stderr.on('data', chunk => { stderr += chunk; });
  const port = await new Promise((resolve, reject) => {
    let stdout = '';
    const timer = setTimeout(() => reject(Error('Parent Node host did not start: ' + stderr)), 5000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(Error(`Parent host exited ${code}: ${stderr}`)); });
    child.stdout.on('data', chunk => { stdout += chunk; const match = stdout.match(/listening on 127\.0\.0\.1:(\d+)/); if (match) { clearTimeout(timer); resolve(Number(match[1])); } });
  });
  // The production SDK still requires HTTPS; only this injected transport maps it
  // to a private ephemeral loopback listener. No provider or public host is called.
  const fetcher = (url, options) => { const parsed = new URL(url); assert.equal(parsed.origin, 'https://platform.test'); return networkFetch(`http://127.0.0.1:${port}${parsed.pathname}${parsed.search}`, options); };
  const health = await (await fetcher('https://platform.test/health')).json();
  assert.equal(health.payment_gateway, 'deferred'); assert.equal(health.commerce, 'configured'); assert.equal(health.courier, 'configured');
  const client = createCommerceClient({ baseUrl: 'https://platform.test', apiToken: tokens.admin, scope, environment: 'sandbox' }, { fetcher });
  assert.deepEqual((await client.catalog()).products, []);
  assert.equal((await client.capabilities()).capabilities.paid_dispatch, false);
  const call = (path, token) => fetcher('https://platform.test' + path, { headers: { Authorization: 'Bearer ' + token } });
  assert.equal((await call('/courier/v1/context', tokens.courier)).status, 200);
  assert.equal((await call('/courier/v1/context', tokens.admin)).status, 401);
  assert.equal((await call('/v1/context', tokens.courier)).status, 401);
});

test('Node parent host rejects sharing its database with courier', { timeout: 10000 }, async t => {
  const directory = mkdtempSync(join(tmpdir(), 'platform-isolation-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const databasePath = join(directory, 'platform.sqlite'), sql = new DatabaseSync(databasePath);
  migrate(sql, 'lorapok-api'); sql.close();
  const child = spawn(process.execPath, ['services/lorapok-api/src/server.js'], { cwd: new URL('../', import.meta.url), stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH, HOST: '127.0.0.1', PORT: '0', PLATFORM_DATABASE_PATH: databasePath, COURIER_DATABASE_PATH: databasePath } });
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) { const exited = new Promise(resolve => child.once('exit', resolve)); child.kill(); await exited; } });
  let output = ''; child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { output += chunk; });
  const code = await new Promise((resolve, reject) => { child.once('exit', resolve); child.once('error', reject); });
  assert.notEqual(code, 0); assert.match(output, /must be separate/); assert.doesNotMatch(output, /listening on/);
});
