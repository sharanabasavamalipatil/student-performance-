import { useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../hooks';
import { callGemini, isGeminiKeySet } from '../lib/gemini';

// ─────────────────────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────────────────────
type EvalMode = 'answer_check' | 'paper_correct' | 'quiz_gen' | 'rubric' | 'plagiarism';

interface UploadedFile {
  name: string;
  kind: 'pdf' | 'image' | 'text';
  base64: string;
  mime: string;
  size: number;
  previewUrl?: string;
}

interface QuizQ { q: string; options: string[]; answer: string; explanation: string; }

// ─────────────────────────────────────────────────────────────────────────────
//  FILE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const toB64 = (f: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

const kindOf = (f: File): UploadedFile['kind'] =>
  f.type === 'application/pdf' ? 'pdf' : f.type.startsWith('image/') ? 'image' : 'text';

const fmtBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1_048_576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1_048_576).toFixed(1)} MB`;

// ─────────────────────────────────────────────────────────────────────────────
//  GEMINI API  — calls Google Gemini directly, no backend needed
// ─────────────────────────────────────────────────────────────────────────────
async function askClaude(
  system: string,
  userText: string,
  files: UploadedFile[] = [],
  maxTokens = 2000,
): Promise<string> {
  if (!isGeminiKeySet()) {
    throw Object.assign(new Error('NO_API_KEY'), { nokey: true });
  }

  // Build text content (Gemini free tier doesn't support file uploads via API key)
  const fileSummary = files.map(f => `[Attached file: ${f.name}]`).join('\n');
  const userContent = fileSummary ? `${fileSummary}\n\n${userText}` : userText;

  return callGemini({
    system,
    messages: [{ role: 'user', content: userContent }],
    max_tokens: maxTokens,
  });
}

function parseJSON(raw: string): any {
  const cleaned = raw.replace(/```json\n?|```\n?/g, '').trim();
  try { return JSON.parse(cleaned); } catch { /* try harder */ }
  const m = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  try { return m ? JSON.parse(m[1]) : null; } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
//  TINY DESIGN SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
const css = {
  card: { background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 16, padding: '20px 22px' } as React.CSSProperties,
  inp:  { width: '100%', background: 'rgba(2,6,23,0.6)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 10, padding: '9px 14px', color: '#e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' },
};

function Card({ ch, sx = {} }: { ch: React.ReactNode; sx?: React.CSSProperties }) {
  return <div style={{ ...css.card, ...sx }}>{ch}</div>;
}
function Lbl({ t }: { t: string }) {
  return <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 6px' }}>{t}</p>;
}
function TA({ v, set, ph, rows = 5 }: { v: string; set: (s: string) => void; ph?: string; rows?: number }) {
  return <textarea value={v} onChange={e => set(e.target.value)} placeholder={ph} rows={rows} style={{ ...css.inp, resize: 'vertical' }} />;
}
function SI({ v, set, ph, type = 'text' }: { v: string; set: (s: string) => void; ph?: string; type?: string }) {
  return <input type={type} value={v} onChange={e => set(e.target.value)} placeholder={ph} style={css.inp} />;
}
function Btn({ label, onClick, disabled, ghost, sm }: { label: string; onClick?: () => void; disabled?: boolean; ghost?: boolean; sm?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: sm ? '6px 14px' : '10px 22px', borderRadius: 10, border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer', fontSize: sm ? 12 : 14, fontWeight: 600,
      background: disabled ? 'rgba(148,163,184,0.1)' : ghost ? 'rgba(148,163,184,0.12)' : 'linear-gradient(135deg,#6366f1,#a78bfa)',
      color: disabled ? '#475569' : '#fff', opacity: disabled ? 0.65 : 1, transition: 'all .2s',
    }}>{label}</button>
  );
}
function Chip({ t, on, click }: { t: string; on: boolean; click: () => void }) {
  return (
    <button onClick={click} style={{
      padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
      background: on ? 'linear-gradient(135deg,#6366f1,#a78bfa)' : 'rgba(148,163,184,0.1)',
      color: on ? '#fff' : '#94a3b8', transition: 'all .2s',
    }}>{t}</button>
  );
}
function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.1)' }} />
      <span style={{ fontSize: 11, color: '#475569', fontWeight: 700, letterSpacing: 1 }}>OR</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.1)' }} />
    </div>
  );
}
function Ring({ score, max }: { score: number; max: number }) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  const col = pct >= 80 ? '#10b981' : pct >= 60 ? '#fbbf24' : pct >= 40 ? '#fb923c' : '#f43f5e';
  const r = 36, C = 2 * Math.PI * r, d = (pct / 100) * C;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={88} height={88} viewBox="0 0 88 88">
        <circle cx={44} cy={44} r={r} fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth={8} />
        <circle cx={44} cy={44} r={r} fill="none" stroke={col} strokeWidth={8}
          strokeDasharray={`${d} ${C - d}`} strokeLinecap="round" transform="rotate(-90 44 44)"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
        <text x={44} y={44} textAnchor="middle" dominantBaseline="central" fill={col} fontSize={16} fontWeight={700}>{pct}%</text>
      </svg>
      <span style={{ fontSize: 11, color: '#64748b' }}>{score} / {max} marks</span>
    </div>
  );
}

// ─── Setup Guide Card (shown when API key missing) ───────────────────────────
function SetupCard() {
  return (
    <div style={{ borderRadius:14, border:'1px solid rgba(251,191,36,0.35)', background:'rgba(251,191,36,0.05)', overflow:'hidden' }}>
      <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(251,191,36,0.15)', display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:28 }}>🔑</span>
        <div>
          <div style={{ fontWeight:800, fontSize:15, color:'#fbbf24' }}>API Key Required</div>
          <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>The AI Evaluator needs a FREE Google Gemini API key (no credit card!)</div>
        </div>
      </div>
      <div style={{ padding:'16px 20px' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { n:1, text:'Go to', link:'aistudio.google.com', after:' and sign in with Google (FREE)' },
            { n:2, text:'Click "Get API Key" → "Create API Key" → Copy it' },
            { n:3, text:'Open', code:'backend/.env', after:' in Notepad' },
            { n:4, text:'Replace', code:'YOUR_GEMINI_API_KEY_HERE', after:' with your copied key' },
            { n:5, text:'Restart backend:', code:'node server.js' },
          ].map((s,i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
              <span style={{ width:22, height:22, borderRadius:'50%', background:'rgba(251,191,36,0.2)', color:'#fbbf24', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>{s.n}</span>
              <span style={{ fontSize:13, color:'#94a3b8', lineHeight:1.5 }}>
                {s.text}{' '}
                {s.link && <span style={{ color:'#a78bfa', fontWeight:700 }}>{s.link}</span>}
                {s.code && <code style={{ background:'rgba(99,102,241,0.15)', padding:'1px 7px', borderRadius:5, color:'#a5b4fc', fontSize:12 }}>{s.code}</code>}
                {s.after}
              </span>
            </div>
          ))}
        </div>
        <div style={{ marginTop:14, padding:'10px 14px', borderRadius:8, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', fontFamily:'monospace', fontSize:12, color:'#a5b4fc' }}>
          GEMINI_API_KEY=AIzaSy-your-key-here
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  FILE UPLOAD ZONE
// ─────────────────────────────────────────────────────────────────────────────
const ACCEPT_MIME = ['application/pdf','image/png','image/jpeg','image/jpg','image/webp','text/plain'];
const ACCEPT_EXT  = '.pdf,.png,.jpg,.jpeg,.webp,.txt';

function DropZone({
  files, add, remove, max = 3, label,
}: {
  files: UploadedFile[]; add: (f: UploadedFile) => void;
  remove: (i: number) => void; max?: number; label?: string;
}) {
  const ref  = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [err,  setErr]  = useState('');

  const proc = useCallback(async (raw: File) => {
    setErr('');
    if (!ACCEPT_MIME.includes(raw.type))      { setErr(`❌ Unsupported: ${raw.name}. Use PDF, PNG, JPG, WEBP, or TXT.`); return; }
    if (raw.size > 10 * 1024 * 1024)          { setErr('❌ Max 10 MB per file.'); return; }
    if (files.length >= max)                  { setErr(`❌ Max ${max} files.`); return; }
    const base64    = await toB64(raw);
    const kind      = kindOf(raw);
    const previewUrl = kind === 'image' ? URL.createObjectURL(raw) : undefined;
    add({ name: raw.name, kind, base64, mime: raw.type, size: raw.size, previewUrl });
  }, [files.length, max, add]);

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDrag(false); Array.from(e.dataTransfer.files).forEach(proc); };
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => { Array.from(e.target.files ?? []).forEach(proc); e.target.value = ''; };

  return (
    <div>
      {label && <Lbl t={label} />}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => ref.current?.click()}
        style={{
          border: `2px dashed ${drag ? '#6366f1' : 'rgba(148,163,184,0.18)'}`,
          borderRadius: 12, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s',
          background: drag ? 'rgba(99,102,241,0.07)' : 'rgba(2,6,23,0.3)',
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 6 }}>📂</div>
        <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, margin: '0 0 3px' }}>Drop files here or click to browse</p>
        <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>PDF · PNG · JPG · WEBP · TXT &nbsp;·&nbsp; Max 10 MB &nbsp;·&nbsp; Up to {max} files</p>
        <input ref={ref} type="file" accept={ACCEPT_EXT} multiple style={{ display: 'none' }} onChange={onPick} />
      </div>

      {err && (
        <div style={{ marginTop: 6, padding: '7px 12px', borderRadius: 8, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', color: '#f43f5e', fontSize: 12 }}>
          {err}
        </div>
      )}

      {files.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', maxWidth: 260 }}>
              {f.kind === 'image' && f.previewUrl
                ? <img src={f.previewUrl} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
                : <span style={{ fontSize: 22 }}>{f.kind === 'pdf' ? '📄' : '📃'}</span>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>{fmtBytes(f.size)} · {f.kind.toUpperCase()}</p>
              </div>
              <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ANSWER CHECKER
// ─────────────────────────────────────────────────────────────────────────────
function AnswerChecker() {
  const [err, setErr] = useState('');
  const [qText,  setQText]  = useState('');
  const [modelA, setModelA] = useState('');
  const [stuA,   setStuA]   = useState('');
  const [marks,  setMarks]  = useState('10');
  const [subj,   setSubj]   = useState('');
  const [qFiles, setQFiles] = useState<UploadedFile[]>([]);
  const [aFiles, setAFiles] = useState<UploadedFile[]>([]);
  const [busy,   setBusy]   = useState(false);
  const [res,    setRes]    = useState<any>(null);

  const run = async () => {
    setBusy(true); setRes(null); setErr('');
    try {
      const files = [...qFiles, ...aFiles];
      const raw = await askClaude(
        'You are an expert academic evaluator. Be fair, specific, and constructive. Respond ONLY with valid JSON — no markdown fences, no extra text.',
        `Evaluate this student answer carefully.

