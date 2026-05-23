import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma, TxType, BinaryDirection, AccountMode } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser, errorResponse, HttpError } from '@/lib/auth';
import { getCurrentPrice, notifyBalance } from '@/lib/bridge';

export const dynamic = 'force-dynamic';

const openSchema = z.object({
  symbol: z.string(),
  side: z.enum(['UP', 'DOWN']), // UP=long, DOWN=short
  notional: z.number().positive().max(1_000_000),
  mode: z.enum(['DEMO', 'LIVE']),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = openSchema.parse(await req.json());
    const asset = await prisma.asset.findUnique({ where: { symbol: body.symbol } });
    if (!asset) throw new HttpError(400, 'Asset not found');
    const account = await prisma.account.findUnique({ where: { userId_mode: { userId: user.sub, mode: body.mode as AccountMode } } });
    if (!account) throw new HttpError(400, 'Account not found');
    const livePrice = await getCurrentPrice(body.symbol);
    const price = livePrice ?? asset.priceHint;
    if (price <= 0) throw new HttpError(400, 'No live price');
    const qty = new Prisma.Decimal(body.notional).div(price);
    const margin = new Prisma.Decimal(body.notional);
    if (new Prisma.Decimal(account.balance).lt(margin)) throw new HttpError(400, 'Insufficient balance');

    const position = await prisma.$transaction(async (tx) => {
      const acct = await tx.account.update({ where: { id: account.id }, data: { balance: { decrement: margin } } });
      const p = await tx.position.create({
        data: {
          userId: user.sub,
          accountId: account.id,
          assetId: asset.id,
          side: body.side as BinaryDirection,
          qty,
          openPrice: price,
          status: 'OPEN',
        },
      });
      await tx.transaction.create({
        data: { userId: user.sub, accountId: account.id, type: TxType.TRADE_STAKE, amount: margin.neg(), currency: acct.currency, ref: p.id },
      });
      return { p, balance: acct.balance.toString(), accountId: acct.id };
    });
    notifyBalance(user.sub, position.accountId, position.balance);

    return NextResponse.json({ position: { id: position.p.id, openPrice: position.p.openPrice, qty: position.p.qty.toString(), side: position.p.side } });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const where: any = { userId: user.sub };
    if (status === 'OPEN') where.status = 'OPEN';
    if (status === 'CLOSED') where.status = { in: ['CLOSED'] };
    const positions = await prisma.position.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 100,
      include: { asset: { select: { symbol: true, precision: true } } },
    });
    const prices = await Promise.all(positions.map((p) => getCurrentPrice(p.asset.symbol).catch(() => null)));
    return NextResponse.json({
      positions: positions.map((p, idx) => {
        const cur = prices[idx] ?? p.openPrice;
        const pnlLive = p.status === 'OPEN'
          ? (p.side === 'UP' ? (cur - p.openPrice) : (p.openPrice - cur)) * Number(p.qty)
          : Number(p.pnl ?? 0);
        return {
          id: p.id,
          symbol: p.asset.symbol,
          precision: p.asset.precision,
          side: p.side,
          qty: p.qty.toString(),
          openPrice: p.openPrice,
          closePrice: p.closePrice,
          status: p.status,
          pnlLive,
          createdAt: p.createdAt,
          closedAt: p.closedAt,
        };
      }),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
