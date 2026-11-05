// Server-only encrypted D1 persistence. No plaintext fallback or automatic key guessing.
const NOW_SQL = "CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)";
const textEncoder = new TextEncoder();
export class TokenStoreError extends Error {
  constructor(code) { super(code); this.code = code; this.status = 503; }
}
const fail = code => new TokenStoreError(code);
const versionOK = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(value);
const toBase64 = bytes => btoa(String.fromCharCode(...bytes));
function fromBase64(value) {
  if (typeof value !== 'string' || value.length > 100000 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw fail('TOKEN_CIPHER_INVALID');
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}
function keyBytes(value) {
  let bytes;
  try { bytes = value instanceof Uint8Array ? new Uint8Array(value) : fromBase64(value); } catch { throw fail('TOKEN_KEY_CONFIGURATION_INVALID'); }
  if (bytes.length !== 32) throw fail('TOKEN_KEY_CONFIGURATION_INVALID');
  return bytes;
}
/** Rotation: new writes use keyVersion; reads require the exact recorded version in
 * decryptionKeys. Retain old keys until all rows have been explicitly rewritten.
 * Removing a key fails closed; it never clears tokens or starts a password grant. */
export function createTokenCipher({ encryptionKey, keyVersion, decryptionKeys = {} } = {}) {
  if (!versionOK(keyVersion) || !decryptionKeys || typeof decryptionKeys !== 'object' || Array.isArray(decryptionKeys)) throw fail('TOKEN_KEY_CONFIGURATION_INVALID');
  const keys = new Map([[keyVersion, keyBytes(encryptionKey)]]);
  for (const [version, value] of Object.entries(decryptionKeys)) {
    if (!versionOK(version) || version === keyVersion) throw fail('TOKEN_KEY_CONFIGURATION_INVALID');
    keys.set(version, keyBytes(value));
  }
  const imported = new Map();
  async function keyFor(version) {
    if (!keys.has(version)) throw fail('TOKEN_KEY_VERSION_UNAVAILABLE');
    if (!imported.has(version)) imported.set(version, crypto.subtle.importKey('raw', keys.get(version), 'AES-GCM', false, ['encrypt', 'decrypt']));
    return imported.get(version);
  }
  function aad(context, version) {
    if (!Array.isArray(context) || !context.length || context.some(v => typeof v !== 'string' || !v.length || v.length > 1000)) throw fail('TOKEN_CIPHER_CONTEXT_INVALID');
    return textEncoder.encode(JSON.stringify(['courier-aes-gcm', 1, ...context, version]));
  }
  return Object.freeze({
    async seal(value, context) {
      const plaintext = JSON.stringify(value);
      if (!plaintext || textEncoder.encode(plaintext).byteLength > 32768) throw fail('TOKEN_ENTRY_INVALID');
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad(context, keyVersion), tagLength: 128 }, await keyFor(keyVersion), textEncoder.encode(plaintext));
      return { keyVersion, iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) };
    },
    async open(envelope, context) {
      if (!envelope || !versionOK(envelope.keyVersion)) throw fail('TOKEN_CIPHER_INVALID');
      const key = await keyFor(envelope.keyVersion);
      try {
        const iv = fromBase64(envelope.iv), ciphertext = fromBase64(envelope.ciphertext);
        if (iv.length !== 12 || ciphertext.length < 16) throw new Error();
        const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad(context, envelope.keyVersion), tagLength: 128 }, key, ciphertext);
        return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext));
      } catch { throw fail('TOKEN_DECRYPTION_FAILED'); }
    },
  });
}
function validateEntry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw fail('TOKEN_ENTRY_INVALID');
  if (value.failedRefresh === true && Object.keys(value).length === 1) return value;
  const token = v => typeof v === 'string' && v.length > 0 && v.length <= 8192;
  if (Object.keys(value).some(k => !['accessToken', 'refreshToken', 'expiresAt'].includes(k)) ||
      !token(value.accessToken) || !Number.isFinite(value.expiresAt) || value.expiresAt < 0 ||
      (value.refreshToken !== undefined && !token(value.refreshToken))) throw fail('TOKEN_ENTRY_INVALID');
  return value;
}
/** Leases are NOT automatically stolen on expiry: a paused worker may still be
 * refreshing at the provider, which cannot fence requests. Expiry quarantines the
 * scope until an operator establishes the old operation ended and reconciles its
 * provider outcome. Never delete/reset a lease blindly. This deliberately trades
 * availability for no concurrent refresh. Fences remain monotonic across releases.
 * All writes require withLock; one instance coalesces callers for the same key.
 * D1 atomic SQL is authoritative; no correctness reliance on isolate wall clocks.
 * Do not use read replicas: first-primary sessions enforce read-after-write. */
