import React from "react";
import { Phone, Mail, MapPin, MessageCircle, ExternalLink, Sparkles, ShieldCheck, Globe } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-carbon-950 text-silver-400 text-xs border-t border-carbon-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Top Co-Branded Strategic Partnership Showcase */}
        <div className="mb-12 p-6 rounded-3xl bg-carbon-900 border border-carbon-800 shadow-glass-panel">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-6 border-b border-carbon-800">
            <div>
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-bnp flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5" /> Official Technology & Infrastructure Partnership
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                BNP × Lorapok Labs × LoraHost
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                bnp.lorapok.tech
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-silver-400">
            {/* Lorapok Labs Profile */}
            <div className="p-4 rounded-2xl bg-carbon-850/80 border border-carbon-750">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-bnp" />
                  Lorapok Labs
                </h4>
                <a
                  href="https://lorapok.tech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-silver-400 hover:text-white font-mono text-[11px] flex items-center gap-1"
                >
                  lorapok.tech <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="leading-relaxed">
                Central collective portal and creator of the <strong>Biological UI / Sensory Computing</strong> design language. Engineering developer platforms, AI agents, and tactile interfaces that feel alive, responsive, and organic.
              </p>
            </div>

            {/* LoraHost Profile */}
            <div className="p-4 rounded-2xl bg-carbon-850/80 border border-carbon-750">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  LoraHost
                </h4>
                <a
                  href="https://lorahost.lorapok.tech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline font-mono text-[11px] flex items-center gap-1"
                >
                  lorahost.lorapok.tech <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="leading-relaxed">
                Sovereign cloud hosting and payment bridge infrastructure. Providing high-speed LiteSpeed NVMe hosting clusters, domain registrar reselling, and the automated <strong>PayStation PGW Relay</strong> powering BNP.
              </p>
            </div>
          </div>
        </div>

        {/* Standard Footer Columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand & Venture */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-bnp to-bnp-dark flex items-center justify-center font-display font-black text-white text-lg border border-white/20">
                BNP
              </div>
              <div>
                <span className="font-display font-bold text-white text-base block">
                  Bike Number Plate
                </span>
                <span className="text-[11px] text-silver-500 font-medium">
                  A Joy & Arash Enterprise Venture
                </span>
              </div>
            </div>
            <p className="text-silver-400 text-xs sm:text-sm max-w-md font-sans mb-4 leading-relaxed">
              Premium manufacturer of 0.8 mm Finish No. 8 mirror-silver steel and BRTA-compliant aluminum motorcycle and scooter plates in Bangladesh. Built for riders who demand durability, compliance, and aesthetic excellence.
            </p>
            <div className="inline-block p-2.5 rounded-lg bg-carbon-900 border border-carbon-800 text-[11px] text-silver-300">
              <span className="text-white font-semibold">Founders:</span> Joy & Arash • Joy & Arash Enterprise
            </div>
          </div>

          {/* Quick Contact Info */}
          <div>
            <h4 className="font-display font-semibold text-white uppercase tracking-wider text-xs mb-4">
              Contact & Hotline
            </h4>
            <ul className="space-y-3 font-sans text-xs">
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-bnp shrink-0" />
                <a href="tel:01632333221" className="hover:text-white transition-colors">
                  Hotline: 01632333221
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <a
                  href="https://wa.me/8801914873925"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  WhatsApp: 01914-873925
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-silver-400 shrink-0" />
                <a href="mailto:bikesnumberplate@gmail.com" className="hover:text-white transition-colors">
                  bikesnumberplate@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <a
                  href="https://facebook.com/bikenumberplate"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  facebook.com/bikenumberplate
                </a>
              </li>
            </ul>
          </div>

          {/* Office Address */}
          <div>
            <h4 className="font-display font-semibold text-white uppercase tracking-wider text-xs mb-4">
              Workshop & Office
            </h4>
            <div className="flex items-start gap-2 text-xs font-sans mb-3">
              <MapPin className="w-4 h-4 text-bnp shrink-0 mt-0.5" />
              <span>
                52 Purana Paltan Line, Paltan, Dhaka, Bangladesh
              </span>
            </div>
            <p className="text-[11px] text-silver-500 font-sans leading-relaxed">
              Nationwide delivery via Pathao Courier. Orders accepted 24/7 online. WhatsApp registration paper verification active daily 9:00 AM – 10:00 PM.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-carbon-850 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-silver-600">
          <div>
            © {new Date().getFullYear()} BNP: Bike Number Plate. A Joy & Arash Enterprise Venture in Strategic Partnership with Lorapok Labs & LoraHost. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <a href="#designer" className="hover:text-silver-400">Designer</a>
            <a href="#pricing" className="hover:text-silver-400">Pricing</a>
            <a href="#order" className="hover:text-silver-400">Order Form</a>
            <a href="#payment" className="hover:text-silver-400">Payment Gateway</a>
            <a href="/admin/login" className="hover:text-silver-400">Admin Portal</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
