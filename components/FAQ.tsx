"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQItem {
  q: string;
  a: string;
}

const FAQS: FAQItem[] = [
  { q: "Are these previews approved for road use?", a: "No. A preview does not certify compliance. Confirm current BRTA specifications, lettering, material and mounting requirements before manufacture. Decorative designs are not road-use approvals, and must not replace an official rear RFID plate." },
  { q: "Should I upload registration documents here?", a: "No document upload is enabled in this preview. Confirm the necessary information, recipient and secure verification process before sharing registration documents." },
  { q: "How long does delivery take?", a: "Production timing, courier coverage and delivery charges require a confirmed quotation. This preview does not promise a delivery date or create a paid shipment." },
  { q: "What materials and finish are available?", a: "Mirror-finish steel is shown as a design option. The workshop must confirm final material, thickness, finish, care instructions and any warranty before manufacture." },
  { q: "Do I need mounting hardware?", a: "Mounting depends on your scooter or motorcycle. Confirm the hole positions and bracket compatibility with the workshop; preview dimensions are not a fit guarantee." },
  { q: "Can I place a bulk order or pay online?", a: "Bulk pricing requires a separate quotation. Online payments are deferred and disabled. Do not send money based on this preview; any draft order remains unpaid." },
];

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="py-16 sm:py-24 bg-carbon-900 border-b border-carbon-700/60 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-silver-400 bg-carbon-800 px-3 py-1 rounded-full border border-carbon-700">
            Got Questions?
          </span>
          <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-white tracking-tight mt-3">
            Frequently Asked Questions
          </h2>
          <p className="mt-2 text-silver-400 text-xs sm:text-sm font-sans">
            Everything you need to know about specs, delivery, and legal compliance.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="bg-carbon-850 rounded-xl border border-carbon-700/80 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left text-sm sm:text-base font-semibold text-white hover:text-bnp transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-silver-400 transition-transform duration-200 shrink-0 ml-4 ${
                      isOpen ? "rotate-180 text-bnp" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-silver-400 font-sans leading-relaxed border-t border-carbon-800">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

