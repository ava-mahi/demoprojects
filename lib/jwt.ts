import jwt, { type SignOptions } from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me-32-chars-min';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me-32-chars-min';
const ACCESS_TTL = (process.env.JWT_ACCESS_TTL || '15m') as SignOptions['expiresIn'];
const REFRESH_TTL = (process.env.JWT_REFRESH_TTL || '30d') as SignOptions['expiresIn'];

export type JwtPayload = {
  sub: string; // user id
  email: string;
  role: 'USER' | 'ADMIN';
};

export function signAccess(payload: JwtPayload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

export function signRefresh(payload: JwtPayload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

export function verifyAccess(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function verifyRefresh(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
