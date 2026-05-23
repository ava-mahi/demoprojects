'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/store/auth';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="glass rounded-2xl p-7 text-sm text-muted">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const refresh = useAuth((s) => s.refresh);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Login failed');
      await refresh();
      toast.success('Welcome back');
      const next = params.get('next') || (j.user.role === 'ADMIN' ? '/admin' : '/dashboard');
      router.push(next);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-7 shadow-card">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="text-sm text-muted mt-1">Welcome back. Continue trading.</p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <label className="block">
          <span className="text-xs text-muted">Email</span>
          <input className="input mt-1" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Password</span>
          <input className="input mt-1" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn btn-primary w-full mt-2" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <div className="mt-5 text-sm text-muted flex items-center justify-between">
        <Link href="/register" className="hover:text-text">Create account</Link>
        <Link href="/forgot" className="hover:text-text">Forgot password?</Link>
      </div>
      <div className="mt-6 text-xs text-muted text-center">
        Demo creds: <span className="mono">demo@nova.trade / Demo@12345</span>
      </div>
    </div>
  );
}
