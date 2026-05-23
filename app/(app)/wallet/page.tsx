'use client';
import { useEffect, useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { DepositModal } from '@/components/wallet/DepositModal';
import { WithdrawModal } from '@/components/wallet/WithdrawModal';
import { formatMoney, timeAgo } from '@/lib/utils';

export default function WalletPage() {
  const [data, setData] = useState<any>(null);
  const [openD, setOpenD] = useState(false);
  const [openW, setOpenW] = useState(false);

  async function load() {
    const r = await fetch('/api/wallet', { cache: 'no-store' });
    setData(await r.json());
  }
  useEffect(() => { load(); }, []);

  if (!data) return <div className="p-6 text-muted">Loading...</div>;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto pb-24 md:pb-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Wallet</h1>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => setOpenD(true)}><Plus size={16} /> Deposit</button>
          <button className="btn btn-ghost" onClick={() => setOpenW(true)}><Minus size={16} /> Withdraw</button>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {data.accounts.map((a: any) => (
          <div key={a.id} className="glass rounded-2xl p-5">
            <div className="text-xs text-muted uppercase tracking-widest">{a.mode} Account</div>
            <div className="mono text-3xl font-bold mt-2">{formatMoney(a.balance, a.currency)}</div>
            <div className="text-xs text-muted mt-1">{a.currency}</div>
          </div>
        ))}
      </div>

      <Section title="Recent transactions">
        {data.transactions.length === 0 ? <Empty /> : data.transactions.map((t: any) => (
          <Row key={t.id} left={t.type} mid={t.note || t.ref || ''} right={Number(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} sub={timeAgo(t.createdAt)} amountColor={Number(t.amount) >= 0 ? 'text-up' : 'text-down'} />
        ))}
      </Section>

      <Section title="Deposit history">
        {data.deposits.length === 0 ? <Empty /> : data.deposits.map((d: any) => (
          <Row key={d.id} left={`${d.method.name}${d.method.network ? ' · ' + d.method.network : ''}`} mid={d.status} right={Number(d.amount).toFixed(2)} sub={timeAgo(d.createdAt)} amountColor="text-up" />
        ))}
      </Section>

      <Section title="Withdrawal history">
        {data.withdrawals.length === 0 ? <Empty /> : data.withdrawals.map((w: any) => (
          <Row key={w.id} left={`${w.method.name}${w.method.network ? ' · ' + w.method.network : ''}`} mid={`${w.status} · ${w.destination.slice(0, 14)}...`} right={Number(w.amount).toFixed(2)} sub={timeAgo(w.createdAt)} amountColor="text-down" />
        ))}
      </Section>

      <DepositModal open={openD} onClose={() => { setOpenD(false); load(); }} />
      <WithdrawModal open={openW} onClose={() => { setOpenW(false); load(); }} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl">
      <div className="px-4 py-3 border-b border-line font-semibold">{title}</div>
      <div>{children}</div>
    </div>
  );
}
function Empty() { return <div className="p-6 text-sm text-muted text-center">Nothing here yet.</div>; }
function Row({ left, mid, right, sub, amountColor }: { left: string; mid: string; right: string; sub: string; amountColor?: string }) {
  return (
    <div className="px-4 py-3 border-b border-line/60 last:border-0 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{left}</div>
        <div className="text-[11px] text-muted truncate">{mid}</div>
      </div>
      <div className="text-right">
        <div className={`mono text-sm font-bold ${amountColor || ''}`}>{right}</div>
        <div className="text-[11px] text-muted">{sub}</div>
      </div>
    </div>
  );
}
