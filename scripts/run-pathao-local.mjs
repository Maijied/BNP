// MOCK-ONLY local preview. No process.env credentials, real provider, or persistent DB.
// Run: node scripts/run-pathao-local.mjs. Both listeners bind only to 127.0.0.1.
import { createServer } from 'node:http';
import { vintageDemoProducts, vintageDemoShipping } from './fixtures/vintage-shop.mjs';
import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createApi } from '../services/pathao-api/src/api.js';
import { createCommerceApi } from '../services/lorapok-api/src/commerce.js';
import { createCommerceRegistry } from '../services/lorapok-api/src/registry.js';
import { onRequest as adminMiddleware } from '../functions/admin/_middleware.js';
import { createD1Registry } from '../services/pathao-api/src/registry.js';
import { createTokenCipher } from '../services/pathao-api/src/token-store.js';
import { createRewardsService } from '../services/pathao-api/src/rewards.js';
import { sha256, rateInput, storeInput, PathaoError } from '../services/pathao-api/src/provider/service.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const options = {};
for (let index=2;index<process.argv.length;index++) {
  const argument=process.argv[index];
  if(argument==='--smoke')continue;
  const match=argument.match(/^--(api-port|frontend-port|out)(?:=(.*))?$/);
  if(!match)throw Error('Unknown mock-preview argument.');
  const value=match[2] ?? process.argv[++index];
  if(!value || value.startsWith('--') || Object.hasOwn(options,match[1]))throw Error('Invalid mock-preview argument.');
  options[match[1]]=value;
}
function port(value,fallback){if(value===undefined)return fallback;if(!/^[0-9]{4,5}$/.test(value)||Number(value)<1024||Number(value)>65535)throw Error('Use a loopback port between 1024 and 65535.');return Number(value);}
const apiPort=port(options['api-port'],8788),frontendPort=port(options['frontend-port'],8789);
if(apiPort===frontendPort)throw Error('API and frontend ports must differ.');
const frontendOrigin = 'http://127.0.0.1:'+frontendPort;
const apiOrigin = 'http://127.0.0.1:'+apiPort;
const apiToken = 'LocalMockOnlyApiToken_ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const signingKey = 'LocalMockOnlySigningKey_ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const scope = { merchant: 'local-mock-merchant', product: 'bnp' };
let orderId;
const databases = [];
async function fixtureDB(directory) {
  const sqlite = new DatabaseSync(':memory:'); databases.push(sqlite);
  for (const name of (await readdir(resolve(root, directory))).filter(n => n.endsWith('.sql')).sort()) sqlite.exec(await readFile(resolve(root, directory, name), 'utf8'));
  const db = { prepare(sql) { const statement = sqlite.prepare(sql); let values = []; return { bind(...args) { values = args; return this; }, first() { return statement.get(...values) ?? null; }, all() { return { results: statement.all(...values) }; }, run() { return { meta: { changes: Number(statement.run(...values).changes) } }; } }; }, batch(statements) { sqlite.exec('BEGIN'); try { const results = []; for (const s of statements) results.push(s.run()); sqlite.exec('COMMIT'); return results; } catch (error) { sqlite.exec('ROLLBACK'); throw error; } } };
  return { sqlite, db };
}
const serviceDB = await fixtureDB('services/pathao-api/migrations');
const productDB = await fixtureDB('migrations/d1');
const encryptionKey = new Uint8Array(32).fill(25), keyVersion = 'local-mock-only';
const cipher = createTokenCipher({ encryptionKey, keyVersion });
const encryptedConfig = await cipher.seal({ mockOnly: true }, ['registry', 'merchant', scope.merchant, 'sandbox', scope.product]);
const encryptedSigningKey = await cipher.seal(signingKey, ['registry', 'dispatch', scope.merchant, 'sandbox', scope.product]);
serviceDB.sqlite.prepare('INSERT INTO courier_merchants VALUES(?,?,?,?,1)').run(scope.merchant, scope.product, 'sandbox', JSON.stringify(encryptedConfig));
serviceDB.sqlite.prepare('INSERT INTO courier_api_clients VALUES(?,?,?,?,?,?,1)').run(await sha256(apiToken), scope.merchant, scope.product, 'sandbox', JSON.stringify(['courier:read','rewards:read']), JSON.stringify(encryptedSigningKey));
const mockStore = { id: 12, name: 'LOCAL MOCK pickup only', address: 'Synthetic pickup address', active: true, city_id: 1, zone_id: 2, hub_id: 3, is_default_store: true, is_default_return_store: true };
function destination(input) { if (input.city_id !== 1 || input.zone_id !== 2 || input.area_id !== 3) throw new PathaoError('Choose the synthetic local destination.', 400); }
const mockProvider = {
  async stores(page) { if (page !== 1) throw new PathaoError('Only mock page 1 exists.', 400); return { stores: [mockStore], pagination: { current_page: 1, last_page: 1, per_page: 100, total: 1 } }; },
  async validateStore(id) { if (id !== 12) throw new PathaoError('Unknown mock store.', 400); return mockStore; },
  async locations(type, parent) { if (type === 'cities') return [{ id: 1, name: 'Mock Dhaka', home_delivery_available: true, pickup_available: true }]; if (type === 'zones' && parent === 1) return [{ id: 2, name: 'Mock zone', home_delivery_available: true, pickup_available: true }]; if (type === 'areas' && parent === 2) return [{ id: 3, name: 'Mock area', home_delivery_available: true, pickup_available: true }]; throw new PathaoError('Unknown mock location.', 400); },
  async validateDestination(input) { destination(input); },
  async rateEstimate(input) { rateInput(input); await this.validateStore(input.store_id); if (input.city_id !== 1 || input.zone_id !== 2) throw new PathaoError('Unknown mock destination.', 400); return { price: 60, discount: 0, promo_discount: 0, additional_charge: 0, final_price: 60, plan_id: 1, currency: 'BDT' }; },
  async createStore(input) { storeInput(input); return { id: 13, name: 'LOCAL MOCK submitted pickup', ...input }; },
  async createShipment(input) { return { consignment_id: `LOCAL-MOCK-${crypto.randomUUID()}`, merchant_order_id: input.merchant_order_id, provider_status: 'Pending' }; },
  async tracking() { return 'Pending'; },
};
const registry = createD1Registry({ db: serviceDB.db, encryptionKey, keyVersion });
const handleCourier = createApi({ db: serviceDB.db, registry, providerFor: async () => mockProvider, rewards: createRewardsService({ db: serviceDB.db }), flags: { provider: true, dispatch: false, stores: false, webhooks: false } });
// Independent parent commerce DB and scoped least-privilege demo clients.
const platformDB = await fixtureDB('services/lorapok-api/migrations');
const storefrontToken = 'LocalMockStorefrontToken_ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const adminToken = 'LocalMockAdminToken_ABCDEFGHIJKLMNOPQRSTUVWXYZ12345';
const vintageScope = { merchant: scope.merchant, product: 'vintage-demo' };
const vintageStorefrontToken = 'LocalMockVintageStorefrontToken_ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const vintageAdminToken = 'LocalMockVintageAdminToken_ABCDEFGHIJKLMNOPQRSTUVWXYZ12345';
platformDB.sqlite.prepare('INSERT INTO platform_registrations VALUES(?,?,?,1)').run(scope.merchant,scope.product,'sandbox');
for (const [token, permissions] of [[storefrontToken,['catalog:read','orders:create']],[adminToken,['catalog:read','catalog:write','orders:read','orders:update']]]) {
  platformDB.sqlite.prepare('INSERT INTO platform_api_clients VALUES(?,?,?,?,?,1)').run(await sha256(token),scope.merchant,scope.product,'sandbox',JSON.stringify(permissions));
}
platformDB.sqlite.prepare('INSERT INTO platform_registrations VALUES(?,?,?,1)').run(vintageScope.merchant,vintageScope.product,'sandbox');
for (const [token, permissions] of [[vintageStorefrontToken,['catalog:read','orders:create']],[vintageAdminToken,['catalog:read','catalog:write','orders:read','orders:update']]]) {
  platformDB.sqlite.prepare('INSERT INTO platform_api_clients VALUES(?,?,?,?,?,1)').run(await sha256(token),vintageScope.merchant,vintageScope.product,'sandbox',JSON.stringify(permissions));
}
const handleCore = createCommerceApi({db:platformDB.db,registry:createCommerceRegistry({db:platformDB.db}),flags:{orderIntake:true}});
async function coreFixture(path,method,body,token=adminToken) {
  const response = await handleCore(new Request('https://platform.internal'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)}));
  if (!response.ok) throw Error('Synthetic core fixture failed');
  return response.json();
}
for (const [sku, title, price, kind, metadata] of [['plate-a','DEMO Model A',38000,'plate',{model:'A'}],['plate-b','DEMO Model B',45000,'plate',{model:'B'}],['bracket','DEMO bracket',8000,'bracket',{}]]) {
  await coreFixture('/v1/admin/catalog/products/'+sku,'PUT',{expected_version:0,title,unit_price_minor:price,currency:'BDT',active:true,kind,metadata});
}
await coreFixture('/v1/admin/catalog/shipping/demo','PUT',{expected_version:0,label:'DEMO service area; address verification required',price_minor:6000,active:true});
const seeded = await coreFixture('/v1/orders','POST',{request_id:crypto.randomUUID(),customer:{name:'Synthetic Test Customer',phone:'01700000000',district:'Dhaka',address:'Synthetic address, not a real delivery'},items:[{sku:'plate-a',quantity:1,customization:{registration_bangla:'লোকাল মক নমুনা'}}],shipping_code:'demo',expected_catalog_versions:{'plate-a':1},expected_shipping_version:1},storefrontToken);
orderId = seeded.order.id;
for (const {sku,...product} of vintageDemoProducts) {
  await coreFixture('/v1/admin/catalog/products/'+sku,'PUT',{expected_version:0,...product},vintageAdminToken);
}
const {code:vintageShippingCode,...vintageShipping} = vintageDemoShipping;
await coreFixture('/v1/admin/catalog/shipping/'+vintageShippingCode,'PUT',{expected_version:0,...vintageShipping},vintageAdminToken);

