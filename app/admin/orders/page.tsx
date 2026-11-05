"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/AdminHeader';
import PathaoShipmentPanel from '@/components/PathaoShipmentPanel';
type Order = { id: string; order_number: string; customer: { name: string; phone: string; address: string; district: string }; items: { sku: string; title: string; quantity: number; customization: { registration_bangla?: string } }[]; total_minor: number; currency: string; payment_status: string; status: string; version: number; created_at: number };
const exactMoney = (value: number) => { if (!Number.isSafeInteger(value) || value < 0) return '—'; const n = BigInt(value); return `${n / BigInt(100)}.${String(n % BigInt(100)).padStart(2, '0')}`; };
export default function AdminOrdersPage() {
  const router = useRouter(); const [orders, setOrders] = useState<Order[]>([]); const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [cursor, setCursor] = useState<string | null>(null);
  const generation = useRef(0);
  const alive = useRef(true);
  async function load(next?: string) {
    if (!alive.current) return;
    const current = ++generation.current;
    setBusy(true); setError('');
    try { const query = new URLSearchParams({ q, status, limit: '50', ...(next ? { cursor: next } : {}) }); const res = await fetch('/api/admin/orders?' + query, { cache: 'no-store' }); const data = await res.json(); if (current !== generation.current) return; if (res.status === 401) { router.push('/admin/login'); return; } if (!res.ok) throw new Error(data.error); if (data.orders.some((o: any) => !o.customer || !Number.isInteger(o.total_minor))) throw new Error('Legacy order records require the legacy operator tools. This screen uses the parent commerce service.'); setOrders(data.orders); setCursor(data.next_cursor || null); } catch (err: any) { if (current === generation.current) setError(err.message || 'Unable to load requests.'); } finally { if (current === generation.current) setBusy(false); }
  }
  useEffect(() => { alive.current = true; load(); return () => { alive.current = false; ++generation.current; }; }, []);
  async function update(order: Order, next: string) {
    if (!alive.current || busy) return;
    setBusy(true); setError('');
    try { const res = await fetch('/api/admin/orders/' + encodeURIComponent(order.id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next, expected_version: order.version }) }); const data = await res.json(); if (!alive.current) return; if (!res.ok) throw new Error(data.error); await load(); } catch (err: any) { if (alive.current) setError(err.message || 'Update failed. Reload before retrying.'); } finally { if (alive.current) setBusy(false); }
  }
  return <div className="min-h-screen bg-carbon-900 text-silver-200 p-4 sm:p-8"><AdminHeader title="Unpaid requests" active="orders" busy={busy} onLogoutStart={() => { alive.current = false; ++generation.current; setBusy(true); }} onLogoutFailure={() => { alive.current = true; load(); }}/>
    <p className="my-5 p-4 border border-amber-500/40 rounded-xl text-amber-200">Delivery areas and totals require address verification. Payment integration is deferred. Requests can be reviewed or cancelled; payment, production and dispatch cannot be approved here.</p>
    <form onSubmit={e => { e.preventDefault(); load(); }} className="flex flex-wrap gap-3 my-5"><input aria-label="Search requests" placeholder="Search reference or phone" value={q} onChange={e => setQ(e.target.value)} className="bg-carbon-800 border border-carbon-700 p-3 rounded-lg"/><select aria-label="Request status" value={status} onChange={e => setStatus(e.target.value)} className="bg-carbon-800 p-3 rounded-lg"><option value="">All request statuses</option><option value="new">New</option><option value="verification">Verification</option><option value="cancelled">Cancelled</option></select><button disabled={busy} className="bg-bnp text-white p-3 rounded-lg">{busy ? 'Loading…' : 'Search / refresh'}</button></form>
    {error && <p role="alert" className="text-red-300 my-4">{error}</p>}
    <div className="space-y-4">{orders.map(order => <article key={order.id} className="rounded-xl bg-carbon-850 border border-carbon-700 p-5"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-bold text-white">{order.order_number}</h2><span>{order.currency} {exactMoney(order.total_minor)} · {order.payment_status}</span></div><p>{order.customer.name} · {order.customer.phone}</p><p>{order.customer.address}, {order.customer.district}</p><ul className="my-3">{order.items.map((item, i) => <li key={i}>{item.title || item.sku} × {item.quantity} {item.customization?.registration_bangla}</li>)}</ul><div className="flex flex-wrap gap-3 items-center"><span>Status: {order.status}</span>{order.status === 'new' && <button disabled={busy} onClick={() => update(order, 'verification')} className="border border-carbon-600 rounded p-2">Mark for verification</button>}{['new','verification'].includes(order.status) && <button disabled={busy} onClick={() => { if (window.confirm('Cancel this unpaid request?')) update(order, 'cancelled'); }} className="border border-red-700 rounded p-2 text-red-300">Cancel request</button>}</div><div className="mt-4 border-t border-carbon-700 pt-4"><p className="text-sm text-silver-400">Pathao readiness: booking is unavailable for these unpaid parent-service requests. Verified payment and quality checks are required before a future dispatch workflow.</p><PathaoShipmentPanel orderId={order.id} orderStatus={order.status}/></div></article>)}</div>
    {!orders.length && !busy && <p>No requests to show.</p>}{cursor && <button disabled={busy} onClick={() => load(cursor)} className="mt-5 p-3 border border-carbon-600 rounded">Next page</button>}
  </div>;
}
