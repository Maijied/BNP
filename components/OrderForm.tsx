"use client";

import React, { useState } from "react";
import { AlertCircle, FileText, ShoppingBag, Truck, Lock } from "lucide-react";

const BD_DISTRICTS = [
  "Dhaka", "Chattogram", "Cumilla", "Gazipur", "Narayanganj", "Sylhet", "Rajshahi",
  "Khulna", "Barishal", "Rangpur", "Mymensingh", "Bagerhat", "Bandarban", "Barguna",
  "Barishal", "Bhola", "Bogura", "Brahmanbaria", "Chandpur", "Chapai Nawabganj",
  "Chuadanga", "Cox's Bazar", "Dinajpur", "Faridpur", "Feni", "Gaibandha", "Gopalganj",
  "Habiganj", "Jamalpur", "Jashore", "Jhalokati", "Jhenaidah", "Joypurhat", "Khagrachhari",
  "Kishoreganj", "Kurigram", "Kushtia", "Lakshmipur", "Lalmonirhat", "Madaripur",
  "Magura", "Manikganj", "Meherpur", "Moulvibazar", "Munshiganj", "Naogaon", "Narail",
  "Narsingdi", "Natore", "Netrokona", "Nilphamari", "Noakhali", "Pabna", "Panchagarh",
  "Patuakhali", "Pirojpur", "Rajbari", "Rangamati", "Satkhira", "Shariatpur", "Sherpur",
  "Sirajganj", "Sunamganj", "Tangail", "Thakurgaon"
];

export default function OrderForm() {
  const [model, setModel] = useState<"A" | "B">("A");
  const [quantity, setQuantity] = useState(1);
  const [bracket, setBracket] = useState(false);
  const [district, setDistrict] = useState("Dhaka");
  const [regNumber, setRegNumber] = useState("ঢাকা মেট্রো-ল ১২-৩৪৫৬");

  // Dynamic calculations
  const unitPrice = model === "A" ? 380 : 450;
  const plateTotal = unitPrice * quantity;
  const bracketTotal = bracket ? 80 * quantity : 0;
  const deliveryCharge = district === "Dhaka" ? 60 : 120;
  const grandTotal = plateTotal + bracketTotal + deliveryCharge;

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
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-bnp shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                Mandatory Verification Requirement
                <span className="text-[10px] bg-bnp text-white px-2 py-0.5 rounded uppercase font-semibold">
                  Required
                </span>
              </h4>
              <p className="text-xs text-silver-300 mt-1 font-sans leading-relaxed">
                To guarantee 100% legal BRTA compliance, customers <strong>must send a photo of the motorcycle registration certificate / blue book via WhatsApp to 01914-873925</strong> after submitting this order.
                Plates are stamped strictly matching the official registration record.
              </p>
            </div>
          </div>
        </div>

        {/* Order Form Card */}
        <form onSubmit={(e) => e.preventDefault()} className="bg-carbon-850 rounded-2xl border border-carbon-700 p-6 sm:p-8 shadow-glass-panel">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            {/* Customer Name */}
            <div>
              <label className="block text-xs font-semibold text-silver-300 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
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
                  className="w-10 h-10 rounded-xl bg-carbon-800 border border-carbon-700 text-white font-bold hover:bg-carbon-700"
                >
                  -
                </button>
                <span className="font-mono text-base font-bold text-white w-8 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-xl bg-carbon-800 border border-carbon-700 text-white font-bold hover:bg-carbon-700"
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
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                placeholder="e.g. ঢাকা মেট্রো-ল ১২-৩৪৫৬"
                className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-3 text-base text-white font-bangla font-bold placeholder-silver-600 focus:outline-none focus:border-bnp transition-colors"
              />
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

          {/* Pricing Breakdown Card */}
          <div className="bg-carbon-900 rounded-xl p-5 border border-carbon-700/80 mb-8 space-y-2 text-xs sm:text-sm">
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

          {/* Advance Policy & Submit Button */}
          <div className="flex flex-col gap-3">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-bnp to-bnp-hover hover:from-bnp-hover hover:to-bnp text-white font-bold py-4 rounded-xl shadow-bnp-glow transition-all text-base"
            >
              <Lock className="w-4 h-4" />
              <span>Proceed to Payment (৳ {grandTotal} BDT)</span>
            </button>
            <p className="text-center text-[11px] text-silver-500 font-sans">
              🔒 100% Secure Checkout via LoraHost Payment Bridge (bKash, Nagad, Visa, Mastercard)
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
