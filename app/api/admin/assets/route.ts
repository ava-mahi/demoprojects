import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, errorResponse, HttpError } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN') throw new HttpError(403, 'Forbidden');
    const assets = await prisma.asset.findMany({ orderBy: { symbol: 'asc' } });
    return NextResponse.json({ assets });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN') throw new HttpError(403, 'Forbidden');
    const body = await req.json();
    const asset = await prisma.asset.create({
      data: {
        symbol: body.symbol,
        name: body.name,
        kind: body.kind,
        enabled: body.enabled ?? true,
        payoutPct: body.payoutPct ?? 85,
        feed: body.feed || 'sim',
        feedSym: body.feedSym || null,
        priceHint: body.priceHint ?? 100,
        volatility: body.volatility ?? 0.002,
        drift: body.drift ?? 0,
        precision: body.precision ?? 4,
      },
    });
    await prisma.adminLog.create({ data: { actorId: user.sub, action: 'asset.create', target: asset.id, meta: body as any } });
    return NextResponse.json({ asset });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN') throw new HttpError(403, 'Forbidden');
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const asset = await prisma.asset.update({ where: { id }, data });
    await prisma.adminLog.create({ data: { actorId: user.sub, action: 'asset.update', target: id, meta: body as any } });
    return NextResponse.json({ asset });
  } catch (e) {
    return errorResponse(e);
  }
}
