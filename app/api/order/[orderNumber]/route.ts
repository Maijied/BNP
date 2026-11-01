import { NextRequest, NextResponse } from "next/server";
import { getOrderByNumber } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { orderNumber: string } }
) {
  try {
    const orderNumber = params.orderNumber;
    if (!orderNumber) {
      return NextResponse.json({ error: "Order number required" }, { status: 400 });
    }

    const order = await getOrderByNumber(orderNumber);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Return public-safe receipt data
    return NextResponse.json({
      order_number: order.order_number,
      created_at: order.created_at,
      name: order.name,
      shop_name: order.shop_name,
      phone: order.phone,
      district: order.district,
      address: order.address,
      model: order.model,
      reg_number_bangla: order.reg_number_bangla,
      quantity: order.quantity,
      bracket: order.bracket,
      unit_price: order.unit_price,
      plate_total: order.plate_total,
      bracket_total: order.bracket_total,
      delivery_charge: order.delivery_charge,
      total: order.total,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      lora_trx_id: order.lora_trx_id,
      trx_note: order.trx_note,
      status: order.status,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to retrieve order" }, { status: 500 });
  }
}
