import { isAdmin, json } from "../admin-auth.js";

const validPayments = new Set(["unpaid", "pending", "paid", "failed", "refunded", "disputed"]);
const validFulfillment = new Set(["new", "verification", "production", "qc", "shipped", "delivered", "cancelled"]);
export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);
  if (!env.DB?.prepare) return json({ error: "Order database is not configured." }, 503);
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim().slice(0, 80);
    const payment = url.searchParams.get("payment_status") || "";
    const status = url.searchParams.get("status") || "";
    if ((payment && !validPayments.has(payment)) || (status && !validFulfillment.has(status))) {
      return json({ error: "Invalid filters." }, 400);
    }
    // All predicates are bound. Limit result size so the admin UI cannot dump unlimited PII.
    const sql = `SELECT o.id, o.order_number, o.created_at, o.customer_name AS name,
      o.customer_phone AS phone, o.district, o.delivery_address AS address,
      o.payment_status, o.fulfillment_status AS status, o.total_bdt AS total,
      o.delivery_bdt AS delivery_charge,
      i.plate_type, i.registration_bangla AS reg_number_bangla, i.quantity,
      i.bracket, i.unit_price_bdt AS unit_price, i.line_total_bdt AS line_total
      FROM orders o LEFT JOIN order_items i ON i.id = (
        SELECT id FROM order_items WHERE order_id = o.id ORDER BY created_at ASC LIMIT 1
      ) WHERE (? = '' OR o.order_number LIKE ? OR o.customer_phone LIKE ? OR i.registration_bangla LIKE ?)
      AND (? = '' OR o.payment_status = ?) AND (? = '' OR o.fulfillment_status = ?)
      ORDER BY o.created_at DESC LIMIT 100`;
    const like = `%${q}%`;
    const result = await env.DB.prepare(sql).bind(q, like, like, like, payment, payment, status, status).all();
    const orders = (result.results || []).map(o => ({
      ...o, model: o.plate_type === "scooter_front" ? "B" : "A",
      bracket: Boolean(o.bracket), shop_name: null, reg_number_english: null,
      plate_total: Number(o.unit_price || 0) * Number(o.quantity || 0),
      bracket_total: Number(o.line_total || 0) - Number(o.unit_price || 0) * Number(o.quantity || 0),
      payment_method: "lorahost_bridge", lora_session_id: null,
      lora_trx_id: null, trx_note: null, notes: null,
    }));
    return json({ orders });
  } catch {
    return json({ error: "Unable to read order records." }, 503);
  }
}

