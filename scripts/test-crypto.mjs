import crypto from "crypto";

const RETURN_SECRET = "test_return_secret_key_1234567890";
const WEBHOOK_SECRET = "test_webhook_secret_key_1234567890";

process.env.LORA_RETURN_HMAC_TOKEN = RETURN_SECRET;
process.env.LORA_WEBHOOK_HMAC_TOKEN = WEBHOOK_SECRET;

import { verifyReturnSignature, verifyWebhookSignature } from "../lib/lorahost.ts";

console.log("=== Running LoraHost Cryptographic Signature Verification ===");

// 1. Test Return URL Signature
const sampleParams = {
  amount: "520",
  reference: "BNP-20261101-9999",
  session_id: "sess_test_123",
  status: "success",
  trx_id: "TRX_987654321",
};

// Compute expected canonical HMAC
const canonical = Object.keys(sampleParams)
  .sort()
  .map((k) => `${k}=${encodeURIComponent(sampleParams[k])}`)
  .join("&");

const validReturnSig = crypto.createHmac("sha256", RETURN_SECRET).update(canonical).digest("hex");

// Test valid return
const returnOk = verifyReturnSignature({ ...sampleParams, sig: validReturnSig });
if (returnOk) {
  console.log("✓ Return URL valid signature verified correctly.");
} else {
  console.error("✗ Return URL valid signature failed verification.");
  process.exit(1);
}

// Test tampered return
const returnTampered = verifyReturnSignature({ ...sampleParams, amount: "100", sig: validReturnSig });
if (!returnTampered) {
  console.log("✓ Tampered return URL parameters rejected correctly.");
} else {
  console.error("✗ Tampered return URL parameters were wrongly accepted.");
  process.exit(1);
}

// 2. Test Webhook Signature
const rawWebhookBody = JSON.stringify({
  reference: "BNP-20261101-9999",
  status: "success",
  trx_id: "TRX_987654321",
  amount: 520,
  session_id: "sess_test_123",
});

const validWebhookSig = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawWebhookBody).digest("hex");

const webhookOk = verifyWebhookSignature(rawWebhookBody, validWebhookSig);
if (webhookOk) {
  console.log("✓ Webhook raw body signature verified correctly.");
} else {
  console.error("✗ Webhook raw body signature failed verification.");
  process.exit(1);
}

const webhookTampered = verifyWebhookSignature(rawWebhookBody + " ", validWebhookSig);
if (!webhookTampered) {
  console.log("✓ Tampered webhook payload rejected correctly.");
} else {
  console.error("✗ Tampered webhook payload was wrongly accepted.");
  process.exit(1);
}

console.log("\nAll cryptographic security verifications passed successfully!");
