// Cloudflare Pages Functions authentication. Server-side only; never expose the secret.
export const SESSION_COOKIE = "bnp_admin_session";
const encoder = new TextEncoder();
const sessionSeconds = 8 * 60 * 60;
const jsonHeaders = { "Content-Type": "application/json", "Cache-Control": "no-store" };

function configured(env) {
  return typeof env.ADMIN_EMAIL === "string" && env.ADMIN_EMAIL.includes("@")
    && typeof env.ADMIN_PASSWORD === "string" && env.ADMIN_PASSWORD.length >= 16
    && typeof env.ADMIN_SESSION_SECRET === "string" && env.ADMIN_SESSION_SECRET.length >= 32;
}

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64url(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, ch => ch.charCodeAt(0));
  } catch { return null; }
}

async function keyFor(secret) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createSession(env) {
  if (!configured(env)) throw new Error("Admin authentication not configured");
  const payload = encoder.encode(JSON.stringify({
    v: 1, sub: env.ADMIN_EMAIL.toLowerCase(), exp: Math.floor(Date.now() / 1000) + sessionSeconds,
    nonce: crypto.randomUUID(),
  }));
  const signature = await crypto.subtle.sign("HMAC", await keyFor(env.ADMIN_SESSION_SECRET), payload);
  return `${base64url(payload)}.${base64url(new Uint8Array(signature))}`;
}

export async function isAdmin(request, env) {
  if (!configured(env)) return false;
  const cookie = (request.headers.get("Cookie") || "").split(";").map(s => s.trim()).find(s => s.startsWith(SESSION_COOKIE + "="));
  const token = cookie?.slice(SESSION_COOKIE.length + 1);
  if (!token || token.length > 2048) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const payload = fromBase64url(parts[0]);
  const signature = fromBase64url(parts[1]);
  if (!payload || !signature || signature.length !== 32) return false;
  const valid = await crypto.subtle.verify("HMAC", await keyFor(env.ADMIN_SESSION_SECRET), signature, payload);
  if (!valid) return false;
  try {
    const claims = JSON.parse(new TextDecoder().decode(payload));
    return claims.v === 1 && claims.sub === env.ADMIN_EMAIL.toLowerCase()
      && Number.isInteger(claims.exp) && claims.exp > Date.now() / 1000
      && claims.exp <= Date.now() / 1000 + sessionSeconds + 60;
  } catch { return false; }
}

export function isSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

export function requireConfiguration(env) {
  return configured(env);
}

export function sessionCookie(token) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${sessionSeconds}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
