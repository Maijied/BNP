import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createSession } from "../functions/_lib/admin-auth.js";
import { createPathaoClient, shipmentInput, pathaoConfig } from "../functions/_lib/pathao.js";
import { readOrder, claimShipment } from "../functions/_lib/shipment-store.js";
import { onRequestGet, onRequestPost, onRequestPatch } from "../functions/api/admin/orders/[id]/shipment.js";
import { onRequestPatch as updateOrder } from "../functions/api/admin/orders/[id].js";
import { onRequestPost as createStoreRoute } from "../functions/api/admin/pathao/stores.js";
import { onRequestPost as checkout } from "../functions/api/order.js";
import { onRequestPost as webhook } from "../functions/api/payment/webhook.js";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
const orderId = "a1111111-1111-4111-8111-111111111111";
let fixtureNumber = 0;
const input = { city_id: 1, zone_id: 2, area_id: 3, item_weight: 0.5 };
function fixture({ proof = true, payment = "paid", fulfillment = "qc" } = {}) {
  const sqlite = new DatabaseSync(":memory:");
  for (const path of ["0001_orders.sql", "0002_admin_login_attempts.sql", "0003_pathao_shipments.sql", "0004_pathao_scope_webhooks.sql", "0005_pathao_store_requests.sql"]) sqlite.exec(readFileSync(new URL(`../migrations/d1/${path}`, import.meta.url), "utf8"));
  const db = {
    prepare(sql) {
      const stmt = sqlite.prepare(sql);
      let args = [];
      const wrapped = {
        bind(...values) { args = values; return wrapped; },
        async first() { return stmt.get(...args) || null; },
        async all() { return { results: stmt.all(...args) }; },
        async run() { const result = stmt.run(...args); return { meta: { changes: Number(result.changes) } }; },
      };
      return wrapped;
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try { const result = []; for (const stmt of statements) result.push(await stmt.run()); sqlite.exec("COMMIT"); return result; }
      catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  sqlite.prepare(`INSERT INTO orders (id,order_number,customer_name,customer_phone,district,delivery_address,subtotal_bdt,delivery_bdt,total_bdt,payment_status,fulfillment_status)
    VALUES (?, 'BNP-TEST-001', 'Test Customer', '01712345678', 'Dhaka', 'Test address for mocked shipment', 380,60,440,?,?)`).run(orderId, payment, fulfillment);
  sqlite.prepare(`INSERT INTO order_items (id,order_id,plate_type,registration_bangla,quantity,unit_price_bdt,line_total_bdt,rule_version)
    VALUES ('item',?,'motorcycle_front','test',1,380,380,'test')`).run(orderId);
  sqlite.prepare(`INSERT INTO payment_attempts (id,order_id,bridge_reference,bridge_session_id,amount_bdt,status)
    VALUES ('attempt',?,'reference','session',440,'paid')`).run(orderId);
  sqlite.exec(`INSERT INTO payment_events(id,bridge_event_id,attempt_id,event_type,verified_at) VALUES ('event','bridge-event','attempt','test.payment.settled','2026-11-05T00:00:00Z')`);
  if (proof) sqlite.prepare(`INSERT INTO payment_settlements VALUES (?,'attempt','event',440,'BDT','reference','2026-11-05T00:00:00Z')`).run(orderId);
  const env = { DB: db, ADMIN_EMAIL: "admin@example.test", ADMIN_PASSWORD: "test-only-long-password", ADMIN_SESSION_SECRET: "test-only-session-key-12345678901234567890",
    PATHAO_MERCHANT_KEY: "test-merchant", PATHAO_PRODUCT_KEY: "bnp", PATHAO_ENABLED: "true", PATHAO_DISPATCH_ENABLED: "true", PATHAO_ENVIRONMENT: "sandbox", PATHAO_STORE_ID: "12", PATHAO_CLIENT_ID: `test-client-${++fixtureNumber}`, PATHAO_CLIENT_SECRET: "test-secret", PATHAO_USERNAME: "test-user", PATHAO_PASSWORD: "test-password" };
  return { sqlite, db, env };
}
async function context(env, method = "POST", body = input, headers = {}) {
  return { env, params: { id: orderId }, request: new Request(`https://bnp.shop/api/admin/orders/${orderId}/shipment`, {
    method, headers: { Cookie: `bnp_admin_session=${await createSession(env)}`, Origin: "https://bnp.shop", "Content-Type": "application/json", ...headers },
    ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
  }) };
}
function mockProvider({ booking, tracking, onBooking, failure } = {}) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, ...init });
    assert.ok(url.startsWith("https://courier-api-sandbox.pathao.com/aladdin/api/v1/"));
    if (url.endsWith("/issue-token")) {
      const grant = JSON.parse(init.body);
      assert.match(grant.client_id, /^test-client-/);
      assert.deepEqual({ ...grant, client_id: "test-client" }, { client_id: "test-client", client_secret: "test-secret", grant_type: "password", username: "test-user", password: "test-password" });
      return Response.json({ access_token: "test-access-token", expires_in: 3600 });
    }
    assert.equal(init.headers.Authorization, "Bearer test-access-token");
    if (url.includes("/stores?page=")) return Response.json({data:{data:[{store_id:12,store_name:"Test store",store_address:"Test pickup address",is_active:1,city_id:1,zone_id:2,hub_id:3,is_default_store:0,is_default_return_store:0}],current_page:1,last_page:1,per_page:1000,total:1}});
    if (url.endsWith("/city-list")) { assert.ok(url.endsWith("/v1/city-list")); return Response.json({ data: { data: [{ city_id: 1, city_name: "Dhaka" }] } }); }
    if (url.endsWith("/zone-list")) return Response.json({ data: { data: [{ zone_id: 2, zone_name: "Test zone" }] } });
    if (url.endsWith("/area-list")) return Response.json({ data: { data: [{ area_id: 3, area_name: "Test area" }] } });
    if (url.endsWith("/orders")) {
      await onBooking?.();
      if (failure) throw new Error("Simulated network loss with secret upstream data");
      return booking || Response.json({ data: { consignment_id: "TEST-CONSIGNMENT", merchant_order_id: "BNP-TEST-001", order_status: "Pending" } });
    }
    if (url.endsWith("/info")) return tracking || Response.json({ data: { consignment_id: "TEST-CONSIGNMENT", merchant_order_id: "BNP-TEST-001", order_status: "Delivered" } });
    throw new Error("Unexpected provider route");
  };
  return calls;
}

