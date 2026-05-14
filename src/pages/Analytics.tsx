import { useEffect, useState } from 'react';
import { useAuthStore } from '../hooks';

interface Summary {
  total_students: number;
  avg_exam_score: number;
  avg_hours_studied: number;
  avg_attendance: number;
  avg_sleep_hours: number;
  avg_previous_scores: number;
  avg_tutoring_sessions: number;
  score_bands: Record<string, number>;
  score_histogram: { label: string; count: number }[];
  gender_dist: Record<string, number>;
  school_type_dist: Record<string, number>;
  motivation_level: Record<string, number>;
  parental_involvement: Record<string, number>;
  access_to_resources: Record<string, number>;
  teacher_quality: Record<string, number>;
  peer_influence: Record<string, number>;
  family_income: Record<string, number>;
  internet_access: Record<string, number>;
  extracurricular: Record<string, number>;
  learning_disabilities: Record<string, number>;
  correlations: Record<string, number>;
}
interface Factors {
  by_motivation: { group: string; avg_score: number; count: number }[];
  by_parental:   { group: string; avg_score: number; count: number }[];
  by_resources:  { group: string; avg_score: number; count: number }[];
  by_teacher:    { group: string; avg_score: number; count: number }[];
  by_peer:       { group: string; avg_score: number; count: number }[];
  by_income:     { group: string; avg_score: number; count: number }[];
  by_school:     { group: string; avg_score: number; count: number }[];
  by_internet:   { group: string; avg_score: number; count: number }[];
  by_extracurr:  { group: string; avg_score: number; count: number }[];
  by_gender:     { group: string; avg_score: number; count: number }[];
}

const API = 'http://localhost:5000';

function Bar({ value, max, color = '#6366f1', height = 20 }: { value: number; max: number; color?: string; height?: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ height, background: 'rgba(148,163,184,0.08)', borderRadius: 6, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 6, transition: 'width .7s cubic-bezier(.4,0,.2,1)', minWidth: pct > 0 ? 4 : 0 }} />
    </div>
  );
}

function StatCard({ label, value, sub, color = '#6366f1', icon }: { label: string; value: string | number; sub?: string; color?: string; icon: string }) {
  return (
    <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 14, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '14px 14px 0 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#475569' }}>{sub}</div>}
    </div>
  );
}

