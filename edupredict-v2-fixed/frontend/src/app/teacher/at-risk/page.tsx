'use client';
import { useEffect, useState } from 'react';
import { mlAPI } from '@/lib/api';

const PERF_COLORS: Record<string,string> = { 'At Risk':'#f43f5e', 'Below Average':'#fb923c' };

export default function AtRiskPage() {
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mlAPI.atRisk()
      .then(r => setData(r.data))
      .catch(() => setData({
        at_risk_students: [],
        summary: { total_at_risk: 0, total_below_avg: 0, avg_cgpa_at_risk: 0, branches_affected: {} }
      }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading at-risk data...</div>;

  const students = data?.at_risk_students || [];
  const summary  = data?.summary || {};

  return (
    <div className="space-y-6">
      <div className="anim-fade-up">
        <h1 className="section-title text-2xl mb-1">🚨 At-Risk Students</h1>
        <p className="text-slate-400 text-sm">Students requiring immediate academic intervention</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 anim-fade-up anim-delay-1">
        <div className="card border-rose-500/30">
          <p className="text-slate-400 text-xs mb-1">At Risk</p>
          <p className="text-3xl font-bold text-rose-400">{summary.total_at_risk}</p>
        </div>
        <div className="card border-orange-500/30">
          <p className="text-slate-400 text-xs mb-1">Below Average</p>
          <p className="text-3xl font-bold text-orange-400">{summary.total_below_avg}</p>
        </div>
        <div className="card">
          <p className="text-slate-400 text-xs mb-1">Avg CGPA (At Risk)</p>
          <p className="text-3xl font-bold text-slate-100">{summary.avg_cgpa_at_risk}</p>
        </div>
        <div className="card">
          <p className="text-slate-400 text-xs mb-1">Branches Affected</p>
          <p className="text-3xl font-bold text-slate-100">{Object.keys(summary.branches_affected || {}).length}</p>
        </div>
      </div>

      {/* Branches breakdown */}
      {Object.keys(summary.branches_affected || {}).length > 0 && (
        <div className="card anim-fade-up anim-delay-2">
          <h3 className="font-semibold text-slate-200 mb-3">At-Risk by Branch</h3>
          <div className="space-y-2">
            {Object.entries(summary.branches_affected).sort(([,a],[,b])=>(b as number)-(a as number)).map(([br, cnt]) => (
              <div key={br} className="flex items-center gap-3">
                <span className="text-sm text-slate-300 w-48 truncate">{br}</span>
                <div className="flex-1 h-2 bg-slate-800 rounded-full">
                  <div className="h-2 bg-rose-500 rounded-full" style={{width:`${Math.min(100, (cnt as number)/summary.total_at_risk*100)}%`}}/>
                </div>
                <span className="text-sm text-rose-400 w-8 text-right font-bold">{cnt as number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Table */}
      <div className="card overflow-hidden anim-fade-up anim-delay-3">
        <h3 className="font-semibold text-slate-200 mb-4 p-1">⚠️ Students Needing Attention ({students.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs">
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Branch</th>
                <th className="text-center p-3">Sem</th>
                <th className="text-center p-3">CGPA</th>
                <th className="text-center p-3">Attendance</th>
                <th className="text-center p-3">Backlogs</th>
                <th className="text-center p-3">Stress</th>
                <th className="text-center p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-500">No at-risk data available (backend offline)</td></tr>
              ) : students.map((s: any, i: number) => (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-rose-500/5 transition-colors">
                  <td className="p-3 font-medium text-slate-100">{s.name}</td>
                  <td className="p-3 text-slate-400 text-xs">{s.branch}</td>
                  <td className="p-3 text-center text-slate-300">{s.semester}</td>
                  <td className="p-3 text-center font-bold text-rose-400">{s.cgpa}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs ${s.attendance_percent >= 75 ? 'text-yellow-400' : 'text-rose-400'}`}>{s.attendance_percent}%</span>
                  </td>
                  <td className="p-3 text-center text-rose-300">{s.backlogs}</td>
                  <td className="p-3 text-center">
                    <div className="flex gap-0.5 justify-center">
                      {[1,2,3,4,5].map(n => (
                        <div key={n} className={`w-2 h-2 rounded-full ${n<=s.stress_level ? 'bg-rose-500' : 'bg-slate-700'}`}/>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{background:`${PERF_COLORS[s.performance_label]||'#f43f5e'}20`, color:PERF_COLORS[s.performance_label]||'#f43f5e'}}>
                      {s.performance_label}
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
