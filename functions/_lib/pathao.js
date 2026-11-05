// BNP adapter. The reusable provider boundary contains no BNP/UI/storage policy.
import { createPathaoService, PathaoError, positiveId, validateScope } from "./lorapok/pathao/service.js";
export { PathaoError, positiveId };
export function pathaoScope(env) {
  return validateScope({ merchant: env.PATHAO_MERCHANT_KEY, product: env.PATHAO_PRODUCT_KEY });
}
export function pathaoConfig(env) {
  if (env.PATHAO_ENABLED !== "true") throw new PathaoError("Pathao is disabled.");
  const environment = env.PATHAO_ENVIRONMENT || "sandbox";
  if (!["sandbox", "production"].includes(environment)) throw new PathaoError("Invalid Pathao environment.");
  if (![env.PATHAO_CLIENT_ID, env.PATHAO_CLIENT_SECRET, env.PATHAO_USERNAME, env.PATHAO_PASSWORD].every(v => typeof v === "string" && v.length > 0)) throw new PathaoError("Pathao credentials are not configured.");
  const scope = pathaoScope(env);
  const storeId = env.PATHAO_STORE_ID ? Number(env.PATHAO_STORE_ID) : null;
  if (storeId !== null && !positiveId(storeId)) throw new PathaoError("Invalid pickup store configuration.");
  return Object.freeze({ environment, storeId, scope });
}
export function dispatchEnabled(env) {
  try { pathaoConfig(env); return env.PATHAO_DISPATCH_ENABLED === "true"; } catch { return false; }
}
export function shipmentInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).some(k => !["store_id", "city_id", "zone_id", "area_id", "item_weight"].includes(k)) ||
      ![body.city_id, body.zone_id, body.area_id].every(positiveId) ||
      (body.store_id !== undefined && !positiveId(body.store_id)) ||
      typeof body.item_weight !== "number" || !Number.isFinite(body.item_weight) || body.item_weight < 0.5 || body.item_weight > 10) {
    throw new PathaoError("Choose valid Pathao store, city, zone, area and package weight (0.5–10 kg). No payment or COD overrides are accepted.", 400);
  }
  return body;
}
export function createPathaoClient(env, fetcher = fetch) {
  const config = pathaoConfig(env);
  const service = createPathaoService({ scope: config.scope, environment: config.environment,
    credentials: { clientId: env.PATHAO_CLIENT_ID, clientSecret: env.PATHAO_CLIENT_SECRET, username: env.PATHAO_USERNAME, password: env.PATHAO_PASSWORD } }, { fetcher });
  return Object.freeze({ ...service, config });
}
export function shipmentPayload(order, input, storeId) {
  if (typeof order.customer_name !== "string" || order.customer_name.trim().length < 3 || order.customer_name.length > 100 ||
      !/^01[3-9]\d{8}$/.test(order.customer_phone) || typeof order.delivery_address !== "string" ||
      order.delivery_address.trim().length < 10 || order.delivery_address.length > 220 || !positiveId(Number(order.item_quantity))) {
    throw new PathaoError("Stored recipient details or item quantity need correction before dispatch.", 409);
  }
  return {
    store_id: storeId, merchant_order_id: order.order_number,
    recipient_name: order.customer_name, recipient_phone: order.customer_phone,
    recipient_address: order.delivery_address,
    recipient_city: input.city_id, recipient_zone: input.zone_id, recipient_area: input.area_id,
    delivery_type: 48, item_type: 2, item_quantity: Number(order.item_quantity), item_weight: input.item_weight,
    amount_to_collect: 0, item_description: "Prepaid bike number plate order",
  };
}
