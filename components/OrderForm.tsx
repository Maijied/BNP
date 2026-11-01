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
  CheckCircle,
  ArrowRight,
  Loader2,
  Sparkles,
  ShieldCheck,
  Zap,
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
  const [agreedToWhatsApp, setAgreedToWhatsApp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Sole Payment Method: LoraHost Payment Gateway
  const paymentMethod: PaymentMethod = "lorahost_bridge";

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
      setErrorMsg("Please confirm that you will send your vehicle bluebook photo via WhatsApp (01914-873925).");
      return;
    }

    if (!/^01[3-9]\d{8}$/.test(phone.trim())) {
      setErrorMsg("Please enter a valid 11-digit Bangladesh mobile number (e.g. 017XXXXXXXX).");
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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Order submission failed. Please try again.");
      }

      // Seamless redirect to LoraHost Checkout Gateway
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        window.location.href = `/payment/success?orderNumber=${encodeURIComponent(data.orderNumber)}`;
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
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-bnp bg-bnp/10 px-3 py-1 rounded-full border border-bnp/20 mb-3">
            <Lock className="w-3.5 h-3.5 text-bnp" />
            <span>Secure Direct Order Intake</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
            Order Your Custom Plate
          </h2>
          <p className="mt-2 text-silver-400 text-xs sm:text-sm font-sans max-w-xl mx-auto">
            Laser-cut 0.8 mm mirror-silver stainless steel plate stamped with your exact BRTA registration. Powered exclusively by the <strong>LoraHost Payment Gateway</strong>.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-8 p-4 rounded-xl bg-red-950/80 border border-red-500/50 flex items-start gap-3 text-red-200 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-semibold">Order Error:</strong>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-carbon-850 rounded-3xl border border-carbon-700/80 p-6 sm:p-10 shadow-glass-panel">
          {/* Step 1: Customer & Delivery Details */}
          <div className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-silver-300 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-bnp text-white flex items-center justify-center text-xs">1</span>
              Customer & Delivery Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-xs font-semibold text-silver-300 mb-2">
                  Shop Name (Optional for Dealers)
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Arash Motors & Accessories"
                  className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-3 text-sm text-white placeholder-silver-600 focus:outline-none focus:border-bnp transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-silver-300 mb-2">
                  Mobile Phone Number (bKash Account / Contact) *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX (11 digits)"
                  className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-silver-600 focus:outline-none focus:border-bnp transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-silver-300 mb-2">
                  Delivery District (Pathao Nationwide Courier) *
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-bnp transition-colors"
                >
                  {BD_DISTRICTS.map((d) => (
                    <option key={d} value={d} className="bg-carbon-900 text-white">
                      {d} {d === "Dhaka" ? "(৳ 60 Inside Dhaka)" : "(৳ 120 Outside Dhaka)"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-silver-300 mb-2">
                  Detailed Delivery Address (Thana, Road, House No.) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. House 52, Road 4, Purana Paltan Line, Paltan, Dhaka"
                  className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-3 text-sm text-white placeholder-silver-600 focus:outline-none focus:border-bnp transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Plate Configuration */}
          <div className="mb-8 border-t border-carbon-700/80 pt-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-silver-300 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-bnp text-white flex items-center justify-center text-xs">2</span>
              Plate Model & Custom Stamping
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Model Choice Buttons */}
              <div
                onClick={() => setModel("A")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  model === "A"
                    ? "bg-bnp/10 border-bnp text-white shadow-bnp-glow/20"
                    : "bg-carbon-800 border-carbon-700 text-silver-400 hover:border-carbon-600"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-sm text-white">Model A • Motorcycle</span>
                  <span className="text-xs font-mono text-emerald-400">৳ 380</span>
                </div>
                <span className="text-[11px] text-silver-400 block">285 × 50 mm single-line standard format</span>
              </div>

              <div
                onClick={() => setModel("B")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  model === "B"
                    ? "bg-bnp/10 border-bnp text-white shadow-bnp-glow/20"
                    : "bg-carbon-800 border-carbon-700 text-silver-400 hover:border-carbon-600"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-sm text-white">Model B • Scooter</span>
                  <span className="text-xs font-mono text-emerald-400">৳ 450</span>
                </div>
                <span className="text-[11px] text-silver-400 block">200 × 100 mm stacked two-line format</span>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between p-4 bg-carbon-800 rounded-xl border border-carbon-700 mb-4">
              <div>
                <span className="text-xs font-semibold text-white block">Quantity (Pieces)</span>
                <span className="text-[11px] text-silver-400">Dealers: orders above 50 pcs qualify for wholesale discount</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-xl bg-carbon-700 border border-carbon-600 text-white font-bold hover:bg-carbon-600 transition-colors"
                >
                  -
                </button>
                <span className="font-mono text-base font-bold text-white w-8 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-xl bg-carbon-700 border border-carbon-600 text-white font-bold hover:bg-carbon-600 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Plate Number */}
            <div className="mb-4">
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
            <div>
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

          {/* Step 3: Exclusive LoraHost Payment Gateway */}
          <div className="mb-8 border-t border-carbon-700/80 pt-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-silver-300 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-bnp text-white flex items-center justify-center text-xs">3</span>
              Exclusive Payment Gateway
            </h3>

            {/* LoraHost Gateway Highlight Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-carbon-800 via-carbon-850 to-carbon-800 border-2 border-bnp/60 shadow-bnp-glow/10 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-carbon-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-bnp/20 border border-bnp/40 flex items-center justify-center text-bnp shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                      LoraHost Instant Payment Gateway
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                        OFFICIAL
                      </span>
                    </h4>
                    <p className="text-xs text-silver-400">
                      Automated PayStation relay hosted on LoraHost sovereign cloud infrastructure.
                    </p>
                  </div>
                </div>

                <a
                  href="https://lorahost.lorapok.tech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-emerald-400 font-mono hover:underline shrink-0"
                >
                  lorahost.lorapok.tech ↗
                </a>
              </div>

              {/* Supported Payment Channels */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <div className="p-2 rounded-lg bg-carbon-900 border border-carbon-700/80 text-center">
                  <span className="text-xs font-bold text-pink-400 block font-sans">bKash</span>
                  <span className="text-[10px] text-silver-500">Instant Check</span>
                </div>
                <div className="p-2 rounded-lg bg-carbon-900 border border-carbon-700/80 text-center">
                  <span className="text-xs font-bold text-orange-400 block font-sans">Nagad</span>
                  <span className="text-[10px] text-silver-500">Direct Gateway</span>
                </div>
                <div className="p-2 rounded-lg bg-carbon-900 border border-carbon-700/80 text-center">
                  <span className="text-xs font-bold text-purple-400 block font-sans">Rocket / Upay</span>
                  <span className="text-[10px] text-silver-500">MFS Integrated</span>
                </div>
                <div className="p-2 rounded-lg bg-carbon-900 border border-carbon-700/80 text-center">
                  <span className="text-xs font-bold text-blue-400 block font-sans">Visa / MC</span>
                  <span className="text-[10px] text-silver-500">Debit / Credit</span>
                </div>
              </div>

              <div className="text-[11px] text-silver-400 flex items-center gap-1.5 font-sans">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Zero manual review delay. Orders confirm instantaneously and queue directly for laser cutting.</span>
              </div>
            </div>
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-3 bg-gradient-to-r from-bnp to-bnp-hover hover:from-bnp-hover hover:to-bnp text-white font-bold py-4 px-8 rounded-2xl shadow-bnp-glow hover:shadow-xl transition-all duration-200 border border-red-400/40 text-base active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Redirecting to LoraHost Gateway...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                <span>Pay ৳ {grandTotal} BDT via LoraHost Payment Gateway</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
