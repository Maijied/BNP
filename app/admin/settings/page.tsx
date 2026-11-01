"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sliders, Save, ArrowLeft, Check, AlertCircle, Loader2 } from "lucide-react";

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [settings, setSettings] = useState({
    price_a: 380,
    price_b: 450,
    price_preorder_a: 300,
    price_preorder_b: 380,
    bracket_price: 80,
    delivery_dhaka: 60,
    delivery_outside: 120,
    urgency_text: "BRTA deadline: November 15 — order your compliant plate today",
    hotline: "01632333221",
    whatsapp: "01914-873925",
  });

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => {
        if (res.status === 401) {
          router.push("/admin/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.settings) {
          setSettings(data.settings);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSaved(false);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        throw new Error("Failed to save settings.");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-carbon-900 text-silver-200">
      {/* Top Navbar */}
      <header className="bg-carbon-850 border-b border-carbon-700 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/admin/orders"
            className="p-1.5 rounded-lg bg-carbon-800 hover:bg-carbon-700 text-silver-300 transition-colors"
            title="Back to Orders"
          >
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div>
            <h1 className="text-sm font-bold text-white font-display">Store Settings Configurator</h1>
            <span className="text-[10px] text-silver-500 font-sans">Dynamic Pricing & Banner Controls</span>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-bnp hover:bg-bnp-hover text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-bnp-glow transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{saving ? "Saving..." : "Save Changes"}</span>
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {saved && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/60 border border-emerald-500 text-emerald-200 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Store settings saved successfully and live on storefront!</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Retail Pricing Section */}
          <div className="bg-carbon-850 p-6 rounded-2xl border border-carbon-700 shadow-glass-panel">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-bnp" />
              <span>Plate Pricing (BDT)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-silver-400 mb-1">Model A Retail MRP (৳)</label>
                <input
                  type="number"
                  required
                  value={settings.price_a}
                  onChange={(e) => setSettings({ ...settings, price_a: Number(e.target.value) })}
                  className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-silver-400 mb-1">Model A Pre-Order Rate (৳)</label>
                <input
                  type="number"
                  required
                  value={settings.price_preorder_a}
                  onChange={(e) => setSettings({ ...settings, price_preorder_a: Number(e.target.value) })}
                  className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-silver-400 mb-1">Model B Retail MRP (৳)</label>
                <input
                  type="number"
                  required
                  value={settings.price_b}
                  onChange={(e) => setSettings({ ...settings, price_b: Number(e.target.value) })}
                  className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-silver-400 mb-1">Model B Pre-Order Rate (৳)</label>
                <input
                  type="number"
                  required
                  value={settings.price_preorder_b}
                  onChange={(e) => setSettings({ ...settings, price_preorder_b: Number(e.target.value) })}
                  className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-silver-400 mb-1">Mounting Bracket Kit Price (৳)</label>
                <input
                  type="number"
                  required
                  value={settings.bracket_price}
                  onChange={(e) => setSettings({ ...settings, bracket_price: Number(e.target.value) })}
                  className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Delivery Rates */}
          <div className="bg-carbon-850 p-6 rounded-2xl border border-carbon-700 shadow-glass-panel">
            <h2 className="text-sm font-bold text-white mb-4">Delivery Pass-Through Rates (Pathao Courier)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-silver-400 mb-1">Inside Dhaka Courier Fee (৳)</label>
                <input
                  type="number"
                  required
                  value={settings.delivery_dhaka}
                  onChange={(e) => setSettings({ ...settings, delivery_dhaka: Number(e.target.value) })}
                  className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-silver-400 mb-1">Outside Dhaka Courier Fee (৳)</label>
                <input
                  type="number"
                  required
                  value={settings.delivery_outside}
                  onChange={(e) => setSettings({ ...settings, delivery_outside: Number(e.target.value) })}
                  className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Urgency Text & Contacts */}
          <div className="bg-carbon-850 p-6 rounded-2xl border border-carbon-700 shadow-glass-panel">
            <h2 className="text-sm font-bold text-white mb-4">Urgency Announcement & Hotlines</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-silver-400 mb-1">Urgency Bar Announcement Text</label>
                <input
                  type="text"
                  required
                  value={settings.urgency_text}
                  onChange={(e) => setSettings({ ...settings, urgency_text: e.target.value })}
                  className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-2.5 text-sm text-white font-bangla"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-silver-400 mb-1">Hotline & bKash Number</label>
                  <input
                    type="text"
                    required
                    value={settings.hotline}
                    onChange={(e) => setSettings({ ...settings, hotline: e.target.value })}
                    className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-silver-400 mb-1">WhatsApp Paper Verification Number</label>
                  <input
                    type="text"
                    required
                    value={settings.whatsapp}
                    onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                    className="w-full bg-carbon-800 border border-carbon-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
