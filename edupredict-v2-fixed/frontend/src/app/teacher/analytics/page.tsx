'use client';
import { useEffect, useState } from 'react';
import { mlAPI } from '@/lib/api';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RT, ResponsiveContainer, CartesianGrid, BarChart, Bar as RBar } from 'recharts';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

const CJOPTS: any = { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ color:'#94a3b8',font:{size:11} } } }, scales:{ x:{ ticks:{color:'#64748b',font:{size:10}}, grid:{color:'rgba(255,255,255,0.04)'} }, y:{ ticks:{color:'#64748b',font:{size:10}}, grid:{color:'rgba(255,255,255,0.04)'} } } };
const PERF_C:Record<string,string> = { Excellent:'#10b981',Good:'#38bdf8',Average:'#fbbf24','Below Average':'#fb923c','At Risk':'#f43f5e' };

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mlAPI.analytics()
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>;

  if (!data) return (
    <div className="card text-center py-16">
      <div className="text-4xl mb-3">⚠️</div>
      <h2 className="section-title text-xl mb-2">Backend Offline</h2>
      <p className="text-slate-400 text-sm">Start the backend to load analytics from the dataset:<br/><code className="font-mono text-indigo-400 text-xs">cd backend && python main.py</code></p>
    </div>
  );

  const branchChart = {
    labels: data.branch_statistics.map((b:any) => b.branch.split(' ')[0]),
    datasets:[{ label:'Avg CGPA', data:data.branch_statistics.map((b:any)=>b.avg_cgpa), backgroundColor:'rgba(99,102,241,0.75)', borderRadius:6 },
              { label:'Count',    data:data.branch_statistics.map((b:any)=>b.count||0),  backgroundColor:'rgba(16,185,129,0.5)',  borderRadius:6 }],
  };
  const semChart = {
    labels: data.semester_statistics?.map((s:any) => `Sem ${s.semester}`) || [],
    datasets:[
      { label:'Avg CGPA',      data:data.semester_statistics?.map((s:any)=>s.avg_cgpa),   borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.1)',  tension:0.4, fill:true },
      { label:'Avg Study Hrs', data:data.semester_statistics?.map((s:any)=>s.avg_study),  borderColor:'#6366f1', backgroundColor:'rgba(99,102,241,0.1)',   tension:0.4, fill:true },
    ],
  };
  const skillData = Object.entries(data.skill_averages||{}).map(([k,v]:any) => ({ skill:k.charAt(0).toUpperCase()+k.slice(1), score:v }));
  const stressData = (data.stress_vs_cgpa||[]).map((s:any) => ({ stress:`Lvl ${s.stress_level}`, cgpa:s.avg_cgpa, count:s.count }));

  return (
    <div className="space-y-6">
      <div className="anim-fade-up">
        <h1 className="section-title text-2xl mb-1">📈 Analytics</h1>
        <p className="text-slate-400 text-sm">From <strong className="text-white">{data.total_students?.toLocaleString()}</strong> students in the dataset · Avg CGPA: <strong className="text-indigo-400">{data.avg_cgpa}</strong></p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[{l:'Total Students',v:data.total_students?.toLocaleString(),c:'#6366f1',i:'🎓'},{l:'Avg CGPA',v:data.avg_cgpa,c:'#10b981',i:'📊'},{l:'At Risk',v:data.at_risk_count,c:'#f43f5e',i:'🚨'},{l:'Excellent',v:data.excellent_count,c:'#fbbf24',i:'🏆'}].map(s=>(
          <div key={s.l} className="card flex items-center gap-3 anim-fade-up">
            <div className="text-2xl">{s.i}</div>
            <div><div className="stat-number text-xl font-bold" style={{color:s.c}}>{s.v}</div><div className="text-slate-400 text-xs">{s.l}</div></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Branch stats - Chart.js */}
        <div className="card anim-fade-up anim-delay-1">
          <h3 className="font-semibold mb-1 text-sm flex items-center gap-2">Branch Stats <span className="badge bg-amber-500/20 text-amber-300 font-mono text-[10px]">Chart.js Bar</span></h3>
          <div className="h-52"><Bar data={branchChart} options={CJOPTS} /></div>
        </div>

        {/* Semester trend - Chart.js Line */}
        <div className="card anim-fade-up anim-delay-2">
          <h3 className="font-semibold mb-1 text-sm flex items-center gap-2">Semester Trend <span className="badge bg-amber-500/20 text-amber-300 font-mono text-[10px]">Chart.js Line</span></h3>
          <div className="h-52"><Line data={semChart} options={CJOPTS} /></div>
        </div>

        {/* Skill averages - Recharts Area */}
        <div className="card anim-fade-up anim-delay-3">
          <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">Skill Averages <span className="badge bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">Recharts Area</span></h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={skillData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="skill" tick={{fill:'#64748b',fontSize:10}} axisLine={false} tickLine={false} />
              <YAxis domain={[0,100]} tick={{fill:'#64748b',fontSize:10}} axisLine={false} tickLine={false} />
              <RT contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:'10px',color:'#f1f5f9',fontSize:12}} />
              <Area type="monotone" dataKey="score" stroke="#6366f1" fill="rgba(99,102,241,0.2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stress vs CGPA - Recharts Bar */}
        <div className="card anim-fade-up anim-delay-4">
          <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">Stress vs CGPA <span className="badge bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">Recharts Bar</span></h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stressData} margin={{left:-20}}>
              <XAxis dataKey="stress" tick={{fill:'#64748b',fontSize:11}} axisLine={false} tickLine={false} />
              <YAxis domain={[5,9]} tick={{fill:'#64748b',fontSize:11}} axisLine={false} tickLine={false} />
              <RT contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:'10px',color:'#f1f5f9',fontSize:12}} />
              <RBar dataKey="cgpa" name="Avg CGPA" fill="#f43f5e" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance distribution */}
      <div className="card anim-fade-up">
        <h3 className="font-semibold mb-4">Performance Distribution (from CSV dataset)</h3>
        <div className="space-y-3">
          {Object.entries(data.performance_distribution||{}).map(([k,v]:any) => {
            const total = Object.values(data.performance_distribution).reduce((a:any,b:any)=>a+b,0) as number;
            const pct = Math.round(v/total*100);
            return (
              <div key={k} className="flex items-center gap-3">
                <div className="text-sm text-slate-300 w-32 flex-shrink-0">{k}</div>
                <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`,background:PERF_C[k]||'#6366f1'}}/>
                </div>
                <div className="text-sm font-bold w-24 text-right flex-shrink-0" style={{color:PERF_C[k]||'#6366f1'}}>{v.toLocaleString()} <span className="text-slate-600 font-normal">({pct}%)</span></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
