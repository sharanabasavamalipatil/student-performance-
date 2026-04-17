import { useState } from 'react';
import { DEMO_USERS } from '../store';
import { useAuthStore } from '../hooks';

interface Props { onLogin: () => void; }

export default function Login({ onLogin }: Props) {
  const { setAuth } = useAuthStore();
  const [tab, setTab]           = useState<'student' | 'teacher'>('student');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // ✅ FIX: fill the SPECIFIC user's credentials, not always [0]
  const fillUser = (u: { email: string; password: string; role: string }) => {
    setEmail(u.email);
    setPassword(u.password);
    setTab(u.role as 'student' | 'teacher');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    const all = [...DEMO_USERS.students, ...DEMO_USERS.teachers] as any[];
    const found = all.find(u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password);
    if (!found) {
      setError('Invalid credentials. Click any name below to autofill.');
      setLoading(false);
      return;
    }
    setAuth(found, `demo-token-${found.id}`);
    onLogin();
    setLoading(false);
  };

  const students = DEMO_USERS.students;
  const teachers = DEMO_USERS.teachers;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#020617' }}>
      <div className="w-full max-w-lg anim-fade-up">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 text-3xl"
            style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}>🎓</div>
          <h1 className="text-3xl font-bold mb-2"
            style={{ background: 'linear-gradient(135deg,#6366f1,#a78bfa,#38bdf8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            EduPredict
          </h1>
          <p className="text-slate-400 text-sm">AI-Powered Student Intelligence Platform</p>
        </div>

        {/* Tab toggle */}
        <div className="flex rounded-2xl p-1.5 mb-5 gap-1" style={{ background:'rgba(15,23,42,0.9)', border:'1px solid rgba(30,41,59,0.8)' }}>
          {(['student','teacher'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); }}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={tab === t
                ? { background: t === 'student' ? '#6366f1' : '#10b981', color:'white' }
                : { color:'#94a3b8' }
              }>
              {t === 'student' ? '🎓 Student' : '👨‍🏫 Teacher'}
            </button>
          ))}
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="card space-y-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="input" placeholder="your@email.com" required autoComplete="email" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="input" placeholder="••••••••" required />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-rose-400 text-sm px-3 py-2 rounded-xl"
              style={{ background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.2)' }}>
              <span>⚠️</span> {error}
            </div>
          )}
          <button type="submit" disabled={loading}
            className="btn-primary w-full py-3 text-sm disabled:opacity-60 font-semibold">
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        {/* Demo accounts — ALL users, each with their own credentials */}
        <div className="card space-y-4">
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Demo Accounts</p>
            <p className="text-[10px] text-slate-600 mt-0.5">Click any card to auto-fill credentials</p>
          </div>

          {/* Students */}
          <div>
            <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider mb-2">🎓 Students — password: student123</p>
            <div className="grid grid-cols-2 gap-2">
              {students.map(u => (
                <button key={u.id} onClick={() => fillUser(u)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all group"
                  style={{
                    background: email === u.email ? 'rgba(99,102,241,0.15)' : 'rgba(30,41,59,0.5)',
                    border: email === u.email ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(148,163,184,0.08)',
                  }}
                  onMouseEnter={e => { if(email !== u.email)(e.currentTarget as HTMLElement).style.borderColor='rgba(99,102,241,0.3)'; }}
                  onMouseLeave={e => { if(email !== u.email)(e.currentTarget as HTMLElement).style.borderColor='rgba(148,163,184,0.08)'; }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background:'rgba(99,102,241,0.2)', color:'#a5b4fc' }}>
                    {u.name.split(' ').map((w:string) => w[0]).join('').slice(0,2)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-200 truncate">{u.name.split(' ')[0]}</div>
                    <div className="text-[10px] text-slate-500 truncate">{u.branch?.split(' ')[0]} · Sem {u.semester}</div>
                  </div>
                  {email === u.email && <span className="ml-auto text-indigo-400 text-xs">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Teachers */}
          <div>
            <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-2">👨‍🏫 Teachers — password: teacher123</p>
            <div className="grid grid-cols-3 gap-2">
              {teachers.map(u => (
                <button key={u.id} onClick={() => fillUser(u)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
                  style={{
                    background: email === u.email ? 'rgba(16,185,129,0.15)' : 'rgba(30,41,59,0.5)',
                    border: email === u.email ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(148,163,184,0.08)',
                  }}
                  onMouseEnter={e => { if(email !== u.email)(e.currentTarget as HTMLElement).style.borderColor='rgba(16,185,129,0.3)'; }}
                  onMouseLeave={e => { if(email !== u.email)(e.currentTarget as HTMLElement).style.borderColor='rgba(148,163,184,0.08)'; }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background:'rgba(16,185,129,0.2)', color:'#34d399' }}>
                    {u.name.split(' ').map((w:string) => w[0]).join('').slice(0,2)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-200 truncate">{u.name.split(' ')[1]}</div>
                    <div className="text-[10px] text-slate-500 truncate">{u.department}</div>
                  </div>
                  {email === u.email && <span className="ml-auto text-emerald-400 text-xs">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
