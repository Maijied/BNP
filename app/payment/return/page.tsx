"use client";

import React, { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

function ReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("orderNumber") || "";
    const status = (searchParams.get("status") || "pending").toLowerCase();
    // URL status is not payment evidence. Await verified server-side settlement.
    router.replace(
      `/payment/failed?order_number=${encodeURIComponent(reference)}&reason=${encodeURIComponent(status === "failed" ? "failed" : "verification_pending")}`
    );
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-carbon-900 text-silver-200 flex items-center justify-center">
      <div className="text-center p-8 bg-carbon-850 rounded-2xl border border-carbon-700 max-w-md mx-auto shadow-2xl">
        <Loader2 className="w-10 h-10 text-bnp animate-spin mx-auto mb-4" />
        <h2 className="text-lg font-bold text-white mb-2">Finalizing Order Verification</h2>
        <p className="text-xs text-silver-400">
          Securing payment credentials and registering production order with BNP manufacturing facility...
        </p>
      </div>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-carbon-900 text-silver-200 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-bnp animate-spin" />
        </div>
      }
    >
      <ReturnContent />
    </Suspense>
  );
}
