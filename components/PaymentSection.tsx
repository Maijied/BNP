"use client";

import React from "react";
import { ShieldCheck, CreditCard, CheckCircle, ExternalLink, Zap, Lock, Globe } from "lucide-react";

export default function PaymentSection() {
  return (
    <section id="payment" className="py-16 sm:py-24 bg-carbon-950 border-b border-carbon-700/60 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sovereign Payment Infrastructure</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
            Exclusive LoraHost Payment Gateway
          </h2>
          <p className="mt-2 text-silver-400 text-xs sm:text-sm font-sans max-w-xl mx-auto">
            Plates are custom laser-cut strictly per customer registration. BNP exclusively uses the <strong>LoraHost Payment Bridge</strong> for 100% automated, instant full advance checkout.
          </p>
        </div>

        {/* LoraHost Gateway Feature Card */}
        <div className="bg-carbon-900 rounded-3xl border border-carbon-700/80 p-6 sm:p-10 shadow-glass-panel relative overflow-hidden mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-carbon-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-bnp to-bnp-dark flex items-center justify-center text-white shrink-0 shadow-bnp-glow border border-white/20">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  LoraHost Payment Bridge (PayStation Relay)
                </h3>
                <p className="text-xs text-silver-400 font-sans">
                  Sovereign payment gateway engineered by Lorapok Labs • Deployed at <span className="font-mono text-emerald-400">lorahost.lorapok.tech</span>
                </p>
              </div>
            </div>

            <a
              href="https://lorahost.lorapok.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-carbon-800 hover:bg-carbon-750 text-emerald-300 font-mono text-xs border border-carbon-700 hover:border-emerald-500/40 transition-colors"
            >
              <span>Explore LoraHost</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Grid of Key Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-carbon-850/70 border border-carbon-800 flex items-start gap-3">
              <Zap className="w-4 h-4 text-bnp shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-white block mb-0.5">Automated Instant Order Queue</strong>
                <span className="text-silver-400">Your payment confirms automatically within seconds via our webhook. No manual screenshot reviews or delayed processing.</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-carbon-850/70 border border-carbon-800 flex items-start gap-3">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-white block mb-0.5">Dual HMAC-SHA256 Cryptography</strong>
                <span className="text-silver-400">Zero raw merchant tokens exposed. Canonical query and raw-body HMAC verification safeguard every transaction.</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-carbon-850/70 border border-carbon-800 flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-white block mb-0.5">All Major Bangladesh Channels</strong>
                <span className="text-silver-400">Seamlessly checkout with bKash, Nagad, Rocket, Upay, Visa, Mastercard, and American Express.</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-carbon-850/70 border border-carbon-800 flex items-start gap-3">
              <Globe className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-white block mb-0.5">Real-Time Discord Operations Feed</strong>
                <span className="text-silver-400">Confirmed orders trigger instant alerts in our operations Discord channel for prompt workshop queueing.</span>
              </div>
            </div>
          </div>

          {/* Sandbox Live Indicator */}
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-silver-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span>
                Testing on <strong>bnp.lorapok.tech</strong>? The sandbox environment simulates full PGW checkout cycles for development verification.
              </span>
            </div>
            <a
              href="#order"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-bnp hover:bg-bnp-hover text-white font-semibold text-xs transition-colors shrink-0"
            >
              <span>Test Checkout Now</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
