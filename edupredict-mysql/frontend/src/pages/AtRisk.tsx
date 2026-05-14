import { DEMO_USERS, getTier, initials, avatarColor } from '../store';
import { usePointsStore } from '../hooks';

export default function AtRisk() {
  const { getPoints } = usePointsStore();

  const allStudents = DEMO_USERS.students.map(s => {
    const pts = getPoints(s.id);
    const pred = s.cgpa >= 8.5 ? 'Excellent' : s.cgpa >= 7.5 ? 'Good' : s.cgpa >= 6 ? 'Average' : s.cgpa >= 5 ? 'Below Average' : 'At Risk';
    const riskLevel = pred === 'At Risk' ? 'Critical' : pred === 'Below Average' ? 'High' : pred === 'Average' ? 'Moderate' : 'Low';
    return { ...s, pts, tier: getTier(pts), pred, riskLevel };
  });

  const atRisk = allStudents.filter(s => s.pred === 'At Risk' || s.pred === 'Below Average');
  const moderate = allStudents.filter(s => s.pred === 'Average');

  const riskColor: Record<string, string> = { Critical: '#f43f5e', High: '#fb923c', Moderate: '#fbbf24', Low: '#10b981' };

  const interventions: Record<string, string[]> = {
    Critical: ['Immediate counseling session', 'Weekly faculty meeting', 'Clear all backlogs', 'Peer tutoring assignment', 'Attendance monitoring'],
    High: ['Bi-weekly check-ins', 'Extra tutoring for weak subjects', 'Study plan creation', 'Parent/guardian notification'],
    Moderate: ['Monthly review', 'Study skill workshops', 'Online course recommendations'],
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}>
      <div className="anim-fade-up">
        <h1 className="text-2xl font-bold mb-1">🚨 At-Risk Students</h1>
        <p className="text-slate-400 text-sm">Students identified as needing academic support and intervention</p>
      </div>

      <div className="grid grid-cols-3 gap-4 anim-fade-up anim-delay-1">
        {[
          { label: 'Critical Risk', count: atRisk.filter(s => s.riskLevel === 'Critical').length, color: '#f43f5e', icon: '🚨' },
          { label: 'High Risk', count: atRisk.filter(s => s.riskLevel === 'High').length, color: '#fb923c', icon: '⚠️' },
          { label: 'Moderate Risk', count: moderate.length, color: '#fbbf24', icon: '📊' },
        ].map(r => (
          <div key={r.label} className="card text-center" style={{ border: `1px solid ${r.color}25` }}>
            <div className="text-2xl mb-1">{r.icon}</div>
            <div className="text-2xl font-bold mb-1" style={{ color: r.color }}>{r.count}</div>
            <div className="text-xs text-slate-400">{r.label}</div>
          </div>
        ))}
      </div>

      <div className="card anim-fade-up anim-delay-2">
        <h2 className="font-bold text-sm mb-4">Critical & High Risk Students</h2>
        {atRisk.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <div className="text-4xl mb-3">✅</div>
            <p>No at-risk students detected!</p>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
            {atRisk.map(s => {
              const col = avatarColor(s.name);
              const intList = interventions[s.riskLevel] || [];
              return (
                <div key={s.id} className="rounded-2xl p-5" style={{ background: `${riskColor[s.riskLevel]}08`, border: `1px solid ${riskColor[s.riskLevel]}25` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                        style={{ background: `${col}22`, color: col }}>
                        {initials(s.name)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-100">{s.name}</div>
                        <div className="text-xs text-slate-400">{s.branch} · Semester {s.semester}</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: `${riskColor[s.riskLevel]}20`, color: riskColor[s.riskLevel] }}>
                      {s.riskLevel} Risk
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                    <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(30,41,59,0.6)' }}>
                      <div className="font-bold" style={{ color: s.cgpa >= 6 ? '#fbbf24' : '#f43f5e' }}>{s.cgpa}</div>
                      <div className="text-xs text-slate-500">CGPA</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(30,41,59,0.6)' }}>
                      <div className="font-bold text-slate-200">Sem {s.semester}</div>
                      <div className="text-xs text-slate-500">Semester</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(30,41,59,0.6)' }}>
                      <div className="font-bold" style={{ color: riskColor[s.riskLevel] }}>{s.pred}</div>
                      <div className="text-xs text-slate-500">Prediction</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Recommended Interventions</div>
                    <div className="flex flex-wrap gap-1.5">
                      {intList.map(i => (
                        <span key={i} className="text-xs px-2 py-1 rounded-full" style={{ background: `${riskColor[s.riskLevel]}15`, color: riskColor[s.riskLevel] }}>
                          {i}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {moderate.length > 0 && (
        <div className="card anim-fade-up anim-delay-3">
          <h2 className="font-bold text-sm mb-4">Moderate Risk — Monitoring Required</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {moderate.map(s => {
              const col = avatarColor(s.name);
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-xl p-3"
                  style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: `${col}22`, color: col }}>
                    {initials(s.name)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-100">{s.name}</div>
                    <div className="text-xs text-slate-400">{s.branch} · CGPA: {s.cgpa}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
