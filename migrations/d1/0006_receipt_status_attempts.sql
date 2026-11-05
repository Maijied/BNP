-- Pages/auth DB only, never PLATFORM_DB or COURIER_DB. Apply to approved staging
-- first. Only keyed IP digests and counters; no customer data or receipt proofs.
CREATE TABLE IF NOT EXISTS receipt_status_attempts (
 fingerprint TEXT PRIMARY KEY CHECK(length(fingerprint)=64),
 window_start INTEGER NOT NULL,
 attempts INTEGER NOT NULL CHECK(attempts BETWEEN 1 AND 21)
);
CREATE INDEX IF NOT EXISTS receipt_status_window ON receipt_status_attempts(window_start);
