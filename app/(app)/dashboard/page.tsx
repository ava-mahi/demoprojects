'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth, currentAccount } from '@/store/auth';
import { useMarket } from '@/store/market';
import { formatMoney, formatPrice, cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  const user = useAuth((s) => s.user);
  const mode = useAuth((s) => s.mode);
  const acct = user ? currentAccount(user, mode) : null;
  const assets = useMarket((s) => s.assets);
  const prices = useMarket((s) => s.prices);
  const setAssets = useMarket((s) => s.setAssets);
  const [stats, setStats] = useState<{ wins: number; losses: number; pnl: number }>({ wins: 0, losses: 0, pnl: 0 });

  useEffect(() => {
    fetch('/api/assets', { cache: 'no-store' }).then((r) => r.json()).then((j) => setAssets(j.assets || []));
    fetch('/api/profile', { cache: 'no-store' }).then((r) => r.json()).then((j) => {
      let wins = 0, losses = 0, pnl = 0;
      for (const s of (j.stats || [])) {
        if (s.status === 'WON') { wins = s.count; pnl += Number(s.totalPayout) - Number(s.totalStake); }
        if (s.status === 'LOST') { losses = s.count; pnl -= Number(s.totalStake); }
      }
      setStats({ wins, losses, pnl });
    }).catch(() => {});
  }, [setAssets]);

  const topMovers = [...assets]
    .map((a) => ({ ...a, cur: prices[a.symbol] ?? a.price }))
    .slice(0, 8);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
          <p className="text-sm text-muted mt-1">Here's a quick look at your trading.</p>
        </div>
        <Link href="/trade" className="btn btn-primary">Open trading <ArrowRight size={16} /></Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        <div className="glass rounded-2xl p-5">
          <div className="text-xs text-muted uppercase tracking-widest">{mode} Balance</div>
          <div className="mono text-3xl font-bold mt-2">{acct ? formatMoney(acct.balance, acct.currency) : '—'}</div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-xs text-muted uppercase tracking-widest">Net P/L</div>
          <div className={cn('mono text-3xl font-bold mt-2', stats.pnl >= 0 ? 'text-up' : 'text-down')}>
            {stats.pnl >= 0 ? '+' : ''}{formatMoney(stats.pnl, acct?.currency || 'USD')}
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-xs text-muted uppercase tracking-widest">Wins</div>
          <div className="mono text-3xl font-bold mt-2 text-up">{stats.wins}</div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-xs text-muted uppercase tracking-widest">Losses</div>
          <div className="mono text-3xl font-bold mt-2 text-down">{stats.losses}</div>
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Markets</h2>
          <Link href="/trade" className="text-xs text-brand hover:underline">View all →</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {topMovers.map((a) => {
            const up = (a.cur ?? a.price) >= a.price;
            return (
              <Link href="/trade" key={a.symbol} className="rounded-xl p-4 bg-white/[0.03] border border-line hover:border-brand/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold">{a.symbol}</div>
                    <div className="text-[11px] text-muted">{a.name}</div>
                  </div>
                  <span className={cn('chip', up ? 'chip-up' : 'chip-down')}>{up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{a.kind}</span>
                </div>
                <div className="mono text-xl font-semibold mt-3">{formatPrice(a.cur, a.precision)}</div>
                <div className="text-[11px] text-muted mt-0.5">Payout +{a.payoutPct}%</div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
