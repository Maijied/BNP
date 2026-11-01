import crypto from "crypto";

export interface LoraBridgeSessionParams {
  reference: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  metadata?: Record<string, any>;
}

export interface LoraBridgeSessionResponse {
  session_id: string;
  checkout_url: string;
  reference: string;
  expires_at?: string;
}

const BRIDGE_BASE_URL = process.env.LORA_BRIDGE_URL || "https://lorahost.lorapok.tech";

/**
 * Creates a checkout session with the LoraHost Payment Bridge (PayStation relay).
 * Handles 409 duplicate-invoice retry with a fresh nonce.
 */
export async function createBridgeSession(
  params: LoraBridgeSessionParams,
  retryCount = 0
): Promise<LoraBridgeSessionResponse> {
  const token = process.env.LORA_BRIDGE_CLIENT_TOKEN;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bnp.lorapok.tech";
  const returnUrl = `${siteUrl.replace(/\/$/, "")}/payment/return`;

  // Fallback simulation for local development without active token
  if (!token || token.includes("your_lorahost")) {
    console.warn("LORA_BRIDGE_CLIENT_TOKEN not configured. Generating simulated dev checkout session.");
    const mockSessionId = "sim_" + crypto.randomBytes(12).toString("hex");
    return {
      session_id: mockSessionId,
      checkout_url: `${returnUrl}?reference=${encodeURIComponent(params.reference)}&status=success&trx_id=SIM_TRX_${Date.now()}&amount=${params.amount}&session_id=${mockSessionId}&sig=mock_dev_signature`,
      reference: params.reference,
    };
  }

  const endpoint = `${BRIDGE_BASE_URL.replace(/\/$/, "")}/api/payment-bridge/v1/sessions`;

  const body = {
    reference: params.reference,
    amount: Math.round(params.amount),
    return_url: returnUrl,
    customer: {
      name: params.customerName,
      phone: params.customerPhone,
      email: params.customerEmail || "bikesnumberplate@gmail.com",
    },
    metadata: params.metadata || {},
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (response.status === 409 && retryCount < 2) {
    // 409 Duplicate PayStation invoice: create a fresh reference with a distinct nonce
    const retryRef = `${params.reference}-R${retryCount + 1}`;
    console.warn(`LoraHost returned 409 Duplicate Invoice for ${params.reference}. Retrying with fresh reference: ${retryRef}`);
    return createBridgeSession({ ...params, reference: retryRef }, retryCount + 1);
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorJson: any;
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      errorJson = { message: errorText };
    }

    if (response.status === 401) {
      throw new Error("Payment bridge authentication failed (401 Unauthorized). Check LORA_BRIDGE_CLIENT_TOKEN.");
    }
    if (response.status === 403) {
      throw new Error("Payment bridge checkout token invalid or disabled (403 Forbidden).");
    }
    if (response.status === 422) {
      throw new Error(`Invalid return URL passed to payment bridge (422): ${errorJson.message || errorText}`);
    }
    if (response.status === 429) {
      throw new Error("Payment bridge rate limit exceeded (429). Please retry in a few moments.");
    }
    if (response.status === 503) {
      throw new Error("Payment bridge is currently undergoing scheduled maintenance (503). Please choose Manual bKash/Nagad.");
    }

    throw new Error(`Payment Bridge Error (${response.status}): ${errorJson.message || errorText}`);
  }

  const data = await response.json();
  return {
    session_id: data.session_id,
    checkout_url: data.checkout_url || `${BRIDGE_BASE_URL}/pay/bridge/${data.session_id}`,
    reference: data.reference || params.reference,
    expires_at: data.expires_at,
  };
}

/**
 * Verifies return URL query parameters using HMAC-SHA256.
 * Sorts query params alphabetically (excluding 'sig').
 */
export function verifyReturnSignature(params: Record<string, string | string[] | undefined>): boolean {
  const secret = process.env.LORA_RETURN_HMAC_TOKEN;
  const providedSig = params.sig;

  if (!providedSig || typeof providedSig !== "string") {
    return false;
  }

  // Allow bypass in local development if using simulated signature
  if (providedSig === "mock_dev_signature" && (!secret || secret.includes("your_lorahost"))) {
    return true;
  }

  if (!secret) {
    console.error("LORA_RETURN_HMAC_TOKEN is not configured.");
    return false;
  }

  // Construct canonical sorted query string excluding 'sig'
  const keys = Object.keys(params)
    .filter((k) => k !== "sig" && params[k] !== undefined && params[k] !== null)
    .sort();

  const canonicalString = keys
    .map((k) => `${k}=${encodeURIComponent(String(params[k]))}`)
    .join("&");

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(canonicalString)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedSig, "hex"),
      Buffer.from(expectedSig, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Verifies asynchronous webhook payloads from LoraHost.
 * Verified against the RAW unparsed JSON body using LORA_WEBHOOK_HMAC_TOKEN.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;

  const secret = process.env.LORA_WEBHOOK_HMAC_TOKEN;

  // Allow bypass in local dev if using mock header
  if (signatureHeader === "mock_dev_webhook" && (!secret || secret.includes("your_lorahost"))) {
    return true;
  }

  if (!secret) {
    console.error("LORA_WEBHOOK_HMAC_TOKEN is not configured.");
    return false;
  }

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader, "hex"),
      Buffer.from(expectedSig, "hex")
    );
  } catch {
    return false;
  }
}
