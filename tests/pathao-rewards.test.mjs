import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { DEFAULT_REWARD_POLICY, computeRewardsProjection, createRewardsService } from '../services/pathao-api/src/rewards.js';
const scope = { merchantId: 'merchant-a', environment: 'sandbox', tenantId: 'tenant-a', productId: 'bnp', month: '2026-11', completeThrough: '2026-11-30T23:59:59Z' };
// These are test-only policy assumptions, not assertions about Pathao's policy.
const policy = { ...DEFAULT_REWARD_POLICY, timezone: 'UTC', qualificationMapping: 'test-only-sorting', reversalPolicy: 'original_month', discountScheduleSource: 'test-only-fixed-fixture', tierActivationTiming: 'subsequent_orders', thresholdOrderEligibility: 'following_order', capAllocationPolicy: 'partial_remainder' };
const event = (n = 1, extra = {}) => ({ ...scope, eventId: `fixture-event-${n}`, shipmentId: `fixture-shipment-${n}`, kind: 'qualification', occurredAt: '2026-11-02T00:00:00Z', observedAt: '2026-11-02T01:00:00Z', source: 'test-fixture', rewardMinor: 100, ...extra });
function fixture(adapter = { authenticateAndNormalize: async input => input }) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../services/pathao-api/migrations/0003_rewards.sql', import.meta.url), 'utf8'));
  const db = { prepare(sql) { const stmt = sqlite.prepare(sql); let values = []; const bound = { bind(...args) { values = args; return bound; }, async run() { return { meta: { changes: Number(stmt.run(...values).changes) } }; }, async first() { return stmt.get(...values) || null; }, async all() { return { results: stmt.all(...values) }; } }; return bound; } };
  return { sqlite, service: createRewardsService({ db, policy, adapter }) };
}
test('unknown provider configuration fails closed, with no asserted tier/count/earnings', () => {
  const result = computeRewardsProjection([event()], DEFAULT_REWARD_POLICY, scope);
  assert.equal(result.status, 'incomplete'); assert.equal(result.tier, null); assert.equal(result.qualifyingCount, null); assert.equal(result.rewardMinor, null);
  assert.ok(result.missing.includes('provider_timezone'));
});
test('monthly tiers are exact at all published boundaries and reset by month', () => {
  for (const [count, tier] of [[0, 'Standard'], [49, 'Standard'], [50, 'Silver'], [99, 'Silver'], [100, 'Gold'], [199, 'Gold'], [200, 'Diamond']]) {
    const events = Array.from({ length: count }, (_, i) => event(i));
    assert.equal(computeRewardsProjection(events, policy, scope).tier, tier);
    assert.equal(computeRewardsProjection(events, policy, { ...scope, month: '2026-12', completeThrough: '2026-12-01T00:00:00Z' }).tier, 'Standard');
  }
});
test('merchant cap spans products, isolates merchants/environments, and uses exact safe integer sum', () => {
  const events = [event(1, { rewardMinor: Number.MAX_SAFE_INTEGER }), event(2, { productId: 'other', rewardMinor: Number.MAX_SAFE_INTEGER }), event(3, { merchantId: 'other' }), event(4, { environment: 'production' })];
  const result = computeRewardsProjection(events, policy, scope);
  assert.equal(result.qualifyingCount, 2); assert.equal(result.rewardMinor, 500000);
});
test('duplicates and out-of-order reversals cannot inflate count or earnings', () => {
  const original = event();
  const reversal = event(2, { kind: 'reversal', shipmentId: original.shipmentId, reversesEventId: original.eventId, occurredAt: '2026-12-01T00:00:00Z' });
  assert.equal(computeRewardsProjection([original, original], policy, scope).qualifyingCount, 1);
  assert.equal(computeRewardsProjection([reversal, original, reversal], policy, { ...scope, completeThrough: '2026-12-02T00:00:00Z' }).qualifyingCount, 0);
  assert.equal(computeRewardsProjection([reversal], policy, scope).status, 'incomplete');
  assert.equal(computeRewardsProjection([original, event(2, { shipmentId: original.shipmentId })], policy, scope).status, 'incomplete');
});
test('provider timezone decides month, no implicit UTC fallback', () => {
  const events = [event(1, { occurredAt: '2026-10-31T19:00:00Z' })];
  assert.equal(computeRewardsProjection(events, { ...policy, timezone: 'Asia/Dhaka' }, scope).qualifyingCount, 1);
  assert.equal(computeRewardsProjection(events, policy, scope).qualifyingCount, 0);
  assert.equal(computeRewardsProjection(events, { ...policy, timezone: 'invalid' }, scope).qualifyingCount, null);
});
test('unknown discount schedule or missing earnings never invents discount or modifies final_price', () => {
  const original = event(1, { rewardMinor: null, final_price: 65 });
  const result = computeRewardsProjection([original], { ...policy, discountScheduleSource: null }, scope);
  assert.equal(result.qualifyingCount, 1); assert.equal(result.rewardMinor, null); assert.equal(result.status, 'incomplete'); assert.equal(original.final_price, 65);
  assert.equal(computeRewardsProjection([], policy, { ...scope, completeThrough: null }).tier, null);
  assert.throws(() => computeRewardsProjection([event(1, { rewardMinor: 1.5 })], policy, scope), /Invalid reward/);
});
test('D1 stores immutable scoped evidence, handles replay and rejects conflicting identity', async () => {
  const { service } = fixture();
  assert.equal((await service.ingestTrustedEvidence(event(), scope)).duplicate, false);
  assert.equal((await service.ingestTrustedEvidence(event(), scope)).duplicate, true);
  await assert.rejects(service.ingestTrustedEvidence(event(1, { rewardMinor: 999 }), scope), /Conflicting/);
  await assert.rejects(service.ingestTrustedEvidence(event(2, { merchantId: 'other' }), scope), /scope mismatch/);
  await assert.rejects(service.ingestTrustedEvidence(event(2, { productId: 'other' }), scope), /scope mismatch/);
  await assert.rejects(service.ingestTrustedEvidence(event(2, { kind: 'returned' }), scope), /Unsupported/);
});
test('ingestion is disabled without trusted server adapter, ignores public verified flag', async () => {
  const { service, sqlite } = fixture(null);
  await assert.rejects(service.ingestTrustedEvidence({ ...event(), verified: true }, scope), /adapter not configured/);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM pathao_reward_evidence').get().n, 0);
  const rejecting = fixture({ authenticateAndNormalize: async () => { throw new Error('Unauthenticated source'); } });
  await assert.rejects(rejecting.service.ingestTrustedEvidence(event(), scope), /Unauthenticated/);
});
test('provider observations and computed projections stay separate and latest snapshot wins', async () => {
  const { service } = fixture();
  await service.ingestTrustedEvidence(event(), scope);
  const before = await service.getRewards(scope);
  assert.equal(before.providerConfirmed, null); assert.equal(before.projection.tier, null);
  const snapshot = event(10, { kind: 'snapshot', month: scope.month, qualifyingCount: 88, tier: 'Silver', balanceMinor: 1234, completeThrough: scope.completeThrough, observedAt: '2026-12-01T00:00:00Z' });
  await service.ingestTrustedEvidence(snapshot, scope);
  await service.ingestTrustedEvidence({ ...snapshot, eventId: 'older', observedAt: '2026-11-30T00:00:00Z', completeThrough: '2026-11-29T00:00:00Z', qualifyingCount: 70 }, scope);
  const result = await service.getRewards(scope);
  assert.equal(result.providerConfirmed.qualifyingCount, 88); assert.equal(result.providerConfirmed.source, 'test-fixture');
  assert.equal(result.projection.qualifyingCount, 1); assert.equal(result.projection.rewardMinor, null);
  assert.ok(result.projection.missing.includes('provider_count_mismatch'));
  const other = await service.getRewards({ ...scope, merchantId: 'other' });
  assert.equal(other.providerConfirmed, null); assert.equal(other.projection.qualifyingCount, null);
});

