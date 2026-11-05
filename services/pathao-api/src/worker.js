// Fetch-runtime entry point. No deployment/provider project is created by this file.
import { createApi } from './api.js';
import { createD1Registry } from './registry.js';
import { createD1TokenStore, createTokenCipher } from './token-store.js';
import { createPathaoService } from './provider/service.js';
import { createRewardsService } from './rewards.js';
import { createWebhookInbox,reconcilePending } from './reconciliation.js';
export function createRuntime(env) {
  if(!env.COURIER_DB?.prepare)throw Error('Courier DB binding missing');
  const keyConfig={encryptionKey:env.COURIER_ENCRYPTION_KEY,keyVersion:env.COURIER_KEY_VERSION,decryptionKeys:env.COURIER_OLD_KEYS_JSON?JSON.parse(env.COURIER_OLD_KEYS_JSON):{}};
  const registry=createD1Registry({db:env.COURIER_DB,...keyConfig});
  const tokenStore=createD1TokenStore({db:env.COURIER_DB,...keyConfig,namespace:'lorapok-pathao'});
  const providerFor=async identity=>createPathaoService({scope:identity.scope,environment:identity.environment,credentials:(await registry.merchant(identity)).credentials},{tokenStore});
  const handler=createApi({db:env.COURIER_DB,registry,
    inbox:createWebhookInbox({db:env.COURIER_DB,cipher:createTokenCipher(keyConfig)}),
    rewards:createRewardsService({db:env.COURIER_DB}),
    providerFor,
    flags:{provider:env.COURIER_ENABLED==='true',dispatch:env.COURIER_DISPATCH_ENABLED==='true',stores:env.COURIER_STORE_MANAGEMENT_ENABLED==='true',webhooks:env.COURIER_WEBHOOK_ENABLED==='true'},
  });
  handler.reconcile=()=>reconcilePending({db:env.COURIER_DB,providerFor});
  return handler;
}
export default {
  async fetch(request,env,context){try{
    const handler=createRuntime(env),response=await handler(request);
    if(response.status===202 && new URL(request.url).pathname.startsWith('/v1/webhooks/pathao/') && env.COURIER_RECONCILIATION_ENABLED==='true' && context?.waitUntil)context.waitUntil(handler.reconcile());
    return response;
  }catch{return Response.json({error:'Courier service is not configured.'},{status:503,headers:{'Cache-Control':'no-store'}});}},
  async scheduled(_event,env,context){if(env.COURIER_RECONCILIATION_ENABLED==='true')context.waitUntil(createRuntime(env).reconcile());},
};
