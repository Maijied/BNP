"use client";

import React, { useEffect, useState } from "react";
import { Check, Sparkles, MessageCircle, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { useStorefront } from "@/components/StorefrontContext";
import { modelPriceMinor, formatBdtMinor } from "@/lib/storefront-catalog.mjs";

export default function Pricing() {
  const { setModel } = useStorefront();
  const [prices, setPrices] = useState<{ A: number | null; B: number | null }>({ A: null, B: null });
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/catalog", { signal: controller.signal, cache: "no-store" })
      .then(response => { if (!response.ok) throw new Error("Catalog unavailable"); return response.json(); })
      .then(catalog => setPrices({ A: modelPriceMinor(catalog, "A"), B: modelPriceMinor(catalog, "B") }))
      .catch(() => { /* Unavailable catalog must not become an advertised fixed price. */ });
    return () => controller.abort();
  }, []);

  const handleSelectModel = (m: "A" | "B") => {
    setModel(m);
    const element = document.getElementById("order");
    if (element) {
      element.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
  };

  return (
    <section id="pricing" className="py-16 sm:py-24 bg-carbon-950 border-b border-carbon-700/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-bnp bg-bnp/10 px-3 py-1 rounded-full border border-bnp/20 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-bnp" />
            <span>Transparent Pricing & Specifications</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
            Models & Catalog Pricing
          </h2>
          <p className="mt-3 text-silver-400 text-sm sm:text-base font-sans">
            Prices appear from the connected product catalog when available. Final totals require server confirmation. Online payment is not enabled.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
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
                Single-line plate concept. Check mounting position, dimensions and material before manufacture.
              </p>

              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl font-extrabold text-white font-display">{formatBdtMinor(prices.A)}</span>
                <span className="text-xs text-silver-500 font-sans">BDT / piece</span>
                <span className="ml-auto text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {prices.A === null ? "Catalog unavailable" : "Catalog price"}
                </span>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-silver-300 mb-8">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-bnp shrink-0" />
                  <span>0.8 mm Finish No. 8 Stainless Steel</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-bnp shrink-0" />
                  <span>285×50 mm preview; verify current requirements</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-bnp shrink-0" />
                  <span>Laser-cut side oval bolt slots</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-bnp shrink-0" />
                  <span>Embossed stamped typography</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-bnp shrink-0" />
                  <span>Bulk pricing requires a separate confirmed quotation</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleSelectModel("A")}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-bnp to-bnp-hover hover:from-bnp-hover hover:to-bnp text-white font-semibold py-3 rounded-xl shadow-bnp-glow transition-all duration-200 border border-red-500/30 text-sm group"
            >
              <span>Select Model A & Customize</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Model B Card */}
          <div className="relative bg-carbon-900 rounded-2xl border border-carbon-700/80 p-8 shadow-glass-panel hover:border-carbon-600 transition-all flex flex-col justify-between">
            <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-gradient-to-r from-gold to-yellow-600 text-carbon-950 text-[11px] font-extrabold uppercase tracking-wider shadow-md">
              Scooter Preview
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono uppercase px-2.5 py-1 bg-carbon-800 rounded text-silver-300 border border-carbon-700">
                  Model B • Scooter
                </span>
                <span className="text-xs text-silver-500 font-mono">200 × 100 mm</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Scooter Stacked Plate</h3>
              <p className="text-xs text-silver-400 mb-6 font-sans">
                Two-line plate concept. Model-specific fitting and manufacturing approval are required.
              </p>

              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl font-extrabold text-white font-display">{formatBdtMinor(prices.B)}</span>
                <span className="text-xs text-silver-500 font-sans">BDT / piece</span>
                <span className="ml-auto text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {prices.B === null ? "Catalog unavailable" : "Catalog price"}
                </span>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-silver-300 mb-8">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-bnp shrink-0" />
                  <span>0.8 mm Finish No. 8 Stainless Steel</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-bnp shrink-0" />
                  <span>200×100 mm preview; verify current requirements</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-bnp shrink-0" />
                  <span>Top-mounted horizontal oval slots</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-bnp shrink-0" />
                  <span>Mounting and durability review required</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-bnp shrink-0" />
                  <span>Bulk pricing requires a separate confirmed quotation</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleSelectModel("B")}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-bnp to-bnp-hover hover:from-bnp-hover hover:to-bnp text-white font-semibold py-3 rounded-xl shadow-bnp-glow transition-all duration-200 border border-red-500/30 text-sm group"
            >
              <span>Select Model B & Customize</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Partnership & Security Trust Ribbon */}
        <div className="max-w-4xl mx-auto rounded-2xl bg-carbon-900/60 border border-carbon-800 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-silver-400">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-white font-semibold block text-sm">Online payment is deferred</span>
              <span>Catalog and order preparation can be reviewed without charging a payment method.</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-4">
            <a
              href="https://lorahost.lorapok.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="text-silver-300 hover:text-emerald-400 font-mono text-[11px] underline"
            >
              lorahost.lorapok.tech ↗
            </a>
            <span className="text-carbon-700">•</span>
            <a
              href="https://lorapok.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="text-silver-300 hover:text-bnp font-mono text-[11px] underline"
            >
              lorapok.tech ↗
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

