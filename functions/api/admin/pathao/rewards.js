import { isAdmin, json } from "../../../_lib/admin-auth.js";
import { createPathaoClient } from "../../../_lib/pathao.js";

// Read-only admin BFF. Scope and service credentials come from server configuration.
export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);
  const params = new URL(request.url).searchParams;
  const month = params.get("month");
  if (params.getAll("month").length !== 1 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month || "")) {
    return json({ error: "Choose an explicit month in YYYY-MM format." }, 400);
  }
  try {
    return json(await createPathaoClient(env).rewards(month));
  } catch {
    // Never relay upstream error bodies, credentials, configuration or URLs.
    return json({ error: "Pathao rewards are unavailable. Please try again later." }, 503);
  }
}
