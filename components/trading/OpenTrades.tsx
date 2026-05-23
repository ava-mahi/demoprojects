'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMarket } from '@/store/market';
import { cn, formatMoney, formatPrice, timeAgo } from '@/lib/utils';
import { useAuth } from '@/store/auth';

type Trade = {
  id: string; symbol: string; precision: number; kind: 'BINARY' | 'SPOT';
  direction: 'UP' | 'DOWN' | null;
  stake: string; payoutPct: number;
  openPrice: number; closePrice: number | null; payout: string | null;
  status: 'OPEN' | 'WON' | 'LOST' | 'TIE' | 'CLOSED' | 'CANCELLED';
  expiresAt: string | null; createdAt: string; resolvedAt: string | null;
};

export function OpenTrades({ refresh }: { refresh?: number }) {
  const mode = useAuth((s) => s.mode);
  const prices = useMarket((s) => s.prices);
  const [tab, setTab] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [now, setNow] = useState(Date.now());

  async function load() {
    const r = await fetch(`/api/trades?mode=${mode}&status=${tab}&take=50`, { cache: 'no-store' });
    const j = await r.json();
    setTrades(j.trades || []);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [mode, tab, refresh]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => { clearInterval(t); };
    // eslint-disable-next-line
  }, [mode, tab]);

  return (
    <div className="glass rounded-2xl flex flex-col h-full min-h-0">
      <div className="px-3 pt-3 flex items-center gap-2 border-b border-line">
        {(['OPEN', 'CLOSED'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn('px-3 h-9 text-xs font-semibold rounded-t-md', tab === t ? 'text-text border-b-2 border-brand' : 'text-muted hover:text-text')}>{t === 'OPEN' ? 'Open trades' : 'History'}</button>
        ))}
        <button onClick={load} className="ml-auto text-xs text-muted hover:text-text">Refresh</button>
      </div>
      <div className="flex-1 overflow-auto">
        {trades.length === 0 && <div className="p-6 text-sm text-muted text-center">No trades yet.</div>}
        <AnimatePresence initial={false}>
          {trades.map((t) => {
            const cur = prices[t.symbol] ?? t.openPrice;
            const remainMs = t.expiresAt ? new Date(t.expiresAt).getTime() - now : 0;
            const remain = Math.max(0, Math.ceil(remainMs / 1000));
            const winning = t.direction === 'UP' ? cur > t.openPrice : cur < t.openPrice;
            return (
              <motion.div key={t.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="px-3 py-2.5 border-b border-line/60 flex items-center gap-3">
                <div className={cn('w-1.5 h-10 rounded-full', t.direction === 'UP' ? 'bg-up' : 'bg-down')} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{t.symbol}</span>
                    <span className={cn('chip', t.direction === 'UP' ? 'chip-up' : 'chip-down')}>{t.direction}</span>
                    {t.status === 'WON' && <span className="chip chip-up">+{formatMoney(Number(t.payout) - Number(t.stake), 'USD')}</span>}
                    {t.status === 'LOST' && <span className="chip chip-down">−{formatMoney(t.stake, 'USD')}</span>}
                    {t.status === 'TIE' && <span className="chip">REFUND</span>}
                    {t.status === 'CLOSED' && <span className="chip">CLOSED</span>}
                  </div>
                  <div className="text-[11px] text-muted mt-0.5 mono flex items-center gap-3">
                    <span>Stake {formatMoney(t.stake, 'USD')}</span>
                    <span>Open {formatPrice(t.openPrice, t.precision)}</span>
                    {t.closePrice != null && <span>Close {formatPrice(t.closePrice, t.precision)}</span>}
                    <span>{timeAgo(t.createdAt)}</span>
                  </div>
                </div>
                {t.status === 'OPEN' && t.expiresAt && (
                  <div className="text-right">
                    <div className={cn('mono text-sm font-bold', winning ? 'text-up' : 'text-down')}>{remain}s</div>
                    <div className="text-[11px] text-muted mono">{formatPrice(cur, t.precision)}</div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
