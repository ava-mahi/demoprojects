'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, LineChart, Wallet, History, User, Shield } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/trade', icon: LineChart, label: 'Trade' },
  { href: '/wallet', icon: Wallet, label: 'Wallet' },
  { href: '/history', icon: History, label: 'History' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export function SideNav() {
  const path = usePathname();
  const user = useAuth((s) => s.user);
  return (
    <>
      <aside className="hidden md:flex w-16 lg:w-56 shrink-0 border-r border-line flex-col py-3">
        {items.map((i) => {
          const active = path === i.href || path?.startsWith(i.href + '/');
          return (
            <Link key={i.href} href={i.href} className={cn(
              'mx-2 my-0.5 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm',
              active ? 'bg-brand/15 text-brand' : 'text-muted hover:text-text hover:bg-white/5'
            )}>
              <i.icon size={18} />
              <span className="hidden lg:inline">{i.label}</span>
            </Link>
          );
        })}
        {user?.role === 'ADMIN' && (
          <Link href="/admin" className={cn(
            'mx-2 mt-auto flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm',
            path?.startsWith('/admin') ? 'bg-up/15 text-up' : 'text-muted hover:text-text hover:bg-white/5'
          )}>
            <Shield size={18} /> <span className="hidden lg:inline">Admin</span>
          </Link>
        )}
      </aside>
      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 glass-strong border-t border-line flex justify-around py-2">
        {items.map((i) => {
          const active = path === i.href;
          return (
            <Link key={i.href} href={i.href} className={cn('flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px]', active ? 'text-brand' : 'text-muted')}>
              <i.icon size={18} />
              {i.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
