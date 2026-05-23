export type Tick = {
  symbol: string;
  price: number;
  ts: number;
};

export type Candle = {
  symbol: string;
  tf: '1m' | '5m' | '15m';
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export interface PriceFeed {
  start(): Promise<void> | void;
  stop(): void;
  onTick(cb: (t: Tick) => void): void;
  current(symbol: string): number | undefined;
}