test("Pathao is disabled by default and arbitrary hosts/environments are rejected", () => {
  assert.throws(() => pathaoConfig({}), /disabled/);
  assert.throws(() => pathaoConfig({ PATHAO_ENABLED: "true", PATHAO_ENVIRONMENT: "https://evil.example" }), /environment/);
});
test("input refuses payment, recipient and COD overrides and invalid dimensions", () => {
  for (const body of [{ ...input, amount_to_collect: 440 }, { ...input, payment_status: "paid" }, { ...input, recipient_name: "Forged" }, { ...input, item_weight: 0 }, { ...input, city_id: "1" }, null, []]) assert.throws(() => shipmentInput(body));
});
test("public checkout and webhook cannot create payments while settlement is absent", async () => {
  let called = false; globalThis.fetch = async () => { called = true; throw Error(); };
  assert.equal((await checkout()).status, 503);
  assert.equal((await webhook()).status, 503);
  assert.equal(called, false);
});
test("shipment endpoints require signed auth and mutation origin", async () => {
  const { env } = fixture(); const calls = mockProvider();
  for (const handler of [onRequestGet, onRequestPost, onRequestPatch]) assert.equal((await handler({env,params:{id:orderId},request:new Request('https://bnp.shop/api/admin/orders/x/shipment')})).status,401);
  assert.equal((await onRequestPost(await context(env, "POST", input, { Origin: "https://evil.example" }))).status, 403);
  assert.equal(calls.length, 0);
});
test("paid flag without settlement proof cannot dispatch", async () => {
  const { env } = fixture({ proof: false }); const calls = mockProvider();
  const read = await onRequestGet(await context(env, "GET")); assert.equal((await read.json()).eligible, false);
  assert.equal((await onRequestPost(await context(env))).status, 409); assert.equal(calls.length, 0);
});
for (const payment of ["unpaid", "pending", "failed", "refunded", "disputed"]) test(`${payment} status blocks despite an old settlement proof`, async () => {
  const { env } = fixture({ payment }); const calls = mockProvider();
  assert.equal((await onRequestPost(await context(env))).status, 409); assert.equal(calls.length, 0);
});
for (const sql of ["UPDATE payment_settlements SET amount_bdt=441", "UPDATE payment_settlements SET bridge_reference='other'", "UPDATE payment_attempts SET status='refunded'", "UPDATE payment_attempts SET bridge_session_id=NULL", "UPDATE payment_attempts SET amount_bdt=441", "UPDATE payment_events SET verified_at=''", "UPDATE orders SET fulfillment_status='cancelled'"]) test(`SQL gate refuses inconsistent proof: ${sql}`, async () => {
  const { db, sqlite } = fixture(); sqlite.exec(sql);
  assert.equal((await readOrder(db, orderId)).eligible, 0);
});
test("atomic claim permits exactly one owner and refuses ineligible order", async () => {
  const { db, env, sqlite } = fixture();
  const args = { orderId, config: pathaoConfig(env), input, requestHash: "test-hash", actor: "admin@example.test" };
  const results = await Promise.all([claimShipment(db,{...args,id:"first"}),claimShipment(db,{...args,id:"second"})]);
  assert.deepEqual(results.map(r=>r.meta.changes),[1,0]);
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM courier_shipments").get().n,1);
});
test("successful booking always uses stored customer and zero COD; duplicate cannot rebook", async () => {
  const { env, sqlite } = fixture(); const calls = mockProvider();
  assert.equal((await onRequestPost(await context(env))).status,201);
  assert.equal((await onRequestPost(await context(env))).status,409);
  const bookings = calls.filter(c=>c.url.endsWith('/orders')); assert.equal(bookings.length,1);
  const body = JSON.parse(bookings[0].body);
  assert.equal(body.amount_to_collect,0); assert.equal(body.recipient_name,'Test Customer'); assert.equal(body.store_id,12);
  assert.equal(body.merchant_order_id,'BNP-TEST-001'); assert.equal(body.item_quantity,1);
  assert.equal(sqlite.prepare('SELECT state FROM courier_shipments').get().state,'created');
  assert.equal(sqlite.prepare('SELECT fulfillment_status FROM orders').get().fulfillment_status,'qc');
});
test("concurrent route requests produce one external booking", async () => {
  const { env } = fixture(); const calls = mockProvider();
  const results = await Promise.all([onRequestPost(await context(env)),onRequestPost(await context(env))]);
  assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
  assert.equal(calls.filter(c=>c.url.endsWith('/orders')).length,1);
});
test("wrong geographic parent is rejected without claiming or posting", async () => {
  const { env, sqlite } = fixture(); const calls = mockProvider();
  assert.equal((await onRequestPost(await context(env,'POST',{...input,zone_id:999}))).status,400);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM courier_shipments').get().n,0);
  assert.equal(calls.filter(c=>c.url.endsWith('/orders')).length,0);
});
for (const mode of ['network', 'http401', 'http500', 'malformed', 'wrong-reference']) test(`ambiguous ${mode} booking is retained without retry`, async () => {
  const { env, sqlite } = fixture();
  const booking = mode === 'http401' ? new Response('',{status:401}) : mode === 'http500' ? new Response('',{status:500}) : mode === 'malformed' ? Response.json({data:{}}) : mode === 'wrong-reference' ? Response.json({data:{consignment_id:'TEST',merchant_order_id:'wrong'}}) : undefined;
  const calls = mockProvider({failure:mode==='network',booking});
  const response=await onRequestPost(await context(env)); assert.equal(response.status,202);
  assert.equal((await response.text()).includes('secret upstream'),false);
  assert.equal(sqlite.prepare('SELECT state FROM courier_shipments').get().state,'unknown');
  assert.equal((await onRequestPost(await context(env))).status,409);
  assert.equal(calls.filter(c=>c.url.endsWith('/orders')).length,1);
});
test("lost post-booking DB response retains durable claim and prevents second booking", async () => {
  const { env, db, sqlite } = fixture(); const calls = mockProvider();
  const original=db.prepare;
  db.prepare=sql=>{ if(sql.includes("state = 'created', consignment_id")) throw Error('DB failure'); return original(sql); };
  assert.equal((await onRequestPost(await context(env))).status,202);
  assert.equal(sqlite.prepare('SELECT state FROM courier_shipments').get().state,'unknown');
  assert.equal((await onRequestPost(await context(env))).status,409);
  assert.equal(calls.filter(c=>c.url.endsWith('/orders')).length,1);
});
test("tracking refresh retains explicit courier status without inferring fulfillment", async () => {
  const { env, sqlite } = fixture(); mockProvider();
  await onRequestPost(await context(env));
  assert.equal((await onRequestPatch(await context(env,'PATCH'))).status,200);
  assert.equal(sqlite.prepare('SELECT provider_status FROM courier_shipments').get().provider_status,'Delivered');
  assert.equal(sqlite.prepare('SELECT fulfillment_status FROM orders').get().fulfillment_status,'qc');
});
test("tracking cannot be queried against a different environment", async () => {
  const { env } = fixture(); const calls=mockProvider(); await onRequestPost(await context(env));
  const count=calls.length; env.PATHAO_ENVIRONMENT='production';
  assert.equal((await onRequestPatch(await context(env,'PATCH'))).status,409); assert.equal(calls.length,count);
});
test("manual fulfillment cannot mark shipped without a production booking", async () => {
  const { env, sqlite } = fixture(); mockProvider(); await onRequestPost(await context(env));
  const make=async()=>{const c=await context(env);c.request=new Request(c.request.url,{method:'PATCH',headers:c.request.headers,body:JSON.stringify({status:'shipped'})});return c;};
  assert.equal((await updateOrder(await make())).status,409);
  sqlite.exec("UPDATE courier_shipments SET environment='production'");
  assert.equal((await updateOrder(await make())).status,200);
});
test("disabled dispatch does not contact provider", async () => {
  const { env }=fixture(); env.PATHAO_DISPATCH_ENABLED='false'; const calls=mockProvider();
  assert.equal((await onRequestPost(await context(env))).status,503); assert.equal(calls.length,0);
});

