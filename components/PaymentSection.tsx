"use client";

import React from "react";
import { ShieldCheck, CreditCard, CheckCircle, ExternalLink, Zap, Lock, Globe } from "lucide-react";

export default function PaymentSection() {
  return (
    <section id="payment" className="py-16 sm:py-24 bg-carbon-950 border-b border-carbon-700/60 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Payment integration deferred</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
            Online payment is not enabled
          </h2>
          <p className="mt-2 text-silver-400 text-xs sm:text-sm font-sans max-w-xl mx-auto">
            You can review plate designs and prepare an order. The payment gateway will be added later. This preview cannot collect funds or confirm a paid order.
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
                  LoraHost Payment Bridge · Planned
                </h3>
                <p className="text-xs text-silver-400 font-sans">
                  A planned Lorapok Labs integration. Infrastructure information: <span className="font-mono text-amber-400">lorahost.lorapok.tech</span>
                </p>
              </div>
            </div>

            <a
              href="https://lorahost.lorapok.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-carbon-800 hover:bg-carbon-750 text-amber-300 font-mono text-xs border border-carbon-700 hover:border-amber-500/40 transition-colors"
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
                <strong className="text-white block mb-0.5">Unpaid order preparation</strong>
                <span className="text-silver-400">Saving a draft does not confirm payment, begin manufacturing or book a paid delivery.</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-carbon-850/70 border border-carbon-800 flex items-start gap-3">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-white block mb-0.5">Payment capture disabled</strong>
                <span className="text-silver-400">No card, wallet or bank payment is collected in this version. Payment details are not requested.</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-carbon-850/70 border border-carbon-800 flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-white block mb-0.5">Payment methods to be confirmed</strong>
                <span className="text-silver-400">Available methods and provider terms will be shown only after the gateway is integrated and verified.</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-carbon-850/70 border border-carbon-800 flex items-start gap-3">
              <Globe className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-white block mb-0.5">Dispatch stays gated</strong>
                <span className="text-silver-400">No paid shipment is created from an unpaid draft. Delivery must wait for a verified payment workflow.</span>
              </div>
            </div>
          </div>

          {/* Sandbox Live Indicator */}
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-silver-300">
              <span className="h-2 w-2 rounded-full bg-amber-400  shrink-0" />
              <span>
                <strong>Payments are disabled.</strong> Do not send funds based on this preview. Real settlement and paid dispatch remain unavailable.
              </span>
            </div>
            <a
              href="#order"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-bnp hover:bg-bnp-hover text-white font-semibold text-xs transition-colors shrink-0"
            >
              <span>Review order details</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

