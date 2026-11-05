import React from "react";
import { Phone, Mail, MapPin, MessageCircle, ExternalLink, Sparkles, ShieldCheck, Globe } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-carbon-950 text-silver-400 text-xs border-t border-carbon-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
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

        <div className="mb-8 border-t border-carbon-800 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-silver-500">
          <span className="uppercase tracking-[0.2em]">Technology & infrastructure</span>
          <div className="flex flex-wrap gap-5">
            <a href="https://lorapok.tech" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Crafted with Lorapok Labs</a>
            <a href="https://lorahost.lorapok.tech" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Infrastructure by LoraHost</a>
          </div>
        </div>
        {/* Bottom Bar */}
        <div className="border-t border-carbon-850 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-silver-600">
          <div>
            © {new Date().getFullYear()} BNP: Bike Number Plate. A Joy & Arash Enterprise Venture. All rights reserved.
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
