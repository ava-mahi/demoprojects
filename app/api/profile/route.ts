import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser, errorResponse, hashPassword, verifyPassword, HttpError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  displayCurrency: z.string().length(3).optional(),
});

export async function PATCH(req: Request) {
  try {
    const u = await requireUser();
    const data = updateSchema.parse(await req.json());
    const user = await prisma.user.update({ where: { id: u.sub }, data });
    return NextResponse.json({ user: { id: user.id, name: user.name, displayCurrency: user.displayCurrency } });
  } catch (e) {
    return errorResponse(e);
  }
}

const pwSchema = z.object({ current: z.string().min(1), next: z.string().min(8).max(72) });
export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const body = pwSchema.parse(await req.json());
    const dbUser = await prisma.user.findUnique({ where: { id: u.sub } });
    if (!dbUser) throw new HttpError(404, 'User not found');
    if (!(await verifyPassword(body.current, dbUser.passwordHash))) throw new HttpError(401, 'Current password incorrect');
    await prisma.user.update({ where: { id: u.sub }, data: { passwordHash: await hashPassword(body.next) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function GET() {
  try {
    const u = await requireUser();
    const [stats, recent] = await Promise.all([
      prisma.trade.groupBy({ by: ['status'], where: { userId: u.sub }, _count: { _all: true }, _sum: { stake: true, payout: true } }),
      prisma.trade.findMany({ where: { userId: u.sub }, orderBy: { createdAt: 'desc' }, take: 20, include: { asset: true } }),
    ]);
    return NextResponse.json({
      stats: stats.map((s) => ({ status: s.status, count: s._count._all, totalStake: s._sum.stake?.toString() ?? '0', totalPayout: s._sum.payout?.toString() ?? '0' })),
      recent: recent.map((t) => ({
        id: t.id, symbol: t.asset.symbol, direction: t.direction, status: t.status,
        stake: t.stake.toString(), payout: t.payout?.toString() ?? null,
        openPrice: t.openPrice, closePrice: t.closePrice, createdAt: t.createdAt,
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
