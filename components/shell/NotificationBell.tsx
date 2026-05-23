'use client';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { getSocket } from '@/lib/socket-client';
import { timeAgo } from '@/lib/utils';

type Notif = { id: string; kind: string; title: string; body: string | null; read: boolean; createdAt: string };

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);

  async function load() {
    try {
      const r = await fetch('/api/notifications', { cache: 'no-store' });
      const j = await r.json();
      setItems(j.notifications || []);
    } catch {}
  }

  useEffect(() => {
    load();
    const s = getSocket();
    const onEvent = () => load();
    s.on('event', onEvent);
    s.on('balance', onEvent);
    return () => { s.off('event', onEvent); s.off('balance', onEvent); };
  }, []);

  const unread = items.filter((i) => !i.read).length;

  async function markAll() {
    await fetch('/api/notifications', { method: 'POST', body: '{}' });
    load();
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="relative h-9 w-9 rounded-full bg-white/5 border border-line flex items-center justify-center hover:bg-white/10">
        <Bell size={16} />
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-down text-[10px] font-bold flex items-center justify-center text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 glass-strong rounded-xl shadow-card overflow-hidden">
          <div className="px-3 py-2 border-b border-line flex items-center justify-between">
            <span className="text-sm font-semibold">Notifications</span>
            <button onClick={markAll} className="text-xs text-muted hover:text-text">Mark all read</button>
          </div>
          <div className="max-h-96 overflow-auto">
            {items.length === 0 && <div className="p-4 text-sm text-muted text-center">No notifications</div>}
            {items.map((n) => (
              <div key={n.id} className={`px-3 py-2.5 border-b border-line last:border-0 ${n.read ? 'opacity-70' : ''}`}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold truncate">{n.title}</span>
                  <span className="text-[10px] text-muted">{timeAgo(n.createdAt)}</span>
                </div>
                {n.body && <div className="text-xs text-muted mt-0.5">{n.body}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
