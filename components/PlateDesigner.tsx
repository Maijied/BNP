"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  parseAndFormatPlate,
  convertDigitsToBangla,
  transliterateDistrict,
  transliterateClassLetter,
  DISTRICT_MAP,
  CLASS_LETTER_MAP,
} from "@/lib/bengali";
import {
  Sparkles,
  Sliders,
  Copy,
  Check,
  RotateCcw,
  Layers,
  Award,
  ArrowDown,
} from "lucide-react";

const COMMON_METROS = [
  "ঢাকা মেট্রো",
  "চট্টগ্রাম মেট্রো",
  "কুমিল্লা",
  "সিলেট মেট্রো",
  "রাজশাহী মেট্রো",
  "খুলনা মেট্রো",
  "বরিশাল মেট্রো",
  "রংপুর মেট্রো",
  "গাজীপুর মেট্রো",
  "বগুড়া",
  "নোয়াখালী",
];

const COMMON_CLASSES = ["ল", "হ", "গ", "খ", "ঘ", "চ", "জ", "ট", "ড", "ক", "ব"];

export default function PlateDesigner() {
  const [model, setModel] = useState<"A" | "B">("A");
  const [smartInput, setSmartInput] = useState("Dhaka Metro LA 12 3456");

  // Granular plate fields
  const [district, setDistrict] = useState("ঢাকা মেট্রো");
  const [classLetter, setClassLetter] = useState("ল");
  const [part1, setPart1] = useState("১২");
  const [part2, setPart2] = useState("৩৪৫৬");
  const [copied, setCopied] = useState(false);

  // Sync smartInput -> structured fields
  const handleSmartInputChange = (val: string) => {
    setSmartInput(val);
    const parsed = parseAndFormatPlate(val);
    setDistrict(parsed.districtBangla);
    setClassLetter(parsed.classLetterBangla);
    setPart1(parsed.part1Bangla);
    setPart2(parsed.part2Bangla);
  };

  // Sync structured fields -> plate text
  const handlePart1Change = (val: string) => {
    const bangla = convertDigitsToBangla(val.slice(0, 2));
    setPart1(bangla);
  };

  const handlePart2Change = (val: string) => {
    const bangla = convertDigitsToBangla(val.slice(0, 4));
    setPart2(bangla);
  };

  // Final assembled display text
  const displayModelA = `${district}-${classLetter} ${part1}-${part2}`;
  const displayModelB_Line1 = district;
  const displayModelB_Line2 = `${classLetter}-${part1}-${part2}`;

  const copyToClipboard = () => {
    const textToCopy = model === "A" ? displayModelA : `${displayModelB_Line1}\n${displayModelB_Line2}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="designer" className="py-16 sm:py-24 bg-carbon-900 border-b border-carbon-700/60 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-bnp-glow/10 filter blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-carbon-800 border border-carbon-700 text-xs text-silver-300 font-medium mb-3 shadow-sm">
            <Sliders className="w-3.5 h-3.5 text-bnp" />
            <span>Centerpiece Plate Studio</span>
            <span className="h-1 w-1 rounded-full bg-silver-500" />
            <span className="text-gold font-semibold">Finish No. 8 Mirror Steel</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight">
            Design Your Custom Plate
          </h2>
          <p className="mt-3 text-silver-400 text-sm sm:text-base font-sans max-w-2xl mx-auto">
            Type in English or Bangla. Our AI-assisted phonetics instantly maps registration codes to legal BRTA typography with stamped metallic reflections.
          </p>
        </div>

        {/* Model Switcher */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1.5 bg-carbon-850 rounded-2xl border border-carbon-700/80 shadow-glass-panel">
            <button
              type="button"
              onClick={() => setModel("A")}
              className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                model === "A"
                  ? "bg-gradient-to-r from-bnp to-bnp-hover text-white shadow-bnp-glow"
                  : "text-silver-400 hover:text-white"
              }`}
            >
              <span>Model A — Motorcycle (285×50 mm)</span>
              <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded font-mono font-bold">
                ৳ 380
              </span>
            </button>
            <button
              type="button"
              onClick={() => setModel("B")}
              className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                model === "B"
                  ? "bg-gradient-to-r from-bnp to-bnp-hover text-white shadow-bnp-glow"
                  : "text-silver-400 hover:text-white"
              }`}
            >
              <span>Model B — Scooter (200×100 mm)</span>
              <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded font-mono font-bold">
                ৳ 450
              </span>
            </button>
          </div>
        </div>

        {/* Designer Workspace: Split Controls & Live 3D Specimen */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Input Controls */}
          <div className="lg:col-span-5 bg-carbon-850 p-6 sm:p-7 rounded-2xl border border-carbon-700 shadow-glass-panel space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-silver-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gold" />
                  <span>Smart Auto-Transliteration Input</span>
                </label>
                <span className="text-[10px] text-silver-500 font-mono">English or Bangla</span>
              </div>
              <input
                type="text"
                value={smartInput}
                onChange={(e) => handleSmartInputChange(e.target.value)}
                placeholder="e.g. Dhaka Metro LA 12 3456"
                className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-silver-600 focus:outline-none focus:border-bnp transition-colors shadow-inner"
              />
              <p className="mt-1.5 text-[11px] text-silver-500 font-sans">
                Try pasting: <code className="text-silver-400 font-mono">Dhaka Metro LA 12 3456</code> or <code className="text-silver-400 font-mono">Cumilla HA 11 0052</code>
              </p>
            </div>

            <div className="border-t border-carbon-700/60 pt-5 space-y-4">
              <span className="text-[11px] font-mono uppercase text-silver-500 tracking-wider block">
                Structured BRTA Fields
              </span>

              {/* District Select / Input */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-silver-400 mb-1.5">District / Metro</label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-bnp font-bangla font-semibold"
                  >
                    {COMMON_METROS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Class Letter */}
                <div>
                  <label className="block text-xs text-silver-400 mb-1.5">Class / Serial</label>
                  <select
                    value={classLetter}
                    onChange={(e) => setClassLetter(e.target.value)}
                    className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-bnp font-bangla font-bold"
                  >
                    {COMMON_CLASSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Series Part 1 & Part 2 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-silver-400 mb-1.5">Series (Part 1)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={part1}
                    onChange={(e) => handlePart1Change(e.target.value)}
                    placeholder="১২"
                    className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-3 py-2.5 text-sm text-white font-bangla font-bold focus:outline-none focus:border-bnp text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs text-silver-400 mb-1.5">Number (Part 2)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={part2}
                    onChange={(e) => handlePart2Change(e.target.value)}
                    placeholder="৩৪৫৬"
                    className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-3 py-2.5 text-sm text-white font-bangla font-bold focus:outline-none focus:border-bnp text-center"
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={copyToClipboard}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-carbon-800 hover:bg-carbon-700 text-silver-300 hover:text-white px-3 py-2.5 rounded-xl border border-carbon-700 text-xs font-semibold transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy Plate Text"}</span>
              </button>

              <a
                href="#order"
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-bnp hover:bg-bnp-hover text-white px-3 py-2.5 rounded-xl text-xs font-semibold shadow-bnp-glow transition-all"
              >
                <span>Use in Order</span>
                <ArrowDown className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Right: Live Metallic 3D Specimen Preview */}
          <div className="lg:col-span-7 bg-carbon-850 p-6 sm:p-10 rounded-2xl border border-carbon-700 shadow-glass-panel flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-silver-500 font-mono mb-6 pb-4 border-b border-carbon-800">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                STAMPED FINISH NO. 8 SPECIMEN
              </span>
              <span>{model === "A" ? "285 × 50 MM (SINGLE LINE)" : "200 × 100 MM (DUAL LINE)"}</span>
            </div>

            {/* Canvas Container with Realistic Proportions */}
            <div className="py-8 flex items-center justify-center min-h-[220px]">
              <AnimatePresence mode="wait">
                {model === "A" ? (
                  /* Model A (Motorcycle 285x50 mm, 5.7:1) */
                  <motion.div
                    key="model-a"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full max-w-[560px] aspect-[5.7/1] rounded-lg stamped-border bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 p-2 sm:p-3 flex items-center justify-between shadow-plate-emboss overflow-hidden"
                  >
                    {/* Chrome Specular Shimmer */}
                    <div className="absolute inset-0 plate-reflection opacity-60 pointer-events-none" />

                    {/* Left Bolt Slot (2 x 12 x 5.5 mm) */}
                    <div className="w-2.5 h-6 rounded-full bg-carbon-950/90 border border-black/50 shadow-inner shrink-0" />

                    {/* Stamped Bangla Typography */}
                    <motion.div
                      key={displayModelA}
                      initial={{ scale: 0.97, filter: "blur(1px)" }}
                      animate={{ scale: 1, filter: "blur(0px)" }}
                      className="flex-1 text-center font-bangla font-black text-carbon-950 text-base sm:text-2xl lg:text-3xl tracking-wider embossed-text select-none flex items-center justify-center gap-2"
                    >
                      <span>{district}-{classLetter}</span>
                      <span className="text-carbon-850">•</span>
                      <span>{part1}-{part2}</span>
                    </motion.div>

                    {/* Right Bolt Slot */}
                    <div className="w-2.5 h-6 rounded-full bg-carbon-950/90 border border-black/50 shadow-inner shrink-0" />
                  </motion.div>
                ) : (
                  /* Model B (Scooter 200x100 mm, 2:1) */
                  <motion.div
                    key="model-b"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full max-w-[340px] aspect-[2/1] rounded-xl stamped-border bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 p-3 sm:p-4 flex flex-col justify-between shadow-plate-emboss overflow-hidden"
                  >
                    {/* Chrome Specular Shimmer */}
                    <div className="absolute inset-0 plate-reflection opacity-60 pointer-events-none" />

                    {/* Top Mounting Slots */}
                    <div className="flex justify-between items-center w-full px-2">
                      <div className="w-2 h-4 rounded-full bg-carbon-950/90 border border-black/50 shadow-inner" />
                      <div className="w-2 h-4 rounded-full bg-carbon-950/90 border border-black/50 shadow-inner" />
                    </div>

                    {/* Stamped 2-Line Typography */}
                    <motion.div
                      key={displayModelB_Line1 + displayModelB_Line2}
                      initial={{ scale: 0.97, filter: "blur(1px)" }}
                      animate={{ scale: 1, filter: "blur(0px)" }}
                      className="text-center font-bangla font-black text-carbon-950 embossed-text select-none my-auto"
                    >
                      <div className="text-lg sm:text-2xl tracking-wide">
                        {displayModelB_Line1}
                      </div>
                      <div className="text-xl sm:text-3xl tracking-widest mt-1">
                        {displayModelB_Line2}
                      </div>
                    </motion.div>

                    {/* Bottom Edge Space */}
                    <div className="h-1" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Print-Ready Engineering Specifications Footer */}
            <div className="mt-6 pt-5 border-t border-carbon-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-[11px] text-silver-400 font-sans">
              <div className="p-2.5 rounded-xl bg-carbon-800/50 border border-carbon-700/50">
                <span className="block text-white font-bold font-mono">0.8 mm</span>
                <span>Stainless Steel</span>
              </div>
              <div className="p-2.5 rounded-xl bg-carbon-800/50 border border-carbon-700/50">
                <span className="block text-white font-bold font-mono">Finish No. 8</span>
                <span>Mirror Specular</span>
              </div>
              <div className="p-2.5 rounded-xl bg-carbon-800/50 border border-carbon-700/50">
                <span className="block text-white font-bold font-mono">2 × 12 × 5.5 mm</span>
                <span>Laser Cut Slots</span>
              </div>
              <div className="p-2.5 rounded-xl bg-carbon-800/50 border border-carbon-700/50">
                <span className="block text-white font-bold font-mono">300 DPI</span>
                <span>BRTA Compliance</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
