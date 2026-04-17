import { useEffect } from 'react';
import { useAuthStore, usePointsStore, useCourseProgress, useStreak, useAssignments } from '../hooks';
import { getTier, DEMO_USERS, toast } from '../store';
import { recommendCourses, DIFF_COLOR } from '../courses-data';
import AlertBanner, { AlertBannerItem } from '../components/AlertBanner';

const PERF_COLORS: Record<string, string> = {
  Excellent: '#10b981', Good: '#38bdf8', Average: '#fbbf24',
  'Below Average': '#fb923c', 'At Risk': '#f43f5e',
};

function predictPerformance(cgpa: number, attendance: number) {
  if (cgpa >= 8.5 && attendance >= 85) return 'Excellent';
  if (cgpa >= 7.5 && attendance >= 75) return 'Good';
  if (cgpa >= 6.0 && attendance >= 60) return 'Average';
  if (cgpa >= 5.0) return 'Below Average';
  return 'At Risk';
}

interface Props { setPage: (p: string) => void; }

export default function StudentDashboard({ setPage }: Props) {
  const { user } = useAuthStore();
  const { getPoints } = usePointsStore();
  const studentUser = DEMO_USERS.students.find(s => s.id === user?.id);
  const cgpa       = studentUser?.cgpa ?? 7.0;
  const semester   = studentUser?.semester ?? 4;
  const branch     = studentUser?.branch ?? 'Computer Science';
  const attendance = 80;
  const pts  = getPoints(user?.id ?? '');
  const tier = getTier(pts);
  const perf = predictPerformance(cgpa, attendance);
  const perfColor = PERF_COLORS[perf];
  const recs = recommendCourses(branch, semester, cgpa, 3);
  const { completedCount, inProgressCount } = useCourseProgress(user?.id ?? '');
  const { streak, logStudy } = useStreak(user?.id ?? '');
  const { overdue, dueSoon }  = useAssignments(user?.id ?? '', branch);

  useEffect(() => {
    if (!user) return;
    const key = `welcome-shown-${user.id}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      setTimeout(() => toast.info(`Welcome back, ${user.name.split(' ')[0]}! 👋`, 'Your dashboard is ready'), 600);
    }
  }, [user?.id]);

  const alerts: AlertBannerItem[] = [];
  if (overdue.length > 0)
    alerts.push({ id:'asgn-overdue', type:'danger', icon:'🚨', title:`${overdue.length} Overdue Assignment${overdue.length>1?'s':''}!`, message: overdue.map(a=>a.title).join(', '), action:{label:'View Assignments',onClick:()=>setPage('assignments')} });
  else if (dueSoon.length > 0)
    alerts.push({ id:'asgn-soon', type:'warning', icon:'⏰', title:`${dueSoon.length} Assignment${dueSoon.length>1?'s':''} Due Within 48 Hours`, message: dueSoon.map(a=>a.title).join(', '), action:{label:'View Assignments',onClick:()=>setPage('assignments')} });
  if (cgpa < 6.0)
    alerts.push({ id:'cgpa-low', type:'danger', icon:'🚨', title:'CGPA Alert', message:`Your CGPA is ${cgpa}. Visit the Predictor for improvement tips.`, action:{label:'See Predictor',onClick:()=>setPage('predictor')} });
  else if (cgpa < 7.0)
    alerts.push({ id:'cgpa-warn', type:'warning', icon:'⚠️', title:'CGPA Below 7.0', message:'Many companies require 7+ CGPA for placements. Consider increasing your study hours.', action:{label:'Take a Course',onClick:()=>setPage('courses')} });
  if (attendance < 75)
    alerts.push({ id:'att-warn', type:'danger', icon:'📋', title:'Low Attendance', message:`Attendance at ${attendance}% is below the 75% minimum.` });
  if (streak.current === 0)
    alerts.push({ id:'streak-start', type:'info', icon:'🔥', title:'Start Your Study Streak', message:'Log study time to build a streak. Consistent learning improves performance by up to 40%.', action:{label:'Log 30 mins',onClick:()=>{ logStudy(30); toast.achievement('Streak Started! 🔥',`Day ${streak.current+1} streak!`); }} });
  else if (streak.current >= 7)
    alerts.push({ id:'streak-hot', type:'success', icon:'🔥', title:`${streak.current}-Day Study Streak!`, message:`Amazing consistency! Longest: ${streak.longest} days.` });
  if (pts >= 60 && pts < 120 && tier.nextAt)
    alerts.push({ id:'tier-close', type:'info', icon:'🥇', title:'Close to Gold Tier!', message:`${tier.nextAt-pts} more points to Gold tier (+25% ATS boost).`, action:{label:'Earn Points',onClick:()=>setPage('points')} });

  if (!user) return null;

  const stats = [
    { label:'CGPA',       value: cgpa.toFixed(1), sub:'/10.0',   color: cgpa>=7?'#10b981':cgpa>=5?'#fbbf24':'#f43f5e', icon:'📊', barCol:'#6366f1' },
    { label:'Semester',   value: semester,          sub:'of 8',    color:'#6366f1',                                       icon:'📅', barCol:'#6366f1' },
    { label:'Points',     value: pts,               sub:tier.badge,color: tier.color,                                     icon:'🏅', barCol:tier.color },
    { label:'Prediction', value: perf,              sub:'ML model',color: perfColor,                                      icon:'🔮', barCol:perfColor  },
  ];

  const metrics = [
    { label:'CGPA',             value: cgpa*10,                         display:`${cgpa}/10`, color:'#6366f1' },
    { label:'Attendance',       value: attendance,                       display:`${attendance}%`, color: attendance>=75?'#10b981':'#f43f5e' },
    { label:'Courses Completed',value: Math.min(100,completedCount*10), display:`${completedCount}`, color:'#10b981' },
    { label:'In Progress',      value: Math.min(100,inProgressCount*12),display:`${inProgressCount}`, color:'#fbbf24' },
  ];

  const quickActions = [
    { icon:'📝', label:'Assignment Tracker', sub: overdue.length>0?`🚨 ${overdue.length} overdue!`:dueSoon.length>0?`⏰ ${dueSoon.length} due soon`:'Track deadlines & submissions', page:'assignments', color:'#f43f5e' },
    { icon:'🔮', label:'Check Performance Prediction', sub:'ML-powered analysis',          page:'predictor', color:'#6366f1' },
    { icon:'📚', label:'Browse All Courses',            sub:'With YouTube thumbnails & tracking', page:'courses',  color:'#10b981' },
    { icon:'⭐', label:'View Recommendations',          sub:'Personalized for you',         page:'recommend', color:'#38bdf8' },
    { icon:'🏆', label:'Check Leaderboard',             sub:`You're at ${pts} points`,      page:'leaderboard',color:'#fbbf24' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>

      {/* ── Page header ── */}
      <div className="anim-fade-up page-header" style={{ marginBottom:0 }}>
        <h1>Welcome back, {user.name.split(' ')[0]} 👋</h1>
        <p>{branch} · Semester {semester} · Academic Year 2024–25</p>
      </div>

      {/* ── Alerts ── */}
      <AlertBanner alerts={alerts} />

      {/* ── Streak banner ── */}
      {streak.current > 0 && (
        <div className="anim-fade-up" style={{ borderRadius:'1.125rem', padding:'1rem 1.25rem', display:'flex', alignItems:'center', gap:'1rem', background:'linear-gradient(90deg,rgba(251,191,36,0.1),rgba(251,191,36,0.03))', border:'1px solid rgba(251,191,36,0.22)' }}>
          <span style={{ fontSize:'1.75rem' }}>🔥</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:'0.9rem', color:'#fbbf24' }}>{streak.current}-Day Study Streak</div>
            <div style={{ fontSize:'0.78rem', color:'#64748b', marginTop:2 }}>{streak.todayMinutes} mins today · Longest: {streak.longest} days</div>
          </div>
          <div>
            <div style={{ fontSize:'0.7rem', color:'#475569', marginBottom:4, textAlign:'right' }}>Daily goal</div>
            <div style={{ width:'96px', height:'5px', borderRadius:'999px', background:'rgba(148,163,184,0.1)', overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:'999px', background:'#fbbf24', width:`${Math.min(100,(streak.todayMinutes/streak.weeklyGoal)*100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Stats grid ── */}
      <div className="anim-fade-up anim-delay-1" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem' }}>
        {stats.map(s => (
          <div key={s.label} style={{ position:'relative', background:'rgba(15,23,42,0.88)', border:'1px solid rgba(148,163,184,0.1)', borderRadius:'1.125rem', padding:'1.25rem 1.25rem 1rem', backdropFilter:'blur(16px)', overflow:'hidden' }}>
            {/* Top accent bar */}
            <div style={{ position:'absolute', top:0, left:0, right:0, height:'3px', background:s.barCol, borderRadius:'1.125rem 1.125rem 0 0' }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
              <span style={{ color:'#64748b', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>{s.label}</span>
              <span style={{ fontSize:'1.1rem' }}>{s.icon}</span>
            </div>
            <div style={{ fontSize:'1.6rem', fontWeight:800, color:s.color, letterSpacing:'-0.02em', lineHeight:1, marginBottom:'0.35rem' }}>{s.value}</div>
            <div style={{ fontSize:'0.75rem', color:'#64748b' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Performance + Quick Actions ── */}
      <div className="anim-fade-up anim-delay-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem' }}>

        {/* Performance card */}
        <div className="card">
          <h2 style={{ fontWeight:700, fontSize:'1rem', marginBottom:'1.25rem', letterSpacing:'-0.01em' }}>📊 Performance Overview</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
            {metrics.map(m => (
              <div key={m.label}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8rem', color:'#94a3b8', marginBottom:'0.375rem' }}>
                  <span style={{ fontWeight:500 }}>{m.label}</span>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, color:m.color }}>{m.display}</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width:`${m.value}%`, background:m.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions card */}
        <div className="card">
          <h2 style={{ fontWeight:700, fontSize:'1rem', marginBottom:'1.25rem', letterSpacing:'-0.01em' }}>⚡ Quick Actions</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
            {quickActions.map(q => (
              <button key={q.label} onClick={() => setPage(q.page)} className="quick-action"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${q.color}45`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(148,163,184,0.08)'; }}>
                <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:`${q.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', flexShrink:0 }}>
                  {q.icon}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:'0.82rem', color:'#f1f5f9', marginBottom:'1px' }}>{q.label}</div>
                  <div style={{ fontSize:'0.72rem', color:'#475569', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{q.sub}</div>
                </div>
                <span style={{ color:'#334155', fontSize:'0.9rem' }}>→</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recommended Courses ── */}
      <div className="card anim-fade-up anim-delay-3">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
          <h2 style={{ fontWeight:700, fontSize:'1rem', letterSpacing:'-0.01em' }}>⭐ Recommended for You</h2>
          <button onClick={() => setPage('recommend')}
            style={{ fontSize:'0.78rem', color:'#818cf8', background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
            View all →
          </button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem' }}>
          {recs.map(c => (
            <div key={c.id} onClick={() => setPage('courses')}
              style={{ borderRadius:'1rem', overflow:'hidden', cursor:'pointer', background:'rgba(30,41,59,0.55)', border:'1px solid rgba(148,163,184,0.08)', transition:'all 0.18s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 8px 24px rgba(0,0,0,0.35)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='translateY(0)';    (e.currentTarget as HTMLElement).style.boxShadow='none'; }}>
              <div style={{ aspectRatio:'16/9', overflow:'hidden', position:'relative' }}>
                <img src={`https://img.youtube.com/vi/${c.youtubeId}/mqdefault.jpg`} alt={c.title}
                  style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0)', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(0,0,0,0.4)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(0,0,0,0)'; }}>
                  <span style={{ color:'white', fontSize:'1.8rem', opacity:0, transition:'opacity 0.2s' }}>▶</span>
                </div>
              </div>
              <div style={{ padding:'0.875rem' }}>
                <span style={{ fontSize:'0.68rem', padding:'0.2rem 0.55rem', borderRadius:'0.5rem', fontWeight:700, display:'inline-block', marginBottom:'0.5rem', background:`${DIFF_COLOR[c.difficulty]}20`, color:DIFF_COLOR[c.difficulty] }}>
                  {c.difficulty}
                </span>
                <h3 style={{ fontWeight:600, fontSize:'0.82rem', color:'#f1f5f9', marginBottom:'0.3rem', lineHeight:1.35, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                  {c.title}
                </h3>
                <p style={{ fontSize:'0.72rem', color:'#475569' }}>{c.provider} · ⭐ {c.rating}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
