'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const [s, setS] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' }).then((r) => r.json()).then((j) => setS(j.settings));
  }, []);

  async function save() {
    const r = await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) });
    if (!r.ok) return toast.error('Failed');
    toast.success('Saved');
  }

  if (!s) return <div className="text-muted">Loading...</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Platform settings</h1>
      <div className="glass rounded-2xl mt-4 p-5 space-y-3">
        <Field label="Default payout % (binary)" value={s.defaultPayoutPct} onChange={(v) => setS({ ...s, defaultPayoutPct: Number(v) })} type="number" />
        <Field label="Min stake" value={s.minStake} onChange={(v) => setS({ ...s, minStake: Number(v) })} type="number" />
        <Field label="Max stake" value={s.maxStake} onChange={(v) => setS({ ...s, maxStake: Number(v) })} type="number" />
        <Field label="Min withdrawal" value={s.minWithdrawal} onChange={(v) => setS({ ...s, minWithdrawal: Number(v) })} type="number" />
        <Field label="Withdrawal fee %" value={s.withdrawalFeePct} onChange={(v) => setS({ ...s, withdrawalFeePct: Number(v) })} type="number" />
        <Field label="Expiry options (comma-separated seconds)" value={(s.expiryOptions || []).join(',')} onChange={(v) => setS({ ...s, expiryOptions: v.split(',').map((x: string) => parseInt(x.trim())).filter(Boolean) })} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!s.maintenance} onChange={(e) => setS({ ...s, maintenance: e.target.checked })} /> Maintenance mode</label>
        <button className="btn btn-primary" onClick={save}>Save settings</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: any; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      <input className="input mt-1" type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