Subject: ${subj || 'General'}
Maximum Marks: ${marks}
${qText  ? `Question:\n${qText}` : '(Question is in the uploaded file above.)'}
${modelA ? `Model Answer / Key Points:\n${modelA}` : ''}
${stuA   ? `Student Answer:\n${stuA}` : '(Student answer is in the uploaded file/image above.)'}

Return this exact JSON shape:
{
  "score": <integer marks awarded>,
  "maxScore": ${marks},
  "grade": "<one of: A+ A B C D F>",
  "feedback": "<2-3 sentence overall assessment>",
  "strengths": ["<point>", "<point>"],
  "improvements": ["<point>", "<point>"],
  "correctedText": "<model/improved version of the answer>"
}`,
        files, 2000,
      );
      const p = parseJSON(raw);
      setRes(p ?? { feedback: raw, score: 0, maxScore: parseInt(marks) });
    } catch (e: any) {
      if ((e as any).nokey || String((e as any).message).includes('Gemini')) setErr('NO_API_KEY');
      else setErr((e as any).message ?? 'Unknown error');
    }
    finally { setBusy(false); }
  };

  const ok = !busy && (qText.trim() || stuA.trim() || qFiles.length > 0 || aFiles.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div><Lbl t="Subject" /><SI v={subj} set={setSubj} ph="e.g. Data Structures" /></div>
        <div><Lbl t="Maximum Marks" /><SI v={marks} set={setMarks} ph="10" type="number" /></div>
      </div>

      {/* Question */}
      <DropZone files={qFiles} add={f => setQFiles(p => [...p, f])} remove={i => setQFiles(p => p.filter((_, j) => j !== i))} max={2} label="📄 Upload Question Paper (PDF / Image / Scanned)" />
      <Divider />
      <div><Lbl t="Question (type here)" /><TA v={qText} set={setQText} ph="…or type the question here" rows={3} /></div>

      <div><Lbl t="Model Answer / Key Points (optional)" /><TA v={modelA} set={setModelA} ph="Expected answer or marking key (helps get better scores)…" rows={3} /></div>

      {/* Student answer */}
      <DropZone files={aFiles} add={f => setAFiles(p => [...p, f])} remove={i => setAFiles(p => p.filter((_, j) => j !== i))} max={3} label="📝 Upload Student Answer Sheet (PDF · Scanned image · Handwritten photo)" />
      <Divider />
      <div><Lbl t="Student Answer (type here)" /><TA v={stuA} set={setStuA} ph="…or paste the student's answer here" rows={5} /></div>


      {err === 'NO_API_KEY' && <SetupCard />}
      {err && err !== 'NO_API_KEY' && (
        <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.25)', color:'#f87171', fontSize:13 }}>❌ {err}</div>
      )}

      <Btn label={busy ? '⏳ Evaluating…' : '🎯 Evaluate Answer'} onClick={run} disabled={!ok} />

      {res && (
        <Card ch={
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
              {typeof res.score === 'number' && <Ring score={res.score} max={res.maxScore ?? parseInt(marks)} />}
              <div style={{ flex: 1, minWidth: 160 }}>
                {res.grade && <div style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, background: 'rgba(99,102,241,0.15)', color: '#a78bfa', fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Grade: {res.grade}</div>}
                {res.feedback && <p style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{res.feedback}</p>}
              </div>
            </div>
            {res.strengths?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <Lbl t="✅ Strengths" />
                {res.strengths.map((s: string, i: number) => <div key={i} style={{ color: '#10b981', fontSize: 13, marginBottom: 4, display: 'flex', gap: 6 }}><span>•</span><span>{s}</span></div>)}
              </div>
            )}
            {res.improvements?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <Lbl t="📈 Areas to Improve" />
                {res.improvements.map((s: string, i: number) => <div key={i} style={{ color: '#fbbf24', fontSize: 13, marginBottom: 4, display: 'flex', gap: 6 }}><span>•</span><span>{s}</span></div>)}
              </div>
            )}
            {res.correctedText && (
              <div style={{ marginTop: 14, padding: '14px 16px', background: 'rgba(99,102,241,0.06)', borderRadius: 10, borderLeft: '3px solid #6366f1' }}>
                <Lbl t="✏️ Model / Improved Answer" />
                <p style={{ color: '#e2e8f0', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{res.correctedText}</p>
              </div>
            )}
          </div>
        } />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  PAPER CORRECTOR
// ─────────────────────────────────────────────────────────────────────────────
function PaperCorrector() {
  const [err, setErr] = useState('');
  const [paperTxt, setPaperTxt] = useState('');
  const [keyTxt,   setKeyTxt]   = useState('');
  const [subj,     setSubj]     = useState('');
  const [total,    setTotal]    = useState('100');
  const [paperF,   setPaperF]   = useState<UploadedFile[]>([]);
  const [keyF,     setKeyF]     = useState<UploadedFile[]>([]);
  const [busy,     setBusy]     = useState(false);
  const [res,      setRes]      = useState<any>(null);

  const run = async () => {
    setBusy(true); setRes(null); setErr('');
    try {
      const files = [...keyF, ...paperF];
      const raw = await askClaude(
        'You are an experienced professor correcting exam papers. Be thorough and constructive. Respond ONLY with valid JSON.',
        `Correct this full exam paper.

