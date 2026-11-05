// Server-to-server delegated payment proof. Never sign from browser state or expose this key.
import { PathaoError, sha256, validateScope } from "./provider/service.js";
import { canonicalJson } from "./provider/webhook.js";
const encoder = new TextEncoder();
const encode = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
function decode(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error();
  return Uint8Array.from(atob(value.replace(/-/g,"+").replace(/_/g,"/")), c => c.charCodeAt(0));
}
function validKey(secret) { if (typeof secret !== "string" || secret.length < 43 || secret.length > 512) throw new PathaoError("Dispatch proof signing is not configured."); return secret; }
async function key(secret) { return crypto.subtle.importKey("raw",encoder.encode(validKey(secret)),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]); }
export function validatePrepaidPayload(payload) {
  const keys=["store_id","merchant_order_id","recipient_name","recipient_phone","recipient_address","recipient_city","recipient_zone","recipient_area","delivery_type","item_type","item_quantity","item_weight","amount_to_collect","item_description"];
  const id = v => Number.isSafeInteger(v) && v > 0;
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).some(k=>!keys.includes(k)) ||
      ![payload.store_id,payload.recipient_city,payload.recipient_zone,payload.recipient_area,payload.item_quantity].every(id) ||
      typeof payload.merchant_order_id !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(payload.merchant_order_id) ||
      typeof payload.recipient_name !== "string" || Array.from(payload.recipient_name.trim()).length<3 || Array.from(payload.recipient_name).length>100 ||
      typeof payload.recipient_address !== "string" || Array.from(payload.recipient_address.trim()).length<10 || Array.from(payload.recipient_address).length>220 ||
      typeof payload.recipient_phone !== "string" || !/^01[3-9]\d{8}$/.test(payload.recipient_phone) ||
      payload.delivery_type!==48 || payload.item_type!==2 || payload.amount_to_collect!==0 ||
      typeof payload.item_weight!=="number" || !Number.isFinite(payload.item_weight) || payload.item_weight<0.5 || payload.item_weight>10 ||
      (payload.item_description!==undefined && (typeof payload.item_description!=="string" || payload.item_description.length>500))) throw new PathaoError("Invalid prepaid shipment payload.",400);
  return payload;
}
export async function signDispatchGrant({ scope, environment, orderId, intentId, paymentEventId, amountBdt, payload }, secret, now=Date.now()) {
  validateScope(scope); validatePrepaidPayload(payload);
  if (!["sandbox","production"].includes(environment) || typeof orderId!=="string" || !/^[A-Za-z0-9_-]{1,100}$/.test(orderId) ||
      typeof intentId!=="string" || !/^[0-9a-f-]{36}$/.test(intentId) || typeof paymentEventId!=="string" || paymentEventId.length<1 || paymentEventId.length>200 ||
      !Number.isSafeInteger(amountBdt) || amountBdt<=0) throw new PathaoError("Invalid durable payment proof.",409);
  const issued=Math.floor(now/1000);
  const claims={v:1,iss:scope.product,merchant:scope.merchant,environment,order_id:orderId,order_reference:payload.merchant_order_id,intent_id:intentId,
    payment_event_id:paymentEventId,amount_bdt:amountBdt,currency:"BDT",payload_sha256:await sha256(canonicalJson(payload)),iat:issued,exp:issued+60};
  const bytes=encoder.encode(JSON.stringify(claims));
  return `${encode(bytes)}.${encode(new Uint8Array(await crypto.subtle.sign("HMAC",await key(secret),bytes)))}`;
}
export async function verifyDispatchGrant(token, payload, identity, secret, now=Date.now()) {
  try {
    validatePrepaidPayload(payload);
    if (typeof token!=="string" || token.length>4096) throw Error();
    const parts=token.split("."); if(parts.length!==2)throw Error();
    const bytes=decode(parts[0]),signature=decode(parts[1]);
    if(signature.length!==32 || !(await crypto.subtle.verify("HMAC",await key(secret),signature,bytes)))throw Error();
    const c=JSON.parse(new TextDecoder().decode(bytes)), seconds=Math.floor(now/1000);
    if(c.v!==1 || c.iss!==identity.scope.product || c.merchant!==identity.scope.merchant || c.environment!==identity.environment ||
      c.order_reference!==payload.merchant_order_id || typeof c.order_id!=="string" || !/^[A-Za-z0-9_-]{1,100}$/.test(c.order_id) ||
      typeof c.intent_id!=="string" || !/^[0-9a-f-]{36}$/.test(c.intent_id) || typeof c.payment_event_id!=="string" || c.payment_event_id.length<1 || c.payment_event_id.length>200 ||
      !Number.isSafeInteger(c.amount_bdt) || c.amount_bdt<=0 || c.currency!=="BDT" || !Number.isSafeInteger(c.iat) || !Number.isSafeInteger(c.exp) ||
      c.iat>seconds+5 || c.exp<=seconds || c.exp-c.iat>60 || c.exp-c.iat<=0 || c.payload_sha256!==await sha256(canonicalJson(payload)))throw Error();
    return c;
  } catch { throw new PathaoError("Invalid or expired dispatch proof.",403); }
}
