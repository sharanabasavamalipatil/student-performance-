import { useState } from 'react';
import { useAuthStore, useAssignments } from '../hooks';
import { DEMO_USERS, Assignment, AssignmentPriority, AssignmentStatus, toast } from '../store';

// ── helpers ───────────────────────────────────────────────────────────────────
const PRIORITY_STYLE: Record<AssignmentPriority, { color: string; bg: string; label: string }> = {
  high:   { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',   label: '🔴 High'   },
  medium: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  label: '🟡 Medium' },
  low:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  label: '🟢 Low'    },
};
const STATUS_STYLE: Record<AssignmentStatus, { color: string; bg: string; icon: string }> = {
  pending:     { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: '⏳' },
  'in-progress':{ color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  icon: '▶'  },
  completed:   { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: '✅'  },
};

function daysUntil(dueDate: string, dueTime: string): number {
  return (new Date(`${dueDate}T${dueTime}`).getTime() - Date.now()) / 86400000;
}
function formatDue(dueDate: string, dueTime: string): string {
  const days = daysUntil(dueDate, dueTime);
  if (days < 0) return `Overdue by ${Math.abs(Math.ceil(days))}d`;
  if (days < 1) return `Due in ${Math.round(days * 24)}h`;
  if (days < 2) return 'Due tomorrow';
  return `Due in ${Math.ceil(days)} days`;
}
function formatDate(dueDate: string, dueTime: string): string {
  return new Date(`${dueDate}T${dueTime}`).toLocaleDateString('en', { weekday:'short', month:'short', day:'numeric' }) + ` at ${dueTime}`;
}

// ── Add Assignment Modal ───────────────────────────────────────────────────────
function AddModal({ userId, branch, onClose, onAdd }: { userId: string; branch: string; onClose: () => void; onAdd: (a: Omit<Assignment,'id'|'createdAt'>) => void }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    title: '', subject: '', description: '', dueDate: today, dueTime: '23:59',
    priority: 'medium' as AssignmentPriority, tags: '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.title.trim() || !form.subject.trim() || !form.dueDate) {
      toast.error('Missing fields', 'Title, subject and due date are required'); return;
    }
    onAdd({ userId, title: form.title.trim(), subject: form.subject.trim(), description: form.description.trim(),
      dueDate: form.dueDate, dueTime: form.dueTime, priority: form.priority, status: 'pending',
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean), });
    toast.success('Assignment added!', form.title);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(2,6,23,0.9)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background:'rgba(15,23,42,0.98)', border:'1px solid rgba(148,163,184,0.15)', animation:'scaleIn .2s ease-out', backdropFilter:'blur(20px)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">📝 Add Assignment</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-2xl">×</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. DSA Assignment – Binary Trees" className="input text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Subject *</label>
              <input value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="e.g. Data Structures" className="input text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} className="input text-sm">
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Due Date *</label>
              <input type="date" value={form.dueDate} min={today} onChange={e => set('dueDate', e.target.value)} className="input text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Due Time</label>
              <input type="time" value={form.dueTime} onChange={e => set('dueTime', e.target.value)} className="input text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="What needs to be done?" className="input text-sm resize-none" rows={2} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Tags (comma separated)</label>
            <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="e.g. Code, Report, Lab" className="input text-sm" />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1 text-sm py-2.5">Cancel</button>
          <button onClick={submit} className="btn-primary flex-1 text-sm py-2.5">Add Assignment</button>
        </div>
      </div>
    </div>
  );
}

