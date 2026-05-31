import { useAuthStore } from '../hooks';
import { useNotifCenter } from '../hooks';
import { NotifCenter, NotifCenterType } from '../store';

const TYPE_COLOR: Record<NotifCenterType, { color: string; bg: string; label: string }> = {
  points:      { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   label: 'Points'      },
  alert:       { color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',    label: 'Alert'       },
  course:      { color: '#10b981', bg: 'rgba(16,185,129,0.1)',   label: 'Course'      },
  achievement: { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  label: 'Achievement' },
  system:      { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',   label: 'System'      },
  reminder:    { color: '#fb923c', bg: 'rgba(251,146,60,0.1)',   label: 'Reminder'    },
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) !== 1 ? 's' : ''} ago`;
}

interface Props { setPage: (p: string) => void; }

export default function Notifications({ setPage }: Props) {
  const { user, role } = useAuthStore();
  if (!user) return null;

  const { notifs, unreadCount, markRead, markAllRead, delete: deleteNotif } = useNotifCenter(user.id, role as 'student' | 'teacher');

  const handleAction = (n: NotifCenter) => {
    markRead(n.id);
    if (n.action) setPage(n.action.page);
  };

  const grouped = notifs.reduce((acc, n) => {
    const date = new Date(n.timestamp).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(n);
    return acc;
  }, {} as Record<string, NotifCenter[]>);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}>
      {/* Header */}
      <div className="anim-fade-up flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">🔔 Notifications</h1>
          <p className="text-slate-400 text-sm">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="btn-ghost text-xs px-4 py-2 mt-1"
          >
            ✓ Mark all read
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 anim-fade-up anim-delay-1">
        {[
          { label: 'Total', value: notifs.length, icon: '📬', color: '#6366f1' },
          { label: 'Unread', value: unreadCount, icon: '🔴', color: '#f43f5e' },
          { label: 'Read', value: notifs.length - unreadCount, icon: '✅', color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="card py-3 flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Notification list grouped by date */}
      {notifs.length === 0 ? (
        <div className="card text-center py-16 anim-fade-up anim-delay-2">
          <div className="text-5xl mb-3">🎉</div>
          <div className="font-semibold text-slate-300 mb-1">No notifications yet</div>
          <div className="text-sm text-slate-500">We'll notify you about points, courses, and important updates</div>
        </div>
      ) : (
        <div className="space-y-6 anim-fade-up anim-delay-2">
          {Object.entries(grouped).map(([date, dayNotifs]) => (
            <div key={date}>
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="flex-1 h-px" style={{ background: 'rgba(148,163,184,0.1)' }} />
                {date}
                <div className="flex-1 h-px" style={{ background: 'rgba(148,163,184,0.1)' }} />
              </div>
              <div className="space-y-2">
                {dayNotifs.map(n => {
                  const s = TYPE_COLOR[n.type];
                  return (
                    <div
                      key={n.id}
                      className="group relative rounded-2xl p-4 transition-all cursor-pointer hover:-translate-y-0.5"
                      style={{
                        background: n.read ? 'rgba(15,23,42,0.6)' : 'rgba(15,23,42,0.9)',
                        border: n.read ? '1px solid rgba(148,163,184,0.06)' : `1px solid ${s.color}25`,
                      }}
                      onClick={() => markRead(n.id)}
                    >
                      {/* Unread indicator */}
                      {!n.read && (
                        <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-r-full" style={{ background: s.color }} />
                      )}

                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                          style={{ background: s.bg, border: `1px solid ${s.color}30` }}>
                          {n.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-slate-100">{n.title}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                style={{ background: s.bg, color: s.color }}>
                                {TYPE_COLOR[n.type].label}
                              </span>
                              {!n.read && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                                  style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>NEW</span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500 flex-shrink-0">{timeAgo(n.timestamp)}</span>
                          </div>
                          <p className="text-sm text-slate-400 leading-relaxed mb-3">{n.message}</p>

                          <div className="flex items-center gap-2">
                            {n.action && (
                              <button
                                onClick={e => { e.stopPropagation(); handleAction(n); }}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                                style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}30` }}
                              >
                                {n.action.label} →
                              </button>
                            )}
                            {!n.read && (
                              <button
                                onClick={e => { e.stopPropagation(); markRead(n.id); }}
                                className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1"
                              >
                                Mark read
                              </button>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                              className="ml-auto text-xs text-slate-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 px-2 py-1"
                            >
                              🗑 Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
