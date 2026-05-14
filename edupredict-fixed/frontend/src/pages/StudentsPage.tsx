import { useState } from 'react';
import { DEMO_USERS, getTier, initials, avatarColor } from '../store';
import { usePointsStore } from '../hooks';

const PERF: Record<string, string> = {
  Excellent:'#10b981', Good:'#38bdf8', Average:'#fbbf24', 'Below Average':'#fb923c', 'At Risk':'#f43f5e',
};

function predictPerf(cgpa: number): string {
  if (cgpa >= 8.5) return 'Excellent';
  if (cgpa >= 7.5) return 'Good';
  if (cgpa >= 6.0) return 'Average';
  if (cgpa >= 5.0) return 'Below Average';
  return 'At Risk';
}

export default function StudentsPage() {
  const { getPoints } = usePointsStore();
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('all');

  const branches = ['all', ...Array.from(new Set(DEMO_USERS.students.map(s => s.branch)))];

  const students = DEMO_USERS.students
    .filter(s => {
      const q = search.toLowerCase();
      const matchSearch = !q || s.name.toLowerCase().includes(q) || s.email.includes(q);
      const matchBranch = branch === 'all' || s.branch === branch;
      return matchSearch && matchBranch;
    })
    .map(s => ({
      ...s,
      pts: getPoints(s.id),
      tier: getTier(getPoints(s.id)),
      pred: predictPerf(s.cgpa),
    }));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div className="anim-fade-up">
        <h1 className="text-2xl font-bold mb-1">🎓 Students</h1>
        <p className="text-slate-400 text-sm">Manage and view all student records</p>
      </div>

      <div className="flex flex-wrap gap-3 anim-fade-up anim-delay-1">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students…" className="input text-sm flex-1 min-w-[200px]" />
        <select value={branch} onChange={e => setBranch(e.target.value)} className="input text-sm w-auto">
          {branches.map(b => <option key={b} value={b}>{b === 'all' ? 'All Branches' : b}</option>)}
        </select>
      </div>

      <div className="card anim-fade-up anim-delay-2">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
              {['Student', 'Branch', 'Sem', 'CGPA', 'Points', 'Prediction'].map(h => (
                <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map(s => {
              const col = avatarColor(s.name);
              return (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(148,163,184,0.06)' }}
                  className="transition-colors hover:bg-slate-800/20">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: `${col}22`, color: col }}>
                        {initials(s.name)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-100">{s.name}</div>
                        <div className="text-xs text-slate-500">{s.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-400 text-xs">{s.branch}</td>
                  <td className="py-3 px-3 text-slate-300">{s.semester}</td>
                  <td className="py-3 px-3">
                    <span className="font-mono font-bold" style={{ color: s.cgpa >= 7 ? '#10b981' : s.cgpa >= 5 ? '#fbbf24' : '#f43f5e' }}>
                      {s.cgpa}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold" style={{ color: s.tier.color }}>{s.pts}</span>
                    <span className="text-xs text-slate-500 ml-1">({s.tier.tier})</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${PERF[s.pred]}20`, color: PERF[s.pred] }}>
                      {s.pred}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {students.length === 0 && (
          <div className="text-center py-10 text-slate-500">No students found</div>
        )}
      </div>
    </div>
  );
}
