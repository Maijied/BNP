import React from "react";
import { AlertTriangle, PhoneCall, Sparkles, ExternalLink } from "lucide-react";

interface UrgencyBarProps {
  urgencyText?: string;
  hotline?: string;
}

export default function UrgencyBar({
  urgencyText = "Check current BRTA requirements before manufacturing or road use",
  hotline = "01632333221",
}: UrgencyBarProps) {
  return (
    <aside
      aria-label="Partnership and Urgency Announcement"
      className="relative z-50 bg-gradient-to-r from-carbon-950 via-bnp-dark to-carbon-950 text-white px-3 py-2 text-xs font-medium border-b border-bnp/40 shadow-lg"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-center md:text-left">
        {/* Strategic Partnership & Sandbox Pill */}
        <div className="flex items-center flex-wrap justify-center md:justify-start gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-[11px] font-mono text-amber-300 font-semibold shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Preview • Payments disabled
          </span>

          <div className="hidden sm:inline-flex items-center gap-1.5 text-silver-300 text-[11px]">
            <span>In Strategic Partnership with</span>
            <a
              href="https://lorapok.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-bold hover:text-bnp underline decoration-silver-600 underline-offset-2 transition-colors flex items-center gap-0.5"
            >
              Lorapok Labs
              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
            </a>
            <span>&</span>
            <a
              href="https://lorahost.lorapok.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-bold hover:text-emerald-400 underline decoration-silver-600 underline-offset-2 transition-colors flex items-center gap-0.5"
            >
              LoraHost
              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
            </a>
          </div>
        </div>

        {/* BRTA Urgency & Hotline */}
        <div className="flex items-center justify-center md:justify-end gap-3 flex-wrap">
          <div className="flex items-center gap-2 font-bangla tracking-wide">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-300"></span>
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
            <span className="font-semibold text-white text-xs drop-shadow-sm">
              {urgencyText}
            </span>
          </div>

          <a
            href={`tel:${hotline}`}
            className="inline-flex items-center gap-1.5 bg-black/40 hover:bg-black/60 px-2.5 py-0.5 rounded-full border border-white/20 transition-colors text-white font-sans text-xs shrink-0"
          >
            <PhoneCall className="w-3 h-3 text-yellow-300" />
            <span>Hotline: <strong className="tracking-wider">{hotline}</strong></span>
          </a>
        </div>
      </div>
    </aside>
  );
}

