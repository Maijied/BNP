"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, Plus, Minus, Pencil, Package, Info } from "lucide-react";
import { useStorefront } from "@/components/StorefrontContext";
import { convertDigitsToBangla, parseAndFormatPlate } from "@/lib/bengali";
import MascotGuide from "@/components/MascotGuide";
import MountedPlatePreview from "@/components/MountedPlatePreview";

export type Language = "bn" | "en";
type Product = { sku: string; title: string; unit_price_minor: number; currency: string; active: boolean; version: number; kind: string; metadata?: { model?: string } };
type Shipping = { code: string; label: string; price_minor: number; active: boolean; version: number };
type Catalog = { products: Product[]; shipping_methods: Shipping[]; capabilities: { order_intake: boolean; payment_capture?: boolean; paid_dispatch?: boolean } };
const pendingKey = "bnp-pending-unpaid-request-v1";
const receiptKey = "bnp-sample-receipt-v1";
type SampleReceipt = { order_number: string; request_id: string; total_minor: number; currency: "BDT"; payment_status: "unpaid" };
function validReceipt(value: any): value is SampleReceipt {
  return value && typeof value.order_number === "string" && value.order_number.length > 0 && value.order_number.length <= 80 &&
    typeof value.request_id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.request_id) &&
    value.currency === "BDT" && value.payment_status === "unpaid" && Number.isSafeInteger(value.total_minor) && value.total_minor >= 0;
}
const validMoney = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
const validVersion = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= 1;
function validPending(payload: any) {
  return payload && typeof payload.request_id === "string" && payload.request_id.length > 0 &&
    payload.customer && ["name", "phone", "address", "district"].every(key => typeof payload.customer[key] === "string") &&
    Array.isArray(payload.items) && payload.items.length > 0 && payload.items.every((item: any) => item && typeof item.sku === "string" && Number.isSafeInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 100 && item.customization && typeof item.customization === "object") &&
    typeof payload.shipping_code === "string" && validVersion(payload.expected_shipping_version) && payload.expected_catalog_versions &&
    payload.items.every((item: any) => validVersion(payload.expected_catalog_versions[item.sku]));
}
export const money = (value: number | null) => { if (value === null || !Number.isSafeInteger(value) || value < 0) return "—"; const n = BigInt(value); return `৳ ${n / BigInt(100)}.${String(n % BigInt(100)).padStart(2, "0")}`; };
const metros = ["ঢাকা মেট্রো", "চট্টগ্রাম মেট্রো", "কুমিল্লা", "সিলেট", "রাজশাহী", "খুলনা", "বরিশাল", "রংপুর", "গাজীপুর", "বগুড়া", "নোয়াখালী"];
const letters = ["ল", "হ", "গ", "খ", "ঘ", "চ", "জ", "ট", "ড", "ক", "ব"];
export function Plate({ model, region = "ঢাকা মেট্রো", letter = "ল", digits = "১২৩৪৫৬", stamp = false, motionDisabled = false }: { model: "A" | "B"; region?: string; letter?: string; digits?: string; stamp?: boolean; motionDisabled?: boolean }) {
  const normalized = convertDigitsToBangla(digits.replace(/[-\s]/g, ""));
  const serial = `${normalized.slice(0, 2)}-${normalized.slice(2)}`;
  const text = model === "A" ? `${region}-${letter} ${serial}` : `${region} ${letter}-${serial}`;
  return <div className={`bn-plate bn-plate-${model}`} lang="bn" role="img" aria-label={`Illustrative ${model === "A" ? "single-line motorcycle front" : "two-line scooter front"} plate preview: ${text}`}><i aria-hidden="true"/><motion.span key={stamp ? text : "sample"} initial={stamp && !motionDisabled ? { scale: .97, filter: "blur(1px)" } : false} animate={{ scale: 1, filter: "blur(0px)" }} transition={{ duration: motionDisabled ? 0 : .2 }}>{model === "A" ? text : <>{region}<br/>{letter}-{serial}</>}</motion.span><i aria-hidden="true"/><div className="bn-plate-shine" aria-hidden="true"/></div>;
}
export default function BNPOrderStudio({ lang, step, setStep, onLockChange, motionDisabled = false }: { lang: Language; step: number; setStep: (n: number) => void; onLockChange: (locked: boolean) => void; motionDisabled?: boolean }) {
  const t = (bn: string, en: string) => lang === "bn" ? bn : en;
  const { model, setModel, setPlateText, quantity, setQuantity, bracket, setBracket, district, setDistrict } = useStorefront();
  const [region, setRegion] = useState("ঢাকা মেট্রো"), [letter, setLetter] = useState("ল"), [digits, setDigits] = useState("১২৩৪৫৬"), [smart, setSmart] = useState("");
  const [catalog, setCatalog] = useState<Catalog | null>(null), [loading, setLoading] = useState(true), [shippingCode, setShippingCode] = useState("");
  const [name, setName] = useState(""), [phone, setPhone] = useState(""), [address, setAddress] = useState("");
  const [checked, setChecked] = useState(false), [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [uncertain, setUncertain] = useState(false), [conflict, setConflict] = useState(false), [receipt, setReceipt] = useState<SampleReceipt | null>(null), [storageBlocked, setStorageBlocked] = useState(false);
  const [receiptRestored, setReceiptRestored] = useState(false), [receiptSaved, setReceiptSaved] = useState(true);
  const [statusBusy, setStatusBusy] = useState(false), [requestStatus, setRequestStatus] = useState<string | null>(null), [statusError, setStatusError] = useState("");
  const statusLock = useRef(false);
  const pending = useRef<any>(null), lock = useRef(false), generation = useRef(0), heading = useRef<HTMLHeadingElement>(null);
  const canonical = model === "A" ? `${region}-${letter} ${digits.slice(0,2)}-${digits.slice(2)}` : `${region} ${letter}-${digits.slice(0,2)}-${digits.slice(2)}`;
  useEffect(() => { setPlateText(canonical); setChecked(false); setReviewed(false); }, [canonical, setPlateText]);
  useEffect(() => { setReviewed(false); }, [quantity, bracket, shippingCode, name, phone, address, district]);
  async function loadCatalog() {
    const current = ++generation.current; setLoading(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const r = await fetch("/api/catalog", { cache: "no-store", signal: controller.signal });
      const data = await r.json();
      if (current !== generation.current) return;
      if (!r.ok || !Array.isArray(data.products) || !Array.isArray(data.shipping_methods) || !data.capabilities || !data.products.every((item: unknown) => item !== null && typeof item === "object") || !data.shipping_methods.every((item: unknown) => item !== null && typeof item === "object")) throw Error();
      setCatalog(data);
    } catch { if (current === generation.current) setCatalog(null); }
    finally { window.clearTimeout(timeout); if (current === generation.current) setLoading(false); }
  }
  useEffect(() => {
    void loadCatalog();
    try {
      const saved = sessionStorage.getItem(pendingKey);
      if (saved) {
        const payload = JSON.parse(saved);
        if (!validPending(payload)) throw Error("Unreadable saved request");
        pending.current = payload; setUncertain(true); setStep(3);
      } else {
        const savedReceipt = sessionStorage.getItem(receiptKey);
        if (savedReceipt) {
          const parsed = JSON.parse(savedReceipt);
          if (!validReceipt(parsed)) throw Error("Unreadable saved receipt");
          setReceipt(parsed); setReceiptRestored(true); setStep(3);
        }
      }
    } catch {
      setStorageBlocked(true);
      setError(t("এই ট্যাবের সংরক্ষিত অনুরোধ নিরাপদে পড়া যাচ্ছে না। নতুন অনুরোধ বন্ধ রাখা হয়েছে। ট্যাব ও রেফারেন্স রাখুন; আগের ফল আগে যাচাই করতে হবে।", "This tab cannot safely read its saved request. Submission is paused. Keep this tab and any reference until the earlier request status is checked."));
    }
    return () => { ++generation.current; };
  }, []);
  const matching = catalog?.products.filter(p => p.active && p.currency === "BDT" && p.kind === "plate" && p.metadata?.model === model && typeof p.sku === "string" && validMoney(p.unit_price_minor) && validVersion(p.version)) || [];
  const product = matching.length === 1 ? matching[0] : undefined;
  const brackets = catalog?.products.filter(p => p.active && p.currency === "BDT" && p.kind === "bracket" && typeof p.sku === "string" && validMoney(p.unit_price_minor) && validVersion(p.version)) || [];
  const accessory = brackets.length === 1 ? brackets[0] : undefined;
  const shippingMethods = catalog?.shipping_methods.filter(s => s.active && typeof s.code === "string" && validMoney(s.price_minor) && validVersion(s.version)) || [];
  const matchingShipping = shippingMethods.filter(s => s.code === shippingCode);
  const shipping = matchingShipping.length === 1 ? matchingShipping[0] : undefined;
  const amounts = [product?.unit_price_minor, shipping?.price_minor, ...(bracket ? [accessory?.unit_price_minor] : [])];
  const validQuantity = Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 100;
  const validAmounts = amounts.every(n => typeof n === "number" && Number.isSafeInteger(n) && n >= 0);
  const raw = product && shipping && validQuantity && validAmounts ? BigInt(product.unit_price_minor) * BigInt(quantity) + (bracket && accessory ? BigInt(accessory.unit_price_minor) * BigInt(quantity) : BigInt(0)) + BigInt(shipping.price_minor) : null;
  const total = raw !== null && raw <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(raw) : null;
  const subtotal = product && validQuantity && Number.isSafeInteger(product.unit_price_minor * quantity) ? product.unit_price_minor * quantity : null;
  const enabled = catalog?.capabilities?.order_intake === true && catalog?.capabilities?.payment_capture === false && catalog?.capabilities?.paid_dispatch === false;
  const locked = busy || uncertain || conflict || storageBlocked || Boolean(receipt);
  useEffect(() => { onLockChange(locked); }, [locked, onLockChange]);
  const productTitle = model === "A" ? t("মোটরসাইকেল ফ্রন্ট প্লেট", "Motorcycle front plate") : t("স্কুটার ফ্রন্ট প্লেট", "Scooter front plate");
  function focusStudio() {
    requestAnimationFrame(() => {
      heading.current?.closest("section")?.scrollIntoView({ behavior: motionDisabled ? "auto" : "smooth", block: "start" });
      heading.current?.focus({ preventScroll: true });
    });
  }
  function jump(next: number) { if (locked) return; setStep(next); setError(""); focusStudio(); }
  function validateDetails() {
    if (!region.trim() || !letter.trim() || !/^[০-৯]{6}$/.test(digits)) return t("এলাকা, শ্রেণির অক্ষর ও ঠিক ৬টি সংখ্যা দিন।", "Enter an area, class letter and exactly six digits.");
    if (!checked) return t("প্রিভিউয়ের নম্বর মিলিয়ে নিশ্চিত করুন।", "Confirm that you checked the registration preview.");
    if (!validQuantity) return t("পরিমাণ ১ থেকে ১০০-এর মধ্যে দিন।", "Enter a quantity between 1 and 100.");
    return "";
  }
  function validateDelivery() {
    if (!name.trim() || !district.trim() || address.trim().length < 5) return t("নাম, জেলা ও সম্পূর্ণ ঠিকানা লিখুন।", "Enter your name, district and complete address.");
    if (!/^01[3-9]\d{8}$/.test(phone.trim())) return t("বাংলাদেশের সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন।", "Enter a valid 11-digit Bangladesh mobile number.");
    if (!enabled || !product || !shipping || total === null || (bracket && !accessory)) return t("উপলভ্য পণ্য ও ডেলিভারি অপশন বাছাই করুন।", "Choose an available product and delivery option.");
    return "";
  }
  function advance() { if (locked) return; const issue = step === 1 ? validateDetails() : step === 2 ? validateDelivery() : ""; if (issue) { setError(issue); focusStudio(); return; } jump(Math.min(3, step + 1)); }
  async function submit() {
    if (lock.current || conflict || receipt || storageBlocked) return;
    focusStudio();
    const retryingOriginal = uncertain || Boolean(pending.current);
    if (!pending.current) {
      const issue = validateDetails() || validateDelivery() || (!reviewed ? t("শেষবার তথ্য মিলিয়ে সম্মতি দিন।", "Confirm the final review before sending.") : "");
      if (issue) { setError(issue); return; }
      if (typeof globalThis.crypto?.randomUUID !== "function") { setError(t("নিরাপদ অনুরোধ রেফারেন্স তৈরি করা যাচ্ছে না। কিছু পাঠানো হয়নি।", "A secure request reference could not be created. Nothing was sent.")); return; }
      const items = [{ sku: product!.sku, quantity, customization: { registration_bangla: canonical } }, ...(bracket && accessory ? [{ sku: accessory.sku, quantity, customization: {} }] : [])];
      pending.current = { request_id: crypto.randomUUID(), customer: { name: name.trim(), phone: phone.trim(), address: address.trim(), district: district.trim() }, items, shipping_code: shipping!.code, expected_catalog_versions: Object.fromEntries(items.map(i => [i.sku, catalog!.products.find(p => p.sku === i.sku)!.version])), expected_shipping_version: shipping!.version };
      try {
        const serialized = JSON.stringify(pending.current);
        sessionStorage.setItem(pendingKey, serialized);
        if (sessionStorage.getItem(pendingKey) !== serialized) throw Error("Request storage failed");
      } catch { pending.current = null; setStorageBlocked(true); setError(t("ব্রাউজার অনুরোধের রেফারেন্স রাখতে পারছে না। নিরাপদ রিট্রাইয়ের জন্য এই ট্যাবের স্টোরেজ চালু করে পেজটি আবার খুলুন। কিছু পাঠানো হয়নি।", "This browser cannot retain a request reference for safe retry. Enable tab storage and reload this page. Nothing was sent.")); return; }
    }
    lock.current = true; setBusy(true); setError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pending.current), signal: controller.signal }); const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) { setConflict(true); setUncertain(true); throw Error(t("ক্যাটালগ বা অনুরোধে পরিবর্তন আছে। নতুন অনুরোধ না পাঠিয়ে এই রেফারেন্স দিয়ে দোকানের সহায়তা নিন: ", "The catalog or request changed. Do not create another request; contact the store with this reference: ") + pending.current.request_id); }
        if (!retryingOriginal && [400, 422, 403].includes(response.status)) { pending.current = null; setUncertain(false); try { sessionStorage.removeItem(pendingKey); } catch {} }
        throw Error(data.error || t("অনুরোধের ফল নিশ্চিত হয়নি। একই অনুরোধ আবার পরীক্ষা করুন।", "Request not confirmed. Retry the same request safely."));
      }
      if (!data.order?.id || !data.order?.order_number || data.order.payment_status !== "unpaid" || data.order.currency !== "BDT" || !Number.isSafeInteger(data.order.total_minor) || data.order.total_minor < 0) throw Error(t("অপ্রত্যাশিত উত্তর। নতুন অনুরোধ দেবেন না; দোকানের সহায়তা নিন।", "Unexpected response. Do not create another request; contact the store."));
      const confirmed: SampleReceipt = { order_number: data.order.order_number, request_id: pending.current.request_id, total_minor: data.order.total_minor, currency: "BDT", payment_status: "unpaid" };
      setReceipt(confirmed); setReceiptRestored(false); setUncertain(false);
      try {
        const serialized = JSON.stringify(confirmed);
        sessionStorage.setItem(receiptKey, serialized);
        setReceiptSaved(sessionStorage.getItem(receiptKey) === serialized);
      } catch { setReceiptSaved(false); }
      pending.current = null; try { sessionStorage.removeItem(pendingKey); } catch {}
      focusStudio();
    } catch (err: any) { if (pending.current) setUncertain(true); setError(err.name === "AbortError" ? t("সময়সীমার মধ্যে উত্তর পাওয়া যায়নি। আগের অনুরোধ অপরিবর্তিত রাখা হয়েছে; একই রেফারেন্স আবার পরীক্ষা করুন।", "The request timed out. Its original details and reference are retained; retry that same request.") : err.message || t("ফলাফল অনিশ্চিত। একই রেফারেন্স দিয়ে আবার দেখুন।", "Outcome unknown. Retry with the same reference.")); }
    finally { window.clearTimeout(timeout); lock.current = false; setBusy(false); }
  }
  async function refreshStatus() {
    if (!receipt || statusLock.current) return;
    statusLock.current = true; setStatusBusy(true); setStatusError(""); setRequestStatus(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch("/api/order/status", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ order_number: receipt.order_number, request_id: receipt.request_id }), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 404) throw Error(t("এই ট্যাবের সংরক্ষিত তথ্য দিয়ে অনুরোধটি যাচাই করা যায়নি। স্ট্যাটাস দেখার মেয়াদ শেষও হয়ে থাকতে পারে। নতুন অনুরোধ পাঠাবেন না।", "This saved receipt could not be verified. Its status access may have expired. Do not submit a new request."));
        if (response.status === 429) throw Error(t("অল্প সময়ে বেশি বার পরীক্ষা হয়েছে। পরে আবার চেষ্টা করুন।", "Too many status checks. Please try again later."));
        throw Error(t("এখন অনুরোধের অবস্থা দেখা যাচ্ছে না। রেফারেন্সটি রাখুন; নতুন অনুরোধ পাঠাবেন না।", "Request status is unavailable right now. Keep your reference; do not submit another request."));
      }
      if (data.receipt?.order_number !== receipt.order_number || !["new", "verification", "cancelled"].includes(data.receipt?.status) || data.receipt?.payment_status !== "unpaid" || data.receipt?.currency !== "BDT" || data.receipt?.total_minor !== receipt.total_minor || data.capabilities?.payment_capture !== false || data.capabilities?.paid_dispatch !== false) throw Error(t("উত্তরের তথ্য মেলেনি। কোনো নতুন স্ট্যাটাস দেখানো হচ্ছে না। রেফারেন্সটি রাখুন।", "The response could not be verified. No new status is shown. Keep your reference."));
      setRequestStatus(data.receipt.status);
    } catch (err: any) { setStatusError(err.name === "AbortError" ? t("স্ট্যাটাসের উত্তর সময়মতো আসেনি। রেফারেন্সটি রাখা আছে; পরে আবার পরীক্ষা করুন।", "The status check timed out. Your reference is retained; try again later.") : err.message || t("অনুরোধের অবস্থা এখন দেখা যাচ্ছে না।", "Request status is unavailable right now.")); }
    finally { window.clearTimeout(timeout); statusLock.current = false; setStatusBusy(false); }
  }
  function smartChange(value: string) { setSmart(value); const p = parseAndFormatPlate(value); setRegion(p.districtBangla); setLetter(p.classLetterBangla); setDigits(p.part1Bangla + p.part2Bangla); }
  const actionText = busy ? t("পরীক্ষা হচ্ছে…", "Checking…") : uncertain ? t("আগের অনুরোধ আবার পরীক্ষা", "Retry original request") : step === 0 ? t("তথ্য দিন", "Add details") : step === 1 ? t("মোট দেখুন", "See total") : step === 2 ? t("অর্ডার পর্যালোচনা", "Review request") : t("নমুনা অনুরোধ পাঠান", "Send sample request");
  return <section id="designer" className="bn-studio bn-section" aria-labelledby="studio-title"><div className="bn-wrap">
    <div className="bn-section-top"><div><p className="bn-eyebrow">02 / CUSTOMIZE</p><h2 id="studio-title">{t("আপনার তথ্য। আপনার প্লেট।", "YOUR DETAILS. YOUR PLATE.")}</h2></div><span className="bn-preview-label">{t("স্থানীয় প্রিভিউ · শুধু নমুনা তথ্য দিন", "LOCAL PREVIEW · USE SAMPLE DETAILS ONLY")}</span></div>
    <nav className="bn-stepper" aria-label={t("অর্ডারের ধাপ", "Order stages")}>{[t("প্লেট", "Plate"),t("তথ্য", "Details"),t("মোট", "Total"),t("অর্ডার", "Order")].map((label, i) => <button key={i} type="button" disabled={locked || i > step} onClick={() => jump(i)} aria-current={i === step ? "step" : undefined}><span>{i < step || receipt ? <Check size={15}/> : i + 1}</span><b>{label}</b></button>)}</nav>
    {error && <p role="alert" className="bn-alert">{error}</p>}
    {receipt ? <div className="bn-receipt">
      <MascotGuide title={receiptRestored ? t("সংরক্ষিত নমুনা অনুরোধ", "Your saved sample receipt") : t("নমুনা অনুরোধ সংরক্ষিত", "Sample request recorded")}><p>{t("কোনো টাকা নেওয়া হয়নি। এটি কেনাকাটা, প্লেট তৈরি বা ডেলিভারির নিশ্চিতকরণ নয়।", "No payment was collected. This does not confirm a purchase, production or delivery.")}</p></MascotGuide>
      <h3 ref={heading} tabIndex={-1}>{t("আপনার রেফারেন্স", "Your reference")}: {receipt.order_number}</h3>
      <dl className="bn-receipt-facts"><div><dt>{t("সংরক্ষিত নমুনা মোট", "Recorded sample total")}</dt><dd>{money(receipt.total_minor)}</dd></div><div><dt>{t("পেমেন্ট", "Payment")}</dt><dd>{t("নেওয়া হয়নি", "Not collected")}</dd></div></dl>
      <ol className="bn-receipt-next"><li>{t("রেফারেন্সটি লিখে রাখুন বা এই নিশ্চিতকরণের ছবি রাখুন।", "Keep this reference or a screenshot of this confirmation.")}</li><li>{t("নিচে অনুরোধের অবস্থা পরীক্ষা করুন। এটি ডেলিভারি ট্র্যাকিং নয়।", "Check request status below. This is not delivery tracking.")}</li><li>{t("এখন পেমেন্ট করবেন না। প্লেট তৈরি, কুরিয়ার বুকিং বা ডেলিভারির তারিখ নিশ্চিত হয়নি।", "Do not make a payment now. Production, courier booking and a delivery date are not confirmed.")}</li></ol>
      <div className="bn-receipt-status"><h4>{t("নমুনা অনুরোধের অবস্থা", "Sample request status")}</h4>
        <p role="status" aria-live="polite">{statusBusy ? t("সর্বশেষ অবস্থা দেখা হচ্ছে…", "Checking the latest status…") : requestStatus === "new" ? t("অনুরোধ সংরক্ষিত · যাচাই শুরু হয়নি", "Request recorded · Review has not started") : requestStatus === "verification" ? t("দোকানের যাচাই চলছে", "Store review in progress") : requestStatus === "cancelled" ? t("নমুনা অনুরোধ বাতিল হয়েছে", "Sample request cancelled") : receiptRestored ? t("এটি এই ট্যাবে রাখা তথ্য। সর্বশেষ অবস্থা জানতে নিচের বোতাম ব্যবহার করুন।", "This is a saved receipt, not a fresh status check. Use the button below for the latest status.") : t("অনুরোধ সংরক্ষণের উত্তর পাওয়া গেছে। সর্বশেষ অবস্থা আলাদা করে পরীক্ষা করতে পারেন।", "Recording was confirmed. You can check the latest request status below.")}</p>
        <button type="button" className="bn-button bn-outline" disabled={statusBusy} onClick={() => void refreshStatus()}>{statusBusy ? t("পরীক্ষা হচ্ছে…", "Checking…") : t("অনুরোধের অবস্থা দেখুন", "Refresh request status")}</button>
        {statusError && <p className="bn-alert" role="alert">{statusError}</p>}
        <p className="bn-fine">{t("শুধু এই ট্যাবের সংরক্ষিত তথ্য দিয়ে ৩০ দিন পর্যন্ত অবস্থা দেখা যাবে, সেবাটি উপলভ্য থাকলে। ট্যাব বন্ধ হলে আবার দেখার সুযোগ হারাতে পারেন।", "Status checks use this tab’s saved receipt for up to 30 days, while the service is available. Closing the tab may lose access.")}</p>
        {!receiptSaved && <p className="bn-alert" role="alert">{t("এই ব্রাউজার নিশ্চিতকরণটি রাখতে পারেনি। এখনই রেফারেন্সটি সংরক্ষণ করুন; পেজ বন্ধ করলে স্ট্যাটাস দেখার সুযোগ হারাতে পারেন।", "This browser could not save the receipt. Keep your reference now; leaving this page may lose status access.")}</p>}
      </div><a href="#how-it-works" className="bn-text-link">{t("পরবর্তী ধাপ সম্পর্কে জানুন", "Read about next steps")}<ArrowRight size={18}/></a>
    </div> : <form noValidate onSubmit={e => { e.preventDefault(); step < 3 && !uncertain ? advance() : void submit(); }}>
      <div className="bn-studio-grid">
        <aside className="bn-preview-panel">{uncertain ? <div className="bn-pending"><strong>{t("আগের অনুরোধ অপরিবর্তিত", "Original request is locked")}</strong><p>{pending.current?.items?.map((i: any) => `${i.sku} × ${i.quantity} · ${i.customization?.registration_bangla || ""}`).join(" / ")}</p></div> : <><MountedPlatePreview model={model} region={region} letter={letter} digits={digits} lang={lang}/><p className="bn-preview-caption">{productTitle}<span>{t("সামনের প্লেট", "FRONT ONLY")}</span></p></>}<p className="bn-fine">{t("মাপ, উপকরণ, ফিট ও বর্তমান নিয়ম উৎপাদনের আগে নিশ্চিত করতে হবে। এই প্রিভিউ অনুমোদনের প্রমাণ নয়।", "Dimensions, material, fit and current rules require verification before manufacture. This preview is not a compliance approval.")}</p><div className="bn-mini-guide"><img src="/images/mascot/concierge.png" width="64" height="64" alt=""/><p>{t("প্রতিটি অক্ষর মিলিয়ে দেখুন। আপনার তথ্য আপনার নিয়ন্ত্রণে।", "Check every character. You stay in control of your details.")}</p></div></aside>
        <div className="bn-stage-form"><h3 ref={heading} tabIndex={-1}>{[t("আপনার প্লেট বাছাই করুন", "Choose your plate"), t("আপনার প্লেটের তথ্য", "Your plate details"), t("ডেলিভারি ও মোট", "Delivery and total"), t("শেষবার দেখে নিন", "One last review")][step]}</h3><div className="bn-stage-guidance"><img src="/images/mascot/concierge.png" width="42" height="42" alt=""/><p className="bn-stage-helper">{[t("ফরম্যাট বদলালেও আগে লেখা তথ্য থাকবে।", "Changing the format keeps the details you have entered."),t("রেজিস্ট্রেশন নম্বর মিলিয়ে লিখুন। প্রিভিউ সঙ্গে সঙ্গে বদলাবে।", "Enter your registration exactly as recorded. The preview updates as you type."),t("নাম, ফোন ও ঠিকানা দিন। তারপর ডেলিভারিসহ মোট দেখুন।", "Add your name, phone and address, then check the delivery option and total."),t("সব তথ্য দেখে তারপর পেমেন্ট ছাড়া নমুনা অনুরোধ পাঠান।", "Check every detail before sending the unpaid sample request.")][step]}</p></div>
          {uncertain && <div className="bn-pending"><p>{t("আগের অনুরোধের ফল অনিশ্চিত। নিচের বোতাম একই তথ্য ও রেফারেন্স আবার ব্যবহার করবে।", "A previous outcome is unconfirmed. Retry uses exactly the original details and reference.")}</p><code>{pending.current?.request_id}</code><p>{pending.current?.customer?.name} · {pending.current?.customer?.phone}</p><p>{pending.current?.customer?.address}</p><p>{pending.current?.items?.map((i: any) => `${i.sku} × ${i.quantity} · ${i.customization?.registration_bangla || ""}`).join(" / ")}</p></div>}
          <fieldset disabled={locked} className="bn-fields">
            {step === 0 && <><p className="bn-muted">{t("দুটিই ফ্রন্ট প্লেট। আপনার রাইডের ফরম্যাট বেছে নিন।", "Both are front plates. Choose the format for your ride.")}</p>{(["A", "B"] as const).map(m => <label className={`bn-option ${model === m ? "selected" : ""}`} key={m}><input type="radio" name="bnp-format" value={m} checked={model === m} onChange={() => setModel(m)}/><span>{m === "A" ? t("মোটরসাইকেল ফ্রন্ট", "Motorcycle front") : t("স্কুটার ফ্রন্ট", "Scooter front")}<small>{m === "A" ? "285 × 50 mm" : "200 × 100 mm"}</small></span></label>)}</>}
            {step === 1 && <><label>{t("স্মার্ট পেস্ট · ইংরেজি বা বাংলা", "Smart paste · English or Bangla")}<input value={smart} onChange={e => smartChange(e.target.value)} placeholder="Dhaka Metro LA 12 3456" autoComplete="off"/></label><div className="bn-field-pair"><label>{t("এলাকা / মেট্রো", "Area / metro")}<select value={region} onChange={e => setRegion(e.target.value)}>{Array.from(new Set([...metros, region])).filter(Boolean).map(s => <option key={s}>{s}</option>)}</select></label><label>{t("শ্রেণির অক্ষর", "Class letter")}<select value={letter} onChange={e => setLetter(e.target.value)}>{Array.from(new Set([...letters, letter])).filter(Boolean).map(s => <option key={s}>{s}</option>)}</select></label></div><label>{t("রেজিস্ট্রেশন নম্বর", "Registration digits")}<input value={digits} onChange={e => setDigits(convertDigitsToBangla(e.target.value.replace(/[-\s]/g, "")).slice(0,6))} inputMode="numeric" maxLength={7} aria-describedby="registration-help"/></label><p id="registration-help" className="bn-fine">{t("৬টি বাংলা বা ইংরেজি সংখ্যা লিখুন। প্রিভিউয়ের প্রতিটি অক্ষর মিলিয়ে নিন।", "Enter six Bengali or English digits. Check each character in the preview.")}</p><div className="bn-input-preview"><div className="bn-input-preview-label"><span>{t("আপনার নম্বরের লাইভ প্রিভিউ", "YOUR LIVE PLATE PREVIEW")}</span><span>MODEL {model}</span></div><MountedPlatePreview model={model} region={region} letter={letter} digits={digits} lang={lang}/><p>{t("নকশার নমুনা; তৈরি পণ্যের প্রমাণ নয়।", "Design illustration, not a manufactured proof.")}</p></div><p className="bn-sr" role="status" aria-live="polite" aria-atomic="true">{t("লাইভ প্রিভিউ", "Live preview")}: {canonical}</p><div className="bn-quantity"><span>{t("পরিমাণ", "Quantity")}</span><div><button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)}><Minus size={16}/></button><input aria-label={t("প্লেটের পরিমাণ", "Plate quantity")} type="number" min={1} max={100} value={quantity} onChange={e => setQuantity(Number(e.target.value))}/><button type="button" aria-label="Increase quantity" disabled={quantity >= 100} onClick={() => setQuantity(quantity + 1)}><Plus size={16}/></button></div></div><label className="bn-check"><input type="checkbox" checked={bracket} disabled={!accessory} onChange={e => setBracket(e.target.checked)}/><span>{t("ব্র্যাকেট যোগ করুন", "Add bracket")} <small>{accessory ? money(accessory.unit_price_minor) + t(" / প্রতিটি · নমুনা", " / each · sample") : t("এখন উপলভ্য নয়", "Unavailable")}</small></span></label><label className="bn-check"><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)}/><span>{t("প্রিভিউয়ের নম্বর মিলিয়ে দেখেছি।", "I have checked the registration preview.")}</span></label><div className="bn-document-note"><Info size={18}/><p>{t("ডকুমেন্ট আপলোড এখন বন্ধ। এই প্রিভিউতে বাস্তব নিবন্ধনপত্র দেবেন না।", "Document upload is disabled. Do not provide real registration documents in this preview.")}</p></div></>}
            {step === 2 && <><label>{t("নমুনা নাম / দোকানের নাম", "Sample recipient name / shop name")}<input maxLength={120} value={name} onChange={e => setName(e.target.value)} autoComplete="off" placeholder={t("শুধু নমুনা তথ্য", "Sample details only")}/></label><div className="bn-field-pair"><label>{t("নমুনা মোবাইল নম্বর", "Sample mobile number")}<input type="tel" maxLength={11} value={phone} onChange={e => setPhone(e.target.value)} autoComplete="off" placeholder="01700000000"/></label><label>{t("জেলা", "District")}<input maxLength={100} value={district} onChange={e => setDistrict(e.target.value)} autoComplete="off"/></label></div><label>{t("নমুনা ডেলিভারি ঠিকানা", "Sample delivery address")}<textarea maxLength={1000} value={address} onChange={e => setAddress(e.target.value)} autoComplete="off"/></label><label>{t("ডেলিভারি এলাকা", "Delivery service area")}<select value={shippingCode} onChange={e => setShippingCode(e.target.value)}><option value="">{t("ডেলিভারি অপশন বেছে নিন", "Choose a delivery option")}</option>{shippingMethods.map(s => <option key={s.code} value={s.code}>{s.label} · {money(s.price_minor)}</option>)}</select></label><p className="bn-fine">{t("ডেলিভারি অপশন ও মোট ঠিকানা যাচাইয়ের ওপর নির্ভরশীল। এখানে দেখানো মূল্য নমুনা; Pathao বুকিং নয়।", "Delivery choice and total are subject to address verification. Prices here are samples, not a Pathao booking.")}</p></>}
            {step === 3 && !uncertain && <><div className="bn-review-item"><span>{productTitle}<small>{canonical}</small><small>{t("পরিমাণ", "Quantity")}: {quantity} {bracket ? t("· ব্র্যাকেটসহ", "· with bracket") : ""}</small></span><button type="button" className="bn-edit" onClick={() => jump(1)}><Pencil size={14}/>{t("বদলান", "Edit")}</button></div><div className="bn-review-item"><span>{name}<small>{phone}</small><small>{address}, {district}</small><small>{shipping?.label}</small></span><button type="button" className="bn-edit" onClick={() => jump(2)}><Pencil size={14}/>{t("বদলান", "Edit")}</button></div><label className="bn-check"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)}/><span>{t("তথ্য ও নমুনা মোট দেখেছি। শুধু নমুনা অনুরোধ তৈরি হবে; কোনো পেমেন্ট বা ডেলিভারি বুকিং নয়।", "I reviewed the details and sample total. This creates only an unpaid request, not a payment or delivery booking.")}</span></label></>}
          </fieldset>
          <div className="bn-stage-actions">{step > 0 && !locked && <button type="button" className="bn-back" onClick={() => jump(step - 1)}><ArrowLeft size={16}/>{t("আগের ধাপ", "Back")}</button>}<button type="submit" className="bn-button" disabled={busy || conflict || storageBlocked || (step === 3 && !uncertain && (!enabled || total === null))}>{actionText}<ArrowRight size={18}/></button></div>
        </div>
        <aside id="pricing" className="bn-summary"><h3>{t("অর্ডার সারসংক্ষেপ", "Order summary")}</h3><dl><div><dt>{t("প্লেট", "Plate")}</dt><dd>{money(uncertain ? null : subtotal)}</dd></div>{bracket && !uncertain && <div><dt>{t("ব্র্যাকেট", "Bracket")}</dt><dd>{accessory && validQuantity && Number.isSafeInteger(accessory.unit_price_minor * quantity) ? money(accessory.unit_price_minor * quantity) : "—"}</dd></div>}<div><dt>{t("ডেলিভারি", "Delivery")}</dt><dd>{money(uncertain ? null : shipping?.price_minor ?? null)}</dd></div><div className="bn-total"><dt>{t("মোট", "Total")}</dt><dd><motion.span key={total} initial={motionDisabled ? false : { opacity: .5, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: motionDisabled ? 0 : .2 }}>{money(uncertain ? null : total)}</motion.span></dd></div></dl><p className="bn-fine">{t("নমুনা ক্যাটালগ মূল্য · পেমেন্ট চালু নয়। ডেলিভারি অপশন বাছলে মোট দেখা যাবে।", "Sample catalog prices · Payment disabled. Select delivery to see the total.")}</p>{loading ? <p role="status" className="bn-catalog-state">{t("ক্যাটালগ দেখা হচ্ছে…", "Checking catalog…")}</p> : !enabled ? <div role="status" className="bn-catalog-state"><p>{t("অনুরোধ গ্রহণ এখন বন্ধ। নকশা দেখতে পারবেন।", "Requests are paused. You can still explore the design.")}</p><button type="button" onClick={() => void loadCatalog()}>{t("আবার দেখুন", "Check again")}</button></div> : <p className="bn-catalog-state"><span/>{t("নমুনা অনুরোধ গ্রহণ চালু", "Sample unpaid intake available")}</p>}<div className="bn-summary-next"><Package size={21}/><p>{t("অনুরোধ সংরক্ষিত হলে রেফারেন্স পাবেন। পেমেন্ট, তৈরি ও কুরিয়ার বুকিং এখন বন্ধ।", "A recorded request gives you a reference. Payment, production and courier booking remain disabled.")}</p></div></aside>
      </div>
      <div className="bn-sticky-total"><div><small>{t("নমুনা মোট", "Sample total")}</small><strong>{money(uncertain ? null : total)}</strong></div><button type="submit" className="bn-button" disabled={busy || conflict || storageBlocked || (step === 3 && !uncertain && (!enabled || total === null))}>{actionText}<ArrowRight size={18}/></button></div>
    </form>}
  </div></section>;
}
