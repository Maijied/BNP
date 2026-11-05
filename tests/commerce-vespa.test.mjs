import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createCommerceApi } from '../services/lorapok-api/src/commerce.js';
import { createCommerceRegistry, sha256 } from '../services/lorapok-api/src/registry.js';
import { onRequestGet as bnpCatalog } from '../functions/api/catalog.js';
import { onRequestPost as bnpIntake } from '../functions/api/order.js';
import { onRequestGet as vintageCatalog } from '../functions/api/vespa/catalog.js';
import { onRequestPost as vintageIntake } from '../functions/api/vespa/order.js';
import { vintageDemoProducts, vintageDemoShipping } from '../scripts/fixtures/vintage-shop.mjs';
const schema = 'decorative-display-text/v1';
async function fixture(t) {
  const sql = new DatabaseSync(':memory:'); t.after(() => sql.close());
  sql.exec(readFileSync(new URL('../services/lorapok-api/migrations/0001_commerce.sql', import.meta.url), 'utf8'));
  const db = { prepare(q) { const statement = sql.prepare(q); let values = []; return { bind(...v) { values = v; return this; }, async first() { return statement.get(...values) || null; }, async all() { return { results: statement.all(...values) }; }, async run() { return { meta: { changes: Number(statement.run(...values).changes) } }; } }; } };
  const tokens = { bnp: 'b'.repeat(48), bnpAdmin: 'a'.repeat(48), vintage: 'v'.repeat(48), vintageAdmin: 'x'.repeat(48) };
  for (const [product, entries] of [['bnp', [[tokens.bnp, false], [tokens.bnpAdmin, true]]], ['vintage-demo', [[tokens.vintage, false], [tokens.vintageAdmin, true]]]]) {
    sql.prepare('INSERT INTO platform_registrations VALUES(?,?,?,1)').run('synthetic-merchant', product, 'sandbox');
    for (const [token, admin] of entries) sql.prepare('INSERT INTO platform_api_clients VALUES(?,?,?,?,?,1)').run(await sha256(token), 'synthetic-merchant', product, 'sandbox', JSON.stringify(admin ? ['catalog:read', 'catalog:write', 'orders:read', 'orders:update'] : ['catalog:read', 'orders:create']));
  }
  const core = createCommerceApi({ db, registry: createCommerceRegistry({ db }), flags: { orderIntake: true } });
  const call = (path, { token = tokens.vintageAdmin, method = 'GET', body } = {}) => core(new Request('https://platform.internal' + path, { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }));
  for (const { sku, ...product } of vintageDemoProducts) assert.equal((await call('/v1/admin/catalog/products/' + sku, { method: 'PUT', body: { expected_version: 0, ...product } })).status, 201);
  const { code, ...shipping } = vintageDemoShipping;
  assert.equal((await call('/v1/admin/catalog/shipping/' + code, { method: 'PUT', body: { expected_version: 0, ...shipping } })).status, 201);
  const bnpProduct = { expected_version: 0, title: 'DEMO BNP plate', unit_price_minor: 38000, currency: 'BDT', active: true, kind: 'plate', metadata: { model: 'A' } };
  assert.equal((await call('/v1/admin/catalog/products/plate-a', { token: tokens.bnpAdmin, method: 'PUT', body: bnpProduct })).status, 201);
  assert.equal((await call('/v1/admin/catalog/shipping/demo', { token: tokens.bnpAdmin, method: 'PUT', body: { expected_version: 0, ...shipping } })).status, 201);
  const calls = [];
  const binding = { async fetch(url, options) { calls.push({ url, options }); assert.equal(options.headers.Origin, undefined); assert.equal(options.headers.Cookie, undefined); return core(new Request(url, options)); } };
  const env = {
    PLATFORM_API_BINDING: binding, PLATFORM_STOREFRONT_API_TOKEN: tokens.bnp, PLATFORM_ADMIN_API_TOKEN: tokens.bnpAdmin, PLATFORM_MERCHANT_KEY: 'synthetic-merchant', PLATFORM_PRODUCT_KEY: 'bnp', PLATFORM_ENVIRONMENT: 'sandbox',
    VESPA_PLATFORM_API_BINDING: binding, VESPA_PLATFORM_STOREFRONT_API_TOKEN: tokens.vintage, VESPA_PLATFORM_MERCHANT_KEY: 'synthetic-merchant', VESPA_PLATFORM_PRODUCT_KEY: 'vintage-demo', VESPA_PLATFORM_ENVIRONMENT: 'sandbox',
    DB: { prepare() { assert.fail('Legacy commerce fallback forbidden'); } },
  };
  const context = (path, { method = 'GET', body, origin = 'https://shops.test', extraHeaders = {} } = {}) => ({ env, request: new Request('https://shops.test' + path, { method, headers: { ...(origin ? { Origin: origin } : {}), 'Content-Type': 'application/json', Cookie: 'private-browser-cookie', ...extraHeaders }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }) });
  const input = () => ({ request_id: crypto.randomUUID(), customer: { name: 'Synthetic Test Customer', phone: '01700000000', address: 'Synthetic address, no real delivery', district: 'Dhaka' }, items: [{ sku: 'cream-enamel', quantity: 2, customization: { schema, display_text: 'DEMO RIDER' } }], shipping_code: 'demo', expected_catalog_versions: { 'cream-enamel': 1 }, expected_shipping_version: 1 });
  const create = body => vintageIntake(context('/api/vespa/order', { method: 'POST', body }));
  return { sql, call, calls, env, tokens, context, input, create, bnpProduct };
}

