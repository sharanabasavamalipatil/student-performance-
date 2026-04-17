import { useState } from 'react';

const PERF_COLORS: Record<string, string> = {
  Excellent: '#10b981',
  Good: '#38bdf8',
  Average: '#fbbf24',
  'Below Average': '#fb923c',
  'At Risk': '#f43f5e',
};

const PERF_ICONS: Record<string, string> = {
  Excellent: '🏆', Good: '✅', Average: '📊', 'Below Average': '⚠️', 'At Risk': '🚨',
};

function predictPerf(data: {
  cgpa: number; attendance: number; study: number; sleep: number;
  stress: number; backlogs: number; progScore: number; mathScore: number;
}) {
  const { cgpa, attendance, study, stress, backlogs, progScore, mathScore } = data;
  const score =
    cgpa * 12 +
    (attendance / 100) * 20 +
    Math.min(study, 8) * 2 -
    stress * 3 -
    backlogs * 4 +
    (progScore / 100) * 15 +
    (mathScore / 100) * 10;

  if (score >= 100) return { label: 'Excellent', conf: 91, color: PERF_COLORS.Excellent };
  if (score >= 85)  return { label: 'Good',       conf: 85, color: PERF_COLORS.Good };
  if (score >= 65)  return { label: 'Average',    conf: 78, color: PERF_COLORS.Average };
  if (score >= 45)  return { label: 'Below Average', conf: 74, color: PERF_COLORS['Below Average'] };
  return                  { label: 'At Risk',     conf: 82, color: PERF_COLORS['At Risk'] };
}

interface Field { key: string; label: string; min: number; max: number; step: number; unit: string; }
const fields: Field[] = [
  { key: 'cgpa',       label: 'CGPA',                min: 0,  max: 10,  step: 0.1, unit: '/10' },
  { key: 'attendance', label: 'Attendance %',         min: 0,  max: 100, step: 1,   unit: '%'   },
  { key: 'study',      label: 'Study Hours/Day',      min: 0,  max: 16,  step: 0.5, unit: 'hrs' },
  { key: 'sleep',      label: 'Sleep Hours/Day',      min: 4,  max: 12,  step: 0.5, unit: 'hrs' },
  { key: 'stress',     label: 'Stress Level (1–5)',   min: 1,  max: 5,   step: 1,   unit: '/5'  },
  { key: 'backlogs',   label: 'Active Backlogs',      min: 0,  max: 10,  step: 1,   unit: ''    },
  { key: 'progScore',  label: 'Programming Score',    min: 0,  max: 100, step: 1,   unit: '/100'},
  { key: 'mathScore',  label: 'Math Score',           min: 0,  max: 100, step: 1,   unit: '/100'},
];

const defaultValues: Record<string, number> = {
  cgpa: 7.5, attendance: 80, study: 4, sleep: 7, stress: 2, backlogs: 0, progScore: 70, mathScore: 65,
};

export default function Predictor() {
  const [values, setValues] = useState<Record<string, number>>(defaultValues);
  const [result, setResult] = useState<ReturnType<typeof predictPerf> | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setResult(predictPerf(values as any));
    setLoading(false);
  };

  const PROBS: Record<string, number> = {
    Excellent: Math.min(100, Math.round(values.cgpa * 5 + (values.progScore + values.mathScore) / 10)),
    Good: Math.round(30 - values.stress * 2 + values.study * 2),
    Average: Math.round(20 + values.backlogs * 3),
    'Below Average': Math.round(10 + values.backlogs * 2 + values.stress),
    'At Risk': Math.max(0, Math.round(15 - values.cgpa * 2 + values.backlogs * 3)),
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}>
      <div className="anim-fade-up">
        <h1 className="text-2xl font-bold mb-1">🔮 Performance Predictor</h1>
        <p className="text-slate-400 text-sm">AI-powered prediction using your academic and wellness data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="card anim-fade-up space-y-4">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {['Random Forest', 'Gradient Boosting', 'MLP', 'Logistic Reg'].map(t => (
              <span key={t} className="badge font-mono text-[10px]" style={{ background: 'rgba(99,102,241,0.15)', color: '#a78bfa' }}>{t}</span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {fields.map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  {f.label}
                  <span className="ml-1 font-mono text-indigo-400">{values[f.key]}{f.unit}</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min={f.min} max={f.max} step={f.step}
                    value={values[f.key]}
                    onChange={e => setValues(v => ({ ...v, [f.key]: parseFloat(e.target.value) }))}
                    className="flex-1 accent-indigo-500"
                  />
                </div>
              </div>
            ))}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm disabled:opacity-60">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Running ML Models…
              </span>
            ) : '🔮 Predict Performance'}
          </button>
        </form>

        <div className="space-y-4 anim-fade-up anim-delay-1">
          {result ? (
            <>
              <div className="card text-center" style={{ borderColor: `${result.color}30`, border: `1px solid ${result.color}30` }}>
                <div className="text-5xl mb-3">{PERF_ICONS[result.label]}</div>
                <div className="text-3xl font-bold mb-2" style={{ color: result.color }}>{result.label}</div>
                <div className="text-slate-400 text-sm mb-3">
                  Confidence: <span className="text-white font-bold">{result.conf}%</span>
                </div>
                <span className="badge font-mono text-xs" style={{ background: `${result.color}20`, color: result.color }}>
                  Ensemble Model
                </span>
              </div>

              <div className="card">
                <h3 className="font-semibold text-sm mb-3">Probability Distribution</h3>
                <div className="space-y-2">
                  {Object.entries(PROBS).map(([label, pct]) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: PERF_COLORS[label] }}>{label}</span>
                        <span className="font-mono text-slate-400">{Math.max(0, pct)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.1)' }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: PERF_COLORS[label] }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold text-sm mb-3">Recommendations</h3>
                <div className="space-y-2 text-sm">
                  {result.label === 'At Risk' && <p className="text-rose-300">⚠️ Seek academic counseling immediately. Increase study hours.</p>}
                  {result.label === 'Below Average' && <p className="text-orange-300">📈 Focus on clearing backlogs. Join study groups.</p>}
                  {result.label === 'Average' && <p className="text-yellow-300">📚 Consistent study plan needed. Reduce stress through exercise.</p>}
                  {result.label === 'Good' && <p className="text-blue-300">✅ Great progress! Take on projects to reach Excellent.</p>}
                  {result.label === 'Excellent' && <p className="text-emerald-300">🏆 Outstanding! Consider research opportunities or internships.</p>}
                  {values.stress >= 4 && <p className="text-amber-300">😰 High stress detected. Practice mindfulness or yoga.</p>}
                  {values.sleep < 6 && <p className="text-purple-300">😴 Increase sleep to 7–8 hours for better retention.</p>}
                  {values.backlogs > 2 && <p className="text-rose-300">📖 Clear backlogs first — they hurt CGPA significantly.</p>}
                </div>
              </div>
            </>
          ) : (
            <div className="card h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center text-slate-500">
                <div className="text-5xl mb-4">🔮</div>
                <p className="font-semibold text-slate-400">Adjust the sliders</p>
                <p className="text-sm mt-1">and click Predict to see your results</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
