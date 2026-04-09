'use client';
import { useEffect, useState } from 'react';
import { useAuthStore, usePointsStore, getTier, avatarColor, initials } from '@/store';
import { studentsAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const PERF_COLORS: Record<string,string> = { Excellent:'#10b981',Good:'#38bdf8',Average:'#fbbf24','Below Average':'#fb923c','At Risk':'#f43f5e' };

export default function TeacherStudentsPage() {
  const { user } = useAuthStore();
  const { getPoints } = usePointsStore();
  const [students, setStudents] = useState<any[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [q, setQ]               = useState('');
  const [branch, setBranch]     = useState('');
  const [perf, setPerf]         = useState('');
  const PER_PAGE = 20;

  const load = async () => {
    setLoading(true);
    try {
      const res = await studentsAPI.list({ page, per_page: PER_PAGE, q, branch, performance: perf });
      setStudents(res.data.students || []);
      setTotal(res.data.total || 0);
      if (res.data.branches?.length) setBranches(res.data.branches);
    } catch {
      // Demo fallback
      setStudents([]);
      setTotal(0);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, branch, perf]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); load(); };

  return (
    <div className="space-y-6">
      <div className="anim-fade-up">
        <h1 className="section-title text-2xl mb-1">🎓 Students</h1>
        <p className="text-slate-400 text-sm">Browse and search all {total} students in the dataset</p>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="card flex flex-wrap gap-3 anim-fade-up anim-delay-1">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name..."
          className="input text-sm flex-1 min-w-[180px]"/>
        <select value={branch} onChange={e => setBranch(e.target.value)} className="input text-sm w-48">
          <option value="">All Branches</option>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={perf} onChange={e => setPerf(e.target.value)} className="input text-sm w-44">
          <option value="">All Performance</option>
          {['Excellent','Good','Average','Below Average','At Risk'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button type="submit" className="btn-primary text-sm px-5">Search</button>
      </form>

      {/* Table */}
      <div className="card overflow-hidden anim-fade-up anim-delay-2">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs">
                <th className="text-left p-3">Student</th>
                <th className="text-left p-3">Branch</th>
                <th className="text-center p-3">Sem</th>
                <th className="text-center p-3">CGPA</th>
                <th className="text-center p-3">Attendance</th>
                <th className="text-center p-3">Backlogs</th>
                <th className="text-center p-3">Performance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">Loading...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">No students found</td></tr>
              ) : students.map((s, i) => {
                const col = avatarColor(s.name || '');
                const perf = s.performance_label || 'Average';
                return (
                  <tr key={s.student_id || i} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{background:`${col}22`, color:col}}>
                          {initials(s.name || 'S')}
                        </div>
                        <div>
                          <p className="font-medium text-slate-100">{s.name}</p>
                          <p className="text-[10px] text-slate-500">{s.student_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-slate-400 text-xs">{s.branch}</td>
                    <td className="p-3 text-center text-slate-300">{s.semester}</td>
                    <td className="p-3 text-center">
                      <span className="font-bold" style={{color: PERF_COLORS[perf]}}>{s.cgpa}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-xs ${s.attendance_percent >= 85 ? 'text-emerald-400' : s.attendance_percent >= 75 ? 'text-yellow-400' : 'text-rose-400'}`}>
                        {s.attendance_percent}%
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-xs ${s.backlogs === 0 ? 'text-emerald-400' : s.backlogs <= 1 ? 'text-yellow-400' : 'text-rose-400'}`}>
                        {s.backlogs}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{background:`${PERF_COLORS[perf]}20`, color:PERF_COLORS[perf]}}>
                        {perf}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > PER_PAGE && (
          <div className="flex items-center justify-between p-4 border-t border-slate-800">
            <span className="text-xs text-slate-500">
              {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,total)} of {total}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1}
                className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-30">← Prev</button>
              <button onClick={() => setPage(p=>p+1)} disabled={page*PER_PAGE>=total}
                className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-30">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
