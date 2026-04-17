import { useState, useMemo, useEffect } from 'react';
import { ALL_COURSES, DIFF_COLOR, Course } from '../courses-data';
import { useAuthStore, useCourseProgress, useStreak } from '../hooks';
import { DEMO_USERS } from '../store';
import { toast } from '../store';

const STATUS_LABELS = {
  watchlist: { label: '📌 Watchlist', color: '#38bdf8' },
  'in-progress': { label: '▶ In Progress', color: '#fbbf24' },
  completed: { label: '✅ Completed', color: '#10b981' },
};

function YouTubeModal({ course, onClose, onStartWatch }: { course: Course; onClose: () => void; onStartWatch: () => void }) {
  useEffect(() => {
    onStartWatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(2,6,23,0.95)' }}
      onClick={onClose}
    >
      <div className="w-full max-w-3xl" style={{ animation: 'scaleIn .25s cubic-bezier(.34,1.56,.64,1)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="font-bold text-lg text-slate-100">{course.title}</h2>
            <p className="text-slate-400 text-sm">{course.provider} · {course.duration} · ⭐ {course.rating}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-2 transition-colors">✕</button>
        </div>

        {/* Video */}
        <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9' }}>
          <iframe
            src={`https://www.youtube.com/embed/${course.youtubeId}?autoplay=1&rel=0`}
            title={course.title}
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>

        {/* Footer info */}
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <a
            href={course.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-sm px-4 py-2 text-rose-400 hover:text-rose-300 flex items-center gap-2"
          >
            <span>▶</span> Open in YouTube
          </a>
          <div className="flex flex-wrap gap-1 ml-auto">
            {course.skills.map(s => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(30,41,59,0.8)', color: '#94a3b8' }}>{s}</span>
            ))}
          </div>
        </div>

        {/* Career paths */}
        <div className="mt-2 px-1">
          <span className="text-xs text-slate-500">Career paths: </span>
          <span className="text-xs text-indigo-400">{course.careerPaths.join(', ')}</span>
        </div>
      </div>
    </div>
  );
}

function StarRating({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="text-base transition-all"
          style={{ color: n <= (hovered || value || 0) ? '#fbbf24' : '#334155' }}
        >★</button>
      ))}
    </div>
  );
}

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
  const [sortBy, setSortBy] = useState<'rating' | 'duration' | 'title'>('rating');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filtered = useMemo(() => {
    let courses = ALL_COURSES.filter(c => {
      const q = search.toLowerCase();
      const matchSearch = !q || c.title.toLowerCase().includes(q) || c.skills.some(s => s.toLowerCase().includes(q)) || c.provider.toLowerCase().includes(q);
      let matchFilter = true;
      if (filter === 'my-branch') matchFilter = c.branch.includes(branch);
      else if (['Beginner', 'Intermediate', 'Advanced'].includes(filter)) matchFilter = c.difficulty === filter;
      let matchStatus = true;
      if (statusFilter !== 'all') {
        const p = getProgress(c.id);
        if (statusFilter === 'none') matchStatus = !p;
        else matchStatus = p?.status === statusFilter;
      }
      return matchSearch && matchFilter && matchStatus;
    });
    if (sortBy === 'rating') courses.sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'title') courses.sort((a, b) => a.title.localeCompare(b.title));
    return courses;
  }, [search, filter, statusFilter, sortBy, progress, branch]);

  const handleWatchNow = (course: Course) => {
    setSelectedCourse(course);
    // Mark as in-progress when watching
    const current = getProgress(course.id);
    if (!current || current.status === 'watchlist') {
      setProgress({ courseId: course.id, status: 'in-progress', watchedAt: new Date().toISOString() });
    }
  };

  const handleStartWatch = () => {
    if (selectedCourse) {
      logStudy(30);
    }
  };

  const handleAddToWatchlist = (course: Course) => {
    const current = getProgress(course.id);
    if (!current) {
      setProgress({ courseId: course.id, status: 'watchlist' });
      toast.info('Added to Watchlist', `${course.title} saved for later`);
    } else if (current.status === 'watchlist') {
      setProgress({ courseId: course.id, status: 'in-progress', watchedAt: new Date().toISOString() });
      toast.success('Marked as In Progress', course.title);
    }
  };

  const handleMarkComplete = (course: Course) => {
    setProgress({ courseId: course.id, status: 'completed', watchedAt: getProgress(course.id)?.watchedAt, completedAt: new Date().toISOString() });
    logStudy(60);
    toast.achievement('Course Completed! 🎉', `You finished "${course.title}". +25 points!`);
  };

  const handleRate = (course: Course, rating: number) => {
    const current = getProgress(course.id) ?? { courseId: course.id, status: 'completed' as const };
    setProgress({ ...current, userRating: rating });
    toast.success('Rating saved!', `You rated this ${rating}/5 ⭐`);
  };

  const filterBtns = ['all', 'my-branch', 'Beginner', 'Intermediate', 'Advanced'];
  const statusBtns = [
    { id: 'all', label: 'All' },
    { id: 'watchlist', label: '📌 Watchlist' },
    { id: 'in-progress', label: '▶ In Progress' },
    { id: 'completed', label: '✅ Done' },
    { id: 'none', label: '🆕 New' },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <style>{`@keyframes scaleIn { from { opacity:0; transform:scale(.88); } to { opacity:1; transform:scale(1); } }`}</style>

      <div className="anim-fade-up">
        <h1 className="text-2xl font-bold mb-1">📚 Courses & Learning</h1>
        <p className="text-slate-400 text-sm">Click any course to watch it on YouTube — track your progress and build streaks</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 anim-fade-up anim-delay-1">
        {[
          { label: 'Completed', value: completedCount, icon: '✅', color: '#10b981' },
          { label: 'In Progress', value: inProgressCount, icon: '▶', color: '#fbbf24' },
          { label: 'Watchlist', value: watchlistCount, icon: '📌', color: '#38bdf8' },
        ].map(s => (
          <div key={s.label} className="card py-3 flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="space-y-2 anim-fade-up anim-delay-1">
        <div className="flex gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search courses, skills, providers…"
            className="input text-sm flex-1"
          />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'rating' | 'duration' | 'title')}
            className="input text-sm w-36"
          >
            <option value="rating">Top Rated</option>
            <option value="title">A–Z</option>
          </select>
          <button
            onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            className="btn-ghost text-sm px-3 py-2"
            title="Toggle view"
          >{viewMode === 'grid' ? '☰' : '⊞'}</button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filterBtns.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="btn-ghost text-xs px-3 py-1.5 rounded-xl"
              style={filter === f ? { background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)' } : {}}>
              {f === 'all' ? 'All' : f === 'my-branch' ? '🎯 My Branch' : f}
            </button>
          ))}
          <span className="text-slate-700 self-center mx-1">|</span>
          {statusBtns.map(b => (
            <button key={b.id} onClick={() => setStatusFilter(b.id)}
              className="btn-ghost text-xs px-3 py-1.5 rounded-xl"
              style={statusFilter === b.id ? { background: 'rgba(56,189,248,0.15)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.4)' } : {}}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-slate-500 font-mono">
        {filtered.length} course{filtered.length !== 1 ? 's' : ''} found
      </div>

      {/* Course Grid / List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 anim-fade-up anim-delay-2' : 'flex flex-col gap-3 anim-fade-up anim-delay-2'}>
        {filtered.map(c => {
          const p = getProgress(c.id);
          const status = p?.status;
          const statusStyle = status ? STATUS_LABELS[status] : null;

          if (viewMode === 'list') {
            return (
              <div key={c.id} className="card flex items-center gap-4 py-3 hover:border-indigo-500/30 transition-all group">
                {/* Thumbnail */}
                <div className="relative flex-shrink-0 w-32 rounded-xl overflow-hidden cursor-pointer" style={{ aspectRatio: '16/9' }}
                  onClick={() => handleWatchNow(c)}>
                  <img
                    src={`https://img.youtube.com/vi/${c.youtubeId}/mqdefault.jpg`}
                    alt={c.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <span className="text-white text-2xl">▶</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${DIFF_COLOR[c.difficulty]}20`, color: DIFF_COLOR[c.difficulty] }}>
                      {c.difficulty}
                    </span>
                    {statusStyle && <span className="text-xs" style={{ color: statusStyle.color }}>{statusStyle.label}</span>}
                    <span className="text-xs text-yellow-400 ml-auto">⭐ {c.rating}</span>
                  </div>
                  <h3 className="font-semibold text-sm text-slate-100 group-hover:text-indigo-300 transition-colors leading-tight truncate">{c.title}</h3>
                  <p className="text-xs text-slate-500">{c.provider} · {c.duration}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleWatchNow(c)} className="btn-primary text-xs py-1.5 px-3">▶ Watch</button>
                  {!status && <button onClick={() => handleAddToWatchlist(c)} className="btn-ghost text-xs py-1.5 px-3">+ Save</button>}
                  {status === 'in-progress' && <button onClick={() => handleMarkComplete(c)} className="btn-ghost text-xs py-1.5 px-3 text-emerald-400">✓ Done</button>}
                </div>
              </div>
            );
          }

          return (
            <div key={c.id} className="card hover:border-indigo-500/30 transition-all hover:-translate-y-0.5 group flex flex-col relative overflow-hidden">
              {/* YouTube thumbnail */}
              <div
                className="relative -mx-6 -mt-6 mb-4 cursor-pointer overflow-hidden"
                style={{ aspectRatio: '16/9' }}
                onClick={() => handleWatchNow(c)}
              >
                <img
                  src={`https://img.youtube.com/vi/${c.youtubeId}/mqdefault.jpg`}
                  alt={c.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.35)', opacity: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
                    style={{ background: 'rgba(255,0,0,0.9)' }}>
                    <span className="text-white text-2xl ml-1">▶</span>
                  </div>
                </div>
                {/* Status badge on thumbnail */}
                {statusStyle && (
                  <div className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: 'rgba(2,6,23,0.85)', color: statusStyle.color, border: `1px solid ${statusStyle.color}40` }}>
                    {statusStyle.label}
                  </div>
                )}
                {/* Duration badge */}
                <div className="absolute bottom-2 right-2 text-xs px-2 py-0.5 rounded font-mono"
                  style={{ background: 'rgba(0,0,0,0.75)', color: '#e2e8f0' }}>
                  {c.duration}
                </div>
              </div>

              <div className="flex items-start justify-between mb-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: `${DIFF_COLOR[c.difficulty]}20`, color: DIFF_COLOR[c.difficulty] }}>
                  {c.difficulty}
                </span>
                <span className="text-xs text-yellow-400">⭐ {c.rating}</span>
              </div>
              <h3 className="font-semibold text-slate-100 mb-1 group-hover:text-indigo-300 transition-colors text-sm leading-tight">{c.title}</h3>
              <p className="text-xs text-slate-500 mb-2">{c.provider}</p>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed line-clamp-2">{c.description}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {c.skills.slice(0, 3).map(s => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(30,41,59,0.8)', color: '#94a3b8' }}>{s}</span>
                ))}
              </div>

              {/* User rating (if completed) */}
              {status === 'completed' && (
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xs text-slate-500">Your rating:</span>
                  <StarRating value={getProgress(c.id)?.userRating} onChange={r => handleRate(c, r)} />
                </div>
              )}

              <div className="mt-auto flex gap-2">
                <button onClick={() => handleWatchNow(c)} className="btn-primary flex-1 text-xs py-2">▶ Watch Now</button>
                {!status && (
                  <button onClick={() => handleAddToWatchlist(c)} className="btn-ghost text-xs py-2 px-3" title="Add to Watchlist">📌</button>
                )}
                {status === 'watchlist' && (
                  <button onClick={() => handleAddToWatchlist(c)} className="btn-ghost text-xs py-2 px-3 text-fbbf24" title="Start watching" style={{ color: '#fbbf24' }}>▶ Start</button>
                )}
                {status === 'in-progress' && (
                  <button onClick={() => handleMarkComplete(c)} className="btn-ghost text-xs py-2 px-3 text-emerald-400" title="Mark complete">✓</button>
                )}
                <a href={c.youtubeUrl} target="_blank" rel="noopener noreferrer"
                  className="btn-ghost text-xs py-2 px-3 text-rose-400" title="Open in YouTube"
                  onClick={e => e.stopPropagation()}>↗</a>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-slate-500">
            <div className="text-5xl mb-3">📚</div>
            <p>No courses found</p>
          </div>
        )}
      </div>

      {selectedCourse && (
        <YouTubeModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          onStartWatch={handleStartWatch}
        />
      )}
    </div>
  );
}
