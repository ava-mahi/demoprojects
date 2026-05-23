'use client';
import { useEffect } from 'react';
import { useAuth } from '@/store/auth';
import { useMarket } from '@/store/market';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const refresh = useAuth((s) => s.refresh);
  const applyPriceBatch = useMarket((s) => s.applyPriceBatch);
  const setWatchlist = useMarket((s) => s.setWatchlist);

  useEffect(() => {
    refresh();
    // Load watchlist
    fetch('/api/me/watchlist', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => setWatchlist((j.items || []).map((x: any) => x.symbol)))
      .catch(() => {});

    // HTTP Polling for price updates (replaces WebSocket)
    const pollPrices = async () => {
      try {
        const res = await fetch('/api/market/prices');
        if (res.ok) {
          const { prices } = await res.json();
          const priceMap: Record<string, number> = {};
          prices.forEach((p: any) => {
            priceMap[p.symbol] = parseFloat(p.price);
          });
          applyPriceBatch(priceMap);
        }
      } catch (err) {
        // Silently fail - will retry on next interval
      }
    };

    // Poll every 3 seconds
    pollPrices(); // Initial fetch
    const interval = setInterval(pollPrices, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [refresh, applyPriceBatch, setWatchlist]);

  return <>{children}</>;
}
