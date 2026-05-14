import { useState } from 'react';
import { useAuthStore, usePointsStore } from '../hooks';
import { DEMO_USERS, toast } from '../store';

const API = 'http://localhost:5000';

interface PredictResult {
  grade: string; label: string; score: number; color: string;
  avgSimilar: number | null; similarCount: number;
  tips: { factor: string; tip: string }[];
  dataset_size: number;
}

export default function Predictor() {
  const { user, role } = useAuthStore();
  const { award } = usePointsStore();
  const studentUser = DEMO_USERS.students.find(s => s.id === user?.id);

  const [form, setForm] = useState({
    hours_studied:        6,
    attendance:           studentUser?.cgpa ? Math.round(studentUser.cgpa * 10) : 80,
    sleep_hours:          7,
    previous_scores:      studentUser?.cgpa ? Math.round(studentUser.cgpa * 10) : 70,
    tutoring_sessions:    1,
    physical_activity:    3,
    motivation_level:     'Medium',
    parental_involvement: 'Medium',
    access_to_resources:  'Medium',
    internet_access:      'Yes',
    extracurricular:      'No',
  });
  const [result, setResult] = useState<PredictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const predict = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setResult(data);
      setSubmitted(true);
      if (!submitted && user && role === 'student') {
        award(user.id, 10, 'predictor', '🔮', 'Ran performance predictor', 'system', 'system');
        toast.achievement('10 points earned! 🔮', 'Thanks for checking your performance prediction.');
      }
    } catch {
      toast.error('Connection error', 'Make sure the backend is running on port 5000');
    }
    setLoading(false);
  };

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'JetBrains Mono',monospace" }}>{label}</label>
      {children}
    </div>
  );

  const SliderRow = ({ label, field, min, max, unit }: { label: string; field: keyof typeof form; min: number; max: number; unit?: string }) => (
    <Row label={label}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input type="range" min={min} max={max} value={form[field] as number}
          onChange={e => set(field, Number(e.target.value))}
          style={{ flex: 1, accentColor: '#6366f1' }} />
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: '#a5b4fc', minWidth: 40, textAlign: 'right' }}>
          {form[field]}{unit || ''}
        </span>
      </div>
    </Row>
  );

  const SelectRow = ({ label, field, options }: { label: string; field: keyof typeof form; options: string[] }) => (
    <Row label={label}>
      <div style={{ display: 'flex', gap: 6 }}>
        {options.map(opt => (
          <button key={opt} onClick={() => set(field, opt)}
            style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: 12, transition: 'all .15s',
              background: form[field] === opt ? 'rgba(99,102,241,0.25)' : 'rgba(30,41,59,0.6)',
              color: form[field] === opt ? '#a5b4fc' : '#64748b',
              boxShadow: form[field] === opt ? '0 0 0 1px rgba(99,102,241,0.4)' : 'none',
            }}>
            {opt}
          </button>
        ))}
      </div>
    </Row>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>🔮 Performance Predictor</div>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          Powered by <span style={{ color: '#a5b4fc' }}>real ML regression</span> trained on {result?.dataset_size?.toLocaleString() ?? '6,607'} student records from the StudentPerformanceFactors dataset.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: 20 }}>
        {/* Input form */}
        <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 16, padding: 24 }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 20 }}>📋 Your Inputs</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <SliderRow label="Hours Studied / Day"        field="hours_studied"        min={0} max={12}  unit="h" />
            <SliderRow label="Attendance %"               field="attendance"            min={40} max={100} unit="%" />
            <SliderRow label="Sleep Hours / Night"        field="sleep_hours"           min={4} max={10}  unit="h" />
            <SliderRow label="Previous Exam Score"        field="previous_scores"       min={0} max={100} />
            <SliderRow label="Tutoring Sessions / Week"   field="tutoring_sessions"     min={0} max={8} />
            <SliderRow label="Physical Activity (hrs/wk)" field="physical_activity"     min={0} max={6} />
            <SelectRow label="Motivation Level"           field="motivation_level"      options={['Low','Medium','High']} />
            <SelectRow label="Parental Involvement"       field="parental_involvement"  options={['Low','Medium','High']} />
            <SelectRow label="Access to Resources"        field="access_to_resources"   options={['Low','Medium','High']} />
            <SelectRow label="Internet Access"            field="internet_access"       options={['Yes','No']} />
            <SelectRow label="Extracurricular Activities" field="extracurricular"       options={['Yes','No']} />
          </div>
          <button onClick={predict} disabled={loading}
            style={{ width: '100%', marginTop: 24, padding: '13px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15, border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'all .18s' }}>
            {loading ? '⏳ Predicting…' : '🔮 Predict My Score'}
          </button>
        </div>

        {/* Result panel */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Score card */}
            <div style={{ background: 'rgba(15,23,42,0.88)', border: `1px solid ${result.color}40`, borderRadius: 16, padding: 28, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: result.color, borderRadius: '16px 16px 0 0' }} />
              <div style={{ fontSize: 56, fontWeight: 900, color: result.color, fontFamily: "'Outfit',sans-serif", lineHeight: 1, marginBottom: 6, letterSpacing: '-0.03em' }}>{result.score}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12, fontFamily: "'JetBrains Mono',monospace" }}>predicted exam score</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${result.color}18`, border: `1px solid ${result.color}40`, borderRadius: 10, padding: '6px 18px' }}>
                <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, color: result.color, fontSize: 20 }}>{result.grade}</span>
                <span style={{ color: result.color, fontWeight: 600 }}>— {result.label}</span>
              </div>
              {result.avgSimilar !== null && (
                <div style={{ marginTop: 14, fontSize: 13, color: '#475569' }}>
                  Similar students in dataset averaged <span style={{ color: '#a5b4fc', fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{result.avgSimilar.toFixed(1)}</span>
                  <span style={{ color: '#334155' }}>  ({result.similarCount} matched)</span>
                </div>
              )}
            </div>

            {/* Tips */}
            <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 14, color: '#fbbf24' }}>💡 Improvement Tips (from dataset)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {result.tips.map((tip, i) => (
                  <div key={i} style={{ background: 'rgba(30,41,59,0.55)', border: '1px solid rgba(148,163,184,0.06)', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#a5b4fc', marginBottom: 3, fontFamily: "'Outfit',sans-serif" }}>{tip.factor}</div>
                    <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{tip.tip}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 14 }}>📊 Score Breakdown</div>
              {[
                { label: 'Previous Scores (35%)', val: Math.round(form.previous_scores * 0.35), max: 35, color: '#10b981' },
                { label: 'Attendance (20%)',       val: Math.round((form.attendance / 100) * 20), max: 20, color: '#6366f1' },
                { label: 'Hours Studied (15%)',    val: Math.round((form.hours_studied / 12) * 15), max: 15, color: '#38bdf8' },
                { label: 'Tutoring (10%)',         val: Math.round((form.tutoring_sessions / 8) * 10), max: 10, color: '#fbbf24' },
                { label: 'Sleep (8%)',             val: Math.round((form.sleep_hours / 10) * 8), max: 8, color: '#8b5cf6' },
                { label: 'Other factors (12%)',    val: result.score - Math.round(form.previous_scores * 0.35) - Math.round((form.attendance / 100) * 20) - Math.round((form.hours_studied / 12) * 15) - Math.round((form.tutoring_sessions / 8) * 10) - Math.round((form.sleep_hours / 10) * 8), max: 12, color: '#fb923c' },
              ].map(row => (
                <div key={row.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: '#64748b' }}>{row.label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: row.color, fontWeight: 700 }}>{Math.max(0, row.val)}/{row.max}</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(148,163,184,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (Math.max(0, row.val) / row.max) * 100)}%`, background: row.color, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
