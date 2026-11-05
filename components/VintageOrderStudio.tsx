"use client";

import { useEffect, useRef, useState } from "react";
import MountedPlatePreview from "@/components/MountedPlatePreview";
import type { FormEvent } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, CheckCircle2, LockKeyhole, Minus, Plus, RotateCcw } from "lucide-react";

const FINISHES = [
  { sku: "cream-enamel", name: "Cream enamel", palette: "Warm ivory. Inky lettering.", description: "A soft, nostalgic palette with a fine dark border.", number: "01", style: "cream", image: "cream-enamel-actual-vespa.png" },
  { sku: "charcoal-brass", name: "Charcoal & brass", palette: "Dark charcoal. Golden accents.", description: "A darker expression, framed by warm brass tones.", number: "02", style: "charcoal", image: "charcoal-brass-actual-vespa.png" },
  { sku: "brushed-aluminium", name: "Brushed aluminium", palette: "Silver tones. Quiet contrast.", description: "A brushed-metal visual direction with crisp lettering.", number: "03", style: "silver", image: "brushed-aluminium-actual-vespa.png" },
  { sku: "oxblood-ivory", name: "Oxblood & ivory", palette: "Deep burgundy. A cream signature.", description: "A rich oxblood palette with an elegant ivory border.", number: "04", style: "oxblood", image: "oxblood-enamel-actual-vespa.png" },
] as const;

type Product = { sku: string; title: string; unit_price_minor: number; currency: string; active: boolean; version: number; kind: string; metadata?: { customization_schema?: string; demo?: boolean; pricing_status?: string; fit_status?: string } };
type Shipping = { code: string; label: string; price_minor: number; active: boolean; version: number };
type Catalog = { products: Product[]; shipping_methods: Shipping[]; capabilities: { order_intake: boolean; payment_capture?: boolean; paid_dispatch?: boolean } };
type Customer = { name: string; phone: string; address: string; district: string };
type RequestPayload = { request_id: string; customer: Customer; items: { sku: string; quantity: number; customization: { schema: string; display_text: string } }[]; shipping_code: string; expected_catalog_versions: Record<string, number>; expected_shipping_version: number };
type Receipt = { id: string; order_number: string; total_minor: number; payment_status: string };
const PENDING_KEY = "vintage-atelier-unpaid-sample-v1";
const SCHEMA = "decorative-display-text/v1";
const validMoney = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const validVersion = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 1;
const money = (value: number | null | undefined) => {
  if (!validMoney(value)) return "Price to be confirmed";
  const minor = BigInt(value);
  return `৳ ${(minor / BigInt(100)).toLocaleString("en-BD")}.${String(minor % BigInt(100)).padStart(2, "0")}`;
};
function validPending(payload: any): payload is RequestPayload {
  const code = (value: unknown) => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value);
  const field = (value: unknown, min: number, max: number) => typeof value === "string" && value.trim().length >= min && value.length <= max && !/[\x00-\x1f\x7f-\x9f]/.test(value);
  return payload && typeof payload === "object" && !Array.isArray(payload) &&
    typeof payload.request_id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.request_id) &&
    payload.customer && field(payload.customer.name, 1, 160) && field(payload.customer.phone, 11, 14) && /^(?:\+?88)?01[3-9][0-9]{8}$/.test(payload.customer.phone) && field(payload.customer.address, 5, 1000) && field(payload.customer.district, 1, 100) &&
    Array.isArray(payload.items) && payload.items.length === 1 && payload.items.every((item: any) => item && code(item.sku) && Number.isSafeInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 100 && item.customization?.schema === SCHEMA && field(item.customization.display_text, 1, 60)) &&
    code(payload.shipping_code) && validVersion(payload.expected_shipping_version) && payload.expected_catalog_versions &&
    validVersion(payload.expected_catalog_versions[payload.items[0].sku]);
}

