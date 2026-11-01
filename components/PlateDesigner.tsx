"use client";

import React, { useState } from "react";
import { Sparkles, Sliders, Layers } from "lucide-react";

export default function PlateDesigner() {
  const [model, setModel] = useState<"A" | "B">("A");
  const [rawText, setRawText] = useState("ঢাকা মেট্রো-ল ১২-৩৪৫৬");

  return (
    <section id="designer" className="py-16 sm:py-24 bg-carbon-900 border-b border-carbon-700/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-carbon-800 border border-carbon-700 text-xs text-silver-300 font-medium mb-3">
            <Sliders className="w-3.5 h-3.5 text-bnp" />
            <span>Interactive Real-Time Preview</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
            Customize Your Mirror Plate
          </h2>
          <p className="mt-3 text-silver-400 text-sm sm:text-base font-sans">
            Choose between standard motorcycle or scooter formats. English inputs auto-convert to official BRTA Bangla typography.
          </p>
        </div>

        {/* Model Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 bg-carbon-800 rounded-xl border border-carbon-700">
            <button
              onClick={() => setModel("A")}
              className={`px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                model === "A"
                  ? "bg-bnp text-white shadow-bnp-glow"
                  : "text-silver-400 hover:text-white"
              }`}
            >
              Model A (Motorcycle 285×50 mm)
            </button>
            <button
              onClick={() => setModel("B")}
              className={`px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                model === "B"
                  ? "bg-bnp text-white shadow-bnp-glow"
                  : "text-silver-400 hover:text-white"
              }`}
            >
              Model B (Scooter 200×100 mm)
            </button>
          </div>
        </div>

        {/* Live Plate Specimen Canvas */}
        <div className="max-w-2xl mx-auto bg-carbon-850 p-6 sm:p-10 rounded-2xl border border-carbon-700 shadow-glass-panel">
          <div className="relative mx-auto rounded-lg stamped-border bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 shadow-plate-emboss flex items-center justify-between p-3 sm:p-4 transition-all duration-300 overflow-hidden"
            style={{
              aspectRatio: model === "A" ? "285 / 50" : "200 / 100",
              maxWidth: model === "A" ? "560px" : "380px",
            }}
          >
            <div className="absolute inset-0 plate-reflection opacity-70 pointer-events-none" />
            <div className="w-2.5 h-5 rounded-full bg-carbon-900/90 border border-black/40 shadow-inner shrink-0" />
            <div className="flex-1 text-center font-bangla font-black text-carbon-950 text-lg sm:text-2xl tracking-wider embossed-text select-none">
              {rawText}
            </div>
            <div className="w-2.5 h-5 rounded-full bg-carbon-900/90 border border-black/40 shadow-inner shrink-0" />
          </div>

          <div className="mt-8 text-center text-xs text-silver-500 font-mono">
            {model === "A" ? "SINGLE LINE FORMAT • 285 × 50 MM • MOTORCYCLE" : "TWO LINE FORMAT • 200 × 100 MM • SCOOTER"}
          </div>
        </div>
      </div>
    </section>
  );
}