test('fixed shop adapters isolate catalogs and use separate least-privilege tokens', async t => {
  const f = await fixture(t);
  const bnp = await (await bnpCatalog(f.context('/api/catalog'))).json();
  assert.deepEqual(bnp.products.map(p => p.sku), ['plate-a']);
  assert.ok(f.calls.every(c => c.options.headers.Authorization === 'Bearer ' + f.tokens.bnp));
  f.calls.length = 0;
  const response = await vintageCatalog(f.context('/api/vespa/catalog?product_key=bnp&merchant=other', { extraHeaders: { 'X-Merchant-Key': 'other' } }));
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  const vintage = await response.json();
  assert.deepEqual(vintage.products.map(p => p.sku).sort(), vintageDemoProducts.map(p => p.sku).sort());
  assert.ok(vintage.products.every(p => p.title.startsWith('DEMO ') && p.metadata.demo === true && p.metadata.pricing_status === 'sample' && p.metadata.fit_status === 'unconfirmed'));
  assert.deepEqual(vintage.capabilities, { order_intake: true, payment_capture: false, paid_dispatch: false });
  assert.ok(f.calls.every(c => c.options.headers.Authorization === 'Bearer ' + f.tokens.vintage && !c.url.includes('product_key=')));
});

test('missing independent settings, copied BNP identity and copied tokens fail closed before requests', async t => {
  const f = await fixture(t);
  for (const field of ['VESPA_PLATFORM_API_BINDING', 'VESPA_PLATFORM_STOREFRONT_API_TOKEN', 'VESPA_PLATFORM_MERCHANT_KEY', 'VESPA_PLATFORM_PRODUCT_KEY', 'VESPA_PLATFORM_ENVIRONMENT']) {
    const value = f.env[field]; delete f.env[field];
    assert.equal((await vintageCatalog(f.context('/api/vespa/catalog'))).status, 503, field);
    assert.equal((await f.create(f.input())).status, 503, field);
    f.env[field] = value;
  }
  for (const token of [f.tokens.bnp, f.tokens.bnpAdmin]) { f.env.VESPA_PLATFORM_STOREFRONT_API_TOKEN = token; assert.equal((await vintageCatalog(f.context('/api/vespa/catalog'))).status, 503); }
  f.env.VESPA_PLATFORM_STOREFRONT_API_TOKEN = f.tokens.vintage;
  f.env.VESPA_PLATFORM_PRODUCT_KEY = 'bnp';
  assert.equal((await vintageCatalog(f.context('/api/vespa/catalog'))).status, 503);
  assert.equal(f.calls.length, 0);
});

