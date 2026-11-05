import { isSameOrigin, json } from './admin-auth.js';
import { createCommerceAdapter, createVespaCommerceAdapter, readInput } from './commerce.js';

const WINDOW_SECONDS = 15 * 60;
const REQUEST_LIMIT = 20;
const fail = (message, status = 503) => Object.assign(new Error(message), { status });

// The trusted Cloudflare client IP is used only to produce a domain-separated
// keyed digest. Neither raw IPs, receipt proofs nor customer data are persisted.
// A single atomic UPSERT/RETURNING closes the parallel-request limiter race.
export async function consumeReceiptAttempt(request, env, shop, now = Date.now()) {
  const ip = (request.headers.get('CF-Connecting-IP') || '').trim();
  if (!['bnp', 'vespa'].includes(shop) || !env.DB?.prepare ||
      typeof env.ADMIN_SESSION_SECRET !== 'string' || env.ADMIN_SESSION_SECRET.length < 32 ||
      !ip || ip.length > 64 || !/^[0-9a-fA-F:.]+$/.test(ip)) throw fail('Receipt status is unavailable.');
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(env.ADMIN_SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(`receipt-status:v1:${shop}:${ip}`));
  const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  const window = Math.floor(now / 1000 / WINDOW_SECONDS) * WINDOW_SECONDS;
  // Expire old throttle records; this database contains only operational counters.
  await env.DB.prepare('DELETE FROM receipt_status_attempts WHERE window_start < ?').bind(window - 86400).run();
  const row = await env.DB.prepare(`INSERT INTO receipt_status_attempts (fingerprint, window_start, attempts) VALUES (?, ?, 1)
    ON CONFLICT(fingerprint) DO UPDATE SET
      attempts = CASE WHEN receipt_status_attempts.window_start < excluded.window_start THEN 1 ELSE MIN(receipt_status_attempts.attempts + 1, 21) END,
      window_start = MAX(receipt_status_attempts.window_start, excluded.window_start)
    RETURNING attempts`).bind(fingerprint, window).first();
  if (!row || !Number.isSafeInteger(row.attempts) || row.attempts < 1) throw fail('Receipt status is unavailable.');
  if (row.attempts > REQUEST_LIMIT) throw fail('Too many requests. Please try again later.', 429);
}

export function createReceiptStatusHandler(shop) {
  if (!['bnp', 'vespa'].includes(shop)) throw Error('Unknown receipt adapter.');
  return async ({ request, env }) => {
    if (!isSameOrigin(request)) return json({ error: 'Cross-origin request denied.' }, 403);
    // A proof accidentally added to the URL is never forwarded or used.
    if (new URL(request.url).search) return json({ error: 'Invalid receipt request.' }, 400);
    try {
      await consumeReceiptAttempt(request, env, shop);
      const input = await readInput(request);
      const client = shop === 'vespa' ? createVespaCommerceAdapter(env) : createCommerceAdapter(env);
      return json(await client.receiptStatus(input));
    } catch (error) {
      if (error?.status === 404) return json({ error: 'Receipt is unavailable.', code: 'receipt_unavailable' }, 404);
      if (error?.status === 429) return json({ error: 'Too many status requests. Please try again later.', code: 'rate_limited' }, 429);
      if (error?.status === 400 || error?.status === 422) return json({ error: 'Invalid receipt request.', code: 'invalid_request' }, 400);
      // Authentication, table, provider and network details must never escape.
      return json({ error: 'Receipt status is unavailable. Keep your saved reference and try again later.', code: 'receipt_unavailable' }, 503);
    }
  };
}
