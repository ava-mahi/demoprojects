'use client';
import { create } from 'zustand';

export type AssetSummary = {
  id: string; symbol: string; name: string;
  kind: 'FOREX' | 'CRYPTO' | 'STOCK' | 'COMMODITY';
  payoutPct: number; precision: number; price: number;
};

type State = {
  assets: AssetSummary[];
  prices: Record<string, number>;
  prevPrices: Record<string, number>;
  selected: string | null;
  watchlist: Set<string>;
  setAssets: (a: AssetSummary[]) => void;
  setSelected: (s: string) => void;
  applyPriceBatch: (batch: Record<string, number>) => void;
  setWatchlist: (syms: string[]) => void;
  toggleWatch: (sym: string) => void;
};

export const useMarket = create<State>((set, get) => ({
  assets: [],
  prices: {},
  prevPrices: {},
  selected: null,
  watchlist: new Set<string>(),
  setAssets: (a) => {
    const prices: Record<string, number> = {};
    for (const x of a) prices[x.symbol] = x.price;
    set({ assets: a, prices });
  },
  setSelected: (s) => set({ selected: s }),
  applyPriceBatch: (batch) => {
    const cur = get().prices;
    const prevOut: Record<string, number> = { ...get().prevPrices };
    const nextOut: Record<string, number> = { ...cur };
    for (const sym of Object.keys(batch)) {
      prevOut[sym] = cur[sym] ?? batch[sym];
      nextOut[sym] = batch[sym];
    }
    set({ prices: nextOut, prevPrices: prevOut });
  },
  setWatchlist: (syms) => set({ watchlist: new Set(syms) }),
  toggleWatch: (sym) => {
    const w = new Set(get().watchlist);
    if (w.has(sym)) w.delete(sym); else w.add(sym);
    set({ watchlist: w });
  },
}));
