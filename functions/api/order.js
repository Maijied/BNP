import { createPendingOrder, OrderValidationError } from "../_lib/orders.js";

const json = (body, status) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
});

// Cloudflare Pages: POST /api/order
// Staging-first: requires D1 and LoraHost Bridge credentials; never simulates payment.
export async function onRequestPost({ request, env }) {
  if (!env?.DB || !env?.LORA_BRIDGE_CLIENT_TOKEN || !env?.LORA_BRIDGE_URL || !env?.BNP_PUBLIC_ORIGIN) {
    return json({ error: "Secure checkout is not configured." }, 503);
  }
  let bridgeOrigin, publicOrigin;
  try {
    bridgeOrigin = new URL(env.LORA_BRIDGE_URL);
    publicOrigin = new URL(env.BNP_PUBLIC_ORIGIN);
    if (bridgeOrigin.protocol !== "https:" || publicOrigin.protocol !== "https:" ||
        bridgeOrigin.username || bridgeOrigin.password || publicOrigin.username || publicOrigin.password) {
      throw Error("HTTPS origins required");
    }
    if (bridgeOrigin.pathname !== "/" || publicOrigin.pathname !== "/") throw Error("Origin-only URLs required");
  } catch {
    return json({ error: "Checkout configuration is invalid." }, 503);
  }

  let order;
  try {
    const body = await request.json();
    order = await createPendingOrder(env.DB, body);
  } catch (error) {
    if (error instanceof OrderValidationError || error?.name === "OrderValidationError") {
      return json({ error: error.message }, 400);
    }
    // Avoid exposing DB or credential details to the client.
    return json({ error: "Unable to save order." }, 503);
  }

  let session;
  try {
    const response = await fetch(new URL("/api/payment-bridge/v1/sessions", bridgeOrigin), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + env.LORA_BRIDGE_CLIENT_TOKEN
      },
      body: JSON.stringify({
        reference: order.bridgeReference,
        amount: order.totalBdt,
        currency: "BDT",
        return_url: new URL("/payment/return", publicOrigin).href,
        // Do not put registration documents or registration numbers in metadata.
        metadata: { order_number: order.orderNumber }
      })
    });
    if (!response.ok) throw Error("Bridge rejected session");
    session = await response.json();
    const checkout = new URL(session.checkout_url);
    if (checkout.protocol !== "https:" || checkout.username || checkout.password ||
        typeof session.session_id !== "string" || !session.session_id) {
      throw Error("Bridge session is invalid");
    }
    // Session ID is required for subsequent webhook correlation.
    const result = await env.DB.prepare(
      "UPDATE payment_attempts SET bridge_session_id=?,status='pending',updated_at=datetime('now') WHERE id=? AND status='initiated'"
    ).bind(session.session_id, order.attemptId).run();
    if (result?.meta?.changes !== 1) throw Error("Could not persist bridge session");
  } catch {
    // The unpaid order remains durable for reconciliation. Never return a
    // checkout URL if its bridge session was not durably recorded.
    return json({ error: "Checkout session unavailable; please contact support before retrying.", orderNumber: order.orderNumber }, 503);
  }
  return json({
    success: true,
    orderNumber: order.orderNumber,
    order_number: order.orderNumber,
    checkoutUrl: session.checkout_url,
    checkout_url: session.checkout_url,
    total: order.totalBdt
  }, 200);
}
