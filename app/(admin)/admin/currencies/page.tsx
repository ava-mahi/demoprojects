'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function AdminCurrenciesPage() {
  const [items, setItems] = useState<any[]>([]);
  async function load() {
    const r = await fetch('/api/admin/currencies', { cache: 'no-store' });
    setItems((await r.json()).items || []);
  }
  useEffect(() => { load(); }, []);

  async function save(c: any) {
    const r = await fetch('/api/admin/currencies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...c, rateToUsd: Number(c.rateToUsd) }) });
    const j = await r.json();
    if (!r.ok) return toast.error(j.error || 'Failed');
    toast.success('Saved');
    load();
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold">Currencies</h1>
      <p className="text-sm text-muted mt-1">1 unit of currency = X USD. Used for display conversions.</p>
      <div className="glass rounded-2xl mt-4 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted uppercase tracking-widest text-left">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Rate → USD</th>
              <th className="px-4 py-3">Enabled</th>
              <th className="px-4 py-3 text-right">Save</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c, i) => (
              <tr key={c.code} className="border-t border-line/60">
                <td className="px-4 py-3 font-bold mono">{c.code}</td>
                <td className="px-4 py-3"><input className="input" value={c.name} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} /></td>
                <td className="px-4 py-3"><input className="input w-16" value={c.symbol} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, symbol: e.target.value } : x))} /></td>
                <td className="px-4 py-3"><input className="input mono w-40" type="number" step="0.0001" value={c.rateToUsd} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, rateToUsd: e.target.value } : x))} /></td>
                <td className="px-4 py-3"><input type="checkbox" checked={!!c.enabled} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x))} /></td>
                <td className="px-4 py-3 text-right"><button className="btn btn-primary h-8 px-2 text-xs" onClick={() => save(c)}>Save</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
