import React from "react";
import { ShieldCheck, Sparkles, Phone } from "lucide-react";

interface NavbarProps {
  hotline?: string;
}

export default function Navbar({ hotline = "01632333221" }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-carbon-900/85 border-b border-carbon-700/60 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Venture Tagline */}
        <a href="#" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-bnp to-bnp-dark flex items-center justify-center font-display font-extrabold text-white text-xl tracking-tighter shadow-bnp-glow group-hover:scale-105 transition-transform border border-white/20">
            BNP
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-base sm:text-lg tracking-tight text-white flex items-center gap-1.5">
              Bike Number Plate
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 bg-carbon-700 text-silver-300 rounded border border-carbon-600">
                0.8mm
              </span>
            </span>
            <span className="text-[10px] sm:text-xs text-silver-600 font-medium tracking-wide">
              A Joy & Arash Enterprise Venture
            </span>
          </div>
        </a>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-silver-500">
          <a href="#designer" className="hover:text-silver-100 transition-colors">
            Plate Designer
          </a>
          <a href="#pricing" className="hover:text-silver-100 transition-colors">
            Pricing & Specs
          </a>
          <a href="#order" className="hover:text-silver-100 transition-colors">
            Order Form
          </a>
          <a href="#faq" className="hover:text-silver-100 transition-colors">
            FAQ
          </a>
        </nav>

        {/* Action Button & Hotline */}
        <div className="flex items-center gap-3">
          <a
            href={`tel:${hotline}`}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-silver-400 hover:text-white transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-bnp" />
            <span className="font-mono">{hotline}</span>
          </a>

          <a
            href="#designer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-bnp to-bnp-hover hover:from-bnp-hover hover:to-bnp text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg shadow-bnp-glow hover:shadow-lg transition-all duration-200 border border-red-400/30 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Order Plate</span>
          </a>
        </div>
      </div>
    </header>
  );
}
