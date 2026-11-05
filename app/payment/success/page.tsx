import { AlertTriangle, ArrowLeft } from "lucide-react";

// A browser return URL is not payment evidence. Gateway verification is deferred,
// so even supplied order/transaction query parameters cannot create a receipt.
export default function PaymentSuccessPage() {
  return (
    <main className="min-h-screen bg-carbon-900 text-silver-200 px-4 py-16 sm:px-6">
      <section className="mx-auto max-w-xl rounded-2xl border border-amber-500/30 bg-carbon-850 p-6 sm:p-10">
        <AlertTriangle aria-hidden="true" className="mb-5 h-10 w-10 text-amber-300" />
        <p className="text-xs uppercase tracking-widest text-amber-300">BNP · Payment gateway deferred</p>
        <h1 className="mt-3 text-2xl font-bold text-white">Payment confirmation unavailable</h1>
        <p className="mt-4 leading-relaxed">This page cannot confirm a payment or issue a receipt. A return link or transaction reference is not verified payment evidence.</p>
        <p className="mt-4 leading-relaxed text-silver-400">Current requests are unpaid and subject to review. No payment, production or courier booking is confirmed here. If you believe you were charged elsewhere, keep the provider reference and check directly with that provider before paying again.</p>
        <a href="/bnp" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-bnp px-5 py-3 font-semibold text-white hover:bg-bnp-hover">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to BNP
        </a>
      </section>
    </main>
  );
}
