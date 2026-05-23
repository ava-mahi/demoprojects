import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(n: number, precision = 4): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: precision, maximumFractionDigits: precision });
}

const CCY_SYMS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', PKR: '₨', INR: '₹', PHP: '₱', BDT: '৳', JPY: '¥',
};

export function formatMoney(amount: number | string, currency = 'USD'): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  const sym = CCY_SYMS[currency] || '';
  return `${sym}${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function shortId(id: string) {
  return id.slice(0, 6).toUpperCase();
}

export function timeAgo(d: Date | string): string {
  const date = new Date(d);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
