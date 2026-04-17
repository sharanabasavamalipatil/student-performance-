'use client';
import { useEffect, useState } from 'react';
import { useAuthStore, usePointsStore, DEMO_USERS, getTier, avatarColor, initials } from '@/store';
import { mlAPI } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const PERF_COLORS: Record<string,string> = { Excellent:'#10b981',Good:'#38bdf8',Average:'#fbbf24','Below Average':'#fb923c','At Risk':'#f43f5e' };

export default function TeacherOverview() {
  const { user } = useAuthStore();
  const { db }   = usePointsStore();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mlAPI.analytics()
      .then(r => setAnalytics(r.data))
      .catch(() => setAnalytics({
        branch_statistics:[{branch:'Computer Science',avg_cgpa:7.8,count:320},{branch:'Data Science',avg_cgpa:7.5,count:180},{branch:'Electronics',avg_cgpa:7.1,count:240},{branch:'Mechanical',avg_cgpa:6.9,count:200}],
        performance_distribution:{Excellent:180,Good:320,Average:280,'Below Average':150,'At Risk':70},
        total_students:2000, at_risk_count:70, excellent_count:180, avg_cgpa:7.1, avg_attendance:81,
      }))
      .finally(() => setLoading(false));
  }, []);

  const totalPts    = Object.values(db).reduce((a,b) => a + (b.points||0), 0);
  const topStudent  = [...DEMO_USERS.students].sort((a,b) => (db[b.id]?.points||0)-(db[a.id]?.points||0))[0];

  const barData = [...DEMO_USERS.students].map(s => ({ name: s.name.split(' ')[0], pts: db[s.id]?.points||0 })).sort((a,b) => b.pts-a.pts);
  const perfData = analytics ? Object.entries(analytics.performance_distribution||{}).map(([k,v]) => ({ name:k, value:v as number, color: PERF_COLORS[k]||'#94a3b8' })) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between anim-fade-up">
        <div>
          <h1 className="section-title text-2xl mb-1">Welcome, {user?.name?.split(' ').slice(0,2).join(' ')} 👋</h1>
          <p className="text-slate-400 text-sm">{user?.department} · {user?.subject}</p>
        </div>
        {analytics && (
          <div className="glass-sm rounded-xl px-4 py-2 text-sm text-slate-300">
            📊 Dataset: <span className="font-bold text-white">{analytics.total_students?.toLocaleString()}</span> students · Avg CGPA: <span className="font-bold text-indigo-400">{analytics.avg_cgpa}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon:'🎓', label:'My Students',       value: DEMO_USERS.students.length, color:'#6366f1' },
          { icon:'🏅', label:'Total Pts Awarded',  value: totalPts,                  color:'#10b981' },
          { icon:'🚨', label:'At Risk (Dataset)',  value: analytics?.at_risk_count || '—', color:'#f43f5e' },
          { icon:'🏆', label:'Excellent (Dataset)',value: analytics?.excellent_count || '—', color:'#fbbf24' },
        ].map((s,i) => (
          <div key={s.label} className={`card flex items-center gap-4 anim-fade-up anim-delay-${i}`}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background:`${s.color}18`,border:`1px solid ${s.color}30` }}>{s.icon}</div>
            <div>
              <div className="stat-number text-2xl font-bold" style={{ color:s.color }}>{s.value}</div>
              <div className="text-slate-400 text-xs">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* My students points bar - Recharts */}
        <div className="card">
          <h3 className="font-semibold text-slate-200 mb-4">🏅 Student Points — Recharts</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ left:-20 }}>
              <XAxis dataKey="name" tick={{ fill:'#64748b',fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#64748b',fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:'#1e293b',border:'1px solid #334155',borderRadius:'10px',color:'#f1f5f9',fontSize:12 }} cursor={{ fill:'rgba(99,102,241,0.08)' }} />
              <Bar dataKey="pts" name="Points" radius={[6,6,0,0]} fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance dist from CSV - Recharts Pie */}
        <div className="card">
          <h3 className="font-semibold text-slate-200 mb-4">📊 Dataset Performance ({analytics?.total_students?.toLocaleString() || '—'})</h3>
          {loading ? (
            <div className="h-[220px] flex items-center justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
          ) : perfData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={perfData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {perfData.map((e,i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background:'#1e293b',border:'1px solid #334155',borderRadius:'10px',color:'#f1f5f9',fontSize:12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:'11px',color:'#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">Loading dataset…</div>
          )}
        </div>
      </div>

      {/* Student points overview grid */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-200">🎓 All Students — Points Overview</h3>
          <span className="badge bg-indigo-500/20 text-indigo-300 text-xs">Click Award Points to add pts</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {DEMO_USERS.students.map((s,i) => {
            const pts  = db[s.id]?.points || 0;
            const tier = getTier(pts);
            const col  = avatarColor(s.name);
            return (
              <div key={s.id} className={`glass-sm rounded-xl p-4 anim-fade-up anim-delay-${i%4}`} style={{ borderColor:`${tier.color}25` }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center font-display font-bold text-sm flex-shrink-0" style={{ background:`${col}22`,color:col }}>{initials(s.name)}</div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{s.name.split(' ')[0]}</div>
                    <div className="text-slate-500 text-[10px]">CGPA {s.cgpa}</div>
                  </div>
                </div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="stat-number text-2xl font-bold" style={{ color:tier.color }}>{pts}</span>
                  <span className="text-[10px] text-slate-500">{tier.tier}</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width:`${Math.min(pts/200*100,100)}%`,background:`linear-gradient(90deg,${tier.color}88,${tier.color})`,transition:'width 0.8s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
