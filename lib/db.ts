import mysql from "mysql2/promise";
import { OrderRecord, StoreSettings, OrderStatus, PaymentStatus } from "@/lib/types";

// In-memory fallback for local preview / environments without active MySQL
const memStore = {
  orders: new Map<string, OrderRecord>(),
  settings: new Map<string, string>([
    ["price_a", "380"],
    ["price_b", "450"],
    ["price_preorder_a", "300"],
    ["price_preorder_b", "380"],
    ["bracket_price", "80"],
    ["delivery_dhaka", "60"],
    ["delivery_outside", "120"],
    ["urgency_text", "BRTA deadline: November 15 — order your compliant plate today"],
    ["hotline", "01632333221"],
    ["whatsapp", "01914-873925"],
    ["bridge_enabled", "true"],
  ]),
};

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool | null {
  if (pool) return pool;

  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE || "bnp_shop";
  const port = Number(process.env.MYSQL_PORT) || 3306;

  if (!host || !user) {
    return null;
  }

  try {
    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
    return pool;
  } catch (err) {
    console.warn("MySQL pool initialization failed, using memory store:", err);
    return null;
  }
}

/**
 * Executes a parameterized SQL query with graceful fallback.
 */
export async function dbQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const p = getPool();
  if (p) {
    try {
      const [rows] = await p.execute(sql, params);
      return rows as T[];
    } catch (err) {
      console.error("Database query failed:", err);
      throw err;
    }
  }
  return [];
}

/**
 * Fetches dynamic store settings from the settings table.
 */
export async function getStoreSettings(): Promise<StoreSettings> {
  const p = getPool();
  const settingsMap = new Map<string, string>(memStore.settings);

  if (p) {
    try {
      const [rows] = await p.query<mysql.RowDataPacket[]>("SELECT k, v FROM settings");
      for (const row of rows) {
        settingsMap.set(row.k, row.v);
      }
    } catch (err) {
      console.warn("Could not query settings table, using defaults:", err);
    }
  }

  return {
    price_a: Number(settingsMap.get("price_a")) || 380,
    price_b: Number(settingsMap.get("price_b")) || 450,
    price_preorder_a: Number(settingsMap.get("price_preorder_a")) || 300,
    price_preorder_b: Number(settingsMap.get("price_preorder_b")) || 380,
    bracket_price: Number(settingsMap.get("bracket_price")) || 80,
    delivery_dhaka: Number(settingsMap.get("delivery_dhaka")) || 60,
    delivery_outside: Number(settingsMap.get("delivery_outside")) || 120,
    urgency_text: settingsMap.get("urgency_text") || "BRTA deadline: November 15 — order your compliant plate today",
    hotline: settingsMap.get("hotline") || "01632333221",
    whatsapp: settingsMap.get("whatsapp") || "01914-873925",
  };
}

/**
 * Updates a setting value.
 */
export async function updateStoreSetting(key: string, value: string): Promise<void> {
  memStore.settings.set(key, value);
  const p = getPool();
  if (p) {
    await p.execute(
      "INSERT INTO settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)",
      [key, value]
    );
  }
}

/**
 * Inserts a new order record into the database.
 */
export async function insertOrder(order: Omit<OrderRecord, "id" | "created_at">): Promise<OrderRecord> {
  const p = getPool();
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  if (p) {
    const [result] = await p.execute<mysql.ResultSetHeader>(
      `INSERT INTO orders (
        order_number, name, shop_name, phone, district, address, model,
        reg_number_bangla, reg_number_english, quantity, bracket, unit_price,
        plate_total, bracket_total, delivery_charge, total, payment_status,
        payment_method, lora_session_id, lora_trx_id, trx_note, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.order_number,
        order.name,
        order.shop_name,
        order.phone,
        order.district,
        order.address,
        order.model,
        order.reg_number_bangla,
        order.reg_number_english || null,
        order.quantity,
        order.bracket ? 1 : 0,
        order.unit_price,
        order.plate_total,
        order.bracket_total,
        order.delivery_charge,
        order.total,
        order.payment_status,
        order.payment_method,
        order.lora_session_id || null,
        order.lora_trx_id || null,
        order.trx_note || null,
        order.status,
        order.notes || null,
      ]
    );

    return {
      ...order,
      id: String(result.insertId),
      created_at: now,
    };
  }

  // Fallback memory insertion
  const id = memStore.orders.size + 1;
  const record: OrderRecord = {
    ...order,
    id: String(id),
    created_at: now,
  };
  memStore.orders.set(order.order_number, record);
  return record;
}

/**
 * Retrieves an order by order_number.
 */
export async function getOrderByNumber(orderNumber: string): Promise<OrderRecord | null> {
  const p = getPool();
  if (p) {
    const [rows] = await p.execute<mysql.RowDataPacket[]>(
      "SELECT * FROM orders WHERE order_number = ? LIMIT 1",
      [orderNumber]
    );
    if (rows.length > 0) {
      const r = rows[0];
      return {
        ...r,
        bracket: Boolean(r.bracket),
      } as OrderRecord;
    }
    return null;
  }

  return memStore.orders.get(orderNumber) || null;
}

/**
 * Updates order payment status and transaction references.
 */
export async function updateOrderPayment(
  orderNumber: string,
  paymentStatus: PaymentStatus,
  loraTrxId?: string,
  sessionStatus?: OrderStatus
): Promise<boolean> {
  const p = getPool();
  if (p) {
    const statusSql = sessionStatus ? ", status = ?" : "";
    const params: any[] = [paymentStatus];

    let updateFields = "payment_status = ?";
    if (loraTrxId) {
      updateFields += ", lora_trx_id = ?";
      params.push(loraTrxId);
    }
    if (sessionStatus) {
      updateFields += ", status = ?";
      params.push(sessionStatus);
    }
    params.push(orderNumber);

    const [res] = await p.execute<mysql.ResultSetHeader>(
      `UPDATE orders SET ${updateFields} WHERE order_number = ?`,
      params
    );
    return res.affectedRows > 0;
  }

  const existing = memStore.orders.get(orderNumber);
  if (existing) {
    existing.payment_status = paymentStatus;
    if (loraTrxId) existing.lora_trx_id = loraTrxId;
    if (sessionStatus) existing.status = sessionStatus;
    memStore.orders.set(orderNumber, existing);
    return true;
  }
  return false;
}