async function handleApi(request) {
  const url = new URL(request.url);
  if (url.pathname === '/health') return Response.json({brand:'Lorapok Labs',service:'platform-api',mode:'mock',payment_gateway:'deferred'});
  if (url.pathname.startsWith('/courier/')) {url.pathname=url.pathname.slice('/courier'.length);return handleCourier(new Request(url,request));}
  return handleCore(request);
}
// Keep the production SDK HTTPS checks intact, but bridge only this exact synthetic
// internal origin to the separate loopback API listener. Block all other fetches.
const nativeFetch = globalThis.fetch;
globalThis.fetch = async () => { throw Error('External network disabled in local mock preview'); };
const env = { DB: productDB.db, ADMIN_EMAIL: 'admin@example.test', ADMIN_PASSWORD: 'LocalMockOnly-123456789', ADMIN_SESSION_SECRET: 'LocalMockOnlySessionSecret_ABCDEFGHIJKLMNOPQRSTUVWXYZ', PATHAO_ENABLED: 'true', PATHAO_ENVIRONMENT: 'sandbox', PATHAO_MERCHANT_KEY: scope.merchant, PATHAO_PRODUCT_KEY: scope.product, PATHAO_STORE_ID: '12', PATHAO_BACKEND_MODE: 'service', PATHAO_DISPATCH_ENABLED: 'false', PATHAO_STORE_MANAGEMENT_ENABLED: 'false', COURIER_API_URL: 'https://courier.internal', COURIER_API_PATH_PREFIX: '/courier', COURIER_API_TOKEN: apiToken, COURIER_DISPATCH_SIGNING_KEY: signingKey, COURIER_API_BINDING: { async fetch(url, init) { const target = new URL(url); if (target.origin !== 'https://courier.internal') throw Error('External origin blocked'); return nativeFetch(apiOrigin + target.pathname + target.search, { ...init, redirect: 'error' }); } } };
Object.assign(env,{COMMERCE_BACKEND_MODE:'service',PLATFORM_API_URL:'https://platform.internal',PLATFORM_MERCHANT_KEY:scope.merchant,PLATFORM_PRODUCT_KEY:scope.product,PLATFORM_ENVIRONMENT:'sandbox',PLATFORM_STOREFRONT_API_TOKEN:storefrontToken,PLATFORM_ADMIN_API_TOKEN:adminToken,
  PLATFORM_API_BINDING:{async fetch(url,init){const target=new URL(url);if(target.origin!=='https://platform.internal')throw Error('External origin blocked');return nativeFetch(apiOrigin+target.pathname+target.search,{...init,redirect:'error'});}}});
