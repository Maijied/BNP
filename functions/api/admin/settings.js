import { isAdmin, isSameOrigin, json } from '../../_lib/admin-auth.js';
import { createCommerceAdapter, commerceError, legacyCommerce, readInput } from '../../_lib/commerce.js';
import { onRequestGet as legacyGet, onRequestPost as legacyPost } from '../../_lib/legacy/settings.js';
export async function onRequestGet(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) return json({ error: 'Unauthorized.' }, 401);
  if (legacyCommerce(env)) return legacyGet(context);
  try { return json(await createCommerceAdapter(env, { role: 'admin' }).adminCatalog()); } catch (error) { return commerceError(error); }
}
export async function onRequestPost(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) return json({ error: 'Unauthorized.' }, 401);
  if (!isSameOrigin(request)) return json({ error: 'Cross-origin write denied.' }, 403);
  if (legacyCommerce(env)) return legacyPost(context);
  try {
    const body = await readInput(request);
    if (!body || Object.keys(body).some(k => !['type','key','input'].includes(k)) || typeof body.key !== 'string' || !body.input) return json({ error: 'Invalid catalog update.' }, 400);
    const client = createCommerceAdapter(env, { role: 'admin' });
    if (body.type === 'product') return json(await client.saveProduct(body.key, body.input));
    if (body.type === 'shipping') return json(await client.saveShipping(body.key, body.input));
    return json({ error: 'Unknown catalog type.' }, 400);
  } catch (error) { return commerceError(error); }
}