test('future month or reversal beyond reconciliation cannot assert a current tier', () => {
  assert.equal(computeRewardsProjection([], policy, { ...scope, month: '2026-12' }).tier, null);
  const reversal = event(2, { kind: 'reversal', shipmentId: event().shipmentId, reversesEventId: event().eventId, occurredAt: '2026-12-01T00:00:00Z' });
  assert.equal(computeRewardsProjection([event(), reversal], policy, scope).qualifyingCount, null);
});

test('D1 read aggregates merchant products but isolates identical IDs in other scopes', async () => {
  const { service } = fixture();
  await service.ingestTrustedEvidence(event(), scope);
  const productScope = { ...scope, productId: 'another-product', tenantId: 'another-tenant' };
  await service.ingestTrustedEvidence(event(2, productScope), productScope);
  const otherScope = { ...scope, merchantId: 'merchant-other' };
  await service.ingestTrustedEvidence(event(1, otherScope), otherScope);
  const productionScope = { ...scope, environment: 'production' };
  await service.ingestTrustedEvidence(event(1, productionScope), productionScope);
  await service.ingestTrustedEvidence(event(3, { kind: 'snapshot', qualifyingCount: 2, tier: 'Standard', balanceMinor: 200, observedAt: '2026-12-01T00:00:00Z' }), scope);
  const result = await service.getRewards(scope);
  assert.equal(result.projection.qualifyingCount, 2); assert.equal(result.projection.rewardMinor, 200);
  assert.equal((await service.getRewards(productionScope)).providerConfirmed, null);
});

