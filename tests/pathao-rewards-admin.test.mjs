import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../functions/_lib/admin-auth.js';
import { onRequestGet } from '../functions/api/admin/pathao/rewards.js';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const env = {
  ADMIN_EMAIL: 'admin@example.test', ADMIN_PASSWORD: 'synthetic-admin-password', ADMIN_SESSION_SECRET: 'synthetic-admin-session-key-12345678901234567890',
  PATHAO_ENABLED: 'true', PATHAO_BACKEND_MODE: 'service', PATHAO_MERCHANT_KEY: 'merchant', PATHAO_PRODUCT_KEY: 'bnp', PATHAO_ENVIRONMENT: 'sandbox',
  COURIER_API_URL: 'https://courier.example.test', COURIER_API_TOKEN: 'T'.repeat(43),
};
async function read(query, authenticated = true) {
  return onRequestGet({ env, request: new Request(`https://bnp.example.test/api/admin/pathao/rewards${query}`, {
    headers: authenticated ? { Cookie: `bnp_admin_session=${await createSession(env)}` } : {},
  }) });
}
test('reward admin BFF rejects anonymous, absent, duplicate and invalid months before API calls', async () => {
  globalThis.fetch = async () => assert.fail('Unvalidated request reached courier API');
  assert.equal((await read('?month=2026-11', false)).status, 401);
  for (const query of ['', '?month=', '?month=2026-00', '?month=2026-13', '?month=26-11', '?month=2026-11&month=2026-12']) assert.equal((await read(query)).status, 400);
});
test('reward admin BFF keeps explicit month and unknown projection without manufacturing balances', async () => {
  const result = { merchantId: 'merchant', environment: 'sandbox', providerConfirmed: null,
    projection: { month: '2026-11', status: 'incomplete', qualifyingCount: null, tier: null, rewardMinor: null, missing: ['provider_timezone'] } };
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(url); assert.equal(options.headers.Authorization, `Bearer ${env.COURIER_API_TOKEN}`);
    assert.equal(options.headers.Origin, undefined);
    if (url.endsWith('/v1/context')) return Response.json({ scope: { merchant: 'merchant', product: 'bnp' }, environment: 'sandbox' });
    assert.equal(url, 'https://courier.example.test/v1/rewards?month=2026-11');
    return Response.json(result);
  };
  const response = await read('?month=2026-11');
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), result); assert.equal(calls.length, 2);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
test('reward admin BFF hides provider errors and server secrets', async () => {
  globalThis.fetch = async () => new Response('private provider diagnostic and secret', { status: 500 });
  const response = await read('?month=2026-11'); assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Pathao rewards are unavailable. Please try again later.' });
});
