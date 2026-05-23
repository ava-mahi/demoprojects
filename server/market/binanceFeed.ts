import WebSocket from 'ws';
import type { PriceFeed, Tick } from './types';

/** Map e.g. "btcusdt" -> "BTC/USDT" */
export class BinanceFeed implements PriceFeed {
  private ws?: WebSocket;
  private prices = new Map<string, number>();
  private cbs: ((t: Tick) => void)[] = [];
  private reconnectMs = 2000;
  private alive = false;

  constructor(private mapping: Record<string, string>) {}

  start() {
    this.alive = true;
    this.connect();
  }

  stop() {
    this.alive = false;
    this.ws?.close();
  }

  onTick(cb: (t: Tick) => void) {
    this.cbs.push(cb);
  }

  current(symbol: string) {
    return this.prices.get(symbol);
  }

  private connect() {
    const streams = Object.keys(this.mapping).map((s) => `${s}@trade`).join('/');
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;
    try {
      this.ws = new WebSocket(url);
    } catch (e) {
      console.error('[binance] connect error', e);
      return this.scheduleReconnect();
    }
    this.ws.on('open', () => {
      console.log('[binance] connected');
      this.reconnectMs = 2000;
    });
    this.ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const stream: string = msg.stream || '';
        const data = msg.data;
        if (!data || !data.p) return;
        const sym = stream.split('@')[0];
        const display = this.mapping[sym];
        if (!display) return;
        const price = parseFloat(data.p);
        if (!Number.isFinite(price)) return;
        this.prices.set(display, price);
        const tick: Tick = { symbol: display, price, ts: Date.now() };
        for (const cb of this.cbs) cb(tick);
      } catch {}
    });
    this.ws.on('close', () => {
      console.warn('[binance] closed');
      this.scheduleReconnect();
    });
    this.ws.on('error', (err) => {
      console.warn('[binance] error', (err as Error).message);
    });
  }

  private scheduleReconnect() {
    if (!this.alive) return;
    setTimeout(() => this.connect(), this.reconnectMs);
    this.reconnectMs = Math.min(this.reconnectMs * 2, 30000);
  }
}
