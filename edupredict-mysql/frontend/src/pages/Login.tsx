import { useState } from 'react';
import { useAuthStore } from '../hooks';

interface Props { onLogin: () => void; }

export default function Login({ onLogin }: Props) {
  const { setAuth } = useAuthStore();
  const [tab,      setTab]      = useState<'student' | 'teacher'>('student');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    setError(''); setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid email or password. Please try again.');
        setLoading(false); return;
      }

      setAuth(data.user, `token-${data.user.id}-${Date.now()}`);
      onLogin();
    } catch (_) {
      setError('Cannot connect to server. Make sure the backend is running on port 5000.');
    }
    setLoading(false);
  };

  const tabColor = tab === 'student' ? '#6366f1' : '#10b981';

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, #020617 60%)' }}>
      <div className="w-full max-w-md anim-fade-up">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5 text-4xl"
            style={{ background:'rgba(99,102,241,0.15)', border:'1.5px solid rgba(99,102,241,0.3)' }}>
            🎓
          </div>
          <h1 className="text-4xl font-extrabold mb-2"
            style={{ background:'linear-gradient(135deg,#6366f1,#a78bfa,#38bdf8)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            EduPredict
          </h1>
          <p className="text-slate-400 text-sm">AI-Powered Student Intelligence Platform</p>
          <p className="text-slate-600 text-xs mt-1">RYMEC College · Powered by Machine Learning</p>
        </div>

        {/* Role tab */}
        <div className="flex rounded-2xl p-1.5 mb-6 gap-1"
          style={{ background:'rgba(15,23,42,0.9)', border:'1px solid rgba(30,41,59,0.8)' }}>
          {([
            { key:'student', label:'🎓 Student',  color:'#6366f1' },
            { key:'teacher', label:'🧑‍🏫 Trainee', color:'#10b981' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setError(''); }}
              className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
              style={tab === t.key
                ? { background: t.color, color:'white', boxShadow:`0 4px 14px ${t.color}40` }
                : { color:'#64748b' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Email Address
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="input text-sm" placeholder="your@email.com"
              required autoComplete="email" autoFocus />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Password
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="input text-sm" placeholder="••••••••"
              required autoComplete="current-password" />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-sm"
              style={{ background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.25)', color:'#fca5a5' }}>
              <span className="flex-shrink-0 mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="btn-primary w-full py-3.5 text-sm font-bold disabled:opacity-60 transition-all"
            style={{ background:tabColor, boxShadow:!loading?`0 4px 20px ${tabColor}50`:'' }}>
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              : `Sign In as ${tab === 'student' ? 'Student' : 'Trainee'} →`}
          </button>
        </form>

        {/* Server status hint */}
        <div className="mt-5 text-center">
          <p className="text-xs text-slate-600">
            Make sure the backend is running:
            <code className="ml-1.5 px-2 py-0.5 rounded-md text-slate-400"
              style={{ background:'rgba(30,41,59,0.8)', fontFamily:'monospace' }}>
              node server.js
            </code>
          </p>
        </div>

        {/* Bottom security note */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="text-[10px] text-slate-700">🔒</span>
          <span className="text-[10px] text-slate-700">Secured with bcrypt · Login activity is logged</span>
        </div>

      </div>
    </div>
  );
}
