import { useState, useRef } from 'react';
import { useAuthStore, useAssignments } from '../hooks';
import { DEMO_USERS, Assignment, AssignmentPriority, AssignmentStatus, toast } from '../store';

/* ── helpers ──────────────────────────────────────────────────────────────── */
function daysUntil(d: string, t: string) {
  return (new Date(`${d}T${t}`).getTime() - Date.now()) / 86400000;
}
function fmtDue(d: string, t: string) {
  const n = daysUntil(d, t);
  if (n < 0)  return `Overdue by ${Math.abs(Math.ceil(n))}d`;
  if (n < 1)  return `Due in ${Math.round(n * 24)}h`;
  if (n < 2)  return 'Due tomorrow';
  return `Due in ${Math.ceil(n)} days`;
}
function fmtDate(d: string, t: string) {
  return new Date(`${d}T${t}`).toLocaleDateString('en', { weekday:'short', month:'short', day:'numeric' }) + ` at ${t}`;
}
const PRI_COLOR: Record<AssignmentPriority, string> = { high:'#f43f5e', medium:'#fbbf24', low:'#10b981' };
const PRI_LABEL: Record<AssignmentPriority, string> = { high:'🔴 High', medium:'🟡 Medium', low:'🟢 Low' };

/* ═══════════════════════════════════════════════════════════════════════════
   STUDENT VIEW  — simple, read-only marks display + submit button
═══════════════════════════════════════════════════════════════════════════*/

