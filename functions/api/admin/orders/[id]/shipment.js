import { isAdmin, isSameOrigin, json } from "../../../../_lib/admin-auth.js";
import { createPathaoClient, dispatchEnabled, shipmentInput, shipmentPayload, PathaoError } from "../../../../_lib/pathao.js";
import { readOrder, readShipment, claimShipment } from "../../../../_lib/shipment-store.js";
async function guard({ request, env, params }, write = false) {
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);
  if (write && !isSameOrigin(request)) return json({ error: "Cross-origin write denied." }, 403);
  if (!env.DB?.prepare) return json({ error: "Order database is not configured." }, 503);
  if (typeof params?.id !== "string" || !/^[0-9a-f-]{36}$/i.test(params.id)) return json({ error: "Invalid order ID." }, 400);
}
export async function onRequestGet(context) {
  const denied = await guard(context); if (denied) return denied;
  const { env, params } = context;
  try {
    const order = await readOrder(env.DB, params.id);
    if (!order) return json({ error: "Order not found." }, 404);
    return json({ shipment: await readShipment(env.DB, params.id), eligible: Boolean(order.eligible), enabled: dispatchEnabled(env) });
  } catch { return json({ error: "Shipment storage is unavailable; verify D1 migrations." }, 503); }
}
export async function onRequestPost(context) {
  const denied = await guard(context, true); if (denied) return denied;
  const { request, env, params } = context;
  if (!dispatchEnabled(env)) return json({ error: "Pathao dispatch is disabled or not configured." }, 503);
  let input;
  try { input = shipmentInput(await request.json()); }
  catch (error) { return json({ error: error instanceof PathaoError ? error.message : "Invalid JSON." }, 400); }
  let claimId;
  try {
    const existing = await readShipment(env.DB, params.id);
    if (existing) return json({ error: "A shipment claim already exists. Reconcile uncertain bookings with Pathao; do not book again.", shipment: existing }, 409);
    const order = await readOrder(env.DB, params.id);
    if (!order) return json({ error: "Order not found." }, 404);
    if (!order.eligible) return json({ error: "QC and a durable verified prepaid settlement are required." }, 409);
    const client = createPathaoClient(env);
    const payload = shipmentPayload(order, input, client.config.storeId);
    await client.validateDestination(input); // No dispatch yet. Auth and geography can fail safely.
    const requestHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payload)))))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    const id = crypto.randomUUID();
    const result = await claimShipment(env.DB, { id, orderId: params.id, config: client.config, input, requestHash, actor: env.ADMIN_EMAIL.toLowerCase() });
    if (result.meta?.changes !== 1) return json({ error: "Order is no longer eligible or another dispatch already claimed it." }, 409);
    claimId = id;
    // Recheck after claim and immediately before the provider call. Refunds after this
    // point require operations reconciliation; a remote API and D1 cannot be atomic.
    if (!(await readOrder(env.DB, params.id))?.eligible) throw new PathaoError("Order changed before dispatch.");
    const booking = await client.createShipment(payload);
    const saved = await env.DB.prepare(`UPDATE courier_shipments SET state = 'created', consignment_id = ?, provider_status = ?, updated_at = datetime('now')
      WHERE id = ? AND state = 'submitting'`).bind(booking.consignment_id, booking.provider_status, id).run();
    if (saved.meta?.changes !== 1) throw new PathaoError("Booking could not be recorded.");
    return json({ shipment: await readShipment(env.DB, params.id) }, 201);
  } catch (error) {
    if (claimId) {
      // Do not echo upstream errors: they may contain PII, credentials or raw payloads.
      try { await env.DB.prepare("UPDATE courier_shipments SET state = 'unknown', updated_at = datetime('now') WHERE id = ? AND state = 'submitting'").bind(claimId).run(); } catch { /* Persisted submitting claim still blocks duplicates. */ }
      return json({ error: "Booking outcome needs reconciliation in Pathao. Do not retry or create another shipment." }, 202);
    }
    return json({ error: error instanceof PathaoError ? error.message : "Shipment service unavailable." }, error instanceof PathaoError ? error.status : 503);
  }
}
export async function onRequestPatch(context) {
  const denied = await guard(context, true); if (denied) return denied;
  const { env, params } = context;
  try {
    const shipment = await readShipment(env.DB, params.id);
    if (!shipment?.consignment_id || shipment.state !== "created") return json({ error: "No confirmed consignment to track. Reconcile uncertain bookings in Pathao." }, 409);
    const client = createPathaoClient(env);
    if (client.config.environment !== shipment.environment) return json({ error: "Shipment belongs to a different Pathao environment." }, 409);
    const status = await client.tracking(shipment.consignment_id);
    const saved = await env.DB.prepare("UPDATE courier_shipments SET provider_status = ?, last_checked_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND consignment_id = ?")
      .bind(status, shipment.id, shipment.consignment_id).run();
    if (saved.meta?.changes !== 1) throw new PathaoError("Tracking record changed concurrently.");
    return json({ shipment: await readShipment(env.DB, params.id) });
  } catch { return json({ error: "Tracking refresh unavailable. Previously saved status has been retained." }, 503); }
}