test('cap clips only excess, preserving exact partial remainder and zero', () => {
  const nearlyFull = computeRewardsProjection([event(1, { rewardMinor: 499990 })], policy, scope);
  assert.equal(nearlyFull.rewardMinor, 499990); assert.equal(nearlyFull.capRemainingMinor, 10);
  const clipped = computeRewardsProjection([event(1, { rewardMinor: 499990 }), event(2, { rewardMinor: 20 })], policy, scope);
  assert.equal(clipped.rewardMinor - nearlyFull.rewardMinor, 10); assert.equal(clipped.capRemainingMinor, 0);
  assert.equal(computeRewardsProjection([event(1, { rewardMinor: 0 })], policy, scope).rewardMinor, 0);
  assert.throws(() => computeRewardsProjection([event(1, { rewardMinor: -1 })], policy, scope), /Invalid reward/);
  assert.throws(() => computeRewardsProjection([event(1, { rewardMinor: Number.MAX_SAFE_INTEGER + 1 })], policy, scope), /Invalid reward/);
});
test('month-end tier cannot imply retroactive earned discount without activation policy', () => {
  const events = Array.from({ length: 50 }, (_, i) => event(i));
  const result = computeRewardsProjection(events, { ...policy, tierActivationTiming: null }, scope);
  assert.equal(result.tier, 'Silver'); assert.equal(result.rewardMinor, null);
  assert.ok(result.missing.includes('provider_tier_activation_timing'));
});
test('quotes and invoices are not rewards and final prices are never discounted again', async () => {
  const { service } = fixture();
  for (const kind of ['quote', 'invoice']) await assert.rejects(service.ingestTrustedEvidence(event(1, { kind, final_price: 65, discount: 5 }), scope), /Unsupported/);
  const evidence = event(1, { rewardMinor: 500, quote: { final_price: 65 }, invoice: { final_price: 60 } });
  const result = computeRewardsProjection([evidence], policy, scope);
  assert.equal(result.rewardMinor, 500); assert.equal(evidence.quote.final_price, 65); assert.equal(evidence.invoice.final_price, 60);
  assert.equal('final_price' in result, false);
});

test('unknown threshold inclusion and partial-cap allocation keep earnings unverified', () => {
  const result = computeRewardsProjection([event()], { ...policy, thresholdOrderEligibility: null, capAllocationPolicy: null }, scope);
  assert.equal(result.rewardMinor, null); assert.equal(result.capRemainingMinor, null);
  assert.ok(result.missing.includes('provider_threshold_order_eligibility'));
  assert.ok(result.missing.includes('provider_cap_allocation_policy'));
});
