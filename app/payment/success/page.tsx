"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  MessageCircle,
  Printer,
  Home,
  ShieldCheck,
  Truck,
  Phone,
  FileText,
  AlertTriangle,
} from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order_number") || "BNP-SAMPLE";
  const trxId = searchParams.get("trx_id") || "";
  const method = searchParams.get("method") || "lorahost_bridge";

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderNumber && orderNumber !== "BNP-SAMPLE") {
      fetch(`/api/order/${orderNumber}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setOrder(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [orderNumber]);

  const whatsappMessage = `Hello BNP, I have completed payment for Order ${orderNumber}. Here is the clear photo of my motorcycle registration certificate/blue book for manufacturing verification: [Attach Photo]`;
  const whatsappUrl = `https://wa.me/8801914873925?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="min-h-screen bg-carbon-900 text-silver-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Success Header Card */}
        <div className="bg-carbon-850 rounded-2xl border border-carbon-700 p-8 shadow-glass-panel text-center mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 filter blur-3xl pointer-events-none" />

          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
            Order Confirmed & Payment Received
          </span>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white mt-2 mb-2">
            Thank You for Your Order!
          </h1>
          <p className="text-xs sm:text-sm text-silver-400 max-w-md mx-auto font-sans">
            Your customized mirror-silver steel plate order has been registered under:
          </p>

          <div className="mt-4 inline-block bg-carbon-900 border border-carbon-700 px-4 py-2 rounded-xl font-mono text-base font-bold text-white tracking-wider">
            {orderNumber}
          </div>
          {trxId && (
            <p className="text-[11px] text-silver-500 font-mono mt-1">
              Transaction ID: <span className="text-silver-300">{trxId}</span>
            </p>
          )}
        </div>

        {/* Mandatory WhatsApp Step (High Priority) */}
        <div className="bg-gradient-to-r from-red-950/70 via-carbon-850 to-red-950/70 border-2 border-bnp/60 rounded-2xl p-6 mb-8 shadow-glass-panel">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-bnp/20 rounded-xl text-bnp shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-bnp block">
                Crucial Final Step Required
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">
                Send Photo of Registration Paper via WhatsApp
              </h3>
              <p className="text-xs text-silver-300 font-sans mt-1.5 leading-relaxed">
                Under official BRTA manufacturing rules, custom plates can only be laser-cut after verifying your vehicle registration certificate (bluebook or digital card). Please tap the button below to send your paper photo directly to our production desk.
              </p>

              <div className="mt-4">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg hover:shadow-emerald-500/30 transition-all text-xs sm:text-sm"
                >
                  <MessageCircle className="w-5 h-5 fill-white" />
                  <span>Send Paper Photo to WhatsApp (01914-873925)</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Summary Card */}
        <div className="bg-carbon-850 rounded-2xl border border-carbon-700 p-6 sm:p-8 shadow-glass-panel mb-8">
          <div className="flex items-center justify-between pb-4 border-b border-carbon-800 mb-6">
            <div className="flex items-center gap-2 font-display font-bold text-white text-base">
              <FileText className="w-4 h-4 text-bnp" />
              <span>Official Invoice Slip</span>
            </div>
            <span className="text-xs text-silver-500 font-mono">
              {order?.created_at ? new Date(order.created_at).toLocaleDateString() : new Date().toLocaleDateString()}
            </span>
          </div>

          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between py-1 border-b border-carbon-800/60">
              <span className="text-silver-400">Customer Name:</span>
              <span className="text-white font-medium">{order?.name || "Customer"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-carbon-800/60">
              <span className="text-silver-400">Phone:</span>
              <span className="text-white font-mono">{order?.phone || "N/A"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-carbon-800/60">
              <span className="text-silver-400">Plate Model:</span>
              <span className="text-white font-semibold">
                Model {order?.model || "A"} ({order?.model === "B" ? "Scooter 200×100mm" : "Motorcycle 285×50mm"})
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-carbon-800/60">
              <span className="text-silver-400">Stamped Number:</span>
              <span className="text-white font-bangla font-bold text-sm">
                {order?.reg_number_bangla || "ঢাকা মেট্রো-ল ১২-৩৪৫৬"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-carbon-800/60">
              <span className="text-silver-400">Mounting Bracket Kit:</span>
              <span className="text-white">
                {order?.bracket ? "Yes (+৳ 80 / pc)" : "No"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-carbon-800/60">
              <span className="text-silver-400">Delivery District:</span>
              <span className="text-white">{order?.district || "Dhaka"} (Pathao Courier)</span>
            </div>
            <div className="flex justify-between pt-2 text-base font-bold text-white">
              <span>Total Paid (Full Advance):</span>
              <span className="text-bnp font-mono text-xl">
                ৳ {order?.total || 520} BDT
              </span>
            </div>
          </div>

          {/* Delivery Note */}
          <div className="mt-6 pt-4 border-t border-carbon-800 flex items-center gap-3 text-xs text-silver-400 font-sans">
            <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Your plate will be cut, polished, packaged, and handed to Pathao Courier within 24 hours of paper verification.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-carbon-800 hover:bg-carbon-700 text-silver-200 hover:text-white px-5 py-3 rounded-xl border border-carbon-700 text-xs font-semibold transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice</span>
          </button>

          <a
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-bnp hover:bg-bnp-hover text-white px-6 py-3 rounded-xl text-xs font-semibold shadow-bnp-glow transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Back to BNP Home</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-carbon-900 text-silver-200 flex items-center justify-center">Loading receipt...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
