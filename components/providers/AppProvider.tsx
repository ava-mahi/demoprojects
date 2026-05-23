'use client';
import { useEffect } from 'react';
import { useAuth } from '@/store/auth';
import { useMarket } from '@/store/market';
import { getSocket } from '@/lib/socket-client';
import { toast } from 'sonner';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const refresh = useAuth((s) => s.refresh);
  const updateBalance = useAuth((s) => s.updateBalance);
  const applyPriceBatch = useMarket((s) => s.applyPriceBatch);
  const setWatchlist = useMarket((s) => s.setWatchlist);

  useEffect(() => {
    refresh();
    // Load watchlist
    fetch('/api/me/watchlist', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => setWatchlist((j.items || []).map((x: any) => x.symbol)))
      .catch(() => {});

    const s = getSocket();

    // Buffer ticks and flush per animation frame to avoid React thrash.
    const buf: Record<string, number> = {};
    let raf: number | null = null;
    const flush = () => {
      raf = null;
      if (Object.keys(buf).length === 0) return;
      const snapshot = { ...buf };
      for (const k of Object.keys(buf)) delete buf[k];
      applyPriceBatch(snapshot);
    };
    const onTick = (t: { symbol: string; price: number }) => {
      buf[t.symbol] = t.price;
      if (raf == null) raf = requestAnimationFrame(flush);
    };

    s.on('tick', onTick);
    s.on('balance', (p: { accountId: string; balance: string }) => updateBalance(p.accountId, p.balance));
    s.on('event', (p: any) => {
      if (p?.type === 'trade:result') {
        if (p.status === 'WON') toast.success(`Trade WON — payout ${Number(p.payout).toFixed(2)}`);
        else if (p.status === 'LOST') toast.error('Trade LOST');
        else if (p.status === 'TIE') toast('Trade tied — refunded');
      } else if (p?.type === 'alert:fired') {
        toast(`Price alert: ${p.symbol} ${p.direction === 'ABOVE' ? '≥' : '≤'} ${p.price}`);
      } else if (p?.type === 'broadcast') {
        toast(p.title || 'Announcement', { description: p.body });
      }
    });
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
      s.off('tick', onTick);
      s.off('balance');
      s.off('event');
    };
  }, [refresh, applyPriceBatch, setWatchlist, updateBalance]);

  return <>{children}</>;
}
