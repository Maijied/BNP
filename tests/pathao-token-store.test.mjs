import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createD1TokenStore, createTokenCipher } from '../services/pathao-api/src/token-store.js';

// Fixture keys, never operational credentials. All SQL runs in local memory.
const encryptionKey = Buffer.alloc(32, 17).toString('base64');
const otherKey = Buffer.alloc(32, 23).toString('base64');
const key = 'a'.repeat(64), secondKey = 'b'.repeat(64);
const entry = { accessToken: 'fixture-private-access', refreshToken: 'fixture-private-refresh', expiresAt: 9999999999999 };
function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../services/pathao-api/migrations/0002_tokens.sql', import.meta.url), 'utf8'));
  const db = { prepare(sql) {
    const statement = sqlite.prepare(sql); let args;
    return { bind(...values) { args = values; return this; }, async first() { return statement.get(...args) ?? null; }, async run() { return { meta: { changes: statement.run(...args).changes } }; } };
  } };
  const store = options => createD1TokenStore({ db, encryptionKey, keyVersion: 'v1', pollMs: 1, ...options });
  return { db, sqlite, store };
}
const write = (store, value = entry, cacheKey = key) => store.withLock(cacheKey, () => store.set(cacheKey, value));

test('configuration is explicit and strict; writes require ownership', async () => {
  const { db, store } = fixture();
  assert.throws(() => createD1TokenStore({ db }), /CONFIGURATION/);
  assert.throws(() => createD1TokenStore({ db, encryptionKey: 'bad', keyVersion: 'v1' }), /CONFIGURATION/);
  assert.throws(() => createD1TokenStore({ db, encryptionKey }), /CONFIGURATION/);
  assert.throws(() => createTokenCipher({ encryptionKey, keyVersion: 'v1', decryptionKeys: { v1: otherKey } }), /CONFIGURATION/);
  await assert.rejects(store().set(key, entry), /LOCK_REQUIRED/);
  await assert.rejects(store().delete(key), /LOCK_REQUIRED/);
  await assert.rejects(store().get('not-a-fingerprint'), /CACHE_KEY_INVALID/);
});

test('durable encrypted roundtrip, deletion retains fence and scoped AAD', async () => {
  const { sqlite, store } = fixture();
  const one = store(), two = store();
  await write(one);
  assert.deepEqual(await two.get(key), entry);
  const row = sqlite.prepare('SELECT * FROM courier_tokens').get();
  assert.ok(!JSON.stringify(row).includes(entry.accessToken));
  assert.ok(!JSON.stringify(row).includes(entry.refreshToken));
  assert.equal(row.owner, null);
  await two.withLock(key, () => two.delete(key));
  assert.equal(await one.get(key), undefined);
  assert.equal(sqlite.prepare('SELECT fence FROM courier_tokens').get().fence, 2);
  await write(one);
  const envelope = sqlite.prepare('SELECT ciphertext,iv FROM courier_tokens').get();
  assert.notEqual(envelope.iv, row.iv);
  assert.notEqual(envelope.ciphertext, row.ciphertext);
});

test('two isolates serialize refresh and reuse persisted token without duplicate provider call', async () => {
  const { store, sqlite } = fixture();
  const one = store(), two = store();
  let calls = 0, active = 0, maxActive = 0;
  const refresh = instance => instance.withLock(key, async () => {
    const cached = await instance.get(key);
    if (cached) return cached.accessToken;
    calls++; active++; maxActive = Math.max(active, maxActive);
    await new Promise(resolve => setTimeout(resolve, 20));
    await instance.set(key, entry); active--;
    return entry.accessToken;
  });
  assert.deepEqual(await Promise.all([refresh(one), refresh(two), refresh(one)]), Array(3).fill(entry.accessToken));
  assert.equal(calls, 1); assert.equal(maxActive, 1);
  assert.equal(sqlite.prepare('SELECT fence FROM courier_tokens').get().fence, 2);
});

test('wrong key, key version, ciphertext, IV, namespace and fingerprint fail closed', async () => {
  const { sqlite, store } = fixture();
  await write(store());
  await assert.rejects(store({ encryptionKey: otherKey }).get(key), /DECRYPTION_FAILED/);
  await assert.rejects(store({ keyVersion: 'v2', encryptionKey: otherKey }).get(key), /VERSION_UNAVAILABLE/);
  const original = sqlite.prepare('SELECT * FROM courier_tokens').get();
  sqlite.prepare('UPDATE courier_tokens SET ciphertext=?').run('AA'.repeat(32));
  await assert.rejects(store().get(key), /DECRYPTION_FAILED/);
  sqlite.prepare('UPDATE courier_tokens SET ciphertext=?, iv=?').run(original.ciphertext, Buffer.alloc(12).toString('base64'));
  await assert.rejects(store().get(key), /DECRYPTION_FAILED/);
  sqlite.prepare('UPDATE courier_tokens SET iv=?,namespace=?').run(original.iv, 'other');
  await assert.rejects(store({ namespace: 'other' }).get(key), /DECRYPTION_FAILED/);
  sqlite.prepare('UPDATE courier_tokens SET namespace=?,token_key=?').run('pathao', secondKey);
  await assert.rejects(store().get(secondKey), /DECRYPTION_FAILED/);
  sqlite.prepare('UPDATE courier_tokens SET token_key=?,key_version=?').run(key, 'v2');
  await assert.rejects(store({ keyVersion: 'v2' }).get(key), /DECRYPTION_FAILED/);
});

