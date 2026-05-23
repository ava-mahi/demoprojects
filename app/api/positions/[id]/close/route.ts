import { NextResponse } from 'next/server';
import { Prisma, TxType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser, errorResponse, HttpError } from '@/lib/auth';
import { getCurrentPrice, notifyBalance } from '@/lib/bridge';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const pos = await prisma.position.findFirst({ where: { id, userId: user.sub }, include: { asset: true } });
    if (!pos) throw new HttpError(404, 'Position not found');
    if (pos.status !== 'OPEN') throw new HttpError(400, 'Position already closed');
    const livePrice = await getCurrentPrice(pos.asset.symbol);
    const price = livePrice ?? pos.openPrice;
    const qty = new Prisma.Decimal(pos.qty);
    const pnl = pos.side === 'UP'
      ? new Prisma.Decimal(price - pos.openPrice).mul(qty)
      : new Prisma.Decimal(pos.openPrice - price).mul(qty);
    const margin = qty.mul(pos.openPrice);
    const payout = margin.add(pnl);

    const newBalance = await prisma.$transaction(async (tx) => {
      await tx.position.update({ where: { id: pos.id }, data: { status: 'CLOSED', closePrice: price, closedAt: new Date(), pnl } });
      const acct = await tx.account.update({ where: { id: pos.accountId }, data: { balance: { increment: payout } } });
      await tx.transaction.create({
        data: { userId: user.sub, accountId: pos.accountId, type: TxType.TRADE_PAYOUT, amount: payout, currency: acct.currency, ref: pos.id },
      });
      await tx.notification.create({
        data: { userId: user.sub, kind: 'TRADE', title: `Position closed`, body: `${pos.asset.symbol} P/L ${pnl.toFixed(2)}` },
      });
      return acct.balance.toString();
    });
    notifyBalance(user.sub, pos.accountId, newBalance);

    return NextResponse.json({ ok: true, pnl: pnl.toString(), closePrice: price });
  } catch (e) {
    return errorResponse(e);
  }
}
