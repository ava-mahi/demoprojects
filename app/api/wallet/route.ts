import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, errorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireUser();
    const [accounts, txs, deposits, withdrawals] = await Promise.all([
      prisma.account.findMany({ where: { userId: user.sub } }),
      prisma.transaction.findMany({ where: { userId: user.sub }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.depositRequest.findMany({ where: { userId: user.sub }, orderBy: { createdAt: 'desc' }, take: 50, include: { method: true } }),
      prisma.withdrawalRequest.findMany({ where: { userId: user.sub }, orderBy: { createdAt: 'desc' }, take: 50, include: { method: true } }),
    ]);
    return NextResponse.json({
      accounts: accounts.map((a) => ({ id: a.id, mode: a.mode, balance: a.balance.toString(), currency: a.currency })),
      transactions: txs.map((t) => ({ ...t, amount: t.amount.toString() })),
      deposits: deposits.map((d) => ({ ...d, amount: d.amount.toString(), method: { id: d.method.id, name: d.method.name, network: d.method.network } })),
      withdrawals: withdrawals.map((w) => ({ ...w, amount: w.amount.toString(), method: { id: w.method.id, name: w.method.name, network: w.method.network } })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
