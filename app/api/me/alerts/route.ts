import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, errorResponse } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const alerts = await prisma.priceAlert.findMany({
      where: { userId: user.sub },
      include: { asset: { select: { symbol: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ alerts });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { symbol, direction, price } = await req.json();
    if (!symbol || !direction || !price) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const asset = await prisma.asset.findUnique({ where: { symbol } });
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    const alert = await prisma.priceAlert.create({
      data: { userId: user.sub, assetId: asset.id, direction, price: parseFloat(price) },
    });
    return NextResponse.json({ alert });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await prisma.priceAlert.deleteMany({ where: { id, userId: user.sub } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
