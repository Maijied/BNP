// Lorapok Labs parent API: independent commerce and isolated courier modules.
// No storefront bundle imports this runtime. No infrastructure is provisioned here.
import { createCommerceApi } from './commerce.js';
import { createCommerceRegistry } from './registry.js';
import courier from '../../pathao-api/src/worker.js';
export function createPlatformRuntime(env) {
  if (!env.PLATFORM_DB?.prepare) throw Error('Platform database is not configured');
  return createCommerceApi({ db: env.PLATFORM_DB, registry: createCommerceRegistry({ db: env.PLATFORM_DB }),
    flags: { orderIntake: env.PLATFORM_ORDER_INTAKE_ENABLED === 'true' } });
}
export default {
  async fetch(request, env, context) {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/courier/')) {
        url.pathname = url.pathname.slice('/courier'.length);
        return courier.fetch(new Request(url, request), env, context);
      }
      if (url.pathname === '/health' && request.method === 'GET') {
        return Response.json({ brand: 'Lorapok Labs', service: 'platform-api', api_version: 'v1',
          commerce: env.PLATFORM_DB?.prepare ? 'configured' : 'unconfigured', payment_gateway: 'deferred',
          courier: env.COURIER_DB?.prepare ? 'configured' : 'unconfigured' }, { headers: { 'Cache-Control': 'no-store' } });
      }
      return await createPlatformRuntime(env)(request);
    } catch { return Response.json({ error: { code: 'service_unavailable', message: 'Platform API is not configured.' } }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
  },
  async scheduled(event, env, context) { return courier.scheduled(event, env, context); },
};
