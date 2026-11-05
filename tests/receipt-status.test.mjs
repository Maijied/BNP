import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createCommerceApi, RECEIPT_LIFETIME_MS } from '../services/lorapok-api/src/commerce.js';
import { createCommerceRegistry, sha256 } from '../services/lorapok-api/src/registry.js';
import { consumeReceiptAttempt } from '../functions/_lib/receipt-status.js';
import { onRequestPost as bnpStatus } from '../functions/api/order/status.js';
import { onRequestPost as vespaStatus } from '../functions/api/vespa/order/status.js';

function binding(sql) {
  return { prepare(query) { let values = []; return {
    bind(...args) { values = args; return this; },
    first() { return sql.prepare(query).get(...values) || null; },
    all() { return { results: sql.prepare(query).all(...values) }; },
    run() { return { meta: { changes: Number(sql.prepare(query).run(...values).changes) } }; },
  }; } };
}
async function fixture(t) {
  const sql = new DatabaseSync(':memory:'), limiter = new DatabaseSync(':memory:');
  t.after(() => { sql.close(); limiter.close(); });
  sql.exec(readFileSync(new URL('../services/lorapok-api/migrations/0001_commerce.sql', import.meta.url), 'utf8'));
  limiter.exec(readFileSync(new URL('../migrations/d1/0006_receipt_status_attempts.sql', import.meta.url), 'utf8'));
  const scopes = [['merchant', 'bnp', 'sandbox'], ['merchant', 'vespa-demo', 'sandbox'], ['other', 'bnp', 'sandbox'], ['merchant', 'bnp', 'production']];
  const tokens = scopes.map((_, index) => String(index).repeat(48));
  const permissions = ['catalog:read', 'catalog:write', 'orders:create', 'orders:read', 'orders:update'];
  for (let index = 0; index < scopes.length; index++) {
    sql.prepare('INSERT INTO platform_registrations VALUES(?,?,?,1)').run(...scopes[index]);
    sql.prepare('INSERT INTO platform_api_clients VALUES(?,?,?,?,?,1)').run(await sha256(tokens[index]), ...scopes[index], JSON.stringify(permissions));
  }
  let time = Date.now(); let intake = true;
  const db = binding(sql);
  const api = request => createCommerceApi({ db, registry: createCommerceRegistry({ db }), flags: { orderIntake: intake }, now: () => time })(request);
  const call = (path, { token = tokens[0], method = 'POST', body } = {}) => api(new Request('https://platform.test' + path, { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }));
  const calls = [];
  const service = { fetch(url, options) { calls.push(new URL(url).pathname); return api(new Request(url, options)); } };
  const env = { DB: binding(limiter), ADMIN_SESSION_SECRET: 'synthetic-receipt-secret-'.repeat(3),
    PLATFORM_API_BINDING: service, PLATFORM_MERCHANT_KEY: 'merchant', PLATFORM_PRODUCT_KEY: 'bnp', PLATFORM_ENVIRONMENT: 'sandbox', PLATFORM_STOREFRONT_API_TOKEN: tokens[0],
    VESPA_PLATFORM_API_BINDING: service, VESPA_PLATFORM_MERCHANT_KEY: 'merchant', VESPA_PLATFORM_PRODUCT_KEY: 'vespa-demo', VESPA_PLATFORM_ENVIRONMENT: 'sandbox', VESPA_PLATFORM_STOREFRONT_API_TOKEN: tokens[1] };
  const ctx = (body, changes = {}, shop = 'bnp') => ({ env, request: new Request('https://shop.test/api/' + (shop === 'vespa' ? 'vespa/' : '') + 'order/status', {
    method: 'POST', headers: { Origin: 'https://shop.test', 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.10', ...changes }, body: JSON.stringify(body),
  }) });
  const customer = { name: 'Synthetic Private Name', phone: '01700000000', address: 'Synthetic private address', district: 'Dhaka' };
  async function create(index = 0) {
    const token = tokens[index];
    for (const [path, body] of [
      ['/v1/admin/catalog/products/plate', { expected_version: 0, title: 'Synthetic product', unit_price_minor: 38000, currency: 'BDT', active: true, kind: 'plate', metadata: {} }],
      ['/v1/admin/catalog/shipping/demo', { expected_version: 0, label: 'Synthetic delivery', price_minor: 6000, active: true }],
    ]) assert.equal((await call(path, { token, method: 'PUT', body })).status, 201);
    const body = { request_id: crypto.randomUUID(), customer, items: [{ sku: 'plate', quantity: 1, customization: {} }], shipping_code: 'demo', expected_catalog_versions: { plate: 1 }, expected_shipping_version: 1 };
    const response = await call('/v1/orders', { token, body }); assert.equal(response.status, 201);
    const order = (await response.json()).order;
    return { order, proof: { order_number: order.order_number, request_id: body.request_id } };
  }
  return { sql, limiter, env, calls, ctx, call, create, tokens, customer, setTime: value => { time = value; }, disableIntake: () => { intake = false; } };
}

test('receipt status returns only minimal persisted state, works after intake closes, and follows admin verification/cancellation', async t => {
  const f = await fixture(t), { order, proof } = await f.create();
  f.disableIntake();
  const result = await bnpStatus(f.ctx(proof)); assert.equal(result.status, 200); assert.equal(result.headers.get('cache-control'), 'no-store');
  const data = await result.json();
  assert.deepEqual(Object.keys(data.receipt).sort(), ['order_number', 'status', 'payment_status', 'currency', 'total_minor', 'created_at', 'updated_at'].sort());
  assert.equal(data.receipt.total_minor, 44000); assert.equal(data.receipt.status, 'new');
  assert.deepEqual(data.capabilities, { payment_capture: false, paid_dispatch: false });
  for (const value of [...Object.values(f.customer), proof.request_id, order.id]) assert.equal(JSON.stringify(data).includes('"' + value + '"'), false);
  for (const [status, expected_version] of [['verification', 1], ['cancelled', 2]]) {
    assert.equal((await f.call('/v1/admin/orders/' + order.id, { method: 'PATCH', body: { status, expected_version } })).status, 200);
    assert.equal((await (await bnpStatus(f.ctx(proof))).json()).receipt.status, status);
  }
  assert.equal(f.sql.prepare('SELECT count(*) n FROM commerce_orders').get().n, 1);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM commerce_order_audit').get().n, 3);
});

test('both private proof parts, tenant, application and environment are required; failures reveal no existence', async t => {
  const f = await fixture(t), { proof } = await f.create();
  const failures = [];
  for (const body of [{ ...proof, request_id: crypto.randomUUID() }, { ...proof, order_number: 'LL-' + crypto.randomUUID() }]) {
    const response = await f.call('/v1/order-status', { body }); assert.equal(response.status, 404); failures.push(await response.json());
  }
  for (const token of f.tokens.slice(1)) {
    const response = await f.call('/v1/order-status', { token, body: proof }); assert.equal(response.status, 404); failures.push(await response.json());
  }
  assert.ok(failures.every(value => JSON.stringify(value) === JSON.stringify(failures[0])));
  assert.equal((await vespaStatus(f.ctx(proof, {}, 'vespa'))).status, 404);
  const own = await f.create(1); assert.equal((await vespaStatus(f.ctx(own.proof, {}, 'vespa'))).status, 200);
  assert.equal((await bnpStatus(f.ctx(own.proof))).status, 404);
  for (const body of [{ order_number: proof.order_number }, { ...proof, merchant_key: 'merchant' }, { ...proof, request_id: 'guess' }]) assert.equal((await f.call('/v1/order-status', { body })).status, 400);
  assert.equal((await f.call('/v1/order-status?request_id=' + proof.request_id, { body: proof })).status, 400);
});

test('receipt proofs expire after thirty days and disabled API registrations stay disabled', async t => {
  const f = await fixture(t), { proof, order } = await f.create();
  f.setTime(order.created_at + RECEIPT_LIFETIME_MS - 1);
  assert.equal((await f.call('/v1/order-status', { body: proof })).status, 200);
  f.setTime(order.created_at + RECEIPT_LIFETIME_MS);
  assert.equal((await f.call('/v1/order-status', { body: proof })).status, 404);
  f.setTime(order.created_at);
  f.sql.exec('UPDATE platform_registrations SET enabled=0');
  assert.equal((await bnpStatus(f.ctx(proof))).status, 503);
});

test('durable throttle is atomic under concurrent attempts, scoped per shop, and persists only keyed digests', async t => {
  const f = await fixture(t), request = f.ctx({}).request, time = 1800000;
  const outcomes = await Promise.allSettled(Array.from({ length: 35 }, () => consumeReceiptAttempt(request, f.env, 'bnp', time)));
  assert.equal(outcomes.filter(value => value.status === 'fulfilled').length, 20);
  assert.ok(outcomes.filter(value => value.status === 'rejected').every(value => value.reason.status === 429));
  const rows = f.limiter.prepare('SELECT * FROM receipt_status_attempts').all();
  assert.equal(rows.length, 1); assert.equal(rows[0].attempts, 21); assert.match(rows[0].fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(rows).includes('192.0.2.10'), false);
  await consumeReceiptAttempt(request, f.env, 'vespa', time);
  await consumeReceiptAttempt(request, f.env, 'bnp', time + 900000);
  assert.equal(f.limiter.prepare('SELECT max(attempts) n FROM receipt_status_attempts').get().n, 1);
});

test('public route fails closed before API calls when throttle/IP/secret/origin is unavailable and returns 429 when exhausted', async t => {
  const f = await fixture(t), { proof } = await f.create();
  for (const [name, value] of [['DB', undefined], ['ADMIN_SESSION_SECRET', 'short']]) {
    const previous = f.env[name]; f.env[name] = value;
    assert.equal((await bnpStatus(f.ctx(proof))).status, 503); f.env[name] = previous;
  }
  assert.equal((await bnpStatus(f.ctx(proof, { 'CF-Connecting-IP': '' }))).status, 503);
  assert.equal((await bnpStatus(f.ctx(proof, { Origin: 'https://other.test' }))).status, 403);
  f.limiter.exec('DROP TABLE receipt_status_attempts');
  assert.equal((await bnpStatus(f.ctx(proof))).status, 503); assert.deepEqual(f.calls, []);
  f.limiter.exec(readFileSync(new URL('../migrations/d1/0006_receipt_status_attempts.sql', import.meta.url), 'utf8'));
  for (let count = 0; count < 20; count++) assert.equal((await bnpStatus(f.ctx(proof))).status, 200);
  f.calls.length = 0;
  assert.equal((await bnpStatus(f.ctx(proof))).status, 429); assert.deepEqual(f.calls, []);
});
