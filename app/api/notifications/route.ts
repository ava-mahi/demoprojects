import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, errorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const u = await requireUser();
    const items = await prisma.notification.findMany({
      where: { userId: u.sub }, orderBy: { createdAt: 'desc' }, take: 30,
    });
    return NextResponse.json({ notifications: items });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const { ids } = (await req.json()) as { ids?: string[] };
    if (ids?.length) {
      await prisma.notification.updateMany({ where: { userId: u.sub, id: { in: ids } }, data: { read: true } });
    } else {
      await prisma.notification.updateMany({ where: { userId: u.sub }, data: { read: true } });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
