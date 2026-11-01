// Cloudflare Pages Function: /api/order/:orderNumber
export async function onRequestGet({ params, request }) {
  const { orderNumber } = params;

  if (!orderNumber) {
    return new Response(JSON.stringify({ error: "Order number required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse receipt metadata from simulated or stored order
  const url = new URL(request.url);
  const model = url.searchParams.get("model") || "A";
  const district = url.searchParams.get("district") || "Dhaka";
  const name = url.searchParams.get("name") || "Customer";
  const phone = url.searchParams.get("phone") || "017XXXXXXXX";

  const isDhaka = district.toLowerCase() === "dhaka";
  const delivery = isDhaka ? 60 : 120;
  const platePrice = model === "A" ? 380 : 450;
  const total = platePrice + delivery;

  const orderData = {
    order_number: orderNumber,
    created_at: new Date().toISOString().slice(0, 19).replace("T", " "),
    name,
    shop_name: null,
    phone,
    district,
    address: `${district}, Bangladesh`,
    model,
    reg_number_bangla: "ঢাকা মেট্রো-ল ১২-৩৪৫৬",
    quantity: 1,
    bracket: false,
    plate_price: platePrice,
    bracket_price: 0,
    delivery_charge: delivery,
    total_amount: total,
    payment_method: "lorahost_bridge",
    payment_status: "paid",
    lorahost_session_id: `lh_${orderNumber.toLowerCase()}`,
    status: "new",
    tracking_number: null,
  };

  return new Response(JSON.stringify(orderData), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
