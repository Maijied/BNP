export async function sha256(value) {
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function createCommerceRegistry({db}) {
 return {async authenticate(request) {
  const auth=request.headers.get('authorization');
  if(!auth || !/^Bearer [A-Za-z0-9_-]{43,256}$/.test(auth))return null;
  const row=await db.prepare('SELECT c.* FROM platform_api_clients c JOIN platform_registrations r USING(merchant_key,product_key,environment) WHERE c.token_sha256=? AND c.enabled=1 AND r.enabled=1').bind(await sha256(auth.slice(7))).first();
  if(!row)return null;
  const permissions=JSON.parse(row.permissions_json);
  if(!Array.isArray(permissions)||!permissions.every(p=>typeof p==='string'))return null;
  return {scope:{merchant:row.merchant_key,product:row.product_key},environment:row.environment,permissions};
 }};
}
