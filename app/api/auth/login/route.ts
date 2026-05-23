import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword, setAuthCookies, errorResponse, HttpError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new HttpError(401, 'Invalid credentials');
    if (user.blocked) throw new HttpError(403, 'Account is blocked');
    const ok = await verifyPassword(data.password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'Invalid credentials');

    const payload = { sub: user.id, email: user.email, role: user.role };
    const res = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
    const { refreshHash } = await setAuthCookies(res, payload);
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        userAgent: req.headers.get('user-agent') || '',
      },
    });
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}
