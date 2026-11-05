"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  title: string;
  active: 'orders' | 'settings';
  busy?: boolean;
  onLogoutStart: () => void;
  onLogoutFailure: () => void;
};
export default function AdminHeader({ title, active, busy, onLogoutStart, onLogoutFailure }: Props) {
  const router = useRouter();
  const alive = useRef(true), pending = useRef(false);
  const [loggingOut, setLoggingOut] = useState(false), [error, setError] = useState('');
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function logout() {
    if (pending.current || busy || !alive.current) return;
    pending.current = true; setLoggingOut(true); setError(''); onLogoutStart();
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error' });
      const result = await response.json();
      if (!alive.current) return;
      if (!response.ok || result.success !== true) throw new Error('Logout was not confirmed. Please try again.');
      router.replace('/admin/login');
    } catch {
      if (!alive.current) return;
      pending.current = false; setLoggingOut(false); setError('Logout was not confirmed. Please try again.'); onLogoutFailure();
    }
  }
  return <header className="border-b border-carbon-700 p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><img src="/images/themes/lorapok-labs.svg" alt="Lorapok Labs" width={180} height={48} className="h-10 w-auto mb-2"/><h1 className="text-2xl font-bold text-white">{title}</h1><p className="text-sm text-silver-400">BNP · A Lorapok Labs product</p></div>
      <nav aria-label="Admin navigation" className="flex flex-wrap items-center gap-4 text-sm">
        <a href="/admin/orders" aria-current={active === 'orders' ? 'page' : undefined} className={active === 'orders' ? 'font-bold text-white' : 'text-bnp'}>Unpaid requests</a>
        <a href="/admin/settings" aria-current={active === 'settings' ? 'page' : undefined} className={active === 'settings' ? 'font-bold text-white' : 'text-bnp'}>Catalog settings</a>
        <button type="button" disabled={busy || loggingOut} onClick={logout} className="rounded-lg border border-carbon-600 px-4 py-2 text-white disabled:opacity-50">{loggingOut ? 'Logging out…' : 'Log out'}</button>
      </nav>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
  </header>;
}
