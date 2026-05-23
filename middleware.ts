import { NextRequest, NextResponse } from 'next/server';

const PUBLIC = ['/login', '/register', '/forgot', '/'];
const APP_PROTECTED = ['/dashboard', '/trade', '/wallet', '/profile', '/history'];
const ADMIN_PROTECTED = ['/admin'];

/** Lightweight JWT payload decode (no signature check — security enforced server-side). */
function decodeJwt(token: string): { sub: string; role: 'USER' | 'ADMIN'; exp?: number } | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const padded = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(part.length + ((4 - (part.length % 4)) % 4), '=');
    const json = typeof atob !== 'undefined' ? atob(padded) : Buffer.from(padded, 'base64').toString('utf-8');
    const p = JSON.parse(json);
    if (p.exp && p.exp * 1000 < Date.now()) return null;
    return p;
  } catch { return null; }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.startsWith('/socket.io')) return NextResponse.next();

  const token = req.cookies.get('nv_at')?.value;
  const payload = token ? decodeJwt(token) : null;

  const isApp = APP_PROTECTED.some((p) => pathname.startsWith(p));
  const isAdmin = ADMIN_PROTECTED.some((p) => pathname.startsWith(p));

  if ((isApp || isAdmin) && !payload) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  if (isAdmin && payload?.role !== 'ADMIN') {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }
  if (PUBLIC.includes(pathname) && payload && pathname !== '/') {
    const url = req.nextUrl.clone();
    url.pathname = payload.role === 'ADMIN' ? '/admin' : '/dashboard';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
