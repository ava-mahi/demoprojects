'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, ArrowDownToLine, ArrowUpFromLine, Coins, Settings, BadgeDollarSign, Radio, Shield, FileText, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/admin', icon: LayoutDashboard, label: 'Overview' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/deposits', icon: ArrowDownToLine, label: 'Deposits' },
  { href: '/admin/withdrawals', icon: ArrowUpFromLine, label: 'Withdrawals' },
  { href: '/admin/assets', icon: TrendingUp, label: 'Assets' },
  { href: '/admin/risk', icon: Shield, label: 'Risk Dashboard' },
  { href: '/admin/broadcast', icon: Radio, label: 'Broadcasts' },
  { href: '/admin/logs', icon: FileText, label: 'Audit Logs' },
  { href: '/admin/methods', icon: Coins, label: 'Payment methods' },
  { href: '/admin/currencies', icon: BadgeDollarSign, label: 'Currencies' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <>
      <aside className="hidden md:flex w-56 shrink-0 border-r border-line flex-col py-3">
        {items.map((i) => {
          const active = path === i.href;
          return (
            <Link key={i.href} href={i.href} className={cn('mx-2 my-0.5 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm', active ? 'bg-up/15 text-up' : 'text-muted hover:text-text hover:bg-white/5')}>
              <i.icon size={16} /> {i.label}
            </Link>
          );
        })}
      </aside>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 glass-strong border-t border-line flex overflow-auto py-2">
        {items.map((i) => {
          const active = path === i.href;
          return (
            <Link key={i.href} href={i.href} className={cn('flex flex-col items-center min-w-[72px] gap-0.5 px-2 py-1.5 text-[10px]', active ? 'text-up' : 'text-muted')}>
              <i.icon size={16} />
              {i.label.split(' ')[0]}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
