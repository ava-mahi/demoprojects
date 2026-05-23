import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentPrice } from '@/lib/bridge';

export const dynamic = 'force-dynamic';

export async function GET() {
  const assets = await prisma.asset.findMany({ where: { enabled: true }, orderBy: [{ kind: 'asc' }, { symbol: 'asc' }] });
  const prices = await Promise.all(assets.map((a) => getCurrentPrice(a.symbol).catch(() => null)));
  return NextResponse.json({
    assets: assets.map((a, i) => ({
      id: a.id,
      symbol: a.symbol,
      name: a.name,
      kind: a.kind,
      payoutPct: a.payoutPct,
      precision: a.precision,
      price: prices[i] ?? a.priceHint,
    })),
  });
}
