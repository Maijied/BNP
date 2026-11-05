import { isAdmin, json } from '../../_lib/admin-auth.js';
import { createCommerceAdapter, commerceError, legacyCommerce } from '../../_lib/commerce.js';
import { onRequestGet as legacyGet } from '../../_lib/legacy/orders.js';
export async function onRequestGet(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) return json({ error: 'Unauthorized.' }, 401);
  if (legacyCommerce(env)) return legacyGet(context);
  try {
    const query = new URL(request.url).searchParams;
    const filters = Object.fromEntries(['q', 'status', 'limit', 'cursor'].filter(k => query.has(k)).map(k => [k, query.get(k)]));
    return json(await createCommerceAdapter(env, { role: 'admin' }).orders(filters));
  } catch (error) { return commerceError(error); }
}
