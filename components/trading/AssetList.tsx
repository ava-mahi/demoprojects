'use client';
import { useEffect, useMemo, useState } from 'react';
import { Search, TrendingUp, TrendingDown, Star } from 'lucide-react';
import { useMarket, type AssetSummary } from '@/store/market';
import { getSocket } from '@/lib/socket-client';
import { cn, formatPrice } from '@/lib/utils';

const TABS: Array<{ key: AssetSummary['kind'] | 'ALL' | 'WATCHLIST'; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'WATCHLIST', label: '⭐ Watchlist' },
  { key: 'CRYPTO', label: 'Crypto' },
  { key: 'FOREX', label: 'Forex' },
  { key: 'STOCK', label: 'Stocks' },
  { key: 'COMMODITY', label: 'Commodities' },
];

export function AssetList() {
  const assets = useMarket((s) => s.assets);
  const setAssets = useMarket((s) => s.setAssets);
  const selected = useMarket((s) => s.selected);
  const setSelected = useMarket((s) => s.setSelected);
  const prices = useMarket((s) => s.prices);
  const prevPrices = useMarket((s) => s.prevPrices);
  const watchlist = useMarket((s) => s.watchlist);
  const toggleWatch = useMarket((s) => s.toggleWatch);
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('ALL');
  const [q, setQ] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await fetch('/api/assets', { cache: 'no-store' });
      const j = await r.json();
      if (cancelled) return;
      setAssets(j.assets);
      if (!selected && j.assets.length) setSelected(j.assets[0].symbol);
      const s = getSocket();
      for (const a of j.assets) s.emit('subscribe:symbol', a.symbol);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let list = assets;
    if (tab === 'WATCHLIST') list = list.filter((a) => watchlist.has(a.symbol));
    else if (tab !== 'ALL') list = list.filter((a) => a.kind === tab);
    if (q) list = list.filter((a) => a.symbol.toLowerCase().includes(q.toLowerCase()) || a.name.toLowerCase().includes(q.toLowerCase()));
    return list;
  }, [assets, tab, q, watchlist]);

  const handleToggleWatch = async (sym: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const wasWatched = watchlist.has(sym);
    toggleWatch(sym);
    try {
      if (wasWatched) await fetch(`/api/me/watchlist?symbol=${sym}`, { method: 'DELETE' });
      else await fetch('/api/me/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ symbol: sym }) });
    } catch {}
  };

  return (
    <div className="glass rounded-2xl flex flex-col h-full min-h-0">
      <div className="p-3 border-b border-line">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-8" placeholder="Search markets" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="mt-2 flex gap-1 overflow-auto">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={cn('px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap',
              tab === t.key ? 'bg-brand/20 text-brand' : 'text-muted hover:text-text hover:bg-white/5')}>{t.label}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {filtered.map((a) => {
          const cur = prices[a.symbol] ?? a.price;
          const prev = prevPrices[a.symbol] ?? cur;
          const diff = cur - prev;
          const pct = prev ? (diff / prev) * 100 : 0;
          const up = diff >= 0;
          const active = selected === a.symbol;
          const watched = watchlist.has(a.symbol);
          return (
            <button key={a.symbol} onClick={() => setSelected(a.symbol)}
              className={cn('w-full flex items-center gap-2 px-3 py-2.5 border-b border-line/60 text-left transition-colors',
                active ? 'bg-brand/10' : 'hover:bg-white/[0.03]')}>
              <button onClick={(e) => handleToggleWatch(a.symbol, e)} className="shrink-0 p-0.5 hover:scale-110 transition-transform">
                <Star size={14} className={cn('transition-colors', watched ? 'fill-yellow-400 text-yellow-400' : 'text-muted')} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{a.symbol}</div>
                <div className="text-[11px] text-muted truncate">{a.name}</div>
              </div>
              <div className="text-right shrink-0">
                <div className={cn('text-sm mono font-semibold', up ? 'text-up' : 'text-down')}>{formatPrice(cur, a.precision)}</div>
                <div className={cn('text-[11px] mono flex items-center justify-end gap-0.5', up ? 'text-up' : 'text-down')}>
                  {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {pct.toFixed(2)}%
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
