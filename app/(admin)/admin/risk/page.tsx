'use client';
import { useState, useEffect } from 'react';
import { Shield, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatMoney } from '@/lib/utils';

export default function RiskDashboardPage() {
  const [data, setData] = useState<any>({ totalExposure: 0, maxPayoutLiability: 0, hotSymbols: [], openTradesCount: 0 });

  useEffect(() => {
    const load = () => {
      fetch('/api/admin/risk', { cache: 'no-store' })
        .then((r) => r.json())
        .then(setData)
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="text-brand" size={28} />
        <h1 className="text-2xl font-bold">Risk Dashboard</h1>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Open Trades" value={data.openTradesCount} icon={<TrendingUp size={20} />} />
        <StatCard label="Total Exposure" value={formatMoney(data.totalExposure, 'USD')} icon={<AlertTriangle size={20} />} color="text-yellow-400" />
        <StatCard label="Max Payout Liability" value={formatMoney(data.maxPayoutLiability, 'USD')} icon={<AlertTriangle size={20} />} color="text-red-400" />
        <StatCard label="Profit Margin" value={`${data.totalExposure > 0 ? (((data.totalExposure - (data.maxPayoutLiability - data.totalExposure)) / data.totalExposure) * 100).toFixed(1) : 0}%`} />
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="font-semibold text-lg mb-4">Hot Symbols (Top 10 by Open Interest)</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-line/60">
                <th className="pb-3">Symbol</th>
                <th className="pb-3 text-right">Open Trades</th>
                <th className="pb-3 text-right">Total Stake</th>
                <th className="pb-3 text-right">Max Payout</th>
                <th className="pb-3 text-right">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {data.hotSymbols.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted text-sm">No open trades</td>
                </tr>
              )}
              {data.hotSymbols.map((s: any) => {
                const risk = s.totalStake > 0 ? ((s.maxPayout - s.totalStake) / s.totalStake * 100) : 0;
                return (
                  <tr key={s.symbol} className="hover:bg-white/[0.02]">
                    <td className="py-3 font-semibold">{s.symbol}</td>
                    <td className="py-3 text-right">{s.count}</td>
                    <td className="py-3 text-right mono">{formatMoney(s.totalStake, 'USD')}</td>
                    <td className="py-3 text-right mono">{formatMoney(s.maxPayout, 'USD')}</td>
                    <td className="py-3 text-right">
                      <span className={`chip ${risk > 100 ? 'chip-down' : risk > 50 ? 'text-yellow-400' : 'chip-up'}`}>
                        {risk.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="font-semibold text-lg mb-2">Risk Metrics Explained</div>
        <div className="space-y-2 text-sm text-muted">
          <p><strong className="text-text">Total Exposure:</strong> Sum of all stakes on open binary trades</p>
          <p><strong className="text-text">Max Payout Liability:</strong> Worst-case payout if all open trades win</p>
          <p><strong className="text-text">Profit Margin:</strong> Expected profit if win rate matches payout %</p>
          <p><strong className="text-text">Risk %:</strong> Potential loss per symbol as % of stake (higher = more risk)</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: any; icon?: React.ReactNode; color?: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-muted uppercase tracking-widest">{label}</div>
        {icon && <div className={color || 'text-brand'}>{icon}</div>}
      </div>
      <div className={`mono text-2xl font-bold ${color || ''}`}>{value}</div>
    </div>
  );
}
