-- Apply to staging first. No paid flag is backfilled into verified settlement evidence.
-- The future authenticated payment webhook MUST insert proof in the SAME transaction
-- as verified event insertion and order/attempt settlement, after amount/currency/reference checks.
CREATE TABLE IF NOT EXISTS payment_settlements (
  order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE RESTRICT,
  attempt_id TEXT NOT NULL UNIQUE REFERENCES payment_attempts(id) ON DELETE RESTRICT,
  event_id TEXT NOT NULL UNIQUE REFERENCES payment_events(id) ON DELETE RESTRICT,
  amount_bdt INTEGER NOT NULL CHECK(amount_bdt > 0),
  currency TEXT NOT NULL CHECK(currency = 'BDT'),
  bridge_reference TEXT NOT NULL,
  verified_at TEXT NOT NULL CHECK(length(trim(verified_at)) > 0)
);
CREATE TABLE IF NOT EXISTS courier_shipments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL DEFAULT 'pathao' CHECK(provider = 'pathao'),
  environment TEXT NOT NULL CHECK(environment IN ('sandbox','production')),
  store_id INTEGER NOT NULL CHECK(store_id > 0),
  state TEXT NOT NULL CHECK(state IN ('submitting','created','unknown')),
  consignment_id TEXT UNIQUE,
  provider_status TEXT,
  city_id INTEGER NOT NULL CHECK(city_id > 0),
  zone_id INTEGER NOT NULL CHECK(zone_id > 0),
  area_id INTEGER NOT NULL CHECK(area_id > 0),
  item_weight REAL NOT NULL CHECK(item_weight BETWEEN 0.5 AND 10),
  amount_to_collect INTEGER NOT NULL DEFAULT 0 CHECK(amount_to_collect = 0),
  request_hash TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_checked_at TEXT,
  CHECK(state != 'created' OR (consignment_id IS NOT NULL AND length(consignment_id) > 0))
);
-- Never automatically release/reuse an unknown or abandoned submitting claim.
-- A provider booking may exist even when its response or the D1 update was lost.
