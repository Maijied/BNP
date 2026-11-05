import { isAdmin, json } from "../../../_lib/admin-auth.js";
import { createPathaoClient, PathaoError } from "../../../_lib/pathao.js";
export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const parentId = Number(url.searchParams.get(type === "zones" ? "city_id" : "zone_id"));
  try { return json({ locations: await createPathaoClient(env).locations(type, parentId) }); }
  catch (error) { return json({ error: error instanceof PathaoError ? error.message : "Pathao locations unavailable." }, error instanceof PathaoError ? error.status : 503); }
}
