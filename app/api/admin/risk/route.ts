import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, errorResponse, HttpError } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN') throw new HttpError(403, 'Forbidden');
    
    const openTrades = await prisma.trade.findMany({
      where: { status: 'OPEN' },
      include: { asset: { select: { symbol: true } }, account: { select: { mode: true } } },
    });
    
    const byAsset: Record<string, { count: number; totalStake: number; maxPayout: number }> = {};
    let totalExposure = 0;
    let maxPayoutLiability = 0;
    
    for (const t of openTrades) {
      const sym = t.asset.symbol;
      if (!byAsset[sym]) byAsset[sym] = { count: 0, totalStake: 0, maxPayout: 0 };
      const stake = parseFloat(t.stake.toString());
      const payout = stake * (1 + t.payoutPct / 100);
      byAsset[sym].count++;
      byAsset[sym].totalStake += stake;
      byAsset[sym].maxPayout += payout;
      totalExposure += stake;
      maxPayoutLiability += payout;
    }
    
    const hotSymbols = Object.entries(byAsset)
      .map(([symbol, data]) => ({ symbol, ...data }))
      .sort((a, b) => b.maxPayout - a.maxPayout)
      .slice(0, 10);
    
    return NextResponse.json({ totalExposure, maxPayoutLiability, hotSymbols, openTradesCount: openTrades.length });
  } catch (e) {
    return errorResponse(e);
  }
}