function GroupBar({ items, colorFn }: { items: { group: string; avg_score: number; count: number }[]; colorFn?: (g: string) => string }) {
  const maxScore = 100;
  const defaultColor = (g: string) => {
    if (g === 'High' || g === 'Positive' || g === 'Private' || g === 'Yes') return '#10b981';
    if (g === 'Medium' || g === 'Neutral') return '#6366f1';
    return '#f43f5e';
  };
  const getColor = colorFn ?? defaultColor;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map(item => (
        <div key={item.group}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
            <span style={{ fontWeight: 600 }}>{item.group}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", color: getColor(item.group) }}>{item.avg_score.toFixed(1)} avg · {item.count.toLocaleString()} students</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bar value={item.avg_score} max={maxScore} color={getColor(item.group)} height={14} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PieRow({ data, colors }: { data: Record<string, number>; colors: string[] }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const entries = Object.entries(data);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {entries.map(([k, v], i) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: colors[i % colors.length], flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#94a3b8', flex: 1 }}>{k}</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#e2e8f0' }}>{v.toLocaleString()}</span>
          <span style={{ fontSize: 11, color: '#475569', minWidth: 38, textAlign: 'right' }}>{total > 0 ? ((v / total) * 100).toFixed(1) : 0}%</span>
          <Bar value={v} max={total} color={colors[i % colors.length]} height={12} />
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const { role } = useAuthStore();
  const [summary, setSummary]  = useState<Summary | null>(null);
  const [factors, setFactors]  = useState<Factors | null>(null);
  const [loading, setLoading]  = useState(true);
  const [tab, setTab]          = useState<'overview' | 'factors' | 'correlations'>('overview');

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/analytics/summary`).then(r => r.json()),
      fetch(`${API}/api/analytics/factors`).then(r => r.json()),
    ]).then(([s, f]) => {
      setSummary(s);
      setFactors(f);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: '1.6rem', fontWeight: 800, marginBottom: 6 }}>📊 Analytics Dashboard</div>
        <p style={{ color: '#64748b', fontSize: 14 }}>Loading dataset from backend…</p>
      </div>
      <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 14, padding: 32, textAlign: 'center', color: '#475569' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div>Fetching 6,607 student records from <code style={{ background: 'rgba(99,102,241,0.1)', padding: '2px 6px', borderRadius: 4, color: '#a5b4fc' }}>StudentPerformanceFactors.csv</code></div>
        <div style={{ marginTop: 8, fontSize: 13 }}>Make sure the backend is running: <code style={{ color: '#34d399' }}>node server.js</code></div>
      </div>
    </div>
  );

  if (!summary) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: '1.6rem', fontWeight: 800 }}>📊 Analytics Dashboard</div>
      </div>
      <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 14, padding: 24, color: '#fb7185' }}>
        ⚠️ Could not connect to backend. Start it with <code>cd backend && node server.js</code>
      </div>
    </div>
  );

  const bandColors: Record<string, string> = {
    'Excellent (80-100)': '#10b981',
    'Good (65-79)':       '#6366f1',
    'Average (50-64)':    '#fbbf24',
    'At Risk (<50)':      '#f43f5e',
  };

  const corrColors = (v: number) => v >= 0.4 ? '#10b981' : v >= 0.2 ? '#6366f1' : v >= 0 ? '#fbbf24' : '#f43f5e';
  const corrLabels: Record<string, string> = {
    Hours_Studied: 'Hours Studied / day',
    Attendance: 'Attendance %',
    Sleep_Hours: 'Sleep Hours',
    Previous_Scores: 'Previous Scores',
    Tutoring_Sessions: 'Tutoring Sessions / week',
    Physical_Activity: 'Physical Activity (hrs/week)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>📊 Analytics Dashboard</div>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          Insights from <span style={{ color: '#a5b4fc', fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{summary.total_students.toLocaleString()}</span> real student records · StudentPerformanceFactors dataset
        </p>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }} className="anim-fade-up">
        <StatCard label="Total Students"    value={summary.total_students.toLocaleString()} icon="🎓" color="#6366f1" />
        <StatCard label="Avg Exam Score"    value={summary.avg_exam_score}   sub="out of 100" icon="📝" color="#10b981" />
        <StatCard label="Avg Study Hours"   value={summary.avg_hours_studied} sub="per day"   icon="📚" color="#38bdf8" />
        <StatCard label="Avg Attendance"    value={`${summary.avg_attendance}%`}              icon="📅" color="#fbbf24" />
        <StatCard label="Avg Sleep Hours"   value={summary.avg_sleep_hours}   sub="per night" icon="😴" color="#8b5cf6" />
        <StatCard label="Avg Previous Score"value={summary.avg_previous_scores}               icon="📋" color="#f43f5e" />
        <StatCard label="Avg Tutoring"      value={summary.avg_tutoring_sessions} sub="sessions/week" icon="👨‍🏫" color="#fb923c" />
        <StatCard label="Score Distribution"value={`${Object.values(summary.score_bands)[0].toLocaleString()} Excellent`} sub="80+ score" icon="🏆" color="#10b981" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, background: 'rgba(15,23,42,0.6)', borderRadius: 12, padding: 4, border: '1px solid rgba(148,163,184,0.08)' }}>
        {(['overview','factors','correlations'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: 13, transition: 'all .15s',
              background: tab === t ? 'rgba(99,102,241,0.18)' : 'transparent',
              color:      tab === t ? '#a5b4fc' : '#64748b',
            }}>
            {t === 'overview' ? '📊 Overview' : t === 'factors' ? '🔍 Factors' : '📈 Correlations'}
          </button>
        ))}
      </div>

      {/* TAB: Overview */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Score bands + histogram */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, marginBottom: 16, fontSize: 15 }}>🎯 Score Bands</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(summary.score_bands).map(([band, count]) => (
                  <div key={band}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: '#94a3b8', fontWeight: 500 }}>{band}</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", color: bandColors[band] || '#6366f1' }}>
                        {count.toLocaleString()} ({((count / summary.total_students) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <Bar value={count} max={summary.total_students} color={bandColors[band] || '#6366f1'} height={16} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, marginBottom: 16, fontSize: 15 }}>📊 Score Distribution</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {summary.score_histogram.map((bin, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: '#475569', fontFamily: "'JetBrains Mono',monospace", width: 60, flexShrink: 0 }}>{bin.label}</span>
                    <Bar value={bin.count} max={Math.max(...summary.score_histogram.map(b => b.count))} color="#6366f1" height={12} />
                    <span style={{ fontSize: 10, color: '#64748b', width: 40, textAlign: 'right', flexShrink: 0 }}>{bin.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Demographics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, marginBottom: 14, fontSize: 14 }}>👤 Gender</div>
              <PieRow data={summary.gender_dist} colors={['#6366f1','#ec4899']} />
            </div>
            <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, marginBottom: 14, fontSize: 14 }}>🏫 School Type</div>
              <PieRow data={summary.school_type_dist} colors={['#38bdf8','#fbbf24']} />
            </div>
            <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, marginBottom: 14, fontSize: 14 }}>🌐 Internet Access</div>
              <PieRow data={summary.internet_access} colors={['#10b981','#f43f5e']} />
            </div>
            <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, marginBottom: 14, fontSize: 14 }}>💡 Motivation</div>
              <PieRow data={summary.motivation_level} colors={['#f43f5e','#fbbf24','#10b981']} />
            </div>
            <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, marginBottom: 14, fontSize: 14 }}>👨‍👩‍👧 Parental Involvement</div>
              <PieRow data={summary.parental_involvement} colors={['#f43f5e','#fbbf24','#10b981']} />
            </div>
            <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, marginBottom: 14, fontSize: 14 }}>🧠 Learning Disabilities</div>
              <PieRow data={summary.learning_disabilities} colors={['#10b981','#f43f5e']} />
            </div>
          </div>
        </div>
      )}

      {/* TAB: Factors */}
      {tab === 'factors' && factors && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { title:'💡 Motivation Level',       data: factors.by_motivation  },
            { title:'👨‍👩‍👧 Parental Involvement', data: factors.by_parental    },
            { title:'📦 Access to Resources',     data: factors.by_resources   },
            { title:'👨‍🏫 Teacher Quality',       data: factors.by_teacher     },
            { title:'👥 Peer Influence',          data: factors.by_peer,
              colorFn: (g:string) => g==='Positive'?'#10b981':g==='Neutral'?'#6366f1':'#f43f5e' },
            { title:'💰 Family Income',           data: factors.by_income      },
            { title:'🏫 School Type',             data: factors.by_school,
              colorFn: (g:string) => g==='Private'?'#10b981':'#6366f1' },
            { title:'🌐 Internet Access',         data: factors.by_internet,
              colorFn: (g:string) => g==='Yes'?'#10b981':'#f43f5e' },
            { title:'🎭 Extracurricular',         data: factors.by_extracurr,
              colorFn: (g:string) => g==='Yes'?'#10b981':'#6366f1' },
            { title:'👤 Gender',                  data: factors.by_gender,
              colorFn: (g:string) => g==='Male'?'#6366f1':'#ec4899' },
          ].map(card => (
            <div key={card.title} style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, marginBottom: 14, fontSize: 14 }}>{card.title}</div>
              <GroupBar items={card.data} colorFn={card.colorFn} />
            </div>
          ))}
        </div>
      )}

      {/* TAB: Correlations */}
      {tab === 'correlations' && (
        <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 14, padding: 24 }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, marginBottom: 6, fontSize: 16 }}>📈 Correlation with Exam Score</div>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
            Pearson correlation coefficient — how strongly each factor predicts the exam score (computed from all {summary.total_students.toLocaleString()} records).
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Object.entries(summary.correlations)
              .sort(([,a],[,b]) => Math.abs(b) - Math.abs(a))
              .map(([col, r]) => (
              <div key={col}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                  <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{corrLabels[col] || col}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: corrColors(r), fontWeight: 700 }}>r = {r}</span>
                    <span style={{ fontSize: 11, color: '#475569' }}>
                      {Math.abs(r) >= 0.4 ? 'Strong' : Math.abs(r) >= 0.2 ? 'Moderate' : 'Weak'}
                    </span>
                  </div>
                </div>
                <div style={{ position: 'relative', height: 16, background: 'rgba(148,163,184,0.08)', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(148,163,184,0.2)' }} />
                  {r >= 0 ? (
                    <div style={{ position: 'absolute', left: '50%', top: 0, height: '100%', width: `${Math.abs(r) * 50}%`, background: corrColors(r), borderRadius: '0 6px 6px 0', transition: 'width .7s' }} />
                  ) : (
                    <div style={{ position: 'absolute', right: '50%', top: 0, height: '100%', width: `${Math.abs(r) * 50}%`, background: corrColors(r), borderRadius: '6px 0 0 6px', transition: 'width .7s' }} />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, padding: '14px 16px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#a5b4fc', marginBottom: 6 }}>📌 Key Insights from Dataset</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#64748b' }}>
              <div>• <strong style={{ color: '#e2e8f0' }}>Previous Scores</strong> has the strongest correlation with exam performance — past performance is the best predictor.</div>
              <div>• <strong style={{ color: '#e2e8f0' }}>Hours Studied</strong> and <strong style={{ color: '#e2e8f0' }}>Attendance</strong> are the most actionable factors students can improve.</div>
              <div>• <strong style={{ color: '#e2e8f0' }}>Sleep Hours</strong> shows a positive correlation — adequate sleep improves performance.</div>
              <div>• <strong style={{ color: '#e2e8f0' }}>Tutoring Sessions</strong> show moderate positive impact — targeted help matters.</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
