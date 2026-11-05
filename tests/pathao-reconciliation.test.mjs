import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createTokenCipher } from '../services/pathao-api/src/token-store.js';
import { createWebhookInbox, reconcilePending, webhookPayloadContext } from '../services/pathao-api/src/reconciliation.js';
const identity = { scope: { merchant: 'merchant', product: 'shop' }, environment: 'sandbox' };
function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0001_api.sql', '0004_webhook_inbox.sql']) sqlite.exec(readFileSync(new URL(`../services/pathao-api/migrations/${name}`, import.meta.url), 'utf8'));
  const db = { prepare(text) {
    const query = sqlite.prepare(text); let args = [];
    return { bind(...values) { args = values; return this; }, async first() { return query.get(...args) ?? null; },
      async all() { return { results: query.all(...args) }; }, async run() { return { meta: { changes: query.run(...args).changes } }; } };
  }, async batch(statements) { sqlite.exec('BEGIN'); try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results; } catch (error) { sqlite.exec('ROLLBACK'); throw error; } } };
  // Serialize simulated atomic D1 batches, including concurrent enqueue tests.
  const batch = db.batch.bind(db); let tail = Promise.resolve();
  db.batch = statements => { const result = tail.then(() => batch(statements)); tail = result.catch(() => {}); return result; };
  const cipher = createTokenCipher({ encryptionKey: Buffer.alloc(32, 17).toString('base64'), keyVersion: 'test' });
  const inbox = createWebhookInbox({ db, cipher });
  const addShipment = (ref, who = identity, state = 'confirmed', kind = 'shipment') => sqlite.prepare(`INSERT INTO courier_operations
    (merchant_key,product_key,environment,kind,reference,intent_id,request_hash,state,consignment_id) VALUES(?,?,?,?,?,?,?,?,?)`)
    .run(who.scope.merchant, who.scope.product, who.environment, kind, ref, ref, 'hash', state, `${who.environment}-${who.scope.product}-${ref}`);
  return { sqlite, db, cipher, inbox, addShipment };
}

test('atomic encrypted complete generic payload, canonical duplicate isolation and AAD', async () => {
  const { sqlite, inbox, cipher } = fixture();
  const payload = { strange: { secret: 'private recipient details', arbitrary: [null, 1, true] }, paid: true, status: 'Delivered' };
  const results = await Promise.all(Array.from({ length: 8 }, (_, i) => inbox.enqueue(identity, i % 2 ? { status: 'Delivered', paid: true, strange: payload.strange } : payload)));
  assert.equal(results.filter(result => !result.duplicate).length, 1);
  const row = sqlite.prepare('SELECT * FROM courier_webhook_inbox').get();
  assert.ok(!JSON.stringify(row).includes('private recipient'));
  assert.ok(!JSON.stringify(row).includes('Delivered'));
  const envelope = { keyVersion: row.key_version, iv: row.iv, ciphertext: row.ciphertext };
  assert.deepEqual(await cipher.open(envelope, webhookPayloadContext(identity, row.payload_sha256)), payload);
  const other = { ...identity, scope: { ...identity.scope, product: 'other' } };
  await assert.rejects(cipher.open(envelope, webhookPayloadContext(other, row.payload_sha256)), /DECRYPTION_FAILED/);
  await assert.rejects(cipher.open(envelope, webhookPayloadContext(identity, 'a'.repeat(64))), /DECRYPTION_FAILED/);
  await inbox.enqueue(other, payload);
  await inbox.enqueue({ ...identity, environment: 'production' }, payload);
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM courier_webhook_inbox').get().n, 3);
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM courier_reconciliation_jobs').get().n, 3);
});

test('inbox and scheduling rollback atomically', async () => {
  const { sqlite, inbox } = fixture();
  sqlite.exec("CREATE TRIGGER reject_job BEFORE INSERT ON courier_reconciliation_jobs BEGIN SELECT RAISE(ABORT, 'fixture'); END;");
  await assert.rejects(inbox.enqueue(identity, { anything: true }));
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM courier_webhook_inbox').get().n, 0);
});

