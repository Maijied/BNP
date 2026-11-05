// Server-only Pathao client. Never import into app/ or components/.
// Current auth contract: Pathao's official courier-woocommerce-plugin/pathao-bridge.php.
const HOSTS = {
  sandbox: "https://courier-api-sandbox.pathao.com",
  production: "https://api-hermes.pathao.com",
};
export class PathaoError extends Error {
  constructor(code, status = 503) { super(code); this.code = code; this.status = status; }
}
export function pathaoConfig(env) {
  if (env.PATHAO_ENABLED !== "true") throw new PathaoError("Pathao is disabled.");
  const environment = env.PATHAO_ENVIRONMENT || "sandbox";
  if (!HOSTS[environment]) throw new PathaoError("Invalid Pathao environment.");
  const storeId = Number(env.PATHAO_STORE_ID);
  if (!env.PATHAO_CLIENT_ID || !env.PATHAO_CLIENT_SECRET || !Number.isSafeInteger(storeId) || storeId <= 0) {
    throw new PathaoError("Pathao credentials or pickup store are not configured.");
  }
  return { environment, base: HOSTS[environment], storeId, clientId: env.PATHAO_CLIENT_ID, clientSecret: env.PATHAO_CLIENT_SECRET };
}
export function dispatchEnabled(env) {
  try { pathaoConfig(env); return env.PATHAO_DISPATCH_ENABLED === "true"; } catch { return false; }
}
export function positiveId(value) {
  return Number.isSafeInteger(value) && value > 0;
}
export function shipmentInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).some(k => !["city_id", "zone_id", "area_id", "item_weight"].includes(k)) ||
      ![body.city_id, body.zone_id, body.area_id].every(positiveId) ||
      typeof body.item_weight !== "number" || !Number.isFinite(body.item_weight) ||
      body.item_weight < 0.5 || body.item_weight > 10) {
    throw new PathaoError("Choose valid Pathao city, zone, area and package weight (0.5–10 kg). No payment or COD overrides are accepted.", 400);
  }
  return body;
}
export function createPathaoClient(env, fetcher = fetch) {
  const config = pathaoConfig(env);
  let token;
  async function request(path, { method = "GET", body, authenticated = true } = {}) {
    try {
      const response = await fetcher(`${config.base}/aladdin/api/v1${path}`, {
        method, redirect: "error", signal: AbortSignal.timeout(15000),
        headers: { Accept: "application/json", "Content-Type": "application/json", ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok) throw new PathaoError("Pathao request was not confirmed.");
      const result = await response.json();
      if (!result || result.type === "error" || Number(result.code) >= 400) throw new PathaoError("Pathao request was not confirmed.");
      return result;
    } catch { throw new PathaoError("Pathao request was not confirmed."); }
  }
  async function authenticate() {
    if (token) return;
    const result = await request("/external/login", { method: "POST", authenticated: false, body: { client_id: config.clientId, client_secret: config.clientSecret } });
    if (typeof result.access_token !== "string" || !result.access_token) throw new PathaoError("Pathao authentication failed.");
    token = result.access_token;
  }
  async function locations(type, parentId) {
    const routes = { cities: "/countries/1/city-list", zones: `/cities/${parentId}/zone-list`, areas: `/zones/${parentId}/area-list` };
    if (!routes[type] || (type !== "cities" && !positiveId(parentId))) throw new PathaoError("Invalid location request.", 400);
    await authenticate();
    const result = await request(routes[type]);
    const rows = result?.data?.data;
    const prefix = { cities: "city", zones: "zone", areas: "area" }[type];
    if (!Array.isArray(rows)) throw new PathaoError("Invalid Pathao location response.");
    return rows.filter(row => positiveId(Number(row[`${prefix}_id`])) && typeof row[`${prefix}_name`] === "string")
      .map(row => ({ id: Number(row[`${prefix}_id`]), name: row[`${prefix}_name`] }));
  }
  return {
    config, authenticate, locations,
    async validateDestination(input) {
      const city = (await locations("cities")).some(x => x.id === input.city_id);
      if (!city) throw new PathaoError("City is not available from Pathao.", 400);
      const zone = (await locations("zones", input.city_id)).some(x => x.id === input.zone_id);
      if (!zone) throw new PathaoError("Zone does not belong to the selected city.", 400);
      const area = (await locations("areas", input.zone_id)).some(x => x.id === input.area_id);
      if (!area) throw new PathaoError("Area does not belong to the selected zone.", 400);
    },
    async createShipment(payload) {
      // NO retries. Pathao does not publish a verified idempotency guarantee.
      await authenticate();
      const result = await request("/orders", { method: "POST", body: payload });
      const data = result?.data;
      if (!data || typeof data.consignment_id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(data.consignment_id) ||
          data.merchant_order_id !== payload.merchant_order_id) throw new PathaoError("Pathao booking outcome is unknown.");
      return { consignment_id: data.consignment_id, provider_status: typeof data.order_status === "string" ? data.order_status.slice(0, 100) : "Created" };
    },
    async tracking(consignmentId) {
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(consignmentId)) throw new PathaoError("Invalid consignment ID.", 400);
      await authenticate();
      const result = await request(`/orders/${encodeURIComponent(consignmentId)}/info`);
      if (result?.data?.consignment_id !== consignmentId || typeof result.data.order_status !== "string") throw new PathaoError("Invalid Pathao tracking response.");
      return result.data.order_status.slice(0, 100);
    },
  };
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
