'use client';
import { create } from 'zustand';

export type AccountSummary = { id: string; mode: 'DEMO' | 'LIVE'; balance: string; currency: string };
export type SessionUser = {
  id: string; email: string; name: string | null; role: 'USER' | 'ADMIN';
  displayCurrency: string; accounts: AccountSummary[];
} | null;

type State = {
  user: SessionUser;
  mode: 'DEMO' | 'LIVE';
  loaded: boolean;
  setUser: (u: SessionUser) => void;
  setMode: (m: 'DEMO' | 'LIVE') => void;
  updateBalance: (accountId: string, balance: string) => void;
  refresh: () => Promise<void>;
};

export const useAuth = create<State>((set, get) => ({
  user: null,
  mode: 'DEMO',
  loaded: false,
  setUser: (u) => set({ user: u, loaded: true }),
  setMode: (m) => set({ mode: m }),
  updateBalance: (accountId, balance) => {
    const u = get().user;
    if (!u) return;
    set({ user: { ...u, accounts: u.accounts.map((a) => (a.id === accountId ? { ...a, balance } : a)) } });
  },
  refresh: async () => {
    try {
      const r = await fetch('/api/auth/me', { cache: 'no-store' });
      const j = await r.json();
      set({ user: j.user, loaded: true });
    } catch {
      set({ user: null, loaded: true });
    }
  },
}));

export function currentAccount(user: NonNullable<SessionUser>, mode: 'DEMO' | 'LIVE') {
  return user.accounts.find((a) => a.mode === mode) || user.accounts[0];
}
