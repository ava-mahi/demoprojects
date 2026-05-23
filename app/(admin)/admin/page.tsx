'use client';
import { useEffect, useState } from 'react';
import { Users, ArrowDownToLine, ArrowUpFromLine, TrendingUp } from 'lucide-react';
import { formatMoney } from '@/lib/utils';

export default function AdminOverview() {
  const [s, setS] = useState<any>(null);
  useEffect(() => {
    fetch('/api/admin/stats', { cache: 'no-store' }).then((r) => r.json()).then(setS);
  }, []);

  if (!s) return <div className="text-muted">Loading...</div>;

  const max = Math.max(...s.series.map((x: any) => Math.abs(x.pnl)), 1);

  return (
    <div className="space-y-6 max-w-7xl">
      <h1 className="text-2xl font-bold">Overview</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card icon={Users} label="Total users" value={s.users} />
        <Card icon={ArrowDownToLine} label="Deposits" value={formatMoney(s.depositsTotal, 'USD')} color="text-up" />
        <Card icon={ArrowUpFromLine} label="Withdrawals" value={formatMoney(Math.abs(s.withdrawalsTotal), 'USD')} color="text-down" />
        <Card icon={TrendingUp} label="Platform P/L" value={formatMoney(s.platformPnl, 'USD')} color={s.platformPnl >= 0 ? 'text-up' : 'text-down'} />
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="font-semibold">Trade P/L (last 14 days)</div>
        <div className="mt-5 flex items-end gap-2 h-40">
          {s.series.length === 0 && <div className="text-muted text-sm">No data yet.</div>}
          {s.series.map((d: any) => {
            const h = (Math.abs(d.pnl) / max) * 100;
            const up = d.pnl >= 0;
            return (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-full rounded-md ${up ? 'bg-up/70' : 'bg-down/70'}`} style={{ height: `${h}%` }} title={`${d.day}: ${d.pnl.toFixed(2)}`} />
                <div className="text-[10px] text-muted">{d.day.slice(5)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="font-semibold">Trade outcomes</div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {s.tradeStats.map((t: any) => (
            <div key={t.status} className="rounded-xl bg-white/[0.03] border border-line p-4">
              <div className="text-xs text-muted">{t.status}</div>
              <div className="mono text-2xl font-bold mt-1">{t.count}</div>
              <div className="text-[11px] text-muted mt-0.5">Stake {formatMoney(t.totalStake, 'USD')} · Payout {formatMoney(t.totalPayout, 'USD')}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color?: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted uppercase tracking-widest">{label}</div>
        <Icon size={16} className="text-muted" />
      </div>
      <div className={`mono text-2xl font-bold mt-2 ${color || ''}`}>{value}</div>
    </div>
  );
}