test('only tracking known confirmed tenant shipments; display fields only and schema review', async () => {
  const { sqlite, db, inbox, addShipment } = fixture();
  addShipment('a'); addShipment('unknown', identity, 'unknown'); addShipment('store', identity, 'confirmed', 'store');
  addShipment('other', { ...identity, scope: { ...identity.scope, product: 'other' } });
  const before = sqlite.prepare("SELECT * FROM courier_operations WHERE reference='a'").get();
  await inbox.enqueue(identity, { event: 'paid', status: 'Delivered', payment: 900, merchant_order_id: 'other' });
  let calls = 0;
  const result = await reconcilePending({ db, providerFor: async who => { assert.deepEqual(who, identity); return { tracking: async (id, ref) => { calls++; assert.equal(ref, 'a'); assert.equal(id, 'sandbox-shop-a'); return 'In Transit'; } }; } });
  assert.equal(calls, 1); assert.equal(result.completed, 1);
  const after = sqlite.prepare("SELECT * FROM courier_operations WHERE reference='a'").get();
  assert.equal(after.provider_status, 'In Transit'); assert.equal(after.normalized_status, 'in_transit');
  for (const key of Object.keys(before).filter(key => !['provider_status', 'normalized_status', 'status_checked_at', 'updated_at'].includes(key))) assert.equal(after[key], before[key]);
  assert.equal(sqlite.prepare('SELECT processing_status FROM courier_webhook_inbox').get().processing_status, 'review_required');
  assert.equal(sqlite.prepare('SELECT review_reason FROM courier_webhook_inbox').get().review_reason, 'schema_unverified');
});

test('no known shipments remains reviewable without provider request', async () => {
  const { db, sqlite, inbox } = fixture();
  await inbox.enqueue(identity, { arbitrary: 'unknown schema' });
  await reconcilePending({ db, providerFor: () => { throw new Error('must not call'); } });
  assert.equal(sqlite.prepare('SELECT review_reason FROM courier_webhook_inbox').get().review_reason, 'no_known_shipments');
});

test('bounded pagination and notifications arriving mid-pass schedule another complete pass', async () => {
  const { db, sqlite, inbox, addShipment } = fixture();
  for (const ref of ['a', 'b', 'c']) addShipment(ref);
  await inbox.enqueue(identity, { first: 1 });
  const refs = [], providerFor = () => ({ tracking: async (_id, ref) => { refs.push(ref); return 'Delivered'; } });
  await reconcilePending({ db, providerFor, pageSize: 2 });
  assert.deepEqual(refs, ['a', 'b']);
  await inbox.enqueue(identity, { second: 2 });
  await reconcilePending({ db, providerFor, pageSize: 2 });
  assert.deepEqual(refs, ['a', 'b', 'c']);
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM courier_webhook_inbox WHERE processing_status='pending'").get().n, 1);
  await reconcilePending({ db, providerFor, pageSize: 2 });
  await reconcilePending({ db, providerFor, pageSize: 2 });
  assert.deepEqual(refs, ['a', 'b', 'c', 'a', 'b', 'c']);
  assert.equal(sqlite.prepare('SELECT requested_id=completed_id AS done FROM courier_reconciliation_jobs').get().done, 1);
});

test('retry delays and exhaustion remain reviewable with no provider errors leaked', async () => {
  const { db, sqlite, inbox, addShipment } = fixture(); addShipment('a');
  await inbox.enqueue(identity, { secret: 'private' });
  let calls = 0;
  const providerFor = () => ({ tracking: async () => { calls++; throw new Error('private provider response'); } });
  assert.equal((await reconcilePending({ db, providerFor, maxAttempts: 2 })).retried, 1);
  await reconcilePending({ db, providerFor, maxAttempts: 2 }); assert.equal(calls, 1);
  sqlite.exec('UPDATE courier_reconciliation_jobs SET next_attempt_at=0');
  assert.equal((await reconcilePending({ db, providerFor, maxAttempts: 2 })).reviewRequired, 1);
  assert.equal(sqlite.prepare('SELECT review_reason FROM courier_webhook_inbox').get().review_reason, 'retries_exhausted');
  assert.ok(!JSON.stringify(sqlite.prepare('SELECT * FROM courier_reconciliation_jobs').get()).includes('private'));
});

