-- Apply after 0001_orders.sql, first to staging. Only keyed hashes, never raw IPs.
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  ip_hash TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  failures INTEGER NOT NULL DEFAULT 0 CHECK(failures >= 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_admin_login_window ON admin_login_attempts(window_start);

