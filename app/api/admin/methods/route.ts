import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin, errorResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const methods = await prisma.paymentMethod.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json({
      methods: methods.map((m) => ({
        ...m, minAmount: m.minAmount.toString(), maxAmount: m.maxAmount.toString(),
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

const upsertSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  kind: z.string(),
  network: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  minAmount: z.number(),
  maxAmount: z.number(),
  feePct: z.number().optional(),
  instructions: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const data = upsertSchema.parse(await req.json());
    const { id, ...rest } = data;
    const saved = id
      ? await prisma.paymentMethod.update({ where: { id }, data: rest as any })
      : await prisma.paymentMethod.create({ data: rest as any });
    await prisma.adminLog.create({ data: { actorId: admin.sub, action: id ? 'method.update' : 'method.create', target: saved.id } });
    return NextResponse.json({ ok: true, id: saved.id });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireAdmin();
    const { id } = (await req.json()) as { id: string };
    await prisma.paymentMethod.update({ where: { id }, data: { enabled: false } });
    await prisma.adminLog.create({ data: { actorId: admin.sub, action: 'method.disable', target: id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