test('concurrent workers and expired stale reads cannot overwrite newer tracking', async () => {
  const { db, sqlite, inbox, addShipment } = fixture(); addShipment('a');
  await inbox.enqueue(identity, { status: 'Pending' });
  let release, entered;
  const ready = new Promise(resolve => { entered = resolve; });
  const old = reconcilePending({ db, providerFor: () => ({ tracking: () => { entered(); return new Promise(resolve => { release = resolve; }); } }) });
  await ready;
  const none = await reconcilePending({ db, providerFor: () => { throw new Error('must not call'); } });
  assert.equal(none.claimed, 0);
  sqlite.exec('UPDATE courier_reconciliation_jobs SET lease_until=0');
  await reconcilePending({ db, providerFor: () => ({ tracking: async () => 'Delivered' }) });
  release('Pending'); await old;
  assert.equal(sqlite.prepare('SELECT provider_status FROM courier_operations').get().provider_status, 'Delivered');
  // Late notifications still fetch current provider state, never apply their status.
  await inbox.enqueue(identity, { status: 'Pending', sequence: 'old' });
  await reconcilePending({ db, providerFor: () => ({ tracking: async () => 'Delivered' }) });
  assert.equal(sqlite.prepare('SELECT provider_status FROM courier_operations').get().provider_status, 'Delivered');
});

test('retry succeeds, resumes safely, and never writes unvalidated tracking', async () => {
  const { db, sqlite, inbox, addShipment } = fixture(); addShipment('a');
  await inbox.enqueue(identity, { schema: null });
  await reconcilePending({ db, providerFor: () => ({ tracking: async () => ({ order_status: 'Delivered' }) }) });
  assert.equal(sqlite.prepare('SELECT provider_status FROM courier_operations').get().provider_status, null);
  sqlite.exec('UPDATE courier_reconciliation_jobs SET next_attempt_at=0');
  const result = await reconcilePending({ db, providerFor: () => ({ tracking: async () => 'A future provider status' }) });
  assert.equal(result.completed, 1);
  assert.equal(sqlite.prepare('SELECT normalized_status FROM courier_operations').get().normalized_status, 'unknown');
  assert.equal(sqlite.prepare('SELECT attempts FROM courier_reconciliation_jobs').get().attempts, 0);
});

test('migration constraints and bounded options reject invalid configuration', async () => {
  const { db, sqlite, inbox } = fixture();
  assert.throws(() => createWebhookInbox({ db }), /CONFIGURATION_INVALID/);
  for (const options of [{ maxJobs: 0 }, { maxJobs: 21 }, { pageSize: 101 }, { leaseMs: 999 }, { maxAttempts: 11 }]) {
    await assert.rejects(reconcilePending({ db, providerFor: () => ({}), ...options }), /CONFIGURATION_INVALID/);
  }
  await assert.rejects(inbox.enqueue({ ...identity, environment: 'unknown' }, {}), /SCOPE_INVALID/);
  await assert.rejects(inbox.enqueue(identity, { value: 'x'.repeat(32768) }), /PAYLOAD_INVALID/);
  await inbox.enqueue(identity, { event: 123, timestamp: null, data: ['anything'] });
  assert.throws(() => sqlite.exec("UPDATE courier_webhook_inbox SET environment='unknown'"), /CHECK constraint/);
  assert.throws(() => sqlite.exec("UPDATE courier_webhook_inbox SET processing_status='paid'"), /CHECK constraint/);
  assert.throws(() => sqlite.exec("UPDATE courier_webhook_inbox SET payload_sha256='short'"), /CHECK constraint/);
  assert.throws(() => sqlite.exec('UPDATE courier_webhook_inbox SET ciphertext=NULL'), /NOT NULL/);
});
