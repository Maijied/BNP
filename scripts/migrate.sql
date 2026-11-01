-- BNP Shop cPanel MySQL Migration DDL
-- HostNF / cPanel MySQL Compatible Schema

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(40) UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  name VARCHAR(120) NOT NULL,
  shop_name VARCHAR(120) NULL,
  phone VARCHAR(20) NOT NULL,
  district VARCHAR(80) NOT NULL,
  address TEXT NOT NULL,
  model ENUM('A', 'B') NOT NULL,
  reg_number_bangla VARCHAR(80) NOT NULL,
  reg_number_english VARCHAR(80) NULL,
  quantity INT NOT NULL DEFAULT 1,
  bracket TINYINT(1) DEFAULT 0,
  unit_price INT NOT NULL,
  plate_total INT NOT NULL,
  bracket_total INT NOT NULL DEFAULT 0,
  delivery_charge INT NOT NULL,
  total INT NOT NULL,
  payment_status ENUM('pending_payment', 'verifying', 'paid', 'failed') DEFAULT 'pending_payment',
  payment_method VARCHAR(50) DEFAULT 'lorahost_bridge',
  lora_session_id VARCHAR(100) NULL,
  lora_trx_id VARCHAR(100) NULL,
  trx_note VARCHAR(255) NULL,
  status ENUM('new', 'confirmed', 'printed', 'shipped', 'delivered') DEFAULT 'new',
  notes TEXT NULL,
  INDEX idx_phone (phone),
  INDEX idx_order_number (order_number),
  INDEX idx_payment_status (payment_status),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  k VARCHAR(50) PRIMARY KEY,
  v TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Settings Seed
INSERT INTO settings (k, v) VALUES
  ('price_a', '380'),
  ('price_b', '450'),
  ('price_preorder_a', '300'),
  ('price_preorder_b', '380'),
  ('bracket_price', '80'),
  ('delivery_dhaka', '60'),
  ('delivery_outside', '120'),
  ('urgency_text', 'BRTA deadline: November 15 — order your compliant plate today'),
  ('hotline', '01632333221'),
  ('whatsapp', '01914-873925'),
  ('bridge_enabled', 'true')
ON DUPLICATE KEY UPDATE k=k;
