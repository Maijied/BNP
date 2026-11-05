-- AES-GCM ciphertext only. Retain rows/fences even when clearing token payloads.
-- An expired non-null owner is quarantined, not automatically reclaimed.
CREATE TABLE IF NOT EXISTS courier_tokens (
  namespace TEXT NOT NULL,
  token_key TEXT NOT NULL,
  owner TEXT,
  fence INTEGER NOT NULL DEFAULT 0 CHECK(fence >= 0),
  lease_until INTEGER NOT NULL DEFAULT 0,
  key_version TEXT,
  iv TEXT,
  ciphertext TEXT,
  PRIMARY KEY(namespace, token_key),
  CHECK ((key_version IS NULL AND iv IS NULL AND ciphertext IS NULL) OR
         (key_version IS NOT NULL AND iv IS NOT NULL AND ciphertext IS NOT NULL))
);
