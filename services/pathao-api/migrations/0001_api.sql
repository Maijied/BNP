-- Standalone courier DB, never run against the BNP orders database.
CREATE TABLE courier_merchants (
  merchant_key TEXT NOT NULL,
  product_key TEXT NOT NULL,
  environment TEXT NOT NULL CHECK(environment IN ('sandbox','production')),
  encrypted_config TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  PRIMARY KEY(merchant_key,product_key,environment)
);
-- The API token is a random 256-bit credential. Store only its SHA-256 fingerprint.
CREATE TABLE courier_api_clients (
  token_sha256 TEXT PRIMARY KEY CHECK(length(token_sha256)=64),
  merchant_key TEXT NOT NULL,
  product_key TEXT NOT NULL,
  environment TEXT NOT NULL CHECK(environment IN ('sandbox','production')),
  permissions_json TEXT NOT NULL,
  encrypted_dispatch_key TEXT,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  FOREIGN KEY(merchant_key,product_key,environment) REFERENCES courier_merchants(merchant_key,product_key,environment)
);
CREATE TABLE courier_webhook_routes (
  endpoint_id TEXT PRIMARY KEY,
  merchant_key TEXT NOT NULL,
  product_key TEXT NOT NULL,
  environment TEXT NOT NULL,
  encrypted_secret TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  FOREIGN KEY(merchant_key,product_key,environment) REFERENCES courier_merchants(merchant_key,product_key,environment)
);
CREATE TABLE courier_operations (
  merchant_key TEXT NOT NULL,
  product_key TEXT NOT NULL,
  environment TEXT NOT NULL CHECK(environment IN ('sandbox','production')),
  kind TEXT NOT NULL CHECK(kind IN ('shipment','store')),
  reference TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  authorization_order_id TEXT,
  state TEXT NOT NULL CHECK(state IN ('submitting','confirmed','unknown')),
  consignment_id TEXT,
  provider_status TEXT,
  normalized_status TEXT,
  status_checked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(merchant_key,product_key,environment,kind,reference),
  UNIQUE(merchant_key,product_key,environment,kind,intent_id),
  UNIQUE(merchant_key,product_key,environment,kind,authorization_order_id),
  UNIQUE(merchant_key,environment,consignment_id)
);
CREATE TABLE courier_webhook_receipts (
  merchant_key TEXT NOT NULL,
  product_key TEXT NOT NULL,
  environment TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL,
  event_name TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(merchant_key,product_key,environment,payload_sha256)
);
