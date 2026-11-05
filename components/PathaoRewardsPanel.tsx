"use client";

import React, { useEffect, useState } from "react";

type ProviderSnapshot = {
  kind: "provider_confirmed";
  month: string;
  currency: "BDT";
  qualifyingCount: number | null;
  tier: string | null;
  balanceMinor: number | null;
  observedAt: string;
  source: string;
  evidenceId: string;
};
type Projection = {
  kind: "projection";
  status: string;
  month: string;
  currency: "BDT";
  qualifyingCount: number | null;
  tier: string | null;
  rewardMinor: number | null;
  capRemainingMinor: number | null;
  capMinor: number;
  completeThrough: string | null;
  missing: string[];
  policySource: string | null;
};
type Rewards = {
  merchantId: string;
  environment: "sandbox" | "production";
  providerConfirmed: ProviderSnapshot | null;
  projection: Projection;
};

// Convert integer poisha to decimal text without floating-point money rounding.
export function formatBdtMinor(value: number | null | undefined): string {
  if (value == null || !Number.isSafeInteger(value) || value < 0) return "Unknown";
  const digits = String(value).padStart(3, "0");
  return `BDT ${digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${digits.slice(-2)}`;
}
const count = (value: number | null | undefined) => value != null && Number.isSafeInteger(value) && value >= 0 ? String(value) : "Unknown";
const missingLabels: Record<string, string> = {
  provider_timezone: "Provider month-boundary timezone",
  provider_qualification_mapping: "Verified qualifying-delivery mapping",
  provider_reversal_policy: "Return / reversal treatment",
  policy_source: "Verified policy source",
  complete_merchant_history: "Complete merchant history across products",
  month_not_reconciled: "Selected month not reconciled",
  provider_tier_activation_timing: "Tier activation timing",
  provider_threshold_order_eligibility: "Threshold-order eligibility",
  provider_cap_allocation_policy: "Partial allocation at the monthly cap",
  verified_route_weight_discount_schedule: "Verified route / weight discount schedule",
  per_shipment_reward_evidence: "Per-shipment reward evidence",
  events_after_reconciliation: "Events newer than reconciliation",
  conflicting_event_identity: "Conflicting event identity",
  unresolved_reversal: "Unresolved reversal",
  duplicate_shipment_evidence: "Duplicate shipment evidence",
  provider_count_mismatch: "Provider count differs from projection",
};
function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-xs text-silver-400">{label}</dt><dd className="mt-1 break-words text-sm text-white">{value}</dd></div>;
}
function Source({ value }: { value: string | null }) {
  // Only HTTP(S) provenance is clickable. Evidence labels remain plain text.
  if (!value) return <>Unknown</>;
  let url: URL;
  try { url = new URL(value); } catch { return <>{value}</>; }
  return ["https:", "http:"].includes(url.protocol)
    ? <a className="underline" href={url.href} target="_blank" rel="noopener noreferrer">{value}</a>
    : <>{value}</>;
}

