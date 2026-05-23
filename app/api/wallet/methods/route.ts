import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const methods = await prisma.paymentMethod.findMany({ where: { enabled: true } });
  return NextResponse.json({
    methods: methods.map((m) => ({
      id: m.id,
      name: m.name,
      kind: m.kind,
      network: m.network,
      address: m.address,
      minAmount: m.minAmount.toString(),
      maxAmount: m.maxAmount.toString(),
      feePct: m.feePct,
      instructions: m.instructions,
    })),
  });
}
