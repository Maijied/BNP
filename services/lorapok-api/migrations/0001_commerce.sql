PRAGMA foreign_keys = ON;
CREATE TABLE platform_registrations (
 merchant_key TEXT NOT NULL, product_key TEXT NOT NULL, environment TEXT NOT NULL CHECK(environment IN ('sandbox','production')), enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN(0,1)),
 PRIMARY KEY(merchant_key,product_key,environment)
);
CREATE TABLE platform_api_clients (
 token_sha256 TEXT PRIMARY KEY CHECK(length(token_sha256)=64), merchant_key TEXT NOT NULL, product_key TEXT NOT NULL, environment TEXT NOT NULL, permissions_json TEXT NOT NULL CHECK(json_valid(permissions_json)), enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN(0,1)),
 FOREIGN KEY(merchant_key,product_key,environment) REFERENCES platform_registrations(merchant_key,product_key,environment)
);
CREATE TABLE commerce_catalog (
 merchant_key TEXT NOT NULL, product_key TEXT NOT NULL, environment TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN('product','shipping')), code TEXT NOT NULL, version INTEGER NOT NULL CHECK(version>0), active INTEGER NOT NULL CHECK(active IN(0,1)), data_json TEXT NOT NULL CHECK(json_valid(data_json)), updated_at INTEGER NOT NULL,
 PRIMARY KEY(merchant_key,product_key,environment,kind,code), FOREIGN KEY(merchant_key,product_key,environment) REFERENCES platform_registrations(merchant_key,product_key,environment)
);
CREATE TABLE commerce_catalog_versions (
 merchant_key TEXT NOT NULL, product_key TEXT NOT NULL, environment TEXT NOT NULL, kind TEXT NOT NULL, code TEXT NOT NULL, version INTEGER NOT NULL, data_json TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(merchant_key,product_key,environment,kind,code,version), FOREIGN KEY(merchant_key,product_key,environment,kind,code) REFERENCES commerce_catalog(merchant_key,product_key,environment,kind,code)
);
CREATE TABLE commerce_orders (
 merchant_key TEXT NOT NULL, product_key TEXT NOT NULL, environment TEXT NOT NULL, id TEXT NOT NULL, request_id TEXT NOT NULL, request_hash TEXT NOT NULL, order_number TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN('new','verification','cancelled')), payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status='unpaid'), version INTEGER NOT NULL DEFAULT 1 CHECK(version>0), currency TEXT NOT NULL CHECK(currency='BDT'), total_minor INTEGER NOT NULL CHECK(total_minor>=0 AND total_minor<=9007199254740991), snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 PRIMARY KEY(merchant_key,product_key,environment,id), UNIQUE(merchant_key,product_key,environment,request_id), UNIQUE(merchant_key,product_key,environment,order_number), FOREIGN KEY(merchant_key,product_key,environment) REFERENCES platform_registrations(merchant_key,product_key,environment)
);
CREATE INDEX commerce_orders_page ON commerce_orders(merchant_key,product_key,environment,created_at DESC,id DESC);
CREATE TABLE commerce_order_audit (
 merchant_key TEXT NOT NULL, product_key TEXT NOT NULL, environment TEXT NOT NULL, order_id TEXT NOT NULL, version INTEGER NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(merchant_key,product_key,environment,order_id,version), FOREIGN KEY(merchant_key,product_key,environment,order_id) REFERENCES commerce_orders(merchant_key,product_key,environment,id)
);
CREATE TRIGGER catalog_insert AFTER INSERT ON commerce_catalog BEGIN
 INSERT INTO commerce_catalog_versions VALUES(NEW.merchant_key,NEW.product_key,NEW.environment,NEW.kind,NEW.code,NEW.version,NEW.data_json,NEW.updated_at);
END;
CREATE TRIGGER catalog_update BEFORE UPDATE ON commerce_catalog BEGIN
 SELECT CASE WHEN NEW.merchant_key!=OLD.merchant_key OR NEW.product_key!=OLD.product_key OR NEW.environment!=OLD.environment OR NEW.kind!=OLD.kind OR NEW.code!=OLD.code OR NEW.version!=OLD.version+1 THEN RAISE(ABORT,'immutable_catalog_identity') END;
 INSERT INTO commerce_catalog_versions VALUES(NEW.merchant_key,NEW.product_key,NEW.environment,NEW.kind,NEW.code,NEW.version,NEW.data_json,NEW.updated_at);
END;
CREATE TRIGGER catalog_versions_no_update BEFORE UPDATE ON commerce_catalog_versions BEGIN SELECT RAISE(ABORT,'immutable_revision'); END;
CREATE TRIGGER catalog_versions_no_delete BEFORE DELETE ON commerce_catalog_versions BEGIN SELECT RAISE(ABORT,'immutable_revision'); END;
CREATE TRIGGER order_insert AFTER INSERT ON commerce_orders BEGIN
 INSERT INTO commerce_order_audit VALUES(NEW.merchant_key,NEW.product_key,NEW.environment,NEW.id,NEW.version,NEW.status,NEW.created_at);
END;
CREATE TRIGGER order_update BEFORE UPDATE ON commerce_orders BEGIN
 SELECT CASE WHEN NEW.merchant_key!=OLD.merchant_key OR NEW.product_key!=OLD.product_key OR NEW.environment!=OLD.environment OR NEW.id!=OLD.id OR NEW.request_id!=OLD.request_id OR NEW.request_hash!=OLD.request_hash OR NEW.order_number!=OLD.order_number OR NEW.snapshot_json!=OLD.snapshot_json OR NEW.total_minor!=OLD.total_minor OR NEW.currency!=OLD.currency OR NEW.created_at!=OLD.created_at OR NEW.payment_status!=OLD.payment_status OR NEW.version!=OLD.version+1 OR NOT ((OLD.status='new' AND NEW.status IN('verification','cancelled')) OR (OLD.status='verification' AND NEW.status='cancelled')) THEN RAISE(ABORT,'invalid_order_mutation') END;
 INSERT INTO commerce_order_audit VALUES(NEW.merchant_key,NEW.product_key,NEW.environment,NEW.id,NEW.version,NEW.status,NEW.updated_at);
END;
CREATE TRIGGER order_audit_no_update BEFORE UPDATE ON commerce_order_audit BEGIN SELECT RAISE(ABORT,'immutable_audit'); END;
CREATE TRIGGER order_audit_no_delete BEFORE DELETE ON commerce_order_audit BEGIN SELECT RAISE(ABORT,'immutable_audit'); END;
