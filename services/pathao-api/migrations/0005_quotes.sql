CREATE TABLE courier_quotes (
  id TEXT PRIMARY KEY,
  merchant_key TEXT NOT NULL,
  product_key TEXT NOT NULL,
  environment TEXT NOT NULL CHECK(environment IN ('sandbox','production')),
  store_id INTEGER NOT NULL,
  city_id INTEGER NOT NULL,
  zone_id INTEGER NOT NULL,
  weight_kg_decimal TEXT NOT NULL,
  quote_json TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'estimate' CHECK(kind='estimate')
);
CREATE INDEX courier_quotes_scope ON courier_quotes(merchant_key,product_key,environment,observed_at);
