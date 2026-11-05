import { clearSessionCookie, isSameOrigin, json } from "../../_lib/admin-auth.js";

export async function onRequestPost({ request }) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request denied." }, 403);
  const response = json({ success: true });
  response.headers.set("Set-Cookie", clearSessionCookie());
  return response;
}

