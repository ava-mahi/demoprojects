import type { PriceFeed, Tick } from './types';

type SimConf = { symbol: string; price: number; vol: number };

export class SimFeed implements PriceFeed {
  private timers: NodeJS.Timeout[] = [];
  private prices = new Map<string, number>();
  private vols = new Map<string, number>();
  private cbs: ((t: Tick) => void)[] = [];

  constructor(private confs: SimConf[]) {
    for (const c of confs) {
      this.prices.set(c.symbol, c.price);
      this.vols.set(c.symbol, c.vol);
    }
  }

  start() {
    for (const c of this.confs) {
      const t = setInterval(() => this.step(c.symbol), 500);
      this.timers.push(t);
    }
  }

  stop() {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }

  onTick(cb: (t: Tick) => void) {
    this.cbs.push(cb);
  }

  current(symbol: string) {
    return this.prices.get(symbol);
  }

  private step(symbol: string) {
    const p = this.prices.get(symbol)!;
    const v = this.vols.get(symbol)!;
    // GBM step: dS = mu*S*dt + sigma*S*dW
    const dt = 0.5; // seconds
    const drift = 0; // no drift
    const shock = (Math.random() * 2 - 1) * v * Math.sqrt(dt);
    const next = Math.max(p * (1 + drift * dt + shock), 0.0001);
    this.prices.set(symbol, next);
    const tick: Tick = { symbol, price: next, ts: Date.now() };
    for (const cb of this.cbs) cb(tick);
  }
}
