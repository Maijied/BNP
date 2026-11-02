-- BNP Cloudflare D1 foundation. Apply to a NEW staging D1 database first.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  district TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BDT' CHECK(currency = 'BDT'),
  subtotal_bdt INTEGER NOT NULL CHECK(subtotal_bdt >= 0),
  delivery_bdt INTEGER NOT NULL CHECK(delivery_bdt >= 0),
  total_bdt INTEGER NOT NULL CHECK(total_bdt >= 0),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','pending','paid','failed','refunded','disputed')),
  fulfillment_status TEXT NOT NULL DEFAULT 'new' CHECK(fulfillment_status IN ('new','verification','production','qc','shipped','delivered','cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  plate_type TEXT NOT NULL CHECK(plate_type IN ('motorcycle_front','scooter_front','display_only')),
  registration_bangla TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 100),
  bracket INTEGER NOT NULL DEFAULT 0 CHECK(bracket IN (0,1)),
  unit_price_bdt INTEGER NOT NULL CHECK(unit_price_bdt >= 0),
  line_total_bdt INTEGER NOT NULL CHECK(line_total_bdt >= 0),
  rule_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS payment_attempts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  bridge_reference TEXT NOT NULL UNIQUE,
  bridge_session_id TEXT UNIQUE,
  amount_bdt INTEGER NOT NULL CHECK(amount_bdt > 0),
  status TEXT NOT NULL DEFAULT 'initiated' CHECK(status IN ('initiated','pending','paid','failed','expired','refunded')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attempt_order ON payment_attempts(order_id);
CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  bridge_event_id TEXT NOT NULL UNIQUE,
  attempt_id TEXT NOT NULL REFERENCES payment_attempts(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS order_status_history (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_history_order ON order_status_history(order_id,created_at);
CREATE TABLE IF NOT EXISTS production_jobs (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  state TEXT NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','cutting','qc','ready','cancelled')),
  operator_id TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- IMPORTANT: schema only. No order may be marked paid without a verified, deduplicated
-- bridge event AND matching amount/currency/reference, in a single transaction.