test('rotation reads exact previous version and rewrites only under valid lock', async () => {
  const { sqlite, store } = fixture();
  await write(store());
  const rotated = store({ encryptionKey: otherKey, keyVersion: 'v2', decryptionKeys: { v1: encryptionKey } });
  assert.deepEqual(await rotated.get(key), entry);
  await rotated.withLock(key, async () => rotated.set(key, await rotated.get(key)));
  assert.equal(sqlite.prepare('SELECT key_version FROM courier_tokens').get().key_version, 'v2');
  assert.deepEqual(await store({ encryptionKey: otherKey, keyVersion: 'v2' }).get(key), entry);
  await assert.rejects(store().get(key), /VERSION_UNAVAILABLE/);
});

test('lease expiry quarantines scope and rejects stale writes and successful returns', async () => {
  const { store, sqlite } = fixture(); const one = store(), two = store({ waitMs: 0 });
  await assert.rejects(one.withLock(key, async () => {
    sqlite.prepare('UPDATE courier_tokens SET lease_until=0').run();
    await assert.rejects(two.withLock(key, () => assert.fail('must not steal expired lease')), /REVIEW_REQUIRED/);
    await assert.rejects(one.set(key, entry), /LEASE_LOST/);
    await assert.rejects(one.delete(key), /LEASE_LOST/);
    return 'must not return';
  }), /LEASE_LOST/);
  await assert.rejects(two.withLock(key, () => {}), /REVIEW_REQUIRED/);
});

test('fence and owner CAS prevent old worker overwrite and release after ownership loss', async () => {
  const { store, sqlite } = fixture(); const one = store();
  await assert.rejects(one.withLock(key, async () => {
    sqlite.prepare("UPDATE courier_tokens SET owner='replacement',fence=fence+1").run();
    await assert.rejects(one.set(key, entry), /LEASE_LOST/);
    await assert.rejects(one.delete(key), /LEASE_LOST/);
  }), /LEASE_LOST/);
  assert.equal(sqlite.prepare('SELECT owner FROM courier_tokens').get().owner, 'replacement');
});

test('failed refresh metadata is encrypted and callback errors quarantine safely', async () => {
  const { store, sqlite } = fixture(); const one = store();
  await write(one);
  await assert.rejects(one.withLock(key, async () => {
    await one.set(key, { failedRefresh: true });
    throw new Error('fixture provider failure');
  }), /fixture provider failure/);
  assert.deepEqual(await store().get(key), { failedRefresh: true });
  assert.ok(!JSON.stringify(sqlite.prepare('SELECT * FROM courier_tokens').get()).includes('failedRefresh'));
  await assert.rejects(store().withLock(key, () => {}), /REVIEW_REQUIRED/);
});

test('bounded contention does not execute callback or change live owner', async () => {
  const { store } = fixture(); const one = store(), two = store({ waitMs: 5 });
  await one.withLock(key, async () => {
    await assert.rejects(two.withLock(key, () => assert.fail('busy callback ran')), /LOCK_BUSY/);
    await one.set(key, entry);
  });
  assert.deepEqual(await two.get(key), entry);
});

test('database errors never fall back to memory or plaintext', async () => {
  const broken = createD1TokenStore({ db: { prepare() { throw new Error('sensitive database details'); } }, encryptionKey, keyVersion: 'v1' });
  await assert.rejects(broken.get(key), { message: 'TOKEN_STORAGE_UNAVAILABLE' });
  await assert.rejects(broken.withLock(key, () => assert.fail('must not run')), { message: 'TOKEN_STORAGE_UNAVAILABLE' });
});

test('shared cipher authenticates credential context and validates raw key length', async () => {
  const cipher = createTokenCipher({ encryptionKey: new Uint8Array(32).fill(17), keyVersion: 'v1' });
  const sealed = await cipher.seal({ password: 'fixture' }, ['credentials', 'merchant']);
  assert.deepEqual(await cipher.open(sealed, ['credentials', 'merchant']), { password: 'fixture' });
  await assert.rejects(cipher.open(sealed, ['tokens', 'merchant']), /DECRYPTION_FAILED/);
  assert.throws(() => createTokenCipher({ encryptionKey: new Uint8Array(16), keyVersion: 'v1' }), /CONFIGURATION_INVALID/);
});

test('failed stale callback cannot quarantine a replacement owner', async () => {
  const { store, sqlite } = fixture(); const one = store();
  await assert.rejects(one.withLock(key, async () => {
    sqlite.prepare("UPDATE courier_tokens SET owner='replacement',fence=fence+1,lease_until=9999999999999").run();
    throw new Error('fixture stale callback');
  }), /fixture stale callback/);
  const replacement = sqlite.prepare('SELECT owner,lease_until FROM courier_tokens').get();
  assert.equal(replacement.owner, 'replacement');
  assert.equal(replacement.lease_until, 9999999999999);
});

test('authenticated invalid token content is rejected without password fallback', async () => {
  const { store, sqlite } = fixture();
  await write(store());
  const cipher = createTokenCipher({ encryptionKey, keyVersion: 'v1' });
  const envelope = await cipher.seal({ arbitrary: 'not-a-token' }, ['tokens', 'pathao', key]);
  sqlite.prepare('UPDATE courier_tokens SET iv=?,ciphertext=?').run(envelope.iv, envelope.ciphertext);
  await assert.rejects(store().get(key), /TOKEN_ENTRY_INVALID/);
});

test('namespace and fingerprint independently scope durable locks', async () => {
  const { store } = fixture(); const one = store(), otherNamespace = store({ namespace: 'other' }), two = store();
  await one.withLock(key, async () => {
    await write(otherNamespace);
    await write(two, entry, secondKey);
    await one.set(key, { ...entry, accessToken: 'fixture-first-scope' });
  });
  assert.equal((await otherNamespace.get(key)).accessToken, entry.accessToken);
  assert.equal((await two.get(secondKey)).accessToken, entry.accessToken);
  assert.equal((await one.get(key)).accessToken, 'fixture-first-scope');
});
