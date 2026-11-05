"use client";

import React, { useEffect, useRef, useState } from "react";

type Location = { id: number; name: string; home_delivery_available?: boolean | null };
type Store = { id: number; name: string | null; address: string; active: boolean };
type StorePage = { current_page: number; last_page: number; per_page: number; total: number };
type Quote = { price: number; discount: number; promo_discount: number; additional_charge: number; final_price: number; plan_id: number; currency: "BDT"; quote_id?: string; observed_at?: string };
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
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
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
          if (!controller.signal.aborted) { setLocations(data.locations || []); setLoadedQuery(query); }
        })
        .catch(error => {
          if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Unable to load locations.");
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }
    return () => controller.abort();
  }, [query]);
  return { locations: loadedQuery === query ? locations : [], error, loading: loading || (Boolean(query) && loadedQuery !== query && !error) };
}

export default function PathaoShipmentPanel({ orderId, orderStatus }: { orderId: string; orderStatus: string }) {
  return <OrderShipmentPanel key={orderId} orderId={orderId} orderStatus={orderStatus} />;
}

function OrderShipmentPanel({ orderId, orderStatus }: { orderId: string; orderStatus: string }) {
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
  const [stores, setStores] = useState<Store[]>([]);
  const [storePage, setStorePage] = useState(1);
  const [pagination, setPagination] = useState<StorePage | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storesError, setStoresError] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const quoteRequest = useRef<AbortController | null>(null);
  const quoteLock = useRef(false);
  const selectedExplicitly = useRef(false);
  const mounted = useRef(false);
  const actionLock = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; quoteRequest.current?.abort(); };
  }, []);
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
  useEffect(() => {
    if (!canBook) return;
    const controller = new AbortController();
    setStoresLoading(true);
    setStoresError("");
    setStores([]);
    setPagination(null);
    fetch(`/api/admin/pathao/stores?page=${storePage}`, { signal: controller.signal, cache: "no-store" })
      .then(readResponse)
      .then(data => {
        if (controller.signal.aborted) return;
        const pageStores: Store[] = data.stores || [];
        setStores(pageStores);
        setPagination(data.pagination);
        setSelectedStore(previous => {
          // Retain a deliberate selection across pages; refresh its active status if seen again.
          if (previous) return pageStores.find(store => store.id === previous.id) || previous;
          if (selectedExplicitly.current) return null;
          return pageStores.find(store => store.active && store.id === data.configured_store_id) || null;
        });
      })
      .catch(error => {
        if (!controller.signal.aborted) setStoresError(error instanceof Error ? error.message : "Unable to load stores.");
      })
      .finally(() => { if (!controller.signal.aborted) setStoresLoading(false); });
    return () => controller.abort();
  }, [canBook, storePage]);

  function clearQuote() {
    quoteRequest.current?.abort();
    quoteRequest.current = null;
    quoteLock.current = false;
    setQuote(null);
    setQuoteError("");
    setQuoteLoading(false);
  }

  useEffect(() => {
    clearQuote();
    return () => { quoteRequest.current?.abort(); };
  }, [open, city, zone, area, weight, selectedStore?.id, selectedStore?.active, orderStatus]);

  const cities = useLocations(canBook ? "type=cities" : null);
  const zones = useLocations(canBook && city ? `type=zones&city_id=${city}` : null);
  const areas = useLocations(canBook && zone ? `type=areas&zone_id=${zone}` : null);
  const validSelection = cities.locations.some(item => String(item.id) === city)
    && zones.locations.some(item => String(item.id) === zone)
    && areas.locations.some(item => String(item.id) === area && item.home_delivery_available === true);
  const validWeight = Number.isFinite(Number(weight)) && Number(weight) >= 0.5 && Number(weight) <= 10;

  const validStore = selectedStore !== null && selectedStore.active === true && Number.isInteger(selectedStore.id) && selectedStore.id > 0;
  const bookingPayload = { store_id: selectedStore?.id, city_id: Number(city), zone_id: Number(zone), area_id: Number(area), item_weight: Number(weight) };

  async function estimateFee() {
    if (quoteLock.current || actionLock.current || !canBook || storesLoading || Boolean(storesError) || !validStore || !validSelection || !validWeight) return;
    const controller = new AbortController();
    quoteRequest.current = controller;
    quoteLock.current = true;
    setQuoteLoading(true);
    setQuoteError("");
    setQuote(null);
    try {
      const data = await readResponse(await fetch("/api/admin/pathao/rates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload), signal: controller.signal,
      }));
      if (!controller.signal.aborted && mounted.current) setQuote(data.quote);
    } catch (error) {
      if (!controller.signal.aborted && mounted.current) setQuoteError(error instanceof Error ? error.message : "Unable to estimate courier fee.");
    } finally {
      if (quoteRequest.current === controller && mounted.current) { quoteLock.current = false; setQuoteLoading(false); }
    }
  }

  async function createShipment() {
    if (actionLock.current || !canBook || !validStore || storesLoading || Boolean(storesError) || !validSelection || !validWeight) return;
    if (!window.confirm("Create a prepaid Pathao booking? Pathao will receive this customer's name, phone number and delivery address. No cash on delivery (COD) will be collected. This does not mark the order as shipped.")) return;
    actionLock.current = true;
    clearQuote();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload),
      });
      await readResponse(response);
      if (!mounted.current) return;
      // Re-read the durable claim. Never infer booking or dispatch from client state.
      setUncertain(true);
      setReload(value => value + 1);
    } catch (error) {
      if (!mounted.current) return;
      // Even a lost response may follow a successful booking. Never offer a blind retry.
      setUncertain(true);
      setError(error instanceof Error ? error.message : "Booking result could not be confirmed.");
      setReload(value => value + 1);
    } finally {
      actionLock.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function refreshTracking() {
    if (actionLock.current || view?.shipment?.state !== "created") return;
    actionLock.current = true;
    clearQuote();
    setBusy(true);
    setError("");
    try {
      await readResponse(await fetch(endpoint, { method: "PATCH" }));
      if (mounted.current) setReload(value => value + 1);
    } catch (error) {
      if (!mounted.current) return;
      setError(error instanceof Error ? error.message : "Unable to refresh tracking.");
    } finally {
      actionLock.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  const selectClass = "w-full rounded border border-carbon-700 bg-carbon-900 p-2 text-white disabled:opacity-50";
  const buttonClass = "rounded border border-carbon-700 bg-carbon-800 px-3 py-2 text-silver-200 disabled:opacity-50";
  const shipment = view?.shipment;
  const locationError = cities.error || zones.error || areas.error;

  return (
    <div className="mt-2 text-left">
      <button type="button" className={buttonClass} aria-expanded={open} aria-controls={`pathao-${orderId}`} disabled={busy} onClick={() => { clearQuote(); setView(null); setError(""); setOpen(value => !value); }}>
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
          <label className="block">Pickup store<select className={selectClass} value={selectedStore ? String(selectedStore.id) : ""} disabled={busy || storesLoading} onChange={event => { clearQuote(); selectedExplicitly.current = true; setSelectedStore(stores.find(store => store.active && String(store.id) === event.target.value) || null); }}>
            <option value="">{storesLoading ? "Loading stores..." : "Select an active pickup store"}</option>
            {selectedStore && !stores.some(store => store.id === selectedStore.id) && <option value={selectedStore.id} disabled={!selectedStore.active}>{selectedStore.name || `Store ${selectedStore.id}`} (selected on another page)</option>}
            {stores.map(store => <option key={store.id} value={store.id} disabled={!store.active}>{store.name || `Store ${store.id}`}{store.active ? "" : " (inactive)"}</option>)}
          </select></label>
          {selectedStore && <p>Selected pickup: <strong>{selectedStore.name || `Store ${selectedStore.id}`}</strong> (#{selectedStore.id})<br />{selectedStore.address}{!selectedStore.active && <span className="block text-red-300">This store is inactive. Choose an active store before booking.</span>}</p>}
          {pagination && <div className="flex items-center gap-2">
            <button type="button" className={buttonClass} disabled={busy || storesLoading || pagination.current_page <= 1} onClick={() => { setStoresLoading(true); setStorePage(pagination.current_page - 1); }}>Previous stores</button>
            <span>Page {pagination.current_page} of {pagination.last_page} ({pagination.total} stores)</span>
            <button type="button" className={buttonClass} disabled={busy || storesLoading || pagination.current_page >= pagination.last_page} onClick={() => { setStoresLoading(true); setStorePage(pagination.current_page + 1); }}>Next stores</button>
          </div>}
          {storesError && <p role="alert" className="text-red-300">{storesError} Reload the shipment record to try loading stores again.</p>}
          {!storesLoading && !storesError && stores.length === 0 && <p>No stores on this page.</p>}
          <label className="block">City<select className={selectClass} value={city} disabled={busy || cities.loading} onChange={event => { clearQuote(); setCity(event.target.value); setZone(""); setArea(""); }}>
            <option value="">{cities.loading ? "Loading cities..." : "Select city"}</option>
            {cities.locations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
          <label className="block">Zone<select className={selectClass} value={zone} disabled={busy || !city || zones.loading} onChange={event => { clearQuote(); setZone(event.target.value); setArea(""); }}>
            <option value="">{zones.loading ? "Loading zones..." : "Select zone"}</option>
            {zones.locations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
          <label className="block">Area<select className={selectClass} value={area} disabled={busy || !zone || areas.loading} onChange={event => { clearQuote(); setArea(event.target.value); }}>
            <option value="">{areas.loading ? "Loading areas..." : "Select area"}</option>
            {areas.locations.map(item => <option key={item.id} value={item.id} disabled={item.home_delivery_available !== true}>{item.name}{item.home_delivery_available !== true ? " (delivery unavailable or unconfirmed)" : ""}</option>)}
          </select></label>
          <label className="block">Package weight (kg)<input type="number" min="0.5" max="10" step="0.1" className={selectClass} value={weight} disabled={busy} onChange={event => { clearQuote(); setWeight(event.target.value); }} /></label>
          <button type="button" className={buttonClass} disabled={busy || quoteLoading || storesLoading || Boolean(storesError) || !validStore || !validSelection || !validWeight} onClick={estimateFee}>{quoteLoading ? "Estimating..." : "Estimate courier fee"}</button>
          {quoteError && <p role="alert" className="text-red-300">{quoteError}</p>}
          {quote && <div role="status" className="space-y-2">
            <p>Estimated merchant courier fee: <strong>৳{quote.final_price} BDT</strong></p>
            <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-silver-300">
              <dt>Provider base price</dt><dd>৳{quote.price}</dd>
              <dt>Provider discount</dt><dd>৳{quote.discount}</dd>
              <dt>Promotional discount</dt><dd>৳{quote.promo_discount}</dd>
              <dt>Additional charge</dt><dd>৳{quote.additional_charge}</dd>
            </dl>
            {quote.observed_at && <p className="break-all text-silver-400">Quote observed: {quote.observed_at}</p>}
            <p>No discount is subtracted again. This estimate is not a final invoice, customer checkout charge or proof of payment. Final courier charges and return fees may differ.</p>
          </div>}
          <p>Prepaid only. Pathao will collect ৳0 COD.</p>
          {locationError && <p role="alert" className="text-red-300">{locationError}</p>}
          <button type="button" className={buttonClass} disabled={busy || loading || storesLoading || Boolean(storesError) || !validStore || !validSelection || !validWeight} onClick={createShipment}>{busy ? "Submitting..." : "Create prepaid booking"}</button>
        </>}
        <button type="button" className={buttonClass} disabled={busy || loading} onClick={() => { clearQuote(); setError(""); setReload(value => value + 1); }}>Reload shipment record</button>
      </section>}
    </div>
  );
}
