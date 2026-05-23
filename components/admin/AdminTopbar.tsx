'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, ExternalLink, LogOut } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { toast } from 'sonner';

export function AdminTopbar() {
  const user = useAuth((s) => s.user);
  const router = useRouter();
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    toast.success('Signed out');
    router.push('/login');
  }
  return (
    <header className="sticky top-0 z-30 border-b border-line glass-strong">
      <div className="h-16 px-4 md:px-6 flex items-center gap-3">
        <Link href="/admin" className="flex items-center gap-2 font-bold tracking-tight">
          <Shield size={20} className="text-up" /> Nova<span className="text-up">Admin</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/dashboard" className="btn btn-ghost h-9 px-3"><ExternalLink size={14} /> User app</Link>
          <span className="text-sm text-muted hidden sm:inline">{user?.email}</span>
          <button onClick={logout} className="btn btn-ghost h-9 px-3"><LogOut size={14} /> Sign out</button>
        </div>
      </div>
    </header>
  );
}
