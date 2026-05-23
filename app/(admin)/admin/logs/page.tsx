'use client';
import { useState, useEffect } from 'react';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);

  useEffect(() => {
    fetch(`/api/admin/logs?page=${page}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        setLogs(j.logs || []);
        setTotal(j.total || 0);
        setPages(j.pages || 0);
      })
      .catch(() => {});
  }, [page]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="text-brand" size={28} />
        <h1 className="text-2xl font-bold">Audit Logs</h1>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted">{total} total entries</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary p-2 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm px-3">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="btn-secondary p-2 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-line/60">
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Actor</th>
                <th className="pb-3">Action</th>
                <th className="pb-3">Target</th>
                <th className="pb-3">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted text-sm">
                    No logs found
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 text-sm mono">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="py-3 text-sm">{log.actor?.email || 'N/A'}</td>
                  <td className="py-3">
                    <span className="chip chip-brand text-xs">{log.action}</span>
                  </td>
                  <td className="py-3 text-sm mono text-muted">{log.target || '-'}</td>
                  <td className="py-3 text-xs text-muted max-w-xs truncate">
                    {log.meta ? JSON.stringify(log.meta) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
