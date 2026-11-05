-- No automatic attribution of historical shipments to a merchant/product.
-- Unscoped existing rows stay blocked until reviewed against provider evidence.
ALTER TABLE courier_shipments ADD COLUMN merchant_key TEXT;
ALTER TABLE courier_shipments ADD COLUMN product_key TEXT;
CREATE INDEX courier_shipments_scope ON courier_shipments(merchant_key, product_key, environment, order_id);
-- Receipt audit only, NOT a full event queue. Event schema remains to be verified.
-- Keep no raw webhook payload, customer data, auth headers or token material.
CREATE TABLE pathao_webhook_receipts (
  merchant_key TEXT NOT NULL,
  product_key TEXT NOT NULL,
  environment TEXT NOT NULL CHECK(environment IN ('sandbox','production')),
  payload_sha256 TEXT NOT NULL CHECK(length(payload_sha256) = 64),
  event_name TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (merchant_key, product_key, environment, payload_sha256)
);