export function createD1TokenStore({ db, encryptionKey, keyVersion, decryptionKeys = {}, namespace = 'pathao', leaseMs = 60000, waitMs = 2000, pollMs = 50 } = {}) {
  if (!db?.prepare || typeof namespace !== 'string' || !/^[a-zA-Z0-9:_-]{1,160}$/.test(namespace) ||
      !Number.isSafeInteger(leaseMs) || leaseMs < 1000 || leaseMs > 300000 ||
      !Number.isSafeInteger(waitMs) || waitMs < 0 || waitMs > 30000 ||
      !Number.isSafeInteger(pollMs) || pollMs < 1 || pollMs > 1000) throw fail('TOKEN_STORE_CONFIGURATION_INVALID');
  const cipher = createTokenCipher({ encryptionKey, keyVersion, decryptionKeys });
  const database = typeof db.withSession === 'function' ? db.withSession('first-primary') : db;
  const active = new Map(), pending = new Map();
  function checkKey(key) { if (typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key)) throw fail('TOKEN_CACHE_KEY_INVALID'); }
  const statement = (sql, ...args) => database.prepare(sql).bind(...args);
  async function run(sql, ...args) { try { return await statement(sql, ...args).run(); } catch { throw fail('TOKEN_STORAGE_UNAVAILABLE'); } }
  async function first(sql, ...args) { try { return await statement(sql, ...args).first(); } catch { throw fail('TOKEN_STORAGE_UNAVAILABLE'); } }
  async function ownedWrite(key, envelope) {
    checkKey(key);
    const lease = active.get(key);
    if (!lease) throw fail('TOKEN_LOCK_REQUIRED');
    const result = await run(`UPDATE courier_tokens SET key_version=?, iv=?, ciphertext=? WHERE namespace=? AND token_key=? AND owner=? AND fence=? AND lease_until > ${NOW_SQL}`,
      envelope?.keyVersion ?? null, envelope?.iv ?? null, envelope?.ciphertext ?? null, namespace, key, lease.owner, lease.fence);
    if (result?.meta?.changes !== 1) throw fail('TOKEN_LEASE_LOST');
  }
  async function acquire(key) {
    const owner = crypto.randomUUID(), deadline = Date.now() + waitMs;
    for (;;) {
      const row = await first(`INSERT INTO courier_tokens(namespace,token_key,owner,fence,lease_until) VALUES(?,?,?,1,${NOW_SQL}+?)
        ON CONFLICT(namespace,token_key) DO UPDATE SET owner=excluded.owner,fence=courier_tokens.fence+1,lease_until=excluded.lease_until
        WHERE courier_tokens.owner IS NULL RETURNING fence`, namespace, key, owner, leaseMs);
      if (row) return { owner, fence: row.fence };
      const held = await first(`SELECT owner, lease_until <= ${NOW_SQL} AS expired FROM courier_tokens WHERE namespace=? AND token_key=?`, namespace, key);
      if (held?.owner && held.expired) throw fail('TOKEN_LEASE_REVIEW_REQUIRED');
      if (Date.now() >= deadline) throw fail('TOKEN_LOCK_BUSY');
      await new Promise(resolve => setTimeout(resolve, Math.min(pollMs, Math.max(1, deadline - Date.now()))));
    }
  }
  return Object.freeze({
    async get(key) {
      checkKey(key);
      const row = await first('SELECT key_version,iv,ciphertext FROM courier_tokens WHERE namespace=? AND token_key=?', namespace, key);
      if (!row || (row.ciphertext === null && row.iv === null && row.key_version === null)) return undefined;
      return validateEntry(await cipher.open({ keyVersion: row.key_version, iv: row.iv, ciphertext: row.ciphertext }, ['tokens', namespace, key]));
    },
    async set(key, entry) { checkKey(key); await ownedWrite(key, await cipher.seal(validateEntry(entry), ['tokens', namespace, key])); },
    async delete(key) { await ownedWrite(key, null); },
    async withLock(key, operation) {
      checkKey(key);
      if (typeof operation !== 'function') throw fail('TOKEN_OPERATION_INVALID');
      if (pending.has(key)) return pending.get(key);
      const task = (async () => {
        const lease = await acquire(key);
        active.set(key, lease);
        let result, operationError, failed = false;
        try { result = await operation(); } catch (error) { failed = true; operationError = error; }
        finally { active.delete(key); }
        // A failed callback may have reached the provider. Quarantine rather than
        // retrying an ambiguous grant. Persisted failedRefresh remains encrypted.
        if (failed) {
          await run(`UPDATE courier_tokens SET lease_until=0 WHERE namespace=? AND token_key=? AND owner=? AND fence=?`, namespace, key, lease.owner, lease.fence);
          throw operationError;
        }
        // Even a successful callback cannot return an access token after lease loss.
        const released = await run(`UPDATE courier_tokens SET owner=NULL,lease_until=0 WHERE namespace=? AND token_key=? AND owner=? AND fence=? AND lease_until > ${NOW_SQL}`,
          namespace, key, lease.owner, lease.fence);
        if (released?.meta?.changes !== 1) throw fail('TOKEN_LEASE_LOST');
        return result;
      })();
      pending.set(key, task);
      try { return await task; } finally { pending.delete(key); }
    },
  });
}
