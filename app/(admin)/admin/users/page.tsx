'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { formatMoney, cn } from '@/lib/utils';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<any | null>(null);

  async function load() {
    const r = await fetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`, { cache: 'no-store' });
    const j = await r.json();
    setUsers(j.users || []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function patch(id: string, body: any): Promise<void> {
    const r = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) { toast.error(j.error || 'Failed'); return; }
    toast.success('Updated');
    load();
    if (selected?.id === id) {
      // refresh selected
      const u = users.find((x) => x.id === id);
      setSelected({ ...u, ...body.control ? { control: { ...u.control, ...body.control } } : {} });
    }
  }

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <div className="flex gap-2">
          <input className="input w-72" placeholder="Search by email or name" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
          <button className="btn btn-ghost" onClick={load}>Search</button>
        </div>
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted uppercase tracking-widest text-left">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">DEMO</th>
              <th className="px-4 py-3">LIVE</th>
              <th className="px-4 py-3">Control</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const demo = u.accounts.find((a: any) => a.mode === 'DEMO');
              const live = u.accounts.find((a: any) => a.mode === 'LIVE');
              return (
                <tr key={u.id} className="border-t border-line/60">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{u.name || u.email}</div>
                    <div className="text-[11px] text-muted">{u.email}</div>
                  </td>
                  <td className="px-4 py-3"><span className={`chip ${u.role === 'ADMIN' ? 'chip-up' : ''}`}>{u.role}</span></td>
                  <td className="px-4 py-3 mono">{demo ? formatMoney(demo.balance, demo.currency) : '—'}</td>
                  <td className="px-4 py-3 mono">{live ? formatMoney(live.balance, live.currency) : '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    {u.control?.enabled ? <span className="chip chip-up">{u.control.winRatePct}% win</span> : <span className="chip">default</span>}
                    {u.control?.forceNext !== 'NONE' && u.control?.forceCount > 0 && <span className={`chip ml-1 ${u.control.forceNext === 'WIN' ? 'chip-up' : 'chip-down'}`}>Force {u.control.forceNext} ×{u.control.forceCount}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {u.blocked && <span className="chip chip-down mr-1">BLOCKED</span>}
                    {u.suspended && <span className="chip mr-1">SUSPENDED</span>}
                    {!u.blocked && !u.suspended && <span className="chip chip-up">Active</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="btn btn-ghost h-8 px-2 text-xs" onClick={() => setSelected(u)}>Manage</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && <UserEditor user={selected} onClose={() => setSelected(null)} onPatch={patch} />}
    </div>
  );
}

function UserEditor({ user, onClose, onPatch }: { user: any; onClose: () => void; onPatch: (id: string, body: any) => Promise<void> }) {
  const [winRate, setWinRate] = useState(user.control?.winRatePct ?? 50);
  const [enabled, setEnabled] = useState(!!user.control?.enabled);
  const [forceNext, setForceNext] = useState(user.control?.forceNext || 'NONE');
  const [forceCount, setForceCount] = useState(user.control?.forceCount || 0);
  const [adjustAcc, setAdjustAcc] = useState(user.accounts[0]?.id);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl glass-strong rounded-2xl shadow-card overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div>
            <div className="font-bold">{user.name || user.email}</div>
            <div className="text-xs text-muted">{user.email}</div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text">✕</button>
        </div>
        <div className="p-5 space-y-5 max-h-[80vh] overflow-auto">
          <Section title="Account status">
            <div className="flex gap-2">
              <button className={cn('btn h-9', user.blocked ? 'btn-ghost' : 'btn-down')} onClick={() => onPatch(user.id, { blocked: !user.blocked })}>{user.blocked ? 'Unblock' : 'Block'}</button>
              <button className={cn('btn h-9', user.suspended ? 'btn-ghost' : 'btn-down')} onClick={() => onPatch(user.id, { suspended: !user.suspended })}>{user.suspended ? 'Unsuspend' : 'Suspend'}</button>
            </div>
          </Section>

          <Section title="Trading control">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Override outcomes</label>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted"><span>Win rate</span><span className="mono">{winRate}%</span></div>
              <input type="range" min={0} max={100} value={winRate} onChange={(e) => setWinRate(Number(e.target.value))} className="w-full" />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <select className="input" value={forceNext} onChange={(e) => setForceNext(e.target.value)}>
                <option value="NONE">No forced outcome</option>
                <option value="WIN">Force WIN</option>
                <option value="LOSE">Force LOSE</option>
              </select>
              <input className="input mono" type="number" min={0} placeholder="Number of trades to force" value={forceCount} onChange={(e) => setForceCount(Number(e.target.value))} />
            </div>
            <button className="btn btn-primary mt-3 h-9" onClick={() => onPatch(user.id, { control: { enabled, winRatePct: winRate, forceNext, forceCount } })}>Save control</button>
          </Section>

          <Section title="Balance adjustment / Bonus">
            <div className="grid grid-cols-3 gap-2">
              <select className="input" value={adjustAcc} onChange={(e) => setAdjustAcc(e.target.value)}>
                {user.accounts.map((a: any) => <option key={a.id} value={a.id}>{a.mode} · {formatMoney(a.balance, a.currency)}</option>)}
              </select>
              <input className="input mono" type="number" placeholder="Amount (+ credit, - debit)" value={adjustAmount} onChange={(e) => setAdjustAmount(Number(e.target.value))} />
              <input className="input" placeholder="Reason" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
            </div>
            <button className="btn btn-primary mt-3 h-9" onClick={() => onPatch(user.id, { adjust: { accountId: adjustAcc, amount: adjustAmount, reason: adjustReason } })}>Apply</button>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted uppercase tracking-widest mb-2">{title}</div>
      {children}
    </div>
  );
}
