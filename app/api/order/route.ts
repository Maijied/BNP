import { NextRequest, NextResponse } from "next/server";
import { insertOrder, getStoreSettings } from "@/lib/db";
import { createBridgeSession } from "@/lib/lorahost";
import { OrderInput, OrderRecord, PlateModel } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body: OrderInput = await req.json();

    // 1. Validation
    const name = (body.name || "").trim();
    const phone = (body.phone || "").trim();
    const district = (body.district || "").trim();
    const address = (body.address || "").trim();
    const model = body.model as PlateModel;
    const regBangla = (body.reg_number_bangla || "").trim();
    const quantity = Math.max(1, Math.min(100, Math.floor(Number(body.quantity) || 1)));
    const bracket = Boolean(body.bracket);
    const paymentMethod = body.payment_method || "lorahost_bridge";

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    }

    if (!/^01[3-9]\d{8}$/.test(phone)) {
      return NextResponse.json({ error: "Please enter a valid 11-digit Bangladesh phone number." }, { status: 400 });
    }

    if (!district) {
      return NextResponse.json({ error: "Please select a delivery district." }, { status: 400 });
    }

    if (!address || address.length < 5) {
      return NextResponse.json({ error: "Please provide a complete delivery street address." }, { status: 400 });
    }

    if (model !== "A" && model !== "B") {
      return NextResponse.json({ error: "Invalid plate model selected." }, { status: 400 });
    }

    if (!regBangla) {
      return NextResponse.json({ error: "Registration plate number cannot be empty." }, { status: 400 });
    }

    // 2. Server-side Pricing Recalculation (Never trust client sent prices)
    const settings = await getStoreSettings();
    const unitPrice = model === "A" ? settings.price_a : settings.price_b;
    const plateTotal = unitPrice * quantity;
    const bracketTotal = bracket ? settings.bracket_price * quantity : 0;
    const isDhaka = district.toLowerCase() === "dhaka";
    const deliveryCharge = isDhaka ? settings.delivery_dhaka : settings.delivery_outside;
    const total = plateTotal + bracketTotal + deliveryCharge;

    // 3. Unique Reference ID
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `BNP-${datePrefix}-${randomSuffix}`;

    // 4. Initial Database Record
    const initialPaymentStatus = paymentMethod === "lorahost_bridge" ? "pending_payment" : "verifying";
    const initialStatus = paymentMethod === "lorahost_bridge" ? "new" : "new";

    let loraSessionId: string | null = null;
    let checkoutUrl: string | null = null;

    if (paymentMethod === "lorahost_bridge") {
      const session = await createBridgeSession({
        reference: orderNumber,
        amount: total,
        customerName: name,
        customerPhone: phone,
        metadata: {
          model,
          reg_number: regBangla,
          bracket,
          quantity,
          district,
        },
      });

      loraSessionId = session.session_id;
      checkoutUrl = session.checkout_url;
    }

    await insertOrder({
      order_number: orderNumber,
      name,
      shop_name: body.shop_name ? body.shop_name.trim() : null,
      phone,
      district,
      address,
      model,
      reg_number_bangla: regBangla,
      reg_number_english: body.reg_number_english || null,
      quantity,
      bracket,
      unit_price: unitPrice,
      plate_total: plateTotal,
      bracket_total: bracketTotal,
      delivery_charge: deliveryCharge,
      total,
      payment_status: initialPaymentStatus,
      payment_method: paymentMethod,
      lora_session_id: loraSessionId,
      lora_trx_id: null,
      trx_note: body.trx_id ? body.trx_id.trim() : null,
      status: initialStatus,
      notes: null,
    });

    return NextResponse.json({
      ok: true,
      order_number: orderNumber,
      total,
      checkout_url: checkoutUrl,
    });
  } catch (err: any) {
    console.error("Order creation route error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process order." },
      { status: 500 }
    );
  }
}
