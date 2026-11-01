// Cloudflare Pages Function: /api/payment/webhook
export async function onRequestPost({ request }) {
  try {
    const payload = await request.json().catch(() => ({}));
    return new Response(JSON.stringify({ received: true, timestamp: Date.now() }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
