'use client';
import { useEffect, useState } from 'react';
import { useAuthStore, usePointsStore, getTier } from '@/store';
import { studentsAPI } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function StudentPointsPage() {
  const { user } = useAuthStore();
  const { db, getNotifs, markRead } = usePointsStore();

  useEffect(() => {
    if (!user) return;
    // Sync points from backend
    studentsAPI.getPoints(user.id)
      .then(() => {})
      .catch(() => {});
  }, [user]);

  if (!user) return null;

  const data  = db[user.id] || { points: 0, log: [] };
  const tier  = getTier(data.points);
  const notifs = getNotifs(user.id);
  const unread = notifs.filter(n => !n.read).length;

  const categoryTotals: Record<string, number> = {};
  data.log.forEach(e => {
    if (e.points_earned > 0) categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.points_earned;
  });

  const TIERS = [
    { name:'Bronze',  min:0,   max:59,  color:'#fb923c', badge:'🥉' },
    { name:'Silver',  min:60,  max:119, color:'#38bdf8', badge:'🥈' },
    { name:'Gold',    min:120, max:199, color:'#fbbf24', badge:'🥇' },
    { name:'Platinum',min:200, max:999, color:'#a78bfa', badge:'🏅' },
  ];

  return (
    <div className="space-y-6">
      <div className="anim-fade-up">
        <h1 className="section-title text-2xl mb-1">🏅 My Points</h1>
        <p className="text-slate-400 text-sm">Track your activity points and tier progression</p>
      </div>

      {/* Points Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 anim-fade-up anim-delay-1">
        <div className="card col-span-1 flex flex-col items-center justify-center py-8">
          <div className="relative mb-3">
            <svg width={120} height={120}>
              <circle cx={60} cy={60} r={50} fill="none" stroke="#1e293b" strokeWidth={8}/>
              <circle cx={60} cy={60} r={50} fill="none" stroke={tier.color} strokeWidth={8}
                strokeDasharray={`${Math.PI*100*Math.min(data.points/200,1)} ${Math.PI*100}`}
                strokeLinecap="round" transform="rotate(-90 60 60)"
                style={{transition:'stroke-dasharray 1s ease'}}/>
              <text x={60} y={56} textAnchor="middle" fill="#f1f5f9" fontSize={26} fontWeight={800}>{data.points}</text>
              <text x={60} y={73} textAnchor="middle" fill="#64748b" fontSize={10}>points</text>
            </svg>
          </div>
          <div className="text-xl font-bold" style={{color:tier.color}}>{tier.badge}</div>
          {tier.nextAt && (
            <p className="text-slate-500 text-xs mt-1">{tier.nextAt - data.points} pts to next tier</p>
          )}
        </div>

        <div className="card col-span-2 space-y-3">
          <h3 className="font-semibold text-slate-200 mb-2">Tier Progress</h3>
          {TIERS.map(t => {
            const isActive = data.points >= t.min && data.points <= t.max;
            const isPast   = data.points > t.max;
            const progress = isPast ? 100 : isActive ? Math.round(((data.points - t.min)/(t.max - t.min))*100) : 0;
            return (
              <div key={t.name} className={`p-3 rounded-xl border transition-all ${isActive ? 'border-opacity-60 bg-opacity-10' : 'border-slate-800 opacity-60'}`}
                style={isActive ? {borderColor:t.color, background:`${t.color}10`} : {}}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium">{t.badge} {t.name}</span>
                  <span className="text-xs text-slate-400">{t.min}–{t.max === 999 ? '∞' : t.max} pts</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full">
                  <div className="h-1.5 rounded-full transition-all duration-1000"
                    style={{width:`${progress}%`, background: t.color}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category breakdown */}
      {Object.keys(categoryTotals).length > 0 && (
        <div className="card anim-fade-up anim-delay-2">
          <h3 className="font-semibold text-slate-200 mb-4">Points by Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(categoryTotals).map(([cat, pts]) => (
              <div key={cat} className="glass-sm rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-indigo-400">{pts}</div>
                <div className="text-slate-400 text-xs capitalize mt-1">{cat}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications */}
      {unread > 0 && (
        <div className="card border border-indigo-500/30 anim-fade-up">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-slate-200">🔔 New Notifications <span className="badge bg-indigo-500/20 text-indigo-400 ml-2">{unread}</span></h3>
          </div>
          {notifs.filter(n=>!n.read).map(n => (
            <div key={n.id} onClick={() => markRead(user.id, n.id)}
              className="flex gap-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 mb-2 cursor-pointer hover:bg-indigo-500/15">
              <span className="text-xl">{n.icon}</span>
              <div>
                <p className="text-sm font-semibold text-slate-100">{n.title}</p>
                <p className="text-xs text-slate-400">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activity Log */}
      <div className="card anim-fade-up anim-delay-3">
        <h3 className="font-semibold text-slate-200 mb-4">Activity History</h3>
        {data.log.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <div className="text-4xl mb-3">🏅</div>
            <p className="font-medium">No activity yet</p>
            <p className="text-sm mt-1 text-slate-600">Your teacher will award points for activities</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.log.map(e => (
              <div key={e.id} className="flex items-center gap-3 p-3 glass-sm rounded-xl">
                <span className="text-xl w-8 flex-shrink-0 text-center">{e.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">{e.label}</p>
                  {e.note && <p className="text-xs text-slate-500 truncate">{e.note}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-sm font-bold ${e.points_earned >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {e.points_earned >= 0 ? '+' : ''}{e.points_earned}
                  </span>
                  <p className="text-[10px] text-slate-600">
                    {formatDistanceToNow(new Date(e.date), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
