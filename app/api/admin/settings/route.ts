import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, errorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const s = await prisma.setting.findUnique({ where: { key: 'platform' } });
    return NextResponse.json({ settings: s?.value || {} });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    await prisma.setting.upsert({ where: { key: 'platform' }, update: { value: body }, create: { key: 'platform', value: body } });
    await prisma.adminLog.create({ data: { actorId: admin.sub, action: 'settings.update', meta: body } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
