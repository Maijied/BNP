"use client";
import React, { useEffect, useRef, useState } from "react";
import { useStorefront } from "@/components/StorefrontContext";
import MascotGuide from "@/components/MascotGuide";
type Product = { sku: string; title: string; unit_price_minor: number; currency: string; active: boolean; version: number; kind: string; metadata?: { model?: string } };
type Shipping = { code: string; label: string; price_minor: number; active: boolean; version: number };
type Catalog = { products: Product[]; shipping_methods: Shipping[]; capabilities: { order_intake: boolean } };
const money = (minor: number) => { if (!Number.isSafeInteger(minor) || minor < 0) return '—'; const n = BigInt(minor); return `৳ ${n / BigInt(100)}.${String(n % BigInt(100)).padStart(2, '0')}`; };
const pendingKey = "bnp-pending-unpaid-request-v1";
export default function OrderForm() {
  const { model, setModel, plateText, setPlateText, quantity, setQuantity, bracket, setBracket, district, setDistrict } = useStorefront();
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [shippingCode, setShippingCode] = useState("");
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [receipt, setReceipt] = useState<any>(null);
  const [uncertain, setUncertain] = useState(false); const [conflict, setConflict] = useState(false);
  const pending = useRef<any>(null);
  const loadGeneration = useRef(0);
  async function loadCatalog() {
    const generation = ++loadGeneration.current;
    try { const res = await fetch('/api/catalog', { cache: 'no-store' }); const data = await res.json(); if (generation !== loadGeneration.current) return; if (!res.ok) throw new Error(data.error); setCatalog(data); }
    catch { if (generation !== loadGeneration.current) return; setCatalog(null); setError('Order intake is unavailable. No payment can be made here.'); }
    finally { if (generation === loadGeneration.current) setCatalogLoading(false); }
  }
  useEffect(() => {
    loadCatalog();
    try { const saved = sessionStorage.getItem(pendingKey); if (saved) { pending.current = JSON.parse(saved); setUncertain(true); setError('A previous request has an unconfirmed outcome. Retry the original request below to check it safely.'); } } catch { /* Session storage may be unavailable. The in-memory key is still reused. */ }
    return () => { ++loadGeneration.current; };
  }, []);
  const matches = catalog?.products.filter(p => p.active && p.currency === 'BDT' && p.metadata?.model === model) || [];
  const product = matches.length === 1 ? matches[0] : undefined;
  const brackets = catalog?.products.filter(p => p.active && p.currency === 'BDT' && p.kind === 'bracket') || [];
  const bracketProduct = brackets.length === 1 ? brackets[0] : undefined;
  const shipping = catalog?.shipping_methods.find(s => s.active && s.code === shippingCode);
  const amounts = [product?.unit_price_minor, shipping?.price_minor, ...(bracket ? [bracketProduct?.unit_price_minor] : [])];
  const validQuantity = Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 100;
  const validAmounts = amounts.every(n => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0);
  const rawTotal = product && shipping && validQuantity && validAmounts ? BigInt(product.unit_price_minor) * BigInt(quantity) + (bracket && bracketProduct ? BigInt(bracketProduct.unit_price_minor) * BigInt(quantity) : BigInt(0)) + BigInt(shipping.price_minor) : null;
  const total = rawTotal !== null && rawTotal <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(rawTotal) : null;
  const enabled = catalog?.capabilities?.order_intake === true;
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy || conflict || receipt) return;
    if (!pending.current) {
      if (!enabled || !product || !shipping || total === null || (bracket && !bracketProduct)) return;
      if (!/^01[3-9]\d{8}$/.test(phone.trim())) { setError('Enter a valid 11-digit Bangladesh mobile number.'); return; }
      const items = [{ sku: product.sku, quantity, customization: { registration_bangla: plateText.trim() } }, ...(bracket && bracketProduct ? [{ sku: bracketProduct.sku, quantity, customization: {} }] : [])];
      pending.current = { request_id: crypto.randomUUID(), customer: { name: name.trim(), phone: phone.trim(), address: address.trim(), district: district.trim() }, items, shipping_code: shipping.code, expected_catalog_versions: Object.fromEntries(items.map(i => [i.sku, catalog!.products.find(p => p.sku === i.sku)!.version])), expected_shipping_version: shipping.version };
      try { sessionStorage.setItem(pendingKey, JSON.stringify(pending.current)); } catch { /* Retain in memory. */ }
    }
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pending.current) });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) { setConflict(true); setError('The catalog or request changed. Do not create another request if its outcome is uncertain. Contact the store with request reference ' + pending.current.request_id + '.'); return; }
        if ([400, 422, 403].includes(res.status)) { pending.current = null; sessionStorage.removeItem(pendingKey); setUncertain(false); }
        else setUncertain(true);
        throw new Error(data.error || 'Request not confirmed. Retry the same request; do not submit a new one.');
      }
      if (!data.order?.id || data.order.payment_status !== 'unpaid') throw new Error('Unexpected response. Keep this request reference and contact the store.');
      setReceipt(data.order); setUncertain(false); pending.current = null; try { sessionStorage.removeItem(pendingKey); } catch {}
    } catch (err: any) { if (pending.current) setUncertain(true); setError(err.message || 'Outcome unknown. Retry the same request safely.'); }
    finally { setBusy(false); }
  }
  const inputClass = "mt-1 w-full rounded-xl border border-carbon-700 bg-carbon-800 p-3 text-white";
  return <section id="order" className="py-16 bg-carbon-900 border-t border-carbon-700"><div className="max-w-3xl mx-auto px-4">
    <h2 className="text-3xl font-bold text-white">Request your custom plate</h2>
    <p className="my-3 text-silver-300">BNP · A Lorapok Labs product. This records an unpaid request only. Payment, production and courier dispatch are not enabled.</p>
    {catalogLoading && <div role="status"><MascotGuide compact title="Checking the catalog…"><p>Looking up available formats and delivery options.</p></MascotGuide></div>}
    {!catalogLoading && !enabled && <div role="status"><MascotGuide compact title="The studio is open. Requests are paused."><p>You can keep exploring designs. Order intake is currently unavailable and no payment can be made.</p></MascotGuide></div>}
    {error && <p role="alert" className="my-4 text-amber-200">{error}</p>}
    {receipt ? <div role="status" className="p-6 border border-emerald-500 rounded-xl text-white"><MascotGuide compact title="Unpaid request recorded"><p>Keep the reference below. No payment was collected.</p></MascotGuide><p>Reference: {receipt.order_number}</p><p>Total: {money(receipt.total_minor)} · Payment: unpaid</p><p>No payment was collected. Your address, selected delivery area and total are subject to store verification. This is not a production or delivery confirmation.</p></div> : <form onSubmit={submit} className="space-y-5 mt-6">
      <fieldset disabled={busy || uncertain || conflict || !enabled} className="grid sm:grid-cols-2 gap-4 disabled:opacity-60">
        <label>Full name<input required maxLength={120} value={name} onChange={e => setName(e.target.value)} className={inputClass}/></label>
        <label>Contact phone<input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass}/></label>
        <label>District<input required value={district} onChange={e => setDistrict(e.target.value)} className={inputClass}/></label>
        <label>Delivery option<select required value={shippingCode} onChange={e => setShippingCode(e.target.value)} className={inputClass}><option value="">Choose your declared service area</option>{catalog?.shipping_methods.filter(s => s.active).map(s => <option key={s.code} value={s.code}>{s.label} · {money(s.price_minor)}</option>)}</select></label>
        <label className="sm:col-span-2">Delivery address<textarea required maxLength={1000} value={address} onChange={e => setAddress(e.target.value)} className={inputClass}/></label>
        <label>Model<select value={model} onChange={e => setModel(e.target.value as 'A' | 'B')} className={inputClass}><option value="A">Model A</option><option value="B">Model B</option></select>{product ? <small>{product.title} · {money(product.unit_price_minor)} each</small> : <small>Model unavailable or not configured.</small>}</label>
        <label>Quantity<input required type="number" min={1} max={100} value={quantity} onChange={e => setQuantity(Number(e.target.value))} className={inputClass}/></label>
        <label className="sm:col-span-2">Registration in Bangla<input required maxLength={120} value={plateText} onChange={e => setPlateText(e.target.value)} className={inputClass}/></label>
        <label className="sm:col-span-2"><input type="checkbox" checked={bracket} disabled={!bracketProduct} onChange={e => setBracket(e.target.checked)}/> Add bracket {bracketProduct ? `(${money(bracketProduct.unit_price_minor)} each)` : '(unavailable)'}</label>
      </fieldset>
      <p className="text-white font-bold">{uncertain ? 'Retry will use the original details and request reference.' : total === null ? 'Choose an available model and delivery option.' : `Request total: ${money(total)}`}</p>
      {busy && <div role="status"><MascotGuide compact title="Checking your request…"><p>Please keep this page open. Your request reference is retained for a safe retry.</p></MascotGuide></div>}
      <button disabled={busy || conflict || (!uncertain && (!enabled || total === null || (bracket && !bracketProduct)))} className="rounded-xl bg-bnp px-6 py-3 font-bold text-white disabled:opacity-40">{busy ? 'Checking request…' : uncertain ? 'Retry original unpaid request' : 'Submit unpaid request'}</button>
      <p className="text-xs text-silver-400">Your delivery-area selection and request total are subject to address verification. An unfinished request is retained in this browser tab until confirmed, so retries cannot create a second order.</p>
    </form>}
  </div></section>;
}
