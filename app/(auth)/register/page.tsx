'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/store/auth';

export default function RegisterPage() {
  const router = useRouter();
  const refresh = useAuth((s) => s.refresh);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Registration failed');
      await refresh();
      toast.success('Account created — welcome!');
      router.push('/dashboard');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-7 shadow-card">
      <h1 className="text-2xl font-bold">Create account</h1>
      <p className="text-sm text-muted mt-1">10,000 USD demo balance, instantly.</p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <label className="block">
          <span className="text-xs text-muted">Name</span>
          <input className="input mt-1" required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Email</span>
          <input className="input mt-1" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Password (min 8)</span>
          <input className="input mt-1" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn btn-primary w-full mt-2" disabled={loading}>
          {loading ? 'Creating...' : 'Create account'}
        </button>
      </form>
      <div className="mt-5 text-sm text-muted text-center">
        Already have an account? <Link href="/login" className="text-text hover:underline">Sign in</Link>
      </div>
    </div>
  );
}
