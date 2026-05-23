'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/store/auth';
import { cn, formatMoney, formatPrice, timeAgo } from '@/lib/utils';

export default function HistoryPage() {
  const mode = useAuth((s) => s.mode);
  const [trades, setTrades] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/trades?mode=${mode}&status=CLOSED&take=200`, { cache: 'no-store' })
      .then((r) => r.json()).then((j) => setTrades(j.trades || []));
  }, [mode]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto pb-24 md:pb-6">
      <h1 className="text-2xl font-bold">Trade history · {mode}</h1>
      <div className="mt-5 glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted uppercase tracking-widest text-left">
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Dir</th>
              <th className="px-4 py-3">Stake</th>
              <th className="px-4 py-3">Open</th>
              <th className="px-4 py-3">Close</th>
              <th className="px-4 py-3">Result</th>
              <th className="px-4 py-3 text-right">P/L</th>
              <th className="px-4 py-3 text-right">When</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-muted text-center">No closed trades.</td></tr>
            )}
            {trades.map((t) => {
              const pnl = t.status === 'WON' ? Number(t.payout) - Number(t.stake) : t.status === 'LOST' ? -Number(t.stake) : 0;
              return (
                <tr key={t.id} className="border-t border-line/60">
                  <td className="px-4 py-3 font-semibold">{t.symbol}</td>
                  <td className="px-4 py-3"><span className={cn('chip', t.direction === 'UP' ? 'chip-up' : 'chip-down')}>{t.direction}</span></td>
                  <td className="px-4 py-3 mono">{formatMoney(t.stake, 'USD')}</td>
                  <td className="px-4 py-3 mono">{formatPrice(t.openPrice, t.precision)}</td>
                  <td className="px-4 py-3 mono">{t.closePrice ? formatPrice(t.closePrice, t.precision) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('chip', t.status === 'WON' ? 'chip-up' : t.status === 'LOST' ? 'chip-down' : '')}>{t.status}</span>
                  </td>
                  <td className={cn('px-4 py-3 mono text-right font-semibold', pnl >= 0 ? 'text-up' : 'text-down')}>{pnl >= 0 ? '+' : ''}{formatMoney(pnl, 'USD')}</td>
                  <td className="px-4 py-3 text-right text-muted">{timeAgo(t.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
