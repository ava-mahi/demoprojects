import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const u = await getAuthUser();
  if (!u) return NextResponse.json({ user: null });
  const user = await prisma.user.findUnique({
    where: { id: u.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      displayCurrency: true,
      blocked: true,
      suspended: true,
      accounts: { select: { id: true, mode: true, balance: true, currency: true } },
    },
  });
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      ...user,
      accounts: user.accounts.map((a) => ({ ...a, balance: a.balance.toString() })),
    },
  });
}
