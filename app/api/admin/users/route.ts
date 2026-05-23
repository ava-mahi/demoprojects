import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, errorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const q = url.searchParams.get('q')?.trim();
    const where = q ? { OR: [{ email: { contains: q, mode: 'insensitive' as const } }, { name: { contains: q, mode: 'insensitive' as const } }] } : {};
    const users = await prisma.user.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 200,
      include: { accounts: true, control: true },
    });
    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id, email: u.email, name: u.name, role: u.role,
        blocked: u.blocked, suspended: u.suspended, createdAt: u.createdAt,
        accounts: u.accounts.map((a) => ({ id: a.id, mode: a.mode, balance: a.balance.toString(), currency: a.currency })),
        control: u.control ? {
          enabled: u.control.enabled, winRatePct: u.control.winRatePct,
          forceNext: u.control.forceNext, forceCount: u.control.forceCount,
        } : null,
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
