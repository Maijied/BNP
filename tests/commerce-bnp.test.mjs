import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createCommerceApi } from '../services/lorapok-api/src/commerce.js';
import { createCommerceRegistry, sha256 } from '../services/lorapok-api/src/registry.js';
import { createSession } from '../functions/_lib/admin-auth.js';
import { onRequestGet as catalog } from '../functions/api/catalog.js';
import { onRequestPost as intake } from '../functions/api/order.js';
import { onRequestGet as orders } from '../functions/api/admin/orders.js';
import { onRequestPatch as update, onRequestGet as order } from '../functions/api/admin/orders/[id].js';
import { onRequestGet as settings, onRequestPost as save } from '../functions/api/admin/settings.js';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
async function fixture(t) {
 const sql = new DatabaseSync(':memory:'); t.after(() => sql.close());
 sql.exec(readFileSync(new URL('../services/lorapok-api/migrations/0001_commerce.sql', import.meta.url), 'utf8'));
 const db = { prepare(q) { const s=sql.prepare(q); let values=[]; return { bind(...v){values=v;return this;}, async first(){return s.get(...values)||null;}, async all(){return {results:s.all(...values)};}, async run(){return {meta:{changes:Number(s.run(...values).changes)}};} }; } };
 const storefront='s'.repeat(48),admin='a'.repeat(48);
 sql.prepare('INSERT INTO platform_registrations VALUES(?,?,?,1)').run('m','bnp','sandbox');
 for (const [token,permissions] of [[storefront,['catalog:read','orders:create']],[admin,['catalog:read','catalog:write','orders:read','orders:update']]]) sql.prepare('INSERT INTO platform_api_clients VALUES(?,?,?,?,?,1)').run(await sha256(token),'m','bnp','sandbox',JSON.stringify(permissions));
 const api=createCommerceApi({db,registry:createCommerceRegistry({db}),flags:{orderIntake:true}}), calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,options});assert.equal(options.headers.Origin,undefined);assert.equal(options.headers.Cookie,undefined);return api(new Request(url,options));};
 const env={PLATFORM_API_URL:'https://platform.test',PLATFORM_STOREFRONT_API_TOKEN:storefront,PLATFORM_ADMIN_API_TOKEN:admin,PLATFORM_MERCHANT_KEY:'m',PLATFORM_PRODUCT_KEY:'bnp',PLATFORM_ENVIRONMENT:'sandbox',ADMIN_EMAIL:'admin@example.test',ADMIN_PASSWORD:'test-password-long-enough',ADMIN_SESSION_SECRET:'test-session-secret-'.repeat(3),DB:{prepare(){throw Error('Legacy fallback forbidden');}}};
 const cookie=`bnp_admin_session=${await createSession(env)}`;
 const ctx=(path,{method='GET',body,auth=false,origin=true,params={}}={})=>({env,params,request:new Request('https://bnp.test'+path,{method,headers:{...(auth?{Cookie:cookie}:{}),...(origin?{Origin:'https://bnp.test'}:{}),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})})});
 const product={expected_version:0,title:'Test plate',unit_price_minor:38000,currency:'BDT',active:true,kind:'plate',metadata:{model:'A'}};
 const shipping={expected_version:0,label:'Dhaka city service area',price_minor:6000,active:true};
 async function seed(){assert.equal((await save(ctx('/api/admin/settings',{method:'POST',auth:true,body:{type:'product',key:'plate',input:product}}))).status,200);assert.equal((await save(ctx('/api/admin/settings',{method:'POST',auth:true,body:{type:'shipping',key:'city',input:shipping}}))).status,200);}
 const input=()=>({request_id:crypto.randomUUID(),customer:{name:'Test Customer',phone:'01700000000',address:'Test address',district:'Dhaka'},items:[{sku:'plate',quantity:2,customization:{registration_bangla:'ঢাকা'}}],shipping_code:'city',expected_catalog_versions:{plate:1},expected_shipping_version:1});
 return {env,calls,ctx,seed,input,sql,product};
}
test('public and admin adapters use least-privilege tokens without forwarding cookies or origin',async t=>{
 const f=await fixture(t);await f.seed();f.calls.length=0;
 const c=await catalog(f.ctx('/api/catalog'));assert.equal(c.status,200);assert.equal((await c.json()).capabilities.payment_capture,false);assert.ok(f.calls.every(c=>c.options.headers.Authorization==='Bearer '+f.env.PLATFORM_STOREFRONT_API_TOKEN));
 f.calls.length=0;assert.equal((await settings(f.ctx('/api/admin/settings',{auth:true}))).status,200);assert.ok(f.calls.every(c=>c.options.headers.Authorization==='Bearer '+f.env.PLATFORM_ADMIN_API_TOKEN));
 assert.equal((await settings(f.ctx('/api/admin/settings'))).status,401);
});
test('unpaid intake is durable and exact retries deduplicate with immutable server prices',async t=>{
 const f=await fixture(t);await f.seed();const body=f.input();const a=await intake(f.ctx('/api/order',{method:'POST',body}));assert.equal(a.status,201);const data=await a.json();assert.equal(data.order.total_minor,82000);assert.equal(data.order.payment_status,'unpaid');assert.equal(data.checkoutUrl,undefined);
 const b=await intake(f.ctx('/api/order',{method:'POST',body}));assert.equal(b.status,200);assert.equal((await b.json()).order.id,data.order.id);assert.equal(f.sql.prepare('SELECT count(*) n FROM commerce_orders').get().n,1);
 assert.equal((await intake(f.ctx('/api/order',{method:'POST',body:{...body,total_minor:1}}))).status,400);
});
test('admin scoped order reads and versioned transitions cannot mark payment or production',async t=>{
 const f=await fixture(t);await f.seed();const created=await (await intake(f.ctx('/api/order',{method:'POST',body:f.input()}))).json(),id=created.order.id;
 assert.equal((await orders(f.ctx('/api/admin/orders',{auth:true}))).status,200);assert.equal((await order(f.ctx('/api/admin/orders/'+id,{auth:true,params:{id}}))).status,200);
 const patch=body=>update(f.ctx('/api/admin/orders/'+id,{method:'PATCH',auth:true,params:{id},body}));
 assert.equal((await patch({status:'verification',expected_version:1})).status,200);assert.equal((await patch({status:'production',expected_version:2})).status,409);assert.equal((await patch({payment_status:'paid',expected_version:2})).status,400);assert.equal((await patch({status:'cancelled',expected_version:1})).status,409);
});
test('same-origin writes, authentication, stale catalog and wrong scope fail closed',async t=>{
 const f=await fixture(t);await f.seed();const body=f.input();assert.equal((await intake(f.ctx('/api/order',{method:'POST',body,origin:false}))).status,403);assert.equal((await save(f.ctx('/api/admin/settings',{method:'POST',body:{}}))).status,401);
 assert.equal((await save(f.ctx('/api/admin/settings',{method:'POST',auth:true,origin:false,body:{}}))).status,403);
 assert.equal((await intake(f.ctx('/api/order',{method:'POST',body:{...body,expected_shipping_version:99}}))).status,409);
 f.env.PLATFORM_PRODUCT_KEY='other';const r=await catalog(f.ctx('/api/catalog'));assert.equal(r.status,503);assert.equal((await r.text()).includes(f.env.PLATFORM_STOREFRONT_API_TOKEN),false);
});
test('missing service config never falls back to DB or broad token',async t=>{
 const f=await fixture(t);f.env.PLATFORM_API_TOKEN=f.env.PLATFORM_ADMIN_API_TOKEN;delete f.env.PLATFORM_STOREFRONT_API_TOKEN;assert.equal((await catalog(f.ctx('/api/catalog'))).status,503);assert.equal(f.calls.length,0);
 delete f.env.PLATFORM_ADMIN_API_TOKEN;assert.equal((await orders(f.ctx('/api/admin/orders',{auth:true}))).status,503);assert.equal(f.calls.length,0);
});
test('service binding is supported and public errors never leak upstream bodies',async t=>{
 const f=await fixture(t);const fetcher=globalThis.fetch;delete f.env.PLATFORM_API_URL;f.env.PLATFORM_API_BINDING={fetch:fetcher};assert.equal((await catalog(f.ctx('/api/catalog'))).status,200);
 f.env.PLATFORM_API_BINDING.fetch=async()=>new Response(JSON.stringify({error:{code:'private_problem',message:'secret credential raw database detail'}}),{status:503});const r=await catalog(f.ctx('/api/catalog'));assert.equal(r.status,503);assert.equal((await r.text()).includes('secret'),false);
});
test('intake UI has no payment redirect and retains exact pending request for retries',()=>{
 const source=readFileSync(new URL('../components/OrderForm.tsx',import.meta.url),'utf8');assert.equal(source.includes('window.location'),false);assert.equal(source.includes('checkoutUrl'),false);assert.match(source,/JSON.stringify\(pending.current\)/);assert.match(source,/sessionStorage.setItem/);assert.match(source,/expected_shipping_version/);assert.match(source,/Unpaid request recorded/);
});
test('BFF body reader rejects media types, encoding, declared size and streamed size before service calls',async()=>{
 const {readInput}=await import('../functions/_lib/commerce.js');
 for(const headers of [{'Content-Type':'text/plain'},{'Content-Type':'application/json','Content-Encoding':'gzip'},{'Content-Type':'application/json','Content-Length':'20001'},{'Content-Type':'application/json','Content-Length':'invalid'}]) await assert.rejects(readInput(new Request('https://bnp.test/api/order',{method:'POST',headers,body:'{}'})),e=>e.status===400);
 let cancelled=false;
 const stream=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(20001));},cancel(){cancelled=true;}});
 await assert.rejects(readInput(new Request('https://bnp.test/api/order',{method:'POST',headers:{'Content-Type':'application/json'},body:stream,duplex:'half'})),e=>e.status===400);assert.equal(cancelled,true);
 const invalidUtf8=new Uint8Array([0xff]);await assert.rejects(readInput(new Request('https://bnp.test/api/order',{method:'POST',headers:{'Content-Type':'application/json'},body:invalidUtf8})),e=>e.status===400);
 assert.deepEqual(await readInput(new Request('https://bnp.test/api/order',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:'{"ok":true}'})),{ok:true});
});
test('BFF slow body deadline cancels the stream rather than waiting indefinitely',async()=>{
 const {readInput}=await import('../functions/_lib/commerce.js');let cancelled=false;
 const stream=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('{\"ok\":true}'));},cancel(){cancelled=true;}});const start=Date.now();
 await assert.rejects(readInput(new Request('https://bnp.test/api/order',{method:'POST',headers:{'Content-Type':'application/json'},body:stream,duplex:'half'})),e=>e.status===400);
 assert.equal(cancelled,true);assert.ok(Date.now()-start<6500);
});
test('UI exact minor units, safe totals, declared shipping and stale load guards remain in place',()=>{
 const source=readFileSync(new URL('../components/OrderForm.tsx',import.meta.url),'utf8');assert.match(source,/BigInt\(Number.MAX_SAFE_INTEGER\)/);assert.match(source,/Number.isSafeInteger\(quantity\)/);assert.match(source,/subject to address verification/);assert.match(source,/generation !== loadGeneration.current/);assert.equal(source.includes('/ 100).toFixed'),false);
 for(const file of ['../app/admin/orders/page.tsx','../app/admin/settings/page.tsx'])assert.match(readFileSync(new URL(file,import.meta.url),'utf8'),/current !== generation.current/);
});
test('admin logout is same-origin POST and clears the session cookie',async()=>{
 const {onRequestPost}=await import('../functions/api/admin/logout.js');
 for(const origin of [null,'https://other.test']) { const request=new Request('https://bnp.test/api/admin/logout',{method:'POST',headers:origin?{Origin:origin}:{}});const response=await onRequestPost({request});assert.equal(response.status,403);assert.equal(response.headers.has('Set-Cookie'),false); }
 const response=await onRequestPost({request:new Request('https://bnp.test/api/admin/logout',{method:'POST',headers:{Origin:'https://bnp.test'}})});assert.equal(response.status,200);assert.equal((await response.json()).success,true);assert.match(response.headers.get('Set-Cookie'),/bnp_admin_session=;/);assert.match(response.headers.get('Set-Cookie'),/Max-Age=0/);
});
test('shared admin header confirms logout before navigation and pages guard unmounted mutations',()=>{
 const header=readFileSync(new URL('../components/AdminHeader.tsx',import.meta.url),'utf8');assert.match(header,/fetch\('\/api\/admin\/logout', \{ method: 'POST', credentials: 'same-origin'/);assert.match(header,/!response.ok \|\| result.success !== true/);assert.match(header,/router.replace\('\/admin\/login'\)/);assert.match(header,/role="alert"/);assert.match(header,/\/images\/themes\/lorapok-labs.svg/);assert.match(header,/if \(!alive.current\) return/);
 for(const file of ['../app/admin/orders/page.tsx','../app/admin/settings/page.tsx']) {const source=readFileSync(new URL(file,import.meta.url),'utf8');assert.match(source,/<AdminHeader/);assert.match(source,/onLogoutStart=\{\(\) => \{ alive.current = false; \+\+generation.current/);assert.match(source,/if \(!alive.current \|\| busy\) return/);assert.match(source,/finally \{ if \(alive.current\) setBusy\(false\)/);}
});
