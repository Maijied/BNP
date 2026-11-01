import React from "react";
import { AlertTriangle, PhoneCall } from "lucide-react";

interface UrgencyBarProps {
  urgencyText?: string;
  hotline?: string;
}

export default function UrgencyBar({
  urgencyText = "BRTA deadline: November 15 — order your compliant plate today",
  hotline = "01632333221",
}: UrgencyBarProps) {
  return (
    <aside
      aria-label="Urgency announcement"
      className="relative z-50 bg-gradient-to-r from-bnp-dark via-bnp to-bnp-dark text-white px-3 py-2 text-xs sm:text-sm font-medium border-b border-red-500/30 shadow-md"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-4 text-center sm:text-left">
        <div className="flex items-center gap-2 font-bangla tracking-wide">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-300"></span>
          </span>
          <AlertTriangle className="w-4 h-4 text-yellow-300 shrink-0" />
          <span className="font-semibold text-white drop-shadow-sm">
            {urgencyText}
          </span>
        </div>

        <a
          href={`tel:${hotline}`}
          className="inline-flex items-center gap-1.5 bg-black/30 hover:bg-black/50 px-2.5 py-0.5 rounded-full border border-white/20 transition-colors text-white font-sans text-xs shrink-0"
        >
          <PhoneCall className="w-3 h-3 text-yellow-300" />
          <span>Hotline: <strong className="tracking-wider">{hotline}</strong></span>
        </a>
      </div>
    </aside>
  );
}
