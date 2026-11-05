import React from "react";
import { ShieldCheck, Award, ArrowRight, Zap, CheckCircle2, Sparkles, ExternalLink, Globe } from "lucide-react";

export default function Hero({ designTarget = "#designer" }: { designTarget?: "#designer" | "#collection" }) {
  return (
    <section className="bnp-cinematic-hero group/hero relative isolate overflow-hidden pt-16 pb-20 lg:pt-28 lg:pb-32 border-b border-carbon-700/50 bg-carbon-gradient">
      {/* Cinematic motion layers are decorative and honor reduced-motion preferences. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{backgroundImage:"linear-gradient(115deg, transparent 15%, rgba(225,29,46,.15) 45%, transparent 70%), repeating-linear-gradient(0deg, transparent 0 58px, rgba(255,255,255,.035) 59px 60px)"}} />
        <div className="absolute -right-24 top-12 h-[36rem] w-[36rem] rounded-full border border-red-500/15 motion-safe:animate-[spin_60s_linear_infinite]" />
        <div className="absolute -right-10 top-28 h-[28rem] w-[28rem] rounded-full border border-white/10 motion-safe:animate-[spin_45s_linear_infinite_reverse]" />
        <div className="absolute -left-24 bottom-10 h-px w-[70%] -rotate-12 bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
      </div>
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
                <span className="text-bnp font-semibold">Classic Carbon</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium shadow-sm">
                <Globe className="w-3 h-3 text-emerald-400" />
                <span>BNP · Plate Studio</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-white leading-[1.15] mb-5">
              Engineered to Stand Out. <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-silver-100 via-silver-400 to-silver-600">
                Precision in Every Detail.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-silver-400 max-w-2xl mb-4 font-sans leading-relaxed">
              <strong className="text-white font-semibold">Personalized design. Distinctive detail.</strong>
              Explore a <span className="text-silver-200">mirror-silver visual treatment</span> and
              front-plate design options. Confirm the final material, fit and current requirements before manufacturing.
            </p>

            {/* Brand storytelling stays customer-first; partner credit belongs in the footer. */}
            <div className="mb-8 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-silver-400">
              <span className="h-px w-10 bg-bnp" />
              THE PERFORMANCE COLLECTION
              <span className="h-px w-10 bg-bnp" />
            </div>

            {/* Micro Feature Bullets */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg mb-8 text-xs sm:text-sm text-silver-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-bnp shrink-0" />
                <span>Material to be confirmed</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-bnp shrink-0" />
                <span>Live lettering preview</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-bnp shrink-0" />
                <span>Illustrative dimensions</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-bnp shrink-0" />
                <span>Delivery quote required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-bnp shrink-0" />
                <span>Mounting review required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-bnp shrink-0" />
                <span>Document upload disabled</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <a
                href={designTarget}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-bnp to-bnp-hover hover:from-bnp-hover hover:to-bnp text-white font-semibold px-6 py-3.5 rounded-xl shadow-bnp-glow transition-all duration-200 border border-red-500/30 text-sm sm:text-base group"
              >
                <span>Design Your Plate Now</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href={designTarget === "#collection" ? "#collection" : "#pricing"}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-carbon-800 hover:bg-carbon-700 text-silver-200 font-semibold px-6 py-3.5 rounded-xl border border-carbon-600 transition-all text-sm sm:text-base"
              >
                <span>View Models & Pricing</span>
              </a>
            </div>
          </div>

          {/* Right Column: Visual Plate Mockup Card */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-md bg-carbon-900/90 rounded-3xl border border-carbon-700/80 p-6 sm:p-8 shadow-glass-panel relative backdrop-blur-xl transition-transform duration-700 motion-safe:hover:-translate-y-2 motion-safe:hover:rotate-[0.5deg]">
              {/* Highlight Tag */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-silver-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-bnp" /> Design preview
                </span>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  Sample plate preview
                </span>
              </div>

              {/* Realistic Preview Plate Preview Box */}
              <div className="group/plate w-full aspect-[285/50] max-h-24 rounded-lg bg-gradient-to-b from-silver-100 via-silver-300 to-silver-500 p-[3px] shadow-2xl relative mb-6 overflow-hidden">
                <div className="w-full h-full rounded-[5px] bg-gradient-to-r from-silver-200 via-silver-100 to-silver-300 flex items-center justify-between px-3 border border-silver-400 relative">
                  <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 skew-x-[-24deg] bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 motion-safe:group-hover/plate:opacity-100 motion-safe:group-hover/plate:translate-x-[650%] transition-all duration-[1400ms]" />
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
                  <span className="text-white font-medium">To be confirmed</span>
                </div>
                <div className="flex justify-between">
                  <span>Finish:</span>
                  <span className="text-white font-medium">Illustrative mirror silver</span>
                </div>
                <div className="flex justify-between">
                  <span>Preview Model A:</span>
                  <span className="text-white font-mono">285 × 50 mm (Motorcycle)</span>
                </div>
                <div className="flex justify-between">
                  <span>Preview Model B:</span>
                  <span className="text-white font-mono">200 × 100 mm (Scooter)</span>
                </div>
                <div className="flex justify-between">
                  <span>Online payment:</span>
                  <span className="text-amber-300 font-semibold">Not available in this preview</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-carbon-800/80 text-center">
                <p className="text-[11px] text-silver-500 font-sans">
                  Preview illustration — verify registration details and current BRTA rules before ordering.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

