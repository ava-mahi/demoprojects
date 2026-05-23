import { prisma } from '../../lib/prisma';
import { BinanceFeed } from './binanceFeed';
import { SimFeed } from './simFeed';
import type { Candle, Tick } from './types';
import { getHub } from '../socket';

type Bar = { openTime: number; open: number; high: number; low: number; close: number };

const TF_MS: Record<'1m' | '5m' | '15m', number> = {
  '1m': 60_000,
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
};

export class MarketEngine {
  binance?: BinanceFeed;
  sim?: SimFeed;
  lastTick = new Map<string, Tick>();
  bars = new Map<string, Map<'1m' | '5m' | '15m', Bar>>();
  // ring buffer per (symbol, tf)
  history = new Map<string, Map<'1m' | '5m' | '15m', Bar[]>>();
  private subs: Array<(t: Tick) => void> = [];
  private candleSubs: Array<(c: Candle, closed: boolean) => void> = [];
  private flushTimer?: NodeJS.Timeout;
  private alertCheckTimer?: NodeJS.Timeout;

  async init() {
    const assets = await prisma.asset.findMany({ where: { enabled: true } });
    const binanceMap: Record<string, string> = {};
    const simConfs: { symbol: string; price: number; vol: number }[] = [];
    for (const a of assets) {
      if (a.feed === 'binance' && a.feedSym) {
        binanceMap[a.feedSym.toLowerCase()] = a.symbol;
      } else {
        simConfs.push({ symbol: a.symbol, price: a.priceHint, vol: a.volatility });
      }
    }
    if (Object.keys(binanceMap).length) {
      this.binance = new BinanceFeed(binanceMap);
      this.binance.onTick((t) => this.onTick(t));
      this.binance.start();
    }
    if (simConfs.length) {
      this.sim = new SimFeed(simConfs);
      this.sim.onTick((t) => this.onTick(t));
      this.sim.start();
    }
    // Seed sim prices into lastTick immediately
    for (const c of simConfs) {
      this.lastTick.set(c.symbol, { symbol: c.symbol, price: c.price, ts: Date.now() });
    }
    // Periodic flush of closed candles to DB
    this.flushTimer = setInterval(() => this.flushClosedBars().catch(() => {}), 30_000);
    // Check alerts every 5 seconds instead of every tick
    this.alertCheckTimer = setInterval(() => this.checkAllAlerts().catch(() => {}), 5_000);
  }

  stop() {
    this.binance?.stop();
    this.sim?.stop();
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.alertCheckTimer) clearInterval(this.alertCheckTimer);
  }

  current(symbol: string) {
    return this.lastTick.get(symbol)?.price;
  }

  onTick(cb: (t: Tick) => void): void;
  onTick(t: Tick): void;
  onTick(arg: any): any {
    if (typeof arg === 'function') {
      this.subs.push(arg);
      return;
    }
    const t: Tick = arg;
    this.lastTick.set(t.symbol, t);
    this.updateBars(t);
    for (const cb of this.subs) cb(t);
  }

  onCandle(cb: (c: Candle, closed: boolean) => void) {
    this.candleSubs.push(cb);
  }

  private updateBars(t: Tick) {
    let perTf = this.bars.get(t.symbol);
    if (!perTf) {
      perTf = new Map();
      this.bars.set(t.symbol, perTf);
    }
    let perTfHist = this.history.get(t.symbol);
    if (!perTfHist) {
      perTfHist = new Map();
      this.history.set(t.symbol, perTfHist);
    }
    (Object.keys(TF_MS) as Array<'1m' | '5m' | '15m'>).forEach((tf) => {
      const span = TF_MS[tf];
      const openTime = Math.floor(t.ts / span) * span;
      let bar = perTf!.get(tf);
      if (!bar || bar.openTime !== openTime) {
        // close old bar
        if (bar) {
          const closed = { ...bar };
          let hist = perTfHist!.get(tf);
          if (!hist) {
            hist = [];
            perTfHist!.set(tf, hist);
          }
          hist.push(closed);
          if (hist.length > 1000) hist.shift();
          for (const cb of this.candleSubs) cb({ symbol: t.symbol, tf, ...closed }, true);
        }
        bar = { openTime, open: t.price, high: t.price, low: t.price, close: t.price };
        perTf!.set(tf, bar);
      } else {
        bar.high = Math.max(bar.high, t.price);
        bar.low = Math.min(bar.low, t.price);
        bar.close = t.price;
      }
      // emit live (non-closed) bar
      for (const cb of this.candleSubs) cb({ symbol: t.symbol, tf, ...bar }, false);
    });
  }

  /** Get last N candles, synthesized from in-memory history + current. */
  getHistory(symbol: string, tf: '1m' | '5m' | '15m', n = 200): Candle[] {
    const hist = this.history.get(symbol)?.get(tf) || [];
    const cur = this.bars.get(symbol)?.get(tf);
    const out = hist.slice(-n).map((b) => ({ symbol, tf, ...b }));
    if (cur) out.push({ symbol, tf, ...cur });
    return out;
  }

  private async checkAllAlerts() {
    const alerts = await prisma.priceAlert.findMany({ where: { fired: false }, include: { asset: { select: { symbol: true } } } });
    for (const alert of alerts) {
      const tick = this.lastTick.get(alert.asset.symbol);
      if (!tick) continue;
      const triggered = (alert.direction === 'ABOVE' && tick.price >= alert.price) || (alert.direction === 'BELOW' && tick.price <= alert.price);
      if (triggered) {
        await prisma.priceAlert.update({ where: { id: alert.id }, data: { fired: true, firedAt: new Date() } });
        await prisma.notification.create({
          data: { userId: alert.userId, kind: 'SYSTEM', title: `Price Alert: ${alert.asset.symbol}`, body: `${alert.asset.symbol} ${alert.direction === 'ABOVE' ? '≥' : '≤'} ${alert.price}` },
        });
        const hub = getHub();
        hub?.notifyUser(alert.userId, 'event', { type: 'alert:fired', symbol: alert.asset.symbol, direction: alert.direction, price: alert.price });
      }
    }
  }

  private async flushClosedBars() {
    const assets = await prisma.asset.findMany({ select: { id: true, symbol: true } });
    const symToId = new Map(assets.map((a: any) => [a.symbol, a.id]));
    for (const [symbol, perTf] of this.history.entries()) {
      const assetId = symToId.get(symbol);
      if (!assetId) continue;
      for (const [tf, hist] of perTf.entries()) {
        const last5 = hist.slice(-5);
        for (const b of last5) {
          try {
            await prisma.candle.upsert({
              where: { assetId_tf_openTime: { assetId, tf, openTime: new Date(b.openTime) } },
              update: { open: b.open, high: b.high, low: b.low, close: b.close },
              create: { assetId, tf, openTime: new Date(b.openTime), open: b.open, high: b.high, low: b.low, close: b.close },
            });
          } catch {}
        }
      }
    }
  }
}

let _engine: MarketEngine | null = null;
export function getEngine() {
  return _engine;
}
export function setEngine(e: MarketEngine) {
  _engine = e;
}
