import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, errorResponse, HttpError } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN') throw new HttpError(403, 'Forbidden');
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 50;
    const logs = await prisma.adminLog.findMany({
      include: { actor: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const total = await prisma.adminLog.count();
    return NextResponse.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    return errorResponse(e);
  }
}
