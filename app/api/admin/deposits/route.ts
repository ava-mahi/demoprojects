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
    const items = await prisma.depositRequest.findMany({
      where: { status: status as any },
      orderBy: { createdAt: 'desc' }, take: 200,
      include: { user: { select: { id: true, email: true, name: true } }, method: true },
    });
    return NextResponse.json({
      items: items.map((d) => ({
        id: d.id, userId: d.userId, userEmail: d.user.email, userName: d.user.name,
        amount: d.amount.toString(), currency: d.currency, txHash: d.txHash, status: d.status,
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
    const dep = await prisma.depositRequest.findUnique({ where: { id: data.id } });
    if (!dep || dep.status !== 'PENDING') throw new HttpError(400, 'Invalid deposit');
    if (data.action === 'APPROVE') {
      await prisma.$transaction(async (tx) => {
        const live = await tx.account.findUnique({ where: { userId_mode: { userId: dep.userId, mode: 'LIVE' } } });
        if (!live) throw new HttpError(400, 'User LIVE account missing');
        const amount = new Prisma.Decimal(dep.amount);
        const updated = await tx.account.update({ where: { id: live.id }, data: { balance: { increment: amount } } });
        await tx.depositRequest.update({ where: { id: dep.id }, data: { status: 'APPROVED', decidedAt: new Date(), note: data.note } });
        await tx.transaction.create({
          data: { userId: dep.userId, accountId: live.id, type: TxType.DEPOSIT, amount, currency: dep.currency, ref: dep.id },
        });
        await tx.notification.create({ data: { userId: dep.userId, kind: 'DEPOSIT', title: 'Deposit approved', body: `+${amount.toFixed(2)} ${dep.currency}` } });
        return { liveId: live.id, balance: updated.balance.toString() };
      }).then((r) => notifyBalance(dep.userId, r.liveId, r.balance));
    } else {
      await prisma.depositRequest.update({ where: { id: dep.id }, data: { status: 'REJECTED', decidedAt: new Date(), note: data.note } });
      await prisma.notification.create({ data: { userId: dep.userId, kind: 'DEPOSIT', title: 'Deposit rejected', body: data.note || '' } });
    }
    await prisma.adminLog.create({ data: { actorId: admin.sub, action: `deposit.${data.action.toLowerCase()}`, target: dep.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
