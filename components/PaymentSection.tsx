"use client";

import React, { useState } from "react";
import { ShieldCheck, CreditCard, Smartphone, CheckCircle, HelpCircle } from "lucide-react";

export default function PaymentSection() {
  const [tab, setTab] = useState<"gateway" | "manual">("gateway");

  return (
    <section id="payment" className="py-16 sm:py-24 bg-carbon-950 border-b border-carbon-700/60 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Payment Methods
          </span>
          <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-white tracking-tight mt-3">
            Full Advance Payment Options
          </h2>
          <p className="mt-2 text-silver-400 text-xs sm:text-sm font-sans max-w-xl mx-auto">
            Plates are custom laser-cut strictly per customer registration. Therefore, all orders require full advance payment. Cash on delivery is not supported.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 bg-carbon-850 rounded-xl border border-carbon-700">
            <button
              onClick={() => setTab("gateway")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                tab === "gateway"
                  ? "bg-bnp text-white shadow-bnp-glow"
                  : "text-silver-400 hover:text-white"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Instant Online (bKash / Nagad / Cards)</span>
            </button>
            <button
              onClick={() => setTab("manual")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                tab === "manual"
                  ? "bg-bnp text-white shadow-bnp-glow"
                  : "text-silver-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Manual Send Money Fallback</span>
            </button>
          </div>
        </div>

        {/* Tab 1: LoraHost Gateway */}
        {tab === "gateway" && (
          <div className="bg-carbon-900 rounded-2xl border border-carbon-700 p-6 sm:p-8 shadow-glass-panel">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-carbon-800">
              <div className="w-10 h-10 rounded-xl bg-bnp/20 flex items-center justify-center text-bnp shrink-0 border border-bnp/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">LoraHost Payment Bridge (PayStation Relay)</h3>
                <p className="text-xs text-silver-400">
                  Instant, automated confirmation. Supports bKash, Nagad, Rocket, Upay, Visa, Mastercard & AMEX.
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-silver-300">
              <div className="p-4 rounded-xl bg-carbon-800/60 border border-carbon-700/60 flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block mb-0.5">Automated Instant Verification</strong>
                  <span>Your payment confirms automatically within seconds via our secure gateway webhook. No waiting for manual review.</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-carbon-800/60 border border-carbon-700/60 flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block mb-0.5">Encrypted & Safe</strong>
                  <span>Zero merchant credentials stored in browser. Cryptographically verified with SHA-256 HMAC tokens.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Manual Send Money */}
        {tab === "manual" && (
          <div className="bg-carbon-900 rounded-2xl border border-carbon-700 p-6 sm:p-8 shadow-glass-panel">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-carbon-800">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-400 shrink-0 border border-yellow-500/30">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Manual bKash / Nagad Send Money</h3>
                <p className="text-xs text-silver-400">
                  Send Money to our official personal wallet and provide the Transaction ID.
                </p>
              </div>
            </div>

            <div className="bg-carbon-800 p-4 rounded-xl border border-carbon-700 mb-6 font-mono text-center">
              <span className="text-xs text-silver-400 block mb-1">Official Personal Wallet Number (Send Money):</span>
              <span className="text-xl sm:text-2xl font-bold text-yellow-400 tracking-wider">
                01632333221
              </span>
              <span className="text-[11px] text-silver-500 block mt-1">bKash Personal / Nagad Personal</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-silver-300 mb-2">
                  bKash / Nagad Transaction ID (TrxID) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. BL9A8X7K2M"
                  className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-3 text-sm text-white placeholder-silver-600 focus:outline-none focus:border-bnp font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-silver-300 mb-2">
                  Sender Mobile Number (Last 4 digits or full number) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 017XXXXXXXX"
                  className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-3 text-sm text-white placeholder-silver-600 focus:outline-none focus:border-bnp font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