test("settlement changed during geography lookup blocks atomic claim and external dispatch", async () => {
  const { env, sqlite }=fixture(); const calls=mockProvider(); const provider=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{const response=await provider(url,options);if(url.endsWith('/area-list'))sqlite.exec("UPDATE orders SET payment_status='refunded'");return response;};
  assert.equal((await onRequestPost(await context(env))).status,409);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM courier_shipments').get().n,0);
  assert.equal(calls.filter(c=>c.url.endsWith('/orders')).length,0);
});
test("provider auth failure before claiming is safe and secrets never reach response", async () => {
  const { env, sqlite }=fixture(); let calls=0;
  globalThis.fetch=async()=>{calls++;return new Response('test-secret',{status:401});};
  const response=await onRequestPost(await context(env));assert.equal(response.status,503);
  assert.equal((await response.text()).includes('test-secret'),false);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM courier_shipments').get().n,0);assert.equal(calls,1);
});
test("failed tracking refresh preserves previous status", async () => {
  const { env, sqlite }=fixture(); mockProvider({tracking:Response.json({data:{consignment_id:'WRONG',order_status:'Delivered'}})});
  await onRequestPost(await context(env));assert.equal((await onRequestPatch(await context(env,'PATCH'))).status,503);
  assert.equal(sqlite.prepare('SELECT provider_status FROM courier_shipments').get().provider_status,'Pending');
});
test("SQL atomic claim independently rejects an order lacking proof", async () => {
  const { db, env }=fixture({proof:false});
  const result=await claimShipment(db,{id:'untrusted-claim',orderId,config:pathaoConfig(env),input,requestHash:'test',actor:'admin@example.test'});
  assert.equal(result.meta.changes,0);
});

