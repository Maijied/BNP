import React from "react";
import { ShieldCheck, Award, ArrowRight, Zap, CheckCircle2 } from "lucide-react";

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
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-carbon-800/90 border border-carbon-600/80 text-silver-300 text-xs font-medium mb-6 shadow-sm">
              <Award className="w-3.5 h-3.5 text-gold" />
              <span>A Joy & Arash Enterprise Venture</span>
              <span className="h-1 w-1 rounded-full bg-silver-500" />
              <span className="text-bnp font-semibold">Finish No. 8</span>
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-carbon-800 hover:bg-carbon-700 text-silver-200 hover:text-white font-medium px-6 py-3.5 rounded-xl border border-carbon-600 transition-colors text-sm sm:text-base"
              >
                <Zap className="w-4 h-4 text-gold" />
                <span>View Retail & B2B Rates</span>
              </a>
            </div>
          </div>

          {/* Right Column: Styled CSS 3D Metallic Plate Visual */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-full max-w-md perspective-1000 group">
              {/* Specular Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-bnp/20 to-silver-400/10 rounded-2xl filter blur-xl transform group-hover:scale-105 transition-transform duration-500" />

              {/* Plate Showcase Card */}
              <div className="relative bg-carbon-850 p-6 rounded-2xl border border-carbon-700/80 shadow-glass-panel">
                <div className="flex items-center justify-between text-xs text-silver-500 mb-4 font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE METALLIC SPECIMEN
                  </span>
                  <span>MODEL A • 285×50 MM</span>
                </div>

                {/* 3D Rendered Plate Canvas Container */}
                <div className="relative aspect-[5.7/1] w-full rounded-md stamped-border bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 p-2 sm:p-2.5 flex items-center justify-between shadow-plate-emboss overflow-hidden">
                  {/* Subtle Metallic Chrome Sheen Sweep */}
                  <div className="absolute inset-0 plate-reflection opacity-60 pointer-events-none" />

                  {/* Left Mounting Slot */}
                  <div className="w-2 h-4 rounded-full bg-carbon-900/80 border border-black/40 shadow-inner shrink-0" />

                  {/* Embossed BRTA Plate Typography */}
                  <div className="flex-1 flex items-center justify-center gap-2 font-bangla font-extrabold text-carbon-950 text-base sm:text-xl lg:text-2xl tracking-wider embossed-text select-none">
                    <span>ঢাকা মেট্রো-ল</span>
                    <span className="text-carbon-800">•</span>
                    <span>১২-৩৪৫৬</span>
                  </div>

                  {/* Right Mounting Slot */}
                  <div className="w-2 h-4 rounded-full bg-carbon-900/80 border border-black/40 shadow-inner shrink-0" />
                </div>

                {/* Spec badges footer */}
                <div className="mt-5 pt-4 border-t border-carbon-700/60 grid grid-cols-3 gap-2 text-center text-[11px] text-silver-400 font-sans">
                  <div className="p-2 rounded bg-carbon-800/60 border border-carbon-700/40">
                    <span className="block text-white font-bold">0.8 mm</span>
                    <span>Gauge Steel</span>
                  </div>
                  <div className="p-2 rounded bg-carbon-800/60 border border-carbon-700/40">
                    <span className="block text-white font-bold">No. 8 Mirror</span>
                    <span>Finish Grade</span>
                  </div>
                  <div className="p-2 rounded bg-carbon-800/60 border border-carbon-700/40">
                    <span className="block text-white font-bold">100% Legal</span>
                    <span>BRTA Standard</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
