import { DEMO_USERS, getTier, toast } from '../store';
import { usePointsStore } from '../hooks';

interface Props { setPage: (p: string) => void; }

const PERF_COLOR: Record<string, string> = {
  Excellent: '#10b981', Good: '#38bdf8', Average: '#fbbf24',
  'Below Average': '#fb923c', 'At Risk': '#f43f5e',
};

export default function TeacherDashboard({ setPage }: Props) {
  const { getPoints, getLog } = usePointsStore();

  const students = DEMO_USERS.students.map(s => ({
    ...s,
    pts: getPoints(s.id),
    tier: getTier(getPoints(s.id)),
    log: getLog(s.id),
    prediction:
      s.cgpa >= 8.5 ? 'Excellent'
      : s.cgpa >= 7.5 ? 'Good'
      : s.cgpa >= 6.0 ? 'Average'
      : s.cgpa >= 5.0 ? 'Below Average'
      : 'At Risk',
  }));

  const avgCgpa = (students.reduce((s, st) => s + st.cgpa, 0) / students.length).toFixed(2);
  const atRisk = students.filter(s => s.prediction === 'At Risk' || s.prediction === 'Below Average');
  const totalPoints = students.reduce((s, st) => s + st.pts, 0);
  const excellent = students.filter(s => s.prediction === 'Excellent' || s.prediction === 'Good');

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}>
      {/* Header */}
      <div className="anim-fade-up">
        <h1 style={{ fontSize:"1.65rem", fontWeight:800, letterSpacing:"-0.025em", marginBottom:"0.35rem" }}>📊 Teacher Overview</h1>
        <p style={{ color:"#64748b", fontSize:"0.875rem" }}>Class performance dashboard — Academic Year 2024–25</p>
      </div>

      {/* Top stats — 2 cols on mobile, 4 on desktop */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"1rem" }} className="anim-fade-up anim-delay-1">
        {[
          { label: 'Total Students', value: students.length,  color: '#6366f1', icon: '🎓', sub: 'enrolled' },
          { label: 'Avg CGPA',       value: avgCgpa,          color: '#10b981', icon: '📊', sub: 'class average' },
          { label: 'At Risk',        value: atRisk.length,    color: '#f43f5e', icon: '🚨', sub: 'need attention', onClick: () => setPage('atrisk') },
          { label: 'Points Awarded', value: totalPoints,      color: '#fbbf24', icon: '🏅', sub: 'total this year' },
        ].map(s => (
          <div
            key={s.label}
            className={`card transition-all ${s.onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:border-rose-500/30' : ''}`}
            onClick={s.onClick}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider leading-tight">{s.label}</span>
              <span className="text-xl">{s.icon}</span>
            </div>
            <div className="text-3xl font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-slate-500">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Performance distribution bar */}
      <div className="card anim-fade-up anim-delay-1">
        <h2 className="font-bold text-sm mb-4">Class Performance Distribution</h2>
        <div className="space-y-2">
          {(['Excellent','Good','Average','Below Average','At Risk'] as const).map(level => {
            const count = students.filter(s => s.prediction === level).length;
            const pct = Math.round((count / students.length) * 100);
            return (
              <div key={level}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{level}</span>
                  <span className="font-mono font-semibold" style={{ color: PERF_COLOR[level] }}>{count} student{count !== 1 ? 's' : ''} ({pct}%)</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.08)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: PERF_COLOR[level] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Students list + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 anim-fade-up anim-delay-2">
        {/* All students */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-sm">All Students</h2>
            <button onClick={() => setPage('students')} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">View all →</button>
          </div>
          <div className="space-y-2">
            {students.map(s => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer transition-all hover:-translate-x-0.5"
                style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(148,163,184,0.06)' }}
                onClick={() => setPage('students')}
              >
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-slate-100 truncate">{s.name}</div>
                  <div className="text-xs text-slate-500 truncate">{s.branch} · Sem {s.semester}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  <span className="text-xs font-mono text-slate-300 font-semibold">{s.cgpa}</span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${PERF_COLOR[s.prediction]}18`, color: PERF_COLOR[s.prediction] }}
                  >{s.prediction}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-bold text-sm mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { icon: '🏅', label: 'Award Points to Students', sub: 'Recognize achievements', page: 'award',      color: '#fbbf24' },
                { icon: '🚨', label: 'View At-Risk Students',    sub: `${atRisk.length} need attention`,page: 'atrisk',    color: '#f43f5e' },
                { icon: '📈', label: 'Class Analytics',          sub: 'Performance trends',  page: 'analytics',  color: '#6366f1' },
                { icon: '🎓', label: 'All Students',             sub: 'Full roster view',    page: 'students',   color: '#38bdf8' },
                { icon: '🏆', label: 'Leaderboard',              sub: 'Student rankings',    page: 'leaderboard',color: '#10b981' },
              ].map(q => (
                <button
                  key={q.label}
                  onClick={() => setPage(q.page)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all group"
                  style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(148,163,184,0.08)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${q.color}50`; (e.currentTarget as HTMLButtonElement).style.background = `${q.color}08`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(148,163,184,0.08)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(30,41,59,0.5)'; }}
                >
                  <span className="text-xl">{q.icon}</span>
                  <div>
                    <div className="font-semibold text-sm text-slate-100">{q.label}</div>
                    <div className="text-xs text-slate-500">{q.sub}</div>
                  </div>
                  <span className="ml-auto text-slate-600 group-hover:text-slate-400 transition-colors">→</span>
                </button>
              ))}
            </div>
          </div>

          {/* Top performers mini card */}
          <div className="card">
            <h2 className="font-bold text-sm mb-3">🌟 Top Performers</h2>
            <div className="space-y-2">
              {excellent.slice(0, 3).map((s, i) => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="text-sm w-5 text-center text-slate-500 font-mono">#{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-100 truncate">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.branch}</div>
                  </div>
                  <span className="text-sm font-bold font-mono" style={{ color: PERF_COLOR[s.prediction] }}>{s.cgpa}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* At Risk alert section */}
      {atRisk.length > 0 && (
        <div className="card anim-fade-up anim-delay-3" style={{ border: '1px solid rgba(244,63,94,0.25)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-sm text-rose-300">🚨 Students Needing Attention ({atRisk.length})</h2>
            <button onClick={() => setPage('atrisk')} className="text-xs text-rose-400 hover:text-rose-300 transition-colors">Full report →</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {atRisk.map(s => (
              <div
                key={s.id}
                className="rounded-xl p-3 cursor-pointer transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)' }}
                onClick={() => { setPage('atrisk'); toast.warning(`${s.name}`, `CGPA ${s.cgpa} — ${s.prediction}`); }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-sm text-slate-100">{s.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{s.branch} · CGPA: <span className="font-bold text-rose-400">{s.cgpa}</span> · Sem {s.semester}</div>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
                    style={{ background: `${PERF_COLOR[s.prediction]}18`, color: PERF_COLOR[s.prediction] }}>
                    {s.prediction}
                  </span>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); setPage('award'); toast.info('Award Points', `Recognise ${s.name}'s efforts to motivate them`); }}
                    className="text-[10px] px-2 py-1 rounded-lg transition-colors"
                    style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}
                  >🏅 Award Points</button>
                  <button
                    onClick={e => { e.stopPropagation(); setPage('analytics'); }}
                    className="text-[10px] px-2 py-1 rounded-lg transition-colors"
                    style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}
                  >📈 View Analytics</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
