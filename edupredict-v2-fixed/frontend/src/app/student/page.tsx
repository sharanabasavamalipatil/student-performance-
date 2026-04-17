'use client';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore, usePointsStore, getTier, DEMO_USERS } from '@/store';
import { mlAPI } from '@/lib/api';

import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

function ProgressRing({ pts }: { pts: number }) {
  const tier = getTier(pts);
  const r = 54; const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(pts / 200, 1);
  return (
    <svg width={136} height={136} className="flex-shrink-0">
      <circle cx={68} cy={68} r={r} fill="none" stroke="#1e293b" strokeWidth={10} />
      <circle cx={68} cy={68} r={r} fill="none" stroke={tier.color} strokeWidth={10}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 68 68)" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      <text x={68} y={61} textAnchor="middle" fill="#f1f5f9" fontSize={24} fontWeight={800} fontFamily="Clash Display">{pts}</text>
      <text x={68} y={79} textAnchor="middle" fill="#64748b" fontSize={11} fontFamily="JetBrains Mono">pts</text>
    </svg>
  );
}

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const { db, getNotifs, markRead } = usePointsStore();
  const [showNotifs, setShowNotifs] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const socketRef = useRef<any>(null);

  // Load dataset stats for context
  useEffect(() => {
    mlAPI.analytics()
      .then(r => setStats(r.data))
      .catch(() => setStats({ avg_cgpa: 7.1, avg_attendance: 81, total_students: 2000, excellent_count: 180, at_risk_count: 70 }));
  }, []);

  // Native WebSocket real-time points
  useEffect(() => {
    if (!user) return;
    const WS_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace('http', 'ws');
    let ws: WebSocket | null = null;
    let retries = 0;
    const connect = () => {
      try {
        ws = new WebSocket(`${WS_BASE}/ws/${user.id}`);
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'points_update') toast.success(msg.data?.notif?.title || '🏅 Points updated!');
          } catch {}
        };
        ws.onerror = () => { if (retries < 2) { retries++; setTimeout(connect, 3000); } };
        socketRef.current = ws;
      } catch { /* ignore WS errors in demo */ }
    };
    connect();
    return () => { ws?.close(); };
  }, [user]);

  if (!user) return null;

  const myStudent = DEMO_USERS.students.find(s => s.id === user.id);
  const data      = db[user.id] || { points: 0, log: [] };
  const tier      = getTier(data.points);
  const notifs    = getNotifs(user.id);
  const unread    = notifs.filter(n => !n.read).length;

  const cgpa = myStudent?.cgpa ?? user.cgpa ?? 0;
  const cgpaDiff = stats?.avg_cgpa ? +(cgpa - stats.avg_cgpa).toFixed(1) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between anim-fade-up">
        <div>
          <h1 className="section-title text-2xl mb-1">Welcome, {user.name?.split(' ')[0]} 👋</h1>
          <p className="text-slate-400 text-sm">
            {user.branch} · Semester {myStudent?.semester || user.semester} · CGPA {cgpa}
            {cgpaDiff !== null && (
              <span className={`ml-2 font-semibold ${cgpaDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ({cgpaDiff >= 0 ? '+' : ''}{cgpaDiff} vs avg)
              </span>
            )}
          </p>
        </div>
        {/* Notification Bell */}
        <div className="relative">
          <button onClick={() => setShowNotifs(!showNotifs)} className="btn-ghost p-3 relative">
            🔔
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">{unread}</span>
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 glass rounded-2xl shadow-2xl z-50 anim-scale-in overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-slate-800">
                <span className="font-semibold text-sm">Notifications {unread > 0 && <span className="badge bg-rose-500/20 text-rose-400 ml-1">{unread} new</span>}</span>
                <button onClick={() => setShowNotifs(false)} className="text-slate-500 text-xs hover:text-slate-200">✕</button>
              </div>
              <div className="max-h-72 overflow-y-auto no-scroll">
                {notifs.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">No notifications yet<br/><span className="text-xs text-slate-600">Your teacher will notify you when points are awarded</span></div>
                ) : notifs.map(n => (
                  <div key={n.id} onClick={() => markRead(user.id, n.id)}
                    className={`p-4 border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer ${n.read ? 'opacity-50' : ''}`}>
                    <div className="flex gap-3">
                      <span className="text-xl flex-shrink-0">{n.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-slate-100 leading-tight">{n.title}</div>
                        <div className="text-slate-400 text-xs mt-0.5">{n.message}</div>
                        <div className="text-slate-600 text-[10px] mt-1 font-mono">
                          {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                        </div>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0 mt-1" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Points hero */}
      <div className="card flex items-center gap-8 anim-fade-up" style={{ borderColor: `${tier.color}30` }}>
        <ProgressRing pts={data.points} />
        <div className="flex-1">
          <div className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-1">Activity Points</div>
          <div className="section-title text-5xl font-bold mb-3" style={{ color: tier.color }}>{data.points}</div>
          <div className="flex items-center gap-3 mb-4">
            <span className="badge font-bold text-sm px-3 py-1.5" style={{ background: `${tier.color}20`, border: `1px solid ${tier.color}50`, color: tier.color }}>{tier.badge}</span>
            <span className="text-slate-400 text-sm">+{tier.atsBoost}% ATS resume boost</span>
          </div>
          <div className="max-w-xs">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{tier.tier}</span>
              {tier.nextAt && <span>{tier.nextAt - data.points} pts to next tier</span>}
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(data.points/200*100,100)}%`, background: `linear-gradient(90deg, ${tier.color}80, ${tier.color})` }} />
            </div>
            <p className="text-slate-600 text-xs mt-1 font-mono">{data.points}/200 pts to Platinum</p>
          </div>
        </div>

      </div>

      {/* Stats from dataset */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:'My CGPA',        value: cgpa,                      color:'#6366f1', icon:'📊' },
          { label:'Dataset Avg CGPA',value: stats?.avg_cgpa || '—',   color:'#94a3b8', icon:'📈' },
          { label:'My Semester',    value: myStudent?.semester || user.semester || '—', color:'#10b981', icon:'🗓️' },
          { label:'Activities Done', value: data.log.length,           color:'#fbbf24', icon:'🏅' },
        ].map((s,i) => (
          <div key={s.label} className={`card text-center anim-fade-up anim-delay-${i+1}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="stat-number text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-slate-400 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent activity log */}
      <div className="card anim-fade-up">
        <h3 className="font-semibold mb-4">📋 Activity Points Log</h3>
        {data.log.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-xl">
            <div className="text-5xl mb-3">🏅</div>
            <div className="text-slate-300 font-semibold mb-2">No points yet</div>
            <div className="text-slate-500 text-sm">Your teacher awards points for activities</div>
            <div className="text-slate-600 text-xs mt-2 font-mono">hackathons · certifications · projects · workshops · papers</div>
          </div>
        ) : (
          <div className="space-y-3">
            {data.log.map(e => (
              <div key={e.id} className="flex items-center gap-4 p-3 glass-sm rounded-xl"
                style={{ borderColor: e.points_earned >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)' }}>
                <span className="text-2xl flex-shrink-0">{e.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{e.label}</div>
                  <div className="text-slate-500 text-xs mt-0.5">
                    By <span className="text-indigo-400">{e.awarded_by}</span>
                    {' · '}{formatDistanceToNow(new Date(e.date), { addSuffix: true })}
                    {e.note && <span className="text-slate-500 ml-2 italic">"{e.note}"</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="stat-number text-lg font-bold" style={{ color: e.points_earned >= 0 ? '#10b981' : '#f43f5e' }}>
                    {e.points_earned >= 0 ? '+' : ''}{e.points_earned}
                  </div>
                  <div className="text-slate-600 text-xs">→ {e.total_after} total</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dataset info card */}
      {stats && (
        <div className="card anim-fade-up bg-slate-900/40">
          <h3 className="font-semibold text-sm text-slate-300 mb-3">📊 Your Performance vs Dataset ({stats.total_students?.toLocaleString()} students)</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-slate-500 text-xs mb-1">CGPA Comparison</div>
              <div className="font-bold text-base" style={{ color: cgpa >= (stats.avg_cgpa||0) ? '#10b981' : '#fb923c' }}>
                {cgpa} vs {stats.avg_cgpa} avg
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-xs mb-1">Excellent Students</div>
              <div className="font-bold text-base text-emerald-400">{stats.excellent_count?.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs mb-1">At-Risk Students</div>
              <div className="font-bold text-base text-rose-400">{stats.at_risk_count?.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
