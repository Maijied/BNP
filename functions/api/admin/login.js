import { createSession, isSameOrigin, json, requireConfiguration, sessionCookie } from "../../_lib/admin-auth.js";

export async function onRequestPost({ request, env }) {
  if (!requireConfiguration(env)) return json({ error: "Admin authentication is not configured." }, 503);
  if (!isSameOrigin(request)) return json({ error: "Cross-origin login denied." }, 403);
  if (!(request.headers.get("Content-Type") || "").toLowerCase().includes("application/json")) return json({ error: "JSON body required." }, 415);
  let credentials;
  try { credentials = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
  const password = typeof credentials?.password === "string" ? credentials.password : "";
  // HMAC comparison avoids early-return string equality on password contents.
  const toDigest = async value => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  const supplied = await toDigest(password);
  const expected = await toDigest(env.ADMIN_PASSWORD);
  let diff = 0;
  for (let i = 0; i < 32; i++) diff |= supplied[i] ^ expected[i];
  if (email !== env.ADMIN_EMAIL.trim().toLowerCase() || diff !== 0) {
    return json({ error: "Invalid credentials." }, 401);
  }
  const token = await createSession(env);
  const response = json({ success: true });
  response.headers.set("Set-Cookie", sessionCookie(token));
  return response;
}
