import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createCommerceApi} from '../services/lorapok-api/src/commerce.js';
import {createCommerceRegistry,sha256} from '../services/lorapok-api/src/registry.js';
import {createPaymentPort} from '../services/lorapok-api/src/payment-port.js';
const originalFetch=globalThis.fetch;
beforeEach(()=>{globalThis.fetch=async()=>assert.fail('Network forbidden');});
afterEach(()=>{globalThis.fetch=originalFetch;});
async function fixture(t,flags={orderIntake:true}){
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());sql.exec(readFileSync(new URL('../services/lorapok-api/migrations/0001_commerce.sql',import.meta.url),'utf8'));
 const db={prepare(q){const s=sql.prepare(q);let v=[];return {bind(...x){v=x;return this;},async first(){return s.get(...v)||null;},async all(){return {results:s.all(...v)};},async run(){return {meta:{changes:Number(s.run(...v).changes)}};}};}};
 async function client({merchant='m',product='bnp',environment='sandbox',permissions=['catalog:read','catalog:write','orders:create','orders:read','orders:update']}={}){const token=(await sha256(JSON.stringify([merchant,product,environment,permissions]))).slice(0,48);sql.prepare('INSERT OR IGNORE INTO platform_registrations VALUES(?,?,?,1)').run(merchant,product,environment);sql.prepare('INSERT OR REPLACE INTO platform_api_clients VALUES(?,?,?,?,?,1)').run(await sha256(token),merchant,product,environment,JSON.stringify(permissions));return token;}
 const token=await client(),api=createCommerceApi({db,registry:createCommerceRegistry({db}),flags,now:()=>1000});
 const call=(path,{method='GET',body,auth=token,headers={}}={})=>api(new Request('https://api.test'+path,{method,headers:{...(auth?{Authorization:'Bearer '+auth}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})}));
 const product={expected_version:0,title:'Synthetic plate',unit_price_minor:159900,currency:'BDT',active:true,kind:'plate',metadata:{model:'A'}};
 const shipping={expected_version:0,label:'Synthetic shipping',price_minor:10000,active:true};
 const seed=async()=>{assert.equal((await call('/v1/admin/catalog/products/plate',{method:'PUT',body:product})).status,201);assert.equal((await call('/v1/admin/catalog/shipping/standard',{method:'PUT',body:shipping})).status,201);};
 const input=()=>({request_id:crypto.randomUUID(),customer:{name:'Synthetic Person',phone:'01700000000',address:'Synthetic test address',district:'Dhaka'},items:[{sku:'plate',quantity:2,customization:{registration_bangla:'ঢাকা'}}],shipping_code:'standard',expected_catalog_versions:{plate:1},expected_shipping_version:1});
 const create=b=>call('/v1/orders',{method:'POST',body:b});return {sql,db,client,call,seed,input,create,product,shipping,token};
}
test('empty independent registry, bearer-only auth, strict permissions, disablement and no CORS',async t=>{
 const f=await fixture(t);assert.deepEqual((await (await f.call('/v1/catalog')).json()).products,[]);
 for(const headers of [{Cookie:'session=x'},{Authorization:'Bearer short'},{Authorization:'Bearer '+'x'.repeat(48)}])assert.equal((await f.call('/v1/catalog',{auth:null,headers})).status,401);
 assert.equal((await f.call('/v1/catalog',{headers:{Origin:'https://bnp.test'}})).status,403);
 const r=await f.call('/v1/catalog');assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.has('access-control-allow-origin'),false);
 const denied=await f.client({permissions:[]});for(const p of ['/v1/catalog','/v1/admin/catalog','/v1/admin/orders'])assert.equal((await f.call(p,{auth:denied})).status,403);
 assert.equal(JSON.stringify(f.sql.prepare('SELECT * FROM platform_api_clients').all()).includes(f.token),false);
 f.sql.prepare('UPDATE platform_registrations SET enabled=0').run();assert.equal((await f.call('/v1/context')).status,401);
});
test('catalog optimistic concurrency, archives and immutable revisions',async t=>{
 const f=await fixture(t);await f.seed();const edit={...f.product,expected_version:1,active:false};
 const result=await Promise.all([1,2,3].map(()=>f.call('/v1/admin/catalog/products/plate',{method:'PUT',body:edit})));assert.deepEqual(result.map(r=>r.status).sort(),[200,409,409]);
 assert.equal((await (await f.call('/v1/catalog')).json()).products.length,0);assert.equal((await (await f.call('/v1/admin/catalog')).json()).products[0].version,2);
 assert.equal(f.sql.prepare('SELECT count(*) n FROM commerce_catalog_versions').get().n,3);
 assert.throws(()=>f.sql.exec("UPDATE commerce_catalog_versions SET data_json='{}'"),/immutable_revision/);
});
test('exact server prices, immutable snapshots, concurrent idempotency and mismatched reuse',async t=>{
 const f=await fixture(t);await f.seed();const input=f.input(),rs=await Promise.all(Array.from({length:8},()=>f.create(input)));assert.equal(rs.filter(r=>r.status===201).length,1);assert.equal(rs.filter(r=>r.status===200).length,7);
 const data=await rs[0].json(),o=data.order;assert.equal(o.total_minor,329800);assert.equal(o.payment_status,'unpaid');assert.equal(o.status,'new');assert.equal(o.items[0].line_total_minor,319800);assert.equal(Object.hasOwn(o,'lookup_secret'),false);
 assert.equal((await f.create({...input,request_id:input.request_id.toUpperCase()})).status,200);
 assert.equal((await f.create({...input,customer:{...input.customer,name:'Different'}})).status,409);
 await f.call('/v1/admin/catalog/products/plate',{method:'PUT',body:{...f.product,expected_version:1,unit_price_minor:1}});
 assert.equal((await f.create(input)).status,200);assert.equal((await f.create(f.input())).status,409);
 const saved=(await (await f.call('/v1/admin/orders/'+o.id)).json()).order;assert.equal(saved.total_minor,329800);assert.equal(saved.items[0].unit_price_minor,159900);
 assert.throws(()=>f.sql.exec("UPDATE commerce_orders SET snapshot_json='{}'"),/invalid_order_mutation/);
});
test('tenant, application and environment isolation across reads writes and request ids',async t=>{
 const f=await fixture(t);await f.seed();const input=f.input(),o=(await (await f.create(input)).json()).order;
 for(const props of [{merchant:'other'},{product:'other'},{environment:'production'}]){const auth=await f.client(props);assert.equal((await (await f.call('/v1/catalog',{auth})).json()).products.length,0);assert.equal((await (await f.call('/v1/admin/orders',{auth})).json()).orders.length,0);assert.equal((await f.call('/v1/admin/orders/'+o.id,{auth})).status,404);assert.equal((await f.call('/v1/admin/orders/'+o.id,{auth,method:'PATCH',body:{status:'cancelled',expected_version:1}})).status,404);assert.equal((await f.call('/v1/orders',{auth,method:'POST',body:input})).status,409);}
});
test('strict validation rejects injected totals payment states unknown fields and integer overflow',async t=>{
 const f=await fixture(t);await f.seed();for(const patch of [{paid:true},{total_minor:1},{payment_status:'paid'},{request_id:'x'},{expected_shipping_version:2},{items:[{sku:'plate',quantity:101,customization:{}}]},{items:[{sku:'plate',quantity:1.5,customization:{}}]},{customer:{...f.input().customer,secret:'x'}},{items:[{sku:'plate',quantity:1,customization:{unknown:'x'}}]}]){const r=await f.create({...f.input(),...patch});assert.ok([400,409].includes(r.status));}
 for(const amount of [-1,1.2,'100',Number.MAX_SAFE_INTEGER+1])assert.equal((await f.call('/v1/admin/catalog/products/bad',{method:'PUT',body:{...f.product,unit_price_minor:amount}})).status,400);
 await f.call('/v1/admin/catalog/products/plate',{method:'PUT',body:{...f.product,expected_version:1,unit_price_minor:Number.MAX_SAFE_INTEGER}});const b=f.input();b.expected_catalog_versions.plate=2;assert.equal((await f.create(b)).status,400);assert.equal(f.sql.prepare('SELECT count(*) n FROM commerce_orders').get().n,0);
});
test('atomic guards catch catalog race and order/audit rollback on persistence failure',async t=>{
 const f=await fixture(t);await f.seed();const prepare=f.db.prepare.bind(f.db);let race=true;f.db.prepare=q=>{if(race&&q.includes('INSERT INTO commerce_orders')){race=false;f.sql.exec("UPDATE commerce_catalog SET version=2,active=0 WHERE kind='product'");}return prepare(q);};assert.equal((await f.create(f.input())).status,409);assert.equal(f.sql.prepare('SELECT count(*) n FROM commerce_orders').get().n,0);
 const g=await fixture(t);await g.seed();g.sql.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON commerce_order_audit BEGIN SELECT RAISE(ABORT,'private failure'); END");const r=await g.create(g.input());assert.equal(r.status,500);assert.equal((await r.text()).includes('private failure'),false);assert.equal(g.sql.prepare('SELECT count(*) n FROM commerce_orders').get().n,0);
});
test('bounded scoped pagination and audited status graph block unpaid production',async t=>{
 const f=await fixture(t);await f.seed();const ids=[];for(let i=0;i<3;i++)ids.push((await (await f.create(f.input())).json()).order.id);
 const a=await (await f.call('/v1/admin/orders?limit=2')).json(),b=await (await f.call('/v1/admin/orders?limit=2&cursor='+a.next_cursor)).json();assert.equal(a.orders.length,2);assert.equal(b.orders.length,1);assert.equal(new Set([...a.orders,...b.orders].map(o=>o.id)).size,3);assert.equal(b.next_cursor,null);
 for(const path of ['/v1/admin/orders?limit=101','/v1/admin/orders?cursor=bad','/v1/admin/orders?status=paid','/v1/admin/orders?q=x&cursor='+a.next_cursor])assert.equal((await f.call(path)).status,400);
 const patch=(status,version)=>f.call('/v1/admin/orders/'+ids[0],{method:'PATCH',body:{status,expected_version:version}});
 for(const state of ['paid','production','qc','shipped'])assert.equal((await patch(state,1)).status,409);
 const updates=await Promise.all([patch('verification',1),patch('cancelled',1)]);assert.deepEqual(updates.map(r=>r.status).sort(),[200,409]);const current=(await (await f.call('/v1/admin/orders/'+ids[0])).json()).order;
 if(current.status==='verification')assert.equal((await patch('cancelled',2)).status,200);assert.equal((await patch('verification',3)).status,409);assert.ok(f.sql.prepare('SELECT count(*) n FROM commerce_order_audit').get().n>=4);
});
test('nonpayment feature flags and payment port remain closed without provider calls',async t=>{
 const f=await fixture(t,{});await f.seed();assert.equal((await f.create(f.input())).status,503);const caps=(await (await f.call('/v1/capabilities')).json()).capabilities;assert.deepEqual(caps,{order_intake:false,payment_capture:false,paid_dispatch:false});
 const g=await fixture(t,{orderIntake:true,paymentCapture:true,paidDispatch:true});for(const p of ['/v1/payments','/v1/dispatch'])assert.equal((await g.call(p,{method:'POST',body:{}})).status,503);
 for(const fn of ['createPayment','capture','verify','refund','dispatchPaid'])await assert.rejects(createPaymentPort()[fn](),e=>e.code==='gateway_deferred'&&e.status===503);
});
test('permission-specific writes, oversized bodies and UTF-8 scoped cursors are bounded',async t=>{
 const f=await fixture(t);await f.seed();const auth=await f.client({permissions:['catalog:read']});
 assert.equal((await f.call('/v1/orders',{method:'POST',body:f.input(),auth})).status,403);
 assert.equal((await f.call('/v1/admin/catalog/products/x',{method:'PUT',body:f.product,auth})).status,403);
 const ids=[];for(let i=0;i<3;i++){const input=f.input();input.customer.name='ঢাকা Person';ids.push((await (await f.create(input)).json()).order.id);}
 assert.equal((await f.call('/v1/admin/orders/'+ids[0],{method:'PATCH',body:{status:'cancelled',expected_version:1},auth})).status,403);
 const a=await (await f.call('/v1/admin/orders?limit=1&q='+encodeURIComponent('ঢাকা'))).json();assert.ok(a.next_cursor);const b=await (await f.call('/v1/admin/orders?limit=1&q='+encodeURIComponent('ঢাকা')+'&cursor='+a.next_cursor)).json();assert.equal(b.orders.length,1);assert.notEqual(a.orders[0].id,b.orders[0].id);
 const other=await f.client({product:'other'});assert.equal((await f.call('/v1/admin/orders?limit=1&q='+encodeURIComponent('ঢাকা')+'&cursor='+a.next_cursor,{auth:other})).status,400);
 assert.equal((await f.create({...f.input(),extra:'x'.repeat(33000)})).status,413);
 assert.throws(()=>f.sql.prepare('INSERT INTO platform_api_clients VALUES(?,?,?,?,?,1)').run('a'.repeat(64),'absent','bnp','sandbox','[]'),/FOREIGN KEY/);
 assert.throws(()=>f.sql.exec('DELETE FROM commerce_order_audit'),/immutable_audit/);
});
test('body deadline cancels a slow stream; compression and bad lengths fail before reading',async t=>{
 const f=await fixture(t);const api=createCommerceApi({db:f.db,registry:createCommerceRegistry({db:f.db}),flags:{orderIntake:true},bodyTimeoutMs:15});
 async function streaming(headers={}){let cancelled=false,pulls=0;const stream=new ReadableStream({pull(){pulls++;return new Promise(()=>{});},cancel(){cancelled=true;return new Promise(()=>{});}},{highWaterMark:0});const req=new Request('https://api.test/v1/orders',{method:'POST',duplex:'half',headers:{Authorization:'Bearer '+f.token,'Content-Type':'application/json',...headers},body:stream});const result=await api(req);return {result,cancelled,pulls};}
 const slow=await streaming();assert.equal(slow.result.status,408);assert.equal(slow.cancelled,true);assert.equal(slow.pulls,1);
 for(const [headers,status] of [[{'Content-Encoding':'gzip'},415],[{'Content-Encoding':'br'},415],[{'Content-Length':'32769'},413],[{'Content-Length':'-1'},400],[{'Content-Length':'1.5'},400],[{'Content-Length':'nonsense'},400]]){const r=await streaming(headers);assert.equal(r.result.status,status);assert.equal(r.cancelled,true);assert.equal(r.pulls,0);}
 assert.equal((await f.call('/v1/orders',{method:'POST',body:f.input(),headers:{'Content-Length':'1'}})).status,400);
});
test('invalid registry identities fail closed and model metadata semantics are validated',async t=>{
 const f=await fixture(t);const good={scope:{merchant:'m',product:'bnp'},environment:'sandbox',permissions:['catalog:read']};
 for(const identity of [{...good,scope:null},{...good,scope:{merchant:'m:other',product:'bnp'}},{...good,scope:{merchant:'m',product:42}},{...good,environment:'staging'},{...good,permissions:'catalog:read'}]){const api=createCommerceApi({db:f.db,registry:{authenticate:async()=>identity}});assert.equal((await api(new Request('https://api.test/v1/context'))).status,401);}
 for(const model of ['C',null,12,{},['A']])assert.equal((await f.call('/v1/admin/catalog/products/invalid',{method:'PUT',body:{...f.product,metadata:{model}}})).status,400);
 assert.equal((await f.call('/v1/admin/catalog/products/bracket',{method:'PUT',body:{...f.product,kind:'bracket',metadata:{}}})).status,201);
});
test('twenty item checkout stays below D1 100 bind limit using shared scope CTE',async t=>{
 const f=await fixture(t);await f.seed();const prepare=f.db.prepare.bind(f.db);let maxBindings=0;
 f.db.prepare=q=>{const statement=prepare(q),bind=statement.bind.bind(statement);statement.bind=(...args)=>{maxBindings=Math.max(maxBindings,args.length);assert.ok(args.length<=100,'D1 maximum 100 bound parameters');return bind(...args);};return statement;};
 const input=f.input();input.items=[];input.expected_catalog_versions={};
 for(let i=0;i<20;i++){const sku='plate'+i;assert.equal((await f.call('/v1/admin/catalog/products/'+sku,{method:'PUT',body:f.product})).status,201);input.items.push({sku,quantity:1,customization:{}});input.expected_catalog_versions[sku]=1;}
 const result=await f.create(input);assert.equal(result.status,201);assert.equal((await result.json()).order.items.length,20);assert.ok(maxBindings<100);assert.equal(maxBindings,56);
});
