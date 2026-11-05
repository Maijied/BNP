import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createApi } from '../services/pathao-api/src/api.js';
import { createSession } from '../functions/_lib/admin-auth.js';
import { onRequestPost as dispatch } from '../functions/api/admin/orders/[id]/shipment.js';
const originalFetch=globalThis.fetch;afterEach(()=>{globalThis.fetch=originalFetch;});
function dbWith(paths){const sqlite=new DatabaseSync(':memory:');for(const p of paths)sqlite.exec(readFileSync(new URL(p,import.meta.url),'utf8'));const db={prepare(sql){let args=[];return{bind(...v){args=v;return this;},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return{results:sqlite.prepare(sql).all(...args)};},async run(){const r=sqlite.prepare(sql).run(...args);return{meta:{changes:Number(r.changes)}};}};}};return{db,sqlite};}
const id='d1111111-1111-4111-8111-111111111111';
const input={store_id:12,city_id:1,zone_id:2,area_id:3,item_weight:0.5};
function fixture({proof=true,serviceProduct='bnp'}={}){
 const bnp=dbWith(['0001_orders.sql','0002_admin_login_attempts.sql','0003_pathao_shipments.sql','0004_pathao_scope_webhooks.sql','0005_pathao_store_requests.sql'].map(p=>'../migrations/d1/'+p));
 bnp.sqlite.prepare(`INSERT INTO orders(id,order_number,customer_name,customer_phone,district,delivery_address,subtotal_bdt,delivery_bdt,total_bdt,payment_status,fulfillment_status) VALUES(?,'BNP-SERVICE-001','Test Customer','01712345678','Dhaka','Mock delivery address only',380,60,440,'paid','qc')`).run(id);
 bnp.sqlite.prepare(`INSERT INTO order_items(id,order_id,plate_type,registration_bangla,quantity,unit_price_bdt,line_total_bdt,rule_version) VALUES('item',?,'motorcycle_front','test',1,380,380,'fixture')`).run(id);
 bnp.sqlite.prepare(`INSERT INTO payment_attempts(id,order_id,bridge_reference,bridge_session_id,amount_bdt,status) VALUES('attempt',?,'reference','session',440,'paid')`).run(id);
 bnp.sqlite.exec(`INSERT INTO payment_events(id,bridge_event_id,attempt_id,event_type,verified_at) VALUES('event','bridge','attempt','fixture.settled','2026-11-05T00:00:00Z')`);
 if(proof)bnp.sqlite.prepare(`INSERT INTO payment_settlements VALUES(?,'attempt','event',440,'BDT','reference','2026-11-05T00:00:00Z')`).run(id);
 const service=dbWith(['../services/pathao-api/migrations/0001_api.sql']);
 const signing='fixture-signing-key-123456789012345678901234567890';
 const token='T'.repeat(43);let bookings=0;const calls=[];
 const identity={scope:{merchant:'merchant',product:serviceProduct},environment:'sandbox',permissions:['courier:read','courier:dispatch'],getDispatchKey:async()=>signing};
 const provider={stores:async()=>({stores:[{id:12,active:true}],pagination:{current_page:1,last_page:1}}),validateStore:async()=>({id:12,active:true}),validateDestination:async()=>{},
 locations:async type=>[{id:{cities:1,zones:2,areas:3}[type],name:'Test',home_delivery_available:true,pickup_available:true}],createShipment:async payload=>{bookings++;assert.equal(payload.amount_to_collect,0);return{consignment_id:'TEST-SERVICE',provider_status:'Pending'};}};
 const api=createApi({db:service.db,registry:{authenticate:async request=>request.headers.get('Authorization')===`Bearer ${token}`?identity:null},providerFor:async()=>provider,rewards:{},flags:{provider:true,dispatch:true}});
 globalThis.fetch=async(url,options)=>{assert.ok(url.startsWith('https://courier.example.test/'));assert.equal(options.headers.Origin,undefined);calls.push({url,options});return api(new Request(url,options));};
 const env={COMMERCE_BACKEND_MODE:"legacy",DB:bnp.db,ADMIN_EMAIL:'admin@example.test',ADMIN_PASSWORD:'fixture-password-long-enough',ADMIN_SESSION_SECRET:'fixture-admin-secret-123456789012345678901234',PATHAO_ENABLED:'true',PATHAO_DISPATCH_ENABLED:'true',PATHAO_BACKEND_MODE:'service',PATHAO_MERCHANT_KEY:'merchant',PATHAO_PRODUCT_KEY:'bnp',PATHAO_ENVIRONMENT:'sandbox',COURIER_API_URL:'https://courier.example.test',COURIER_API_TOKEN:token,COURIER_DISPATCH_SIGNING_KEY:signing};
 return{env,bnp,service,calls,get bookings(){return bookings;}};
}
async function context(env,body=input){return{env,params:{id},request:new Request(`https://bnp.example.test/api/admin/orders/${id}/shipment`,{method:'POST',headers:{Cookie:`bnp_admin_session=${await createSession(env)}`,Origin:'https://bnp.example.test','Content-Type':'application/json'},body:JSON.stringify(body)})};}
test('BNP thin adapter dispatches through independent API with both durable claims and zero COD',async()=>{
 const f=fixture();const r=await dispatch(await context(f.env));assert.equal(r.status,201);assert.equal(f.bookings,1);
 assert.equal(f.bnp.sqlite.prepare('SELECT state FROM courier_shipments').get().state,'created');assert.equal(f.service.sqlite.prepare('SELECT state FROM courier_operations').get().state,'confirmed');
 const request=f.calls.find(c=>c.url.endsWith('/v1/shipments'));assert.ok(JSON.parse(request.options.body).dispatch_grant);assert.equal((await r.text()).includes('dispatch_grant'),false);
 assert.equal((await dispatch(await context(f.env))).status,409);assert.equal(f.bookings,1);
});
test('BNP cannot reach the separate service based on a paid flag without verified proof',async()=>{
 const f=fixture({proof:false});assert.equal((await dispatch(await context(f.env))).status,409);assert.equal(f.calls.length,0);assert.equal(f.bookings,0);
});
test('BNP refuses a service token configured for another product before dispatch',async()=>{
 const f=fixture({serviceProduct:'other'});assert.equal((await dispatch(await context(f.env))).status,503);assert.equal(f.bookings,0);assert.equal(f.service.sqlite.prepare('SELECT count(*) n FROM courier_operations').get().n,0);
});
test('missing server dispatch key cannot create an independent API shipment',async()=>{
 const f=fixture();delete f.env.COURIER_DISPATCH_SIGNING_KEY;const r=await dispatch(await context(f.env));assert.equal(r.status,202);assert.equal(f.bookings,0);assert.equal(f.bnp.sqlite.prepare('SELECT state FROM courier_shipments').get().state,'unknown');
});
