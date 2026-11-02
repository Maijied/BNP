// Cloudflare Pages Function: /api/order/:orderNumber
// Never synthesize paid receipts from user-controlled query parameters.
export async function onRequestGet() {
  return new Response(JSON.stringify({ error: "Verified order lookup is temporarily unavailable." }), {
    status: 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