// ── Assignment Card ───────────────────────────────────────────────────────────
function AssignmentCard({ a, onMarkDone, onDelete, onStatusChange }: {
  a: Assignment;
  onMarkDone: () => void;
  onDelete: () => void;
  onStatusChange: (s: AssignmentStatus) => void;
}) {
  const days = daysUntil(a.dueDate, a.dueTime);
  const isOverdue = days < 0 && a.status !== 'completed';
  const isDueSoon = days >= 0 && days <= 2 && a.status !== 'completed';
  const p = PRIORITY_STYLE[a.priority];
  const s = STATUS_STYLE[a.status];

  return (
    <div className="card group transition-all hover:-translate-y-0.5 flex flex-col gap-3"
      style={{ border: isOverdue ? '1px solid rgba(244,63,94,0.35)' : isDueSoon ? '1px solid rgba(251,191,36,0.3)' : '' }}>

      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: p.bg, color: p.color }}>{p.label}</span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.icon} {a.status.replace('-',' ')}</span>
          {isOverdue && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background:'rgba(244,63,94,0.2)', color:'#f87171' }}>⚠️ OVERDUE</span>}
          {isDueSoon && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full animate-pulse" style={{ background:'rgba(251,191,36,0.2)', color:'#fbbf24' }}>⏰ DUE SOON</span>}
        </div>
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 text-xl leading-none transition-all flex-shrink-0">×</button>
      </div>

      {/* Title + subject */}
      <div>
        <h3 className={`font-semibold text-sm leading-snug mb-1 ${a.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-100'}`}>{a.title}</h3>
        <p className="text-xs text-indigo-400 font-medium">{a.subject}</p>
        {a.description && <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{a.description}</p>}
      </div>

      {/* Due date */}
      <div className="flex items-center gap-2">
        <span className="text-xl">{isOverdue ? '🚨' : isDueSoon ? '⏰' : '📅'}</span>
        <div>
          <div className="text-xs font-semibold" style={{ color: isOverdue ? '#f87171' : isDueSoon ? '#fbbf24' : '#94a3b8' }}>
            {formatDue(a.dueDate, a.dueTime)}
          </div>
          <div className="text-[10px] text-slate-600">{formatDate(a.dueDate, a.dueTime)}</div>
        </div>
      </div>

      {/* Countdown bar */}
      {a.status !== 'completed' && (
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.08)' }}>
          <div className="h-full rounded-full transition-all"
            style={{
              width: `${Math.max(0, Math.min(100, 100 - (days / 14) * 100))}%`,
              background: isOverdue ? '#f43f5e' : isDueSoon ? '#fbbf24' : '#6366f1',
            }} />
        </div>
      )}

      {/* Tags */}
      {a.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {a.tags.map(t => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background:'rgba(30,41,59,0.8)', color:'#64748b' }}>{t}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      {a.status !== 'completed' && (
        <div className="flex gap-2 mt-auto pt-1">
          {a.status === 'pending' && (
            <button onClick={() => onStatusChange('in-progress')} className="btn-ghost text-xs py-1.5 px-3 flex-1" style={{ color:'#fbbf24' }}>▶ Start</button>
          )}
          <button onClick={onMarkDone} className="btn-primary text-xs py-1.5 flex-1">✅ Mark Done</button>
        </div>
      )}
      {a.status === 'completed' && a.completedAt && (
        <div className="text-[10px] text-slate-600">Completed {new Date(a.completedAt).toLocaleDateString('en',{month:'short',day:'numeric'})}</div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Assignments() {
  const { user } = useAuthStore();
  const studentUser = DEMO_USERS.students.find(s => s.id === user?.id);
  const branch = studentUser?.branch ?? 'Computer Science';
  const { assignments, overdue, dueSoon, pending, inProgress, completed, add, update, remove, markDone } = useAssignments(user?.id ?? '', branch);

  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<'all'|'pending'|'in-progress'|'completed'|'overdue'>('all');
  const [sortBy, setSortBy] = useState<'due'|'priority'|'subject'>('due');
  const [search, setSearch] = useState('');

  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

  const filtered = assignments
    .filter(a => {
      if (filter === 'overdue') return daysUntil(a.dueDate, a.dueTime) < 0 && a.status !== 'completed';
      if (filter === 'all') return true;
      return a.status === filter;
    })
    .filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.subject.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'due') return new Date(`${a.dueDate}T${a.dueTime}`).getTime() - new Date(`${b.dueDate}T${b.dueTime}`).getTime();
      if (sortBy === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      return a.subject.localeCompare(b.subject);
    });

  const handleMarkDone = (a: Assignment) => {
    markDone(a.id);
    toast.achievement('Assignment Completed! 🎉', `"${a.title}" marked as done`);
  };

  const filterBtns = [
    { id: 'all',         label: `All (${assignments.length})`       },
    { id: 'overdue',     label: `🚨 Overdue (${overdue.length})`    },
    { id: 'pending',     label: `⏳ Pending (${pending.length})`    },
    { id: 'in-progress', label: `▶ In Progress (${inProgress.length})` },
    { id: 'completed',   label: `✅ Done (${completed.length})`     },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}>
      <style>{`@keyframes scaleIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}`}</style>

      {/* Header */}
      <div className="anim-fade-up flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">📝 Assignment Tracker</h1>
          <p className="text-slate-400 text-sm">Track deadlines, manage priorities, never miss a submission</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2 flex-shrink-0">
          <span className="text-lg">+</span> Add Assignment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 anim-fade-up anim-delay-1">
        {[
          { label:'Overdue',     value:overdue.length,     color:'#f43f5e', icon:'🚨', urgent: overdue.length > 0 },
          { label:'Due Soon',    value:dueSoon.length,     color:'#fbbf24', icon:'⏰', urgent: dueSoon.length > 0 },
          { label:'In Progress', value:inProgress.length,  color:'#38bdf8', icon:'▶',  urgent: false },
          { label:'Completed',   value:completed.length,   color:'#10b981', icon:'✅', urgent: false },
        ].map(s => (
          <div key={s.label} className="card py-3 flex items-center gap-3 transition-all"
            style={s.urgent && s.value > 0 ? { border:`1px solid ${s.color}40` } : {}}>
            <span className="text-2xl">{s.icon}</span>
            <div>
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="rounded-xl px-4 py-3 flex items-start gap-3 anim-fade-up" style={{ background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.3)' }}>
          <span className="text-xl">🚨</span>
          <div>
            <div className="font-semibold text-sm text-rose-300">You have {overdue.length} overdue assignment{overdue.length > 1 ? 's' : ''}!</div>
            <div className="text-xs text-slate-400 mt-0.5">{overdue.map(a => a.title).join(' · ')}</div>
          </div>
        </div>
      )}

      {/* Due soon alert */}
      {dueSoon.length > 0 && overdue.length === 0 && (
        <div className="rounded-xl px-4 py-3 flex items-start gap-3 anim-fade-up" style={{ background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.25)' }}>
          <span className="text-xl">⏰</span>
          <div>
            <div className="font-semibold text-sm text-yellow-300">{dueSoon.length} assignment{dueSoon.length > 1 ? 's' : ''} due within 48 hours</div>
            <div className="text-xs text-slate-400 mt-0.5">{dueSoon.map(a => `${a.title} (${formatDue(a.dueDate, a.dueTime)})`).join(' · ')}</div>
          </div>
        </div>
      )}

      {/* Search + Sort + Filter */}
      <div className="space-y-2 anim-fade-up anim-delay-1">
        <div className="flex gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assignments…" className="input text-sm flex-1" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="input text-sm w-36">
            <option value="due">Sort: Due Date</option>
            <option value="priority">Sort: Priority</option>
            <option value="subject">Sort: Subject</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filterBtns.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id as any)}
              className="text-xs px-3 py-1.5 rounded-full transition-all"
              style={filter === f.id
                ? { background:'rgba(99,102,241,0.2)', color:'#a5b4fc', border:'1px solid rgba(99,102,241,0.4)' }
                : { background:'rgba(30,41,59,0.5)', color:'#64748b', border:'1px solid rgba(148,163,184,0.08)' }
              }>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-600 font-mono">{filtered.length} assignment{filtered.length !== 1 ? 's' : ''}</p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-14">
          <div className="text-5xl mb-3">🎉</div>
          <div className="font-semibold text-slate-300 mb-1">{filter === 'completed' ? 'No completed assignments yet' : filter === 'overdue' ? 'No overdue assignments!' : 'No assignments found'}</div>
          <div className="text-sm text-slate-500 mb-4">{filter === 'overdue' ? "You're all caught up! 🎊" : 'Add your first assignment to get started'}</div>
          {filter === 'all' && <button onClick={() => setShowAdd(true)} className="btn-primary text-sm px-6 py-2">+ Add Assignment</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 anim-fade-up anim-delay-2">
          {filtered.map(a => (
            <AssignmentCard
              key={a.id}
              a={a}
              onMarkDone={() => handleMarkDone(a)}
              onDelete={() => { remove(a.id); toast.info('Deleted', a.title); }}
              onStatusChange={s => update(a.id, { status: s })}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddModal
          userId={user?.id ?? ''}
          branch={branch}
          onClose={() => setShowAdd(false)}
          onAdd={add}
        />
      )}
    </div>
  );
}
