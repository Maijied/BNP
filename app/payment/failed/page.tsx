"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  XCircle,
  RotateCcw,
  Smartphone,
  PhoneCall,
  Home,
  MessageCircle,
} from "lucide-react";

function FailedContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order_number");
  const reason = searchParams.get("reason") || "payment_cancelled";

  return (
    <div className="min-h-screen bg-carbon-900 text-silver-200 py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-xl w-full bg-carbon-850 rounded-2xl border border-carbon-700 p-8 shadow-glass-panel text-center relative overflow-hidden">
        <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
          <XCircle className="w-9 h-9" />
        </div>

        <span className="text-xs font-mono uppercase tracking-widest text-red-400 font-bold">
          Payment Unsuccessful
        </span>
        <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white mt-2 mb-2">
          Unable to Complete Transaction
        </h1>
        <p className="text-xs sm:text-sm text-silver-400 max-w-md mx-auto font-sans mb-6">
          The transaction could not be verified ({reason.replace(/_/g, " ")}). Don&apos;t worry — your order details are saved and you can retry or pay manually.
        </p>

        {orderNumber && (
          <div className="mb-6 inline-block bg-carbon-900 border border-carbon-700 px-4 py-2 rounded-xl font-mono text-sm font-bold text-white tracking-wider">
            Order Reference: {orderNumber}
          </div>
        )}

        {/* Manual Payment Option */}
        <div className="bg-carbon-900 rounded-xl p-5 border border-carbon-700 mb-8 text-left">
          <div className="flex items-center gap-2.5 text-xs font-bold text-yellow-400 mb-2">
            <Smartphone className="w-4 h-4" />
            <span>Fallback Option: Manual bKash / Nagad Send Money</span>
          </div>
          <p className="text-xs text-silver-300 font-sans mb-3 leading-relaxed">
            You can directly Send Money to our official personal wallet and send the TrxID via WhatsApp:
          </p>
          <div className="bg-carbon-800 p-3 rounded-lg text-center font-mono">
            <span className="text-sm font-bold text-yellow-400">01632333221</span>
            <span className="text-[11px] text-silver-500 block">bKash Personal / Nagad Personal</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="/#order"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-bnp hover:bg-bnp-hover text-white px-5 py-3 rounded-xl text-xs font-semibold shadow-bnp-glow transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Order Payment</span>
          </a>

          <a
            href="https://wa.me/8801914873925"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl text-xs font-semibold transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp Support</span>
          </a>

          <a
            href="/bnp"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-carbon-800 hover:bg-carbon-700 text-silver-300 hover:text-white px-4 py-3 rounded-xl border border-carbon-700 text-xs font-semibold transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-carbon-900 text-silver-200 flex items-center justify-center">Loading...</div>}>
      <FailedContent />
    </Suspense>
  );
}

