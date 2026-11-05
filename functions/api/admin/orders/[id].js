import { isAdmin, isSameOrigin, json } from "../../../_lib/admin-auth.js";

import { settlementPredicate } from "../../../_lib/shipment-store.js";

const allowed = new Set(["new", "verification", "production", "qc", "shipped", "delivered", "cancelled"]);
const next = {
  new: new Set(["verification", "cancelled"]),
  verification: new Set(["production", "cancelled"]),
  production: new Set(["qc", "cancelled"]),
  qc: new Set(["shipped", "production"]),
  shipped: new Set(["delivered"]),
  delivered: new Set([]),
  cancelled: new Set([]),
};

export async function onRequestPatch({ request, env, params }) {
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);
  if (!isSameOrigin(request)) return json({ error: "Cross-origin write denied." }, 403);
  if (!env.DB?.prepare || !env.DB?.batch) return json({ error: "Order database is not configured." }, 503);
  const id = params?.id;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Invalid order ID." }, 400);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400); }
  if (!body || Object.keys(body).some(k => k !== "status") || !allowed.has(body.status)) {
    return json({ error: "Only fulfillment status can be changed here. Payment status is webhook-verified." }, 400);
  }
  try {
    const before = await env.DB.prepare("SELECT fulfillment_status, payment_status FROM orders WHERE id = ?").bind(id).first();
    if (!before) return json({ error: "Order not found." }, 404);
    if (!next[before.fulfillment_status]?.has(body.status)) return json({ error: "Invalid fulfillment transition." }, 409);
    if (["production", "qc", "shipped", "delivered"].includes(body.status) && before.payment_status !== "paid") {
      return json({ error: "Verified payment is required before production or dispatch." }, 409);
    }
    if (["shipped", "delivered"].includes(body.status)) {
      const shipment = await env.DB.prepare(`SELECT 1 AS confirmed FROM orders o
        JOIN courier_shipments c ON c.order_id = o.id
        WHERE o.id = ? AND ${settlementPredicate} AND c.state = 'created'
        AND c.environment = 'production' AND c.consignment_id IS NOT NULL`).bind(id).first();
      if (!shipment) return json({ error: "A confirmed production Pathao booking and verified settlement are required." }, 409);
    }
    const actor = env.ADMIN_EMAIL.toLowerCase();
    // D1 batch statements execute in one transaction; changes() applies to the preceding UPDATE.
    const results = await env.DB.batch([
      env.DB.prepare(`UPDATE orders AS o SET fulfillment_status = ?, updated_at = datetime('now') WHERE id = ? AND fulfillment_status = ?
        AND (? NOT IN ('production','qc','shipped','delivered') OR payment_status = 'paid')
        AND (? NOT IN ('shipped','delivered') OR (${settlementPredicate} AND EXISTS (
          SELECT 1 FROM courier_shipments c WHERE c.order_id = o.id AND c.state = 'created'
          AND c.environment = 'production' AND c.consignment_id IS NOT NULL)))`)
        .bind(body.status, id, before.fulfillment_status, body.status, body.status),
      env.DB.prepare("INSERT INTO order_status_history (id, order_id, from_status, to_status, actor_type, actor_id, reason) SELECT ?, ?, ?, ?, 'admin', ?, 'admin dashboard' WHERE changes() = 1")
        .bind(crypto.randomUUID(), id, before.fulfillment_status, body.status, actor),
    ]);
    if (results[0]?.meta?.changes !== 1) return json({ error: "Order changed concurrently; reload and retry." }, 409);
    return json({ success: true, status: body.status });
  } catch {
    return json({ error: "Could not update fulfillment status." }, 503);
  }
}

