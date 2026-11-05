-- Standalone courier DB only. No inferred webhook event contract or financial writes.
CREATE TABLE courier_webhook_inbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_key TEXT NOT NULL,
  product_key TEXT NOT NULL,
  environment TEXT NOT NULL CHECK(environment IN ('sandbox','production')),
  payload_sha256 TEXT NOT NULL CHECK(length(payload_sha256)=64),
  key_version TEXT NOT NULL,
  iv TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK(processing_status IN ('pending','reconciling','review_required')),
  review_reason TEXT,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  reconciled_at TEXT,
  UNIQUE(merchant_key,product_key,environment,payload_sha256)
);
CREATE INDEX courier_webhook_inbox_scope ON courier_webhook_inbox(merchant_key,product_key,environment,id);
CREATE TABLE courier_reconciliation_jobs (
  merchant_key TEXT NOT NULL,
  product_key TEXT NOT NULL,
  environment TEXT NOT NULL CHECK(environment IN ('sandbox','production')),
  requested_id INTEGER NOT NULL,
  completed_id INTEGER NOT NULL DEFAULT 0,
  target_id INTEGER,
  cursor_reference TEXT NOT NULL DEFAULT '',
  shipment_count INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  owner TEXT,
  fence INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  PRIMARY KEY(merchant_key,product_key,environment)
);
CREATE INDEX courier_reconciliation_pending ON courier_reconciliation_jobs(next_attempt_at,lease_until);
