import { isAdmin, isSameOrigin, json } from "../../../_lib/admin-auth.js";
import { createPathaoClient, PathaoError } from "../../../_lib/pathao.js";
export async function onRequestPost({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);
  if (!isSameOrigin(request)) return json({ error: "Cross-origin write denied." }, 403);
  let input; try { input = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400); }
  try { return json({ quote: await createPathaoClient(env).rateEstimate(input) }); }
  catch (error) { return json({ error: error instanceof PathaoError ? error.message : "Courier estimate unavailable." }, error instanceof PathaoError ? error.status : 503); }
}
