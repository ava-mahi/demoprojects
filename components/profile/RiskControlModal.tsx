'use client';
import { useState, useEffect } from 'react';
import { X, Shield } from 'lucide-react';
import { toast } from 'sonner';

export function RiskControlModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [dailyLossLimit, setDailyLossLimit] = useState('');
  const [maxStake, setMaxStake] = useState('');
  const [cooldownSec, setCooldownSec] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch('/api/me/risk', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (j.riskControl) {
          setDailyLossLimit(j.riskControl.dailyLossLimit || '');
          setMaxStake(j.riskControl.maxStake || '');
          setCooldownSec(j.riskControl.cooldownSec || '');
        }
      })
      .catch(() => {});
  }, [open]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/me/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyLossLimit: dailyLossLimit ? parseFloat(dailyLossLimit) : null,
          maxStake: maxStake ? parseFloat(maxStake) : null,
          cooldownSec: cooldownSec ? parseInt(cooldownSec, 10) : null,
        }),
      });
      if (!r.ok) throw new Error();
      toast.success('Risk controls updated');
      onClose();
    } catch {
      toast.error('Failed to update');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-brand" />
            <h2 className="text-lg font-bold">Risk Controls</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-muted mb-4">Set limits to protect yourself from excessive losses.</p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Daily Loss Limit (USD)</label>
            <input
              type="number"
              className="input"
              placeholder="e.g., 500"
              value={dailyLossLimit}
              onChange={(e) => setDailyLossLimit(e.target.value)}
            />
            <p className="text-xs text-muted mt-1">Trading stops if you lose this amount today</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Stake per Trade (USD)</label>
            <input
              type="number"
              className="input"
              placeholder="e.g., 100"
              value={maxStake}
              onChange={(e) => setMaxStake(e.target.value)}
            />
            <p className="text-xs text-muted mt-1">Maximum amount you can risk on a single trade</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cooldown Between Trades (seconds)</label>
            <input
              type="number"
              className="input"
              placeholder="e.g., 30"
              value={cooldownSec}
              onChange={(e) => setCooldownSec(e.target.value)}
            />
            <p className="text-xs text-muted mt-1">Minimum time between consecutive trades</p>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary flex-1" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
