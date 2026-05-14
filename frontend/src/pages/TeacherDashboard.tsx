import { useEffect, useState } from 'react';
import { DEMO_USERS, getTier, toast } from '../store';
import { usePointsStore } from '../hooks';

interface Props { setPage: (p: string) => void; }

interface AnalyticsSummary {
  total_students: number;
  avg_exam_score: number;
  avg_attendance: number;
  score_bands: Record<string, number>;
}

interface DatasetStudent {
  Hours_Studied: number;
  Attendance: number;
  Previous_Scores: number;
  Exam_Score: number;
  Gender: string;
  School_Type: string;
  Motivation_Level: string;
}

const API = 'http://localhost:5000';

const PERF_COLOR: Record<string, string> = {
  Excellent: '#10b981', Good: '#38bdf8', Average: '#fbbf24',
  'Below Average': '#fb923c', 'At Risk': '#f43f5e',
};

function getPrediction(score: number) {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Average';
  if (score >= 40) return 'Below Average';
  return 'At Risk';
}

export default function TeacherDashboard({ setPage }: Props) {
  const { getPoints, getLog } = usePointsStore();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [datasetStudents, setDatasetStudents] = useState<DatasetStudent[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/analytics/summary`).then(r => r.json()),
      fetch(`${API}/api/dataset?page=1&limit=6607`).then(r => r.json()),
    ])
      .then(([summaryData, datasetData]) => {
        setSummary(summaryData);
        setDatasetStudents(datasetData.data || []);
      })
      .catch(err => console.error('Failed to load teacher overview dataset:', err));
  }, []);

  const demoStudents = DEMO_USERS.students.map(s => ({
    ...s,
    pts: Number(getPoints(s.id)) || 0,
    tier: getTier(Number(getPoints(s.id)) || 0),
    log: getLog(s.id),
    prediction:
      s.cgpa >= 8.5 ? 'Excellent'
      : s.cgpa >= 7.5 ? 'Good'
      : s.cgpa >= 6.0 ? 'Average'
      : s.cgpa >= 5.0 ? 'Below Average'
      : 'At Risk',
  }));

  const datasetList = datasetStudents.map((s, index) => ({
    id: `D${String(index + 1).padStart(4, '0')}`,
    name: `Student ${index + 1}`,
    branch: s.School_Type || 'StudentPerformanceFactors',
    semester: '-',
    cgpa: Number((s.Exam_Score / 10).toFixed(2)),
    examScore: Number(s.Exam_Score),
    prediction: getPrediction(Number(s.Exam_Score)),
    pts: 0,
  }));

  const students = datasetList.length ? datasetList : demoStudents;

  const avgCgpa = summary
    ? (summary.avg_exam_score / 10).toFixed(2)
    : (students.reduce((s, st) => s + Number(st.cgpa), 0) / Math.max(students.length, 1)).toFixed(2);

  const totalStudents = summary?.total_students ?? students.length;
  const atRiskCount = summary
    ? (summary.score_bands?.['At Risk (<50)'] || 0)
    : students.filter(s => s.prediction === 'At Risk' || s.prediction === 'Below Average').length;

  const totalPoints = demoStudents.reduce((s, st) => s + (Number(st.pts) || 0), 0);
  const excellent = students.filter(s => s.prediction === 'Excellent' || s.prediction === 'Good');

  const distribution = ['Excellent','Good','Average','Below Average','At Risk'].map(level => {
    const count = students.filter(s => s.prediction === level).length;
    return { level, count, pct: Math.round((count / Math.max(students.length, 1)) * 100) };
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}>
      <div className="anim-fade-up">
        <h1 style={{ fontSize:"1.65rem", fontWeight:800, letterSpacing:"-0.025em", marginBottom:"0.35rem" }}>📊 Teacher Overview</h1>
        <p style={{ color:"#64748b", fontSize:"0.875rem" }}>Class performance dashboard — StudentPerformanceFactors dataset</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"1rem" }} className="anim-fade-up anim-delay-1">
        {[
          { label: 'Total Students', value: totalStudents.toLocaleString(), color: '#6366f1', icon: '🎓', sub: 'dataset records' },
          { label: 'Avg CGPA',       value: avgCgpa,                    color: '#10b981', icon: '📊', sub: 'based on exam score / 10' },
          { label: 'At Risk',        value: atRiskCount.toLocaleString(), color: '#f43f5e', icon: '🚨', sub: 'below 50 exam score', onClick: () => setPage('atrisk') },
          { label: 'Points Awarded', value: totalPoints.toLocaleString(), color: '#fbbf24', icon: '🏅', sub: 'demo app users only' },
        ].map(s => (
          <div
            key={s.label}
            className={`card transition-all ${s.onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:border-rose-500/30' : ''}`}
            onClick={s.onClick}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider leading-tight">{s.label}</span>
              <span className="text-xl">{s.icon}</span>
            </div>
            <div className="text-3xl font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-slate-500">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="card anim-fade-up anim-delay-1">
        <h2 className="font-bold text-sm mb-4">Class Performance Distribution</h2>
        <div className="space-y-2">
          {distribution.map(({ level, count, pct }) => (
            <div key={level}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">{level}</span>
                <span className="font-mono font-semibold" style={{ color: PERF_COLOR[level] }}>{count.toLocaleString()} students ({pct}%)</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.08)' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: PERF_COLOR[level] }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 anim-fade-up anim-delay-2">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-sm">All Students ({students.length.toLocaleString()})</h2>
            <button onClick={() => setPage('students')} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">View all →</button>
          </div>
          <div className="space-y-2" style={{ maxHeight: 520, overflowY: 'auto', paddingRight: 6 }}>
            {students.map(s => (
              <div key={s.id} className="flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer transition-all hover:-translate-x-0.5" style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(148,163,184,0.06)' }} onClick={() => setPage('students')}>
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-slate-100 truncate">{s.name}</div>
                  <div className="text-xs text-slate-500 truncate">{s.branch} · Score {('examScore' in s ? s.examScore : Number(s.cgpa) * 10)}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  <span className="text-xs font-mono text-slate-300 font-semibold">{s.cgpa}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${PERF_COLOR[s.prediction]}18`, color: PERF_COLOR[s.prediction] }}>{s.prediction}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="font-bold text-sm mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { icon: '🏅', label: 'Award Points to Demo Students', sub: 'Recognize achievements', page: 'award', color: '#fbbf24' },
                { icon: '🚨', label: 'View At-Risk Students', sub: `${atRiskCount.toLocaleString()} need attention`, page: 'atrisk', color: '#f43f5e' },
                { icon: '📈', label: 'Class Analytics', sub: 'Performance trends', page: 'analytics', color: '#6366f1' },
                { icon: '🎓', label: 'All Students', sub: 'Full roster view', page: 'students', color: '#38bdf8' },
                { icon: '🏆', label: 'Leaderboard', sub: 'Student rankings', page: 'leaderboard', color: '#10b981' },
              ].map(q => (
                <button key={q.label} onClick={() => setPage(q.page)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all group" style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(148,163,184,0.08)' }}>
                  <span className="text-xl">{q.icon}</span>
                  <div>
                    <div className="font-semibold text-sm text-slate-100">{q.label}</div>
                    <div className="text-xs text-slate-500">{q.sub}</div>
                  </div>
                  <span className="ml-auto text-slate-600 group-hover:text-slate-400 transition-colors">→</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="font-bold text-sm mb-3">🌟 Top Performers</h2>
            <div className="space-y-2">
              {excellent.slice(0, 5).map((s, i) => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="text-sm w-5 text-center text-slate-500 font-mono">#{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-100 truncate">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.branch}</div>
                  </div>
                  <span className="text-sm font-bold font-mono" style={{ color: PERF_COLOR[s.prediction] }}>{s.cgpa}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