function Plate({ style, text, small = false }: { style: string; text: string; small?: boolean }) {
  return <div className={`vt-plate vt-plate-${style}${small ? " vt-plate-small" : ""}`}><i className="vt-rivet vt-rivet-one" aria-hidden="true" /><i className="vt-rivet vt-rivet-two" aria-hidden="true" /><span className="vt-plate-star" aria-hidden="true">✦</span><strong key={text}>{text || "YOUR STORY"}</strong><span className="vt-plate-rule" aria-hidden="true" /><small>DECORATIVE CONCEPT</small></div>;
}

export default function VintageOrderStudio() {
  const [selected, setSelected] = useState<string>(FINISHES[0].sku);
  const [displayText, setDisplayText] = useState("YOUR STORY");
  const [quantity, setQuantity] = useState(1);
  const [customer, setCustomer] = useState<Customer>({ name: "", phone: "", address: "", district: "" });
  const [shippingCode, setShippingCode] = useState("");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<"design" | "review" | "complete">("design");
  const [view, setView] = useState<"plate" | "scooter">("scooter");
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [approved, setApproved] = useState(false);
  const [pendingId, setPendingId] = useState("");
  const pendingJSON = useRef<string | null>(null);
  const inFlight = useRef(false);
  const studioRef = useRef<HTMLElement>(null);
  const reviewRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/vespa/catalog", { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.products) || !Array.isArray(data.shipping_methods) || !data.capabilities || !data.products.every((item: unknown) => item !== null && typeof item === "object") || !data.shipping_methods.every((item: unknown) => item !== null && typeof item === "object")) throw new Error("Catalog unavailable");
        if (active) setCatalog(data);
      } catch { if (active) setCatalog(null); }
      finally { window.clearTimeout(timeout); if (active) setLoading(false); }
    })();
    try {
      const saved = sessionStorage.getItem(PENDING_KEY);
      if (saved) {
        const payload: RequestPayload = JSON.parse(saved);
        if (!validPending(payload)) throw new Error("Saved request cannot be safely read");
        pendingJSON.current = saved;
        setPendingId(payload.request_id);
        setSelected(payload.items[0].sku);
        setDisplayText(payload.items[0].customization.display_text);
        setQuantity(payload.items[0].quantity);
        setCustomer(payload.customer);
        setShippingCode(payload.shipping_code);
        setUncertain(true);
        setPhase("review");
        setApproved(true);
        setError("A previous request is not yet confirmed. The exact original details and reference have been restored. Check that same request below; do not create a new one.");
      }
    } catch {
      setStorageBlocked(true);
      setError("This tab cannot safely read its saved request. Sample submission is paused. Keep this tab and any request reference until its status is checked.");
    }
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, []);

  const finish = FINISHES.find(item => item.sku === selected) || FINISHES[0];
  const productMatches = catalog?.products.filter(item => item.sku === selected && item.active && item.currency === "BDT" && item.kind === "decorative_nameplate" && item.metadata?.customization_schema === SCHEMA && validMoney(item.unit_price_minor) && validVersion(item.version)) || [];
  const product = productMatches.length === 1 ? productMatches[0] : undefined;
  const methods = catalog?.shipping_methods.filter(item => item.active && validMoney(item.price_minor) && validVersion(item.version)) || [];
  const shippingMatches = methods.filter(item => item.code === shippingCode);
  const shipping = shippingMatches.length === 1 ? shippingMatches[0] : undefined;
  const isSample = product?.metadata?.demo === true && product?.metadata?.pricing_status === "sample";
  const enabled = catalog?.capabilities.order_intake === true && catalog?.capabilities.payment_capture === false && catalog?.capabilities.paid_dispatch === false && isSample;
  const validQuantity = Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 100;
  const subtotal = product && validQuantity && Number.isSafeInteger(product.unit_price_minor * quantity) ? product.unit_price_minor * quantity : null;
  const total = subtotal !== null && shipping && Number.isSafeInteger(subtotal + shipping.price_minor) ? subtotal + shipping.price_minor : null;
  const validText = displayText.trim().length > 0 && displayText.length <= 60 && !/[\x00-\x1f\x7f-\x9f]/.test(displayText);
  const locked = busy || uncertain || conflict || phase === "complete" || storageBlocked;

  function focusStudio() {
    const paused = studioRef.current?.closest("[data-motion]")?.getAttribute("data-motion") === "paused";
    studioRef.current?.scrollIntoView({ behavior: paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }
  function chooseFinish(sku: string, scroll = false) {
    if (locked) return;
    setSelected(sku); setPhase("design"); setApproved(false); setError("");
    if (scroll) focusStudio();
  }
  function useSampleDetails() {
    setCustomer({ name: "Sample Visitor", phone: "01700000000", address: "Demo address only. Do not ship.", district: "Dhaka" });
    if (methods.length === 1) setShippingCode(methods[0].code);
  }
  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validText || !validQuantity) { setError("Add up to 60 characters, without line breaks, and a quantity from 1 to 100."); return; }
    if (enabled && (!customer.name.trim() || customer.name.length > 120 || !/^01[3-9]\d{8}$/.test(customer.phone.trim()) || !customer.district.trim() || customer.district.length > 100 || customer.address.trim().length < 5 || customer.address.length > 1000 || !shipping || total === null)) {
      setError("Enter sample recipient details and choose a sample delivery option before reviewing."); return;
    }
    setError(""); setApproved(false); setPhase("review");
    window.requestAnimationFrame(() => { reviewRef.current?.focus(); });
  }
  async function submit() {
    if (inFlight.current || busy || conflict || storageBlocked || receipt) return;
    if (!pendingJSON.current) {
      if (!approved || !enabled || !product || !shipping || total === null || !validText || !validQuantity) return;
      if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") { setStorageBlocked(true); setError("Nothing was sent. This browser cannot create a safe request reference. Use a secure, supported browser before submitting a sample."); return; }
      const payload: RequestPayload = {
        request_id: crypto.randomUUID(),
        customer: { name: customer.name.trim(), phone: customer.phone.trim(), address: customer.address.trim(), district: customer.district.trim() },
        items: [{ sku: product.sku, quantity, customization: { schema: SCHEMA, display_text: displayText.trim() } }],
        shipping_code: shipping.code,
        expected_catalog_versions: { [product.sku]: product.version },
        expected_shipping_version: shipping.version,
      };
      const serialized = JSON.stringify(payload);
      try {
        sessionStorage.setItem(PENDING_KEY, serialized);
        if (sessionStorage.getItem(PENDING_KEY) !== serialized) throw new Error("Request storage failed");
      } catch { setStorageBlocked(true); setError("Nothing was sent. This tab cannot retain a request safely. Enable session storage before trying a sample order."); return; }
      pendingJSON.current = serialized;
      setPendingId(payload.request_id);
    }
    inFlight.current = true; setBusy(true); setError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch("/api/vespa/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: pendingJSON.current, signal: controller.signal });
      const data = await response.json();
      if (!response.ok) {
        setUncertain(true);
        if (response.status === 409) {
          setConflict(true);
          setError("The server reported a catalog or request conflict. Your original request is retained. Check its reference with the store before creating another request.");
        } else setError("The sample request was not confirmed. Its details and reference are saved. Retry the exact original request below; no new request will be created.");
        return;
      }
      if (!data.order?.id || typeof data.order.order_number !== "string" || data.order.payment_status !== "unpaid" || data.order.currency !== "BDT" || !validMoney(data.order.total_minor)) throw new Error("Unexpected response");
      setReceipt(data.order); setPhase("complete"); setUncertain(false); setConflict(false);
      pendingJSON.current = null;
      try { sessionStorage.removeItem(PENDING_KEY); } catch { /* A stale saved request replays idempotently, never with a fresh reference. */ }
    } catch {
      setUncertain(true);
      setError("The result could not be confirmed. Your original request is saved in this tab. Retry that same request to check safely, even after a reload.");
    } finally { window.clearTimeout(timeout); inFlight.current = false; setBusy(false); }
  }

  return <>
    <section id="collection" className="vt-collection vt-container" aria-labelledby="collection-title">
      <div className="vt-section-heading" data-reveal><div><p className="vt-eyebrow">01 / THE COLLECTION</p><h2 id="collection-title">Four finishes.<br /><em>Endless character.</em></h2></div><p>A palette for every kind of old soul.<br />Choose a concept to begin your nameplate.<br /><span>Finish names and specimens are visual directions.</span></p></div>
      <div className="vt-product-grid">{FINISHES.map(item => {
        const priceMatches = catalog?.products.filter(p => p.sku === item.sku && p.active && p.currency === "BDT" && p.kind === "decorative_nameplate" && p.metadata?.customization_schema === SCHEMA && validMoney(p.unit_price_minor)) || [];
        const price = priceMatches.length === 1 ? priceMatches[0] : undefined;
        return <button key={item.sku} className={`vt-product vt-product-${item.style}`} type="button" aria-pressed={selected === item.sku} disabled={locked} onClick={() => chooseFinish(item.sku, true)}>
          <div className="vt-product-meta"><span>No. {item.number}</span><span>{selected === item.sku ? <><Check size={11} aria-hidden="true" /> SELECTED</> : "FINISH CONCEPT"}</span></div>
          <div className="vt-product-stage"><Plate style={item.style} text={item.style === "charcoal" ? "OLD SOUL" : item.style === "silver" ? "SLOW DAYS" : item.style === "oxblood" ? "GOOD TIMES" : "YOUR STORY"} small /></div>
          <div className="vt-product-title"><h3>{item.name}</h3><ArrowUpRight size={19} aria-hidden="true" /></div><p>{item.palette}</p><span className="vt-product-price">{price?.metadata?.pricing_status === "sample" ? `${money(price.unit_price_minor)} · sample only` : "Price awaiting confirmation"}</span>
        </button>;
      })}</div>
      <p className="vt-collection-note">Decorative display pieces, not registration replacements. The visuals do not establish materials, dimensions, fit or road-use approval.</p>
    </section>

    <section id="atelier" className="vt-atelier" ref={studioRef} aria-labelledby="atelier-title"><div className="vt-container">
      <div className="vt-atelier-heading"><div><p className="vt-eyebrow">02 / MAKE IT PERSONAL</p><h2 id="atelier-title">Your words.<br /><em>Your little classic.</em></h2></div><div className="vt-atelier-guide"><img src="/images/mascot/rider.png" width="1280" height="1280" alt="Lorapok Labs classic rider mascot holding a decorative display plate" loading="lazy" /><div><span>LORAPOK LABS / YOUR STUDIO GUIDE</span><p>A finish you love.<br />Words that feel like you.</p></div></div></div>
      <ol className="vt-stepper" aria-label="Nameplate request stages"><li><a href="#collection"><span>01</span> Finish <Check size={13} aria-hidden="true" /></a></li><li aria-current={phase === "design" ? "step" : undefined}><button type="button" disabled={locked} onClick={() => { setPhase("design"); setApproved(false); }}><span>02</span> Personalize</button></li><li aria-current={phase === "review" ? "step" : undefined}><span><b>03</b> Review</span></li><li aria-current={phase === "complete" ? "step" : undefined}><span><b>04</b> Sample request</span></li></ol>
      <div className="vt-studio-grid">
        <div className="vt-preview-column">
          <div className="vt-preview-tabs" role="group" aria-label="Preview view"><button type="button" aria-pressed={view === "plate"} onClick={() => setView("plate")}>Your nameplate</button><button type="button" aria-pressed={view === "scooter"} onClick={() => setView("scooter")}>On the owner’s scooter</button></div>
          {view === "plate" ? <div className={`vt-live-preview vt-preview-${finish.style}`}><span className="vt-preview-label">LETTERING PREVIEW / NOT TO SCALE</span><Plate style={finish.style} text={displayText.trim()} /><span className="vt-preview-finish">{finish.name}<small>{finish.description}</small></span></div> : <MountedPlatePreview variant="decorative" text={displayText} finish={finish.style}/>}
          <output className="sr-only" htmlFor="vt-display-text" aria-live="polite" aria-atomic="true">Live lettering preview: {finish.name}, {displayText.trim() || "YOUR STORY"}. Decorative illustration, not a physical proof.</output>
          <div className="vt-preview-caption"><span>YOUR CONCEPT, AT A GLANCE</span><p>Your words and finish update on the original scooter photo. Final typography, materials, measurements and mounting need confirmation.</p></div>
        </div>
        <div className="vt-editor">
          {loading ? <p className="vt-status" role="status">Loading sample options…</p> : !enabled && !receipt && <div className="vt-status" role="status"><LockKeyhole size={17} aria-hidden="true" /><p><strong>Preview your design. Sample requests are unavailable.</strong><span>You can personalize and review your nameplate. Submitting a sample request is not available right now.</span></p></div>}
          {error && <div className="vt-error" role="alert"><p>{error}</p>{pendingId && <span>Request reference: {pendingId}</span>}</div>}
          {phase === "complete" && receipt ? <div className="vt-confirmation" role="status"><CheckCircle2 size={34} aria-hidden="true" /><p className="vt-eyebrow">SAMPLE REQUEST RECORDED</p><h3>Your sample request<br /><em>has been recorded.</em></h3><p>Your unpaid sample request was recorded. No money was collected and no production or delivery was started.</p><dl><div><dt>Reference</dt><dd>{receipt.order_number}</dd></div><div><dt>Recorded sample total</dt><dd>{money(receipt.total_minor)}</dd></div><div><dt>Payment</dt><dd>Unpaid</dd></div></dl><p className="vt-small-note">Keep this reference. This is a sample record, not a purchase confirmation or production approval.</p></div> : phase === "review" ? <div className="vt-review">
            <p className="vt-eyebrow">03 / ONE LAST LOOK</p><h3 ref={reviewRef} tabIndex={-1}>Make sure it feels <em>like you.</em></h3>
            <dl className="vt-review-list"><div><dt>Finish concept</dt><dd>{finish.name}</dd></div><div><dt>Your display text</dt><dd className="vt-review-text">{displayText.trim()}</dd></div><div><dt>Quantity</dt><dd>{quantity}</dd></div><div><dt>Sample recipient</dt><dd>{customer.name || "Not supplied"}<small>{customer.phone}<br />{customer.address}{customer.district ? `, ${customer.district}` : ""}</small></dd></div><div><dt>Sample delivery option</dt><dd>{uncertain ? shippingCode : shipping?.label || "Not configured"}</dd></div></dl>
            {uncertain ? <div className="vt-costs"><div className="vt-total"><span>Original sample request<small>Your original catalog versions are retained. The server will confirm its recorded total; current catalog prices will not replace them on retry.</small></span><strong>Awaiting confirmation</strong></div></div> : <div className="vt-costs"><div><span>Nameplates {product ? `× ${quantity}` : ""}</span><span>{money(subtotal)}</span></div><div><span>Sample delivery</span><span>{money(shipping?.price_minor)}</span></div><div className="vt-total"><span>Sample total<small>Sample pricing only. Final prices are not confirmed.</small></span><strong>{money(total)}</strong></div></div>}
            <div className="vt-review-warning"><LockKeyhole size={15} aria-hidden="true" /><p>Decorative concept only. Fit, road use and production details are unverified. This sample request is unpaid and cannot start production or courier dispatch.</p></div>
            {!uncertain && <label className="vt-consent"><input type="checkbox" checked={approved} disabled={locked} onChange={e => setApproved(e.target.checked)} /><span>I have checked the design and understand this creates an unpaid sample record only.</span></label>}
            <button className="vt-button vt-button-light vt-submit" type="button" disabled={busy || conflict || storageBlocked || (!uncertain && (!enabled || !approved || total === null))} onClick={submit}>{busy ? "Checking your request…" : uncertain ? <><RotateCcw size={16} aria-hidden="true" /> Check the same sample request</> : <>Record unpaid sample request <ArrowUpRight size={17} aria-hidden="true" /></>}</button>
            {!locked && <button className="vt-edit-link" type="button" onClick={() => { setPhase("design"); setApproved(false); }}><ArrowLeft size={14} aria-hidden="true" /> Edit my details</button>}
            <p className="vt-small-note">An unconfirmed request stays in this browser tab with its exact details and reference, so a retry does not create a second order.</p>
          </div> : <form onSubmit={review} className="vt-design-form">
            <fieldset disabled={locked}><legend>Choose your finish</legend><div className="vt-finish-options">{FINISHES.map(item => <button key={item.sku} type="button" aria-pressed={selected === item.sku} className={`vt-finish-choice vt-swatch-${item.style}`} onClick={() => chooseFinish(item.sku)}><span aria-hidden="true">{selected === item.sku && <Check size={13} />}</span>{item.name}</button>)}</div>
              <label className="vt-field">Your display text <span>{displayText.length}/60</span><input id="vt-display-text" value={displayText} maxLength={60} required onChange={e => setDisplayText(e.target.value)} placeholder="A name. A place. A little story." aria-describedby="vt-text-help" /></label><p id="vt-text-help" className="vt-field-help">Use a name or personal phrase, not an official registration. Line wrapping in the preview is illustrative.</p>
              <div className="vt-quantity-row"><label htmlFor="vt-quantity">Quantity</label><div className="vt-quantity-control"><button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity(n => Math.max(1, n - 1))}><Minus size={14} aria-hidden="true" /></button><input id="vt-quantity" type="number" required min="1" max="100" value={quantity} onChange={e => setQuantity(Number(e.target.value))} /><button type="button" aria-label="Increase quantity" disabled={quantity >= 100} onClick={() => setQuantity(n => Math.min(100, n + 1))}><Plus size={14} aria-hidden="true" /></button></div><span>{isSample ? `${money(product?.unit_price_minor)} / sample` : "Price to be confirmed"}</span></div>
            </fieldset>
            <fieldset className="vt-recipient" disabled={locked || !enabled}><legend>Sample recipient <span>DEMO DETAILS ONLY</span></legend><p>Use fictional details to test the unpaid flow.</p><button className="vt-fill-demo" type="button" onClick={useSampleDetails}>Use sample details <ArrowUpRight size={13} aria-hidden="true" /></button><div className="vt-field-grid">
              <label className="vt-field">Name<input required={enabled} maxLength={120} value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} autoComplete="off" placeholder="Sample Visitor" /></label>
              <label className="vt-field">Mobile<input required={enabled} type="tel" maxLength={11} pattern="01[3-9][0-9]{8}" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} autoComplete="off" placeholder="Demo phone number" /></label>
              <label className="vt-field">District<input required={enabled} maxLength={100} value={customer.district} onChange={e => setCustomer({ ...customer, district: e.target.value })} autoComplete="off" placeholder="Demo district" /></label>
              <label className="vt-field">Sample delivery<select required={enabled} value={shippingCode} onChange={e => setShippingCode(e.target.value)}><option value="">{enabled ? "Choose an option" : "Not configured"}</option>{methods.map(item => <option key={item.code} value={item.code}>{item.label} · {money(item.price_minor)}</option>)}</select></label>
              <label className="vt-field vt-field-wide">Sample address<input required={enabled} maxLength={1000} value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} autoComplete="off" placeholder="Demo only. No shipment." /></label>
            </div></fieldset>
            <div className="vt-design-bottom"><p><span>{isSample ? "SAMPLE TOTAL" : "DESIGN PREVIEW"}</span><strong>{isSample ? total === null ? "Select sample delivery" : money(total) : "Yours to explore."}</strong></p><button className="vt-button vt-button-light" disabled={locked || !validText || !validQuantity} type="submit">Review nameplate <ArrowRight size={17} aria-hidden="true" /></button></div>
          </form>}
        </div>
      </div>
    </div></section>
  </>;
}
