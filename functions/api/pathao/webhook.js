import { pathaoScope, PathaoError } from "../../_lib/pathao.js";
import { sha256 } from "../../_lib/lorapok/pathao/service.js";
import { INTEGRATION_HEADER, INTEGRATION_VALUE, verifyWebhookSecret, readWebhookBody, withDeadline, canonicalJson } from "../../_lib/lorapok/pathao/webhook.js";
import { json } from "../../_lib/admin-auth.js";

export async function onRequestPost({ request, env }) {
  if (env.PATHAO_WEBHOOK_ENABLED !== "true") return json({ error: "Pathao webhook is disabled." }, 503);
  try {
    const scope = pathaoScope(env);
    const environment = env.PATHAO_ENVIRONMENT || "sandbox";
    if (!["sandbox", "production"].includes(environment) || typeof env.PATHAO_WEBHOOK_SECRET !== "string" || env.PATHAO_WEBHOOK_SECRET.length < 32 || env.PATHAO_WEBHOOK_SECRET.length > 512) throw new PathaoError("Pathao webhook is not configured.");
    return await withDeadline((async () => {
      const body = await readWebhookBody(request);
      // Handshake is the only unsigned event. Never interpret other fields as a shipment update.
      if (body.event === "webhook_integration" && Object.keys(body).length === 1) {
        return new Response(null, { status: 202, headers: { [INTEGRATION_HEADER]: INTEGRATION_VALUE, "Cache-Control": "no-store" } });
      }
      if (!(await verifyWebhookSecret(request.headers.get("X-PATHAO-Signature"), env.PATHAO_WEBHOOK_SECRET))) return json({ error: "Invalid webhook signature." }, 401);
      if (!env.DB?.prepare) throw new PathaoError("Webhook storage is unavailable.");
      const digest = await sha256(canonicalJson(body));
      // Record this authenticated receipt before reporting the processing blocker. A timeout may
      // still complete the DB write; provider retry safely hits the unique key.
      await env.DB.prepare(`INSERT INTO pathao_webhook_receipts (merchant_key, product_key, environment, payload_sha256, event_name)
        VALUES (?, ?, ?, ?, ?) ON CONFLICT(merchant_key, product_key, environment, payload_sha256) DO NOTHING`)
        .bind(scope.merchant, scope.product, environment, digest, body.event).run();
      // Body schema/event ordering are not documented yet. Do not mutate payment,
      // fulfillment, shipment ownership, or provider status from these receipts.
      return json({ error: "Delivery event processing awaits the confirmed Pathao event schema." }, 503);
    })());
  } catch (error) {
    return json({ error: error instanceof PathaoError ? error.message : "Webhook processing is unavailable." }, error instanceof PathaoError ? error.status : 503);
  }
}
