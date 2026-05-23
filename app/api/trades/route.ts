import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma, TxType, BinaryDirection, AccountMode } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser, errorResponse, HttpError } from '@/lib/auth';
import { getCurrentPrice, notifyBalance } from '@/lib/bridge';

export const dynamic = 'force-dynamic';

const placeSchema = z.object({
  symbol: z.string(),
  direction: z.enum(['UP', 'DOWN']),
  stake: z.number().positive().max(100000),
  expirySec: z.number().int().min(15).max(86400),
  mode: z.enum(['DEMO', 'LIVE']),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = placeSchema.parse(await req.json());
    const asset = await prisma.asset.findUnique({ where: { symbol: body.symbol } });
    if (!asset || !asset.enabled) throw new HttpError(400, 'Asset not available');
    const account = await prisma.account.findUnique({
      where: { userId_mode: { userId: user.sub, mode: body.mode as AccountMode } },
    });
    if (!account) throw new HttpError(400, 'Account not found');
    const stake = new Prisma.Decimal(body.stake);
    if (new Prisma.Decimal(account.balance).lt(stake)) throw new HttpError(400, 'Insufficient balance');

    // Check risk controls
    const rc = await prisma.riskControl.findUnique({ where: { userId: user.sub } });
    if (rc) {
      if (rc.maxStake && stake.gt(rc.maxStake)) throw new HttpError(400, `Max stake is ${rc.maxStake}`);
      if (rc.cooldownSec && rc.lastTradeAt) {
        const elapsed = (Date.now() - rc.lastTradeAt.getTime()) / 1000;
        if (elapsed < rc.cooldownSec) throw new HttpError(400, `Cooldown: wait ${Math.ceil(rc.cooldownSec - elapsed)}s`);
      }
      if (rc.dailyLossLimit) {
        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        const todayTrades = await prisma.trade.findMany({ where: { userId: user.sub, createdAt: { gte: dayStart }, status: { in: ['LOST', 'WON'] } } });
        const todayPnl = todayTrades.reduce((sum, t) => {
          const s = parseFloat(t.stake.toString());
          const p = t.payout ? parseFloat(t.payout.toString()) : 0;
          return sum + (p - s);
        }, 0);
        if (todayPnl < 0 && Math.abs(todayPnl) >= parseFloat(rc.dailyLossLimit.toString())) {
          throw new HttpError(400, 'Daily loss limit reached');
        }
      }
    }
    const livePrice = await getCurrentPrice(body.symbol);
    const openPrice = livePrice ?? asset.priceHint;
    const expiresAt = new Date(Date.now() + body.expirySec * 1000);

    const trade = await prisma.$transaction(async (tx) => {
      const acct = await tx.account.update({
        where: { id: account.id },
        data: { balance: { decrement: stake } },
      });
      const t = await tx.trade.create({
        data: {
          userId: user.sub,
          accountId: account.id,
          assetId: asset.id,
          kind: 'BINARY',
          direction: body.direction as BinaryDirection,
          stake,
          payoutPct: asset.payoutPct,
          openPrice,
          expiresAt,
          status: 'OPEN',
        },
      });
      await tx.transaction.create({
        data: {
          userId: user.sub,
          accountId: account.id,
          type: TxType.TRADE_STAKE,
          amount: stake.neg(),
          currency: acct.currency,
          ref: t.id,
        },
      });
      // Update risk control lastTradeAt
      if (rc) await tx.riskControl.update({ where: { userId: user.sub }, data: { lastTradeAt: new Date() } });
      return { t, balance: acct.balance.toString(), accountId: acct.id };
    });
    // Emit balance update via standalone hub
    notifyBalance(user.sub, trade.accountId, trade.balance);

    return NextResponse.json({
      trade: {
        id: trade.t.id,
        symbol: asset.symbol,
        direction: trade.t.direction,
        stake: trade.t.stake.toString(),
        openPrice: trade.t.openPrice,
        payoutPct: trade.t.payoutPct,
        expiresAt: trade.t.expiresAt,
        status: trade.t.status,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode') as AccountMode | null;
    const status = url.searchParams.get('status'); // OPEN | CLOSED
    const take = Math.min(parseInt(url.searchParams.get('take') || '50'), 200);
    const where: any = { userId: user.sub };
    if (mode) {
      const acct = await prisma.account.findUnique({ where: { userId_mode: { userId: user.sub, mode } } });
      if (acct) where.accountId = acct.id;
    }
    if (status === 'OPEN') where.status = 'OPEN';
    if (status === 'CLOSED') where.status = { in: ['WON', 'LOST', 'TIE', 'CLOSED'] };
    const trades = await prisma.trade.findMany({
      where, orderBy: { createdAt: 'desc' }, take,
      include: { asset: { select: { symbol: true, precision: true } } },
    });
    return NextResponse.json({
      trades: trades.map((t) => ({
        id: t.id,
        symbol: t.asset.symbol,
        precision: t.asset.precision,
        kind: t.kind,
        direction: t.direction,
        stake: t.stake.toString(),
        payoutPct: t.payoutPct,
        openPrice: t.openPrice,
        closePrice: t.closePrice,
        payout: t.payout?.toString() ?? null,
        status: t.status,
        expiresAt: t.expiresAt,
        createdAt: t.createdAt,
        resolvedAt: t.resolvedAt,
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
