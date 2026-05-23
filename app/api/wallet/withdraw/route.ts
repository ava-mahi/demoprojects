import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser, errorResponse, HttpError, verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const schema = z.object({
  methodId: z.string(),
  amount: z.number().positive().max(1_000_000),
  destination: z.string().min(4).max(200),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const data = schema.parse(await req.json());
    const dbUser = await prisma.user.findUnique({ where: { id: u.sub } });
    if (!dbUser) throw new HttpError(404, 'User not found');
    const okPw = await verifyPassword(data.password, dbUser.passwordHash);
    if (!okPw) throw new HttpError(401, 'Password incorrect');

    const m = await prisma.paymentMethod.findUnique({ where: { id: data.methodId } });
    if (!m || !m.enabled) throw new HttpError(400, 'Method unavailable');

    const setting = await prisma.setting.findUnique({ where: { key: 'platform' } });
    const minW = ((setting?.value as any)?.minWithdrawal ?? 20) as number;
    if (data.amount < minW) throw new HttpError(400, `Minimum withdrawal is ${minW}`);

    const live = await prisma.account.findUnique({ where: { userId_mode: { userId: u.sub, mode: 'LIVE' } } });
    if (!live) throw new HttpError(400, 'Live account missing');
    const amount = new Prisma.Decimal(data.amount);
    if (new Prisma.Decimal(live.balance).lt(amount)) throw new HttpError(400, 'Insufficient balance');

    // Hold funds: debit immediately to prevent double-spend; refunded on rejection.
    const req2 = await prisma.$transaction(async (tx) => {
      await tx.account.update({ where: { id: live.id }, data: { balance: { decrement: amount } } });
      return tx.withdrawalRequest.create({
        data: {
          userId: u.sub, methodId: m.id, amount, destination: data.destination, currency: live.currency, status: 'PENDING',
        },
      });
    });
    await prisma.notification.create({
      data: { userId: u.sub, kind: 'WITHDRAWAL', title: 'Withdrawal submitted', body: `${data.amount} ${live.currency} held` },
    });
    return NextResponse.json({ withdrawal: { id: req2.id, status: req2.status } });
  } catch (e) {
    return errorResponse(e);
  }
}
