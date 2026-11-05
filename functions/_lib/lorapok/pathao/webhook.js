// Server-only shared-secret verification. Pathao's documented header is NOT an HMAC.
import { PathaoError, sha256 } from "./service.js";
export const INTEGRATION_HEADER = "X-Pathao-Merchant-Webhook-Integration-Secret";
// Public protocol challenge from Pathao documentation, NOT the merchant's webhook secret.
export const INTEGRATION_VALUE = "f3992ecc-59da-4cbe-a049-a13da2018d51";
export async function verifyWebhookSecret(provided, expected) {
  if (typeof expected !== "string" || expected.length < 32 || expected.length > 512 ||
      typeof provided !== "string" || provided.length > 512) return false;
  const [a, b] = await Promise.all([sha256(provided), sha256(expected)]);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
export function normalizeStatus(value) {
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  const states = { pending: "created", "order created": "created", created: "created", "pickup requested": "pickup_pending",
    "assigned for pickup": "pickup_pending", pickup: "picked_up", "picked up": "picked_up", "pickup failed": "pickup_failed",
    "pickup cancelled": "cancelled", "at the sorting hub": "in_transit", "in transit": "in_transit", "received at last mile hub": "in_transit",
    "assigned for delivery": "out_for_delivery", delivered: "delivered", "partial delivery": "partially_delivered",
    return: "return_in_progress", "return in transit": "return_in_progress", "returned to merchant": "returned",
    "delivery failed": "delivery_failed", "on hold": "on_hold", exchange: "exchange" };
  return Object.hasOwn(states, normalized) ? states[normalized] : "unknown";
}
export async function withDeadline(operation, milliseconds = 8000) {
  let timeout;
  try { return await Promise.race([operation, new Promise((_, reject) => { timeout = setTimeout(() => reject(new PathaoError("Webhook processing timed out.", 503)), milliseconds); })]); }
  finally { clearTimeout(timeout); }
}
export async function readWebhookBody(request, { maxBytes = 16384, timeoutMs = 7000 } = {}) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new PathaoError("JSON content type is required.", 415);
  if (request.headers.has("content-encoding") && request.headers.get("content-encoding") !== "identity") throw new PathaoError("Compressed webhooks are not accepted.", 415);
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes)) throw new PathaoError("Webhook is too large.", 413);
  if (!request.body) throw new PathaoError("Invalid webhook JSON.", 400);
  const reader = request.body.getReader();
  try {
    return await withDeadline((async () => {
      const chunks = []; let bytes = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxBytes) throw new PathaoError("Webhook is too large.", 413);
        chunks.push(value);
      }
      const buffer = new Uint8Array(bytes); let offset = 0;
      for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
      let body;
      try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer)); } catch { throw new PathaoError("Invalid webhook JSON.", 400); }
      if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.event !== "string" || !/^[a-zA-Z0-9_. -]{1,100}$/.test(body.event)) throw new PathaoError("Invalid webhook event.", 400);
      return body;
    })(), timeoutMs);
  } finally { reader.cancel().catch(() => {}); }
}
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
}
