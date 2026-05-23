'use client';
import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Timer, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth, currentAccount } from '@/store/auth';
import { useMarket } from '@/store/market';
import { cn, formatMoney, formatPrice } from '@/lib/utils';

const EXPIRIES = [
  { sec: 30, label: '30s' },
  { sec: 60, label: '1m' },
  { sec: 120, label: '2m' },
  { sec: 300, label: '5m' },
  { sec: 900, label: '15m' },
];

const AMOUNTS = [5, 10, 25, 50, 100, 250, 500, 1000];

export function TradePanel({ tradeMode = 'binary', onTradePlaced }: { tradeMode?: 'binary' | 'spot'; onTradePlaced?: () => void }) {
  const user = useAuth((s) => s.user);
  const mode = useAuth((s) => s.mode);
  const selected = useMarket((s) => s.selected);
  const assets = useMarket((s) => s.assets);
  const prices = useMarket((s) => s.prices);
  const asset = assets.find((a) => a.symbol === selected);
  const acct = user ? currentAccount(user, mode) : null;

  const [amount, setAmount] = useState(10);
  const [expiry, setExpiry] = useState(60);
  const [busy, setBusy] = useState(false);

  const payoutPct = asset?.payoutPct ?? 85;
  const profit = (amount * payoutPct) / 100;
  const price = selected ? prices[selected] : undefined;

  async function place(direction: 'UP' | 'DOWN') {
    if (!asset || !acct) return;
    if (busy) return;
    setBusy(true);
    try {
      if (tradeMode === 'binary') {
        const r = await fetch('/api/trades', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: asset.symbol, direction, stake: amount, expirySec: expiry, mode }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Trade failed');
        toast.success(`${direction} placed · ${expiry}s · ${formatMoney(amount, acct.currency)}`);
      } else {
        const r = await fetch('/api/positions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: asset.symbol, side: direction, notional: amount, mode }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Order failed');
        toast.success(`${direction === 'UP' ? 'Long' : 'Short'} opened on ${asset.symbol}`);
      }
      onTradePlaced?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!asset) {
    return <div className="glass rounded-2xl p-6 text-sm text-muted">Select a market to start trading.</div>;
  }

  return (
    <div className="glass rounded-2xl p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] text-muted uppercase tracking-widest">{tradeMode === 'binary' ? 'Binary' : 'Spot'} · {asset.symbol}</div>
          <div className="mono text-2xl font-bold mt-0.5">{price ? formatPrice(price, asset.precision) : '—'}</div>
        </div>
        {tradeMode === 'binary' && (
          <div className="text-right">
            <div className="text-[11px] text-muted uppercase tracking-widest">Payout</div>
            <div className="text-xl font-bold text-up">+{payoutPct}%</div>
          </div>
        )}
      </div>

      <div>
        <div className="text-[11px] text-muted uppercase tracking-widest mb-1.5 flex items-center gap-1"><DollarSign size={12} /> {tradeMode === 'binary' ? 'Stake' : 'Notional'}</div>
        <div className="relative">
          <input type="number" min={1} step={1} value={amount} onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))} className="input pr-14 mono" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{acct?.currency || 'USD'}</span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {AMOUNTS.map((a) => (
            <button key={a} onClick={() => setAmount(a)} className={cn('h-8 rounded-md text-xs mono', amount === a ? 'bg-brand/20 text-brand' : 'bg-white/5 text-muted hover:text-text')}>{a}</button>
          ))}
        </div>
      </div>

      {tradeMode === 'binary' && (
        <div>
          <div className="text-[11px] text-muted uppercase tracking-widest mb-1.5 flex items-center gap-1"><Timer size={12} /> Expiry</div>
          <div className="grid grid-cols-5 gap-1.5">
            {EXPIRIES.map((e) => (
              <button key={e.sec} onClick={() => setExpiry(e.sec)} className={cn('h-9 rounded-md text-xs font-semibold', expiry === e.sec ? 'bg-brand/20 text-brand' : 'bg-white/5 text-muted hover:text-text')}>{e.label}</button>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {tradeMode === 'binary' && (
          <motion.div key="pnl" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-white/[0.03] border border-line p-3 flex justify-between items-center">
            <div>
              <div className="text-[11px] text-muted uppercase tracking-widest">If you win</div>
              <div className="mono text-lg font-bold text-up">+{formatMoney(profit, acct?.currency || 'USD')}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-muted uppercase tracking-widest">If you lose</div>
              <div className="mono text-lg font-bold text-down">−{formatMoney(amount, acct?.currency || 'USD')}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-2.5">
        <motion.button whileTap={{ scale: 0.97 }} disabled={busy || !acct} onClick={() => place('UP')} className="btn btn-up h-14 text-base">
          <ArrowUp size={20} /> {tradeMode === 'binary' ? 'UP' : 'LONG'}
        </motion.button>
        <motion.button whileTap={{ scale: 0.97 }} disabled={busy || !acct} onClick={() => place('DOWN')} className="btn btn-down h-14 text-base">
          <ArrowDown size={20} /> {tradeMode === 'binary' ? 'DOWN' : 'SHORT'}
        </motion.button>
      </div>

      {acct && (
        <div className="text-xs text-muted flex justify-between">
          <span>{mode} balance</span>
          <span className="mono text-text">{formatMoney(acct.balance, acct.currency)}</span>
        </div>
      )}
    </div>
  );
}
