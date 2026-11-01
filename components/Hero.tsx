import React from "react";
import { ShieldCheck, Award, ArrowRight, Zap, CheckCircle2, Sparkles, ExternalLink, Globe } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 lg:pt-16 lg:pb-24 border-b border-carbon-700/50 bg-carbon-gradient">
      {/* Background Accent Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-bnp-glow/10 filter blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 right-10 w-72 h-72 bg-gold/5 filter blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Copy & Value Proposition */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
            {/* Pill Badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-carbon-800/90 border border-carbon-600/80 text-silver-300 text-xs font-medium shadow-sm">
                <Award className="w-3.5 h-3.5 text-gold" />
                <span>A Joy & Arash Enterprise Venture</span>
                <span className="h-1 w-1 rounded-full bg-silver-500" />
                <span className="text-bnp font-semibold">Finish No. 8</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium shadow-sm">
                <Globe className="w-3 h-3 text-emerald-400" />
                <span>bnp.lorapok.tech</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-white leading-[1.15] mb-5">
              Mirror Silver <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-silver-100 via-silver-400 to-silver-600">
                Steel Bike Plates
              </span>
            </h1>

            <p className="text-base sm:text-lg text-silver-400 max-w-2xl mb-4 font-sans leading-relaxed">
              Tagline: <strong className="text-white font-semibold">Premium Quality | Durable | Stylish</strong>. 
              Engineered with laser-cut <span className="text-silver-200">0.8 mm mirror-finish stainless steel</span> and 
              BRTA-compliant aluminum standards. Built to outlast Bangladesh weather, dust, and daily commutes.
            </p>

            {/* Strategic Partnership Showcase Card */}
            <div className="w-full max-w-xl p-4 mb-6 rounded-2xl bg-carbon-850/90 border border-carbon-700/80 shadow-glass-panel backdrop-blur-md text-left">
              <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-carbon-750">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-bnp" />
                  <span className="text-xs uppercase font-extrabold tracking-wider text-white">
                    Strategic Technology & Payment Partnership
                  </span>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-bnp/20 text-bnp-light border border-bnp/30">
                  OFFICIAL
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Partner 1: Lorapok Labs */}
                <a
                  href="https://lorapok.tech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-carbon-900/80 hover:bg-carbon-900 border border-carbon-700 hover:border-bnp/50 transition-all group block"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                    <span className="group-hover:text-bnp transition-colors">Lorapok Labs</span>
                    <ExternalLink className="w-3 h-3 text-silver-500 group-hover:text-bnp" />
                  </div>
                  <p className="text-[11px] text-silver-400 leading-snug">
                    Biological UI & Sensory Design Systems. Creator of developer platforms & AI orchestration.
                  </p>
                  <span className="text-[10px] text-silver-500 font-mono mt-1.5 block">lorapok.tech ↗</span>
                </a>

                {/* Partner 2: LoraHost */}
                <a
                  href="https://lorahost.lorapok.tech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-carbon-900/80 hover:bg-carbon-900 border border-carbon-700 hover:border-emerald-500/50 transition-all group block"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                    <span className="group-hover:text-emerald-400 transition-colors">LoraHost Gateway</span>
                    <ExternalLink className="w-3 h-3 text-silver-500 group-hover:text-emerald-400" />
                  </div>
                  <p className="text-[11px] text-silver-400 leading-snug">
                    Sovereign Cloud & Payment Bridge. Instant automated bKash, Nagad & Card processing via PayStation.
                  </p>
                  <span className="text-[10px] text-silver-500 font-mono mt-1.5 block">lorahost.lorapok.tech ↗</span>
                </a>
              </div>
            </div>

            {/* Micro Feature Bullets */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg mb-8 text-xs sm:text-sm text-silver-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-bnp shrink-0" />
                <span>0.8 mm Steel Gauge</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-bnp shrink-0" />
                <span>Rust & Weather Proof</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-bnp shrink-0" />
                <span>BRTA Size Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-bnp shrink-0" />
                <span>Pathao Fast Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-bnp shrink-0" />
                <span>Laser Cut Slots</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-bnp shrink-0" />
                <span>WhatsApp Paper Check</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <a
                href="#designer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-bnp to-bnp-hover hover:from-bnp-hover hover:to-bnp text-white font-semibold px-6 py-3.5 rounded-xl shadow-bnp-glow transition-all duration-200 border border-red-500/30 text-sm sm:text-base group"
              >
                <span>Design Your Plate Now</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href="#pricing"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-carbon-800 hover:bg-carbon-700 text-silver-200 font-semibold px-6 py-3.5 rounded-xl border border-carbon-600 transition-all text-sm sm:text-base"
              >
                <span>View Models & Pricing</span>
              </a>
            </div>
          </div>

          {/* Right Column: Visual Plate Mockup Card */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-md bg-carbon-900/90 rounded-3xl border border-carbon-700/80 p-6 sm:p-8 shadow-glass-panel relative backdrop-blur-xl">
              {/* Highlight Tag */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-silver-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-bnp" /> Live Specimen
                </span>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  BRTA 2026 Ready
                </span>
              </div>

              {/* Realistic Preview Plate Preview Box */}
              <div className="w-full aspect-[285/50] max-h-24 rounded-lg bg-gradient-to-b from-silver-100 via-silver-300 to-silver-500 p-[3px] shadow-2xl relative mb-6 overflow-hidden">
                <div className="w-full h-full rounded-[5px] bg-gradient-to-r from-silver-200 via-silver-100 to-silver-300 flex items-center justify-between px-3 border border-silver-400 relative">
                  {/* Left Bolt Slot */}
                  <div className="w-2.5 h-4 rounded-full bg-carbon-900/90 border border-silver-600 shrink-0 shadow-inner" />
                  
                  {/* Plate Text */}
                  <div className="font-bangla font-black text-carbon-950 text-base sm:text-lg tracking-wider text-center drop-shadow-sm select-none">
                    ঢাকা মেট্রো-ল ১২-৩৪৫৬
                  </div>

                  {/* Right Bolt Slot */}
                  <div className="w-2.5 h-4 rounded-full bg-carbon-900/90 border border-silver-600 shrink-0 shadow-inner" />
                </div>
              </div>

              {/* Quick Spec List */}
              <div className="space-y-2.5 border-t border-carbon-800 pt-5 text-xs text-silver-400">
                <div className="flex justify-between">
                  <span>Material:</span>
                  <span className="text-white font-medium">0.8mm Stainless Steel</span>
                </div>
                <div className="flex justify-between">
                  <span>Finish:</span>
                  <span className="text-white font-medium">Finish No. 8 Mirror Silver</span>
                </div>
                <div className="flex justify-between">
                  <span>Standard Model A:</span>
                  <span className="text-white font-mono">285 × 50 mm (Motorcycle)</span>
                </div>
                <div className="flex justify-between">
                  <span>Standard Model B:</span>
                  <span className="text-white font-mono">200 × 100 mm (Scooter)</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Gateway:</span>
                  <span className="text-emerald-400 font-semibold">LoraHost (bKash/Nagad/Cards)</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-carbon-800/80 text-center">
                <p className="text-[11px] text-silver-500 font-sans">
                  Laser precision cutting with exact BRTA slot distances.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
