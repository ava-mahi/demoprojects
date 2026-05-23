'use client';
import { useState } from 'react';
import { AssetList } from '@/components/trading/AssetList';
import { Chart } from '@/components/trading/Chart';
import { TradePanel } from '@/components/trading/TradePanel';
import { OpenTrades } from '@/components/trading/OpenTrades';
import { OpenPositions } from '@/components/trading/OpenPositions';
import { useMarket } from '@/store/market';
import { cn, formatPrice } from '@/lib/utils';

export default function TradePage() {
  const selected = useMarket((s) => s.selected);
  const assets = useMarket((s) => s.assets);
  const prices = useMarket((s) => s.prices);
  const prevPrices = useMarket((s) => s.prevPrices);
  const asset = assets.find((a) => a.symbol === selected);
  const [mode, setMode] = useState<'binary' | 'spot'>('binary');
  const [tf, setTf] = useState<'1m' | '5m' | '15m'>('1m');
  const [refresh, setRefresh] = useState(0);

  const cur = selected ? prices[selected] : undefined;
  const prev = selected ? prevPrices[selected] : undefined;
  const diff = cur && prev ? cur - prev : 0;
  const pct = cur && prev ? (diff / prev) * 100 : 0;
  const up = diff >= 0;

  return (
    <div className="h-[calc(100vh-64px)] grid grid-cols-12 gap-3 p-3 pb-20 md:pb-3">
      {/* Asset list */}
      <div className="hidden md:block md:col-span-3 lg:col-span-2 h-full min-h-0">
        <AssetList />
      </div>
      {/* Chart + bottom */}
      <div className="col-span-12 md:col-span-6 lg:col-span-7 flex flex-col gap-3 min-h-0">
        <div className="glass rounded-2xl flex flex-col min-h-0 flex-1">
          {/* Chart header */}
          <div className="flex items-center justify-between p-3 border-b border-line">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-sm font-bold">{asset?.symbol ?? '—'}</div>
                <div className="text-[11px] text-muted">{asset?.name ?? ''}</div>
              </div>
              {cur != null && asset && (
                <div className="text-right">
                  <div className={cn('mono text-lg font-bold', up ? 'text-up' : 'text-down')}>{formatPrice(cur, asset.precision)}</div>
                  <div className={cn('text-[11px] mono', up ? 'text-up' : 'text-down')}>{up ? '+' : ''}{pct.toFixed(2)}%</div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white/5 border border-line rounded-md overflow-hidden">
                {(['binary', 'spot'] as const).map((m) => (
                  <button key={m} onClick={() => setMode(m)} className={cn('px-2.5 h-8 text-xs font-semibold', mode === m ? 'bg-brand/20 text-brand' : 'text-muted hover:text-text')}>{m.toUpperCase()}</button>
                ))}
              </div>
              <div className="flex items-center bg-white/5 border border-line rounded-md overflow-hidden">
                {(['1m', '5m', '15m'] as const).map((t) => (
                  <button key={t} onClick={() => setTf(t)} className={cn('px-2.5 h-8 text-xs', tf === t ? 'bg-brand/20 text-brand' : 'text-muted hover:text-text')}>{t}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0 p-2">
            {selected && <Chart symbol={selected} tf={tf} mode={mode === 'spot' ? 'candles' : 'area'} />}
          </div>
        </div>
        <div className="h-56 min-h-0">
          {mode === 'binary' ? <OpenTrades refresh={refresh} /> : <OpenPositions refresh={refresh} />}
        </div>
      </div>
      {/* Trade panel */}
      <div className="col-span-12 md:col-span-3 lg:col-span-3 min-h-0">
        <TradePanel tradeMode={mode} onTradePlaced={() => setRefresh((r) => r + 1)} />
      </div>
      {/* Mobile asset selector */}
      <div className="col-span-12 md:hidden h-72">
        <AssetList />
      </div>
    </div>
  );
}
