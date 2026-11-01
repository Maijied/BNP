import React from "react";
import { MessageCircle } from "lucide-react";

export default function WhatsAppFloat() {
  const whatsappUrl =
    "https://wa.me/8801914873925?text=Hello%20BNP,%20I%20want%20to%20verify%20my%20bike%20number%20plate%20registration%20paper.";

  return (
    <aside aria-label="Support chat" className="fixed bottom-6 right-6 z-50">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-3 rounded-full shadow-lg hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-105 active:scale-95 group border border-emerald-400/40"
      >
        <MessageCircle className="w-5 h-5 fill-white group-hover:rotate-12 transition-transform" />
        <span className="hidden sm:inline text-xs tracking-wide">
          WhatsApp Reg Check
        </span>
      </a>
    </aside>
  );
}
