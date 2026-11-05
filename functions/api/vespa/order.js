import { createVespaCommerceAdapter, commerceError, readInput } from '../../_lib/commerce.js';
import { isSameOrigin, json } from '../../_lib/admin-auth.js';
export async function onRequestPost({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: 'Cross-origin write denied.' }, 403);
  try {
    const result = await createVespaCommerceAdapter(env).createOrder(await readInput(request));
    return json(result, result.duplicate ? 200 : 201);
  } catch (error) { return commerceError(error); }
}