test('SDK verifies the second shop scope and sanitizes authentication failures', async t => {
  const f = await fixture(t); f.env.VESPA_PLATFORM_PRODUCT_KEY = 'wrong-application';
  const response = await vintageCatalog(f.context('/api/vespa/catalog'));
  assert.equal(response.status, 503); assert.equal(f.calls.length, 1); assert.ok(f.calls[0].url.endsWith('/v1/context'));
  const text = await response.text(); assert.equal(text.includes(f.tokens.vintage), false); assert.equal(text.includes('wrong-application'), false);
});

test('decorative unpaid intake uses exact server totals, immutable retries and isolated admin reads', async t => {
  const f = await fixture(t), input = f.input();
  const results = await Promise.all(Array.from({ length: 6 }, () => f.create(input)));
  assert.equal(results.filter(r => r.status === 201).length, 1); assert.equal(results.filter(r => r.status === 200).length, 5);
  const created = await results[0].json(), order = created.order;
  assert.equal(order.total_minor, 256000); assert.equal(order.payment_status, 'unpaid'); assert.equal(order.status, 'new'); assert.equal(created.checkoutUrl, undefined);
  assert.deepEqual(order.items[0].customization, input.items[0].customization);
  assert.equal((await (await f.call('/v1/admin/orders')).json()).orders.length, 1);
  assert.equal((await (await f.call('/v1/admin/orders', { token: f.tokens.bnpAdmin })).json()).orders.length, 0);
  assert.equal((await f.call('/v1/admin/orders/' + order.id, { token: f.tokens.bnpAdmin })).status, 404);
  assert.equal((await f.call('/v1/admin/orders/' + order.id, { token: f.tokens.bnpAdmin, method: 'PATCH', body: { status: 'cancelled', expected_version: 1 } })).status, 404);
  const { sku, ...product } = vintageDemoProducts[0];
  assert.equal((await f.call('/v1/admin/catalog/products/' + sku, { method: 'PUT', body: { expected_version: 1, ...product, unit_price_minor: 1, metadata: {} } })).status, 200);
  const repeated = await f.create(input); assert.equal(repeated.status, 200); assert.equal((await repeated.json()).order.total_minor, 256000);
  assert.equal((await f.create({ ...input, items: [{ ...input.items[0], customization: { schema, display_text: 'CHANGED' } }] })).status, 409);
  assert.equal((await f.create(f.input())).status, 409);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM commerce_orders').get().n, 1);
});

test('same UUID can independently identify BNP and vintage requests without cross-shop reads or SKU reuse', async t => {
  const f = await fixture(t), input = f.input(); const vintage = (await (await f.create(input)).json()).order;
  const bnpBody = { ...input, items: [{ sku: 'plate-a', quantity: 1, customization: { registration_bangla: 'ঢাকা' } }], expected_catalog_versions: { 'plate-a': 1 } };
  const response = await bnpIntake(f.context('/api/order', { method: 'POST', body: bnpBody })); assert.equal(response.status, 201);
  const bnp = (await response.json()).order; assert.notEqual(bnp.id, vintage.id); assert.equal(bnp.total_minor, 44000);
  assert.equal((await f.create({ ...bnpBody, request_id: crypto.randomUUID() })).status, 409);
  const toBnp = { ...input, request_id: crypto.randomUUID(), items: [{ sku: 'cream-enamel', quantity: 1, customization: {} }] };
  assert.equal((await bnpIntake(f.context('/api/order', { method: 'POST', body: toBnp }))).status, 409);
  const list = await (await f.call('/v1/admin/orders', { token: f.tokens.bnpAdmin })).json(); assert.deepEqual(list.orders.map(o => o.id), [bnp.id]);
});

