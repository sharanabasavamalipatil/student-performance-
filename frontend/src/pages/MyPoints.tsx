import { useAuthStore, usePointsStore } from '../hooks';
import { getTier } from '../store';

export default function MyPoints() {
  const { user } = useAuthStore();
  const { getPoints, getLog, getNotifs, markRead } = usePointsStore();
  if (!user) return null;

  const pts = getPoints(user.id);
  const log = getLog(user.id);
  const notifs = getNotifs(user.id);
  const tier = getTier(pts);
  const unread = notifs.filter(n => !n.read);

  const progress = tier.nextAt ? ((pts - (tier.tier === 'Gold' ? 120 : tier.tier === 'Silver' ? 60 : 0)) / (tier.nextAt - (tier.tier === 'Gold' ? 120 : tier.tier === 'Silver' ? 60 : 0))) * 100 : 100;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}>
      <div className="anim-fade-up">
        <h1 className="text-2xl font-bold mb-1">🏅 My Points & Achievements</h1>
        <p className="text-slate-400 text-sm">Track your academic activity points and tier progress</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 anim-fade-up anim-delay-1">
        <div className="card text-center">
          <div className="text-4xl mb-2">{tier.badge.split(' ')[0]}</div>
          <div className="text-4xl font-bold mb-1" style={{ color: tier.color }}>{pts}</div>
          <div className="text-slate-400 text-sm mb-4">Total Points · {tier.badge}</div>
          {tier.nextAt && (
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>{tier.tier}</span>
                <span>{pts} / {tier.nextAt} pts to next tier</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.1)' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, progress)}%`, background: tier.color }} />
              </div>
            </div>
          )}
          {!tier.nextAt && <div className="text-xs text-purple-400 font-bold">🏆 Maximum Tier Achieved!</div>}
        </div>

        <div className="card">
          <h2 className="font-bold text-sm mb-3">ATS Score Boost</h2>
          <div className="flex items-end gap-3 mb-3">
            <div className="text-3xl font-bold text-emerald-400">+{tier.atsBoost}%</div>
            <div className="text-xs text-slate-400 mb-1">resume ranking boost</div>
          </div>
          <div className="space-y-2 text-xs text-slate-400">
            <p>Your {tier.tier} tier adds {tier.atsBoost}% to your ATS (Applicant Tracking System) profile score when you apply to companies.</p>
            {tier.tier === 'Bronze' && <p className="text-amber-400">Reach Silver (60 pts) for a 15% boost!</p>}
            {tier.tier === 'Silver' && <p className="text-amber-400">Reach Gold (120 pts) for a 25% boost!</p>}
          </div>
        </div>
      </div>

      {unread.length > 0 && (
        <div className="card anim-fade-up anim-delay-2">
          <h2 className="font-bold text-sm mb-3">🔔 New Notifications</h2>
          <div className="space-y-2">
            {unread.map(n => (
              <div key={n.id} className="flex items-start gap-3 rounded-xl p-3" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <span className="text-xl">{n.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-slate-100">{n.title}</div>
                  <div className="text-xs text-slate-400">{n.message}</div>
                </div>
                <button onClick={() => markRead(user.id, n.id)} className="text-xs text-indigo-400 hover:text-indigo-300 shrink-0">✓</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card anim-fade-up anim-delay-3">
        <h2 className="font-bold text-sm mb-4">Activity Log</h2>
        {log.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <div className="text-4xl mb-3">📋</div>
            <p>No activity yet. Your teacher can award you points!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {log.map(entry => (
              <div key={entry.id} className="flex items-center gap-3 rounded-xl p-3 transition-colors"
                style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(148,163,184,0.06)' }}>
                <span className="text-xl">{entry.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-100">{entry.label}</div>
                  <div className="text-xs text-slate-500 truncate">{entry.note || 'No note'} · {entry.awarded_by}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-emerald-400 font-bold text-sm">+{entry.points_earned}</div>
                  <div className="text-xs text-slate-500">{new Date(entry.date).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
