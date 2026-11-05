/** Pure, read-only reward projections. No Pathao endpoint/event mapping is assumed here.
 * Integers are BDT minor units (100 poisha = 1 BDT). Quotes' final_price is untouched.
 * Only a server-installed adapter may authenticate and normalize ledger evidence.
 */
export const DEFAULT_REWARD_POLICY = Object.freeze({
  currency: 'BDT', monthlyCapMinor: 500000,
  tiers: Object.freeze([{ name: 'Standard', minimum: 0 }, { name: 'Silver', minimum: 50 }, { name: 'Gold', minimum: 100 }, { name: 'Diamond', minimum: 200 }]),
  timezone: null, qualificationMapping: null, reversalPolicy: null,
  discountScheduleSource: null,
  // Merchant FAQ confirms future orders, but not whether the threshold order qualifies.
  tierActivationTiming: 'subsequent_orders',
  tierActivationSource: 'https://merchant.pathao.com/courier/benefits-reward',
  thresholdOrderEligibility: null, capAllocationPolicy: null,
  source: 'https://merchant.pathao.com/courier/benefits-reward',
});
const text = (v, label) => { if (typeof v !== 'string' || !v.trim() || v.length > 512) throw new Error(`Invalid ${label}`); return v; };
const integer = (v, label) => { if (!Number.isSafeInteger(v) || v < 0) throw new Error(`Invalid ${label}`); return v; };
function timestamp(v) { if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v) || !Number.isFinite(Date.parse(v))) throw new Error('Invalid timestamp'); return new Date(v).toISOString(); }
function scopeOf(scope) {
  text(scope?.merchantId, 'merchant');
  if (!['sandbox', 'production'].includes(scope.environment)) throw new Error('Invalid environment');
  return scope;
}
function monthOf(at, zone) { const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit' }).formatToParts(new Date(at)); return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}`; }
function checkMonth(month) { if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Invalid month'); }
function policyIssues(policy) {
  const missing = [];
  if (policy.currency !== 'BDT') throw new Error('Unsupported rewards currency');
  if (!policy.timezone) missing.push('provider_timezone');
  else { try { monthOf('2026-01-01T00:00:00Z', policy.timezone); } catch { missing.push('provider_timezone'); } }
  if (!policy.qualificationMapping) missing.push('provider_qualification_mapping');
  if (policy.reversalPolicy !== 'original_month') missing.push('provider_reversal_policy');
  if (!policy.source) missing.push('policy_source');
  integer(policy.monthlyCapMinor, 'monthly cap');
  if (!Array.isArray(policy.tiers) || !policy.tiers.length || policy.tiers[0].minimum !== 0) throw new Error('Invalid tiers');
  policy.tiers.forEach((tier, i) => { text(tier.name, 'tier name'); integer(tier.minimum, 'tier threshold'); if (i && tier.minimum <= policy.tiers[i - 1].minimum) throw new Error('Invalid tiers'); });
  return missing;
}
function rewardPolicyIssues(policy) {
  const issues = [];
  if (!policy.tierActivationSource || !['subsequent_orders', 'retroactive_month'].includes(policy.tierActivationTiming)) issues.push('provider_tier_activation_timing');
  if (!['threshold_order', 'following_order'].includes(policy.thresholdOrderEligibility)) issues.push('provider_threshold_order_eligibility');
  // Partial remainder clipping is configurable, not an assumed provider behavior.
  if (policy.capAllocationPolicy !== 'partial_remainder') issues.push('provider_cap_allocation_policy');
  if (!policy.discountScheduleSource) issues.push('verified_route_weight_discount_schedule');
  return issues;
}
/** Events use the normalized contract documented in ingestTrustedEvidence below.
 * completeThrough must come from a trusted reconciliation adapter, not a caller's claim.
 * This result is always a projection and never a provider-confirmed tier/balance.
 */
export function computeRewardsProjection(events, policy = DEFAULT_REWARD_POLICY, context) {
  scopeOf(context); checkMonth(context.month);
  const missing = policyIssues(policy);
  if (!context.completeThrough) missing.push('complete_merchant_history');
  else {
    timestamp(context.completeThrough);
    if (!missing.includes('provider_timezone') && monthOf(context.completeThrough, policy.timezone) < context.month) missing.push('month_not_reconciled');
  }
  const result = { kind: 'projection', status: 'incomplete', month: context.month, currency: policy.currency,
    qualifyingCount: null, tier: null, rewardMinor: null, capRemainingMinor: null, capMinor: policy.monthlyCapMinor,
    completeThrough: context.completeThrough || null, missing, policySource: policy.source || null };
  if (missing.length) { missing.push(...rewardPolicyIssues(policy)); return result; }
  const scoped = events.filter(e => e.merchantId === context.merchantId && e.environment === context.environment);
  if (scoped.some(e => Date.parse(e.occurredAt) > Date.parse(context.completeThrough))) { result.missing.push('events_after_reconciliation'); return result; }
  const byId = new Map();
  for (const event of scoped) {
    if (byId.has(event.eventId) && JSON.stringify(byId.get(event.eventId)) !== JSON.stringify(event)) { result.missing.push('conflicting_event_identity'); return result; }
    byId.set(event.eventId, event);
  }
  const reversals = new Set();
  for (const e of byId.values()) if (e.kind === 'reversal') {
    const original = byId.get(e.reversesEventId);
    if (!original || original.kind !== 'qualification' || original.shipmentId !== e.shipmentId) { result.missing.push('unresolved_reversal'); return result; }
    reversals.add(e.reversesEventId);
  }
  const shipments = new Map();
  for (const e of byId.values()) {
    if (e.kind !== 'qualification' || monthOf(timestamp(e.occurredAt), policy.timezone) !== context.month || reversals.has(e.eventId)) continue;
    if (Date.parse(e.occurredAt) > Date.parse(context.completeThrough)) { result.missing.push('events_after_reconciliation'); return result; }
    // Multiple IDs for the same shipment cannot silently increase count or earnings.
    if (shipments.has(e.shipmentId)) { result.missing.push('duplicate_shipment_evidence'); return result; }
    shipments.set(e.shipmentId, e);
  }
  result.qualifyingCount = shipments.size;
  result.tier = [...policy.tiers].reverse().find(t => shipments.size >= t.minimum).name;
  result.status = 'projected';
  result.missing.push(...rewardPolicyIssues(policy));
  if ([...shipments.values()].some(e => e.rewardMinor === null || e.rewardMinor === undefined)) result.missing.push('per_shipment_reward_evidence');
  if (result.missing.length) { result.status = 'incomplete'; return result; }
  // rewardMinor must be the adapter's verified per-shipment amount under the
  // supplied route/weight/tier timing schedule, never derived from month-end tier.
  // BigInt prevents loss of precision even when aggregate earnings exceed safe integer.
  const earned = [...shipments.values()].reduce((sum, e) => sum + BigInt(integer(e.rewardMinor, 'reward')), 0n);
  result.rewardMinor = Number(earned > BigInt(policy.monthlyCapMinor) ? BigInt(policy.monthlyCapMinor) : earned);
  result.capRemainingMinor = policy.monthlyCapMinor - result.rewardMinor;
  return result;
}
function normalizeEvidence(raw, scope) {
  if (!raw || raw.merchantId !== scope.merchantId || raw.environment !== scope.environment || raw.tenantId !== scope.tenantId || raw.productId !== scope.productId) throw new Error('Evidence scope mismatch');
  const base = { merchantId: scope.merchantId, environment: scope.environment, tenantId: text(scope.tenantId, 'tenant'), productId: text(scope.productId, 'product'), eventId: text(raw.eventId, 'provider evidence ID'), source: text(raw.source, 'source'), observedAt: timestamp(raw.observedAt), kind: raw.kind };
  if (raw.kind === 'snapshot') {
    checkMonth(raw.month);
    if (raw.completeThrough && Date.parse(timestamp(raw.completeThrough)) > Date.parse(base.observedAt)) throw new Error('Reconciliation cannot be later than observation');
    return { ...base, month: raw.month, qualifyingCount: raw.qualifyingCount == null ? null : integer(raw.qualifyingCount, 'provider count'), tier: raw.tier == null ? null : text(raw.tier, 'provider tier'), balanceMinor: raw.balanceMinor == null ? null : integer(raw.balanceMinor, 'provider balance'), currency: 'BDT', completeThrough: raw.completeThrough ? timestamp(raw.completeThrough) : null };
  }
  if (!['qualification', 'reversal'].includes(raw.kind)) throw new Error('Unsupported normalized reward event');
  return { ...base, shipmentId: text(raw.shipmentId, 'shipment'), occurredAt: timestamp(raw.occurredAt), reversesEventId: raw.kind === 'reversal' ? text(raw.reversesEventId, 'reversed event ID') : null, rewardMinor: raw.kind === 'qualification' && raw.rewardMinor != null ? integer(raw.rewardMinor, 'reward') : null };
}
/** Adapter must validate actual provider authentication, scope ownership, event mapping,
 * stable provider identity, and all normalized fields. A snapshot's completeThrough
 * may be set ONLY after full merchant history (all products) has been reconciled
 * into this ledger through that timestamp; a provider counter alone is insufficient.
 * Never install an identity adapter
 * or pass a public JSON body as normalized evidence. Adapter absence disables ingestion.
 */
export function createRewardsService({ db, adapter = null, policy = DEFAULT_REWARD_POLICY }) {
  if (!db?.prepare) throw new Error('Rewards D1 binding required');
  return {
    async ingestTrustedEvidence(input, scope) {
      scopeOf(scope);
      if (typeof adapter?.authenticateAndNormalize !== 'function') throw new Error('Trusted rewards adapter not configured');
      const event = normalizeEvidence(await adapter.authenticateAndNormalize(input, Object.freeze({ ...scope })), scope);
      const payload = JSON.stringify(event);
      // Immutable event identity. A replay cannot alter another product's prior evidence.
      const inserted = await db.prepare('INSERT INTO pathao_reward_evidence (merchant_id, environment, event_id, tenant_id, product_id, kind, source, observed_at, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (merchant_id, environment, event_id) DO NOTHING').bind(event.merchantId, event.environment, event.eventId, event.tenantId, event.productId, event.kind, event.source, event.observedAt, payload).run();
      const existing = await db.prepare('SELECT payload FROM pathao_reward_evidence WHERE merchant_id = ? AND environment = ? AND event_id = ?').bind(event.merchantId, event.environment, event.eventId).first();
      if (existing?.payload !== payload) throw new Error('Conflicting rewards evidence identity');
      return { accepted: true, duplicate: inserted.meta?.changes === 0 };
    },
    async getRewards(scope) {
      scopeOf(scope); checkMonth(scope.month);
      const rows = await db.prepare('SELECT payload FROM pathao_reward_evidence WHERE merchant_id = ? AND environment = ? ORDER BY observed_at, event_id').bind(scope.merchantId, scope.environment).all();
      const events = (rows.results || []).map(r => JSON.parse(r.payload));
      const snapshots = events.filter(e => e.kind === 'snapshot' && e.month === scope.month).sort((a, b) => b.observedAt.localeCompare(a.observedAt) || b.eventId.localeCompare(a.eventId));
      const latest = snapshots[0];
      const providerConfirmed = latest ? { kind: 'provider_confirmed', observedAt: latest.observedAt, source: latest.source, evidenceId: latest.eventId, month: latest.month, currency: latest.currency, qualifyingCount: latest.qualifyingCount, tier: latest.tier, balanceMinor: latest.balanceMinor } : null;
      const projection = computeRewardsProjection(events.filter(e => e.kind !== 'snapshot'), policy, { ...scope, completeThrough: latest?.completeThrough || null });
      if (latest?.qualifyingCount != null && projection.qualifyingCount != null && latest.qualifyingCount !== projection.qualifyingCount) {
        projection.status = 'incomplete'; projection.missing.push('provider_count_mismatch');
        projection.rewardMinor = null; projection.capRemainingMinor = null;
      }
      return { merchantId: scope.merchantId, environment: scope.environment, providerConfirmed, projection };
    },
  };
}
