import { useState, useRef, useEffect } from 'react';
import { useNotifCenter } from '../hooks';
import { NotifCenter, NotifCenterType } from '../store';

const TYPE_COLOR: Record<NotifCenterType, { color: string; bg: string }> = {
  points:      { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)'  },
  alert:       { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)'   },
  course:      { color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  achievement: { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  system:      { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)'  },
  reminder:    { color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface Props {
  userId: string;
  role: 'student' | 'teacher';
  setPage: (p: string) => void;
}

export default function NotificationCenter({ userId, role, setPage }: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const panelRef = useRef<HTMLDivElement>(null);
  const { notifs, unreadCount, markRead, markAllRead, delete: deleteNotif } = useNotifCenter(userId, role);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const displayed = filter === 'unread' ? notifs.filter(n => !n.read) : notifs;

  const handleAction = (n: NotifCenter) => {
    markRead(n.id);
    if (n.action) setPage(n.action.page);
    setOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(p => !p)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all"
        style={open
          ? { background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)' }
          : { background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(148,163,184,0.1)' }
        }
        title="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
            style={{ background: '#f43f5e', minWidth: '16px', height: '16px', padding: '0 3px' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed top-16 right-4 rounded-2xl shadow-2xl z-50"
          style={{
            background: 'rgba(10,15,30,0.98)',
            border: '1px solid rgba(148,163,184,0.12)',
            backdropFilter: 'blur(24px)',
            animation: 'notifIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
            maxHeight: '80vh', width: '380px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
            <div>
              <span className="font-bold text-sm text-slate-100">Notifications</span>
              {unreadCount > 0 && (
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(244,63,94,0.2)', color: '#f87171' }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 text-lg leading-none">×</button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 px-4 py-2" style={{ borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
            {(['all', 'unread'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="text-xs px-3 py-1 rounded-full capitalize transition-all"
                style={filter === f
                  ? { background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }
                  : { background: 'transparent', color: '#64748b' }
                }
              >
                {f} {f === 'all' ? `(${notifs.length})` : `(${unreadCount})`}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {displayed.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <div className="text-4xl mb-2">🎉</div>
                <div className="text-sm">All caught up!</div>
              </div>
            ) : (
              displayed.map(n => {
                const style = TYPE_COLOR[n.type];
                return (
                  <div
                    key={n.id}
                    className="group relative px-4 py-3 transition-all cursor-pointer"
                    style={{
                      borderBottom: '1px solid rgba(148,163,184,0.05)',
                      background: n.read ? 'transparent' : 'rgba(99,102,241,0.04)',
                    }}
                    onClick={() => markRead(n.id)}
                  >
                    {/* Unread dot */}
                    {!n.read && (
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ background: '#6366f1' }} />
                    )}

                    <div className="flex items-start gap-3 pl-2">
                      {/* Icon */}
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background: style.bg, border: `1px solid ${style.color}30` }}>
                        {n.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-xs text-slate-100 leading-snug">{n.title}</span>
                          <span className="text-[10px] text-slate-600 flex-shrink-0">{timeAgo(n.timestamp)}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>

                        {n.action && (
                          <button
                            onClick={e => { e.stopPropagation(); handleAction(n); }}
                            className="mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md transition-all"
                            style={{ background: style.bg, color: style.color, border: `1px solid ${style.color}30` }}
                          >
                            {n.action.label} →
                          </button>
                        )}
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 text-base leading-none flex-shrink-0 mt-0.5 transition-all"
                        title="Delete"
                      >×</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="px-4 py-2 text-center" style={{ borderTop: '1px solid rgba(148,163,184,0.06)' }}>
              <span className="text-xs text-slate-600">{notifs.length} notification{notifs.length !== 1 ? 's' : ''} total</span>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes notifIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
