'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

type Method = { id: string; name: string; kind: string; network: string | null; minAmount: string; maxAmount: string; feePct: number };

export function WithdrawModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [methods, setMethods] = useState<Method[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState(50);
  const [destination, setDestination] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDone(false); setBusy(false); setAmount(50); setDestination(''); setPassword('');
    fetch('/api/wallet/methods', { cache: 'no-store' }).then((r) => r.json()).then((j) => {
      setMethods(j.methods);
      setSelected(j.methods[0]?.id ?? null);
    });
  }, [open]);

  async function submit() {
    if (!selected) return;
    setBusy(true);
    try {
      const r = await fetch('/api/wallet/withdraw', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ methodId: selected, amount, destination, password }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed');
      setDone(true);
      toast.success('Withdrawal submitted');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
            onClick={(e) => e.stopPropagation()} className="w-full max-w-md glass-strong rounded-2xl shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h2 className="text-lg font-bold">Withdraw</h2>
              <button onClick={onClose} className="text-muted hover:text-text"><X size={18} /></button>
            </div>
            {done ? (
              <div className="p-8 text-center">
                <CheckCircle2 size={48} className="mx-auto text-up" />
                <div className="mt-3 font-semibold">Withdrawal submitted</div>
                <p className="text-sm text-muted mt-1">Funds are on hold and will be released to your destination once admin approves.</p>
                <button className="btn btn-primary mt-5" onClick={onClose}>Done</button>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                <div>
                  <div className="text-xs text-muted uppercase tracking-widest mb-1.5">Method</div>
                  <select className="input" value={selected ?? ''} onChange={(e) => setSelected(e.target.value)}>
                    {methods.map((m) => <option key={m.id} value={m.id}>{m.name}{m.network ? ` · ${m.network}` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-xs text-muted uppercase tracking-widest mb-1.5">Amount (USD)</div>
                  <input type="number" className="input mono" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
                </div>
                <div>
                  <div className="text-xs text-muted uppercase tracking-widest mb-1.5">Destination address / account</div>
                  <input className="input mono" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Wallet address or IBAN" />
                </div>
                <div>
                  <div className="text-xs text-muted uppercase tracking-widest mb-1.5">Confirm password</div>
                  <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <button onClick={submit} disabled={busy || !destination || !password} className="btn btn-primary w-full">{busy ? 'Submitting...' : 'Submit withdrawal'}</button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
