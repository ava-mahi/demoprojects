import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, errorResponse } from '@/lib/auth';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await ctx.params;
    const note = await prisma.tradeNote.findUnique({ where: { tradeId: id, userId: user.sub } });
    return NextResponse.json({ note });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await ctx.params;
    const { note: text } = await req.json();
    if (!text) return NextResponse.json({ error: 'Missing note' }, { status: 400 });
    const trade = await prisma.trade.findFirst({ where: { id, userId: user.sub } });
    if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    const note = await prisma.tradeNote.upsert({
      where: { tradeId: id },
      create: { tradeId: id, userId: user.sub, note: text },
      update: { note: text },
    });
    return NextResponse.json({ note });
  } catch (e) {
    return errorResponse(e);
  }
}
