"use client";

import React from "react";
import { Check, Sparkles, MessageCircle, ArrowRight } from "lucide-react";
import { useStorefront } from "@/components/StorefrontContext";

export default function Pricing() {
  const { setModel } = useStorefront();

  const handleSelectModel = (m: "A" | "B") => {
    setModel(m);
    const element = document.getElementById("order");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="pricing" className="py-16 sm:py-24 bg-carbon-950 border-b border-carbon-700/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-bnp bg-bnp/10 px-3 py-1 rounded-full border border-bnp/20">
            Transparent Pricing
          </span>
          <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-white tracking-tight mt-3">
            Retail & Wholesale Pricing
          </h2>
          <p className="mt-3 text-silver-400 text-sm sm:text-base font-sans">
            Direct from manufacturer. No middleman markups. Full advance payment with guaranteed delivery.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {/* Model A Card */}
          <div className="relative bg-carbon-900 rounded-2xl border border-carbon-700/80 p-8 shadow-glass-panel hover:border-carbon-600 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono uppercase px-2.5 py-1 bg-carbon-800 rounded text-silver-300 border border-carbon-700">
                  Model A • Motorcycle
                </span>
                <span className="text-xs text-silver-500 font-mono">285 × 50 mm</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Standard Motorcycle Plate</h3>
              <p className="text-xs text-silver-400 mb-6 font-sans">
                Single-line mirror silver steel plate. Perfect for all standard motorbikes.
              </p>

              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl font-extrabold text-white font-display">৳ 380</span>
                <span className="text-xs text-silver-500 font-sans">BDT / piece</span>
                <span className="ml-auto text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Pre-order: ৳ 300
                </span>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-silver-300 mb-8">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-bnp shrink-0" />
                  <span>0.8 mm Finish No. 8 Stainless Steel</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-bnp shrink-0" />
                  <span>Single-line embossed BRTA lettering</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-bnp shrink-0" />
                  <span>Pre-cut 2 × 12 × 5.5 mm mounting slots</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-silver-500 shrink-0" />
                  <span>Clamp bracket & bolts (+80 BDT optional)</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => handleSelectModel("A")}
              className="w-full inline-flex items-center justify-center gap-2 bg-carbon-800 hover:bg-carbon-700 text-white font-semibold py-3 rounded-xl border border-carbon-600 transition-colors text-sm"
            >
              <span>Select Model A</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Model B Card */}
          <div className="relative bg-carbon-900 rounded-2xl border-2 border-bnp/60 p-8 shadow-bnp-glow/20 transition-all flex flex-col justify-between">
            <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-bnp to-bnp-hover text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              Popular Format
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono uppercase px-2.5 py-1 bg-bnp/20 rounded text-red-200 border border-bnp/40">
                  Model B • Scooter
                </span>
                <span className="text-xs text-silver-500 font-mono">200 × 100 mm</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Scooter 2-Line Plate</h3>
              <p className="text-xs text-silver-400 mb-6 font-sans">
                Dual-line square layout designed specifically for scooters and compact tail mounts.
              </p>

              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl font-extrabold text-white font-display">৳ 450</span>
                <span className="text-xs text-silver-500 font-sans">BDT / piece</span>
                <span className="ml-auto text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Pre-order: ৳ 380
                </span>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-silver-300 mb-8">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-bnp shrink-0" />
                  <span>0.8 mm Finish No. 8 Stainless Steel</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-bnp shrink-0" />
                  <span>2-line embossed layout (District + Series)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-bnp shrink-0" />
                  <span>BRTA standard rear dimensions</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-silver-500 shrink-0" />
                  <span>Clamp bracket & bolts (+80 BDT optional)</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => handleSelectModel("B")}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-bnp to-bnp-hover hover:from-bnp-hover hover:to-bnp text-white font-semibold py-3 rounded-xl shadow-bnp-glow transition-all text-sm"
            >
              <span>Select Model B</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* B2B Dealer Wholesale Matrix Callout */}
        <div className="max-w-4xl mx-auto bg-carbon-850 rounded-2xl border border-carbon-700 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col">
            <span className="text-xs font-mono uppercase text-gold font-bold tracking-wider">
              B2B & Dealer Wholesale (10+ Plates)
            </span>
            <h4 className="text-lg font-bold text-white mt-1">
              Bulk Workshop & Dealer Tiers from ৳ 65 – ৳ 80 / pc
            </h4>
            <p className="text-xs text-silver-400 mt-1 max-w-lg font-sans">
              Supplying bike showrooms, garages, and accessories shops nationwide. Inquire directly on WhatsApp with your workshop name and monthly quantity.
            </p>
          </div>

          <a
            href="https://wa.me/8801914873925?text=Hello%20BNP,%20I%20am%20interested%20in%20B2B%20wholesale%20dealer%20pricing%20for%2010+%20plates."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-3 rounded-xl shadow-md transition-colors text-xs sm:text-sm shrink-0"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Chat Dealer Desk</span>
          </a>
        </div>
      </div>
    </section>
  );
}
