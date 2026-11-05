import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createPathaoService, createMemoryTokenStore, normalizeStores, rateInput } from '../functions/_lib/lorapok/pathao/service.js';
import { verifyWebhookSecret, readWebhookBody, canonicalJson, normalizeStatus, INTEGRATION_HEADER, INTEGRATION_VALUE } from '../functions/_lib/lorapok/pathao/webhook.js';
import { createPathaoClient, pathaoConfig } from '../functions/_lib/pathao.js';
import { createSession } from '../functions/_lib/admin-auth.js';
import { onRequestGet as storesRoute } from '../functions/api/admin/pathao/stores.js';
import { onRequestPost as ratesRoute } from '../functions/api/admin/pathao/rates.js';
import { onRequestPost as webhook } from '../functions/api/pathao/webhook.js';

const originalFetch = globalThis.fetch;
beforeEach(() => { globalThis.fetch = async () => { assert.fail('Unexpected network call: all provider calls must be mocked'); }; });
afterEach(() => { globalThis.fetch = originalFetch; });
const credentials = { clientId: 'fake-client', clientSecret: 'fake-secret', username: 'fake-user', password: 'fake-password' };
const config = { scope: { merchant: 'merchant', product: 'bnp' }, environment: 'sandbox', credentials };
const secret = 'test-only-webhook-secret-12345678901234567890';
let sequence = 0;
const makeEnv = () => ({ COMMERCE_BACKEND_MODE: "legacy", ADMIN_EMAIL: 'admin@example.test', ADMIN_PASSWORD: 'test-only-long-password', ADMIN_SESSION_SECRET: 'test-session-secret-12345678901234567890', PATHAO_BACKEND_MODE: 'embedded', PATHAO_ENABLED: 'true', PATHAO_ENVIRONMENT: 'sandbox', PATHAO_MERCHANT_KEY: 'merchant', PATHAO_PRODUCT_KEY: 'bnp', PATHAO_STORE_ID: '12', PATHAO_CLIENT_ID: `fixture-${++sequence}`, PATHAO_CLIENT_SECRET: credentials.clientSecret, PATHAO_USERNAME: credentials.username, PATHAO_PASSWORD: credentials.password, PATHAO_WEBHOOK_ENABLED: 'true', PATHAO_WEBHOOK_SECRET: secret });
const row = (overrides = {}) => ({ store_id: 12, store_name: 'Mock pickup', store_address: 'Mock address', is_active: 1, city_id: 1, zone_id: 2, hub_id: 3, is_default_store: 0, is_default_return_store: 0, ...overrides });
const page = (rows = [row()], overrides = {}) => ({ data: { data: rows, current_page: 1, last_page: 1, per_page: 100, total: rows.length, ...overrides } });
const rate = { store_id: 12, city_id: 1, zone_id: 2, item_weight: 0.5 };
function provider(overrides = {}) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, ...init });
    assert.match(url, /^https:\/\/(courier-api-sandbox|api-hermes)\.pathao\.com\/aladdin\/api\/v1\//);
    assert.equal(init.redirect, 'error');
    if (url.endsWith('/issue-token')) return overrides.token ? overrides.token(url, init) : Response.json({ access_token: 'mock-access', refresh_token: 'mock-refresh', expires_in: 3600 });
    if (url.includes('/stores?page=')) return Response.json(overrides.stores ? overrides.stores(Number(new URL(url).searchParams.get('page'))) : page());
    if (url.endsWith('/city-list')) return Response.json({ data: { data: [{ city_id: 1, city_name: 'Dhaka' }] } });
    if (url.endsWith('/area-list')) return Response.json({ data: { data: [{ area_id: 3, area_name: 'Mock area', home_delivery_available: true, pickup_available: true }] } });
    if (url.endsWith('/zone-list')) return Response.json({ data: { data: [{ zone_id: 2, zone_name: 'Mock zone' }] } });
    if (url.endsWith('/merchant/price-plan')) return Response.json({ data: overrides.quote || { price: 60, discount: 0, promo_discount: 0, additional_charge: 5, final_price: 65, plan_id: 1, password: 'must-not-return', customer: 'must-not-return' } });
    assert.fail(`Unexpected mock provider route ${url}`);
  };
  return { fetcher, calls };
}
const service = (fetcher, options = {}, cfg = config) => createPathaoService(cfg, { fetcher, tokenStore: createMemoryTokenStore(), ...options });
function dbFixture() {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of ['0001_orders.sql', '0002_admin_login_attempts.sql', '0003_pathao_shipments.sql', '0004_pathao_scope_webhooks.sql']) sqlite.exec(readFileSync(new URL(`../migrations/d1/${file}`, import.meta.url), 'utf8'));
  const statements = [];
  const DB = { prepare(sql) { statements.push(sql); const statement = sqlite.prepare(sql); let args = []; const result = { bind(...values) { args = values; return result; }, async run() { return { meta: { changes: Number(statement.run(...args).changes) } }; } }; return result; } };
  return { sqlite, statements, env: { ...makeEnv(), DB } };
}
function eventRequest(body = { event: 'order.delivered', consignment_id: 'MOCK' }, signature = secret, headers = {}) {
  return new Request('https://bnp.shop/api/pathao/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(signature === null ? {} : { 'X-PATHAO-Signature': signature }), ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
}
async function adminRequest(env, method = 'GET', body, suffix = '', origin = 'https://bnp.shop') {
  return new Request(`https://bnp.shop/api/admin/pathao/${method === 'GET' ? 'stores' : 'rates'}${suffix}`, { method, headers: { Cookie: `bnp_admin_session=${await createSession(env)}`, Origin: origin, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}

test('reused service checks expiry for each operation and concurrent callers share refresh', async () => {
  let now = 0; const mock = provider(); const client = service(mock.fetcher, { now: () => now });
  await client.stores(); now = 3600000;
  await Promise.all([client.stores(), client.stores(), client.authenticate()]);
  const grants = mock.calls.filter(c => c.url.endsWith('/issue-token')).map(c => JSON.parse(c.body));
  assert.equal(grants.length, 2); assert.equal(grants[0].grant_type, 'password');
  assert.deepEqual(grants[1], { client_id: credentials.clientId, client_secret: credentials.clientSecret, grant_type: 'refresh_token', refresh_token: 'mock-refresh' });
});
test('merchant, product, environment and credential caches are isolated', async () => {
  const mock = provider(); const tokenStore = createMemoryTokenStore();
  for (const cfg of [config, { ...config, scope: { ...config.scope, merchant: 'other' } }, { ...config, scope: { ...config.scope, product: 'other' } }, { ...config, environment: 'production' }, { ...config, credentials: { ...credentials, password: 'rotated' } }, config]) await service(mock.fetcher, { tokenStore }, cfg).authenticate();
  assert.equal(mock.calls.length, 5);
});
test('returned BNP config and serialized service reveal no credentials or token material', async () => {
  const env = makeEnv(); const mock = provider(); const client = createPathaoClient(env, mock.fetcher); await client.authenticate();
  assert.deepEqual(pathaoConfig(env), { environment: 'sandbox', storeId: 12, scope: config.scope, mode: 'embedded' });
  for (const sensitive of [...Object.values(credentials), env.PATHAO_CLIENT_ID, 'mock-access', 'mock-refresh']) assert.equal(JSON.stringify(client).includes(sensitive), false);
});
test('cache saturation applies backpressure without evicting active locks', async () => {
  const store = createMemoryTokenStore(1); let release; let executions = 0;
  const pending = store.withLock('a', async () => { executions++; await new Promise(resolve => { release = resolve; }); return 'done'; });
  await Promise.resolve(); const same = store.withLock('a', () => { assert.fail('Duplicate grant'); });
  await assert.rejects(store.withLock('b', async () => {}), /busy/); release();
  assert.deepEqual(await Promise.all([pending, same]), ['done', 'done']); assert.equal(executions, 1);
  await store.withLock('a', async () => store.set('a', 1)); await store.withLock('b', async () => store.set('b', 2));
  assert.equal(await store.get('a'), undefined); assert.equal(await store.get('b'), 2);
});
test('failed refresh is latched and never falls back to password on later calls', async () => {
  let now = 0; let grants = 0; const mock = provider({ token: () => ++grants === 1 ? Response.json({ access_token: 'initial', refresh_token: 'refresh', expires_in: 3600 }) : new Response('private upstream error', { status: 401 }) });
  const client = service(mock.fetcher, { now: () => now }); await client.authenticate(); now = 3600000;
  await assert.rejects(client.authenticate(), /not confirmed/); await assert.rejects(client.authenticate(), /operator review/); assert.equal(grants, 2);
});
test('store flags parse numbers and numeric strings without truthy zero; pagination URLs are ignored', async () => {
  const mock = provider({ stores: p => page([row({ store_id: `${11 + p}`, is_active: p === 1 ? '0' : '1', is_default_store: '0', is_default_return_store: '1' })], { current_page: p, last_page: 2, total: 2, next_page_url: 'https://evil.example/steal', path: 'https://evil.example' }) });
  const client = service(mock.fetcher); const first = await client.stores(); assert.equal(first.stores[0].active, false); assert.equal(first.stores[0].is_default_store, false); assert.equal(first.stores[0].is_default_return_store, true);
  assert.equal((await client.validateStore(13)).id, 13); assert.ok(mock.calls.every(c => !c.url.includes('evil')));
});
test('invalid store pagination, repeated page and malformed store IDs fail closed', async () => {
  for (const bad of [page([], { current_page: 0 }), page([], { last_page: 1001 }), page([], { per_page: 0 }), page([row(), row()]), page([row({ store_id: 0 })]), page([row({ city_id: '1x' })]), page([row({ hub_id: Number.MAX_SAFE_INTEGER + 1 })]), page([row({ is_active: 'false' })])]) assert.throws(() => normalizeStores(bad, 1));
  const mock = provider({ stores: () => page([row()], { last_page: 2 }) });
  await assert.rejects(service(mock.fetcher).validateStore(999), /pagination/);
  for (const bad of [0, -1, '1', 1001, NaN]) await assert.rejects(service(mock.fetcher).stores(bad), /page/);
});
test('inactive selected store stops rate lookup before any price request', async () => {
  const mock = provider({ stores: () => page([row({ is_active: 0 })]) });
  await assert.rejects(service(mock.fetcher).rateEstimate(rate), /inactive/); assert.equal(mock.calls.some(c => c.url.endsWith('/merchant/price-plan')), false);
});
test('rate validation rejects injected fields and invalid numeric values before provider access', async () => {
  const mock = provider(); const client = service(mock.fetcher);
  for (const input of [null, [], { ...rate, amount_to_collect: 1 }, { ...rate, recipient_name: 'Injected' }, { ...rate, city_id: '1' }, { ...rate, item_weight: NaN }, { ...rate, item_weight: Infinity }, { ...rate, item_weight: 0.49 }, { ...rate, item_weight: 10.01 }, { ...rate, area_id: 0 }]) { assert.throws(() => rateInput(input)); await assert.rejects(client.rateEstimate(input)); }
  assert.equal(mock.calls.length, 0);
});
test('rate request and response whitelist fields and reject malformed provider money', async () => {
  const mock = provider(); const quote = await service(mock.fetcher).rateEstimate({ ...rate, area_id: 3 });
  assert.deepEqual(quote, { price: 60, discount: 0, promo_discount: 0, additional_charge: 5, final_price: 65, plan_id: 1, currency: 'BDT', amounts_minor:{price:6000,discount:0,promo_discount:0,additional_charge:500,final_price:6500}, amount_to_collect:0,kind:'estimate',invoice_confirmed:false });
  assert.deepEqual(JSON.parse(mock.calls.find(c => c.url.endsWith('/merchant/price-plan')).body), { store_id: 12, item_type: 2, delivery_type: 48, item_weight: 0.5, recipient_city: 1, recipient_zone: 2 });
  const bad = provider({ quote: { ...quote, price: -1 } }); await assert.rejects(service(bad.fetcher).rateEstimate(rate), /estimate response/);
});
test('admin stores and rates require auth; rate writes require same origin', async () => {
  const env = makeEnv(); const request = new Request('https://bnp.shop/api/admin/pathao/stores');
  assert.equal((await storesRoute({ env, request })).status, 401); assert.equal((await ratesRoute({ env, request })).status, 401);
  assert.equal((await ratesRoute({ env, request: await adminRequest(env, 'POST', rate, '', 'https://evil.example') })).status, 403);
});
test('admin store pagination and rate routes return only normalized results', async () => {
  const env = makeEnv(); const mock = provider(); globalThis.fetch = mock.fetcher;
  const response = await storesRoute({ env, request: await adminRequest(env) }); assert.equal(response.status, 200); assert.equal((await response.json()).configured_store_id, 12);
  for (const suffix of ['?page=-1', '?page=1.5', '?page=https://evil.example', '?page=1001']) assert.equal((await storesRoute({ env, request: await adminRequest(env, 'GET', undefined, suffix) })).status, 400);
  const result = await ratesRoute({ env, request: await adminRequest(env, 'POST', rate) }); assert.equal(result.status, 200); assert.equal((await result.json()).quote.currency, 'BDT');
});

test('webhook exact integration challenge returns 202 and public header with no DB/provider work', async () => {
  const env = makeEnv(); env.DB = { prepare() { assert.fail('Handshake must not access DB'); } };
  const response = await webhook({ env, request: eventRequest({ event: 'webhook_integration' }, null) });
  assert.equal(response.status, 202); assert.equal(response.headers.get(INTEGRATION_HEADER), INTEGRATION_VALUE); assert.equal(await response.text(), ''); assert.notEqual(INTEGRATION_VALUE, secret);
  assert.equal((await webhook({ env, request: eventRequest({ event: 'webhook_integration', order_status: 'Delivered' }, null) })).status, 401);
});
test('signature is a shared secret, not a digest or HMAC; unauthorized events never access DB', async () => {
  assert.equal(await verifyWebhookSecret(secret, secret), true);
  for (const value of [null, 'wrong', 'a'.repeat(64), `sha256=${'a'.repeat(64)}`, 'x'.repeat(513)]) assert.equal(await verifyWebhookSecret(value, secret), false);
  assert.equal(await verifyWebhookSecret('short', 'short'), false);
  const env = { ...makeEnv(), DB: { prepare() { assert.fail('Unauthorized event must not access DB'); } } };
  for (const signature of [null, 'wrong', `sha256=${'a'.repeat(64)}`]) assert.equal((await webhook({ env, request: eventRequest(undefined, signature) })).status, 401);
});
test('webhook rejects malformed JSON, wrong type, compression and oversized bodies before DB', async () => {
  const env = { ...makeEnv(), DB: { prepare() { assert.fail('Invalid body must not access DB'); } } };
  for (const [body, headers, status] of [['{', {}, 400], [[], {}, 400], [{}, {}, 400], [{ event: '../bad' }, {}, 400], [{ event: 'ok' }, { 'Content-Type': 'text/plain' }, 415], [{ event: 'ok' }, { 'Content-Encoding': 'gzip' }, 415], [{ event: 'ok' }, { 'Content-Length': '16385' }, 413], [{ event: 'ok', extra: 'x'.repeat(17000) }, {}, 413]]) assert.equal((await webhook({ env, request: eventRequest(body, secret, headers) })).status, status);
});
test('slow streaming body is cancelled at its bounded deadline', async () => {
  let cancelled = false;
  const request = new Request('https://bnp.shop/api/pathao/webhook', { method: 'POST', duplex: 'half', headers: { 'Content-Type': 'application/json' }, body: new ReadableStream({ cancel() { cancelled = true; } }) });
  const start = Date.now(); await assert.rejects(readWebhookBody(request, { timeoutMs: 10 }), /timed out/); assert.equal(cancelled, true); assert.ok(Date.now() - start < 1000);
});
test('canonical authenticated receipts are idempotent under concurrent duplicates and isolated by scope', async () => {
  const { sqlite, statements, env } = dbFixture();
  sqlite.exec(`INSERT INTO orders(id,order_number,customer_name,customer_phone,district,delivery_address,subtotal_bdt,delivery_bdt,total_bdt,payment_status,fulfillment_status)
    VALUES('order','BNP-MOCK','Mock Customer','01712345678','Dhaka','Mock address',100,60,160,'paid','qc');
    INSERT INTO payment_attempts(id,order_id,bridge_reference,bridge_session_id,amount_bdt,status) VALUES('attempt','order','ref','session',160,'paid');
    INSERT INTO payment_events(id,bridge_event_id,attempt_id,event_type,verified_at) VALUES('event','bridge-event','attempt','settled','2026-11-05T00:00:00Z');
    INSERT INTO payment_settlements VALUES('order','attempt','event',160,'BDT','ref','2026-11-05T00:00:00Z');
    INSERT INTO courier_shipments(id,order_id,environment,store_id,state,consignment_id,provider_status,city_id,zone_id,area_id,item_weight,request_hash,requested_by,merchant_key,product_key)
    VALUES('shipment','order','sandbox',12,'created','MOCK','Pending',1,2,3,0.5,'hash','admin','merchant','bnp');`);
  const stateTables = ['orders', 'payment_attempts', 'payment_events', 'payment_settlements', 'courier_shipments'];
  const snapshot = () => stateTables.map(table => sqlite.prepare(`SELECT * FROM ${table}`).all());
  const before = snapshot();
  const first = { event: 'order.delivered', nested: { b: 2, a: 1 }, customer_name: 'not persisted' };
  const equivalent = { customer_name: 'not persisted', nested: { a: 1, b: 2 }, event: 'order.delivered' };
  assert.equal(canonicalJson(first), canonicalJson(equivalent));
  const results = await Promise.all([first, equivalent, first].map(body => webhook({ env, request: eventRequest(body) })));
  assert.deepEqual(results.map(r => r.status), [503, 503, 503]);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM pathao_webhook_receipts').get().n, 1);
  for (const override of [{ PATHAO_MERCHANT_KEY: 'other' }, { PATHAO_PRODUCT_KEY: 'other' }, { PATHAO_ENVIRONMENT: 'production' }]) assert.equal((await webhook({ env: { ...env, ...override }, request: eventRequest(first) })).status, 503);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM pathao_webhook_receipts').get().n, 4);
  assert.deepEqual(snapshot(), before, 'receipt must not change payment, fulfillment, ownership or provider state');
  assert.ok(statements.every(sql => /^INSERT INTO pathao_webhook_receipts/.test(sql)));
  assert.equal(JSON.stringify(sqlite.prepare('SELECT * FROM pathao_webhook_receipts').all()).includes('not persisted'), false);
  assert.deepEqual(sqlite.prepare('PRAGMA table_info(pathao_webhook_receipts)').all().map(c => c.name), ['merchant_key', 'product_key', 'environment', 'payload_sha256', 'event_name', 'received_at']);
  sqlite.close();
});
test('receipt migration constrains digest and environment and leaves historical scope nullable', () => {
  const { sqlite } = dbFixture();
  const fields = sqlite.prepare('PRAGMA table_info(courier_shipments)').all();
  for (const name of ['merchant_key', 'product_key']) { const field = fields.find(c => c.name === name); assert.equal(field.notnull, 0); assert.equal(field.dflt_value, null); }
  const insert = sqlite.prepare('INSERT INTO pathao_webhook_receipts(merchant_key,product_key,environment,payload_sha256,event_name) VALUES(?,?,?,?,?)');
  assert.throws(() => insert.run('m', 'p', 'evil', 'a'.repeat(64), 'event')); assert.throws(() => insert.run('m', 'p', 'sandbox', 'short', 'event')); sqlite.close();
});
test('authenticated receipt failure returns 503 without acknowledging or leaking DB details', async () => {
  for (const DB of [undefined, { prepare() { throw Error('private database error'); } }, { prepare() { return { bind() { return this; }, async run() { throw Error('private database error'); } }; } }]) {
    const response = await webhook({ env: { ...makeEnv(), DB }, request: eventRequest() }); assert.equal(response.status, 503); assert.equal((await response.text()).includes('private database'), false);
  }
});
test('hanging receipt write returns 503 at the eight-second route deadline', async () => {
  const env = { ...makeEnv(), DB: { prepare() { return { bind() { return this; }, run() { return new Promise(() => {}); } }; } } };
  const start = Date.now(); const response = await webhook({ env, request: eventRequest() }); assert.equal(response.status, 503); assert.ok(Date.now() - start >= 7900); assert.ok(Date.now() - start < 11000);
});
test('status normalization is conservative and does not execute any state changes', () => {
  assert.equal(normalizeStatus('Assigned_for_delivery'), 'out_for_delivery'); assert.equal(normalizeStatus('DELIVERED'), 'delivered'); assert.equal(normalizeStatus('unrecognized provider state'), 'unknown'); assert.equal(normalizeStatus(null), 'unknown');
});

test('provider quote preserves exact slab-edge weights and provider final price without a local formula', async () => {
  const quoted = { price: 100.29, discount: 15, promo_discount: 3, additional_charge: 2.1, final_price: 84.39, plan_id: 7, cod_enabled: true, cod_percentage: 0.01 };
  const mock = provider({ quote: quoted }), client = service(mock.fetcher);
  for (const weight of [0.5, 0.500001, 0.999999, 1, 1.000001, 1.5, 1.999999, 2, 2.000001, 9.999999, 10]) {
    const result = await client.rateEstimate({ ...rate, item_weight: weight });
    assert.equal(result.final_price, quoted.final_price);
    assert.equal(result.amounts_minor.final_price, 8439);
    assert.equal(result.invoice_confirmed, false);
    assert.equal(JSON.parse(mock.calls.at(-1).body).item_weight, weight);
    assert.equal('amount_to_collect' in JSON.parse(mock.calls.at(-1).body), false);
  }
  for (const weight of [0, -0.5, 0.499999, 10.000001]) await assert.rejects(client.rateEstimate({ ...rate, item_weight: weight }));
  await assert.rejects(client.rateEstimate({ ...rate, area_id: 999 }), /area/);
});