test('decorative customization is bounded, explicitly versioned and catalog-opted-in', async t => {
  const f = await fixture(t);
  const invalid = [{}, { display_text: 'DEMO' }, { registration_bangla: 'ঢাকা' }, { schema, display_text: '' }, { schema, display_text: '   ' }, { schema, display_text: 'a'.repeat(61) }, { schema, display_text: 123 }, { schema, display_text: 'a\nb' }, { schema, display_text: 'a\u007fb' }, { schema, display_text: 'a\u0085b' }, { schema: 'decorative-display-text/v2', display_text: 'DEMO' }, { schema, display_text: 'DEMO', registration_bangla: 'ঢাকা' }];
  for (const customization of invalid) { const input = f.input(); input.items[0].customization = customization; assert.equal((await f.create(input)).status, 400, JSON.stringify(customization)); }
  const valid = f.input(); valid.items[0].customization.display_text = 'a'.repeat(60); assert.equal((await f.create(valid)).status, 201);
  const bnp = f.input(); bnp.items = [{ sku: 'plate-a', quantity: 1, customization: { schema, display_text: 'DEMO' } }]; bnp.expected_catalog_versions = { 'plate-a': 1 };
  assert.equal((await bnpIntake(f.context('/api/order', { method: 'POST', body: bnp }))).status, 400);
  const { sku, ...product } = vintageDemoProducts[0];
  assert.equal((await f.call('/v1/admin/catalog/products/no-opt-in', { method: 'PUT', body: { expected_version: 0, ...product, metadata: {} } })).status, 201);
  const without = f.input(); without.items[0].sku = 'no-opt-in'; without.expected_catalog_versions = { 'no-opt-in': 1 }; assert.equal((await f.create(without)).status, 400);
});

test('only supported catalog schema and kind can opt in; BNP cannot adopt decorative schema', async t => {
  const f = await fixture(t); const { sku, ...product } = vintageDemoProducts[0];
  for (const patch of [{ kind: 'plate' }, { metadata: { customization_schema: 'decorative-display-text/v2' } }, { metadata: { customization_schema: null } }]) assert.equal((await f.call('/v1/admin/catalog/products/invalid', { method: 'PUT', body: { expected_version: 0, ...product, ...patch } })).status, 400);
  assert.equal((await f.call('/v1/admin/catalog/products/invalid', { token: f.tokens.bnpAdmin, method: 'PUT', body: { expected_version: 0, ...product } })).status, 400);
});

test('vintage adapter preserves CSRF, injected fields and version gates', async t => {
  const f = await fixture(t);
  for (const origin of [null, 'https://evil.test']) assert.equal((await vintageIntake(f.context('/api/vespa/order', { method: 'POST', body: f.input(), origin }))).status, 403);
  assert.equal(f.calls.length, 0);
  for (const patch of [{ product_key: 'bnp' }, { scope: { merchant: 'other', product: 'bnp' } }, { total_minor: 1 }, { payment_status: 'paid' }]) assert.equal((await f.create({ ...f.input(), ...patch })).status, 400);
  for (const patch of [{ expected_shipping_version: 99 }, { expected_catalog_versions: { 'cream-enamel': 99 } }]) assert.equal((await f.create({ ...f.input(), ...patch })).status, 409);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM commerce_orders').get().n, 0);
});

test('vintage cannot bypass deferred payments, fulfillment, immutable snapshots or audit', async t => {
  const f = await fixture(t), order = (await (await f.create(f.input())).json()).order;
  for (const status of ['paid', 'production', 'qc', 'shipped']) assert.equal((await f.call('/v1/admin/orders/' + order.id, { method: 'PATCH', body: { status, expected_version: 1 } })).status, 409);
  for (const path of ['/v1/payments', '/v1/dispatch']) assert.equal((await f.call(path, { token: f.tokens.vintage, method: 'POST', body: {} })).status, 503);
  assert.throws(() => f.sql.exec("UPDATE commerce_orders SET payment_status='paid'"), /invalid_order_mutation/);
  assert.throws(() => f.sql.exec("UPDATE commerce_orders SET total_minor=1"), /invalid_order_mutation/);
  assert.throws(() => f.sql.exec('DELETE FROM commerce_order_audit'), /immutable_audit/);
  assert.equal((await f.call('/v1/admin/orders', { token: f.tokens.vintage })).status, 403);
});
