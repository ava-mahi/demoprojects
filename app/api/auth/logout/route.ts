import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { REFRESH_COOKIE, clearAuthCookies, sha256 } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const c = await cookies();
  const rt = c.get(REFRESH_COOKIE)?.value;
  if (rt) {
    await prisma.session.updateMany({ where: { refreshHash: sha256(rt) }, data: { revokedAt: new Date() } });
  }
  const res = NextResponse.json({ ok: true });
  clearAuthCookies(res);
  return res;
}
