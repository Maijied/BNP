import { createSession, isSameOrigin, json, requireConfiguration, sessionCookie } from "../../_lib/admin-auth.js";

export async function onRequestPost({ request, env }) {
  if (!requireConfiguration(env)) return json({ error: "Admin authentication is not configured." }, 503);
  if (!isSameOrigin(request)) return json({ error: "Cross-origin login denied." }, 403);
  if (!env.DB?.prepare) return json({ error: "Admin rate limiting is not configured." }, 503);
  if (Number(request.headers.get("Content-Length") || 0) > 4096) return json({ error: "Request too large." }, 413);
  const ip = (request.headers.get("CF-Connecting-IP") || "").trim();
  if (!ip) return json({ error: "Missing trusted client information." }, 503);
  const keyMaterial = new TextEncoder().encode(env.ADMIN_SESSION_SECRET + ":" + ip);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", keyMaterial));
  const ipHash = Array.from(hash, byte => byte.toString(16).padStart(2, "0")).join("");
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - 900;
  try {
    await env.DB.prepare("INSERT INTO admin_login_attempts (ip_hash, window_start, failures) VALUES (?, ?, 0) ON CONFLICT(ip_hash) DO UPDATE SET window_start = CASE WHEN window_start < ? THEN ? ELSE window_start END, failures = CASE WHEN window_start < ? THEN 0 ELSE failures END, updated_at = datetime('now')")
      .bind(ipHash, now, cutoff, now, cutoff).run();
    const attempt = await env.DB.prepare("SELECT failures FROM admin_login_attempts WHERE ip_hash = ?").bind(ipHash).first();
    if (!attempt) return json({ error: "Rate limiting is unavailable." }, 503);
    if (attempt.failures >= 5) return json({ error: "Too many sign-in attempts; retry later." }, 429);
  } catch {
    return json({ error: "Rate limiting is unavailable." }, 503);
  }
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
    try {
      await env.DB.prepare("UPDATE admin_login_attempts SET failures = failures + 1, updated_at = datetime('now') WHERE ip_hash = ?").bind(ipHash).run();
    } catch {
      return json({ error: "Rate limiting is unavailable." }, 503);
    }
    return json({ error: "Invalid credentials." }, 401);
  }
  try {
    await env.DB.prepare("DELETE FROM admin_login_attempts WHERE ip_hash = ?").bind(ipHash).run();
  } catch {
    return json({ error: "Rate limiting is unavailable." }, 503);
  }
  const token = await createSession(env);
  const response = json({ success: true });
  response.headers.set("Set-Cookie", sessionCookie(token));
  return response;
}

