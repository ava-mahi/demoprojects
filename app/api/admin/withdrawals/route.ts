import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma, TxType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin, errorResponse, HttpError } from '@/lib/auth';
import { notifyBalance } from '@/lib/bridge';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || 'PENDING';
    const items = await prisma.withdrawalRequest.findMany({
      where: { status: status as any },
      orderBy: { createdAt: 'desc' }, take: 200,
      include: { user: { select: { id: true, email: true, name: true } }, method: true },
    });
    return NextResponse.json({
      items: items.map((d) => ({
        id: d.id, userId: d.userId, userEmail: d.user.email, userName: d.user.name,
        amount: d.amount.toString(), currency: d.currency, destination: d.destination, status: d.status,
        method: { id: d.method.id, name: d.method.name, network: d.method.network },
        createdAt: d.createdAt,
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

const actionSchema = z.object({ id: z.string(), action: z.enum(['APPROVE', 'REJECT']), note: z.string().optional() });

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const data = actionSchema.parse(await req.json());
    const w = await prisma.withdrawalRequest.findUnique({ where: { id: data.id } });
    if (!w || w.status !== 'PENDING') throw new HttpError(400, 'Invalid request');
    if (data.action === 'APPROVE') {
      await prisma.$transaction(async (tx) => {
        const live = await tx.account.findUnique({ where: { userId_mode: { userId: w.userId, mode: 'LIVE' } } });
        if (!live) throw new HttpError(400, 'LIVE missing');
        const amount = new Prisma.Decimal(w.amount);
        await tx.withdrawalRequest.update({ where: { id: w.id }, data: { status: 'APPROVED', decidedAt: new Date(), note: data.note } });
        await tx.transaction.create({
          data: { userId: w.userId, accountId: live.id, type: TxType.WITHDRAWAL, amount: amount.neg(), currency: w.currency, ref: w.id, note: 'Approved' },
        });
        await tx.notification.create({ data: { userId: w.userId, kind: 'WITHDRAWAL', title: 'Withdrawal approved', body: `-${amount.toFixed(2)} ${w.currency}` } });
      });
    } else {
      await prisma.$transaction(async (tx) => {
        const live = await tx.account.findUnique({ where: { userId_mode: { userId: w.userId, mode: 'LIVE' } } });
        if (!live) throw new HttpError(400, 'LIVE missing');
        const amount = new Prisma.Decimal(w.amount);
        const updated = await tx.account.update({ where: { id: live.id }, data: { balance: { increment: amount } } });
        await tx.withdrawalRequest.update({ where: { id: w.id }, data: { status: 'REJECTED', decidedAt: new Date(), note: data.note } });
        await tx.transaction.create({
          data: { userId: w.userId, accountId: live.id, type: TxType.ADJUSTMENT, amount, currency: w.currency, ref: w.id, note: 'Withdrawal rejected (refund)' },
        });
        await tx.notification.create({ data: { userId: w.userId, kind: 'WITHDRAWAL', title: 'Withdrawal rejected — refunded', body: data.note || '' } });
        return { liveId: live.id, balance: updated.balance.toString() };
      }).then((r) => notifyBalance(w.userId, r.liveId, r.balance));
    }
    await prisma.adminLog.create({ data: { actorId: admin.sub, action: `withdrawal.${data.action.toLowerCase()}`, target: w.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
