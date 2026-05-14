import { useState } from 'react';
import { recommendCourses, DIFF_COLOR, Course } from '../courses-data';
import { useAuthStore, useCourseProgress } from '../hooks';
import { DEMO_USERS, toast } from '../store';

function YouTubeModal({ course, onClose }: { course: Course; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(2,6,23,0.95)' }} onClick={onClose}>
      <div className="w-full max-w-3xl" style={{ animation: 'scaleIn .25s cubic-bezier(.34,1.56,.64,1)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="font-bold text-lg text-slate-100">{course.title}</h2>
            <p className="text-slate-400 text-sm">{course.provider}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-2">✕</button>
        </div>
        <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9' }}>
          <iframe src={`https://www.youtube.com/embed/${course.youtubeId}?autoplay=1&rel=0`} title={course.title}
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" allowFullScreen className="w-full h-full" />
        </div>
        <div className="mt-3 flex gap-3 items-center">
          <a href={course.youtubeUrl} target="_blank" rel="noopener noreferrer"
            className="btn-ghost text-sm px-4 py-2 text-rose-400">▶ Open in YouTube</a>
          <span className="text-xs text-slate-500 ml-auto">{course.duration} · ⭐ {course.rating}</span>
        </div>
      </div>
    </div>
  );
}

export default function Recommendations() {
  const { user } = useAuthStore();
  const studentUser = DEMO_USERS.students.find(s => s.id === user?.id);
  const branch = studentUser?.branch ?? 'Computer Science';
  const semester = studentUser?.semester ?? 4;
  const cgpa = studentUser?.cgpa ?? 7.0;
  const { get: getProgress, set: setProgress } = useCourseProgress(user?.id ?? '');

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const recommendations = recommendCourses(branch, semester, cgpa, 8);

  const handleWatchNow = (c: Course) => {
    setSelectedCourse(c);
    const current = getProgress(c.id);
    if (!current || current.status === 'watchlist') {
      setProgress({ courseId: c.id, status: 'in-progress', watchedAt: new Date().toISOString() });
      toast.info('Started course', c.title);
    }
  };

  const handleSave = (c: Course) => {
    if (!getProgress(c.id)) {
      setProgress({ courseId: c.id, status: 'watchlist' });
      toast.success('Saved to Watchlist', c.title);
    }
  };

  const reasonFor = (c: Course): string[] => {
    const reasons: string[] = [];
    if (c.branch.includes(branch)) reasons.push(`Aligned with ${branch}`);
    if (semester >= c.semester_min && semester <= c.semester_max) reasons.push(`Perfect for Semester ${semester}`);
    if (cgpa >= c.prereq_cgpa) reasons.push('You meet all prerequisites');
    if (cgpa >= 7.5 && c.difficulty === 'Advanced') reasons.push('Matches your strong CGPA');
    return reasons;
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <style>{`@keyframes scaleIn { from { opacity:0; transform:scale(.88); } to { opacity:1; transform:scale(1); } }`}</style>
      <div className="anim-fade-up">
        <h1 className="text-2xl font-bold mb-1">⭐ Personalized Recommendations</h1>
        <p className="text-slate-400 text-sm">Courses selected for you based on your branch, semester, and CGPA</p>
      </div>

      <div className="card anim-fade-up anim-delay-1">
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-2"><span className="text-slate-500">Branch:</span><span className="font-semibold text-indigo-400">{branch}</span></div>
          <div className="text-slate-700">·</div>
          <div className="flex items-center gap-2"><span className="text-slate-500">Semester:</span><span className="font-semibold text-blue-400">{semester}</span></div>
          <div className="text-slate-700">·</div>
          <div className="flex items-center gap-2"><span className="text-slate-500">CGPA:</span><span className="font-semibold text-emerald-400">{cgpa}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 anim-fade-up anim-delay-2">
        {recommendations.map((c, i) => {
          const reasons = reasonFor(c);
          const p = getProgress(c.id);
          return (
            <div key={c.id} className="card group hover:-translate-y-0.5 transition-all flex flex-col overflow-hidden"
              style={{ border: i < 3 ? '1px solid rgba(99,102,241,0.2)' : '' }}>
              {/* Thumbnail */}
              <div className="relative -mx-6 -mt-6 mb-4 cursor-pointer overflow-hidden" style={{ aspectRatio: '16/9' }}
                onClick={() => handleWatchNow(c)}>
                <img src={`https://img.youtube.com/vi/${c.youtubeId}/mqdefault.jpg`} alt={c.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.45)' }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,0,0,0.9)' }}>
                    <span className="text-white text-2xl ml-1">▶</span>
                  </div>
                </div>
                {i < 3 && (
                  <div className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(99,102,241,0.9)', color: 'white' }}>#{i + 1} Top Pick</div>
                )}
                {p && (
                  <div className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: 'rgba(2,6,23,0.85)', color: p.status === 'completed' ? '#10b981' : p.status === 'in-progress' ? '#fbbf24' : '#38bdf8' }}>
                    {p.status === 'completed' ? '✅ Done' : p.status === 'in-progress' ? '▶ Watching' : '📌 Saved'}
                  </div>
                )}
              </div>

              <div className="flex items-start justify-between mb-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: `${DIFF_COLOR[c.difficulty]}20`, color: DIFF_COLOR[c.difficulty] }}>
                  {c.difficulty}
                </span>
                <span className="text-xs text-yellow-400">⭐ {c.rating}</span>
              </div>
              <h3 className="font-semibold text-slate-100 mb-1 group-hover:text-indigo-300 transition-colors text-sm leading-tight">{c.title}</h3>
              <p className="text-xs text-slate-500 mb-2">{c.provider} · {c.duration}</p>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">{c.description}</p>

              {reasons.length > 0 && (
                <div className="mb-4 space-y-1">
                  {reasons.map(r => (
                    <div key={r} className="text-xs flex items-center gap-1.5 text-emerald-400"><span>✓</span> {r}</div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-1 mb-4">
                {c.skills.map(s => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(30,41,59,0.8)', color: '#94a3b8' }}>{s}</span>
                ))}
              </div>

              <div className="mt-auto flex gap-2">
                <button onClick={() => handleWatchNow(c)} className="btn-primary flex-1 text-xs py-2">▶ Watch Now</button>
                {!p && <button onClick={() => handleSave(c)} className="btn-ghost text-xs py-2 px-3" title="Save to watchlist">📌</button>}
                <a href={c.youtubeUrl} target="_blank" rel="noopener noreferrer"
                  className="btn-ghost text-xs py-2 px-3 text-rose-400" title="Open on YouTube">↗</a>
              </div>
            </div>
          );
        })}
      </div>

      {selectedCourse && (<YouTubeModal course={selectedCourse} onClose={() => setSelectedCourse(null)} />)}
    </div>
  );
}
