'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, Bell, LogOut, User as UserIcon, Wallet as WalletIcon, Shield } from 'lucide-react';
import { useAuth, currentAccount } from '@/store/auth';
import { DepositModal } from '@/components/wallet/DepositModal';
import { NotificationBell } from '@/components/shell/NotificationBell';
import { formatMoney } from '@/lib/utils';
import { toast } from 'sonner';

export function Topbar() {
  const user = useAuth((s) => s.user);
  const mode = useAuth((s) => s.mode);
  const setMode = useAuth((s) => s.setMode);
  const [openDeposit, setOpenDeposit] = useState(false);
  const [menu, setMenu] = useState(false);
  const router = useRouter();

  const acct = user ? currentAccount(user, mode) : null;

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    toast.success('Signed out');
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line glass-strong">
      <div className="h-16 px-4 md:px-6 flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="inline-block w-7 h-7 rounded-lg bg-gradient-to-br from-brand to-up shadow-glow" />
          <span className="hidden sm:inline">Nova<span className="text-brand">Trade</span></span>
        </Link>

        <nav className="ml-3 hidden md:flex items-center gap-1 text-sm">
          <Link className="px-3 py-2 rounded-lg hover:bg-white/5" href="/dashboard">Dashboard</Link>
          <Link className="px-3 py-2 rounded-lg hover:bg-white/5" href="/trade">Trade</Link>
          <Link className="px-3 py-2 rounded-lg hover:bg-white/5" href="/wallet">Wallet</Link>
          <Link className="px-3 py-2 rounded-lg hover:bg-white/5" href="/history">History</Link>
          {user?.role === 'ADMIN' && <Link className="px-3 py-2 rounded-lg hover:bg-white/5 text-brand" href="/admin">Admin</Link>}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Account switcher */}
          <div className="hidden sm:flex items-center bg-white/5 border border-line rounded-lg overflow-hidden">
            {(['DEMO', 'LIVE'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 h-9 text-xs font-semibold ${mode === m ? (m === 'DEMO' ? 'bg-brand/20 text-brand' : 'bg-up/20 text-up') : 'text-muted hover:text-text'}`}
              >
                {m}
              </button>
            ))}
          </div>
          {/* Balance */}
          {acct && (
            <div className="hidden sm:flex items-center gap-2 px-3 h-9 rounded-lg bg-white/5 border border-line">
              <WalletIcon size={14} className="text-muted" />
              <span className="mono text-sm font-semibold">{formatMoney(acct.balance, acct.currency)}</span>
            </div>
          )}
          {/* Deposit + */}
          <button onClick={() => setOpenDeposit(true)} className="btn btn-primary h-9 px-3" title="Deposit">
            <Plus size={16} /> <span className="hidden sm:inline">Deposit</span>
          </button>
          <NotificationBell />
          {/* Profile menu */}
          <div className="relative">
            <button onClick={() => setMenu((v) => !v)} className="h-9 w-9 rounded-full bg-white/5 border border-line flex items-center justify-center hover:bg-white/10">
              <UserIcon size={16} />
            </button>
            {menu && (
              <div className="absolute right-0 mt-2 w-56 glass-strong rounded-xl p-1 shadow-card">
                <div className="px-3 py-2 border-b border-line">
                  <div className="text-sm font-semibold truncate">{user?.name || user?.email}</div>
                  <div className="text-xs text-muted truncate">{user?.email}</div>
                </div>
                <Link href="/profile" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-sm" onClick={() => setMenu(false)}>
                  <UserIcon size={14} /> Profile
                </Link>
                <Link href="/wallet" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-sm" onClick={() => setMenu(false)}>
                  <WalletIcon size={14} /> Wallet
                </Link>
                {user?.role === 'ADMIN' && (
                  <Link href="/admin" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-brand" onClick={() => setMenu(false)}>
                    <Shield size={14} /> Admin
                  </Link>
                )}
                <button onClick={logout} className="flex w-full items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-down">
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <DepositModal open={openDeposit} onClose={() => setOpenDeposit(false)} />
    </header>
  );
}
