"use client";

import React, { useState } from "react";
import { useStorefront } from "@/components/StorefrontContext";
import { PlateModel, PaymentMethod } from "@/lib/types";
import {
  AlertCircle,
  FileText,
  ShoppingBag,
  Truck,
  Lock,
  CreditCard,
  Smartphone,
  CheckCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";

const BD_DISTRICTS = [
  "Dhaka", "Chattogram", "Cumilla", "Gazipur", "Narayanganj", "Sylhet", "Rajshahi",
  "Khulna", "Barishal", "Rangpur", "Mymensingh", "Bagerhat", "Bandarban", "Barguna",
  "Bhola", "Bogura", "Brahmanbaria", "Chandpur", "Chapai Nawabganj", "Chuadanga",
  "Cox's Bazar", "Dinajpur", "Faridpur", "Feni", "Gaibandha", "Gopalganj", "Habiganj",
  "Jamalpur", "Jashore", "Jhalokati", "Jhenaidah", "Joypurhat", "Khagrachhari",
  "Kishoreganj", "Kurigram", "Kushtia", "Lakshmipur", "Lalmonirhat", "Madaripur",
  "Magura", "Manikganj", "Meherpur", "Moulvibazar", "Munshiganj", "Naogaon", "Narail",
  "Narsingdi", "Natore", "Netrokona", "Nilphamari", "Noakhali", "Pabna", "Panchagarh",
  "Patuakhali", "Pirojpur", "Rajbari", "Rangamati", "Satkhira", "Shariatpur", "Sherpur",
  "Sirajganj", "Sunamganj", "Tangail", "Thakurgaon"
];

export default function OrderForm() {
  const {
    model,
    setModel,
    plateText,
    setPlateText,
    quantity,
    setQuantity,
    bracket,
    setBracket,
    district,
    setDistrict,
  } = useStorefront();

  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("lorahost_bridge");
  const [trxId, setTrxId] = useState("");
  const [agreedToWhatsApp, setAgreedToWhatsApp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Dynamic calculations
  const unitPrice = model === "A" ? 380 : 450;
  const plateTotal = unitPrice * quantity;
  const bracketTotal = bracket ? 80 * quantity : 0;
  const deliveryCharge = district === "Dhaka" ? 60 : 120;
  const grandTotal = plateTotal + bracketTotal + deliveryCharge;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!agreedToWhatsApp) {
      setErrorMsg("Please acknowledge the WhatsApp registration verification requirement.");
      return;
    }

    if (!/^01[3-9]\d{8}$/.test(phone.trim())) {
      setErrorMsg("Please enter a valid 11-digit Bangladesh mobile number (e.g. 017XXXXXXXX).");
      return;
    }

    if (paymentMethod !== "lorahost_bridge" && !trxId.trim()) {
      setErrorMsg("Please enter the bKash / Nagad Transaction ID for manual verification.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          shop_name: shopName.trim() || undefined,
          phone: phone.trim(),
          district,
          address: address.trim(),
          model,
          reg_number_bangla: plateText.trim(),
          quantity,
          bracket,
          payment_method: paymentMethod,
          trx_id: paymentMethod !== "lorahost_bridge" ? trxId.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process order. Please try again.");
      }

      if (data.checkout_url) {
        // Redirect to LoraHost Payment Bridge
        window.location.href = data.checkout_url;
      } else {
        // Manual verification success
        window.location.href = `/payment/success?order_number=${data.order_number}&method=${paymentMethod}`;
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred. Please contact our hotline.");
      setLoading(false);
    }
  };

  return (
    <section id="order" className="py-16 sm:py-24 bg-carbon-900 border-b border-carbon-700/60 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-bnp bg-bnp/10 px-3 py-1 rounded-full border border-bnp/20">
            Step-by-Step Checkout
          </span>
          <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-white tracking-tight mt-3">
            Place Your Plate Order
          </h2>
          <p className="mt-2 text-silver-400 text-xs sm:text-sm font-sans">
            Pathao nationwide courier delivery. Full advance payment via LoraHost or manual bKash/Nagad.
          </p>
        </div>

        {/* WhatsApp Registration Notice (Mandatory Requirement) */}
        <div className="bg-gradient-to-r from-red-950/60 via-carbon-850 to-red-950/60 border-2 border-bnp/50 rounded-2xl p-5 mb-8 shadow-glass-panel">
          <div className="flex items-start gap-3.5">
            <AlertCircle className="w-5 h-5 text-bnp shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                Mandatory Verification Requirement
                <span className="text-[10px] bg-bnp text-white px-2 py-0.5 rounded uppercase font-semibold">
                  Required
                </span>
              </h4>
              <p className="text-xs text-silver-300 mt-1 font-sans leading-relaxed">
                To guarantee 100% legal BRTA compliance, customers <strong>must send a clear photo of the motorcycle registration certificate / blue book via WhatsApp to 01914-873925</strong> after submitting this order.
                Plates are stamped strictly matching the official registration record.
              </p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-900/40 border border-red-500 text-red-200 text-xs p-4 rounded-xl mb-6">
            {errorMsg}
          </div>
        )}

        {/* Order Form Card */}
        <form onSubmit={handleSubmit} className="bg-carbon-850 rounded-2xl border border-carbon-700 p-6 sm:p-8 shadow-glass-panel">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            {/* Customer Name */}
            <div>
              <label className="block text-xs font-semibold text-silver-300 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Joy Hasan"
                className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-3 text-sm text-white placeholder-silver-600 focus:outline-none focus:border-bnp transition-colors"
              />
            </div>

            {/* Shop Name */}
            <div>
              <label className="block text-xs font-semibold text-silver-300 mb-2">
                Shop / Garage Name (Optional)
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Joy & Arash Motors"
                className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-3 text-sm text-white placeholder-silver-600 focus:outline-none focus:border-bnp transition-colors"
              />
            </div>

            {/* Mobile Phone */}
            <div>
              <label className="block text-xs font-semibold text-silver-300 mb-2">
                Mobile Number (bKash/WhatsApp) *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                pattern="^01[3-9]\d{8}$"
                className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-3 text-sm text-white placeholder-silver-600 focus:outline-none focus:border-bnp transition-colors font-mono"
              />
            </div>

            {/* District */}
            <div>
              <label className="block text-xs font-semibold text-silver-300 mb-2">
                Delivery District *
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-bnp transition-colors"
              >
                {BD_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d} ({d === "Dhaka" ? "৳ 60 Pathao" : "৳ 120 Nationwide"})
                  </option>
                ))}
              </select>
            </div>

            {/* Full Street Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-silver-300 mb-2">
                Detailed Delivery Address (Thana, Road, House) *
              </label>
              <textarea
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House #, Road #, Area, Thana, District"
                className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-silver-600 focus:outline-none focus:border-bnp transition-colors"
              />
            </div>

            {/* Plate Model & Quantity */}
            <div>
              <label className="block text-xs font-semibold text-silver-300 mb-2">
                Plate Model *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModel("A")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    model === "A"
                      ? "bg-bnp/20 border-bnp text-white"
                      : "bg-carbon-800 border-carbon-700 text-silver-400"
                  }`}
                >
                  Model A (৳ 380)
                </button>
                <button
                  type="button"
                  onClick={() => setModel("B")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    model === "B"
                      ? "bg-bnp/20 border-bnp text-white"
                      : "bg-carbon-800 border-carbon-700 text-silver-400"
                  }`}
                >
                  Model B (৳ 450)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-silver-300 mb-2">
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-xl bg-carbon-800 border border-carbon-700 text-white font-bold hover:bg-carbon-700 transition-colors"
                >
                  -
                </button>
                <span className="font-mono text-base font-bold text-white w-8 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-xl bg-carbon-800 border border-carbon-700 text-white font-bold hover:bg-carbon-700 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Plate Number */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-silver-300 mb-2">
                Registration Number (Exact Match to Bluebook) *
              </label>
              <input
                type="text"
                required
                value={plateText}
                onChange={(e) => setPlateText(e.target.value)}
                placeholder="e.g. ঢাকা মেট্রো-ল ১২-৩৪৫৬"
                className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-3 text-base text-white font-bangla font-bold placeholder-silver-600 focus:outline-none focus:border-bnp transition-colors"
              />
              <span className="text-[11px] text-silver-500 font-sans mt-1 block">
                Synchronized automatically with the Plate Designer above.
              </span>
            </div>

            {/* Clamp Bracket Addon */}
            <div className="sm:col-span-2">
              <label className="flex items-center gap-3 p-3.5 bg-carbon-800 rounded-xl border border-carbon-700 cursor-pointer hover:border-carbon-600 transition-colors">
                <input
                  type="checkbox"
                  checked={bracket}
                  onChange={(e) => setBracket(e.target.checked)}
                  className="w-4 h-4 rounded text-bnp focus:ring-0 bg-carbon-900 border-carbon-600"
                />
                <div className="flex-1 text-xs">
                  <span className="font-semibold text-white">
                    Add Mounting Bracket + Anti-Rust Bolt Set (+৳ 80 / pc)
                  </span>
                  <p className="text-silver-500">
                    Includes precision metal clamp bracket and stainless screws for vibration-free installation.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-8 border-t border-carbon-700/80 pt-6">
            <label className="block text-xs font-semibold text-silver-300 mb-3">
              Select Advance Payment Channel *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <label
                onClick={() => setPaymentMethod("lorahost_bridge")}
                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === "lorahost_bridge"
                    ? "bg-bnp/10 border-bnp text-white"
                    : "bg-carbon-800 border-carbon-700 text-silver-400"
                }`}
              >
                <CreditCard className="w-5 h-5 text-bnp" />
                <div className="text-xs">
                  <span className="font-bold text-white block">Instant Online Payment</span>
                  <span className="text-[11px] text-silver-400">bKash, Nagad, Visa, Mastercard</span>
                </div>
              </label>

              <label
                onClick={() => setPaymentMethod("manual_bkash")}
                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod !== "lorahost_bridge"
                    ? "bg-bnp/10 border-bnp text-white"
                    : "bg-carbon-800 border-carbon-700 text-silver-400"
                }`}
              >
                <Smartphone className="w-5 h-5 text-yellow-400" />
                <div className="text-xs">
                  <span className="font-bold text-white block">Manual Send Money</span>
                  <span className="text-[11px] text-silver-400">Send Money to 01632333221</span>
                </div>
              </label>
            </div>

            {paymentMethod !== "lorahost_bridge" && (
              <div className="p-4 rounded-xl bg-carbon-800 border border-carbon-700 mb-4">
                <p className="text-xs text-silver-300 mb-2">
                  Please Send Money <strong className="text-white">৳ {grandTotal} BDT</strong> to our official personal wallet: <strong className="text-yellow-400 font-mono">01632333221</strong> (bKash/Nagad), then enter your TrxID below:
                </p>
                <input
                  type="text"
                  required
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  placeholder="e.g. BL9A8X7K2M"
                  className="w-full bg-carbon-900 border border-carbon-700 rounded-lg px-3 py-2 text-sm text-white font-mono uppercase focus:outline-none focus:border-bnp"
                />
              </div>
            )}
          </div>

          {/* Pricing Breakdown Card */}
          <div className="bg-carbon-900 rounded-xl p-5 border border-carbon-700/80 mb-6 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between text-silver-400">
              <span>Plate Price (Model {model} × {quantity}):</span>
              <span className="text-white font-mono">৳ {plateTotal}</span>
            </div>
            {bracket && (
              <div className="flex justify-between text-silver-400">
                <span>Mounting Bracket & Bolts (× {quantity}):</span>
                <span className="text-white font-mono">৳ {bracketTotal}</span>
              </div>
            )}
            <div className="flex justify-between text-silver-400">
              <span>Pathao Courier Delivery ({district}):</span>
              <span className="text-white font-mono">৳ {deliveryCharge}</span>
            </div>
            <div className="border-t border-carbon-700 pt-3 flex justify-between text-base font-bold text-white">
              <span>Grand Total (Full Advance):</span>
              <span className="text-bnp font-mono text-xl">৳ {grandTotal} BDT</span>
            </div>
          </div>

          {/* WhatsApp Paper Checkbox Agreement */}
          <div className="mb-6">
            <label className="flex items-start gap-3 p-3.5 bg-carbon-800/80 rounded-xl border border-carbon-700 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={agreedToWhatsApp}
                onChange={(e) => setAgreedToWhatsApp(e.target.checked)}
                className="w-4 h-4 rounded text-bnp focus:ring-0 bg-carbon-900 border-carbon-600 mt-0.5"
              />
              <span className="text-xs text-silver-300 leading-relaxed">
                I confirm that the registration number above is correct, and I agree to send a clear photo of my vehicle registration paper / bluebook via WhatsApp to <strong className="text-white font-mono">01914-873925</strong> after order submission.
              </span>
            </label>
          </div>

          {/* Advance Policy & Submit Button */}
          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-bnp to-bnp-hover hover:from-bnp-hover hover:to-bnp text-white font-bold py-4 rounded-xl shadow-bnp-glow transition-all text-base disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing Order...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>
                    {paymentMethod === "lorahost_bridge" ? "Pay via LoraHost Bridge" : "Submit Order (Manual TrxID)"} (৳ {grandTotal} BDT)
                  </span>
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-silver-500 font-sans">
              🔒 100% Secure Checkout • Full advance only • Zero COD • Joy & Arash Enterprise
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
