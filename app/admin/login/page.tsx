"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, ShieldAlert, ArrowRight, Loader2 } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedFrom = searchParams.get("from") || "/admin/orders";
  const from = requestedFrom.startsWith("/admin/") && !requestedFrom.startsWith("//") && !requestedFrom.includes("://") ? requestedFrom : "/admin/orders";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      router.push(from);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to log in.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-carbon-900 text-silver-200 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-carbon-850 rounded-2xl border border-carbon-700 p-8 shadow-glass-panel relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-bnp/10 filter blur-2xl pointer-events-none" />

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-bnp to-bnp-dark flex items-center justify-center font-display font-black text-white text-xl mx-auto shadow-bnp-glow mb-3">
            BNP
          </div>
          <h1 className="text-xl font-display font-bold text-white">
            Operations & Admin Portal
          </h1>
          <p className="text-xs text-silver-400 mt-1 font-sans">
            BNP · A Lorapok Labs product
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-950/60 border border-red-500 text-red-200 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-silver-300 mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="bikesnumberplate@gmail.com"
                className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-3 text-sm text-white placeholder-silver-600 focus:outline-none focus:border-bnp font-sans"
              />
              <Mail className="w-4 h-4 text-silver-500 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-silver-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-3 text-sm text-white placeholder-silver-600 focus:outline-none focus:border-bnp font-mono"
              />
              <Lock className="w-4 h-4 text-silver-500 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-bnp to-bnp-hover hover:from-bnp-hover hover:to-bnp text-white font-semibold py-3.5 rounded-xl shadow-bnp-glow transition-all text-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Sign In to Admin</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-carbon-800 text-center">
          <a href="/bnp" className="text-xs text-silver-500 hover:text-white transition-colors">
            ← Back to Storefront
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-carbon-900 text-silver-200 flex items-center justify-center">Loading login...</div>}>
      <LoginContent />
    </Suspense>
  );
}

