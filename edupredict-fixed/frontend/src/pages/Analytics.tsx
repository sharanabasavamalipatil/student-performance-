import { DEMO_USERS, getTier } from '../store';
import { usePointsStore } from '../hooks';

const PERF: Record<string, string> = {
  Excellent:'#10b981', Good:'#38bdf8', Average:'#fbbf24', 'Below Average':'#fb923c', 'At Risk':'#f43f5e',
};

export default function Analytics() {
  const { getPoints } = usePointsStore();

  const students = DEMO_USERS.students.map(s => {
    const pts = getPoints(s.id);
    const pred = s.cgpa >= 8.5 ? 'Excellent' : s.cgpa >= 7.5 ? 'Good' : s.cgpa >= 6 ? 'Average' : s.cgpa >= 5 ? 'Below Average' : 'At Risk';
    return { ...s, pts, tier: getTier(pts), pred };
  });

  const avgCgpa = students.reduce((s, st) => s + st.cgpa, 0) / students.length;
  const perfDist = students.reduce((acc, s) => { acc[s.pred] = (acc[s.pred] || 0) + 1; return acc; }, {} as Record<string, number>);
  const branchDist = students.reduce((acc, s) => { acc[s.branch] = (acc[s.branch] || 0) + 1; return acc; }, {} as Record<string, number>);
  const branchCgpa = Object.fromEntries(
    Array.from(new Set(students.map(s => s.branch))).map(b => {
      const bs = students.filter(s => s.branch === b);
      return [b, (bs.reduce((sum, s) => sum + s.cgpa, 0) / bs.length).toFixed(2)];
    })
  );

  const maxCgpa = Math.max(...Object.values(branchCgpa).map(Number));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}>
      <div className="anim-fade-up">
        <h1 className="text-2xl font-bold mb-1">📈 Class Analytics</h1>
        <p className="text-slate-400 text-sm">Performance analysis across all students</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 anim-fade-up anim-delay-1">
        {[
          { label: 'Class Average CGPA', value: avgCgpa.toFixed(2), color: '#6366f1' },
          { label: 'Highest CGPA', value: Math.max(...students.map(s => s.cgpa)).toFixed(1), color: '#10b981' },
          { label: 'Students Excelling', value: students.filter(s => s.pred === 'Excellent' || s.pred === 'Good').length, color: '#38bdf8' },
          { label: 'Need Support', value: students.filter(s => s.pred === 'At Risk' || s.pred === 'Below Average').length, color: '#f43f5e' },
        ].map(s => (
          <div key={s.label} className="card">
            <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider">{s.label}</div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 anim-fade-up anim-delay-2">
        <div className="card">
          <h2 className="font-bold text-sm mb-4">Performance Distribution</h2>
          <div className="space-y-3">
            {['Excellent', 'Good', 'Average', 'Below Average', 'At Risk'].map(p => {
              const count = perfDist[p] || 0;
              const pct = (count / students.length) * 100;
              return (
                <div key={p}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: PERF[p] }}>{p}</span>
                    <span className="text-slate-400">{count} students ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.1)' }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: PERF[p] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h2 className="font-bold text-sm mb-4">Average CGPA by Branch</h2>
          <div className="space-y-3">
            {Object.entries(branchCgpa).map(([branch, cgpa]) => {
              const pct = (parseFloat(cgpa) / maxCgpa) * 100;
              return (
                <div key={branch}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 truncate max-w-[180px]">{branch}</span>
                    <span className="font-mono text-indigo-400">{cgpa}/10</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.1)' }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: '#6366f1' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card anim-fade-up anim-delay-3">
        <h2 className="font-bold text-sm mb-4">Student Performance Matrix</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                {['Student', 'Branch', 'CGPA', 'Points', 'Tier', 'Prediction'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-slate-500 uppercase tracking-wider font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.sort((a, b) => b.cgpa - a.cgpa).map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
                  <td className="py-2.5 px-3 font-semibold text-slate-200">{s.name}</td>
                  <td className="py-2.5 px-3 text-slate-500">{s.branch.split(' ')[0]}</td>
                  <td className="py-2.5 px-3 font-mono font-bold" style={{ color: s.cgpa >= 7 ? '#10b981' : '#fbbf24' }}>{s.cgpa}</td>
                  <td className="py-2.5 px-3" style={{ color: s.tier.color }}>{s.pts}</td>
                  <td className="py-2.5 px-3 font-bold text-[10px]" style={{ color: s.tier.color }}>{s.tier.tier}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px]"
                      style={{ background: `${PERF[s.pred]}20`, color: PERF[s.pred] }}>
                      {s.pred}
                    </span>
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
