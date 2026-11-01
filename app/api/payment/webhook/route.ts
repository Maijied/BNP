import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/lorahost";
import { updateOrderPayment, getOrderByNumber } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-lorahost-signature");

    // 1. Verify Webhook Signature on Raw Body
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.error("Webhook rejected: Invalid X-LoraHost-Signature header.");
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const reference = payload.reference;
    const status = payload.status;
    const trxId = payload.trx_id;

    if (!reference) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    const order = await getOrderByNumber(reference);
    if (!order) {
      console.warn(`Webhook received for non-existent order: ${reference}`);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (status === "success" || status === "paid") {
      await updateOrderPayment(reference, "paid", trxId, "confirmed");
      console.log(`✓ Order ${reference} verified and marked as PAID via webhook. TrxID: ${trxId}`);

      // Forward to Discord webhook notification if configured
      if (process.env.DISCORD_WEBHOOK_URL) {
        try {
          const { sendOrderDiscordNotification } = await import("@/lib/discord");
          const updatedOrder = await getOrderByNumber(reference);
          if (updatedOrder) {
            await sendOrderDiscordNotification(updatedOrder);
          }
        } catch (discordErr) {
          console.error("Discord notification failed in webhook:", discordErr);
        }
      }
    } else {
      await updateOrderPayment(reference, "failed", trxId);
      console.log(`Order ${reference} marked as FAILED via webhook.`);
    }

    return NextResponse.json({ ok: true, received: true });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: err.message || "Webhook processing failed" }, { status: 500 });
  }
}
