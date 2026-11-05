import {sha256} from './registry.js';
import {paymentCapabilities} from './payment-port.js';
const S='merchant_key=? AND product_key=? AND environment=?';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const MAX=Number.MAX_SAFE_INTEGER;
const DISPLAY_TEXT_SCHEMA='decorative-display-text/v1';
export const RECEIPT_LIFETIME_MS=30*24*60*60*1000;
const ORDER_NUMBER=/^LL-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
class ApiError extends Error {constructor(status,code,message){super(message);this.status=status;this.code=code;}}
const fail=(status,code,message)=>{throw new ApiError(status,code,message);};
const bad=()=>fail(400,'invalid_request','Request fields are invalid.');
const conflict=()=>fail(409,'version_conflict','The record changed. Refresh and try again.');
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function keys(v,allowed,required=allowed){if(!object(v)||Object.keys(v).some(k=>!allowed.includes(k))||required.some(k=>!Object.hasOwn(v,k)))bad();}
function str(v,min,max){if(typeof v!=='string'||v.trim().length<min||v.length>max||/[\u0000-\u001f]/.test(v))bad();return v.trim();}
// Registration remains the default contract. Decorative text is an explicit,
// versioned opt-in on each catalog product, not an arbitrary browser schema.
function customization(value,application){
 if(object(value)&&Object.hasOwn(value,'schema')){
  keys(value,['schema','display_text']);
  if(application==='bnp'||value.schema!==DISPLAY_TEXT_SCHEMA)bad();
  str(value.display_text,1,60);
  if(/[\u007f-\u009f]/.test(value.display_text))bad();
 }else{keys(value,['registration_bangla'],[]);if(value.registration_bangla!==undefined)str(value.registration_bangla,1,200);}
}
function productCustomization(product,value){
 if(Object.hasOwn(product.metadata,'customization_schema')){
  if(product.kind!=='decorative_nameplate'||product.metadata.customization_schema!==DISPLAY_TEXT_SCHEMA||value.schema!==DISPLAY_TEXT_SCHEMA)bad();
 }else if(Object.hasOwn(value,'schema'))bad();
}
function integer(v,min=0,max=MAX){if(!Number.isSafeInteger(v)||v<min||v>max)bad();return v;}
function canonical(v){if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(object(v))return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v);}
function order(row){return {...JSON.parse(row.snapshot_json),id:row.id,order_number:row.order_number,status:row.status,payment_status:row.payment_status,version:row.version,currency:row.currency,total_minor:row.total_minor,created_at:row.created_at,updated_at:row.updated_at};}
function response(value,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
async function body(request,timeoutMs){
 const cancel=()=>{try{Promise.resolve(request.body?.cancel()).catch(()=>{});}catch{}};
 const length=request.headers.get('content-length'),encoding=request.headers.get('content-encoding');
 if(encoding&&encoding.toLowerCase().trim()!=='identity'){cancel();fail(415,'unsupported_encoding','Compressed request bodies are not supported.');}
 if(length!==null&&(!/^\d+$/.test(length)||!Number.isSafeInteger(Number(length)))){cancel();bad();}
 if(length!==null&&Number(length)>32768){cancel();fail(413,'request_too_large','Request is too large.');}
 if(!(request.headers.get('content-type')||'').toLowerCase().split(';')[0].trim().match(/^application\/json$/)){cancel();bad();}
 const reader=request.body?.getReader();if(!reader)bad();let size=0,timer;const chunks=[];
 const cancelReader=()=>{try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}};
 try{
  await Promise.race([(async()=>{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32768)fail(413,'request_too_large','Request is too large.');chunks.push(value);}})(),new Promise((_,reject)=>{timer=setTimeout(()=>{reject(new ApiError(408,'request_timeout','Request body deadline exceeded.'));cancelReader();},timeoutMs);})]);
  if(length!==null&&Number(length)!==size)bad();
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{bad();}
 }catch(e){cancelReader();if(e instanceof ApiError)throw e;bad();}finally{clearTimeout(timer);try{reader.releaseLock();}catch{}}
}
export function createCommerceApi({db,registry,flags={},now=()=>Date.now(),bodyTimeoutMs=5000}) {
 if(!Number.isSafeInteger(bodyTimeoutMs)||bodyTimeoutMs<1||bodyTimeoutMs>30000)throw new Error("Invalid body deadline.");
 return async request=>{try {
  if(request.headers.has('origin')||request.method==='OPTIONS')fail(403,'server_only','This API accepts server requests only.');
  const identity=await registry.authenticate(request);if(!identity)fail(401,'unauthorized','Authentication is required.');
  if(!object(identity.scope)||![identity.scope.merchant,identity.scope.product].every(v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(v))||!['sandbox','production'].includes(identity.environment)||!Array.isArray(identity.permissions)||!identity.permissions.every(p=>typeof p==='string'))fail(401,'unauthorized','Authentication is required.');
  const scope=[identity.scope.merchant,identity.scope.product,identity.environment];
  const permit=p=>{if(!identity.permissions.includes(p))fail(403,'forbidden','Permission is required.');};
  const stmt=(sql,...args)=>db.prepare(sql).bind(...args);
  const getCatalog=(kind,code)=>stmt(`SELECT * FROM commerce_catalog WHERE ${S} AND kind=? AND code=?`,...scope,kind,code).first();
  const getOrder=id=>stmt(`SELECT * FROM commerce_orders WHERE ${S} AND id=?`,...scope,id).first();
  const caps={order_intake:flags.orderIntake===true,...paymentCapabilities};
  const url=new URL(request.url),path=url.pathname,method=request.method;
  if(method==='GET'&&path==='/v1/context')return response({scope:identity.scope,environment:identity.environment});
  if(method==='GET'&&path==='/v1/capabilities')return response({capabilities:caps});
  // Possession-only, minimal receipt status. Neither an account login nor courier
  // tracking. The server-generated v4 order number and original request UUID must
  // both match in this credential's tenant. The public adapter rate-limits before
  // forwarding; never put either proof in a URL or return the customer snapshot.
  if(method==='POST'&&path==='/v1/order-status'){
   permit('orders:create');if(url.search)bad();
   const b=await body(request,bodyTimeoutMs);keys(b,['order_number','request_id']);
   if(typeof b.order_number!=='string'||!ORDER_NUMBER.test(b.order_number)||typeof b.request_id!=='string'||!UUID.test(b.request_id))bad();
   const row=await stmt(`SELECT order_number,status,payment_status,currency,total_minor,created_at,updated_at FROM commerce_orders WHERE ${S} AND order_number=? AND request_id=?`,...scope,b.order_number.toUpperCase(),b.request_id.toLowerCase()).first();
   const time=now();
   if(!row||row.created_at>time||time-row.created_at>=RECEIPT_LIFETIME_MS)fail(404,'receipt_unavailable','Receipt is unavailable.');
   return response({receipt:row,capabilities:paymentCapabilities});
  }
  if(/^\/v1\/(payments|payment|dispatch)(\/|$)/.test(path))fail(503,'gateway_deferred','Payment gateway integration is deferred.');
  if(method==='GET'&&['/v1/catalog','/v1/admin/catalog'].includes(path)){
   const admin=path.includes('/admin/');permit(admin?'catalog:write':'catalog:read');
   const rows=(await stmt(`SELECT * FROM commerce_catalog WHERE ${S} ${admin?'':'AND active=1'} ORDER BY kind,code`,...scope).all()).results;
   return response({products:rows.filter(r=>r.kind==='product').map(r=>JSON.parse(r.data_json)),shipping_methods:rows.filter(r=>r.kind==='shipping').map(r=>JSON.parse(r.data_json)),capabilities:caps});
  }
  const edit=path.match(/^\/v1\/admin\/catalog\/(products|shipping)\/([^/]+)$/);
  if(method==='PUT'&&edit){
   permit('catalog:write');const kind=edit[1]==='products'?'product':'shipping',code=edit[2];if(!CODE.test(code))bad();const b=await body(request,bodyTimeoutMs);
   const fields=kind==='product'?['expected_version','title','unit_price_minor','currency','active','kind','metadata']:['expected_version','label','price_minor','active'];keys(b,fields);
   const expected=integer(b.expected_version,0,MAX-1);if(typeof b.active!=='boolean')bad();
   let data;if(kind==='product'){
    if(b.currency!=='BDT'||!object(b.metadata)||JSON.stringify(b.metadata).length>4000)bad();
    if(Object.hasOwn(b.metadata,'customization_schema')&&(identity.scope.product==='bnp'||b.kind!=='decorative_nameplate'||b.metadata.customization_schema!==DISPLAY_TEXT_SCHEMA))bad();
    if(identity.scope.product==='bnp'&&b.kind==='plate'&&Object.hasOwn(b.metadata,'model')&&!['A','B'].includes(b.metadata.model))bad();
    data={sku:code,title:str(b.title,1,160),unit_price_minor:integer(b.unit_price_minor),currency:'BDT',active:b.active,kind:str(b.kind,1,64),metadata:b.metadata,version:expected+1};
   }else data={code,label:str(b.label,1,160),price_minor:integer(b.price_minor),active:b.active,version:expected+1};
   try{
    const result=expected===0?await stmt('INSERT INTO commerce_catalog VALUES(?,?,?,?,?,?,?,?,?)',...scope,kind,code,1,b.active?1:0,JSON.stringify(data),now()).run():await stmt(`UPDATE commerce_catalog SET version=?,active=?,data_json=?,updated_at=? WHERE ${S} AND kind=? AND code=? AND version=?`,expected+1,b.active?1:0,JSON.stringify(data),now(),...scope,kind,code,expected).run();
    if(result.meta.changes!==1)conflict();
   }catch(e){if(e instanceof ApiError)throw e;const existing=await getCatalog(kind,code);if(existing)conflict();throw e;}
   return response(kind==='product'?{product:data}:{shipping_method:data},expected===0?201:200);
  }
  if(method==='POST'&&path==='/v1/orders'){
   permit('orders:create');if(!caps.order_intake)fail(503,'order_intake_disabled','Order intake is disabled.');
   const b=await body(request,bodyTimeoutMs);keys(b,['request_id','customer','items','shipping_code','expected_catalog_versions','expected_shipping_version']);
   if(typeof b.request_id!=='string'||!UUID.test(b.request_id))bad();b.request_id=b.request_id.toLowerCase();
   keys(b.customer,['name','phone','address','district','shop_name'],['name','phone','address','district']);
   const customer={name:str(b.customer.name,1,160),phone:str(b.customer.phone,11,14),address:str(b.customer.address,5,1000),district:str(b.customer.district,1,100)};
   if(!/^(?:\+?88)?01[3-9][0-9]{8}$/.test(customer.phone))bad();if(b.customer.shop_name!==undefined)customer.shop_name=str(b.customer.shop_name,1,160);
   if(!Array.isArray(b.items)||b.items.length<1||b.items.length>20||(typeof b.shipping_code!=='string'||!CODE.test(b.shipping_code))||!object(b.expected_catalog_versions))bad();
   integer(b.expected_shipping_version,1);const seen=new Set();
   for(const item of b.items){keys(item,['sku','quantity','customization']);if(typeof item.sku!=='string'||!CODE.test(item.sku)||seen.has(item.sku))bad();seen.add(item.sku);integer(item.quantity,1,100);customization(item.customization,identity.scope.product);integer(b.expected_catalog_versions[item.sku],1);}
   if(Object.keys(b.expected_catalog_versions).length!==seen.size||Object.keys(b.expected_catalog_versions).some(k=>!seen.has(k)))bad();
   const hash=await sha256(canonical(b));
   const prior=()=>stmt(`SELECT * FROM commerce_orders WHERE ${S} AND request_id=?`,...scope,b.request_id).first();
   const duplicate=async()=>{const r=await prior();if(!r)return null;if(r.request_hash!==hash)fail(409,'idempotency_conflict','Request ID was already used for different order details.');return response({order:order(r),duplicate:true});};
   const previous=await duplicate();if(previous)return previous;
   const guardScope='merchant_key=(SELECT m FROM requested_scope) AND product_key=(SELECT p FROM requested_scope) AND environment=(SELECT e FROM requested_scope)';
   const items=[],guards=[],guardValues=[];let subtotal=0;
   for(const i of b.items){const row=await getCatalog('product',i.sku);if(!row||!row.active||row.version!==b.expected_catalog_versions[i.sku])conflict();const p=JSON.parse(row.data_json);productCustomization(p,i.customization);const line=p.unit_price_minor*i.quantity;if(!Number.isSafeInteger(line)||!Number.isSafeInteger(subtotal+line))bad();subtotal+=line;items.push({...p,quantity:i.quantity,customization:i.customization,line_total_minor:line});guards.push(`EXISTS(SELECT 1 FROM commerce_catalog WHERE ${guardScope} AND kind='product' AND code=? AND version=? AND active=1)`);guardValues.push(i.sku,row.version);}
   const shippingRow=await getCatalog('shipping',b.shipping_code);if(!shippingRow||!shippingRow.active||shippingRow.version!==b.expected_shipping_version)conflict();const shipping=JSON.parse(shippingRow.data_json),total=subtotal+shipping.price_minor;if(!Number.isSafeInteger(total))bad();
   guards.push(`EXISTS(SELECT 1 FROM commerce_catalog WHERE ${guardScope} AND kind='shipping' AND code=? AND version=? AND active=1)`);guardValues.push(b.shipping_code,shippingRow.version);
   const id=crypto.randomUUID(),number='LL-'+id.toUpperCase(),time=now();
   const snapshot={customer,items,shipping,subtotal_minor:subtotal,shipping_minor:shipping.price_minor};
   try{const result=await stmt(`WITH requested_scope(m,p,e) AS (VALUES(?,?,?)) INSERT INTO commerce_orders (merchant_key,product_key,environment,id,request_id,request_hash,order_number,status,payment_status,version,currency,total_minor,snapshot_json,created_at,updated_at) SELECT ?,?,?,?,?,?,?,'new','unpaid',1,'BDT',?,?,?,? WHERE ${guards.join(' AND ')}`,...scope,...scope,id,b.request_id,hash,number,total,JSON.stringify(snapshot),time,time,...guardValues).run();if(result.meta.changes!==1)conflict();}
   catch(e){const repeated=await duplicate();if(repeated)return repeated;throw e;}
   return response({order:order(await getOrder(id)),duplicate:false},201);
  }
  if(method==='GET'&&path==='/v1/admin/orders'){
   permit('orders:read');for(const k of url.searchParams.keys())if(!['q','status','limit','cursor'].includes(k))bad();
   const q=url.searchParams.get('q')||'',status=url.searchParams.get('status')||'',limitRaw=url.searchParams.get('limit')||'25';if(q.length>100||!/^\d{1,3}$/.test(limitRaw))bad();const limit=integer(Number(limitRaw),1,100);if(status&&!['new','verification','cancelled'].includes(status))bad();
   let where=S,args=[...scope];if(status){where+=' AND status=?';args.push(status);}if(q){where+=" AND (instr(lower(order_number),lower(?))>0 OR instr(lower(json_extract(snapshot_json,'$.customer.name')),lower(?))>0 OR instr(json_extract(snapshot_json,'$.customer.phone'),?)>0)";args.push(q,q,q);}
   const cursor=url.searchParams.get('cursor');if(cursor){try{if(cursor.length>1000||!/^[A-Za-z0-9_-]+$/.test(cursor))bad();const c=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(cursor.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))));keys(c,['t','id','s','q','status']);integer(c.t);if(!UUID.test(c.id)||JSON.stringify(c.s)!==JSON.stringify(scope)||c.q!==q||c.status!==status)bad();where+=' AND (created_at<? OR (created_at=? AND id<?))';args.push(c.t,c.t,c.id);}catch{bad();}}
   const rows=(await stmt(`SELECT * FROM commerce_orders WHERE ${where} ORDER BY created_at DESC,id DESC LIMIT ?`,...args,limit+1).all()).results,more=rows.length>limit,page=rows.slice(0,limit),last=page.at(-1);
   const next=more?btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify({t:last.created_at,id:last.id,s:scope,q,status})))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''):null;
   return response({orders:page.map(order),next_cursor:next});
  }
  const detail=path.match(/^\/v1\/admin\/orders\/([^/]+)$/);
  if(detail&&['GET','PATCH'].includes(method)){
   permit(method==='GET'?'orders:read':'orders:update');if(!UUID.test(detail[1]))bad();const id=detail[1].toLowerCase(),row=await getOrder(id);if(!row)fail(404,'not_found','Order not found.');
   if(method==='GET')return response({order:order(row)});
   const b=await body(request,bodyTimeoutMs);keys(b,['status','expected_version']);integer(b.expected_version,1,MAX-1);if(!['verification','cancelled'].includes(b.status))fail(409,'payment_required','This action requires a verified payment integration.');if(row.version!==b.expected_version)conflict();if(!(row.status==='new'||row.status==='verification'&&b.status==='cancelled'))fail(409,'invalid_transition','This order status transition is unavailable.');
   const r=await stmt(`UPDATE commerce_orders SET status=?,version=version+1,updated_at=? WHERE ${S} AND id=? AND version=? AND status=?`,b.status,now(),...scope,id,b.expected_version,row.status).run();if(r.meta.changes!==1)conflict();return response({order:order(await getOrder(id))});
  }
  fail(404,'not_found','Endpoint not found.');
 }catch(e){return response({error:{code:e instanceof ApiError?e.code:'internal_error',message:e instanceof ApiError?e.message:'The request could not be completed.'}},e instanceof ApiError?e.status:500);}};
}
