import { NextRequest, NextResponse } from "next/server";
import { verifyReturnSignature } from "@/lib/lorahost";
import { updateOrderPayment, getOrderByNumber } from "@/lib/db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());

  const reference = searchParams.reference;
  const status = searchParams.status;
  const trxId = searchParams.trx_id;

  if (!reference) {
    return NextResponse.redirect(new URL("/payment/failed?reason=missing_reference", req.url));
  }

  // 1. Verify Cryptographic Return Signature
  const isValid = verifyReturnSignature(searchParams);

  if (!isValid) {
    console.error(`Invalid return HMAC signature received for order: ${reference}`);
    return NextResponse.redirect(
      new URL(`/payment/failed?order_number=${encodeURIComponent(reference)}&reason=invalid_signature`, req.url)
    );
  }

  // 2. Update Database Record
  if (status === "success") {
    await updateOrderPayment(reference, "paid", trxId, "confirmed");
    return NextResponse.redirect(
      new URL(
        `/payment/success?order_number=${encodeURIComponent(reference)}&trx_id=${encodeURIComponent(trxId || "")}&method=lorahost_bridge`,
        req.url
      )
    );
  } else {
    await updateOrderPayment(reference, "failed", trxId);
    return NextResponse.redirect(
      new URL(
        `/payment/failed?order_number=${encodeURIComponent(reference)}&reason=${encodeURIComponent(status || "payment_cancelled")}`,
        req.url
      )
    );
  }
}
