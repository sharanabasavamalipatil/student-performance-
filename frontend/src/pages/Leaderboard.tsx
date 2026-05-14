import { useAuthStore, usePointsStore } from '../hooks';
import { DEMO_USERS, getTier, initials, avatarColor } from '../store';

export default function Leaderboard() {
  const { user } = useAuthStore();
  const { getPoints } = usePointsStore();

  const entries = DEMO_USERS.students.map(s => ({
    ...s,
    pts: getPoints(s.id),
    tier: getTier(getPoints(s.id)),
  })).sort((a, b) => b.pts - a.pts);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}>
      <div className="anim-fade-up">
        <h1 className="text-2xl font-bold mb-1">🏆 Leaderboard</h1>
        <p className="text-slate-400 text-sm">Top performing students ranked by activity points</p>
      </div>

      <div className="grid grid-cols-3 gap-4 anim-fade-up anim-delay-1">
        {entries.slice(0, 3).map((e, i) => {
          const col = avatarColor(e.name);
          const medals = ['🥇', '🥈', '🥉'];
          return (
            <div key={e.id} className="card text-center" style={i === 0 ? { border: '1px solid rgba(251,191,36,0.3)' } : {}}>
              <div className="text-3xl mb-2">{medals[i]}</div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm mx-auto mb-2"
                style={{ background: `${col}22`, color: col, border: `1px solid ${col}44` }}>
                {initials(e.name)}
              </div>
              <div className="font-semibold text-sm text-slate-100">{e.name.split(' ')[0]}</div>
              <div className="text-xs text-slate-500 mb-2">{e.branch.split(' ')[0]}</div>
              <div className="text-xl font-bold" style={{ color: e.tier.color }}>{e.pts}</div>
              <div className="text-xs" style={{ color: e.tier.color }}>{e.tier.badge}</div>
            </div>
          );
        })}
      </div>

      <div className="card anim-fade-up anim-delay-2">
        <h2 className="font-bold text-sm mb-4">Full Rankings</h2>
        <div className="space-y-2">
          {entries.map((e, i) => {
            const col = avatarColor(e.name);
            const isMe = e.id === user?.id;
            return (
              <div key={e.id} className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
                style={{
                  background: isMe ? 'rgba(99,102,241,0.1)' : 'rgba(30,41,59,0.4)',
                  border: isMe ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(148,163,184,0.06)',
                }}>
                <div className="text-slate-500 font-mono text-sm w-6 text-center">#{i + 1}</div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0"
                  style={{ background: `${col}22`, color: col, border: `1px solid ${col}44` }}>
                  {initials(e.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                    {e.name}
                    {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>You</span>}
                  </div>
                  <div className="text-xs text-slate-500">{e.branch} · Sem {e.semester} · CGPA {e.cgpa}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold" style={{ color: e.tier.color }}>{e.pts} pts</div>
                  <div className="text-xs" style={{ color: e.tier.color }}>{e.tier.badge}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card anim-fade-up anim-delay-3">
        <h2 className="font-bold text-sm mb-3">Tier Benefits</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { badge:'🥉 Bronze', pts:'0–59',    boost:'+5%',  color:'#fb923c' },
            { badge:'🥈 Silver', pts:'60–119',  boost:'+15%', color:'#38bdf8' },
            { badge:'🥇 Gold',   pts:'120–199', boost:'+25%', color:'#fbbf24' },
            { badge:'🏅 Platinum',pts:'200+',   boost:'+35%', color:'#a78bfa' },
          ].map(t => (
            <div key={t.badge} className="rounded-xl p-3 text-center"
              style={{ background: `${t.color}10`, border: `1px solid ${t.color}25` }}>
              <div className="font-bold text-sm mb-1" style={{ color: t.color }}>{t.badge}</div>
              <div className="text-xs text-slate-500 mb-1">{t.pts} pts</div>
              <div className="text-xs font-bold text-emerald-400">ATS {t.boost}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
