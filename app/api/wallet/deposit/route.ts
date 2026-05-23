import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser, errorResponse, HttpError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const schema = z.object({
  methodId: z.string(),
  amount: z.number().positive().max(1_000_000),
  txHash: z.string().max(200).optional(),
  currency: z.string().default('USD'),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const data = schema.parse(await req.json());
    const m = await prisma.paymentMethod.findUnique({ where: { id: data.methodId } });
    if (!m || !m.enabled) throw new HttpError(400, 'Method unavailable');
    if (data.amount < Number(m.minAmount) || data.amount > Number(m.maxAmount)) {
      throw new HttpError(400, `Amount out of range (${m.minAmount}-${m.maxAmount})`);
    }
    const dep = await prisma.depositRequest.create({
      data: { userId: user.sub, methodId: m.id, amount: data.amount, currency: data.currency, txHash: data.txHash, status: 'PENDING' },
    });
    await prisma.notification.create({
      data: { userId: user.sub, kind: 'DEPOSIT', title: 'Deposit submitted', body: `${data.amount} ${data.currency} via ${m.name}` },
    });
    return NextResponse.json({ deposit: { id: dep.id, status: dep.status, amount: dep.amount.toString() } });
  } catch (e) {
    return errorResponse(e);
  }
}
