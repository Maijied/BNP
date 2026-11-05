"use client";

import React, { useEffect, useRef, useState } from "react";

type Location = { id: number; name: string };
type Shipment = {
  state: "submitting" | "created" | "unknown";
  consignment_id: string | null;
  provider_status: string | null;
  last_checked_at: string | null;
  created_at: string;
};
type ShipmentView = { shipment: Shipment | null; eligible: boolean; enabled: boolean };

async function readResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Unable to load Pathao information.");
  return data;
}

function useLocations(query: string | null) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLocations([]);
    setError("");
    setLoading(Boolean(query));
    if (query) {
      fetch(`/api/admin/pathao/locations?${query}`, { signal: controller.signal, cache: "no-store" })
        .then(readResponse)
        .then(data => {
          if (!controller.signal.aborted) setLocations(data.locations || []);
        })
        .catch(error => {
          if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Unable to load locations.");
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }
    return () => controller.abort();
  }, [query]);
  return { locations, error, loading };
}

export default function PathaoShipmentPanel({ orderId, orderStatus }: { orderId: string; orderStatus: string }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ShipmentView | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [reload, setReload] = useState(0);
  const [city, setCity] = useState("");
  const [zone, setZone] = useState("");
  const [area, setArea] = useState("");
  const [weight, setWeight] = useState("0.5");
  const actionLock = useRef(false);
  const endpoint = `/api/admin/orders/${encodeURIComponent(orderId)}/shipment`;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setView(null);
    fetch(endpoint, { signal: controller.signal, cache: "no-store" })
      .then(readResponse)
      .then(data => { if (!controller.signal.aborted) setView(data); })
      .catch(error => {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Unable to read shipment.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, endpoint, orderStatus, reload]);

  const canBook = open && view?.enabled === true && view?.eligible === true && !view.shipment && !uncertain;
  const cities = useLocations(canBook ? "type=cities" : null);
  const zones = useLocations(canBook && city ? `type=zones&city_id=${city}` : null);
  const areas = useLocations(canBook && zone ? `type=areas&zone_id=${zone}` : null);
  const validSelection = cities.locations.some(item => String(item.id) === city)
    && zones.locations.some(item => String(item.id) === zone)
    && areas.locations.some(item => String(item.id) === area);
  const validWeight = Number.isFinite(Number(weight)) && Number(weight) >= 0.5 && Number(weight) <= 10;

  async function createShipment() {
    if (actionLock.current || !canBook || !validSelection || !validWeight) return;
    if (!window.confirm("Create a prepaid Pathao booking? Pathao will receive this customer's name, phone number and delivery address. No cash on delivery (COD) will be collected. This does not mark the order as shipped.")) return;
    actionLock.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city_id: Number(city), zone_id: Number(zone), area_id: Number(area), item_weight: Number(weight) }),
      });
      await readResponse(response);
      // Re-read the durable claim. Never infer booking or dispatch from client state.
      setUncertain(true);
      setReload(value => value + 1);
    } catch (error) {
      // Even a lost response may follow a successful booking. Never offer a blind retry.
      setUncertain(true);
      setError(error instanceof Error ? error.message : "Booking result could not be confirmed.");
      setReload(value => value + 1);
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }

  async function refreshTracking() {
    if (actionLock.current || view?.shipment?.state !== "created") return;
    actionLock.current = true;
    setBusy(true);
    setError("");
    try {
      await readResponse(await fetch(endpoint, { method: "PATCH" }));
      setReload(value => value + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to refresh tracking.");
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }

  const selectClass = "w-full rounded border border-carbon-700 bg-carbon-900 p-2 text-white disabled:opacity-50";
  const buttonClass = "rounded border border-carbon-700 bg-carbon-800 px-3 py-2 text-silver-200 disabled:opacity-50";
  const shipment = view?.shipment;
  const locationError = cities.error || zones.error || areas.error;

  return (
    <div className="mt-2 text-left">
      <button type="button" className={buttonClass} aria-expanded={open} aria-controls={`pathao-${orderId}`} onClick={() => setOpen(value => !value)}>
        {open ? "Hide Pathao" : "Pathao shipment"}
      </button>
      {open && <section id={`pathao-${orderId}`} aria-label="Pathao shipment" className="mt-2 min-w-[240px] max-w-sm space-y-3 rounded-lg border border-carbon-700 bg-carbon-900 p-3 text-xs whitespace-normal">
        {loading && <p role="status">Loading shipment record...</p>}
        {error && <p role="alert" className="text-red-300">{error}</p>}
        {view && !view.enabled && <p>Pathao booking is disabled in this environment.</p>}
        {view && !shipment && !view.eligible && <p>A verified settlement and quality-check status are required before booking.</p>}
        {shipment && <>
          <p>Booking state: <strong>{shipment.state}</strong></p>
          <p>Consignment: {shipment.consignment_id || "Not confirmed"}</p>
          <p>Pathao status: {shipment.provider_status || "Not available"}</p>
          <p>Last checked: {shipment.last_checked_at || "Not yet checked"}</p>
          <p className="text-silver-400">A booking is not confirmation that the order has shipped or been delivered.</p>
          {shipment.state === "created" && <button type="button" className={buttonClass} disabled={busy || loading} onClick={refreshTracking}>{busy ? "Refreshing..." : "Refresh tracking"}</button>}
        </>}
        {(shipment?.state === "submitting" || shipment?.state === "unknown" || (uncertain && !shipment)) && <p className="text-amber-300">Do not create another booking. Reconcile this order with Pathao before any retry.</p>}
        {canBook && <>
          <label className="block">City<select className={selectClass} value={city} disabled={busy || cities.loading} onChange={event => { setCity(event.target.value); setZone(""); setArea(""); }}>
            <option value="">{cities.loading ? "Loading cities..." : "Select city"}</option>
            {cities.locations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
          <label className="block">Zone<select className={selectClass} value={zone} disabled={busy || !city || zones.loading} onChange={event => { setZone(event.target.value); setArea(""); }}>
            <option value="">{zones.loading ? "Loading zones..." : "Select zone"}</option>
            {zones.locations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
          <label className="block">Area<select className={selectClass} value={area} disabled={busy || !zone || areas.loading} onChange={event => setArea(event.target.value)}>
            <option value="">{areas.loading ? "Loading areas..." : "Select area"}</option>
            {areas.locations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
          <label className="block">Package weight (kg)<input type="number" min="0.5" max="10" step="0.1" className={selectClass} value={weight} disabled={busy} onChange={event => setWeight(event.target.value)} /></label>
          <p>Prepaid only. Pathao will collect ৳0 COD.</p>
          {locationError && <p role="alert" className="text-red-300">{locationError}</p>}
          <button type="button" className={buttonClass} disabled={busy || loading || !validSelection || !validWeight} onClick={createShipment}>{busy ? "Submitting..." : "Create prepaid booking"}</button>
        </>}
        <button type="button" className={buttonClass} disabled={busy || loading} onClick={() => { setError(""); setReload(value => value + 1); }}>Reload shipment record</button>
      </section>}
    </div>
  );
}
