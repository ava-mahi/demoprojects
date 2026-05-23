import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, errorResponse } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const rc = await prisma.riskControl.findUnique({ where: { userId: user.sub } });
    return NextResponse.json({ riskControl: rc });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const data: any = {};
    if (body.dailyLossLimit != null) data.dailyLossLimit = new Prisma.Decimal(body.dailyLossLimit);
    if (body.maxStake != null) data.maxStake = new Prisma.Decimal(body.maxStake);
    if (body.cooldownSec != null) data.cooldownSec = parseInt(body.cooldownSec, 10);
    const rc = await prisma.riskControl.upsert({
      where: { userId: user.sub },
      create: { userId: user.sub, ...data },
      update: data,
    });
    return NextResponse.json({ riskControl: rc });
  } catch (e) {
    return errorResponse(e);
  }
}
