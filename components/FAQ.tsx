"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQItem {
  q: string;
  a: string;
}

const FAQS: FAQItem[] = [
  {
    q: "Are these plates legally compliant with BRTA regulations?",
    a: "Yes. Our Model A (285×50 mm) and Model B (200×100 mm) plates adhere strictly to BRTA physical dimension specifications and font ratios. We also provide compliant 0.7 mm aluminum front plates, with rear plates engineered in mirror-finish 0.8 mm stainless steel.",
  },
  {
    q: "Why must I send my registration certificate via WhatsApp?",
    a: "Because our plates are custom stamped and laser cut with your legal registration number. To eliminate fraudulent number generation and typographical errors, production starts only after we verify the photo of your blue book / digital registration card on WhatsApp (01914-873925).",
  },
  {
    q: "How long does delivery take?",
    a: "Once your registration document is verified on WhatsApp, plates are manufactured within 24 hours. Delivery via Pathao Courier takes 24–48 hours inside Dhaka and 48–72 hours anywhere across Bangladesh.",
  },
  {
    q: "Will the mirror-silver steel rust or fade over time?",
    a: "No. We utilize heavy-gauge 0.8 mm Finish No. 8 mirror-polished stainless steel. It is 100% rust-proof, scratch-resistant, and maintains its mirror sheen even in heavy rain, mud, and highway dust.",
  },
  {
    q: "Do I need the mounting bracket and bolt kit?",
    a: "Our plates feature standard 2 × 12 × 5.5 mm slots that fit most factory bike tail mounts. If your bike has non-standard tail holes or you want vibration-absorbing stainless hardware, we recommend adding our +80 BDT mounting clamp kit.",
  },
  {
    q: "How do I place a bulk B2B order for my workshop?",
    a: "For workshops, dealerships, and bike accessories shops ordering 10+ plates, we offer wholesale rates ranging from ৳ 65 to ৳ 80 per piece. Contact our B2B desk directly on WhatsApp at 01914-873925.",
  },
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