test("concurrent clients share one password grant within an isolate", async () => {
  const { env }=fixture();let grants=0;
  const fetcher=async(url,options)=>{assert.ok(url.endsWith('/issue-token'));grants++;assert.equal(JSON.parse(options.body).grant_type,'password');return Response.json({access_token:'memory-only-token',refresh_token:'memory-only-refresh',expires_in:3600});};
  await Promise.all([createPathaoClient(env,fetcher).authenticate(),createPathaoClient(env,fetcher).authenticate(),createPathaoClient(env,fetcher).authenticate()]);
  assert.equal(grants,1);
});
test("expired memory token refreshes once without re-sending merchant password", async () => {
  const { env }=fixture();const grants=[];const originalNow=Date.now;let now=originalNow();Date.now=()=>now;
  const fetcher=async(url,options)=>{assert.ok(url.endsWith('/issue-token'));grants.push(JSON.parse(options.body));return Response.json({access_token:`memory-token-${grants.length}`,refresh_token:'memory-refresh',expires_in:3600});};
  try {
    await createPathaoClient(env,fetcher).authenticate();now+=3600000;
    await Promise.all([createPathaoClient(env,fetcher).authenticate(),createPathaoClient(env,fetcher).authenticate()]);
    assert.equal(grants.length,2);
    assert.deepEqual(grants[1],{client_id:env.PATHAO_CLIENT_ID,client_secret:env.PATHAO_CLIENT_SECRET,grant_type:'refresh_token',refresh_token:'memory-refresh'});
  } finally {Date.now=originalNow;}
});
test("failed refresh does not silently replay a password grant", async () => {
  const { env }=fixture();const originalNow=Date.now;let now=originalNow();Date.now=()=>now;let calls=0;
  const fetcher=async()=>{calls++;return calls===1?Response.json({access_token:'initial',refresh_token:'refresh',expires_in:3600}):new Response('',{status:401});};
  try {await createPathaoClient(env,fetcher).authenticate();now+=3600000;await assert.rejects(()=>createPathaoClient(env,fetcher).authenticate());assert.equal(calls,2);} finally {Date.now=originalNow;}
});
test("credential rotation creates a fresh grant rather than reusing another credential cache", async () => {
  const { env }=fixture();let calls=0;const fetcher=async()=>{calls++;return Response.json({access_token:'token',expires_in:3600});};
  await createPathaoClient(env,fetcher).authenticate();await createPathaoClient({...env,PATHAO_PASSWORD:'different-test-password'},fetcher).authenticate();assert.equal(calls,2);
});

