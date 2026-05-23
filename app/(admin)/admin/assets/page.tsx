'use client';
import { useState, useEffect } from 'react';
import { Coins, Plus, Edit2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [creating, setCreating] = useState(false);
  const [newAsset, setNewAsset] = useState<any>({ symbol: '', name: '', kind: 'CRYPTO', enabled: true, payoutPct: 85, feed: 'sim', priceHint: 100, volatility: 0.002, drift: 0, precision: 4 });

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = () => {
    fetch('/api/admin/assets', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setAssets(j.assets || []))
      .catch(() => {});
  };

  const handleEdit = (asset: any) => {
    setEditing(asset.id);
    setEditData({ ...asset });
  };

  const handleSave = async (id: string) => {
    try {
      const r = await fetch('/api/admin/assets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editData }),
      });
      if (!r.ok) throw new Error();
      toast.success('Asset updated');
      setEditing(null);
      loadAssets();
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleCreate = async () => {
    try {
      const r = await fetch('/api/admin/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAsset),
      });
      if (!r.ok) throw new Error();
      toast.success('Asset created');
      setCreating(false);
      setNewAsset({ symbol: '', name: '', kind: 'CRYPTO', enabled: true, payoutPct: 85, feed: 'sim', priceHint: 100, volatility: 0.002, drift: 0, precision: 4 });
      loadAssets();
    } catch {
      toast.error('Failed to create');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Coins className="text-brand" size={28} />
          <h1 className="text-2xl font-bold">Asset Manager</h1>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Add Asset
        </button>
      </div>

      {creating && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-lg">Create New Asset</div>
            <button onClick={() => setCreating(false)} className="p-1 hover:bg-white/10 rounded-lg">
              <X size={18} />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input className="input" placeholder="Symbol (e.g., BTC/USD)" value={newAsset.symbol} onChange={(e) => setNewAsset({ ...newAsset, symbol: e.target.value })} />
            <input className="input" placeholder="Name" value={newAsset.name} onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })} />
            <select className="input" value={newAsset.kind} onChange={(e) => setNewAsset({ ...newAsset, kind: e.target.value })}>
              <option value="CRYPTO">Crypto</option>
              <option value="FOREX">Forex</option>
              <option value="STOCK">Stock</option>
              <option value="COMMODITY">Commodity</option>
            </select>
            <select className="input" value={newAsset.feed} onChange={(e) => setNewAsset({ ...newAsset, feed: e.target.value })}>
              <option value="sim">Simulated</option>
              <option value="binance">Binance</option>
            </select>
            <input className="input" type="number" placeholder="Payout %" value={newAsset.payoutPct} onChange={(e) => setNewAsset({ ...newAsset, payoutPct: parseInt(e.target.value, 10) })} />
            <input className="input" type="number" placeholder="Price Hint" value={newAsset.priceHint} onChange={(e) => setNewAsset({ ...newAsset, priceHint: parseFloat(e.target.value) })} />
            <input className="input" type="number" step="0.0001" placeholder="Volatility" value={newAsset.volatility} onChange={(e) => setNewAsset({ ...newAsset, volatility: parseFloat(e.target.value) })} />
            <input className="input" type="number" step="0.0001" placeholder="Drift" value={newAsset.drift} onChange={(e) => setNewAsset({ ...newAsset, drift: parseFloat(e.target.value) })} />
          </div>
          <button onClick={handleCreate} className="btn-primary w-full">Create Asset</button>
        </div>
      )}

      <div className="glass rounded-2xl p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-line/60">
                <th className="pb-3">Symbol</th>
                <th className="pb-3">Name</th>
                <th className="pb-3">Kind</th>
                <th className="pb-3">Feed</th>
                <th className="pb-3 text-right">Payout %</th>
                <th className="pb-3 text-right">Volatility</th>
                <th className="pb-3 text-right">Drift</th>
                <th className="pb-3 text-center">Enabled</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {assets.map((asset) => {
                const isEditing = editing === asset.id;
                const data = isEditing ? editData : asset;
                return (
                  <tr key={asset.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 font-semibold">{asset.symbol}</td>
                    <td className="py-3 text-sm">{isEditing ? <input className="input py-1 text-sm" value={data.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} /> : asset.name}</td>
                    <td className="py-3"><span className="chip text-xs">{asset.kind}</span></td>
                    <td className="py-3 text-sm">{asset.feed}</td>
                    <td className="py-3 text-right mono text-sm">{isEditing ? <input className="input py-1 text-sm w-20 text-right" type="number" value={data.payoutPct} onChange={(e) => setEditData({ ...editData, payoutPct: parseInt(e.target.value, 10) })} /> : `${asset.payoutPct}%`}</td>
                    <td className="py-3 text-right mono text-sm">{isEditing ? <input className="input py-1 text-sm w-24 text-right" type="number" step="0.0001" value={data.volatility} onChange={(e) => setEditData({ ...editData, volatility: parseFloat(e.target.value) })} /> : asset.volatility.toFixed(4)}</td>
                    <td className="py-3 text-right mono text-sm">{isEditing ? <input className="input py-1 text-sm w-24 text-right" type="number" step="0.0001" value={data.drift} onChange={(e) => setEditData({ ...editData, drift: parseFloat(e.target.value) })} /> : asset.drift.toFixed(4)}</td>
                    <td className="py-3 text-center">
                      {isEditing ? (
                        <input type="checkbox" checked={data.enabled} onChange={(e) => setEditData({ ...editData, enabled: e.target.checked })} />
                      ) : (
                        <span className={`chip text-xs ${asset.enabled ? 'chip-up' : 'chip-down'}`}>{asset.enabled ? 'Yes' : 'No'}</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleSave(asset.id)} className="p-1 hover:bg-green-500/20 rounded text-green-400">
                            <Save size={16} />
                          </button>
                          <button onClick={() => setEditing(null)} className="p-1 hover:bg-red-500/20 rounded text-red-400">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => handleEdit(asset)} className="p-1 hover:bg-white/10 rounded">
                          <Edit2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
