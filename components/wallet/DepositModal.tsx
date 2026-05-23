'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

type Method = {
  id: string; name: string; kind: string; network: string | null; address: string | null;
  minAmount: string; maxAmount: string; feePct: number; instructions: string | null;
};

export function DepositModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [methods, setMethods] = useState<Method[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState(50);
  const [txHash, setTxHash] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDone(false);
    setBusy(false);
    fetch('/api/wallet/methods', { cache: 'no-store' }).then((r) => r.json()).then((j) => {
      setMethods(j.methods);
      setSelected(j.methods[0]?.id ?? null);
    });
  }, [open]);

  const method = methods.find((m) => m.id === selected);

  async function submit() {
    if (!method) return;
    setBusy(true);
    try {
      const r = await fetch('/api/wallet/deposit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ methodId: method.id, amount, txHash: txHash || undefined }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed');
      setDone(true);
      toast.success('Deposit submitted — awaiting admin approval');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  function copy(s: string) {
    navigator.clipboard.writeText(s).then(() => toast.success('Copied'));
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
            onClick={(e) => e.stopPropagation()} className="w-full max-w-md glass-strong rounded-2xl shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h2 className="text-lg font-bold">Deposit</h2>
              <button onClick={onClose} className="text-muted hover:text-text"><X size={18} /></button>
            </div>
            {done ? (
              <div className="p-8 text-center">
                <CheckCircle2 size={48} className="mx-auto text-up" />
                <div className="mt-3 font-semibold">Deposit submitted</div>
                <p className="text-sm text-muted mt-1">Your request is pending admin approval. Funds appear in your LIVE balance once verified.</p>
                <button className="btn btn-primary mt-5" onClick={onClose}>Done</button>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div>
                  <div className="text-xs text-muted uppercase tracking-widest mb-1.5">Method</div>
                  <div className="grid grid-cols-2 gap-2">
                    {methods.map((m) => (
                      <button key={m.id} onClick={() => setSelected(m.id)} className={`p-3 rounded-lg border text-left text-sm ${selected === m.id ? 'border-brand bg-brand/10' : 'border-line bg-white/[0.03] hover:bg-white/[0.05]'}`}>
                        <div className="font-semibold">{m.name}</div>
                        <div className="text-[11px] text-muted">{m.network || m.kind}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {method?.address && (
                  <div className="rounded-xl bg-white/[0.03] border border-line p-3">
                    <div className="text-[11px] text-muted uppercase tracking-widest">Send to</div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="mono text-xs flex-1 truncate">{method.address}</code>
                      <button onClick={() => copy(method.address!)} className="btn btn-ghost h-8 px-2"><Copy size={14} /></button>
                    </div>
                    {method.instructions && <div className="text-[11px] text-muted mt-2">{method.instructions}</div>}
                  </div>
                )}
                <div>
                  <div className="text-xs text-muted uppercase tracking-widest mb-1.5">Amount (USD)</div>
                  <input type="number" min={1} className="input mono" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
                  {method && <div className="text-[11px] text-muted mt-1">Min {Number(method.minAmount)} · Max {Number(method.maxAmount)}{method.feePct ? ` · Fee ${method.feePct}%` : ''}</div>}
                </div>
                {method?.kind === 'crypto' && (
                  <div>
                    <div className="text-xs text-muted uppercase tracking-widest mb-1.5">Transaction hash (optional)</div>
                    <input className="input mono" placeholder="0x..." value={txHash} onChange={(e) => setTxHash(e.target.value)} />
                  </div>
                )}
                <button onClick={submit} disabled={busy || !method} className="btn btn-primary w-full">
                  {busy ? 'Submitting...' : 'Submit deposit'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
