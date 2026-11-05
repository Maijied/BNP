// The product is a server-side API consumer, never a second source of truth.
import { createCommerceClient } from '../../services/lorapok-api/src/client.js';
import { json } from './admin-auth.js';
export const legacyCommerce = env => env.COMMERCE_BACKEND_MODE === 'legacy';
export function createCommerceAdapter(env, { role = 'storefront' } = {}) {
  if (legacyCommerce(env)) throw Object.assign(new Error('Legacy commerce does not support this operation.'), { status: 503 });
  const binding = env.PLATFORM_API_BINDING;
  return createCommerceClient({
    baseUrl: env.PLATFORM_API_URL || (binding?.fetch ? 'https://platform.internal' : ''),
    apiToken: role === 'admin' ? env.PLATFORM_ADMIN_API_TOKEN : env.PLATFORM_STOREFRONT_API_TOKEN,
    scope: { merchant: env.PLATFORM_MERCHANT_KEY, product: env.PLATFORM_PRODUCT_KEY },
    environment: env.PLATFORM_ENVIRONMENT,
  }, { fetcher: binding?.fetch ? binding.fetch.bind(binding) : globalThis.fetch });
}
// This fixed adapter has its own server-selected identity. Browser parameters and
// BNP credentials must never choose or silently fill the second shop's scope.
export function createVespaCommerceAdapter(env) {
  const scope = { merchant: env.VESPA_PLATFORM_MERCHANT_KEY, product: env.VESPA_PLATFORM_PRODUCT_KEY };
  const environment = env.VESPA_PLATFORM_ENVIRONMENT;
  const apiToken = env.VESPA_PLATFORM_STOREFRONT_API_TOKEN;
  if ((scope.merchant === env.PLATFORM_MERCHANT_KEY && scope.product === env.PLATFORM_PRODUCT_KEY && environment === env.PLATFORM_ENVIRONMENT) ||
      (apiToken && [env.PLATFORM_STOREFRONT_API_TOKEN, env.PLATFORM_ADMIN_API_TOKEN].includes(apiToken))) {
    throw Object.assign(new Error('The second shop requires a separate platform identity.'), { status: 503 });
  }
  const binding = env.VESPA_PLATFORM_API_BINDING;
  return createCommerceClient({
    baseUrl: env.VESPA_PLATFORM_API_URL || (binding?.fetch ? 'https://vespa-platform.internal' : ''),
    apiToken, scope, environment,
  }, { fetcher: binding?.fetch ? binding.fetch.bind(binding) : globalThis.fetch });
}
export function commerceError(error) {
  const status = [400, 404, 409, 422, 429].includes(error?.status) ? error.status : 503;
  // Never reflect provider bodies, authentication details, or stack traces.
  const message = status === 409 ? 'The record or catalog changed. Reload before retrying.'
    : status === 400 || status === 422 ? 'Invalid request. Check the supplied fields.'
    : status === 404 ? 'Record not found.'
    : status === 429 ? 'Too many requests. Please try again later.'
    : 'Order service is unavailable. No payment was initiated.';
  return json({ error: message, code: status === 409 ? 'conflict' : 'commerce_unavailable' }, status);
}
export async function readInput(request) {
  const invalid = () => Object.assign(new Error('Invalid request body'), { status: 400 });
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '') ||
      (request.headers.get('content-encoding') || 'identity') !== 'identity') throw invalid();
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > 20000)) throw invalid();
  if (!request.body) throw invalid();
  const reader = request.body.getReader();
  let timer;
  const deadline = new Promise((_, reject) => { timer = setTimeout(() => { reject(invalid()); void reader.cancel().catch(() => {}); }, 5000); });
  try {
    let size = 0;
    const chunks = [];
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      size += value.byteLength;
      if (size > 20000) throw invalid();
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { throw invalid(); }
  } finally { clearTimeout(timer); void reader.cancel().catch(() => {}); }
}

export const commerce = env => createCommerceAdapter(env);
