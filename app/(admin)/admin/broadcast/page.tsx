'use client';
import { useState, useEffect } from 'react';
import { Send, Radio } from 'lucide-react';
import { toast } from 'sonner';

export default function BroadcastPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [segment, setSegment] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin/broadcast', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setHistory(j.broadcasts || []))
      .catch(() => {});
  }, []);

  const handleSend = async () => {
    if (!title || !body) return toast.error('Title and body required');
    setLoading(true);
    try {
      const r = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, segment: segment || null }),
      });
      if (!r.ok) throw new Error();
      toast.success('Broadcast sent!');
      setTitle('');
      setBody('');
      setSegment('');
      const j = await r.json();
      setHistory([j.broadcast, ...history]);
    } catch {
      toast.error('Failed to send');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Radio className="text-brand" size={28} />
        <h1 className="text-2xl font-bold">Broadcast Center</h1>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="font-semibold text-lg">Send Notification</div>
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            className="input"
            placeholder="e.g., System Maintenance"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Message</label>
          <textarea
            className="input min-h-[100px]"
            placeholder="e.g., Trading will be paused for 10 minutes at 3 PM UTC."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Target Segment</label>
          <select className="input" value={segment} onChange={(e) => setSegment(e.target.value)}>
            <option value="">All Users</option>
            <option value="DEMO">Demo Accounts Only</option>
            <option value="LIVE">Live Accounts Only</option>
            <option value="ADMIN">Admins Only</option>
          </select>
          <p className="text-xs text-muted mt-1">Leave as "All Users" to notify everyone</p>
        </div>
        <button onClick={handleSend} disabled={loading || !title || !body} className="btn-primary w-full flex items-center justify-center gap-2">
          <Send size={16} />
          {loading ? 'Sending...' : 'Send Broadcast'}
        </button>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="font-semibold text-lg mb-4">Broadcast History</div>
        <div className="space-y-3">
          {history.length === 0 && <p className="text-muted text-sm">No broadcasts sent yet</p>}
          {history.map((bc) => (
            <div key={bc.id} className="p-4 bg-white/5 rounded-xl border border-line/60">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{bc.title}</div>
                  <p className="text-sm text-muted mt-1">{bc.body}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-muted">{new Date(bc.sentAt).toLocaleString()}</div>
                  {bc.segment && <div className="text-xs chip chip-brand mt-1">{bc.segment}</div>}
                  {!bc.segment && <div className="text-xs chip mt-1">ALL</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
