import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const items = await prisma.currency.findMany({ where: { enabled: true } });
  return NextResponse.json({ items });
}
