import { PathaoError, sha256, validateScope } from "./provider/service.js";
import { createTokenCipher } from "./token-store.js";
export function createD1Registry({ db, encryptionKey, keyVersion, decryptionKeys = {} }) {
  const cipher=createTokenCipher({encryptionKey,keyVersion,decryptionKeys});
  const context=(kind,merchant,environment,product="")=>["registry",kind,merchant,environment,...(product?[product]:[])];
  return {
    async authenticate(request) {
      const value=request.headers.get("Authorization");
      if(!value || !/^Bearer [A-Za-z0-9_-]{43,256}$/.test(value)) return null;
      const hash=await sha256(value.slice(7));
      const row=await db.prepare("SELECT c.merchant_key,c.product_key,c.environment,c.permissions_json,c.encrypted_dispatch_key FROM courier_api_clients c JOIN courier_merchants m USING(merchant_key,product_key,environment) WHERE c.token_sha256=? AND c.enabled=1 AND m.enabled=1").bind(hash).first();
      if(!row)return null;
      const scope=validateScope({merchant:row.merchant_key,product:row.product_key});
      const permissions=JSON.parse(row.permissions_json);
      if(!Array.isArray(permissions)||!permissions.every(v=>typeof v==='string'))throw new PathaoError("API client configuration is invalid.");
      return {scope,environment:row.environment,permissions,
        getDispatchKey:async()=>row.encrypted_dispatch_key ? cipher.open(JSON.parse(row.encrypted_dispatch_key),context("dispatch",scope.merchant,row.environment,scope.product)):null};
    },
    async merchant(identity) {
      const row=await db.prepare("SELECT encrypted_config FROM courier_merchants WHERE merchant_key=? AND product_key=? AND environment=? AND enabled=1").bind(identity.scope.merchant,identity.scope.product,identity.environment).first();
      if(!row)throw new PathaoError("Merchant service is disabled.");
      return cipher.open(JSON.parse(row.encrypted_config),context("merchant",identity.scope.merchant,identity.environment,identity.scope.product));
    },
    async webhook(endpoint) {
      if(!/^[a-zA-Z0-9_-]{24,100}$/.test(endpoint))return null;
      const row=await db.prepare("SELECT w.merchant_key,w.product_key,w.environment,w.encrypted_secret FROM courier_webhook_routes w JOIN courier_merchants m USING(merchant_key,product_key,environment) WHERE w.endpoint_id=? AND w.enabled=1 AND m.enabled=1").bind(endpoint).first();
      if(!row)return null;
      const scope=validateScope({merchant:row.merchant_key,product:row.product_key});
      return {scope,environment:row.environment,secret:await cipher.open(JSON.parse(row.encrypted_secret),context("webhook",scope.merchant,row.environment,scope.product))};
    },
  };
}