export default function PathaoRewardsPanel() {
  const [month, setMonth] = useState("");
  const [data, setData] = useState<Rewards | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    setLoading(false);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return () => controller.abort();
    setLoading(true);
    (async () => {
      try {
        const response = await fetch(`/api/admin/pathao/rewards?month=${encodeURIComponent(month)}`, {
          signal: controller.signal, cache: "no-store", credentials: "same-origin",
        });
        if (!response.ok) throw new Error(response.status === 401
          ? "Your admin session has expired. Sign in again to view rewards."
          : "Pathao rewards are unavailable. Try again later.");
        const result: Rewards = await response.json();
        if (!result?.projection || result.projection.month !== month || !Array.isArray(result.projection.missing)
          || (result.providerConfirmed && result.providerConfirmed.month !== month)) {
          throw new Error("The rewards response could not be verified. Try again later.");
        }
        if (!controller.signal.aborted) setData(result);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Pathao rewards are unavailable.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [month, attempt]);

  // Hide the previous month synchronously, before the next effect runs.
  const current = data?.projection.month === month ? data : null;
  const snapshot = current?.providerConfirmed;
  return (
    <section className="mb-6 rounded-2xl border border-carbon-700 bg-carbon-850 p-6" aria-labelledby="pathao-rewards-title">
      <h2 id="pathao-rewards-title" className="text-sm font-bold text-white">Pathao merchant rewards</h2>
      <p className="mt-2 text-xs text-silver-400">Lorapok Labs Courier · Read-only merchant-wide evidence, not just BNP orders. Projections are not provider-confirmed earnings and never change checkout quotes.</p>
      <label htmlFor="pathao-rewards-month" className="mt-4 block text-xs text-silver-300">Select reporting month</label>
      <input id="pathao-rewards-month" type="month" value={month} onChange={event => setMonth(event.target.value)}
        className="mt-1 rounded-xl border border-carbon-700 bg-carbon-800 px-4 py-2 text-sm text-white" />
      {!month && <p className="mt-3 text-sm text-silver-400">Choose a month to load rewards. No provider timezone is assumed.</p>}
      {loading && <p className="mt-3 text-sm text-silver-300" role="status">Loading rewards…</p>}
      {error && <div className="mt-3 text-sm text-amber-200" role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-2 underline">Retry</button></div>}
      {current && <>
        <p className="mt-4 text-xs text-silver-400">Merchant: {current.merchantId} · Environment: {current.environment} · Month: {month}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-carbon-700 p-4">
            <h3 className="text-sm font-semibold text-white">Provider-confirmed snapshot</h3>
            {!snapshot ? <p className="mt-3 text-sm text-silver-300">No provider-confirmed snapshot is available for this month. Tier, count and balance are unknown.</p> : <dl className="mt-3 space-y-3">
              <Fact label="Confirmed tier" value={snapshot.tier ?? "Unknown"} />
              <Fact label="Confirmed qualifying count" value={count(snapshot.qualifyingCount)} />
              <Fact label="Reported balance" value={formatBdtMinor(snapshot.balanceMinor)} />
              <Fact label="Observed at (provider evidence)" value={snapshot.observedAt || "Unknown"} />
              <Fact label="Source" value={<Source value={snapshot.source} />} />
              <Fact label="Evidence ID" value={snapshot.evidenceId || "Unknown"} />
            </dl>}
          </article>
          <article className="rounded-xl border border-carbon-700 p-4">
            <h3 className="text-sm font-semibold text-white">Local projection · {current.projection.status}</h3>
            <dl className="mt-3 space-y-3">
              <Fact label="Projected tier" value={current.projection.tier ?? "Unknown"} />
              <Fact label="Projected qualifying count" value={count(current.projection.qualifyingCount)} />
              <Fact label="Projected reward (not confirmed earnings)" value={formatBdtMinor(current.projection.rewardMinor)} />
              <Fact label="Projected cap remaining" value={formatBdtMinor(current.projection.capRemainingMinor)} />
              <Fact label="Policy monthly cap (not earned money)" value={formatBdtMinor(current.projection.capMinor)} />
              <Fact label="History reconciled through" value={current.projection.completeThrough ?? "Unknown"} />
              <Fact label="Policy source" value={<Source value={current.projection.policySource} />} />
            </dl>
            <h4 className="mt-4 text-xs font-semibold text-silver-300">Missing or unresolved facts</h4>
            {current.projection.missing.length ? <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-200">
              {current.projection.missing.map((fact, index) => <li key={`${fact}-${index}`}>{missingLabels[fact] || fact.replace(/_/g, " ")}</li>)}
            </ul> : <p className="mt-2 text-xs text-silver-400">None reported by the projection. This is still not a provider confirmation.</p>}
          </article>
        </div>
      </>}
      <p className="mt-4 text-xs text-silver-400">Published tier thresholds: Standard 0–49, Silver 50+, Gold 100+, Diamond 200+. Monthly cap: BDT 5,000.00. These policy thresholds do not establish this merchant’s tier or earnings.</p>
    </section>
  );
}
