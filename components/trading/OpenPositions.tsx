'use client';
import { useEffect, useState } from 'react';
import { useMarket } from '@/store/market';
import { useAuth } from '@/store/auth';
import { cn, formatMoney, formatPrice } from '@/lib/utils';
import { toast } from 'sonner';

type Position = {
  id: string; symbol: string; precision: number; side: 'UP' | 'DOWN';
  qty: string; openPrice: number; closePrice: number | null; pnlLive: number;
  status: 'OPEN' | 'CLOSED';
};

export function OpenPositions({ refresh }: { refresh?: number }) {
  const mode = useAuth((s) => s.mode);
  const prices = useMarket((s) => s.prices);
  const [tab, setTab] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [items, setItems] = useState<Position[]>([]);

  async function load() {
    const r = await fetch(`/api/positions?status=${tab}`, { cache: 'no-store' });
    const j = await r.json();
    setItems(j.positions || []);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [mode, tab, refresh]);

  async function close(id: string) {
    const r = await fetch(`/api/positions/${id}/close`, { method: 'POST' });
    const j = await r.json();
    if (!r.ok) return toast.error(j.error || 'Close failed');
    toast.success(`Closed · P/L ${Number(j.pnl).toFixed(2)}`);
    load();
  }

  return (
    <div className="glass rounded-2xl flex flex-col h-full min-h-0">
      <div className="px-3 pt-3 flex items-center gap-2 border-b border-line">
        {(['OPEN', 'CLOSED'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn('px-3 h-9 text-xs font-semibold rounded-t-md', tab === t ? 'text-text border-b-2 border-brand' : 'text-muted hover:text-text')}>{t === 'OPEN' ? 'Open positions' : 'Closed'}</button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {items.length === 0 && <div className="p-6 text-sm text-muted text-center">No positions.</div>}
        {items.map((p) => {
          const cur = prices[p.symbol] ?? p.openPrice;
          const pnl = p.status === 'OPEN'
            ? (p.side === 'UP' ? (cur - p.openPrice) : (p.openPrice - cur)) * Number(p.qty)
            : p.pnlLive;
          const up = pnl >= 0;
          return (
            <div key={p.id} className="px-3 py-2.5 border-b border-line/60 flex items-center gap-3">
              <div className={cn('w-1.5 h-10 rounded-full', p.side === 'UP' ? 'bg-up' : 'bg-down')} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{p.symbol}</span>
                  <span className={cn('chip', p.side === 'UP' ? 'chip-up' : 'chip-down')}>{p.side === 'UP' ? 'LONG' : 'SHORT'}</span>
                </div>
                <div className="text-[11px] text-muted mt-0.5 mono">
                  Qty {Number(p.qty).toFixed(4)} · Open {formatPrice(p.openPrice, p.precision)} {p.closePrice ? `· Close ${formatPrice(p.closePrice, p.precision)}` : ''}
                </div>
              </div>
              <div className="text-right">
                <div className={cn('mono text-sm font-bold', up ? 'text-up' : 'text-down')}>{up ? '+' : ''}{formatMoney(pnl, 'USD')}</div>
                {p.status === 'OPEN' && <button onClick={() => close(p.id)} className="mt-1 text-xs btn btn-ghost h-7 px-2">Close</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