// Explicit independent configuration. No secret or tenant is read from the browser.
Object.assign(env,{VESPA_PLATFORM_API_URL:'https://platform.internal',VESPA_PLATFORM_MERCHANT_KEY:vintageScope.merchant,VESPA_PLATFORM_PRODUCT_KEY:vintageScope.product,VESPA_PLATFORM_ENVIRONMENT:'sandbox',VESPA_PLATFORM_STOREFRONT_API_TOKEN:vintageStorefrontToken,
  VESPA_PLATFORM_API_BINDING:{async fetch(url,init){const target=new URL(url);if(target.origin!=='https://platform.internal')throw Error('External origin blocked');return nativeFetch(apiOrigin+target.pathname+target.search,{...init,redirect:'error'});}}});
const routeNames = ['login','logout','settings','orders','pathao/stores','pathao/locations','pathao/rates','pathao/rewards'];
const routes = new Map();
for (const name of routeNames) routes.set('/api/admin/' + name, await import(pathToFileURL(resolve(root, `functions/api/admin/${name}.js`))));
routes.set('/api/catalog',await import('../functions/api/catalog.js'));
routes.set('/api/order',await import('../functions/api/order.js'));
routes.set('/api/order/status',await import('../functions/api/order/status.js'));
routes.set('/api/vespa/catalog',await import('../functions/api/vespa/catalog.js'));
routes.set('/api/vespa/order',await import('../functions/api/vespa/order.js'));
routes.set('/api/vespa/order/status',await import('../functions/api/vespa/order/status.js'));
const orderModule = await import('../functions/api/admin/orders/[id].js');
const shipmentModule = await import('../functions/api/admin/orders/[id]/shipment.js');
const out = options.out ? resolve(options.out) : resolve(root, 'out');
if (!(await stat(resolve(out,'index.html')).catch(()=>null))?.isFile() || !(await stat(resolve(out,'_next/static')).catch(()=>null))?.isDirectory()) throw Error('Build the static export first or provide --out pointing to a built export.');
const types = { '.html': 'text/html; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp4': 'video/mp4', '.ico': 'image/x-icon' };
async function handleFrontend(request) {
  if (new URL(request.url).pathname.startsWith('/admin/')) return adminMiddleware({request,env,next:()=>handleFrontendContent(request)});
  return handleFrontendContent(request);
}
async function handleFrontendContent(request) {
  const path = new URL(request.url).pathname; let module = routes.get(path), params = {};
  const match = path.match(/^\/api\/admin\/orders\/([0-9a-f-]{36})(\/shipment)?$/i);
  if (match) { module = match[2] ? shipmentModule : orderModule; params = { id: match[1] }; }
  if (module) { const handler = module['onRequest' + request.method[0] + request.method.slice(1).toLowerCase()]; return handler ? handler({ request, env, params }) : Response.json({ error: 'Method not allowed' }, { status: 405 }); }
  if (path.startsWith('/api/')) return Response.json({ error: 'Route unavailable in mock preview' }, { status: 404 });
  if (!['GET','HEAD'].includes(request.method)) return new Response(null, { status: 405 });
  let decoded; try { decoded = decodeURIComponent(path); } catch { return new Response(null, { status: 400 }); }
  const base = resolve(out, '.' + decoded);
  if (base !== out && !base.startsWith(out + sep)) return new Response(null, { status: 403 });
  for (const candidate of [base, base + '.html', resolve(base, 'index.html')]) {
    try { if (!(await stat(candidate)).isFile()) continue; return new Response(request.method === 'HEAD' ? null : await readFile(candidate), { headers: { 'Content-Type': types[extname(candidate)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Local-Mock-Only': 'true' } }); } catch (error) { if (!['ENOENT','ENOTDIR'].includes(error.code)) throw error; }
  }
  return new Response('Not found in existing static export', { status: 404 });
}
const servers = [];
async function listen(port, handler, frontend = false) {
  const server = createServer(async (incoming, outgoing) => {
    try {
      // Fixed authority prevents a supplied Host header changing same-origin checks.
      if (incoming.headers.host !== `127.0.0.1:${port}` && incoming.headers.host !== `localhost:${port}`) { outgoing.writeHead(403); outgoing.end('Loopback host required'); return; }
      const headers = new Headers(); for (const [key, value] of Object.entries(incoming.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      headers.set('CF-Connecting-IP', '127.0.0.1');
      const method = incoming.method || 'GET';
      const request = new Request(`http://${incoming.headers.host}${incoming.url}`, { method, headers, ...(!['GET','HEAD'].includes(method) ? { body: incoming, duplex: 'half' } : {}) });
      const response = await handler(request); const outputHeaders = Object.fromEntries(response.headers);
      // Synthetic loopback HTTP only. Production auth/session code is unchanged.
      if (frontend && outputHeaders['set-cookie']) outputHeaders['set-cookie'] = outputHeaders['set-cookie'].replace(/; Secure\b/g, '');
      outgoing.writeHead(response.status, outputHeaders); outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) { console.error('Local mock request failed:', error.message); if (!outgoing.headersSent) outgoing.writeHead(500, { 'Content-Type': 'application/json' }); outgoing.end('{"error":"Local mock failure"}'); }
  });
  server.requestTimeout = 30000; server.headersTimeout = 10000;
  await new Promise((accept, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', accept); }); servers.push(server);
}
try { await listen(apiPort, handleApi); await listen(frontendPort, handleFrontend, true); } catch (error) { for (const server of servers) server.close(); throw error; }
console.log(JSON.stringify({ mode: 'MOCK ONLY, no external calls or persistent writes', api: apiOrigin, frontend: frontendOrigin, admin: frontendOrigin + '/admin/login', email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, syntheticOrderId: orderId, pid: process.pid, limitations: 'Existing out export only; no rebuild/HMR. SQLite is in memory. Rates, locations and stores are mock data. Rewards incomplete without verified provider evidence. No real payment or courier integration exercised.' }, null, 2));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => { for (const server of servers) server.close(); for (const db of databases) db.close(); process.exit(0); });
// Optional startup checks use only synthetic in-memory records, including one
// vintage unpaid request and its exact retry. No shipment/store/payment/provider call.
if (process.argv.includes('--smoke')) {
  const assert = (await import('node:assert/strict')).default;
  async function check(url, options = {}, expected = 200) {
    const response = await nativeFetch(url, options);
    assert.equal(response.status, expected, `${url}: ${await response.clone().text()}`);
    console.log(`SMOKE ${response.status} ${url}`); return response;
  }
  for (const [path, type] of [['/','text/html'],['/vespa','text/html'],['/bnp','text/html'],['/payment/success','text/html'],['/media/bnp-material-original.mp4','video/mp4'],['/fonts/bnp-condensed-bold-oblique.ttf','font/ttf']]) {
    const page = await check(frontendOrigin + path);
    assert.ok(page.headers.get('content-type').startsWith(type));
    if (path === '/bnp') assert.match(await page.text(), /bn-studio|Order summary/);
    if (path === '/payment/success') assert.doesNotMatch(await page.text(), /Payment Verified|Download Invoice/);
  }
  await check(apiOrigin + '/health');
  const context = await check(apiOrigin + '/v1/context', { headers: { Authorization: `Bearer ${storefrontToken}` } });
  assert.deepEqual((await context.json()).scope, scope);
  for (const page of ['/admin/login', '/admin/orders', '/admin/settings']) await check(frontendOrigin + page);
  await check(frontendOrigin + '/api/admin/orders', {}, 401);
  const login = await check(frontendOrigin + '/api/admin/login', { method: 'POST', headers: { Origin: frontendOrigin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }) });
  const cookie = login.headers.get('set-cookie'); assert.ok(cookie.includes('HttpOnly')); assert.ok(!cookie.includes('Secure'));
  const headers = { Cookie: cookie.split(';')[0], Origin: frontendOrigin, 'Content-Type': 'application/json' };
  const orders = await check(frontendOrigin + '/api/admin/orders', { headers }); assert.equal((await orders.json()).orders[0].payment_status, 'unpaid');
  for (const path of ['/api/admin/settings', '/api/admin/pathao/stores', '/api/admin/pathao/locations?type=cities']) await check(frontendOrigin + path, { headers });
  const rate = await check(frontendOrigin + '/api/admin/pathao/rates', { method: 'POST', headers, body: JSON.stringify({ store_id: 12, city_id: 1, zone_id: 2, item_weight: 0.5 }) }); assert.equal((await rate.json()).quote.final_price, 60);
  const rewards = await check(frontendOrigin + '/api/admin/pathao/rewards?month=2026-11', { headers }); assert.equal((await rewards.json()).projection.status, 'incomplete');
  const eligibility = await check(frontendOrigin + `/api/admin/orders/${orderId}/shipment`, { headers }); assert.equal((await eligibility.json()).eligible, false);
  await check(frontendOrigin + '/api/admin/logout', { method: 'POST', headers });
  const catalog=await check(frontendOrigin+'/api/catalog'); const bnpCatalog=await catalog.json(); assert.equal(bnpCatalog.capabilities.payment_capture,false);
  assert.equal(bnpCatalog.products.some(p=>p.kind==='decorative_nameplate'),false);
  const vintageCatalog=await (await check(frontendOrigin+'/api/vespa/catalog')).json();
  assert.equal(vintageCatalog.products.length,4);assert.equal(vintageCatalog.capabilities.payment_capture,false);
  assert.ok(vintageCatalog.products.every(p=>p.metadata.demo===true&&p.metadata.pricing_status==='sample'));
  const bnpRequest={request_id:crypto.randomUUID(),customer:{name:'Synthetic BNP Customer',phone:'01700000000',district:'Dhaka',address:'Synthetic preview address only'},items:[{sku:'plate-b',quantity:2,customization:{registration_bangla:'কুমিল্লা হ-১১-০০৫২'}},{sku:'bracket',quantity:2,customization:{}}],shipping_code:'demo',expected_catalog_versions:{'plate-b':1,bracket:1},expected_shipping_version:1};
  const bnpOptions={method:'POST',headers:{Origin:frontendOrigin,'Content-Type':'application/json'},body:JSON.stringify(bnpRequest)};
  const bnpCreated=await (await check(frontendOrigin+'/api/order',bnpOptions,201)).json();
  assert.equal(bnpCreated.order.payment_status,'unpaid');assert.equal(bnpCreated.order.total_minor,112000);
  const bnpRetry=await (await check(frontendOrigin+'/api/order',bnpOptions)).json();assert.equal(bnpRetry.order.id,bnpCreated.order.id);
  await check(frontendOrigin+'/api/order',{...bnpOptions,body:JSON.stringify({...bnpRequest,items:[{...bnpRequest.items[0],quantity:3},bnpRequest.items[1]]})},409);
  const vintageRequest={request_id:crypto.randomUUID(),customer:{name:'Synthetic Vintage Customer',phone:'01700000000',district:'Dhaka',address:'Synthetic preview address only'},items:[{sku:'cream-enamel',quantity:1,customization:{schema:'decorative-display-text/v1',display_text:'DEMO RIDER'}}],shipping_code:'demo',expected_catalog_versions:{'cream-enamel':1},expected_shipping_version:1};
  const vintageOptions={method:'POST',headers:{Origin:frontendOrigin,'Content-Type':'application/json'},body:JSON.stringify(vintageRequest)};
  const vintageCreated=await (await check(frontendOrigin+'/api/vespa/order',vintageOptions,201)).json();
  assert.equal(vintageCreated.order.payment_status,'unpaid');assert.equal(vintageCreated.order.total_minor,131000);
  const vintageRetry=await (await check(frontendOrigin+'/api/vespa/order',vintageOptions)).json();assert.equal(vintageRetry.order.id,vintageCreated.order.id);
  const bnpOrdersAfter=await (await check(frontendOrigin+'/api/admin/orders',{headers})).json();assert.equal(bnpOrdersAfter.orders.some(o=>o.id===vintageCreated.order.id),false);
  await check(frontendOrigin+'/api/admin/orders/'+orderId+'/shipment',{method:'POST',headers:{Origin:frontendOrigin,'Content-Type':'application/json'},body:'{}'},401);
  await check(frontendOrigin+'/api/admin/orders/'+orderId+'/shipment',{method:'POST',headers,body:'{}'},503);
  console.log('All mock startup smoke checks passed, including separate shops and synthetic unpaid intake. Servers remain running. Payment and dispatch are disabled.');
}
