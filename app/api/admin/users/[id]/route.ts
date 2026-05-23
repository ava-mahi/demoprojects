import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma, ForceOutcome, TxType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin, errorResponse, HttpError } from '@/lib/auth';
import { notifyBalance } from '@/lib/bridge';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  blocked: z.boolean().optional(),
  suspended: z.boolean().optional(),
  name: z.string().optional(),
  control: z.object({
    enabled: z.boolean().optional(),
    winRatePct: z.number().int().min(0).max(100).optional(),
    forceNext: z.enum(['NONE', 'WIN', 'LOSE']).optional(),
    forceCount: z.number().int().min(0).max(100).optional(),
  }).optional(),
  adjust: z.object({
    accountId: z.string(),
    amount: z.number(), // can be negative
    reason: z.string().optional(),
  }).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = patchSchema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new HttpError(404, 'User not found');

    const data: any = {};
    if (typeof body.blocked === 'boolean') data.blocked = body.blocked;
    if (typeof body.suspended === 'boolean') data.suspended = body.suspended;
    if (typeof body.name === 'string') data.name = body.name;
    if (Object.keys(data).length) await prisma.user.update({ where: { id }, data });

    if (body.control) {
      await prisma.userTradingControl.upsert({
        where: { userId: id },
        update: {
          ...(typeof body.control.enabled === 'boolean' ? { enabled: body.control.enabled } : {}),
          ...(typeof body.control.winRatePct === 'number' ? { winRatePct: body.control.winRatePct } : {}),
          ...(body.control.forceNext ? { forceNext: body.control.forceNext as ForceOutcome } : {}),
          ...(typeof body.control.forceCount === 'number' ? { forceCount: body.control.forceCount } : {}),
        },
        create: {
          userId: id,
          enabled: body.control.enabled ?? true,
          winRatePct: body.control.winRatePct ?? 50,
          forceNext: (body.control.forceNext as ForceOutcome) ?? 'NONE',
          forceCount: body.control.forceCount ?? 0,
        },
      });
    }

    let balanceUpdate: { accountId: string; balance: string } | null = null;
    if (body.adjust) {
      const amt = new Prisma.Decimal(body.adjust.amount);
      const acct = await prisma.account.findFirst({ where: { id: body.adjust.accountId, userId: id } });
      if (!acct) throw new HttpError(404, 'Account not found');
      await prisma.$transaction(async (tx) => {
        const updated = await tx.account.update({ where: { id: acct.id }, data: { balance: { increment: amt } } });
        await tx.transaction.create({
          data: {
            userId: id, accountId: acct.id,
            type: amt.gte(0) ? TxType.BONUS : TxType.ADJUSTMENT,
            amount: amt, currency: acct.currency,
            note: body.adjust!.reason || (amt.gte(0) ? 'Admin bonus' : 'Admin adjustment'),
          },
        });
        balanceUpdate = { accountId: acct.id, balance: updated.balance.toString() };
        await tx.notification.create({
          data: { userId: id, kind: 'BONUS', title: amt.gte(0) ? `+${amt.toFixed(2)} credited` : `${amt.toFixed(2)} adjusted`, body: body.adjust!.reason || '' },
        });
      });
    }

    if (balanceUpdate) {
      const b = balanceUpdate as { accountId: string; balance: string };
      notifyBalance(id, b.accountId, b.balance);
    }
    await prisma.adminLog.create({ data: { actorId: admin.sub, action: 'user.update', target: id, meta: body as any } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: { accounts: true, control: true, trades: { take: 50, orderBy: { createdAt: 'desc' }, include: { asset: true } }, transactions: { take: 50, orderBy: { createdAt: 'desc' } } },
    });
    if (!user) throw new HttpError(404, 'Not found');
    return NextResponse.json({
      user: {
        id: user.id, email: user.email, name: user.name, role: user.role, blocked: user.blocked, suspended: user.suspended,
        accounts: user.accounts.map((a) => ({ id: a.id, mode: a.mode, balance: a.balance.toString(), currency: a.currency })),
        control: user.control,
        trades: user.trades.map((t) => ({
          id: t.id, symbol: t.asset.symbol, direction: t.direction, stake: t.stake.toString(), payout: t.payout?.toString() ?? null,
          status: t.status, openPrice: t.openPrice, closePrice: t.closePrice, createdAt: t.createdAt,
        })),
        transactions: user.transactions.map((x) => ({ ...x, amount: x.amount.toString() })),
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
