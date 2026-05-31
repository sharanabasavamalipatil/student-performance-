import { useState } from 'react';
import { DEMO_USERS, ACTIVITY_RULES, getTier, initials, avatarColor, notifCenterStore, toast } from '../store';
import { useAuthStore, usePointsStore } from '../hooks';

export default function AwardPoints() {
  const { user } = useAuthStore();
  const { award, addNotif, getPoints } = usePointsStore();

  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [customPoints, setCustomPoints] = useState<number>(0);
  const [note, setNote] = useState('');
  const [success, setSuccess] = useState('');

  const activity = ACTIVITY_RULES.find(a => a.id === selectedActivity);
  const pts = activity ? (activity.points || customPoints) : 0;

  const handleAward = () => {
    if (!selectedStudent || !selectedActivity || !user) return;
    const student = DEMO_USERS.students.find(s => s.id === selectedStudent);
    if (!student) return;

    const currentPts = getPoints(selectedStudent);
    const newTotal = currentPts + pts;
    const entry = {
      id: `${Date.now()}`,
      activity_id: selectedActivity,
      icon: activity!.icon,
      label: activity!.label,
      category: activity!.category,
      points_earned: pts,
      total_after: newTotal,
      note,
      awarded_by: user.name,
      teacher_id: user.id,
      date: new Date().toISOString(),
    };
    award(selectedStudent, entry, newTotal);
    notifCenterStore.add(selectedStudent, {
      type: 'points',
      icon: activity!.icon,
      title: `+${pts} Points Awarded!`,
      message: `${user!.name} awarded you ${pts} points for: ${activity!.label}${note ? ` — "${note}"` : ''}`,
      read: false,
      forRole: 'student',
      userId: selectedStudent,
      action: { label: 'View My Points', page: 'points' },
    });
    addNotif(selectedStudent, {
      id: `n-${Date.now()}`,
      type: 'points',
      title: `+${pts} Points Awarded!`,
      message: `${user.name} awarded you ${pts} points for "${activity!.label}". ${note ? `Note: ${note}` : ''}`,
      timestamp: new Date().toISOString(),
      read: false,
      icon: activity!.icon,
    });
    setSuccess(`✅ Awarded ${pts} points to ${student.name}!`);
    setNote('');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}>
      <div className="anim-fade-up">
        <h1 className="text-2xl font-bold mb-1">🏅 Award Points</h1>
        <p className="text-slate-400 text-sm">Recognize student achievements with activity points</p>
      </div>

      {success && (
        <div className="anim-scale-in rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}>
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-4 anim-fade-up">
          <h2 className="font-bold text-sm">Award Activity</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Select Student</label>
            <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="input">
              <option value="">Choose a student…</option>
              {DEMO_USERS.students.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.branch})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Activity Type</label>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {ACTIVITY_RULES.map(a => (
                <button key={a.id} onClick={() => setSelectedActivity(a.id)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-all"
                  style={selectedActivity === a.id
                    ? { background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc' }
                    : { background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(148,163,184,0.08)', color: '#94a3b8' }
                  }>
                  <span>{a.icon}</span>
                  <div>
                    <div className="text-xs font-semibold leading-tight">{a.label}</div>
                    {a.points > 0 && <div className="text-[10px] text-emerald-400">+{a.points} pts</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {activity && (activity.points === 0) && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Custom Points</label>
              <input type="number" value={customPoints} onChange={e => setCustomPoints(parseInt(e.target.value) || 0)}
                className="input" min={0} max={100} />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Note (optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="input resize-none" placeholder="e.g. Won 2nd place at HackFest 2024" />
          </div>

          <button
            onClick={handleAward}
            disabled={!selectedStudent || !selectedActivity || pts === 0}
            className="btn-primary w-full py-3 text-sm disabled:opacity-50">
            Award {pts} Points →
          </button>
        </div>

        <div className="card anim-fade-up anim-delay-1">
          <h2 className="font-bold text-sm mb-4">Student Points Overview</h2>
          <div className="space-y-2">
            {DEMO_USERS.students.map(s => {
              const pts = getPoints(s.id);
              const tier = getTier(pts);
              const col = avatarColor(s.name);
              const isSelected = selectedStudent === s.id;
              return (
                <button key={s.id} onClick={() => setSelectedStudent(s.id)}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all text-left"
                  style={isSelected
                    ? { background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }
                    : { background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(148,163,184,0.06)' }
                  }>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: `${col}22`, color: col }}>
                    {initials(s.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-100">{s.name}</div>
                    <div className="text-xs text-slate-500">Sem {s.semester} · {s.branch.split(' ')[0]}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm" style={{ color: tier.color }}>{pts}</div>
                    <div className="text-[10px]" style={{ color: tier.color }}>{tier.tier}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
