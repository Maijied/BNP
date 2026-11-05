// Thin server-only product adapter. Never import into browser components.
import { PathaoError, validateScope } from './provider/service.js';
export function createCourierApiClient({baseUrl,apiToken,scope,environment,pathPrefix=""},{fetcher=fetch}={}) {
  validateScope(scope);
  let base;try{base=new URL(baseUrl);if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||base.pathname!=='/')throw Error();}catch{throw new PathaoError('Configure an HTTPS courier API origin.');}
  if(typeof apiToken!=='string'||!/^[A-Za-z0-9_-]{43,256}$/.test(apiToken)||!['sandbox','production'].includes(environment))throw new PathaoError('Courier API credentials are not configured.');
  if (!["", "/courier"].includes(pathPrefix)) throw new PathaoError("Invalid courier API route prefix.");
  let identityChecked;
  async function send(path,{method='GET',body}={}) {
    try{
      const response=await fetcher(`${base.origin}${pathPrefix}${path}`,{method,redirect:'error',signal:AbortSignal.timeout(25000),
        headers:{Authorization:`Bearer ${apiToken}`,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
      const result=await response.json();
      if(!response.ok || !result || result.error)throw Error();
      return result;
    }catch{throw new PathaoError('Courier API request was not confirmed.');}
  }
  async function authenticate() {
    if(!identityChecked)identityChecked=send('/v1/context').then(result=>{
      if(result.scope?.merchant!==scope.merchant||result.scope?.product!==scope.product||result.environment!==environment)throw new PathaoError('Courier API scope does not match this product.');
    }).catch(error=>{identityChecked=undefined;throw error;});
    await identityChecked;
  }
  async function request(path,options){await authenticate();return send(path,options);}
  async function locations(type,parentId){return (await request(`/v1/locations?type=${encodeURIComponent(type)}&parent_id=${encodeURIComponent(parentId??'')}`)).locations;}
  return Object.freeze({authenticate,locations,
    async stores(page=1){return request(`/v1/stores?page=${encodeURIComponent(page)}`);},
    async validateStore(id){return (await request(`/v1/stores/${encodeURIComponent(id)}`)).store;},
    async validateDestination(input,{purpose="delivery"}={}){
      if(!(await locations('cities')).some(x=>x.id===input.city_id)||!(await locations('zones',input.city_id)).some(x=>x.id===input.zone_id))throw new PathaoError('Invalid courier destination.',400);
      const area=(await locations('areas',input.zone_id)).find(x=>x.id===input.area_id);
      if(!area || !['delivery','pickup'].includes(purpose) || area[purpose==='pickup'?'pickup_available':'home_delivery_available']!==true)throw new PathaoError('The selected area is not available for this courier operation.',400);
    },
    async rateEstimate(input){return (await request('/v1/rates',{method:'POST',body:input})).quote;},
    async createStore(input,{requestId}={}){return (await request('/v1/stores',{method:'POST',body:{request_id:requestId,store:input}})).store;},
    async createShipment(payload,{dispatchGrant}={}){const result=await request('/v1/shipments',{method:'POST',body:{payload,dispatch_grant:dispatchGrant}});if(!result.booking?.consignment_id)throw new PathaoError('Courier booking outcome is unknown.');return result.booking;},
    async tracking(consignmentId,merchantOrderId){
      const result=await request(`/v1/shipments/${encodeURIComponent(merchantOrderId)}/tracking`,{method:'POST'});
      if(result.consignment_id!==consignmentId||result.merchant_order_id!==merchantOrderId||typeof result.provider_status!=='string')throw new PathaoError('Invalid courier tracking response.');
      return result.provider_status;
    },
    async rewards(month){return request(`/v1/rewards?month=${encodeURIComponent(month)}`);},
  });
}
