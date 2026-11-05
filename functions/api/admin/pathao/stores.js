import { sha256, storeInput } from "../../../_lib/lorapok/pathao/service.js";
import { canonicalJson } from "../../../_lib/lorapok/pathao/webhook.js";
import { isAdmin, isSameOrigin, json } from "../../../_lib/admin-auth.js";
import { createPathaoClient, PathaoError } from "../../../_lib/pathao.js";
export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);
  const value = new URL(request.url).searchParams.get("page") || "1";
  if (!/^[1-9]\d{0,3}$/.test(value)) return json({ error: "Invalid store page." }, 400);
  try {
    const client = createPathaoClient(env);
    return json({ ...await client.stores(Number(value)), configured_store_id: client.config.storeId });
  } catch (error) { return json({ error: error instanceof PathaoError ? error.message : "Pathao stores unavailable." }, error instanceof PathaoError ? error.status : 503); }
}

// Deliberately no automatic store creation. The admin must initiate a new request
// and retain its request_id across retries; uncertain outcomes require reconciliation.
export async function onRequestPost({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);
  if (!isSameOrigin(request)) return json({ error: "Cross-origin write denied." }, 403);
  if (env.PATHAO_STORE_MANAGEMENT_ENABLED !== "true" || !env.DB?.prepare) return json({ error: "Store management is disabled or unavailable." }, 503);
  let claimed = false; let client; let body;
  try {
    try { body = await request.json(); } catch { throw new PathaoError("Invalid JSON.", 400); }
    if (!body || typeof body !== "object" || Object.keys(body).some(k => !["request_id", "store"].includes(k)) ||
        typeof body.request_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.request_id)) throw new PathaoError("A persistent UUID request ID is required.", 400);
    body.request_id = body.request_id.toLowerCase();
    const input = storeInput(body.store);
    client = createPathaoClient(env);
    const { scope, environment } = client.config;
    const existing = await env.DB.prepare("SELECT state FROM pathao_store_requests WHERE merchant_key = ? AND product_key = ? AND environment = ? AND request_id = ?")
      .bind(scope.merchant, scope.product, environment, body.request_id).first();
    if (existing) return json({ error: "This store request already exists. Reconcile it in Pathao before any new submission.", state: existing.state }, 409);
    await client.validateDestination(input);
    const hash = await sha256(canonicalJson(input));
    const result = await env.DB.prepare(`INSERT INTO pathao_store_requests (merchant_key, product_key, environment, request_id, request_hash, state, requested_by)
      VALUES (?, ?, ?, ?, ?, 'submitting', ?) ON CONFLICT(merchant_key, product_key, environment, request_id) DO NOTHING`)
      .bind(scope.merchant, scope.product, environment, body.request_id, hash, env.ADMIN_EMAIL.toLowerCase()).run();
    if (result.meta?.changes !== 1) return json({ error: "Store request was already claimed." }, 409);
    claimed = true;
    const store = await client.createStore(input);
    const saved = await env.DB.prepare("UPDATE pathao_store_requests SET state = 'submitted', updated_at = datetime('now') WHERE merchant_key = ? AND product_key = ? AND environment = ? AND request_id = ? AND state = 'submitting'")
      .bind(scope.merchant, scope.product, environment, body.request_id).run();
    if (saved.meta?.changes !== 1) throw new PathaoError("Store result could not be recorded.");
    return json({ store, request_id: body.request_id }, 202);
  } catch (error) {
    if (claimed) {
      const { scope, environment } = client.config;
      try { await env.DB.prepare("UPDATE pathao_store_requests SET state = 'unknown', updated_at = datetime('now') WHERE merchant_key = ? AND product_key = ? AND environment = ? AND request_id = ? AND state = 'submitting'")
        .bind(scope.merchant, scope.product, environment, body.request_id).run(); } catch { /* durable submitting claim blocks replay */ }
      return json({ error: "Store creation needs reconciliation in Pathao. Do not submit a new request ID.", state: "unknown" }, 202);
    }
    return json({ error: error instanceof PathaoError ? error.message : "Store management unavailable." }, error instanceof PathaoError ? error.status : 503);
  }
}
