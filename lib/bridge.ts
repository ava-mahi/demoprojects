/**
 * Bridge to the standalone socket+engine server. Used by Next API routes
 * to read live prices and push realtime notifications.
 */
const URL = process.env.INTERNAL_API_URL || 'http://localhost:3001';
const SECRET = process.env.INTERNAL_API_SECRET || 'nova-internal-shared-secret-change-me';

async function call(path: string, init?: RequestInit) {
  try {
    return await fetch(`${URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', 'x-internal': SECRET, ...(init?.headers || {}) },
    });
  } catch (e) {
    // Standalone server may be down; degrade gracefully.
    return null;
  }
}

export async function getCurrentPrice(symbol: string): Promise<number | null> {
  const r = await call(`/internal/price?symbol=${encodeURIComponent(symbol)}`);
  if (!r || !r.ok) return null;
  const j = await r.json().catch(() => null);
  return j?.price ?? null;
}

export async function notifyUser(userId: string, event: string, payload: any) {
  await call('/internal/notify', { method: 'POST', body: JSON.stringify({ userId, event, payload }) });
}

export async function notifyBalance(userId: string, accountId: string, balance: string) {
  await call('/internal/balance', { method: 'POST', body: JSON.stringify({ userId, accountId, balance }) });
}

export async function notifyBroadcast(title: string, body: string, segment?: string) {
  await call('/internal/broadcast', { method: 'POST', body: JSON.stringify({ title, body, segment }) });
}
