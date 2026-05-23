'use client';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    toast.success('If the account exists, a reset link has been sent.');
  }

  return (
    <div className="glass rounded-2xl p-7 shadow-card">
      <h1 className="text-2xl font-bold">Reset password</h1>
      <p className="text-sm text-muted mt-1">Enter your email and we'll send instructions.</p>
      {submitted ? (
        <div className="mt-6 text-sm text-muted">Check your inbox. (Email is stubbed in the demo.)</div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input className="input" type="email" placeholder="you@email.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn btn-primary w-full">Send reset link</button>
        </form>
      )}
      <div className="mt-5 text-sm text-muted text-center">
        <Link href="/login" className="hover:text-text">Back to sign in</Link>
      </div>
    </div>
  );
}
