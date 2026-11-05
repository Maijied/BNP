import { bdtMinor } from "../money.js";
// Lorapok Pathao transport boundary. Server-only; no BNP, HTTP route, or DB dependencies.
const HOSTS = Object.freeze({ sandbox: "https://courier-api-sandbox.pathao.com", production: "https://api-hermes.pathao.com" });
export class PathaoError extends Error {
  constructor(code, status = 503) { super(code); this.code = code; this.status = status; }
}
export const positiveId = value => Number.isSafeInteger(value) && value > 0;
export function validateScope(scope) {
  if (!scope || ![scope.merchant, scope.product].every(v => typeof v === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(v))) {
    throw new PathaoError("Pathao merchant and product scope must be configured.");
  }
  return Object.freeze({ merchant: scope.merchant, product: scope.product });
}
export async function sha256(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))))
    .map(b => b.toString(16).padStart(2, "0")).join("");
}

// Storage adapter contract: get/set/delete plus withLock(key, async operation).
// A durable implementation MUST encrypt tokens and coordinate leases across isolates.
// This bounded in-memory default persists only for the lifetime of this isolate.
export function createMemoryTokenStore(limit = 32) {
  const values = new Map();
  const locks = new Map();
  return {
    async get(key) { return values.get(key); },
    async set(key, value) { values.delete(key); values.set(key, value); },
    async delete(key) { values.delete(key); },
    async withLock(key, operation) {
      if (locks.has(key)) return locks.get(key);
      // Backpressure, never evict an active grant and start a second one for it.
      if (locks.size >= limit) throw new PathaoError("Pathao authentication is busy.");
      const pending = Promise.resolve().then(operation);
      locks.set(key, pending);
      try { return await pending; }
      finally {
        locks.delete(key);
        for (const candidate of values.keys()) {
          if (values.size <= limit) break;
          if (!locks.has(candidate)) values.delete(candidate);
        }
      }
    },
  };
}
const defaultTokens = createMemoryTokenStore();
const requiredText = value => typeof value === "string" && value.length > 0 && value.length <= 8192;
function numericId(value) { return typeof value === "number" ? value : typeof value === "string" && /^[1-9]\d*$/.test(value) ? Number(value) : NaN; }
function flag(value) {
  if ([true, 1, "1"].includes(value)) return true;
  if ([false, 0, "0"].includes(value)) return false;
  throw new PathaoError("Invalid Pathao store response.");
}
export function normalizeStores(result, page) {
  const data = result?.data;
  if (!data || !Array.isArray(data.data) || data.data.length > 1000 ||
      ![data.current_page, data.last_page, data.per_page, data.total].every(Number.isSafeInteger) ||
      data.current_page !== page || data.last_page < page || data.last_page > 1000 || data.per_page < 1 || data.per_page > 1000 ||
      data.total < data.data.length || data.data.length > data.per_page) throw new PathaoError("Invalid Pathao store pagination.");
  const seen = new Set();
  const stores = data.data.map(row => {
    const ids = [row?.store_id, row?.city_id, row?.zone_id, row?.hub_id].map(numericId);
    if (!ids.every(positiveId) || seen.has(ids[0]) || typeof row.store_address !== "string" || row.store_address.length > 1000 ||
        (row.store_name != null && (typeof row.store_name !== "string" || row.store_name.length > 200))) throw new PathaoError("Invalid Pathao store response.");
    seen.add(ids[0]);
    return { id: ids[0], name: row.store_name || null, address: row.store_address, active: flag(row.is_active),
      city_id: ids[1], zone_id: ids[2], hub_id: ids[3], is_default_store: flag(row.is_default_store), is_default_return_store: flag(row.is_default_return_store) };
  });
  return { stores, pagination: { current_page: page, last_page: data.last_page, per_page: data.per_page, total: data.total } };
}
export function rateInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).some(k => !["store_id", "city_id", "zone_id", "area_id", "item_weight"].includes(k)) ||
      ![input.store_id, input.city_id, input.zone_id].every(positiveId) ||
      (input.area_id !== undefined && !positiveId(input.area_id)) || typeof input.item_weight !== "number" ||
      !Number.isFinite(input.item_weight) || input.item_weight < 0.5 || input.item_weight > 10) throw new PathaoError("Invalid courier estimate input.", 400);
  return input;
}

export function storeInput(input) {
  const allowed = ["name", "contact_name", "contact_number", "secondary_contact", "otp_number", "address", "city_id", "zone_id", "area_id"];
  const text = (value, min, max) => typeof value === "string" && Array.from(value.trim()).length >= min && Array.from(value).length <= max;
  const phone = value => typeof value === "string" && /^01[3-9]\d{8}$/.test(value);
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(k => !allowed.includes(k)) ||
      !text(input.name, 3, 50) || !text(input.contact_name, 3, 50) || !text(input.address, 15, 120) || !phone(input.contact_number) ||
      ![input.city_id, input.zone_id, input.area_id].every(positiveId) ||
      (input.secondary_contact !== undefined && !phone(input.secondary_contact)) || (input.otp_number !== undefined && !phone(input.otp_number))) {
    throw new PathaoError("Invalid pickup store details.", 400);
  }
  return { ...input };
}

