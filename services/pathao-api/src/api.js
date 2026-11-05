import { PathaoError, sha256, storeInput } from './provider/service.js';
import { canonicalJson, normalizeStatus, withDeadline, verifyWebhookSecret, INTEGRATION_HEADER, INTEGRATION_VALUE } from './provider/webhook.js';
import { verifyDispatchGrant, validatePrepaidPayload } from './dispatch-grant.js';
import { createOperationStore } from './operations.js';
import { json, readJson } from './http.js';
const exact=(body,keys)=>{if(Object.keys(body).some(k=>!keys.includes(k)))throw new PathaoError('Unexpected request fields.',400);};
const uuid=value=>typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const reference=value=>typeof value==='string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
export function createApi({db,registry,providerFor,rewards,inbox,flags={},now=()=>Date.now()}) {
  const operations=createOperationStore(db);
  function permit(identity,permission){if(!identity.permissions.includes(permission))throw new PathaoError('Permission denied.',403);}
  function enabled(name){if(flags[name]!==true)throw new PathaoError('This courier capability is disabled.',503);}
  async function webhook(request,endpoint) {
    enabled('webhooks');
    return withDeadline((async()=>{
      const identity=await registry.webhook(endpoint);
      if(!identity)return json({error:'Unknown webhook endpoint.'},404);
      const body=await readJson(request);
      if(body.event==='webhook_integration' && Object.keys(body).length===1)return new Response(null,{status:202,headers:{[INTEGRATION_HEADER]:INTEGRATION_VALUE,'Cache-Control':'no-store'}});
      if(!(await verifyWebhookSecret(request.headers.get('X-PATHAO-Signature'),identity.secret)))return json({error:'Invalid webhook signature.'},401);
      if(!inbox)throw new PathaoError('Webhook inbox is not configured.');
      const receipt=await inbox.enqueue(identity,body);
      return json({accepted:true,duplicate:receipt.duplicate,processing:'queued_for_reconciliation'},202);
    })());
  }
  return async function handle(request) {
    try {
      const url=new URL(request.url),path=url.pathname;
      if(path==='/health' && request.method==='GET')return json({service:'lorapok-courier',brand:'Lorapok Labs',api_version:'v1',status:'ok'});
      if(path.startsWith('/v1/webhooks/pathao/') && request.method==='POST')return await webhook(request,path.slice('/v1/webhooks/pathao/'.length));
      // API credentials stay on product servers. Never enable credentialed CORS or cookie auth.
      if(request.headers.has('Origin') || request.method==='OPTIONS')return json({error:'Server-to-server requests only.'},403);
      const identity=await registry.authenticate(request);
      if(!identity)return json({error:'Unauthorized.'},401);
      if(path==='/v1/context' && request.method==='GET')return json({scope:identity.scope,environment:identity.environment});
      if(path==='/v1/rewards' && request.method==='GET') {
        permit(identity,'rewards:read');const month=url.searchParams.get('month');
        if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month||''))throw new PathaoError('An explicit YYYY-MM month is required.',400);
        return json(await rewards.getRewards({merchantId:identity.scope.merchant,environment:identity.environment,month}));
      }
      if(path==='/v1/operations' && request.method==='GET') {
        permit(identity,'courier:read');const kind=url.searchParams.get('kind'),ref=url.searchParams.get('reference');
        if(!['shipment','store'].includes(kind)||!reference(ref))throw new PathaoError('Invalid operation reference.',400);
        return json({operation:await operations.get(identity,kind,ref)});
      }
      enabled('provider');
      if(path==='/v1/stores' && request.method==='GET') {
        permit(identity,'courier:read');const page=url.searchParams.get('page')||'1';if(!/^[1-9]\d{0,3}$/.test(page))throw new PathaoError('Invalid page.',400);
        return json(await (await providerFor(identity)).stores(Number(page)));
      }
      const storeMatch=path.match(/^\/v1\/stores\/([1-9]\d*)$/);
      if(storeMatch && request.method==='GET'){permit(identity,'courier:read');return json({store:await (await providerFor(identity)).validateStore(Number(storeMatch[1]))});}
      if(path==='/v1/locations' && request.method==='GET') {
        permit(identity,'courier:read');return json({locations:await (await providerFor(identity)).locations(url.searchParams.get('type'),Number(url.searchParams.get('parent_id')))});
      }
      if(path==='/v1/rates' && request.method==='POST') {
        permit(identity,'courier:read');const input=await readJson(request),quote=await (await providerFor(identity)).rateEstimate(input);
        const quoteId=crypto.randomUUID(),observedAt=new Date(now()).toISOString();
        await db.prepare(`INSERT INTO courier_quotes(id,merchant_key,product_key,environment,store_id,city_id,zone_id,weight_kg_decimal,quote_json,observed_at)
          VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(quoteId,identity.scope.merchant,identity.scope.product,identity.environment,input.store_id,input.city_id,input.zone_id,String(input.item_weight),JSON.stringify(quote),observedAt).run();
        return json({quote:{...quote,quote_id:quoteId,observed_at:observedAt,kind:'estimate',invoice_confirmed:false}});
      }
      if(path==='/v1/stores' && request.method==='POST') {
        permit(identity,'courier:stores:create');enabled('stores');const body=await readJson(request);exact(body,['request_id','store']);
        if(!uuid(body.request_id))throw new PathaoError('Persistent UUID request_id required.',400);
        const id=body.request_id.toLowerCase(),input=storeInput(body.store),provider=await providerFor(identity);
        if(await operations.get(identity,'store',id))return json({error:'Store request already exists; reconcile before any new request.'},409);
        await provider.validateDestination(input,{purpose:"pickup"});
        if(!(await operations.claim(identity,'store',id,id,await sha256(canonicalJson(input)))))return json({error:'Store request already claimed.'},409);
        try {
          const store=await provider.createStore(input);await operations.confirm(identity,'store',id,{});return json({store,request_id:id},202);
        }catch{try{await operations.unknown(identity,'store',id);}catch{}return json({error:'Store outcome needs reconciliation. Do not resubmit.',state:'unknown'},202);}
      }
      if(path==='/v1/shipments' && request.method==='POST') {
        permit(identity,'courier:dispatch');enabled('dispatch');const body=await readJson(request);exact(body,['payload','dispatch_grant']);validatePrepaidPayload(body.payload);
        const proof=await verifyDispatchGrant(body.dispatch_grant,body.payload,identity,await identity.getDispatchKey(),now());
        const ref=body.payload.merchant_order_id;
        if(await operations.get(identity,'shipment',ref))return json({error:'Shipment already claimed. Reconcile before any new request.'},409);
        const provider=await providerFor(identity);await provider.validateStore(body.payload.store_id);
        await provider.validateDestination({city_id:body.payload.recipient_city,zone_id:body.payload.recipient_zone,area_id:body.payload.recipient_area});
        // Recheck expiry after all preflight I/O, immediately before the atomic claim.
        await verifyDispatchGrant(body.dispatch_grant,body.payload,identity,await identity.getDispatchKey(),now());
        if(!(await operations.claim(identity,'shipment',ref,proof.intent_id,proof.payload_sha256,proof.order_id)))return json({error:'Shipment already claimed.'},409);
        try {
          const booking=await provider.createShipment(body.payload);
          await operations.confirm(identity,'shipment',ref,{...booking,normalized_status:normalizeStatus(booking.provider_status)});
          return json({booking},201);
        }catch{try{await operations.unknown(identity,'shipment',ref);}catch{}return json({error:'Booking outcome needs reconciliation. Do not retry.',state:'unknown'},202);}
      }
      const tracking=path.match(/^\/v1\/shipments\/([A-Za-z0-9_-]{1,100})\/tracking$/);
      if(tracking && request.method==='POST') {
        permit(identity,'courier:read');const operation=await operations.get(identity,'shipment',tracking[1]);
        if(!operation || operation.state!=='confirmed' || !operation.consignment_id)throw new PathaoError('No confirmed shipment in this product scope.',404);
        const status=await (await providerFor(identity)).tracking(operation.consignment_id,tracking[1]);
        await operations.status(identity,tracking[1],operation.consignment_id,status,normalizeStatus(status));
        return json({consignment_id:operation.consignment_id,merchant_order_id:tracking[1],provider_status:status,normalized_status:normalizeStatus(status)});
      }
      return json({error:'Unknown API route.'},404);
    }catch(error){return json({error:error instanceof PathaoError ? error.message : 'Courier service unavailable.'},error instanceof PathaoError ? error.status : 503);}
  };
}
