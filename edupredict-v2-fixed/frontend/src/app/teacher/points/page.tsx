'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuthStore, usePointsStore, DEMO_USERS, ACTIVITY_RULES, getTier, avatarColor, initials, type PointEntry, type Notif } from '@/store';
import { studentsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

type FormData = { studentId: string; activityId: string; customPoints: string; note: string; };

export default function AwardPointsPage() {
  const { user } = useAuthStore();
  const { db, award, addNotif, getLog } = usePointsStore();
  const [bulkIds, setBulkIds]     = useState<string[]>([]);
  const [bulkMode, setBulkMode]   = useState(false);
  const [viewHistory, setViewHistory] = useState<string|null>(null);
  const [filter, setFilter]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>();
  const selectedActivity = watch('activityId');
  const customPoints     = watch('customPoints');
  const selectedStudent  = watch('studentId');

  const rule = ACTIVITY_RULES.find(r => r.id === selectedActivity);
  const needsCustom = selectedActivity === 'bonus' || selectedActivity === 'deduction';
  const previewPts  = needsCustom ? Number(customPoints)||0 : (customPoints ? Number(customPoints) : rule?.points||0);
  const isMinus     = selectedActivity === 'deduction';

  const filteredStudents = DEMO_USERS.students.filter(s =>
    s.name.toLowerCase().includes(filter.toLowerCase()) || s.branch.toLowerCase().includes(filter.toLowerCase())
  );

  const doAward = async (targets: string[], data: FormData) => {
    if (!rule) return;
    const rawPts  = needsCustom ? Number(data.customPoints)||0 : (data.customPoints ? Number(data.customPoints) : rule.points);
    const finalPts= isMinus ? -Math.abs(rawPts) : rawPts;

    for (const sid of targets) {
      const curPts = db[sid]?.points || 0;
      const total  = Math.max(0, curPts + finalPts);
      const entry: PointEntry = {
        id: `${Date.now()}-${sid}`, activity_id: data.activityId,
        icon: rule.icon, label: rule.label, category: rule.category,
        points_earned: finalPts, total_after: total, note: data.note || '',
        awarded_by: user?.name || 'Teacher', teacher_id: user?.id || '',
        date: new Date().toISOString(),
      };
      award(sid, entry, total);
      const notif: Notif = {
        id: `n-${Date.now()}-${sid}`, type: finalPts>=0 ? 'points_awarded' : 'points_deducted',
        title: finalPts>=0 ? `+${finalPts} Points from ${user?.name}! 🎉` : `${finalPts} Points Deducted`,
        message: `${rule.label}${data.note?': '+data.note:''}. Total: ${total} pts.`,
        timestamp: new Date().toISOString(), read: false, icon: rule.icon,
      };
      addNotif(sid, notif);

      // Try real API (non-blocking)
      try { await studentsAPI.awardPoints(sid, { activity_id: data.activityId, custom_points: rawPts, note: data.note }); } catch {}
    }
  };

  const onSubmit = async (data: FormData) => {
    const targets = bulkMode ? bulkIds : (data.studentId ? [data.studentId] : []);
    if (!targets.length) { toast.error('Select at least one student'); return; }
    if (!data.activityId) { toast.error('Select an activity'); return; }
    if (needsCustom && !data.customPoints) { toast.error('Enter custom points'); return; }
    setSubmitting(true);
    await doAward(targets, data);
    toast.success(`✅ Points awarded to ${targets.length} student${targets.length>1?'s':''}!`);
    reset(); setBulkIds([]);
    setSubmitting(false);
  };

  const toggleBulk = (id: string) => setBulkIds(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);

  if (viewHistory) {
    const s   = DEMO_USERS.students.find(x => x.id === viewHistory)!;
    const log = getLog(viewHistory);
    const pts = db[viewHistory]?.points || 0;
    const tier= getTier(pts);
    return (
      <div className="space-y-6 anim-fade-up">
        <button onClick={() => setViewHistory(null)} className="btn-ghost text-sm">← Back to Award Points</button>
        <div className="card">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-display font-bold text-lg flex-shrink-0"
              style={{ background:`${avatarColor(s.name)}22`, color:avatarColor(s.name) }}>{initials(s.name)}</div>
            <div className="flex-1">
              <h2 className="section-title text-xl">{s.name}</h2>
              <p className="text-slate-400 text-sm">{s.branch} · Sem {s.semester} · CGPA {s.cgpa}</p>
            </div>
            <div className="text-right">
              <div className="stat-number text-3xl font-bold" style={{ color:tier.color }}>{pts}</div>
              <div className="text-sm text-slate-400">{tier.badge}</div>
            </div>
          </div>
          {log.length === 0 ? (
            <div className="py-12 text-center text-slate-500 border border-dashed border-slate-700 rounded-xl">No points awarded yet</div>
          ) : (
            <div className="space-y-3">
              {log.map(e => (
                <div key={e.id} className="glass-sm rounded-xl p-4 flex items-center gap-4"
                  style={{ borderColor: e.points_earned>=0?'rgba(16,185,129,0.15)':'rgba(244,63,94,0.15)' }}>
                  <span className="text-2xl flex-shrink-0">{e.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{e.label}</div>
                    <div className="text-slate-500 text-xs mt-0.5">
                      By {e.awarded_by} · {formatDistanceToNow(new Date(e.date), { addSuffix:true })}
                      {e.note && <span className="text-indigo-400 ml-2">"{e.note}"</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="stat-number text-xl font-bold" style={{ color:e.points_earned>=0?'#10b981':'#f43f5e' }}>
                      {e.points_earned>=0?'+':''}{e.points_earned}
                    </div>
                    <div className="text-slate-500 text-xs">→ {e.total_after} total</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between anim-fade-up">
        <div>
          <h1 className="section-title text-2xl mb-1">🏅 Award Activity Points</h1>
          <p className="text-slate-400 text-sm">Only teachers can assign points — students cannot self-award</p>
        </div>
        <button onClick={() => setBulkMode(!bulkMode)}
          className={`btn ${bulkMode?'btn-primary':'btn-ghost'} text-sm`}>
          {bulkMode ? '✓ Bulk Mode ON' : '⊕ Bulk Award'}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-2 gap-6">
          {/* Student selector */}
          <div className="card space-y-4 anim-fade-up">
            <div>
              <h3 className="font-semibold mb-3">{bulkMode ? `Select Students (${bulkIds.length} selected)` : 'Select Student'}</h3>
              <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search name or branch…" className="input text-sm mb-3" />
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto no-scroll">
              {filteredStudents.map(s => {
                const pts  = db[s.id]?.points || 0;
                const tier = getTier(pts);
                const col  = avatarColor(s.name);
                const isSelected = bulkMode ? bulkIds.includes(s.id) : watch('studentId') === s.id;
                return (
                  <div key={s.id} onClick={() => bulkMode ? toggleBulk(s.id) : undefined}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${isSelected?'border-indigo-500/40 bg-indigo-500/8':'border-transparent hover:bg-slate-800/40'}`}>
                    {bulkMode ? (
                      <div onClick={() => toggleBulk(s.id)} className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${isSelected?'bg-indigo-500 border-indigo-500':'border-slate-600'}`}>
                        {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                      </div>
                    ) : (
                      <input type="radio" value={s.id} {...register('studentId')} className="w-4 h-4 accent-indigo-500 flex-shrink-0" />
                    )}
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center font-display font-bold text-xs flex-shrink-0" style={{ background:`${col}22`,color:col }}>{initials(s.name)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{s.name}</div>
                      <div className="text-slate-500 text-xs">{s.branch.split(' ')[0]} · Sem {s.semester}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-sm font-mono" style={{ color:tier.color }}>{pts}</div>
                      <div className="text-slate-600 text-[10px]">{tier.tier}</div>
                    </div>
                    <button type="button" onClick={e=>{ e.stopPropagation(); setViewHistory(s.id); }}
                      className="text-slate-500 hover:text-slate-200 text-xs px-2 py-1 glass-sm rounded-lg ml-1">📋</button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity + Form */}
          <div className="card space-y-5 anim-fade-up anim-delay-1">
            <h3 className="font-semibold">Activity Type</h3>
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITY_RULES.map(r => {
                const sel = watch('activityId') === r.id;
                return (
                  <label key={r.id} className={`flex items-center gap-2 p-3 rounded-xl cursor-pointer border transition-all ${sel?'border-indigo-400/50 bg-indigo-500/10':'border-slate-700/50 hover:border-slate-600'}`}>
                    <input type="radio" value={r.id} {...register('activityId',{required:true})} className="sr-only" />
                    <span className="text-lg flex-shrink-0">{r.icon}</span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">{r.label}</div>
                      {r.points>0 && <div className="text-[10px] text-slate-500">+{r.points} default</div>}
                      {r.id==='deduction' && <div className="text-[10px] text-rose-400">removes pts</div>}
                    </div>
                  </label>
                );
              })}
            </div>

            {selectedActivity && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    {needsCustom ? 'Points (required)' : 'Override Points (optional)'}
                  </label>
                  <input type="number" {...register('customPoints')} placeholder={needsCustom ? 'Enter pts…' : `Default: ${rule?.points||0}`} className="input text-sm" min={0} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">Note / Reason</label>
                  <input {...register('note')} placeholder="Optional note…" className="input text-sm" />
                </div>
              </div>
            )}

            {/* Preview */}
            {selectedActivity && (bulkMode ? bulkIds.length > 0 : selectedStudent) && (
              <div className="glass-sm rounded-xl p-4 border border-indigo-500/20">
                <div className="text-xs text-indigo-400 font-mono uppercase tracking-wider mb-2">Preview</div>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-sm">{rule?.icon} {rule?.label}</div>
                    <div className="text-slate-500 text-xs mt-0.5">{bulkMode ? `${bulkIds.length} students` : DEMO_USERS.students.find(s=>s.id===selectedStudent)?.name}</div>
                  </div>
                  <div className="stat-number text-2xl font-bold" style={{ color:isMinus?'#f43f5e':'#10b981' }}>
                    {isMinus?'-':'+'}{previewPts} pts
                  </div>
                </div>
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3">
              {submitting ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Awarding…</> : '🏅 Award Points'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