const storeRequestId = "ca111111-1111-4111-8111-111111111111";
const storeDetails = { name: "Test store", contact_name: "Test Contact", contact_number: "01712345678", address: "Test pickup address for mocked store", city_id: 1, zone_id: 2, area_id: 3 };
async function storeContext(env, body = { request_id: storeRequestId, store: storeDetails }, headers = {}) {
  const c = await context(env, "POST", body, headers);
  c.request = new Request("https://bnp.shop/api/admin/pathao/stores", { method: "POST", headers: c.request.headers, body: JSON.stringify(body) });
  return c;
}
function storeProvider({ failure = false } = {}) {
  const calls = mockProvider(); const base = globalThis.fetch; let storePosts = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/stores') && options.method === 'POST') {
      storePosts++; assert.deepEqual(JSON.parse(options.body), storeDetails);
      if (failure) throw Error("Private upstream response");
      return Response.json({type:'success',code:200,data:{store_name:storeDetails.name}});
    }
    return base(url, options);
  };
  return { calls, get posts() { return storePosts; } };
}
test("store creation has a separate disabled gate, signed admin and origin check", async () => {
  const { env } = fixture(); const provider = storeProvider();
  assert.equal((await createStoreRoute(await storeContext(env))).status, 503);
  env.PATHAO_STORE_MANAGEMENT_ENABLED = 'true';
  assert.equal((await createStoreRoute(await storeContext(env, undefined, {Origin:'https://evil.example'}))).status, 403);
  const c = await storeContext(env); c.request.headers.delete('Cookie');
  assert.equal((await createStoreRoute(c)).status, 401);
  assert.equal(provider.posts,0); assert.equal(provider.calls.length,0);
});
test("store creation validates inputs without provider access", async () => {
  const { env, sqlite } = fixture(); env.PATHAO_STORE_MANAGEMENT_ENABLED='true'; const provider = storeProvider();
  for (const body of [{request_id:'not-a-uuid',store:storeDetails}, {request_id:storeRequestId,store:{...storeDetails, contact_number:'bad'}}, {request_id:storeRequestId,store:{...storeDetails, unexpected:true}}]) assert.equal((await createStoreRoute(await storeContext(env,body))).status,400);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM pathao_store_requests').get().n,0); assert.equal(provider.calls.length,0);
});
test("store creation submits once and reports pending approval, never an active store", async () => {
  const { env, sqlite } = fixture(); env.PATHAO_STORE_MANAGEMENT_ENABLED='true'; const provider = storeProvider();
  const response = await createStoreRoute(await storeContext(env)); assert.equal(response.status,202);
  assert.equal((await response.json()).store.state,'pending_approval');
  assert.equal((await createStoreRoute(await storeContext(env))).status,409); assert.equal(provider.posts,1);
  assert.equal(sqlite.prepare('SELECT state FROM pathao_store_requests').get().state,'submitted');
});
test("concurrent store create requests share one durable claim", async () => {
  const { env } = fixture(); env.PATHAO_STORE_MANAGEMENT_ENABLED='true'; const provider = storeProvider();
  const results = await Promise.all([createStoreRoute(await storeContext(env)),createStoreRoute(await storeContext(env))]);
  assert.deepEqual(results.map(r=>r.status).sort(),[202,409]); assert.equal(provider.posts,1);
});
test("ambiguous store creation is retained and never automatically replayed", async () => {
  const { env, sqlite } = fixture(); env.PATHAO_STORE_MANAGEMENT_ENABLED='true'; const provider = storeProvider({failure:true});
  const response=await createStoreRoute(await storeContext(env)); assert.equal(response.status,202);
  const body=await response.json(); assert.equal(body.state,'unknown'); assert.equal(JSON.stringify(body).includes('Private'),false);
  assert.equal((await createStoreRoute(await storeContext(env))).status,409); assert.equal(provider.posts,1);
  assert.equal(sqlite.prepare('SELECT state FROM pathao_store_requests').get().state,'unknown');
});
test("store creation does not dispatch if geography is invalid", async () => {
  const { env, sqlite } = fixture(); env.PATHAO_STORE_MANAGEMENT_ENABLED='true'; const provider=storeProvider();
  assert.equal((await createStoreRoute(await storeContext(env,{request_id:storeRequestId,store:{...storeDetails,zone_id:999}}))).status,400);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM pathao_store_requests').get().n,0); assert.equal(provider.posts,0);
});
test("another merchant/product cannot read, refresh or fulfill an existing shipment", async () => {
  const { env, sqlite }=fixture(); const calls=mockProvider(); await onRequestPost(await context(env)); const before=calls.length;
  env.PATHAO_PRODUCT_KEY='other-product';
  assert.equal((await onRequestGet(await context(env,'GET'))).status,409);
  assert.equal((await onRequestPatch(await context(env,'PATCH'))).status,409);
  assert.equal(calls.length,before);
  sqlite.exec("UPDATE courier_shipments SET environment='production'");
  const c=await context(env);c.request=new Request(c.request.url,{method:'PATCH',headers:c.request.headers,body:JSON.stringify({status:'shipped'})});
  assert.equal((await updateOrder(c)).status,409);
});

test("store request UUID casing cannot bypass the durable request claim", async () => {
  const { env }=fixture();env.PATHAO_STORE_MANAGEMENT_ENABLED='true';const provider=storeProvider();
  const results=await Promise.all([createStoreRoute(await storeContext(env)),createStoreRoute(await storeContext(env,{request_id:storeRequestId.toUpperCase(),store:storeDetails}))]);
  assert.deepEqual(results.map(r=>r.status).sort(),[202,409]);assert.equal(provider.posts,1);
  assert.equal((await createStoreRoute(await storeContext(env,{request_id:storeRequestId.toUpperCase(),store:storeDetails}))).status,409);
});
