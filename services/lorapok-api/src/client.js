// Thin server-only consumer SDK. No provider credentials, browser auth or retries.
export class CommerceError extends Error {
  constructor(message = 'Platform API is unavailable.', status = 503, code = 'service_unavailable') {
    super(message); this.status = status; this.code = code;
  }
}
export function createCommerceClient({ baseUrl, apiToken, scope, environment }, { fetcher = fetch } = {}) {
  let base;
  try {
    base = new URL(baseUrl);
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.pathname !== '/') throw Error();
  } catch { throw new CommerceError('Configure an HTTPS platform API origin.'); }
  if (!scope || ![scope.merchant, scope.product].every(value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value)) ||
      !['sandbox', 'production'].includes(environment) || typeof apiToken !== 'string' || !/^[A-Za-z0-9_-]{43,256}$/.test(apiToken)) {
    throw new CommerceError('Platform API identity is not configured.');
  }
  const configuredScope = Object.freeze({ ...scope });
  let identityCheck;
  async function send(path, { method = 'GET', body } = {}) {
    let response, result;
    try {
      response = await fetcher(base.origin + path, { method, redirect: 'error', signal: AbortSignal.timeout(20000),
        headers: { Authorization: `Bearer ${apiToken}`, Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      result = await response.json();
    } catch { throw new CommerceError('Platform request was not confirmed. Retain the request ID before retrying.'); }
    if (!response.ok || result?.error) {
      const error = result?.error;
      if ([400, 401, 403, 404, 409, 413, 415, 422, 429, 501, 503].includes(response.status) &&
          error && typeof error === 'object' && typeof error.code === 'string' && /^[A-Za-z0-9_]{1,80}$/.test(error.code) &&
          typeof error.message === 'string' && error.message.length <= 240) throw new CommerceError(error.message, response.status, error.code);
      throw new CommerceError('Platform request was not confirmed.');
    }
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new CommerceError('Invalid platform response.');
    return result;
  }
  async function authenticate() {
    if (!identityCheck) identityCheck = send('/v1/context').then(result => {
      if (result.scope?.merchant !== configuredScope.merchant || result.scope?.product !== configuredScope.product || result.environment !== environment) {
        throw new CommerceError('Platform API scope does not match this storefront.');
      }
    }).catch(error => { identityCheck = undefined; throw error; });
    await identityCheck;
  }
  async function request(path, options) { await authenticate(); return send(path, options); }
  const id = value => encodeURIComponent(value);
  return Object.freeze({
    authenticate,
    catalog: () => request('/v1/catalog'),
    adminCatalog: () => request('/v1/admin/catalog'),
    capabilities: () => request('/v1/capabilities'),
    saveProduct: (sku, body) => request(`/v1/admin/catalog/products/${id(sku)}`, { method: 'PUT', body }),
    saveShipping: (code, body) => request(`/v1/admin/catalog/shipping/${id(code)}`, { method: 'PUT', body }),
    createOrder: body => request('/v1/orders', { method: 'POST', body }),
    receiptStatus: body => request('/v1/order-status', { method: 'POST', body }),
    orders: (filters = {}) => {
      const query = new URLSearchParams();
      for (const key of ['q', 'status', 'limit', 'cursor']) if (filters[key] !== undefined && filters[key] !== '') query.set(key, String(filters[key]));
      return request('/v1/admin/orders' + (query.size ? '?' + query : ''));
    },
    order: orderId => request(`/v1/admin/orders/${id(orderId)}`),
    updateOrder: (orderId, body) => request(`/v1/admin/orders/${id(orderId)}`, { method: 'PATCH', body }),
  });
}
