'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useAuthStore, DEMO_USERS } from '@/store';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const schema = z.object({ email: z.string().email('Invalid email'), password: z.string().min(6, 'Min 6 chars') });
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [tab, setTab] = useState<'student'|'teacher'>('student');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      // Try API first, fall back to demo users
      let user: any = null; let token = '';
      try {
        const res = await authAPI.login(data.email, data.password);
        user = res.data.user; token = res.data.access_token;
      } catch {
        // Demo fallback
        const all = [...DEMO_USERS.students, ...DEMO_USERS.teachers];
        const found = all.find(u => u.email === data.email && u.password === data.password);
        if (!found) throw new Error('Invalid credentials');
        user = found; token = `demo-token-${found.id}-${Date.now()}`;
      }
      setAuth(user, token);
      toast.success(`Welcome, ${user.name}! 👋`);
      router.push(user.role === 'teacher' ? '/teacher' : '/student');
    } catch (e: any) {
      toast.error(e.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const fillDemo = (type: 'student'|'teacher') => {
    const u = type === 'student' ? DEMO_USERS.students[0] : DEMO_USERS.teachers[0];
    setValue('email', u.email); setValue('password', u.password); setTab(type);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md anim-fade-up">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 mb-4 text-3xl">🎓</div>
          <h1 className="font-display text-3xl font-bold text-gradient mb-2">EduPredict v2</h1>
          <p className="text-slate-400 text-sm">AI-Powered Student Intelligence Platform</p>
          <div className="flex flex-wrap gap-1.5 justify-center mt-3">
            {['Next.js','TypeScript','FastAPI','Socket.IO','PostgreSQL'].map(t => (
              <span key={t} className="badge bg-slate-800 text-slate-400 font-mono text-[10px]">{t}</span>
            ))}
          </div>
        </div>

        {/* Tab toggle */}
        <div className="flex bg-slate-900 rounded-2xl p-1.5 mb-6 border border-slate-800">
          {(['student','teacher'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setValue('email',''); setValue('password',''); }}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${tab===t ? (t==='student'?'bg-indigo-500 text-white shadow-lg':'bg-emerald-500 text-white shadow-lg') : 'text-slate-400 hover:text-slate-200'}`}>
              {t === 'student' ? '🎓 Student' : '👨‍🏫 Teacher'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">Email</label>
            <input {...register('email')} type="email" className="input"
              placeholder={tab === 'student' ? 'priya@edu.in' : 'rajesh@faculty.in'} />
            {errors.email && <p className="text-rose-400 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">Password</label>
            <input {...register('password')} type="password" className="input" placeholder="••••••••" />
            {errors.password && <p className="text-rose-400 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={loading}
            className={`w-full btn ${tab==='student'?'btn-primary':'btn bg-emerald-500 hover:bg-emerald-600 text-white'} flex items-center justify-center gap-2`}>
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Signing in...</> : `Sign in as ${tab.charAt(0).toUpperCase()+tab.slice(1)}`}
          </button>
        </form>

        {/* Quick fill */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button onClick={() => fillDemo('student')} className="btn-ghost text-xs py-2 font-mono">Demo Student →</button>
          <button onClick={() => fillDemo('teacher')} className="btn-ghost text-xs py-2 font-mono">Demo Teacher →</button>
        </div>

        {/* Demo accounts */}
        <div className="card bg-slate-900/50 p-4">
          <p className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-3">Demo Accounts</p>
          <div className="space-y-1.5">
            {[...DEMO_USERS.students.slice(0,3), ...DEMO_USERS.teachers.slice(0,2)].map(u => (
              <button key={u.id} onClick={() => { setValue('email',u.email); setValue('password',u.password); setTab(u.role as any); }}
                className="w-full flex justify-between items-center px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-xs group">
                <span className="text-slate-300 group-hover:text-white">{u.role==='student'?'🎓':'👨‍🏫'} {u.name}</span>
                <span className="text-slate-500 font-mono">{u.email}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-600 mt-2 font-mono">pwd: student123 / teacher123</p>
        </div>
      </div>
    </div>
  );
}
