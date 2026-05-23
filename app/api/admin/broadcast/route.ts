import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, errorResponse, HttpError } from '@/lib/auth';
import { notifyBroadcast } from '@/lib/bridge';

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN') throw new HttpError(403, 'Forbidden');
    const { title, body, segment } = await req.json();
    if (!title || !body) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const bc = await prisma.broadcast.create({ data: { title, body, segment: segment || null } });
    await notifyBroadcast(title, body, segment);
    await prisma.adminLog.create({ data: { actorId: user.sub, action: 'broadcast.send', meta: { title, segment } as any } });
    return NextResponse.json({ broadcast: bc });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN') throw new HttpError(403, 'Forbidden');
    const broadcasts = await prisma.broadcast.findMany({ orderBy: { sentAt: 'desc' }, take: 50 });
    return NextResponse.json({ broadcasts });
  } catch (e) {
    return errorResponse(e);
  }
}
