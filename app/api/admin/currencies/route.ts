import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin, errorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const items = await prisma.currency.findMany();
    return NextResponse.json({ items });
  } catch (e) {
    return errorResponse(e);
  }
}

const schema = z.object({ code: z.string().length(3), name: z.string(), symbol: z.string(), rateToUsd: z.number().positive(), enabled: z.boolean().optional() });

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const data = schema.parse(await req.json());
    await prisma.currency.upsert({ where: { code: data.code }, update: data, create: data });
    await prisma.adminLog.create({ data: { actorId: admin.sub, action: 'currency.upsert', target: data.code } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
