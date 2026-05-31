import { useState, useMemo, useEffect } from 'react';
import { ALL_COURSES, DIFF_COLOR, Course } from '../courses-data';
import { useAuthStore, useCourseProgress, useStreak } from '../hooks';
import { DEMO_USERS } from '../store';
import { toast } from '../store';

const STATUS_LABELS = {
  watchlist: { label: '📌 Watchlist', color: '#38bdf8' },
  'in-progress': { label: '▶ In Progress', color: '#fbbf24' },
  completed: { label: '✅ Completed', color: '#10b981' },
} as const;

/* ─── AI Summary Panel ──────────────────────────────────────── */
interface AISummaryPanelProps { course: Course; onClose: () => void; }

function AISummaryPanel({ course, onClose }: AISummaryPanelProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setText(''); setError(''); setLoading(true);
    const ctrl = new AbortController();

    const prompt = `You are an expert educational course advisor. Give a crisp, structured summary for this online course:

Course: "${course.title}"
Provider: ${course.provider}
Difficulty: ${course.difficulty}
Duration: ${course.duration}
Skills: ${course.skills.join(', ')}
Category: ${course.category}
Career Paths: ${course.careerPaths.join(', ')}
Description: ${course.description}

Write a helpful student-focused summary in this exact format (use markdown-style headers with ##):

## What You'll Learn
3-4 bullet points (starting with -) on key learning outcomes.

## Who Should Take This
1-2 sentences on the ideal student profile.

## Career Impact
1-2 sentences on how this boosts career/placement prospects.

## Study Tips
2-3 practical tips (starting with -) to get the most from this course.

Keep it concise (under 200 words total), upbeat, and actionable.`;

    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('API error ' + res.status);
        const reader = res.body?.getReader();
        if (!reader) throw new Error('No stream');
        const dec = new TextDecoder();
        let buf = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') continue;
            try {
              const j = JSON.parse(raw);
              const delta = j.delta?.text ?? '';
              if (delta) setText(p => p + delta);
            } catch { /* skip */ }
          }
        }
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') { setError('Could not load AI summary.'); setLoading(false); }
      });

    return () => ctrl.abort();
  }, [course.id]);

  const renderContent = (raw: string) => {
    const sections = raw.split(/^##\s+/m).filter(Boolean);
    const sectionColors: Record<string, string> = {
      "What You'll Learn": '#a5b4fc',
      "Who Should Take This": '#6ee7b7',
      "Career Impact": '#fde68a',
      "Study Tips": '#f9a8d4',
    };
    return sections.map((section, i) => {
      const [heading, ...lines] = section.split('\n');
      const body = lines.join('\n').trim();
      const bullets = body.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('•'));
      const prose = body.split('\n').filter(l => !l.trim().startsWith('-') && !l.trim().startsWith('•') && l.trim()).join(' ');
      const hc = sectionColors[heading?.trim()] ?? '#94a3b8';
      return (
        <div key={i} style={{ marginBottom: '0.9rem' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: hc, marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 12, height: 2, background: hc, display: 'inline-block', borderRadius: 2 }} />
            {heading?.trim()}
          </div>
          {bullets.length > 0 ? (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {bullets.map((b, j) => (
                <li key={j} style={{ display: 'flex', gap: '5px', marginBottom: '3px', alignItems: 'flex-start' }}>
                  <span style={{ color: hc, fontSize: '10px', marginTop: '2px', flexShrink: 0 }}>▸</span>
                  <span style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>{b.replace(/^[-•]\s*/, '')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6', margin: 0 }}>{prose}</p>
          )}
        </div>
      );
    });
  };

  return (
    <div style={{
      background: 'rgba(8,12,30,0.99)', border: '1px solid rgba(99,102,241,0.35)',
      borderTop: 'none', borderRadius: '0 0 16px 16px', padding: '16px 18px',
      boxShadow: '0 8px 32px rgba(99,102,241,0.1)', minHeight: '200px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg,#6366f1,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>✦</div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.06em' }}>AI COURSE SUMMARY</div>
            <div style={{ fontSize: '9px', color: '#475569' }}>Powered by Claude</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(71,85,105,0.3)', borderRadius: '7px', color: '#64748b', cursor: 'pointer', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>✕</button>
      </div>

      {loading && !text && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[75, 60, 85, 50, 70].map((w, i) => (
            <div key={i} style={{ height: 9, borderRadius: 5, background: 'rgba(99,102,241,0.15)', width: `${w}%`, animation: `shimmer2 1.5s ease-in-out infinite ${i * 0.12}s` }} />
          ))}
          <style>{`@keyframes shimmer2 { 0%,100%{opacity:.35} 50%{opacity:.75} }`}</style>
          <div style={{ fontSize: '11px', color: '#475569', textAlign: 'center', marginTop: '4px' }}>Generating AI summary…</div>
        </div>
      )}
      {error && <div style={{ fontSize: '12px', color: '#f87171', padding: '12px 0' }}>{error}</div>}
      {text && (
        <div style={{ animation: 'fadeSlide 0.3s ease' }}>
          {renderContent(text)}
          {loading && <span style={{ display: 'inline-block', width: 5, height: 13, borderRadius: 2, background: '#6366f1', animation: 'blink2 0.7s step-end infinite', verticalAlign: 'text-bottom' }} />}
        </div>
      )}
      <style>{`
        @keyframes fadeSlide { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }
        @keyframes blink2 { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  );
}

/* ─── YouTube Modal ─────────────────────────────────────────── */
function YouTubeModal({ course, onClose, onStartWatch }: { course: Course; onClose: () => void; onStartWatch: () => void }) {
  useEffect(() => { onStartWatch(); }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(2,6,23,0.95)' }} onClick={onClose}>
      <div className="w-full max-w-3xl" style={{ animation: 'scaleIn .25s cubic-bezier(.34,1.56,.64,1)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="font-bold text-lg text-slate-100">{course.title}</h2>
            <p className="text-slate-400 text-sm">{course.provider} · {course.duration} · ⭐ {course.rating}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-2 transition-colors">✕</button>
        </div>
        <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9' }}>
          <iframe src={`https://www.youtube.com/embed/${course.youtubeId}?autoplay=1&rel=0`} title={course.title} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" allowFullScreen className="w-full h-full" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <a href={course.youtubeUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm px-4 py-2 text-rose-400 hover:text-rose-300 flex items-center gap-2"><span>▶</span> Open in YouTube</a>
          <div className="flex flex-wrap gap-1 ml-auto">{course.skills.map(s => <span key={s} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(30,41,59,0.8)', color: '#94a3b8' }}>{s}</span>)}</div>
        </div>
        <div className="mt-2 px-1"><span className="text-xs text-slate-500">Career paths: </span><span className="text-xs text-indigo-400">{course.careerPaths.join(', ')}</span></div>
      </div>
    </div>
  );
}

function StarRating({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <button key={n} onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)} onClick={() => onChange(n)} className="text-base transition-all" style={{ color: n <= (hovered || value || 0) ? '#fbbf24' : '#334155' }}>★</button>
      ))}
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────── */
export default function Courses() {
  const { user } = useAuthStore();
  const studentUser = DEMO_USERS.students.find(s => s.id === user?.id);
  const branch = studentUser?.branch ?? '';
  const { progress, get: getProgress, set: setProgress, completedCount, inProgressCount, watchlistCount } = useCourseProgress(user?.id ?? '');
  const { logStudy } = useStreak(user?.id ?? '');

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [sortBy, setSortBy] = useState<'rating' | 'title'>('rating');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [aiOpenId, setAiOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let courses = ALL_COURSES.filter(c => {
      const q = search.toLowerCase();
      const matchSearch = !q || c.title.toLowerCase().includes(q) || c.skills.some(s => s.toLowerCase().includes(q)) || c.provider.toLowerCase().includes(q);
      let matchFilter = true;
      if (filter === 'my-branch') matchFilter = c.branch.some(b => b.toLowerCase().includes(branch.split(' ')[0].toLowerCase()));
      else if (['Beginner','Intermediate','Advanced'].includes(filter)) matchFilter = c.difficulty === filter;
      let matchStatus = true;
      if (statusFilter !== 'all') { const p = getProgress(c.id); if (statusFilter === 'none') matchStatus = !p; else matchStatus = p?.status === statusFilter; }
      return matchSearch && matchFilter && matchStatus;
    });
    if (sortBy === 'rating') courses.sort((a, b) => b.rating - a.rating);
    else courses.sort((a, b) => a.title.localeCompare(b.title));
    return courses;
  }, [search, filter, statusFilter, sortBy, progress, branch]);

  const handleWatchNow = (c: Course) => {
    setSelectedCourse(c);
    const cur = getProgress(c.id);
    if (!cur || cur.status === 'watchlist') setProgress({ courseId: c.id, status: 'in-progress', watchedAt: new Date().toISOString() });
  };
  const handleAddToWatchlist = (c: Course) => {
    const cur = getProgress(c.id);
    if (!cur) { setProgress({ courseId: c.id, status: 'watchlist' }); toast.info('Added to Watchlist', `${c.title} saved for later`); }
    else if (cur.status === 'watchlist') { setProgress({ courseId: c.id, status: 'in-progress', watchedAt: new Date().toISOString() }); toast.success('Marked as In Progress', c.title); }
  };
  const handleMarkComplete = (c: Course) => {
    setProgress({ courseId: c.id, status: 'completed', watchedAt: getProgress(c.id)?.watchedAt, completedAt: new Date().toISOString() });
    logStudy(60); toast.achievement('Course Completed! 🎉', `You finished "${c.title}". +25 points!`);
  };
  const handleRate = (c: Course, rating: number) => {
    const cur = getProgress(c.id) ?? { courseId: c.id, status: 'completed' as const };
    setProgress({ ...cur, userRating: rating }); toast.success('Rating saved!', `You rated this ${rating}/5 ⭐`);
  };
  const toggleAI = (id: string) => setAiOpenId(p => p === id ? null : id);

  const filterBtns = ['all','my-branch','Beginner','Intermediate','Advanced'];
  const statusBtns = [
    { id:'all', label:'All' }, { id:'watchlist', label:'📌 Watchlist' },
    { id:'in-progress', label:'▶ In Progress' }, { id:'completed', label:'✅ Done' }, { id:'none', label:'🆕 New' },
  ];

  // AI Button component (reused)
  const AIBtn = ({ courseId, small }: { courseId: string; small?: boolean }) => (
    <button
      onClick={() => toggleAI(courseId)}
      title="AI Course Summary"
      style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: small ? '3px 8px' : '4px 10px',
        borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
        background: aiOpenId === courseId
          ? 'linear-gradient(135deg,rgba(99,102,241,0.35),rgba(167,139,250,0.25))'
          : 'rgba(30,41,59,0.7)',
        border: aiOpenId === courseId ? '1px solid rgba(99,102,241,0.6)' : '1px solid rgba(71,85,105,0.35)',
        color: aiOpenId === courseId ? '#c4b5fd' : '#64748b',
        boxShadow: aiOpenId === courseId ? '0 0 12px rgba(99,102,241,0.2)' : 'none',
      }}
    >
      <span style={{ fontSize: '12px' }}>✦</span>
      {aiOpenId === courseId ? 'Hide AI' : 'AI'}
    </button>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
      <style>{`
        @keyframes scaleIn { from{opacity:0;transform:scale(.88)} to{opacity:1;transform:scale(1)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }
      `}</style>

      <div className="anim-fade-up">
        <h1 className="text-2xl font-bold mb-1">📚 Courses & Learning</h1>
        <p className="text-slate-400 text-sm">
          Tap <span style={{ color:'#c4b5fd', fontWeight:700 }}>✦ AI</span> on any course card for a Claude-powered summary — learn before you watch
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 anim-fade-up anim-delay-1">
        {[
          { label:'Completed', value:completedCount, icon:'✅', color:'#10b981' },
          { label:'In Progress', value:inProgressCount, icon:'▶', color:'#fbbf24' },
          { label:'Watchlist', value:watchlistCount, icon:'📌', color:'#38bdf8' },
        ].map(s => (
          <div key={s.label} className="card py-3 flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div><div className="text-xl font-bold" style={{ color:s.color }}>{s.value}</div><div className="text-xs text-slate-500">{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* AI Banner */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 16px', borderRadius:'12px', background:'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(167,139,250,0.04))', border:'1px solid rgba(99,102,241,0.2)' }}>
        <div style={{ width:30, height:30, borderRadius:9, flexShrink:0, background:'linear-gradient(135deg,#6366f1,#a78bfa)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', boxShadow:'0 0 16px rgba(99,102,241,0.3)' }}>✦</div>
        <div>
          <span style={{ fontSize:'12px', fontWeight:700, color:'#a5b4fc' }}>Claude AI Course Summaries</span>
          <span style={{ fontSize:'12px', color:'#64748b' }}> — click the </span>
          <span style={{ fontSize:'12px', fontWeight:700, color:'#c4b5fd', background:'rgba(99,102,241,0.15)', padding:'1px 6px', borderRadius:5, border:'1px solid rgba(99,102,241,0.3)' }}>✦ AI</span>
          <span style={{ fontSize:'12px', color:'#64748b' }}> button beside any course to get an instant breakdown: what you'll learn, career impact &amp; study tips.</span>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2 anim-fade-up anim-delay-1">
        <div className="flex gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses, skills, providers…" className="input text-sm flex-1" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value as 'rating'|'title')} className="input text-sm w-36">
            <option value="rating">Top Rated</option>
            <option value="title">A–Z</option>
          </select>
          <button onClick={() => setViewMode(v => v==='grid'?'list':'grid')} className="btn-ghost text-sm px-3 py-2" title="Toggle view">{viewMode==='grid'?'☰':'⊞'}</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filterBtns.map(f => (
            <button key={f} onClick={() => setFilter(f)} className="btn-ghost text-xs px-3 py-1.5 rounded-xl"
              style={filter===f ? { background:'rgba(99,102,241,0.2)', color:'#a5b4fc', border:'1px solid rgba(99,102,241,0.4)' } : {}}>
              {f==='all'?'All':f==='my-branch'?'🎯 My Branch':f}
            </button>
          ))}
          <span className="text-slate-700 self-center mx-1">|</span>
          {statusBtns.map(b => (
            <button key={b.id} onClick={() => setStatusFilter(b.id)} className="btn-ghost text-xs px-3 py-1.5 rounded-xl"
              style={statusFilter===b.id ? { background:'rgba(56,189,248,0.15)', color:'#7dd3fc', border:'1px solid rgba(56,189,248,0.4)' } : {}}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-slate-500 font-mono">{filtered.length} course{filtered.length!==1?'s':''} found</div>

      {/* Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 anim-fade-up anim-delay-2">
          {filtered.map(c => {
            const p = getProgress(c.id);
            const status = p?.status;
            const statusStyle = status ? STATUS_LABELS[status] : null;
            const aiOpen = aiOpenId === c.id;
            return (
              <div key={c.id} style={{ display:'flex', flexDirection:'column' }}>
                {/* Card */}
                <div className="card hover:border-indigo-500/30 transition-all hover:-translate-y-0.5 group flex flex-col relative overflow-hidden"
                  style={{ borderBottomLeftRadius: aiOpen ? 0 : undefined, borderBottomRightRadius: aiOpen ? 0 : undefined, borderBottom: aiOpen ? '1px solid rgba(99,102,241,0.25)' : undefined }}>
                  {/* Thumbnail */}
                  <div className="relative -mx-6 -mt-6 mb-4 cursor-pointer overflow-hidden" style={{ aspectRatio:'16/9' }} onClick={() => handleWatchNow(c)}>
                    <img src={`https://img.youtube.com/vi/${c.youtubeId}/mqdefault.jpg`} alt={c.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute inset-0 flex items-center justify-center transition-opacity" style={{ background:'rgba(0,0,0,0.35)', opacity:0 }}
                      onMouseEnter={e=>(e.currentTarget.style.opacity='1')} onMouseLeave={e=>(e.currentTarget.style.opacity='0')}>
                      <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl" style={{ background:'rgba(255,0,0,0.9)' }}>
                        <span className="text-white text-2xl ml-1">▶</span>
                      </div>
                    </div>
                    {statusStyle && (
                      <div className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background:'rgba(2,6,23,0.85)', color:statusStyle.color, border:`1px solid ${statusStyle.color}40` }}>
                        {statusStyle.label}
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 text-xs px-2 py-0.5 rounded font-mono" style={{ background:'rgba(0,0,0,0.75)', color:'#e2e8f0' }}>{c.duration}</div>
                    {/* AI badge on thumbnail when open */}
                    {aiOpen && (
                      <div className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background:'linear-gradient(135deg,rgba(99,102,241,0.9),rgba(167,139,250,0.8))', color:'white', border:'1px solid rgba(167,139,250,0.4)' }}>
                        ✦ AI Active
                      </div>
                    )}
                  </div>

                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background:`${DIFF_COLOR[c.difficulty]}20`, color:DIFF_COLOR[c.difficulty] }}>{c.difficulty}</span>
                    <span className="text-xs text-yellow-400">⭐ {c.rating}</span>
                  </div>
                  <h3 className="font-semibold text-slate-100 mb-1 group-hover:text-indigo-300 transition-colors text-sm leading-tight">{c.title}</h3>
                  <p className="text-xs text-slate-500 mb-2">{c.provider}</p>
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed line-clamp-2">{c.description}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {c.skills.slice(0,3).map(s => <span key={s} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background:'rgba(30,41,59,0.8)', color:'#94a3b8' }}>{s}</span>)}
                  </div>
                  {status === 'completed' && (
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-xs text-slate-500">Your rating:</span>
                      <StarRating value={p?.userRating} onChange={r => handleRate(c, r)} />
                    </div>
                  )}

                  <div className="mt-auto flex gap-2">
                    <button onClick={() => handleWatchNow(c)} className="btn-primary flex-1 text-xs py-2">▶ Watch Now</button>
                    {!status && <button onClick={() => handleAddToWatchlist(c)} className="btn-ghost text-xs py-2 px-3" title="Watchlist">📌</button>}
                    {status === 'watchlist' && <button onClick={() => handleAddToWatchlist(c)} className="btn-ghost text-xs py-2 px-3" style={{ color:'#fbbf24' }}>▶ Start</button>}
                    {status === 'in-progress' && <button onClick={() => handleMarkComplete(c)} className="btn-ghost text-xs py-2 px-3 text-emerald-400">✓</button>}
                    <a href={c.youtubeUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs py-2 px-3 text-rose-400" onClick={e=>e.stopPropagation()}>↗</a>
                    <AIBtn courseId={c.id} />
                  </div>
                </div>

                {/* AI Panel */}
                {aiOpen && (
                  <div style={{ animation:'slideDown 0.22s cubic-bezier(0.4,0,0.2,1)' }}>
                    <AISummaryPanel course={c} onClose={() => setAiOpenId(null)} />
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-16 text-slate-500"><div className="text-5xl mb-3">📚</div><p>No courses found</p></div>
          )}
        </div>
      ) : (
        /* List view */
        <div className="flex flex-col gap-3 anim-fade-up anim-delay-2">
          {filtered.map(c => {
            const p = getProgress(c.id);
            const status = p?.status;
            const statusStyle = status ? STATUS_LABELS[status] : null;
            const aiOpen = aiOpenId === c.id;
            return (
              <div key={c.id} style={{ display:'flex', flexDirection:'column' }}>
                <div className="card flex items-center gap-4 py-3 hover:border-indigo-500/30 transition-all group"
                  style={{ borderBottomLeftRadius: aiOpen?0:undefined, borderBottomRightRadius: aiOpen?0:undefined, borderBottom: aiOpen?'1px solid rgba(99,102,241,0.25)':undefined }}>
                  <div className="relative flex-shrink-0 w-32 rounded-xl overflow-hidden cursor-pointer" style={{ aspectRatio:'16/9' }} onClick={() => handleWatchNow(c)}>
                    <img src={`https://img.youtube.com/vi/${c.youtubeId}/mqdefault.jpg`} alt={c.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background:'rgba(0,0,0,0.5)' }}>
                      <span className="text-white text-2xl">▶</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background:`${DIFF_COLOR[c.difficulty]}20`, color:DIFF_COLOR[c.difficulty] }}>{c.difficulty}</span>
                      {statusStyle && <span className="text-xs" style={{ color:statusStyle.color }}>{statusStyle.label}</span>}
                      <span className="text-xs text-yellow-400 ml-auto">⭐ {c.rating}</span>
                    </div>
                    <h3 className="font-semibold text-sm text-slate-100 group-hover:text-indigo-300 transition-colors leading-tight truncate">{c.title}</h3>
                    <p className="text-xs text-slate-500">{c.provider} · {c.duration}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => handleWatchNow(c)} className="btn-primary text-xs py-1.5 px-3">▶ Watch</button>
                    {!status && <button onClick={() => handleAddToWatchlist(c)} className="btn-ghost text-xs py-1.5 px-3">+ Save</button>}
                    {status === 'in-progress' && <button onClick={() => handleMarkComplete(c)} className="btn-ghost text-xs py-1.5 px-3 text-emerald-400">✓ Done</button>}
                    <AIBtn courseId={c.id} small />
                  </div>
                </div>
                {aiOpen && (
                  <div style={{ animation:'slideDown 0.22s cubic-bezier(0.4,0,0.2,1)' }}>
                    <AISummaryPanel course={c} onClose={() => setAiOpenId(null)} />
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <div className="text-center py-16 text-slate-500"><div className="text-5xl mb-3">📚</div><p>No courses found</p></div>}
        </div>
      )}

      {selectedCourse && (
        <YouTubeModal course={selectedCourse} onClose={() => setSelectedCourse(null)} onStartWatch={() => { if (selectedCourse) logStudy(30); }} />
      )}
    </div>
  );
}
