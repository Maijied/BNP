import { isAdmin, isSameOrigin, json } from '../../../_lib/admin-auth.js';
import { createCommerceAdapter, commerceError, legacyCommerce, readInput } from '../../../_lib/commerce.js';
import { onRequestPatch as legacyPatch } from '../../../_lib/legacy/order.js';
export async function onRequestGet({ request, env, params }) {
  if (!(await isAdmin(request, env))) return json({ error: 'Unauthorized.' }, 401);
  try { return json(await createCommerceAdapter(env, { role: 'admin' }).order(params.id)); } catch (error) { return commerceError(error); }
}
export async function onRequestPatch(context) {
  const { request, env, params } = context;
  if (!(await isAdmin(request, env))) return json({ error: 'Unauthorized.' }, 401);
  if (!isSameOrigin(request)) return json({ error: 'Cross-origin write denied.' }, 403);
  if (legacyCommerce(env)) return legacyPatch(context);
  try { return json(await createCommerceAdapter(env, { role: 'admin' }).updateOrder(params.id, await readInput(request))); }
  catch (error) { return commerceError(error); }
}
