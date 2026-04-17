'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, usePointsStore, DEMO_USERS, getTier, avatarColor, initials } from '@/store';
import Sidebar from '@/components/Sidebar';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

const MEDALS = ['🥇','🥈','🥉'];

export default function LeaderboardPage() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const { db } = usePointsStore();
  const router  = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    setReady(true);
  }, [_hasHydrated, isAuthenticated, router]);

  if (!_hasHydrated || !ready) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const ranked = [...DEMO_USERS.students]
    .map(s => { const pts = db[s.id]?.points||0; return { ...s, pts, tier:getTier(pts), combined: +((s.cgpa/10)*60+(pts/200)*40).toFixed(1) }; })
    .sort((a,b) => b.combined-a.combined);

  const radarData = ranked.slice(0,5).map(s => ({ name:s.name.split(' ')[0], CGPA:+(s.cgpa/10*100).toFixed(0), Points:+(s.pts/200*100).toFixed(0) }));

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="space-y-6">
          <div className="anim-fade-up">
            <h1 className="section-title text-2xl mb-1">🏆 Leaderboard</h1>
            <p className="text-slate-400 text-sm">Combined = 60% CGPA + 40% Teacher-Awarded Points</p>
          </div>

          {/* Top 3 podium */}
          <div className="grid grid-cols-3 gap-4 anim-fade-up">
            {ranked.slice(0,3).map((s,i) => {
              const col = avatarColor(s.name);
              return (
                <div key={s.id} className="card text-center" style={{ borderColor:`${s.tier.color}35`,order:i===1?0:i===0?1:2 }}>
                  <div className="text-4xl mb-2">{MEDALS[i]}</div>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-display font-bold text-lg mx-auto mb-3" style={{background:`${col}22`,color:col}}>{initials(s.name)}</div>
                  <div className="font-display font-bold text-lg mb-1">{s.name}</div>
                  <div className="text-slate-400 text-xs mb-3">{s.branch.split(' ')[0]} · Sem {s.semester}</div>
                  <div className="stat-number text-3xl font-bold mb-1" style={{color:s.tier.color}}>{s.combined}</div>
                  <div className="text-slate-500 text-xs mb-2">combined score</div>
                  <div className="flex justify-center gap-4 text-xs">
                    <span>CGPA <b className="text-emerald-400">{s.cgpa}</b></span>
                    <span>Pts <b style={{color:s.tier.color}}>{s.pts}</b></span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="card anim-fade-up anim-delay-1">
              <h3 className="font-semibold mb-4">All Rankings</h3>
              <div className="space-y-2">
                {ranked.map((s,i) => {
                  const col = avatarColor(s.name);
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/30 transition-colors">
                      <div className="w-7 text-center text-sm font-bold flex-shrink-0" style={{color:i<3?['#fbbf24','#94a3b8','#fb923c'][i]:'#475569'}}>{i<3?MEDALS[i]:`#${i+1}`}</div>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-xs flex-shrink-0" style={{background:`${col}22`,color:col}}>{initials(s.name)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{s.name}</div>
                        <div className="text-slate-500 text-[10px]">{s.branch.split(' ')[0]}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="stat-number text-base font-bold" style={{color:s.tier.color}}>{s.combined}</div>
                        <div className="text-slate-600 text-[10px]">{s.pts} pts · {s.cgpa} cgpa</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card anim-fade-up anim-delay-2">
              <h3 className="font-semibold mb-4">Top 5 Radar — Recharts</h3>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(148,163,184,0.1)" />
                  <PolarAngleAxis dataKey="name" tick={{fill:'#64748b',fontSize:11}} />
                  <Radar name="CGPA%" dataKey="CGPA" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                  <Radar name="Points%" dataKey="Points" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 justify-center mt-2">
                <div className="flex items-center gap-1.5 text-xs"><div className="w-3 h-3 rounded-sm bg-emerald-500"/>CGPA %</div>
                <div className="flex items-center gap-1.5 text-xs"><div className="w-3 h-3 rounded-sm bg-indigo-500"/>Points %</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
