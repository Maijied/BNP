// Cloudflare Pages Function: /api/order
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));

    const name = (body.name || "").trim();
    const phone = (body.phone || "").trim();
    const district = (body.district || "").trim();
    const address = (body.address || "").trim();
    const model = body.model === "B" ? "B" : "A";
    const regBangla = (body.reg_number_bangla || "").trim();
    const quantity = Math.max(1, Math.min(100, Math.floor(Number(body.quantity) || 1)));
    const bracket = Boolean(body.bracket);
    const paymentMethod = body.payment_method || "lorahost_bridge";

    if (!name || name.length < 2) {
      return new Response(JSON.stringify({ error: "Please enter your full name." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!/^01[3-9]\d{8}$/.test(phone)) {
      return new Response(
        JSON.stringify({ error: "Please enter a valid 11-digit Bangladesh phone number (e.g. 01712345678)." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!district) {
      return new Response(JSON.stringify({ error: "Please select your delivery district." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!address || address.length < 5) {
      return new Response(JSON.stringify({ error: "Please enter your full delivery address." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!regBangla) {
      return new Response(JSON.stringify({ error: "Registration number cannot be empty." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Server-side calculation
    const unitPrice = model === "A" ? 380 : 450;
    const plateTotal = unitPrice * quantity;
    const bracketTotal = bracket ? 80 * quantity : 0;
    const isDhaka = district.toLowerCase() === "dhaka";
    const deliveryCharge = isDhaka ? 60 : 120;
    const total = plateTotal + bracketTotal + deliveryCharge;

    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `BNP-${datePrefix}-${randomSuffix}`;

    const url = new URL(request.url);
    const origin = url.origin;
    const returnUrl = `${origin}/payment/return`;

    const bridgeToken = env.LORA_BRIDGE_CLIENT_TOKEN;
    const bridgeUrl = (env.LORA_BRIDGE_URL || "https://lorahost.lorapok.tech").replace(/\/$/, "");

    let checkoutUrl = null;

    if (bridgeToken && !bridgeToken.includes("your_lorahost")) {
      try {
        const bridgeRes = await fetch(`${bridgeUrl}/api/payment-bridge/v1/sessions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${bridgeToken}`,
          },
          body: JSON.stringify({
            reference: orderNumber,
            amount: total,
            return_url: returnUrl,
            customer: {
              name,
              phone,
              email: `${orderNumber.toLowerCase()}@bnp.lorapok.tech`,
            },
            metadata: {
              model,
              reg_number: regBangla,
              quantity,
              bracket,
              district,
            },
          }),
        });

        if (bridgeRes.ok) {
          const session = await bridgeRes.json();
          checkoutUrl = session.checkout_url;
        }
      } catch (err) {
        console.warn("LoraHost Bridge call failed, falling back to sandbox:", err);
      }
    }

    // Sandbox / fallback checkout URL
    if (!checkoutUrl) {
      const simSessionId = "sbx_" + Math.random().toString(36).substring(2, 14);
      checkoutUrl = `${returnUrl}?reference=${encodeURIComponent(orderNumber)}&status=success&trx_id=SBX_TRX_${Date.now()}&amount=${total}&session_id=${simSessionId}&model=${model}&district=${encodeURIComponent(district)}&name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderNumber,
        order_number: orderNumber,
        checkoutUrl,
        checkout_url: checkoutUrl,
        total,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error: " + (err.message || String(err)) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
