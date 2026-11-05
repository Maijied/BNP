import { isAdmin, json } from "../../_lib/admin-auth.js";

// Published rates are currently defined in the validated checkout service.
// Admin editing must remain unavailable until D1-backed settings are wired to
// that same server-side pricing path; a fake success would mislead operators.
export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);
  return json({
    settings: {
      price_a: 380, price_b: 450, price_preorder_a: 300, price_preorder_b: 380,
      bracket_price: 80, delivery_dhaka: 60, delivery_outside: 120,
      urgency_text: "Check current BRTA requirements before ordering.",
      hotline: "01632333221", whatsapp: "01914-873925",
    },
    read_only: true,
    notice: "Price editing is locked until persisted settings are connected to checkout."
  });
}

export async function onRequestPost({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);
  return json({ error: "Settings persistence is not available; no changes were saved." }, 501);
}
