import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword, setAuthCookies, sha256, errorResponse, HttpError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(64).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new HttpError(409, 'Email already registered');
    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        accounts: {
          create: [
            { mode: 'DEMO', balance: 10000 },
            { mode: 'LIVE', balance: 0 },
          ],
        },
      },
    });
    const payload = { sub: user.id, email: user.email, role: user.role };
    const res = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    const { refresh, refreshHash } = await setAuthCookies(res, payload);
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