export function createPathaoService({ scope: suppliedScope, environment = "sandbox", credentials }, { fetcher = fetch, tokenStore = defaultTokens, now = () => Date.now() } = {}) {
  const scope = validateScope(suppliedScope);
  if (!Object.hasOwn(HOSTS, environment)) throw new PathaoError("Invalid Pathao environment.");
  if (!credentials || ![credentials.clientId, credentials.clientSecret, credentials.username, credentials.password].every(requiredText)) {
    throw new PathaoError("Pathao API credentials are not configured.");
  }
  // Copy credentials so caller mutation cannot change an active client's identity.
  const { clientId, clientSecret, username, password } = credentials;
  const base = HOSTS[environment];
  const key = sha256(JSON.stringify([scope.merchant, scope.product, base, clientId, clientSecret, username, password]));
  async function send(path, { method = "GET", body, accessToken } = {}) {
    try {
      const response = await fetcher(`${base}/aladdin/api/v1${path}`, { method, redirect: "error", signal: AbortSignal.timeout(15000),
        headers: { Accept: "application/json", "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}) });
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (!result || result.type === "error" || Number(result.code) >= 400) throw new Error();
      return result;
    } catch { throw new PathaoError("Pathao request was not confirmed."); }
  }
  async function accessToken() {
    const cacheKey = await key;
    return tokenStore.withLock(cacheKey, async () => {
      const cached = await tokenStore.get(cacheKey);
      if (cached?.failedRefresh) throw new PathaoError("Pathao token renewal needs operator review.");
      if (cached?.accessToken && cached.expiresAt > now()) return cached.accessToken;
      try {
        const result = await send("/issue-token", { method: "POST", body: { client_id: clientId, client_secret: clientSecret,
          ...(cached?.refreshToken ? { grant_type: "refresh_token", refresh_token: cached.refreshToken }
            : { grant_type: "password", username, password }) } });
        const seconds = Number(result.expires_in);
        if (!requiredText(result.access_token) || !Number.isFinite(seconds) || seconds <= 0 || seconds > 90 * 86400 ||
            (result.token_type !== undefined && result.token_type !== "Bearer")) throw new PathaoError("Pathao authentication failed.");
        const entry = { accessToken: result.access_token,
          refreshToken: requiredText(result.refresh_token) ? result.refresh_token : undefined,
          expiresAt: now() + seconds * 1000 - Math.min(60000, seconds * 100) };
        await tokenStore.set(cacheKey, entry);
        return entry.accessToken;
      } catch (error) {
        // A failed refresh is not retried as a password grant within this isolate.
        // Credential rotation/reset or a reviewed adapter lifecycle can clear it.
        if (cached?.refreshToken) await tokenStore.set(cacheKey, { failedRefresh: true });
        throw error;
      }
    });
  }
  async function request(path, options) { return send(path, { ...options, accessToken: await accessToken() }); }
  async function locations(type, parentId) {
    const routes = { cities: "/city-list", zones: `/cities/${parentId}/zone-list`, areas: `/zones/${parentId}/area-list` };
    if (!Object.hasOwn(routes, type) || (type !== "cities" && !positiveId(parentId))) throw new PathaoError("Invalid location request.", 400);
    const result = await request(routes[type]);
    const rows = result?.data?.data;
    const prefix = { cities: "city", zones: "zone", areas: "area" }[type];
    if (!Array.isArray(rows)) throw new PathaoError("Invalid Pathao location response.");
    return rows.filter(row => positiveId(numericId(row[`${prefix}_id`])) && typeof row[`${prefix}_name`] === "string")
      .map(row => ({ id: numericId(row[`${prefix}_id`]), name: row[`${prefix}_name`],
        ...(type === "areas" ? { home_delivery_available: typeof row.home_delivery_available === "boolean" ? row.home_delivery_available : null,
          pickup_available: typeof row.pickup_available === "boolean" ? row.pickup_available : null } : {}) }));
  }
  async function stores(page = 1) {
    if (!positiveId(page) || page > 1000) throw new PathaoError("Invalid store page.", 400);
    return normalizeStores(await request(`/stores?page=${page}`), page);
  }
  async function validateStore(storeId) {
    if (!positiveId(storeId)) throw new PathaoError("Choose a pickup store.", 400);
    // Bounded lookup, never silently dispatch from an unverified/default store.
    for (let page = 1; page <= 20; page++) {
      const result = await stores(page);
      const store = result.stores.find(item => item.id === storeId);
      if (store) {
        if (!store.active) throw new PathaoError("Pickup store is inactive.", 400);
        return store;
      }
      if (page >= result.pagination.last_page) break;
    }
    throw new PathaoError("Pickup store could not be verified for this merchant.", 400);
  }
  return Object.freeze({
    scope, environment, authenticate: async () => { await accessToken(); }, locations, stores, validateStore,
    async validateDestination(input, { purpose = "delivery" } = {}) {
      if (!(await locations("cities")).some(x => x.id === input.city_id)) throw new PathaoError("City is not available from Pathao.", 400);
      if (!(await locations("zones", input.city_id)).some(x => x.id === input.zone_id)) throw new PathaoError("Zone does not belong to the selected city.", 400);
      const area = (await locations("areas", input.zone_id)).find(x => x.id === input.area_id);
      if (!area) throw new PathaoError("Area does not belong to the selected zone.", 400);
      if (!["delivery", "pickup"].includes(purpose) || area[purpose === "pickup" ? "pickup_available" : "home_delivery_available"] !== true) throw new PathaoError("The selected area's courier availability is not confirmed.", 400);
    },
    async rateEstimate(input) {
      rateInput(input);
      await validateStore(input.store_id);
      if (!(await locations("cities")).some(x => x.id === input.city_id) || !(await locations("zones", input.city_id)).some(x => x.id === input.zone_id)) throw new PathaoError("Invalid estimate destination.", 400);
      if (input.area_id !== undefined) {
        const area = (await locations("areas", input.zone_id)).find(x => x.id === input.area_id);
        if (!area || area.home_delivery_available !== true) throw new PathaoError("The estimate area is not available for home delivery.", 400);
      }
      const result = await request("/merchant/price-plan", { method: "POST", body: { store_id: input.store_id, item_type: 2, delivery_type: 48,
        item_weight: input.item_weight, recipient_city: input.city_id, recipient_zone: input.zone_id } });
      const data = result?.data;
      const fields = ["price", "discount", "promo_discount", "additional_charge", "final_price"];
      if (!data || !fields.every(k => typeof data[k] === "number" && Number.isFinite(data[k]) && data[k] >= 0) || !positiveId(data.plan_id)) throw new PathaoError("Invalid courier estimate response.");
      let amountsMinor;try { amountsMinor=Object.fromEntries(fields.map(k=>[k,bdtMinor(data[k])])); } catch { throw new PathaoError("Invalid courier estimate response."); }
      if(data.cod_enabled!==undefined && ![0,1,false,true].includes(data.cod_enabled))throw new PathaoError("Invalid courier estimate response.");
      if(data.cod_percentage!==undefined && (typeof data.cod_percentage!=="number" || !Number.isFinite(data.cod_percentage) || data.cod_percentage<0 || data.cod_percentage>1))throw new PathaoError("Invalid courier estimate response.");
      return { ...Object.fromEntries(fields.map(k => [k, data[k]])), plan_id: data.plan_id, currency: "BDT", amounts_minor:amountsMinor,
        ...(data.cod_enabled!==undefined?{cod_enabled:data.cod_enabled}:{}),...(data.cod_percentage!==undefined?{cod_percentage:data.cod_percentage}:{}),
        amount_to_collect:0, kind:"estimate", invoice_confirmed:false };
    },
    async createStore(input) {
      // Non-idempotent: caller needs a durable request claim and explicit admin action.
      const body = storeInput(input);
      const result = await request("/stores", { method: "POST", body });
      if (typeof result?.data?.store_name !== "string" || result.data.store_name !== body.name) throw new PathaoError("Store creation outcome is unknown.");
      return { name: result.data.store_name, state: "pending_approval" };
    },
    async createShipment(payload) {
      // Transport-only: caller must own a durable claim and verified payment proof.
      // NO retry, including 401. Never infer provider idempotency from order reference.
      if (!payload || payload.amount_to_collect !== 0 || !positiveId(payload.store_id) || typeof payload.merchant_order_id !== "string") throw new PathaoError("Only validated prepaid shipments are supported.", 400);
      const result = await request("/orders", { method: "POST", body: payload });
      const data = result?.data;
      if (!data || typeof data.consignment_id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(data.consignment_id) || data.merchant_order_id !== payload.merchant_order_id) throw new PathaoError("Pathao booking outcome is unknown.");
      return { consignment_id: data.consignment_id, provider_status: typeof data.order_status === "string" ? data.order_status.slice(0, 100) : "Created" };
    },
    async tracking(consignmentId, merchantOrderId) {
      if (typeof consignmentId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(consignmentId)) throw new PathaoError("Invalid consignment ID.", 400);
      const result = await request(`/orders/${encodeURIComponent(consignmentId)}/info`);
      if (result?.data?.consignment_id !== consignmentId || typeof result.data.order_status !== "string" ||
          (merchantOrderId !== undefined && result.data.merchant_order_id !== merchantOrderId)) throw new PathaoError("Invalid Pathao tracking response.");
      return result.data.order_status.slice(0, 100);
    },
  });
}
