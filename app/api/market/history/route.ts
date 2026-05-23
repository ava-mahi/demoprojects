import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentPrice } from '@/lib/bridge';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get('symbol') || '';
  const tf = (url.searchParams.get('tf') as '1m' | '5m' | '15m') || '1m';
  if (!symbol) return NextResponse.json({ candles: [] });

  const asset = await prisma.asset.findUnique({ where: { symbol } });
  const livePrice = await getCurrentPrice(symbol);
  const price = livePrice ?? asset?.priceHint ?? 100;
  const span = tf === '1m' ? 60_000 : tf === '5m' ? 300_000 : 900_000;
  const now = Date.now();

  // Synthesize seed candles so the chart shows immediately; live ticks then update via socket.
  const candles = Array.from({ length: 120 }).map((_, i) => {
    const openTime = Math.floor((now - (120 - i) * span) / span) * span;
    const drift = (Math.random() - 0.5) * (asset?.volatility ?? 0.001) * price;
    const o = price + drift * (120 - i) * 0.5;
    const c = o + (Math.random() - 0.5) * (asset?.volatility ?? 0.001) * price * 2;
    const h = Math.max(o, c) + Math.random() * Math.abs(c - o);
    const l = Math.min(o, c) - Math.random() * Math.abs(c - o);
    return { symbol, tf, openTime, open: o, high: h, low: l, close: c };
  });
  // Make the last candle close at the actual current price
  if (candles.length) candles[candles.length - 1].close = price;
  return NextResponse.json({ candles });
}
