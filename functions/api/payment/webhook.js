// Cloudflare Pages Function: /api/payment/webhook
// Fail closed until verified bridge HMAC, durable event deduplication and
// transactional order settlement are wired to persistent storage.
export async function onRequestPost() {
  return new Response(JSON.stringify({ error: "Payment webhook not configured for verified settlement." }), {
    status: 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

