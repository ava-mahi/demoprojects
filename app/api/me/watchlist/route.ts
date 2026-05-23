import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, errorResponse } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const items = await prisma.watchlistItem.findMany({
      where: { userId: user.sub },
      include: { asset: { select: { symbol: true, name: true, kind: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ items });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { symbol } = await req.json();
    const asset = await prisma.asset.findUnique({ where: { symbol } });
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    const item = await prisma.watchlistItem.upsert({
      where: { userId_assetId: { userId: user.sub, assetId: asset.id } },
      create: { userId: user.sub, assetId: asset.id },
      update: {},
    });
    return NextResponse.json({ item });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });
    const asset = await prisma.asset.findUnique({ where: { symbol } });
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    await prisma.watchlistItem.deleteMany({ where: { userId: user.sub, assetId: asset.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
