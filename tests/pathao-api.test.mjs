import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createApi } from '../services/pathao-api/src/api.js';
import { createWebhookInbox, webhookPayloadContext } from '../services/pathao-api/src/reconciliation.js';
import { createD1Registry } from '../services/pathao-api/src/registry.js';
import { createTokenCipher } from '../services/pathao-api/src/token-store.js';
import { signDispatchGrant } from '../services/pathao-api/src/dispatch-grant.js';
import { sha256, createPathaoService, createMemoryTokenStore } from '../services/pathao-api/src/provider/service.js';
const originalFetch = globalThis.fetch;
beforeEach(() => { globalThis.fetch = async () => assert.fail('Unexpected network call'); });
afterEach(() => { globalThis.fetch = originalFetch; });
const dispatchKey = 'synthetic-only-dispatch-key-'.repeat(3);
const webhookSecret = 'synthetic-only-webhook-secret-'.repeat(3);
const identity = { scope: { merchant: 'merchant', product: 'bnp' }, environment: 'sandbox' };
const intentId = 'abcdefab-1234-4123-8123-abcdefabcdef';
const payload = { store_id: 12, merchant_order_id: 'BNP-TEST', recipient_name: 'Test Person', recipient_phone: '01700000000', recipient_address: 'Synthetic test address', recipient_city: 1, recipient_zone: 2, recipient_area: 3, delivery_type: 48, item_type: 2, item_quantity: 1, item_weight: 0.5, amount_to_collect: 0 };
const store = { name: 'Test pickup', contact_name: 'Test Person', contact_number: '01700000000', address: 'Synthetic pickup address', city_id: 1, zone_id: 2, area_id: 3 };
async function fixture(t, options = {}) {
  const sqlite = new DatabaseSync(':memory:'); t.after(() => sqlite.close());
  for (const name of ['0001_api', '0002_tokens', '0003_rewards', '0004_webhook_inbox', '0005_quotes']) sqlite.exec(readFileSync(new URL(`../services/pathao-api/migrations/${name}.sql`, import.meta.url), 'utf8'));
  const db = { prepare(sql) { const statement = sqlite.prepare(sql); let values = []; return { bind(...args) { values = args; return this; }, async first() { return statement.get(...values) ?? null; }, async all() { return { results: statement.all(...values) }; }, async run() { return { meta: { changes: Number(statement.run(...values).changes) } }; } }; } };
  db.batch = async statements => { sqlite.exec('BEGIN'); try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results; } catch (error) { sqlite.exec('ROLLBACK'); throw error; } };
  const encryptionKey = new Uint8Array(32).fill(42), keyVersion = 'fixture';
  const cipher = createTokenCipher({ encryptionKey, keyVersion });
  const registry = createD1Registry({ db, encryptionKey, keyVersion });
  const credentials = { clientId: 'test-client', clientSecret: 'test-secret', username: 'test-user', password: 'test-password' };
  async function client(overrides = {}) {
    const who = { ...identity, permissions: ['courier:read', 'courier:dispatch', 'courier:stores:create', 'rewards:read'], ...overrides };
    const { merchant, product } = who.scope, env = who.environment;
    const config = await cipher.seal({ credentials }, ['registry', 'merchant', merchant, env, product]);
    sqlite.prepare('INSERT OR IGNORE INTO courier_merchants VALUES(?,?,?,?,1)').run(merchant, product, env, JSON.stringify(config));
    const encrypted = await cipher.seal(dispatchKey, ['registry', 'dispatch', merchant, env, product]);
    const token = (await sha256(JSON.stringify(who))).slice(0, 48);
    sqlite.prepare('INSERT OR REPLACE INTO courier_api_clients VALUES(?,?,?,?,?,?,1)').run(await sha256(token), merchant, product, env, JSON.stringify(who.permissions), JSON.stringify(encrypted));
    return token;
  }
  const token = await client(), calls = [];
  const provider = Object.fromEntries(Object.entries({ stores: async () => ({ stores: [] }), validateStore: async () => ({ id: 12 }), validateDestination: async () => {}, createShipment: async () => ({ consignment_id: 'TEST-CONSIGNMENT', provider_status: 'Pending' }), createStore: async () => ({ id: 12 }), tracking: async () => 'Delivered', rateEstimate: async () => ({ final_price: 60, currency: 'BDT' }), ...options.provider }).map(([name, fn]) => [name, async (...args) => { calls.push({ name, args }); return fn(...args); }]));
  const rewardCalls = [];
  const api = createApi({ db, registry, inbox: createWebhookInbox({ db, cipher }), providerFor: async who => { assert.deepEqual(await registry.merchant(who), { credentials }); return provider; }, rewards: { async getRewards(args) { rewardCalls.push(args); return { month: args.month }; } }, flags: options.defaultFlags ? {} : { provider: true, stores: true, dispatch: true, webhooks: true, ...options.flags }, now: options.now ?? (() => 1000000) });
  const request = (path, { method = 'GET', body, auth = token, headers = {} } = {}) => api(new Request(`https://courier.example.test${path}`, { method, headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }));
  const grant = (input = payload, who = identity, time = 1000000, intent = intentId) => signDispatchGrant({ ...who, orderId: 'test-order', intentId: intent, paymentEventId: 'test-settlement', amountBdt: 160, payload: input }, dispatchKey, time);
  const dispatch = async (input = payload, proof, auth = token) => request('/v1/shipments', { method: 'POST', body: { payload: input, dispatch_grant: proof ?? await grant(input) }, auth });
  return { sqlite, db, registry, cipher, client, token, calls, request, grant, dispatch, rewardCalls };
}
test('standalone API authenticates encrypted registry bearer clients, never cookies or browser Origin/CORS', async t => {
  const f = await fixture(t);
  for (const headers of [{ Cookie: 'session=test' }, { Authorization: 'Basic test' }, { Authorization: 'Bearer short' }]) assert.equal((await f.request('/v1/stores', { auth: null, headers })).status, 401);
  assert.equal((await f.request('/v1/stores', { auth: 'z'.repeat(48) })).status, 401);
  for (const options of [{ headers: { Origin: 'https://product.example.test' } }, { method: 'OPTIONS' }]) { const r = await f.request('/v1/stores', options); assert.equal(r.status, 403); assert.equal(r.headers.has('Access-Control-Allow-Origin'), false); }
  const r = await f.request('/v1/stores'); assert.equal(r.status, 200); assert.equal(r.headers.get('Cache-Control'), 'no-store');
  const storage = JSON.stringify(f.sqlite.prepare('SELECT * FROM courier_api_clients').all()) + JSON.stringify(f.sqlite.prepare('SELECT * FROM courier_merchants').all());
  for (const secret of [f.token, dispatchKey, 'test-password', 'test-secret']) assert.equal(storage.includes(secret), false);
  f.sqlite.prepare('UPDATE courier_api_clients SET enabled=0').run(); assert.equal((await f.request('/v1/stores')).status, 401);
});
test('permissions and independent default-off flags fail closed before provider work', async t => {
  const f = await fixture(t), denied = await f.client({ permissions: [] });
  for (const [path, method, body] of [['/v1/stores', 'GET'], ['/v1/stores', 'POST', {}], ['/v1/shipments', 'POST', {}], ['/v1/rewards?month=2026-11', 'GET'], ['/v1/operations?kind=shipment&reference=x', 'GET']]) assert.equal((await f.request(path, { method, body, auth: denied })).status, 403);
  assert.equal(f.calls.length, 0);
  const defaults = await fixture(t, { defaultFlags: true }); assert.equal((await defaults.dispatch()).status, 503); assert.equal((await defaults.request('/v1/stores')).status, 503); assert.equal(defaults.calls.length, 0);
  for (const name of ['provider', 'dispatch']) { const other = await fixture(t, { flags: { [name]: false } }); assert.equal((await other.dispatch()).status, 503); assert.equal(other.calls.length, 0); }
});
test('missing forged expired future and scope/payload-mismatched grants never reach provider or claim', async t => {
  const f = await fixture(t), valid = await f.grant();
  const invalid = [undefined, 'invalid', valid.slice(0, -5) + 'aaaaa', await f.grant(payload, identity, 939000), await f.grant(payload, identity, 1006000), await f.grant({ ...payload, item_weight: 1 }), await f.grant(payload, { ...identity, environment: 'production' }), await f.grant(payload, { ...identity, scope: { merchant: 'other', product: 'bnp' } }), await f.grant(payload, { ...identity, scope: { merchant: 'merchant', product: 'other' } })];
  for (const proof of invalid) assert.equal((await f.request('/v1/shipments', { method: 'POST', body: { payload, dispatch_grant: proof } })).status, 403);
  assert.equal(f.calls.length, 0); assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM courier_operations').get().n, 0);
});
test('prepaid payload rejects COD and injected/invalid input before proof verification', async t => {
  const f = await fixture(t);
  for (const patch of [{ amount_to_collect: 1 }, { amount_to_collect: '0' }, { item_weight: 0 }, { item_weight: 11 }, { recipient_area: 0 }, { recipient_phone: '+8801700000000' }, { store_id: '12' }, { payment_status: 'paid' }, { merchant_order_id: '../escape' }]) assert.equal((await f.request('/v1/shipments', { method: 'POST', body: { payload: { ...payload, ...patch }, dispatch_grant: 'bad' } })).status, 400);
  assert.equal((await f.request('/v1/shipments', { method: 'POST', body: { payload, dispatch_grant: await f.grant(), paid: true } })).status, 400);
  assert.equal(f.calls.length, 0);
});
test('dispatch rechecks grant expiry after preflight, before durable claim', async t => {
  let now = 1000000; const f = await fixture(t, { now: () => now, provider: { validateDestination: async () => { now += 60000; } } });
  assert.equal((await f.dispatch()).status, 403); assert.equal(f.calls.some(c => c.name === 'createShipment'), false); assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM courier_operations').get().n, 0);
});
test('atomic concurrent duplicate shipment requests create exactly once and cannot reuse an intent', async t => {
  const f = await fixture(t), proof = await f.grant();
  const results = await Promise.all(Array.from({ length: 8 }, () => f.dispatch(payload, proof)));
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409, 409, 409, 409, 409, 409, 409]);
  assert.equal(f.calls.filter(c => c.name === 'createShipment').length, 1); assert.equal(f.calls.find(c => c.name === 'createShipment').args[0].amount_to_collect, 0);
  assert.equal((await f.dispatch({ ...payload, merchant_order_id: 'OTHER-REFERENCE' })).status, 409);
  assert.equal(f.sqlite.prepare('SELECT state FROM courier_operations').get().state, 'confirmed');
});
test('uncertain provider or persistence outcome remains claimed and never retries', async t => {
  for (const persistenceFailure of [false, true]) {
    const f = await fixture(t, { provider: persistenceFailure ? {} : { createShipment: async () => { throw Error('synthetic private provider error'); } } });
    if (persistenceFailure) f.sqlite.exec("CREATE TRIGGER fail_confirmation BEFORE UPDATE ON courier_operations WHEN NEW.state='confirmed' BEGIN SELECT RAISE(ABORT,'synthetic private database error'); END;");
    const first = await f.dispatch(); assert.equal(first.status, 202); assert.equal((await first.json()).state, 'unknown');
    assert.equal((await f.dispatch()).status, 409); assert.equal(f.calls.filter(c => c.name === 'createShipment').length, 1);
    assert.equal(f.sqlite.prepare('SELECT state FROM courier_operations').get().state, 'unknown');
  }
});
test('operation reads and tracking isolate merchant product and environment; raw consignments cannot be tracked', async t => {
  const f = await fixture(t); assert.equal((await f.dispatch()).status, 201);
  for (const override of [{ scope: { merchant: 'other', product: 'bnp' } }, { scope: { merchant: 'merchant', product: 'other' } }, { environment: 'production' }]) {
    const auth = await f.client(override);
    assert.equal((await (await f.request('/v1/operations?kind=shipment&reference=BNP-TEST', { auth })).json()).operation, null);
    assert.equal((await f.request('/v1/shipments/BNP-TEST/tracking', { method: 'POST', auth })).status, 404);
  }
  assert.equal((await f.request('/v1/shipments/TEST-CONSIGNMENT/tracking', { method: 'POST' })).status, 404);
  assert.equal(f.calls.some(c => c.name === 'tracking'), false);
  const tracked = await f.request('/v1/shipments/BNP-TEST/tracking', { method: 'POST' }); assert.equal(tracked.status, 200); assert.equal((await tracked.json()).normalized_status, 'delivered');
  assert.deepEqual(f.calls.find(c => c.name === 'tracking').args, ['TEST-CONSIGNMENT', 'BNP-TEST']);
});
test('store UUID case variants share one atomic claim, including unknown outcome', async t => {
  for (const fail of [false, true]) {
    const f = await fixture(t, { provider: fail ? { createStore: async () => { throw Error('unknown'); } } : {} });
    const responses = await Promise.all([intentId, intentId.toUpperCase(), intentId].map(request_id => f.request('/v1/stores', { method: 'POST', body: { request_id, store } })));
    assert.deepEqual(responses.map(r => r.status).sort(), [202, 409, 409]); assert.equal(f.calls.filter(c => c.name === 'createStore').length, 1);
    const row = f.sqlite.prepare('SELECT reference,state FROM courier_operations').get(); assert.equal(row.reference, intentId); assert.equal(row.state, fail ? 'unknown' : 'confirmed');
  }
});
test('authenticated status receipt cannot alter payment, shipment or rewards evidence', async t => {
  const f = await fixture(t); await f.dispatch();
  f.sqlite.exec("CREATE TABLE synthetic_payment_state(status TEXT); INSERT INTO synthetic_payment_state VALUES('paid');");
  const endpoint = 'synthetic_webhook_endpoint_12345';
  const encrypted = await f.cipher.seal(webhookSecret, ['registry', 'webhook', 'merchant', 'sandbox', 'bnp']);
  f.sqlite.prepare('INSERT INTO courier_webhook_routes VALUES(?,?,?,?,?,1)').run(endpoint, 'merchant', 'bnp', 'sandbox', JSON.stringify(encrypted));
  const before = JSON.stringify(f.sqlite.prepare('SELECT * FROM courier_operations').all());
  const body = { event: 'order.delivered', consignment_id: 'TEST-CONSIGNMENT', payment_status: 'paid', customer_name: 'do-not-persist' };
  assert.equal((await f.request(`/v1/webhooks/pathao/${endpoint}`, { method: 'POST', auth: null, body })).status, 401);
  for (let i = 0; i < 2; i++) { const accepted = await f.request(`/v1/webhooks/pathao/${endpoint}`, { method: 'POST', auth: null, body, headers: { 'X-PATHAO-Signature': webhookSecret } }); assert.equal(accepted.status, 202); assert.deepEqual(await accepted.json(), { accepted: true, duplicate: i > 0, processing: 'queued_for_reconciliation' }); }
  assert.equal(JSON.stringify(f.sqlite.prepare('SELECT * FROM courier_operations').all()), before);
  assert.equal(f.sqlite.prepare('SELECT status FROM synthetic_payment_state').get().status, 'paid');
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM pathao_reward_evidence').get().n, 0);
  const receipts = f.sqlite.prepare('SELECT * FROM courier_webhook_inbox').all(); assert.equal(receipts.length, 1); assert.equal(JSON.stringify(receipts).includes('do-not-persist'), false);
  const receipt = receipts[0]; assert.deepEqual(await f.cipher.open({ keyVersion: receipt.key_version, iv: receipt.iv, ciphertext: receipt.ciphertext }, webhookPayloadContext(identity, receipt.payload_sha256)), body);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM courier_reconciliation_jobs').get().n, 1);
});
test('rewards requires explicit valid month and passes authenticated merchant/environment, never query overrides', async t => {
  const f = await fixture(t);
  for (const suffix of ['', '?month=2026-13', '?month=2026-1', '?month=garbage']) assert.equal((await f.request('/v1/rewards' + suffix)).status, 400);
  assert.equal(f.rewardCalls.length, 0);
  const auth = await f.client({ scope: { merchant: 'other', product: 'other-product' }, environment: 'production' });
  assert.equal((await f.request('/v1/rewards?month=2026-11&merchantId=attacker&environment=sandbox', { auth })).status, 200);
  assert.deepEqual(f.rewardCalls, [{ merchantId: 'other', environment: 'production', month: '2026-11' }]);
});
test('provider mutations do not retry on HTTP failure', async () => {
  const calls = []; const client = createPathaoService({ ...identity, credentials: { clientId: 'synthetic', clientSecret: 'synthetic', username: 'synthetic', password: 'synthetic' } }, { tokenStore: createMemoryTokenStore(), fetcher: async url => { calls.push(url); return url.endsWith('/issue-token') ? Response.json({ access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', expires_in: 3600 }) : new Response('synthetic error', { status: 503 }); } });
  await assert.rejects(client.createShipment(payload)); assert.equal(calls.filter(url => !url.endsWith('/issue-token')).length, 1);
});

test('encrypted registry credentials fail closed if moved across tenant or product contexts', async t => {
  const f = await fixture(t);
  const auth = await f.client({ scope: { merchant: 'merchant', product: 'other' } });
  const encrypted = f.sqlite.prepare('SELECT encrypted_dispatch_key FROM courier_api_clients WHERE product_key=?').get('bnp').encrypted_dispatch_key;
  f.sqlite.prepare('UPDATE courier_api_clients SET encrypted_dispatch_key=? WHERE product_key=?').run(encrypted, 'other');
  const proof = await f.grant(payload, { ...identity, scope: { merchant: 'merchant', product: 'other' } });
  assert.equal((await f.dispatch(payload, proof, auth)).status, 503);
  assert.equal(f.calls.length, 0);
  const other = await f.client({ scope: { merchant: 'other', product: 'bnp' } });
  const config = f.sqlite.prepare('SELECT encrypted_config FROM courier_merchants WHERE merchant_key=?').get('merchant').encrypted_config;
  f.sqlite.prepare('UPDATE courier_merchants SET encrypted_config=? WHERE merchant_key=?').run(config, 'other');
  const result = await f.request('/v1/stores', { auth: other }); assert.equal(result.status, 503); assert.equal((await result.text()).includes('test-password'), false);
  assert.equal(f.calls.length, 0);
});

test('stable authorization order identity blocks fresh intent and changed display reference', async t => {
  const f = await fixture(t); assert.equal((await f.dispatch()).status, 201);
  const changed = { ...payload, merchant_order_id: 'RENAMED-ORDER' };
  const proof = await f.grant(changed, identity, 1000000, 'abcdefab-9999-4999-8999-abcdefabcdef');
  assert.equal((await f.dispatch(changed, proof)).status, 409);
  assert.equal(f.calls.filter(c => c.name === 'createShipment').length, 1);
  assert.equal(f.sqlite.prepare('SELECT authorization_order_id FROM courier_operations').get().authorization_order_id, 'test-order');
});
test('unknown authenticated callback shapes persist encrypted per-scope inbox work; persistence failure is not acknowledged', async t => {
  const f = await fixture(t), body = { unknown_schema: { shipment: 'possibly-untrusted', customer: 'synthetic-private-value' } };
  const scopes = [identity, { ...identity, scope: { merchant: 'other', product: 'bnp' } }, { ...identity, scope: { merchant: 'merchant', product: 'other' } }, { ...identity, environment: 'production' }];
  for (const [index, who] of scopes.entries()) {
    await f.client(who); const endpoint = `synthetic_callback_endpoint_${index}`;
    const encrypted = await f.cipher.seal(webhookSecret, ['registry', 'webhook', who.scope.merchant, who.environment, who.scope.product]);
    f.sqlite.prepare('INSERT INTO courier_webhook_routes VALUES(?,?,?,?,?,1)').run(endpoint, who.scope.merchant, who.scope.product, who.environment, JSON.stringify(encrypted));
    const response = await f.request(`/v1/webhooks/pathao/${endpoint}`, { method: 'POST', body, auth: null, headers: { 'X-PATHAO-Signature': webhookSecret } });
    assert.equal(response.status, 202); assert.equal((await response.json()).processing, 'queued_for_reconciliation');
  }
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM courier_webhook_inbox').get().n, 4);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM courier_reconciliation_jobs').get().n, 4);
  assert.equal(f.calls.length, 0);
  f.sqlite.exec("CREATE TRIGGER fail_job BEFORE UPDATE ON courier_reconciliation_jobs BEGIN SELECT RAISE(ABORT,'private storage fault'); END;");
  const failed = await f.request('/v1/webhooks/pathao/synthetic_callback_endpoint_0', { method: 'POST', body: { changed: true }, auth: null, headers: { 'X-PATHAO-Signature': webhookSecret } });
  assert.equal(failed.status, 503); assert.equal((await failed.text()).includes('private storage fault'), false);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM courier_webhook_inbox').get().n, 4, 'transaction rolls back inbox when scheduling fails');
});
test('rate estimates persist separate immutable observations with authenticated scope and never imply invoice confirmation', async t => {
  const f = await fixture(t), input = { store_id: 12, city_id: 1, zone_id: 2, item_weight: 0.5 };
  const returned = [];
  for (let i = 0; i < 2; i++) { const response = await f.request('/v1/rates', { method: 'POST', body: input }); assert.equal(response.status, 200); returned.push((await response.json()).quote); }
  assert.notEqual(returned[0].quote_id, returned[1].quote_id);
  for (const quote of returned) { assert.equal(quote.kind, 'estimate'); assert.equal(quote.invoice_confirmed, false); assert.equal(quote.observed_at, new Date(1000000).toISOString()); }
  const rows = f.sqlite.prepare('SELECT * FROM courier_quotes ORDER BY rowid').all(); assert.equal(rows.length, 2);
  for (const row of rows) { assert.equal(row.merchant_key, 'merchant'); assert.equal(row.product_key, 'bnp'); assert.equal(row.environment, 'sandbox'); assert.equal(row.weight_kg_decimal, '0.5'); }
  f.sqlite.exec("CREATE TRIGGER fail_quote BEFORE INSERT ON courier_quotes BEGIN SELECT RAISE(ABORT,'private write failure'); END;");
  const failed = await f.request('/v1/rates', { method: 'POST', body: input }); assert.equal(failed.status, 503); assert.equal((await failed.text()).includes('private write failure'), false);
});

test('encrypted provider credentials are isolated between products of the same merchant', async t => {
  const f = await fixture(t);
  const other = await f.client({ scope: { merchant: 'merchant', product: 'other' } });
  const bnp = f.sqlite.prepare("SELECT encrypted_config FROM courier_merchants WHERE merchant_key='merchant' AND product_key='bnp'").get().encrypted_config;
  f.sqlite.prepare("UPDATE courier_merchants SET encrypted_config=? WHERE merchant_key='merchant' AND product_key='other'").run(bnp);
  assert.equal((await f.request('/v1/stores', { auth: other })).status, 503);
  assert.equal((await f.request('/v1/stores')).status, 200);
});

test('disabled merchant-product registration disables its API client without affecting another product', async t => {
  const f = await fixture(t), other = await f.client({ scope: { merchant: 'merchant', product: 'other' } });
  f.sqlite.prepare("UPDATE courier_merchants SET enabled=0 WHERE merchant_key='merchant' AND product_key='bnp'").run();
  assert.equal((await f.request('/v1/context')).status, 401);
  assert.equal((await f.request('/v1/context', { auth: other })).status, 200);
});
