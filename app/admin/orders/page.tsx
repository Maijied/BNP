"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OrderRecord, OrderStatus, PaymentStatus } from "@/lib/types";
import {
  Search,
  MessageCircle,
  LogOut,
  Sliders,
  RefreshCw,
  ShoppingBag,
  Clock,
  CheckCircle,
  Truck,
  ExternalLink,
} from "lucide-react";

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [errorMsg, setErrorMsg] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const url = new URL("/api/admin/orders", window.location.origin);
      if (searchTerm) url.searchParams.set("q", searchTerm);
      if (paymentFilter !== "all") url.searchParams.set("payment_status", paymentFilter);
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);

      const res = await fetch(url.toString());
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load orders.");
      setOrders(data.orders || []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not load orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [searchTerm, paymentFilter, statusFilter]);

  const handleUpdateStatus = async (id: string, fields: { status: OrderStatus }) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to update fulfillment.");
      loadOrders();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unable to update order.");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  // KPI calculations
  const totalRevenue = orders.reduce((sum, o) => sum + (o.payment_status === "paid" ? o.total : 0), 0);
  const pendingVerification = orders.filter((o) => o.payment_status === "unpaid" || o.payment_status === "pending" || o.payment_status === "disputed").length;
  const inProduction = orders.filter((o) => o.status === "production" || o.status === "qc").length;

  return (
    <div className="min-h-screen bg-carbon-900 text-silver-200">
      {/* Top Navbar */}
      <header className="bg-carbon-850 border-b border-carbon-700 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-bnp flex items-center justify-center font-display font-black text-white text-sm">
            BNP
          </div>
          <div>
            <h1 className="text-sm font-bold text-white font-display">BNP Admin Dashboard</h1>
            <span className="text-[10px] text-silver-500 font-sans">Joy & Arash Enterprise • In Strategic Partnership with Lorapok Labs & LoraHost</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <a
            href="/admin/settings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-carbon-800 hover:bg-carbon-700 border border-carbon-700 text-silver-300 hover:text-white transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Store Settings</span>
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-carbon-800 hover:bg-red-950/60 border border-carbon-700 hover:border-red-500/40 text-silver-400 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {errorMsg && <div role="alert" className="mb-5 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{errorMsg}</div>}
        <p className="mb-5 text-xs text-silver-500">Orders reflect D1 records. Only verified settlement can change a payment status. Fulfillment changes are audited.</p>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-carbon-850 p-5 rounded-xl border border-carbon-700">
            <span className="text-xs text-silver-500 font-mono uppercase">Total Orders</span>
            <div className="text-2xl font-bold text-white font-mono mt-1">{orders.length}</div>
          </div>
          <div className="bg-carbon-850 p-5 rounded-xl border border-carbon-700">
            <span className="text-xs text-silver-500 font-mono uppercase">Verified Paid Revenue</span>
            <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">৳ {totalRevenue} BDT</div>
          </div>
          <div className="bg-carbon-850 p-5 rounded-xl border border-carbon-700">
            <span className="text-xs text-silver-500 font-mono uppercase">Awaiting Verification</span>
            <div className="text-2xl font-bold text-yellow-400 font-mono mt-1">{pendingVerification}</div>
          </div>
          <div className="bg-carbon-850 p-5 rounded-xl border border-carbon-700">
            <span className="text-xs text-silver-500 font-mono uppercase">In Production</span>
            <div className="text-2xl font-bold text-blue-400 font-mono mt-1">{inProduction}</div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-carbon-850 p-4 rounded-xl border border-carbon-700 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search phone, order #, reg number..."
              className="w-full bg-carbon-800 border border-carbon-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-silver-600 focus:outline-none focus:border-bnp font-sans"
            />
            <Search className="w-4 h-4 text-silver-500 absolute left-3 top-2.5 pointer-events-none" />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto text-xs">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-carbon-800 border border-carbon-700 rounded-lg px-3 py-2 text-silver-300 focus:outline-none focus:border-bnp"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="pending">Pending</option>
              <option value="disputed">Disputed</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-carbon-800 border border-carbon-700 rounded-lg px-3 py-2 text-silver-300 focus:outline-none focus:border-bnp"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="verification">Verification</option>
              <option value="production">Production</option>
              <option value="qc">Quality Check</option>
              <option value="cancelled">Cancelled</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
            </select>

            <button
              onClick={loadOrders}
              className="p-2 rounded-lg bg-carbon-800 hover:bg-carbon-700 text-silver-400 hover:text-white border border-carbon-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-carbon-850 rounded-xl border border-carbon-700 overflow-hidden shadow-glass-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-carbon-800/80 text-silver-400 font-mono uppercase text-[11px] border-b border-carbon-700">
                <tr>
                  <th className="py-3.5 px-4">Order Ref</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Model & Plate</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Fulfillment</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-carbon-800">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-silver-500 font-sans">
                      {loading ? "Loading order records..." : "No orders found matching criteria."}
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-carbon-800/40 transition-colors">
                      {/* Order Ref */}
                      <td className="py-3 px-4 font-mono">
                        <span className="text-white font-bold block">{order.order_number}</span>
                        <span className="text-[10px] text-silver-500">
                          {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <span className="text-white font-medium block">{order.name}</span>
                        <span className="text-silver-400 font-mono text-[11px]">{order.phone}</span>
                        {order.shop_name && (
                          <span className="text-[10px] text-silver-500 block">Garage: {order.shop_name}</span>
                        )}
                      </td>

                      {/* Model & Plate */}
                      <td className="py-3 px-4">
                        <span className="text-bnp font-bold block font-bangla text-sm">
                          {order.reg_number_bangla}
                        </span>
                        <span className="text-[10px] text-silver-400 font-mono">
                          Model {order.model} • {order.quantity} pc{order.quantity > 1 ? "s" : ""}
                          {order.bracket ? " • +Bracket" : ""}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 max-w-[180px] truncate" title={order.address}>
                        <span className="text-white block font-medium">{order.district}</span>
                        <span className="text-[10px] text-silver-500 truncate block">{order.address}</span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 font-mono font-bold text-white text-sm">
                        ৳ {order.total}
                      </td>

                      {/* Payment Status Dropdown */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
                          order.payment_status === "paid"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : "bg-yellow-500/10 text-yellow-200 border-yellow-500/30"
                        }`} title="Payment status is verified by the LoraHost settlement service, not editable here">
                          {order.payment_status}
                        </span>
                        {order.trx_note && (
                          <span className="text-[10px] text-yellow-400 font-mono block mt-0.5">
                            Trx: {order.trx_note}
                          </span>
                        )}
                      </td>

                      {/* Fulfillment Status Dropdown */}
                      <td className="py-3 px-4">
                        <select
                          value={order.status}
                          disabled={order.status === "delivered" || order.status === "cancelled"}
                          onChange={(e) => handleUpdateStatus(order.id, { status: e.target.value as OrderStatus })}
                          className="text-[11px] font-medium bg-carbon-800 text-silver-300 border border-carbon-700 px-2 py-1 rounded-lg focus:outline-none disabled:opacity-50"
                        >
                          <option value="new">New</option>
                          <option value="verification">Verification</option>
                          <option value="production">Production</option>
                          <option value="qc">Quality Check</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>

                      {/* Actions: Direct WhatsApp Chat */}
                      <td className="py-3 px-4 text-right">
                        <a
                          href={`https://wa.me/88${order.phone}?text=${encodeURIComponent(
                            `Hello ${order.name}, this is BNP (Bike Number Plate) regarding your Order ${order.order_number}. Please provide your bike registration certificate photo so we can start production.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-emerald-500/30 transition-all font-semibold"
                          title="Open WhatsApp Chat with Customer"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          <span>WhatsApp</span>
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
