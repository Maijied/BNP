-- One non-idempotent store submission per client request ID, scoped server-side.
-- Do not clear submitting/unknown rows automatically; reconcile with Pathao first.
CREATE TABLE pathao_store_requests (
  merchant_key TEXT NOT NULL,
  product_key TEXT NOT NULL,
  environment TEXT NOT NULL CHECK(environment IN ('sandbox','production')),
  request_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('submitting','submitted','unknown')),
  requested_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (merchant_key, product_key, environment, request_id)
);
