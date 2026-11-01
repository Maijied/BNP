// Cloudflare Pages Function: /api/admin/settings
export async function onRequestGet() {
  const settings = {
    price_a: 380,
    price_b: 450,
    price_preorder_a: 300,
    price_preorder_b: 380,
    bracket_price: 80,
    delivery_dhaka: 60,
    delivery_outside: 120,
    urgency_text: "BRTA deadline: November 15 — order your compliant plate today",
    hotline: "01632333221",
    whatsapp: "01914-873925",
  };

  return new Response(JSON.stringify(settings), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestPost({ request }) {
  const body = await request.json().catch(() => ({}));
  return new Response(JSON.stringify({ success: true, updated: body }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
