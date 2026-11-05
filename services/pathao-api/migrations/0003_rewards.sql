-- Provider evidence only; no public write route. Merchant/environment identity makes
-- replay protection and monthly caps shared across all products for that merchant.
CREATE TABLE IF NOT EXISTS pathao_reward_evidence (
  merchant_id TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  event_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('qualification', 'reversal', 'snapshot')),
  source TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  PRIMARY KEY (merchant_id, environment, event_id)
);
CREATE INDEX IF NOT EXISTS pathao_reward_evidence_month_read
  ON pathao_reward_evidence (merchant_id, environment, observed_at);
