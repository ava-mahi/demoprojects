'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function AdminMethodsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  async function load() {
    const r = await fetch('/api/admin/methods', { cache: 'no-store' });
    setItems((await r.json()).methods || []);
  }
  useEffect(() => { load(); }, []);

  async function save(m: any) {
    const r = await fetch('/api/admin/methods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...m, minAmount: Number(m.minAmount), maxAmount: Number(m.maxAmount), feePct: Number(m.feePct || 0) }) });
    const j = await r.json();
    if (!r.ok) return toast.error(j.error || 'Failed');
    toast.success('Saved');
    setEditing(null);
    load();
  }
  async function disable(id: string) {
    if (!confirm('Disable this method?')) return;
    await fetch('/api/admin/methods', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payment methods</h1>
        <button className="btn btn-primary" onClick={() => setEditing({ name: '', kind: 'crypto', enabled: true, minAmount: 10, maxAmount: 100000, feePct: 0 })}>+ Add method</button>
      </div>
      <div className="glass rounded-2xl mt-4 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted uppercase tracking-widest text-left">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3">Network</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Range</th>
              <th className="px-4 py-3">Enabled</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id} className="border-t border-line/60">
                <td className="px-4 py-3 font-semibold">{m.name}</td>
                <td className="px-4 py-3">{m.kind}</td>
                <td className="px-4 py-3">{m.network || '—'}</td>
                <td className="px-4 py-3 mono text-xs truncate max-w-[200px]">{m.address || '—'}</td>
                <td className="px-4 py-3 mono">{Number(m.minAmount)}–{Number(m.maxAmount)}</td>
                <td className="px-4 py-3"><span className={`chip ${m.enabled ? 'chip-up' : 'chip-down'}`}>{m.enabled ? 'YES' : 'NO'}</span></td>
                <td className="px-4 py-3 text-right">
                  <button className="btn btn-ghost h-8 px-2 text-xs mr-1" onClick={() => setEditing({ ...m, minAmount: Number(m.minAmount), maxAmount: Number(m.maxAmount) })}>Edit</button>
                  <button className="btn btn-down h-8 px-2 text-xs" onClick={() => disable(m.id)}>Disable</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md glass-strong rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold mb-3">{editing.id ? 'Edit method' : 'Add method'}</h2>
            <div className="space-y-2">
              <input className="input" placeholder="Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <select className="input" value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value })}>
                <option value="crypto">Crypto</option>
                <option value="card">Card</option>
                <option value="bank">Bank</option>
              </select>
              <input className="input" placeholder="Network (e.g. TRC20)" value={editing.network || ''} onChange={(e) => setEditing({ ...editing, network: e.target.value })} />
              <input className="input mono" placeholder="Address / account" value={editing.address || ''} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <input className="input mono" type="number" placeholder="Min" value={editing.minAmount} onChange={(e) => setEditing({ ...editing, minAmount: e.target.value })} />
                <input className="input mono" type="number" placeholder="Max" value={editing.maxAmount} onChange={(e) => setEditing({ ...editing, maxAmount: e.target.value })} />
              </div>
              <input className="input mono" type="number" step="0.1" placeholder="Fee %" value={editing.feePct || 0} onChange={(e) => setEditing({ ...editing, feePct: e.target.value })} />
              <textarea className="input min-h-[60px] py-2" placeholder="Instructions" value={editing.instructions || ''} onChange={(e) => setEditing({ ...editing, instructions: e.target.value })} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.enabled} onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })} /> Enabled</label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn btn-ghost h-9" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary h-9" onClick={() => save(editing)}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