function SubmitModal({ a, onClose, onSubmit }: {
  a: Assignment; onClose: () => void;
  onSubmit: (file: File | null, note: string) => void;
}) {
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(2,6,23,0.92)', backdropFilter:'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6"
        style={{ background:'rgba(15,23,42,0.99)', border:'1px solid rgba(99,102,241,0.3)', animation:'scaleIn .2s ease' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base">📤 Submit Assignment</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">×</button>
        </div>

        {/* Assignment info */}
        <div className="mb-4 p-3 rounded-xl" style={{ background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)' }}>
          <div className="font-semibold text-sm text-slate-100">{a.title}</div>
          <div className="text-xs text-indigo-400 mt-0.5">{a.subject} · Max: {a.maxMarks ?? 50} marks</div>
        </div>

        {/* File pick */}
        <div className="mb-3">
          <label className="block text-xs text-slate-400 mb-1.5">Upload your work *</label>
          <input ref={ref} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.zip"
            style={{ display:'none' }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
          <div onClick={() => ref.current?.click()} className="rounded-xl p-4 text-center cursor-pointer transition-all"
            style={{ border:`2px dashed ${file ? 'rgba(99,102,241,0.5)' : 'rgba(148,163,184,0.2)'}`,
              background: file ? 'rgba(99,102,241,0.06)' : 'rgba(2,6,23,0.3)' }}>
            {file ? (
              <div>
                <div className="text-xl mb-1">📎</div>
                <div className="text-sm font-semibold text-indigo-300">{file.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{(file.size/1024).toFixed(1)} KB · Click to change</div>
              </div>
            ) : (
              <div>
                <div className="text-xl mb-1">📂</div>
                <div className="text-sm text-slate-400">Click to select file</div>
                <div className="text-xs text-slate-600 mt-0.5">PDF · DOCX · JPG · PNG · TXT</div>
              </div>
            )}
          </div>
        </div>

        {/* Note */}
        <div className="mb-5">
          <label className="block text-xs text-slate-400 mb-1.5">Note to teacher (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Any message for your teacher…" className="input text-sm resize-none" rows={2} />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1 text-sm py-2.5">Cancel</button>
          <button onClick={() => onSubmit(file, note)} disabled={!file}
            className="btn-primary flex-1 text-sm py-2.5 disabled:opacity-40"
            style={{ background: file ? undefined : 'rgba(99,102,241,0.3)' }}>
            {file ? '📤 Submit' : 'Pick a file first'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StudentAssignmentCard({ a, onSubmit }: { a: Assignment; onSubmit: () => void }) {
  const days = daysUntil(a.dueDate, a.dueTime);
  const isOverdue = days < 0 && a.status !== 'completed';
  const isDueSoon = days >= 0 && days <= 2 && a.status !== 'completed';
  const pCol = PRI_COLOR[a.priority];

  const max = a.maxMarks ?? 50;
  const obtained = a.marksObtained;
  const pct = obtained != null ? Math.round((obtained / max) * 100) : null;
  const mCol = pct == null ? '#64748b' : pct >= 70 ? '#10b981' : pct >= 50 ? '#fbbf24' : '#f43f5e';

  return (
    <div className="card flex flex-col gap-3 transition-all hover:-translate-y-0.5"
      style={{ border: isOverdue ? '1px solid rgba(244,63,94,0.4)' : isDueSoon ? '1px solid rgba(251,191,36,0.3)' : '' }}>

      {/* Header badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background:`${pCol}18`, color:pCol }}>{PRI_LABEL[a.priority]}</span>
        {isOverdue && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ background:'rgba(244,63,94,0.18)', color:'#f87171' }}>⚠️ Overdue</span>}
        {isDueSoon && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full animate-pulse"
          style={{ background:'rgba(251,191,36,0.18)', color:'#fbbf24' }}>⏰ Due Soon</span>}
        {a.submittedFile && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background:'rgba(16,185,129,0.15)', color:'#34d399' }}>✅ Submitted</span>}
        {a.status === 'completed' && !a.submittedFile && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background:'rgba(16,185,129,0.1)', color:'#10b981' }}>✅ Done</span>}
      </div>

      {/* Title */}
      <div>
        <h3 className="font-semibold text-sm text-slate-100 leading-snug mb-0.5">{a.title}</h3>
        <p className="text-xs font-medium" style={{ color:'#818cf8' }}>{a.subject}</p>
        {a.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.description}</p>}
      </div>

      {/* Due + assigned by */}
      <div className="flex items-center gap-2 text-xs">
        <span>{isOverdue ? '🚨' : isDueSoon ? '⏰' : '📅'}</span>
        <div className="flex-1">
          <span className="font-semibold" style={{ color: isOverdue?'#f87171':isDueSoon?'#fbbf24':'#94a3b8' }}>
            {fmtDue(a.dueDate, a.dueTime)}
          </span>
          <span className="text-slate-600 ml-1">· {fmtDate(a.dueDate, a.dueTime)}</span>
        </div>
        {a.assignedBy && <span className="text-[10px] text-slate-600">by {a.assignedBy}</span>}
      </div>

      {/* ── MARKS SECTION — student sees teacher-given marks ── */}
      <div className="rounded-xl p-3" style={{ background:`${mCol}0c`, border:`1px solid ${mCol}28` }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold" style={{ color:mCol }}>📊 Marks</span>
          {pct != null ? (
            <span className="text-sm font-bold" style={{ color:mCol }}>{obtained} / {max} ({pct}%)</span>
          ) : (
            <span className="text-xs text-slate-500">Awaiting marks from teacher</span>
          )}
        </div>
        {pct != null && (
          <div style={{ height:5, borderRadius:999, background:'rgba(148,163,184,0.1)', overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:999, background:mCol, width:`${pct}%`, transition:'width 1s ease' }} />
          </div>
        )}
        {/* Grade label */}
        {pct != null && (
          <div className="mt-1.5 text-[10px] font-bold" style={{ color:mCol }}>
            {pct >= 90 ? 'A+ · Excellent' : pct >= 75 ? 'A · Good' : pct >= 60 ? 'B · Average' : pct >= 50 ? 'C · Pass' : 'D · Below Pass'}
          </div>
        )}
      </div>

      {/* Teacher feedback */}
      {a.teacherFeedback && (
        <div className="rounded-lg p-3 text-xs" style={{ background:'rgba(99,102,241,0.07)', border:'1px solid rgba(99,102,241,0.18)' }}>
          <span className="font-semibold text-indigo-400">💬 Teacher: </span>
          <span className="text-slate-300">{a.teacherFeedback}</span>
        </div>
      )}

      {/* Submitted file */}
      {a.submittedFile && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.2)' }}>
          <span>📎</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-emerald-300 truncate">{a.submittedFile}</div>
            {a.submittedAt && <div className="text-[10px] text-slate-500">
              {new Date(a.submittedAt).toLocaleDateString('en',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
            </div>}
          </div>
        </div>
      )}

      {/* Submit button */}
      <button onClick={onSubmit}
        className="w-full text-xs py-2.5 rounded-xl font-semibold transition-all mt-auto"
        style={{
          background: a.submittedFile ? 'rgba(16,185,129,0.08)' : 'rgba(99,102,241,0.12)',
          border: a.submittedFile ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(99,102,241,0.3)',
          color: a.submittedFile ? '#34d399' : '#a5b4fc',
          cursor:'pointer', fontFamily:'inherit',
        }}>
        {a.submittedFile ? '🔄 Re-submit' : '📤 Submit Assignment'}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEACHER VIEW  — allot marks + add feedback to any student assignment
═══════════════════════════════════════════════════════════════════════════*/

function TeacherAssignmentCard({ a, onGrade, onDelete }: {
  a: Assignment;
  onGrade: (marks: number, feedback: string) => void;
  onDelete: () => void;
}) {
  const max = a.maxMarks ?? 50;
  const obtained = a.marksObtained;
  const pct = obtained != null ? Math.round((obtained / max) * 100) : null;
  const mCol = pct == null ? '#64748b' : pct >= 70 ? '#10b981' : pct >= 50 ? '#fbbf24' : '#f43f5e';
  const [grading, setGrading] = useState(false);
  const [marks, setMarks] = useState(String(obtained ?? ''));
  const [feedback, setFeedback] = useState(a.teacherFeedback ?? '');

  const days = daysUntil(a.dueDate, a.dueTime);
  const isOverdue = days < 0 && a.status !== 'completed';

  return (
    <div className="card flex flex-col gap-3 group transition-all hover:-translate-y-0.5"
      style={{ border: isOverdue ? '1px solid rgba(244,63,94,0.3)' : '' }}>
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-slate-100 leading-snug">{a.title}</h3>
          <p className="text-xs text-indigo-400 mt-0.5">{a.subject}</p>
        </div>
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 text-lg leading-none transition-all">×</button>
      </div>

      {/* Due */}
      <div className="text-xs text-slate-500 flex items-center gap-1.5">
        <span>📅</span>
        <span style={{ color: isOverdue?'#f87171':'#94a3b8' }}>{fmtDue(a.dueDate, a.dueTime)}</span>
        <span>· {fmtDate(a.dueDate, a.dueTime)}</span>
      </div>

      {/* Submission status */}
      {a.submittedFile ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.2)' }}>
          <span>📎</span>
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-emerald-300">{a.submittedFile}</span>
            {a.submissionNote && <span className="text-slate-400 ml-1">— "{a.submissionNote}"</span>}
          </div>
        </div>
      ) : (
        <div className="text-xs text-slate-600 px-1">⏳ Not submitted yet</div>
      )}

      {/* Current marks display */}
      <div className="rounded-xl p-3" style={{ background:`${mCol}0c`, border:`1px solid ${mCol}28` }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold" style={{ color:mCol }}>📊 Marks</span>
          {pct != null
            ? <span className="text-sm font-bold" style={{ color:mCol }}>{obtained}/{max} ({pct}%)</span>
            : <span className="text-xs text-slate-500">Not graded yet</span>}
        </div>
        {pct != null && (
          <div style={{ height:4, borderRadius:999, background:'rgba(148,163,184,0.1)', overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:999, background:mCol, width:`${pct}%` }} />
          </div>
        )}
      </div>

      {/* Existing feedback */}
      {a.teacherFeedback && !grading && (
        <div className="rounded-lg p-2.5 text-xs" style={{ background:'rgba(99,102,241,0.07)', border:'1px solid rgba(99,102,241,0.15)' }}>
          <span className="font-semibold text-indigo-400">Your feedback: </span>
          <span className="text-slate-400">{a.teacherFeedback}</span>
        </div>
      )}

      {/* Grade form */}
      {grading ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 items-center">
            <input type="number" value={marks} onChange={e => setMarks(e.target.value)}
              placeholder={`Marks (0–${max})`} min="0" max={max}
              className="input text-sm flex-1" style={{ height:36 }} />
            <span className="text-xs text-slate-500 flex-shrink-0">/ {max}</span>
          </div>
          <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
            placeholder="Feedback for student (optional)…" className="input text-xs resize-none" rows={2} />
          <div className="flex gap-2">
            <button onClick={() => setGrading(false)} className="btn-ghost text-xs py-2 flex-1">Cancel</button>
            <button
              onClick={() => { onGrade(parseFloat(marks), feedback); setGrading(false); }}
              disabled={!marks || isNaN(Number(marks))}
              className="btn-primary text-xs py-2 flex-1 disabled:opacity-40">
              ✅ Save Marks
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setGrading(true)}
          className="w-full text-xs py-2.5 rounded-xl font-semibold transition-all"
          style={{
            background: obtained != null ? 'rgba(251,191,36,0.08)' : 'rgba(99,102,241,0.12)',
            border: obtained != null ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(99,102,241,0.3)',
            color: obtained != null ? '#fbbf24' : '#a5b4fc',
            cursor:'pointer', fontFamily:'inherit',
          }}>
          {obtained != null ? '✏️ Edit Marks & Feedback' : '📝 Allot Marks'}
        </button>
      )}
    </div>
  );
}

/* ── Teacher Add Assignment Modal ────────────────────────────────────────── */
function AddModal({ onClose, onAdd, teacherName }: {
  onClose: () => void;
  teacherName: string;
  onAdd: (a: Omit<Assignment,'id'|'createdAt'>) => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const students = DEMO_USERS.students;
  const [f, setF] = useState({
    title:'', subject:'', description:'', dueDate:today, dueTime:'23:59',
    priority:'medium' as AssignmentPriority, maxMarks:'50', assignTo:'all',
  });
  const upd = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const submit = () => {
    if (!f.title.trim() || !f.subject.trim() || !f.dueDate) {
      toast.error('Missing fields', 'Title, subject and due date required'); return;
    }
    const base = { title:f.title.trim(), subject:f.subject.trim(), description:f.description.trim(),
      dueDate:f.dueDate, dueTime:f.dueTime, priority:f.priority, status:'pending' as AssignmentStatus,
      tags:[], maxMarks:parseInt(f.maxMarks)||50, assignedBy:teacherName };

    if (f.assignTo === 'all') {
      students.forEach(s => onAdd({ ...base, userId:s.id }));
      toast.success('Assigned to all students!', f.title);
    } else {
      onAdd({ ...base, userId:f.assignTo });
      const name = students.find(s=>s.id===f.assignTo)?.name ?? f.assignTo;
      toast.success(`Assigned to ${name}`, f.title);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(2,6,23,0.92)', backdropFilter:'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-6"
        style={{ background:'rgba(15,23,42,0.99)', border:'1px solid rgba(148,163,184,0.18)', animation:'scaleIn .2s ease' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-base">📋 Create Assignment</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">×</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Assign To</label>
            <select value={f.assignTo} onChange={e => upd('assignTo', e.target.value)} className="input text-sm">
              <option value="all">🎓 All Students</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.branch?.split(' ')[0]})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Title *</label>
            <input value={f.title} onChange={e => upd('title', e.target.value)} placeholder="Assignment title…" className="input text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Subject *</label>
              <input value={f.subject} onChange={e => upd('subject', e.target.value)} placeholder="Subject name" className="input text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Max Marks</label>
              <input type="number" value={f.maxMarks} onChange={e => upd('maxMarks', e.target.value)} min="1" className="input text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Due Date *</label>
              <input type="date" value={f.dueDate} min={today} onChange={e => upd('dueDate', e.target.value)} className="input text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Due Time</label>
              <input type="time" value={f.dueTime} onChange={e => upd('dueTime', e.target.value)} className="input text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Priority</label>
              <select value={f.priority} onChange={e => upd('priority', e.target.value)} className="input text-sm">
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea value={f.description} onChange={e => upd('description', e.target.value)}
              placeholder="What students need to do…" className="input text-sm resize-none" rows={2} />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-ghost flex-1 text-sm py-2.5">Cancel</button>
          <button onClick={submit} className="btn-primary flex-1 text-sm py-2.5">📋 Create Assignment</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════*/
export default function Assignments() {
  const { user, role } = useAuthStore();
  const isTeacher = role === 'teacher';

  const studentUser = DEMO_USERS.students.find(s => s.id === user?.id);
  const branch = studentUser?.branch ?? 'Computer Science';
  const { assignments, overdue, dueSoon, pending, inProgress, completed,
          add, update, remove, markDone } = useAssignments(user?.id ?? '', branch);

  const [showAdd,   setShowAdd]   = useState(false);
  const [submitFor, setSubmitFor] = useState<Assignment | null>(null);
  const [filter,    setFilter]    = useState<'all'|'pending'|'in-progress'|'completed'|'overdue'>('all');
  const [search,    setSearch]    = useState('');

  const filtered = assignments
    .filter(a => {
      if (filter === 'overdue') return daysUntil(a.dueDate,a.dueTime) < 0 && a.status !== 'completed';
      if (filter === 'all') return true;
      return a.status === filter;
    })
    .filter(a => !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.subject.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => new Date(`${a.dueDate}T${a.dueTime}`).getTime() - new Date(`${b.dueDate}T${b.dueTime}`).getTime());

  const handleSubmit = (a: Assignment, file: File | null, note: string) => {
    update(a.id, { submittedFile:file?.name, submittedAt:new Date().toISOString(),
      submissionNote:note||undefined, status:'completed', completedAt:new Date().toISOString() });
    toast.success('Submitted! 📤', file?.name ?? 'Assignment submitted');
    setSubmitFor(null);
  };

  const handleGrade = (id: string, marks: number, feedback: string) => {
    update(id, { marksObtained:marks, teacherFeedback:feedback||undefined, status:'completed' });
    toast.success('Marks saved! ✅', `${marks} marks allotted`);
  };

  // Summary stats
  const gradedCount  = completed.filter(a => a.marksObtained != null).length;
  const totalObt     = completed.filter(a => a.marksObtained != null).reduce((s,a) => s+(a.marksObtained??0),0);
  const totalMax     = completed.filter(a => a.marksObtained != null).reduce((s,a) => s+(a.maxMarks??50),0);
  const avgPct       = totalMax > 0 ? Math.round((totalObt/totalMax)*100) : null;
  const avgCol       = avgPct == null ? '#64748b' : avgPct>=70?'#10b981':avgPct>=50?'#fbbf24':'#f43f5e';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>
      <style>{`@keyframes scaleIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}`}</style>

      {/* Header */}
      <div className="anim-fade-up flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">📝 {isTeacher ? 'Manage Assignments' : 'My Assignments'}</h1>
          <p className="text-slate-400 text-sm">
            {isTeacher ? 'Create assignments and allot marks to students' : 'View assignments and submit your work'}
          </p>
        </div>
        {isTeacher && (
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2 flex-shrink-0">
            + Create Assignment
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 anim-fade-up anim-delay-1">
        {[
          { label:'Total',       value:assignments.length, color:'#6366f1', icon:'📋' },
          { label:'Pending',     value:pending.length,     color:'#fbbf24', icon:'⏳' },
          { label:'Submitted',   value:completed.length,   color:'#10b981', icon:'✅' },
          { label:'Avg Score',   value:avgPct!=null?`${avgPct}%`:'—', color:avgCol, icon:'📊' },
        ].map(s => (
          <div key={s.label} className="card py-3 flex items-center gap-3">
            <span className="text-xl">{s.icon}</span>
            <div>
              <div className="text-xl font-bold" style={{ color:s.color }}>{s.value}</div>
              <div className="text-[11px] text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Grade summary bar (student only) */}
      {!isTeacher && gradedCount > 0 && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-4"
          style={{ background:`${avgCol}08`, border:`1px solid ${avgCol}25` }}>
          <span className="text-xl">📊</span>
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">{gradedCount} graded</span>
              <span className="font-bold" style={{ color:avgCol }}>{totalObt}/{totalMax} marks · {avgPct}%</span>
            </div>
            <div style={{ height:5, borderRadius:999, background:'rgba(148,163,184,0.1)', overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:999, background:avgCol, width:`${avgPct}%`, transition:'width 1s' }} />
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {overdue.length > 0 && (
        <div className="rounded-xl px-4 py-3 flex items-start gap-3"
          style={{ background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.3)' }}>
          <span>🚨</span>
          <div>
            <div className="font-semibold text-sm" style={{ color:'#fca5a5' }}>
              {overdue.length} overdue assignment{overdue.length>1?'s':''}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{overdue.map(a=>a.title).join(' · ')}</div>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-2 anim-fade-up anim-delay-1">
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search…" className="input text-sm flex-1 min-w-[160px]" />
        {['all','pending','in-progress','completed','overdue'].map(f => (
          <button key={f} onClick={() => setFilter(f as any)}
            className="text-xs px-3 py-1.5 rounded-full transition-all"
            style={filter===f
              ? {background:'rgba(99,102,241,0.2)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.4)'}
              : {background:'rgba(30,41,59,0.5)',color:'#64748b',border:'1px solid rgba(148,163,184,0.08)'}}>
            {f==='all'?`All (${assignments.length})`:f==='overdue'?`🚨 Overdue (${overdue.length})`:f==='pending'?`⏳ Pending (${pending.length})`:f==='in-progress'?`▶ In Progress (${inProgress.length})`:`✅ Done (${completed.length})`}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-14">
          <div className="text-5xl mb-3">{filter==='overdue'?'🎉':'📝'}</div>
          <div className="font-semibold text-slate-300 mb-1">
            {filter==='overdue'?'No overdue assignments! 🎊':'No assignments found'}
          </div>
          <div className="text-sm text-slate-500">
            {isTeacher?'Create an assignment for students':'Your teacher will assign work here'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 anim-fade-up anim-delay-2">
          {filtered.map(a => isTeacher ? (
            <TeacherAssignmentCard
              key={a.id}
              a={a}
              onGrade={(m,fb) => handleGrade(a.id, m, fb)}
              onDelete={() => { remove(a.id); toast.info('Deleted', a.title); }}
            />
          ) : (
            <StudentAssignmentCard
              key={a.id}
              a={a}
              onSubmit={() => setSubmitFor(a)}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddModal
          teacherName={user?.name ?? 'Teacher'}
          onClose={() => setShowAdd(false)}
          onAdd={add}
        />
      )}
      {submitFor && (
        <SubmitModal
          a={submitFor}
          onClose={() => setSubmitFor(null)}
          onSubmit={(file, note) => handleSubmit(submitFor, file, note)}
        />
      )}
    </div>
  );
}
