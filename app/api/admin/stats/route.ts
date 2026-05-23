import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, errorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const [users, openTrades, deposits, withdrawals, tradeAgg] = await Promise.all([
      prisma.user.count(),
      prisma.trade.count({ where: { status: 'OPEN' } }),
      prisma.transaction.aggregate({ where: { type: 'DEPOSIT' }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: 'WITHDRAWAL' }, _sum: { amount: true } }),
      prisma.trade.groupBy({ by: ['status'], _count: { _all: true }, _sum: { stake: true, payout: true } }),
    ]);
    let stakeSum = 0; let payoutSum = 0;
    for (const a of tradeAgg) {
      stakeSum += Number(a._sum.stake ?? 0);
      payoutSum += Number(a._sum.payout ?? 0);
    }
    const platformPnl = stakeSum - payoutSum;

    // Last 14 days revenue chart
    const since = new Date(Date.now() - 14 * 86400000);
    const recent = await prisma.trade.findMany({
      where: { resolvedAt: { gte: since }, status: { in: ['WON', 'LOST', 'TIE'] } },
      select: { stake: true, payout: true, resolvedAt: true },
    });
    const byDay = new Map<string, { stake: number; payout: number }>();
    for (const t of recent) {
      const d = t.resolvedAt!.toISOString().slice(0, 10);
      const cur = byDay.get(d) || { stake: 0, payout: 0 };
      cur.stake += Number(t.stake);
      cur.payout += Number(t.payout ?? 0);
      byDay.set(d, cur);
    }
    const series = Array.from(byDay.entries()).sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, v]) => ({ day, pnl: v.stake - v.payout }));

    return NextResponse.json({
      users, openTrades,
      depositsTotal: Number(deposits._sum.amount ?? 0),
      withdrawalsTotal: Number(withdrawals._sum.amount ?? 0),
      platformPnl,
      tradeStats: tradeAgg.map((s) => ({ status: s.status, count: s._count._all, totalStake: Number(s._sum.stake ?? 0), totalPayout: Number(s._sum.payout ?? 0) })),
      series,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
