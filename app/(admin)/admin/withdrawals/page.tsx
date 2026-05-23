'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { timeAgo, formatMoney } from '@/lib/utils';

export default function AdminWithdrawals() {
  const [tab, setTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [items, setItems] = useState<any[]>([]);
  async function load() {
    const r = await fetch(`/api/admin/withdrawals?status=${tab}`, { cache: 'no-store' });
    setItems((await r.json()).items || []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  async function act(id: string, action: 'APPROVE' | 'REJECT') {
    const note = action === 'REJECT' ? prompt('Reason for rejection?') || '' : '';
    const r = await fetch('/api/admin/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, note }) });
    const j = await r.json();
    if (!r.ok) return toast.error(j.error || 'Failed');
    toast.success(action);
    load();
  }

  return (
    <div className="max-w-7xl">
      <h1 className="text-2xl font-bold">Withdrawals</h1>
      <div className="mt-4 flex gap-2">
        {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`btn h-9 ${tab === t ? 'btn-primary' : 'btn-ghost'}`}>{t}</button>
        ))}
      </div>
      <div className="glass rounded-2xl mt-4 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted uppercase tracking-widest text-left">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Destination</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={6} className="p-6 text-muted text-center">No items.</td></tr>}
            {items.map((d) => (
              <tr key={d.id} className="border-t border-line/60">
                <td className="px-4 py-3">
                  <div className="font-semibold">{d.userName || d.userEmail}</div>
                  <div className="text-[11px] text-muted">{d.userEmail}</div>
                </td>
                <td className="px-4 py-3">{d.method.name}{d.method.network ? ` · ${d.method.network}` : ''}</td>
                <td className="px-4 py-3 mono">{formatMoney(d.amount, d.currency)}</td>
                <td className="px-4 py-3 mono text-xs truncate max-w-[200px]">{d.destination}</td>
                <td className="px-4 py-3 text-muted">{timeAgo(d.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  {tab === 'PENDING' ? (
                    <>
                      <button className="btn btn-up h-8 px-2 text-xs mr-1" onClick={() => act(d.id, 'APPROVE')}>Approve</button>
                      <button className="btn btn-down h-8 px-2 text-xs" onClick={() => act(d.id, 'REJECT')}>Reject</button>
                    </>
                  ) : <span className="chip">{d.status}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
