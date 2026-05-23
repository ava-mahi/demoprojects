'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/store/auth';
import { formatMoney } from '@/lib/utils';
import { RiskControlModal } from '@/components/profile/RiskControlModal';

export default function ProfilePage() {
  const user = useAuth((s) => s.user);
  const refresh = useAuth((s) => s.refresh);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [stats, setStats] = useState<any>({ stats: [], recent: [] });
  const [riskModalOpen, setRiskModalOpen] = useState(false);

  useEffect(() => {
    if (user) { setName(user.name || ''); setCurrency(user.displayCurrency); }
  }, [user]);

  useEffect(() => {
    fetch('/api/profile', { cache: 'no-store' }).then((r) => r.json()).then(setStats);
  }, []);

  async function save() {
    const r = await fetch('/api/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, displayCurrency: currency }),
    });
    if (r.ok) { toast.success('Profile saved'); refresh(); } else toast.error('Save failed');
  }

  async function changePw() {
    const r = await fetch('/api/profile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current: cur, next }),
    });
    const j = await r.json();
    if (!r.ok) return toast.error(j.error || 'Failed');
    toast.success('Password changed');
    setCur(''); setNext('');
  }

  const wins = stats.stats?.find((s: any) => s.status === 'WON');
  const losses = stats.stats?.find((s: any) => s.status === 'LOST');
  const winRate = wins && losses ? (wins.count / (wins.count + losses.count)) * 100 : 0;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto pb-24 md:pb-6 space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label="Wins" value={wins?.count ?? 0} color="text-up" />
        <Stat label="Losses" value={losses?.count ?? 0} color="text-down" />
        <Stat label="Win rate" value={`${winRate.toFixed(1)}%`} />
      </div>

      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="font-semibold mb-2">Account</div>
            <label className="block mt-2">
              <span className="text-xs text-muted">Email</span>
              <input className="input mt-1" value={user?.email || ''} disabled />
            </label>
            <label className="block mt-2">
              <span className="text-xs text-muted">Display name</span>
              <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block mt-2">
              <span className="text-xs text-muted">Display currency</span>
              <select className="input mt-1" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {['USD','EUR','GBP','PKR','INR','PHP','BDT'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <button onClick={save} className="btn btn-primary mt-3">Save changes</button>
          </div>
          <div>
            <div className="font-semibold mb-2">Change password</div>
            <input className="input mt-2" placeholder="Current password" type="password" value={cur} onChange={(e) => setCur(e.target.value)} />
            <input className="input mt-2" placeholder="New password (min 8)" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
            <button onClick={changePw} disabled={!cur || next.length < 8} className="btn btn-primary mt-3">Update password</button>
          </div>
        </div>
        <button onClick={() => setRiskModalOpen(true)} className="btn-secondary w-full">⚙️ Risk Controls</button>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="font-semibold">Recent trades</div>
        <div className="mt-3 divide-y divide-line/60">
          {(stats.recent || []).map((t: any) => (
            <div key={t.id} className="py-2 flex items-center justify-between text-sm">
              <span className="font-semibold">{t.symbol}</span>
              <span className={`chip ${t.direction === 'UP' ? 'chip-up' : 'chip-down'}`}>{t.direction}</span>
              <span className="mono">{formatMoney(t.stake, 'USD')}</span>
              <span className={`chip ${t.status === 'WON' ? 'chip-up' : t.status === 'LOST' ? 'chip-down' : ''}`}>{t.status}</span>
            </div>
          ))}
        </div>
      </div>
      <RiskControlModal open={riskModalOpen} onClose={() => setRiskModalOpen(false)} />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-xs text-muted uppercase tracking-widest">{label}</div>
      <div className={`mono text-3xl font-bold mt-2 ${color || ''}`}>{value}</div>
    </div>
  );
}