Subject: ${subj || 'General'} | Total Marks: ${total}
${keyTxt  ? `Answer Key / Rubric:\n${keyTxt}` : keyF.length ? '(Answer key is in the uploaded file above.)' : '(No answer key provided — use your subject knowledge.)'}
${paperTxt ? `Student Paper:\n${paperTxt}` : '(Student paper is in the uploaded file/image above.)'}

Return this exact JSON:
{
  "score": <integer>,
  "maxScore": ${total},
  "grade": "<A+|A|B|C|D|F>",
  "feedback": "<2-3 sentence overall assessment>",
  "strengths": ["<3-5 points>"],
  "improvements": ["<3-5 points>"],
  "rubric": [
    { "criterion": "<aspect assessed>", "marks": <max>, "earned": <awarded>, "comment": "<brief comment>" }
  ],
  "correctedText": "<the student paper with inline [CORRECTION: ...] annotations>"
}`,
        files, 3000,
      );
      const p = parseJSON(raw);
      setRes(p ?? { feedback: raw, score: 0, maxScore: parseInt(total) });
    } catch (e: any) {
      if ((e as any).nokey || String((e as any).message).includes('Gemini')) setErr('NO_API_KEY');
      else setErr((e as any).message ?? 'Unknown error');
    }
    finally { setBusy(false); }
  };

  const ok = !busy && (paperTxt.trim() || paperF.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div><Lbl t="Subject" /><SI v={subj} set={setSubj} ph="e.g. Machine Learning" /></div>
        <div><Lbl t="Total Marks" /><SI v={total} set={setTotal} ph="100" type="number" /></div>
      </div>

      <DropZone files={keyF} add={f => setKeyF(p => [...p, f])} remove={i => setKeyF(p => p.filter((_, j) => j !== i))} max={2} label="📋 Upload Answer Key / Rubric (optional)" />
      <Divider />
      <div><Lbl t="Answer Key (type here — optional)" /><TA v={keyTxt} set={setKeyTxt} ph="…or paste the marking scheme / key points here" rows={3} /></div>

      <DropZone files={paperF} add={f => setPaperF(p => [...p, f])} remove={i => setPaperF(p => p.filter((_, j) => j !== i))} max={5} label="📝 Upload Student Exam Paper (PDF · Scanned images · Photos of handwriting)" />
      <Divider />
      <div><Lbl t="Student Paper (type here)" /><TA v={paperTxt} set={setPaperTxt} ph="…or paste the full exam paper here" rows={9} /></div>


      {err === 'NO_API_KEY' && <SetupCard />}
      {err && err !== 'NO_API_KEY' && (
        <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.25)', color:'#f87171', fontSize:13 }}>❌ {err}</div>
      )}

      <Btn label={busy ? '⏳ Correcting Paper…' : '📝 Correct Full Paper'} onClick={run} disabled={!ok} />

      {res && res.score !== undefined && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Summary */}
          <Card ch={
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
              <Ring score={res.score} max={res.maxScore} />
              <div style={{ flex: 1 }}>
                {res.grade && <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, background: 'rgba(99,102,241,0.15)', color: '#a78bfa', fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Grade: {res.grade}</span>}
                {res.feedback && <p style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{res.feedback}</p>}
              </div>
            </div>
          } />

          {/* Rubric breakdown */}
          {res.rubric?.length > 0 && (
            <Card ch={
              <div>
                <Lbl t="📊 Marking Breakdown" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {res.rubric.map((r: any, i: number) => {
                    const pct  = r.marks ? Math.round(((r.earned ?? 0) / r.marks) * 100) : 0;
                    const col  = pct >= 80 ? '#10b981' : pct >= 50 ? '#fbbf24' : '#f43f5e';
                    return (
                      <div key={i} style={{ padding: '10px 14px', background: 'rgba(2,6,23,0.5)', borderRadius: 10, borderLeft: `3px solid ${col}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: r.comment ? 4 : 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{r.criterion}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: col }}>{r.earned ?? 0} / {r.marks}</span>
                        </div>
                        {r.comment && <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{r.comment}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            } />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {res.strengths?.length > 0 && (
              <Card ch={<div><Lbl t="✅ Strengths" />{res.strengths.map((s: string, i: number) => <div key={i} style={{ color: '#10b981', fontSize: 13, marginBottom: 5, display: 'flex', gap: 6 }}><span>•</span><span>{s}</span></div>)}</div>} />
            )}
            {res.improvements?.length > 0 && (
              <Card ch={<div><Lbl t="📈 Improvements" />{res.improvements.map((s: string, i: number) => <div key={i} style={{ color: '#fbbf24', fontSize: 13, marginBottom: 5, display: 'flex', gap: 6 }}><span>•</span><span>{s}</span></div>)}</div>} />
            )}
          </div>

          {res.correctedText && (
            <Card ch={<div><Lbl t="✏️ Annotated / Corrected Paper" /><pre style={{ color: '#e2e8f0', fontSize: 12, lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{res.correctedText}</pre></div>} />
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  QUIZ GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
function QuizGenerator() {
  const [err, setErr] = useState('');
  const [topic,  setTopic]  = useState('');
  const [tFiles, setTFiles] = useState<UploadedFile[]>([]);
  const [diff,   setDiff]   = useState<'Easy'|'Medium'|'Hard'>('Medium');
  const [num,    setNum]    = useState('5');
  const [qtype,  setQtype]  = useState<'MCQ'|'Short Answer'>('MCQ');
  const [busy,   setBusy]   = useState(false);
  const [qs,     setQs]     = useState<QuizQ[]>([]);
  const [ans,    setAns]    = useState<Record<number,string>>({});
  const [done,   setDone]   = useState(false);
  const [score,  setScore]  = useState(0);

  const generate = async () => {
    setBusy(true); setQs([]); setAns({}); setDone(false); setErr('');
    try {
      const raw = await askClaude(
        'You are a quiz creator. Respond ONLY with a valid JSON array — no markdown, no extra text.',
        `Create ${num} ${diff} ${qtype} questions${topic ? ` on: "${topic}"` : ' based on the uploaded material above'}.

JSON array format:
[
  {
    "q": "<question text>",
    "options": ["A. <opt>", "B. <opt>", "C. <opt>", "D. <opt>"],
    "answer": "<correct letter, e.g. B>",
    "explanation": "<brief explanation why>"
  }
]

For Short Answer: set options to [] and answer to the expected answer text.`,
        tFiles, 2000,
      );
      const p = parseJSON(raw);
      if (Array.isArray(p)) setQs(p);
      else alert('Could not parse quiz. Try again.');
    } catch (e: any) {
      if ((e as any).nokey || String((e as any).message).includes('Gemini')) setErr('NO_API_KEY');
      else setErr((e as any).message ?? 'Unknown error');
    }
    finally { setBusy(false); }
  };

  const submit = () => {
    let s = 0;
    qs.forEach((q, i) => {
      if (q.options.length > 0) {
        if ((ans[i] ?? '').trim().toUpperCase().startsWith(q.answer.trim().toUpperCase())) s++;
      } else {
        if ((ans[i] ?? '').trim().length > 4) s++;
      }
    });
    setScore(s); setDone(true);
  };

  const canGen = !busy && (topic.trim() || tFiles.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card ch={
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <Lbl t="Difficulty" />
              <div style={{ display: 'flex', gap: 6 }}>
                {(['Easy','Medium','Hard'] as const).map(d => <Chip key={d} t={d} on={diff === d} click={() => setDiff(d)} />)}
              </div>
            </div>
            <div>
              <Lbl t="Type" />
              <div style={{ display: 'flex', gap: 6 }}>
                {(['MCQ','Short Answer'] as const).map(t => <Chip key={t} t={t} on={qtype === t} click={() => setQtype(t)} />)}
              </div>
            </div>
            <div><Lbl t="No. of Questions" /><SI v={num} set={setNum} ph="5" type="number" /></div>
          </div>

          <DropZone files={tFiles} add={f => setTFiles(p => [...p, f])} remove={i => setTFiles(p => p.filter((_, j) => j !== i))} max={3} label="📚 Upload Study Material / Chapter (PDF / Image) — quiz will be generated from it" />
          <Divider />
          <div style={{ display: 'flex', gap: 10 }}>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="…or type a topic: Binary Trees, Newton's Laws, Photosynthesis…"
              style={{ flex: 1, ...css.inp }} />
            <Btn label={busy ? '⏳ Generating…' : '🎲 Generate Quiz'} onClick={generate} disabled={!canGen} />
          </div>
        </div>
      } />

      {qs.map((q, i) => {
        const correct = done && (q.options.length > 0
          ? (ans[i] ?? '').trim().toUpperCase().startsWith(q.answer.trim().toUpperCase())
          : true);
        return (
          <Card key={i} sx={{ borderLeft: done ? `3px solid ${correct ? '#10b981' : '#f43f5e'}` : '1px solid rgba(148,163,184,0.12)' }} ch={
            <div>
              <p style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14, margin: '0 0 12px' }}>Q{i + 1}. {q.q}</p>
              {q.options.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.options.map((opt, j) => {
                    const letter = opt.trim()[0];
                    const sel    = (ans[i] ?? '') === opt;
                    const isAns  = q.answer.trim().toUpperCase() === letter?.toUpperCase();
                    let bg = 'rgba(148,163,184,0.07)';
                    if (done)      bg = isAns ? 'rgba(16,185,129,0.15)' : sel && !isAns ? 'rgba(244,63,94,0.12)' : bg;
                    else if (sel)  bg = 'rgba(99,102,241,0.15)';
                    return (
                      <button key={j} disabled={done} onClick={() => setAns(a => ({ ...a, [i]: opt }))}
                        style={{ textAlign: 'left', padding: '9px 14px', borderRadius: 8, border: `1px solid ${sel && !done ? '#6366f1' : 'rgba(148,163,184,0.1)'}`, background: bg, color: '#cbd5e1', fontSize: 13, cursor: done ? 'default' : 'pointer' }}>
                        {opt} {done && isAns && '✅'}{done && sel && !isAns && '❌'}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <TA v={ans[i] ?? ''} set={v => setAns(a => ({ ...a, [i]: v }))} ph="Your answer…" rows={3} />
              )}
              {done && <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(99,102,241,0.08)', borderRadius: 8, fontSize: 12, color: '#a78bfa' }}>💡 {q.explanation}</div>}
            </div>
          } />
        );
      })}

      {qs.length > 0 && !done && (
        <Btn label="✅ Submit Quiz" onClick={submit}
          disabled={Object.keys(ans).length < qs.filter(q => q.options.length > 0).length} />
      )}
      {done && (
        <Card ch={
          <div style={{ textAlign: 'center' }}>
            <Ring score={score} max={qs.length} />
            <p style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 16, marginTop: 10 }}>You scored {score} / {qs.length}</p>
            <Btn label="🔄 Try Again" onClick={() => { setDone(false); setAns({}); setScore(0); }} ghost />
          </div>
        } />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  RUBRIC BUILDER
// ─────────────────────────────────────────────────────────────────────────────
function RubricBuilder() {
  const [err, setErr] = useState('');
  const [descTxt, setDescTxt] = useState('');
  const [files,   setFiles]   = useState<UploadedFile[]>([]);
  const [subj,    setSubj]    = useState('');
  const [total,   setTotal]   = useState('50');
  const [level,   setLevel]   = useState<'School'|'College'|'University'>('College');
  const [busy,    setBusy]    = useState(false);
  const [rubric,  setRubric]  = useState<{ criterion: string; marks: number; descriptors: string[] }[]>([]);

  const generate = async () => {
    setBusy(true); setRubric([]);
    try {
      const raw = await askClaude(
        'You are an educational assessment designer. Respond ONLY with a valid JSON array.',
        `Create a detailed marking rubric.

Level: ${level} | Subject: ${subj || 'General'} | Total Marks: ${total}
${descTxt ? `Assignment: ${descTxt}` : '(See the uploaded assignment brief above.)'}

Return a JSON array where all "marks" values sum to ${total}:
[
  {
    "criterion": "<criterion name>",
    "marks": <max marks>,
    "descriptors": [
      "Excellent (full marks): <description>",
      "Good (75%): <description>",
      "Average (50%): <description>",
      "Below Average (<50%): <description>"
    ]
  }
]`,
        files, 2000,
      );
      const p = parseJSON(raw);
      if (Array.isArray(p)) setRubric(p);
    } catch (e: any) {
      if ((e as any).nokey || String((e as any).message).includes('Gemini')) setErr('NO_API_KEY');
      else setErr((e as any).message ?? 'Unknown error');
    }
    finally { setBusy(false); }
  };

  const download = () => {
    const txt = rubric.map(r => `${r.criterion} (${r.marks} marks)\n` + r.descriptors.map(d => `  • ${d}`).join('\n')).join('\n\n');
    const a = document.createElement('a');
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(txt);
    a.download = 'rubric.txt'; a.click();
  };

  const ok = !busy && (descTxt.trim() || files.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div>
          <Lbl t="Academic Level" />
          <div style={{ display: 'flex', gap: 6 }}>
            {(['School','College','University'] as const).map(l => <Chip key={l} t={l} on={level === l} click={() => setLevel(l)} />)}
          </div>
        </div>
        <div><Lbl t="Subject" /><SI v={subj} set={setSubj} ph="e.g. Computer Science" /></div>
        <div><Lbl t="Total Marks" /><SI v={total} set={setTotal} ph="50" type="number" /></div>
      </div>

      <DropZone files={files} add={f => setFiles(p => [...p, f])} remove={i => setFiles(p => p.filter((_, j) => j !== i))} max={2} label="📄 Upload Assignment Brief / Task Sheet (PDF / Image)" />
      <Divider />
      <div><Lbl t="Assignment Description (type here)" /><TA v={descTxt} set={setDescTxt} ph="…or describe the assignment / project here" rows={4} /></div>

      <Btn label={busy ? '⏳ Building Rubric…' : '📋 Generate Rubric'} onClick={generate} disabled={!ok} />

      {rubric.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 15, margin: 0 }}>📋 Generated Rubric</p>
            <Btn label="⬇️ Download .txt" onClick={download} ghost sm />
          </div>
          {rubric.map((r, i) => {
            const cols = ['#10b981','#38bdf8','#fbbf24','#f43f5e'];
            return (
              <Card key={i} ch={
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14 }}>{r.criterion}</span>
                    <span style={{ fontWeight: 700, color: '#a78bfa', fontSize: 14 }}>{r.marks} marks</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {r.descriptors.map((d, j) => (
                      <div key={j} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(2,6,23,0.5)', borderLeft: `3px solid ${cols[j] ?? '#6366f1'}`, fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>{d}</div>
                    ))}
                  </div>
                </div>
              } />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SIMILARITY / PLAGIARISM CHECK
// ─────────────────────────────────────────────────────────────────────────────
function SimilarityCheck() {
  const [err, setErr] = useState('');
  const [t1, setT1] = useState('');
  const [t2, setT2] = useState('');
  const [f1, setF1] = useState<UploadedFile[]>([]);
  const [f2, setF2] = useState<UploadedFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [res,  setRes]  = useState<any>(null);

  const run = async () => {
    setBusy(true); setRes(null);
    try {
      const raw = await askClaude(
        'You are a plagiarism detection system. Respond ONLY with valid JSON.',
        `Compare the two texts/documents for similarity.

${t1 ? `Text 1:\n${t1}` : '(Text 1 is the first uploaded document above.)'}
${t2 ? `Text 2:\n${t2}` : '(Text 2 is the second uploaded document above.)'}

Analyse structure, phrasing, and semantic similarity. Return this exact JSON:
{
  "similarity": <integer 0-100>,
  "assessment": "<one-line verdict, e.g. High similarity — likely copied>",
  "common": ["<shared idea or phrase>"],
  "unique1": ["<unique aspect of Text 1>"],
  "unique2": ["<unique aspect of Text 2>"]
}`,
        [...f1, ...f2], 1500,
      );
      const p = parseJSON(raw);
      if (p) setRes(p);
    } catch (e: any) {
      if ((e as any).nokey || String((e as any).message).includes('Gemini')) setErr('NO_API_KEY');
      else setErr((e as any).message ?? 'Unknown error');
    }
    finally { setBusy(false); }
  };

  const sim = res?.similarity ?? 0;
  const col = sim >= 70 ? '#f43f5e' : sim >= 40 ? '#fbbf24' : '#10b981';
  const ok  = !busy && (t1.trim() || f1.length > 0) && (t2.trim() || f2.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Doc 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <DropZone files={f1} add={f => setF1(p => [...p, f])} remove={i => setF1(p => p.filter((_, j) => j !== i))} max={2} label="📄 Document 1 (PDF / Image)" />
          <Divider />
          <Lbl t="Text 1 (paste here)" />
          <TA v={t1} set={setT1} ph="…or paste the first text / answer here" rows={7} />
        </div>
        {/* Doc 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <DropZone files={f2} add={f => setF2(p => [...p, f])} remove={i => setF2(p => p.filter((_, j) => j !== i))} max={2} label="📄 Document 2 (PDF / Image)" />
          <Divider />
          <Lbl t="Text 2 (paste here)" />
          <TA v={t2} set={setT2} ph="…or paste the second text / answer here" rows={7} />
        </div>
      </div>

      <Btn label={busy ? '⏳ Analysing…' : '🔍 Check Similarity'} onClick={run} disabled={!ok} />

      {res && (
        <Card ch={
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 52, fontWeight: 900, color: col, lineHeight: 1 }}>{sim}%</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>similarity</div>
              </div>
              <div style={{ flex: 1, padding: '12px 16px', borderRadius: 10, background: `rgba(${sim >= 70 ? '244,63,94' : sim >= 40 ? '251,191,36' : '16,185,129'},0.1)`, borderLeft: `4px solid ${col}` }}>
                <p style={{ color: col, fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>
                  {sim >= 70 ? '🚨 High Similarity' : sim >= 40 ? '⚠️ Moderate Overlap' : '✅ Low Similarity'}
                </p>
                <p style={{ color: '#cbd5e1', fontSize: 13, margin: 0 }}>{res.assessment}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div><Lbl t="🔗 Common Elements" />{(res.common ?? []).map((s: string, i: number) => <div key={i} style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>• {s}</div>)}</div>
              <div><Lbl t="📄 Unique to Doc 1" />{(res.unique1 ?? []).map((s: string, i: number) => <div key={i} style={{ fontSize: 12, color: '#38bdf8', marginBottom: 4 }}>• {s}</div>)}</div>
              <div><Lbl t="📄 Unique to Doc 2" />{(res.unique2 ?? []).map((s: string, i: number) => <div key={i} style={{ fontSize: 12, color: '#a78bfa', marginBottom: 4 }}>• {s}</div>)}</div>
            </div>
          </div>
        } />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ROOT PAGE
// ─────────────────────────────────────────────────────────────────────────────
const MODES: { id: EvalMode; icon: string; label: string; desc: string }[] = [
  { id: 'answer_check',  icon: '🎯', label: 'Answer Checker',  desc: 'Evaluate a single Q&A with score + grade' },
  { id: 'paper_correct', icon: '📝', label: 'Paper Corrector', desc: 'Correct a full exam paper with rubric' },
  { id: 'quiz_gen',      icon: '🎲', label: 'Quiz Generator',  desc: 'Auto-generate & attempt interactive quizzes' },
  { id: 'rubric',        icon: '📋', label: 'Rubric Builder',  desc: 'Create detailed marking rubrics' },
  { id: 'plagiarism',    icon: '🔍', label: 'Similarity Check',desc: 'Detect plagiarism / text overlap' },
];

export default function AIEvaluator() {
  const { user } = useAuthStore();
  const [mode, setMode] = useState<EvalMode>('answer_check');
  const active = MODES.find(m => m.id === mode)!;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ padding: '22px 26px', background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(167,139,250,0.07))', borderRadius: 16, border: '1px solid rgba(99,102,241,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
          <span style={{ fontSize: 38 }}>🤖</span>
          <div>
            <h1 style={{ margin: 0, color: '#e2e8f0', fontSize: 22, fontWeight: 800, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>AI Evaluator</h1>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 13 }}>No API key needed · Upload PDFs, images, scans, or just type</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['📄 PDF papers','🖼️ Scanned sheets','📸 Handwritten photos','📝 Typed text'].map(t => (
            <span key={t} style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(99,102,241,0.12)', color: '#a78bfa', fontSize: 11, fontWeight: 600 }}>{t}</span>
          ))}
        </div>
      </div>

      {/* ── Mode tabs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(148px,1fr))', gap: 10 }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{
            padding: '13px 10px', borderRadius: 14, border: `1px solid ${mode === m.id ? 'rgba(99,102,241,0.45)' : 'rgba(148,163,184,0.1)'}`,
            background: mode === m.id ? 'rgba(99,102,241,0.12)' : 'rgba(15,23,42,0.6)',
            cursor: 'pointer', textAlign: 'center', transition: 'all .2s',
          }}>
            <div style={{ fontSize: 22, marginBottom: 5 }}>{m.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: mode === m.id ? '#a78bfa' : '#e2e8f0', marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: 10, color: '#475569', lineHeight: 1.4 }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* ── Active panel ── */}
      <div style={{ padding: '20px', background: 'rgba(15,23,42,0.6)', borderRadius: 16, border: '1px solid rgba(148,163,184,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 22 }}>{active.icon}</span>
          <div>
            <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: 16, fontWeight: 700 }}>{active.label}</h2>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{active.desc}</p>
          </div>
        </div>

        {mode === 'answer_check'  && <AnswerChecker />}
        {mode === 'paper_correct' && <PaperCorrector />}
        {mode === 'quiz_gen'      && <QuizGenerator />}
        {mode === 'rubric'        && <RubricBuilder />}
        {mode === 'plagiarism'    && <SimilarityCheck />}
      </div>
    </div>
  );
}
