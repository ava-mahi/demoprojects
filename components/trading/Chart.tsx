'use client';
import { useEffect, useRef } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi, type UTCTimestamp, CrosshairMode, LineStyle } from 'lightweight-charts';
import { getSocket } from '@/lib/socket-client';

type Mode = 'area' | 'candles';
const TF_SECONDS: Record<string, number> = { '1m': 60, '5m': 300, '15m': 900 };

export function Chart({ symbol, tf = '1m', mode = 'area', alertLines = [] }: { symbol: string; tf?: '1m' | '5m' | '15m'; mode?: Mode; alertLines?: number[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | ISeriesApi<'Candlestick'> | null>(null);
  const lastBarRef = useRef<{ openTime: number; open: number; high: number; low: number; close: number } | null>(null);
  const pendingPriceRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const priceLinesRef = useRef<any[]>([]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#7C8499', fontFamily: 'Inter, sans-serif' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.06)', timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Magnet },
      autoSize: true,
    });
    chartRef.current = chart;

    let series: ISeriesApi<'Area'> | ISeriesApi<'Candlestick'>;
    if (mode === 'candles') {
      series = chart.addCandlestickSeries({
        upColor: '#22D39A', downColor: '#FF4D6D', wickUpColor: '#22D39A', wickDownColor: '#FF4D6D', borderVisible: false,
      });
    } else {
      series = chart.addAreaSeries({
        topColor: 'rgba(91,140,255,0.45)', bottomColor: 'rgba(91,140,255,0.0)', lineColor: '#5B8CFF', lineWidth: 2,
      });
    }
    seriesRef.current = series;

    const tfSec = TF_SECONDS[tf] ?? 60;
    let cancelled = false;
    (async () => {
      const r = await fetch(`/api/market/history?symbol=${encodeURIComponent(symbol)}&tf=${tf}&n=200`, { cache: 'no-store' });
      const j = await r.json();
      if (cancelled) return;
      const candles = (j.candles || []) as { openTime: number; open: number; high: number; low: number; close: number }[];
      if (candles.length) lastBarRef.current = candles[candles.length - 1];
      if (mode === 'candles') {
        (series as ISeriesApi<'Candlestick'>).setData(candles.map((c) => ({
          time: Math.floor(c.openTime / 1000) as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close,
        })));
      } else {
        (series as ISeriesApi<'Area'>).setData(candles.map((c) => ({
          time: Math.floor(c.openTime / 1000) as UTCTimestamp, value: c.close,
        })));
      }
      chart.timeScale().fitContent();
    })();

    // RAF-throttled paint of latest price into the current bucket.
    const flush = () => {
      rafRef.current = null;
      const price = pendingPriceRef.current;
      pendingPriceRef.current = null;
      const last = lastBarRef.current;
      if (price == null || !last) return;
      const nowMs = Date.now();
      const bucketStart = Math.floor(nowMs / 1000 / tfSec) * tfSec;
      const lastBucketStart = Math.floor(last.openTime / 1000 / tfSec) * tfSec;
      if (bucketStart > lastBucketStart) {
        // roll a new local bar; the authoritative one will arrive via 'candle' soon
        lastBarRef.current = { openTime: bucketStart * 1000, open: last.close, high: Math.max(last.close, price), low: Math.min(last.close, price), close: price };
      } else {
        last.high = Math.max(last.high, price);
        last.low = Math.min(last.low, price);
        last.close = price;
      }
      const lb = lastBarRef.current!;
      const t = (lb.openTime / 1000) as UTCTimestamp;
      if (mode === 'candles') {
        (series as ISeriesApi<'Candlestick'>).update({ time: t, open: lb.open, high: lb.high, low: lb.low, close: lb.close });
      } else {
        (series as ISeriesApi<'Area'>).update({ time: t, value: lb.close });
      }
    };
    const schedule = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(flush);
    };

    const sock = getSocket();
    sock.emit('subscribe:symbol', symbol);
    const onCandle = (c: any) => {
      if (c.symbol !== symbol || c.tf !== tf) return;
      lastBarRef.current = { openTime: c.openTime, open: c.open, high: c.high, low: c.low, close: c.close };
      const t = Math.floor(c.openTime / 1000) as UTCTimestamp;
      if (mode === 'candles') (series as ISeriesApi<'Candlestick'>).update({ time: t, open: c.open, high: c.high, low: c.low, close: c.close });
      else (series as ISeriesApi<'Area'>).update({ time: t, value: c.close });
    };
    const onTick = (t: any) => {
      if (t.symbol !== symbol) return;
      pendingPriceRef.current = t.price;
      schedule();
    };
    sock.on('candle', onCandle);
    sock.on('tick', onTick);

    // Render alert price lines
    priceLinesRef.current = alertLines.map((p) =>
      series.createPriceLine({ price: p, color: '#F0B90B', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'alert' }),
    );

    return () => {
      cancelled = true;
      sock.off('candle', onCandle);
      sock.off('tick', onTick);
      sock.emit('unsubscribe:symbol', symbol);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLinesRef.current = [];
    };
  }, [symbol, tf, mode, alertLines.join(',')]);

  return <div ref={containerRef} className="w-full h-full" />;
}
