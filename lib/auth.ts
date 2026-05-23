import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import { signAccess, signRefresh, verifyAccess, verifyRefresh, type JwtPayload } from './jwt';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const ACCESS_COOKIE = 'nv_at';
export const REFRESH_COOKIE = 'nv_rt';

const isProd = process.env.NODE_ENV === 'production';

export function cookieOpts(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSec,
  };
}

export async function setAuthCookies(res: NextResponse, payload: JwtPayload, refreshHash?: string) {
  const access = signAccess(payload);
  const refresh = signRefresh(payload);
  res.cookies.set(ACCESS_COOKIE, access, cookieOpts(60 * 15));
  res.cookies.set(REFRESH_COOKIE, refresh, cookieOpts(60 * 60 * 24 * 30));
  return { access, refresh, refreshHash: refreshHash ?? sha256(refresh) };
}

export function clearAuthCookies(res: NextResponse) {
  res.cookies.set(ACCESS_COOKIE, '', { ...cookieOpts(0), maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, '', { ...cookieOpts(0), maxAge: 0 });
}

export function sha256(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

/** Read user from cookies in route handlers. */
export async function getAuthUser(): Promise<JwtPayload | null> {
  const c = await cookies();
  const t = c.get(ACCESS_COOKIE)?.value;
  if (!t) return null;
  return verifyAccess(t);
}

export async function requireUser(): Promise<JwtPayload> {
  const u = await getAuthUser();
  if (!u) throw new HttpError(401, 'Unauthorized');
  return u;
}

export async function requireAdmin(): Promise<JwtPayload> {
  const u = await requireUser();
  if (u.role !== 'ADMIN') throw new HttpError(403, 'Forbidden');
  return u;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function errorResponse(e: unknown) {
  if (e instanceof HttpError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: 'Internal error' }, { status: 500 });
}

/** For socket.io: extract from cookie header */
export function readAuthFromCookieHeader(cookieHeader?: string): JwtPayload | null {
  if (!cookieHeader) return null;
  const m = cookieHeader.split(/;\s*/).find((p) => p.startsWith(ACCESS_COOKIE + '='));
  if (!m) return null;
  const tok = decodeURIComponent(m.slice(ACCESS_COOKIE.length + 1));
  return verifyAccess(tok);
}

/** Used by middleware-style guard in route handlers when needing fresh access via refresh */
export async function tryRefresh(req: NextRequest): Promise<JwtPayload | null> {
  const t = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!t) return null;
  const payload = verifyRefresh(t);
  if (!payload) return null;
  const session = await prisma.session.findFirst({
    where: { userId: payload.sub, refreshHash: sha256(t), revokedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!session) return null;
  return payload;
}
