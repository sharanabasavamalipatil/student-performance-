'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store';

interface Message { id: string; role: 'user' | 'assistant'; content: string; ts: string; }

const SUGGESTIONS = [
  'How can I improve my CGPA?',
  'Tips for managing stress',
  'How to plan my career?',
  'What are activity points?',
  'How to clear backlogs?',
  'How does the predictor work?',
];

function buildSystemPrompt(user: any): string {
  return `You are EduPredict AI, a smart academic assistant for engineering students in India. You have deep knowledge about the EduPredict platform and student performance data from 2000 engineering students.

STUDENT CONTEXT:
- Name: ${user?.name || 'Student'}
- Branch: ${user?.branch || 'Engineering'}
- Semester: ${user?.semester || 'N/A'}
- CGPA: ${user?.cgpa || 'N/A'}

PLATFORM KNOWLEDGE:
- EduPredict uses 4 ML models: Random Forest, Gradient Boosting, MLP, Logistic Regression
- Activity points awarded ONLY by teachers: Hackathon(20), Project(15), Certification(25), Internship(30), Research Paper(40), Workshop(10)
- Point tiers: Bronze(0-59), Silver(60-119), Gold(120-199), Platinum(200+)
- Dataset stats: avg CGPA 7.1, avg attendance 81%, 2000 students, 8% at-risk, 18% excellent
- Students sleeping <6hrs score 0.7 CGPA lower; 2+ backlogs = -0.9 CGPA; >=85% attendance = +0.6 CGPA

INSTRUCTIONS:
- Be friendly, encouraging, and personalized using the student context
- Give concrete actionable advice with specific numbers from the dataset
- Use emojis to make responses engaging
- Use **bold** for key points and bullet lists where helpful
- Keep responses concise (3-8 lines max for most questions)
- Direct to Predictor tab for ML predictions, Courses tab for course recommendations
- Always be supportive and growth-focused`;
}

function speakText(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/[•*#]/g, '').replace(/\n+/g, ' ');
  const utt = new SpeechSynthesisUtterance(clean.slice(0, 500));
  utt.rate = 1.05; utt.pitch = 1; utt.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang === 'en-IN') || voices.find(v => v.lang.startsWith('en') && v.name.includes('Female')) || voices.find(v => v.lang.startsWith('en'));
  if (preferred) utt.voice = preferred;
  if (onEnd) utt.onend = onEnd;
  window.speechSynthesis.speak(utt);
}

export default function ChatPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([{
    id: '0', role: 'assistant',
    content: `👋 Hello${user?.name ? `, **${user.name}**` : ''}! I'm your **EduPredict AI Assistant** powered by Claude.\n\nI know your profile (${user?.branch || 'Engineering'}, Sem ${user?.semester || '?'}, CGPA ${user?.cgpa || '?'}) and have insights from **2000 engineering students**.\n\nAsk me anything about CGPA, stress, career, activity points, or use the 🎤 mic button to speak!`,
    ts: new Date().toISOString(),
  }]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking]   = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [error, setError]         = useState('');
  const bottomRef      = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const historyRef     = useRef<{ role: string; content: string }[]>([]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setError('');
    const userMsg: Message = { id: Date.now() + 'u', role: 'user', content: text, ts: new Date().toISOString() };
    setMessages(p => [...p, userMsg]);
    setInput('');
    setLoading(true);
    historyRef.current = [...historyRef.current, { role: 'user', content: text }];

    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      // Read token from Zustand persisted store
      let token = '';
      try {
        const raw = localStorage.getItem('edupredict-auth-v2');
        if (raw) token = JSON.parse(raw)?.state?.token || '';
      } catch {}
      const ctx = { name: user?.name, branch: user?.branch, semester: user?.semester, cgpa: user?.cgpa };
      const res = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          context: ctx,
          history: historyRef.current.slice(-10),
        }),
      });

      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const reply = data.reply || 'Sorry, I could not generate a response.';
      historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }];
      setMessages(p => [...p, { id: Date.now() + 'a', role: 'assistant', content: reply, ts: new Date().toISOString() }]);
      if (voiceEnabled) { setSpeaking(true); speakText(reply, () => setSpeaking(false)); }
    } catch {
      const errMsg = '⚠️ Could not reach the backend. Make sure the backend server is running on port 8000.';
      setError('Backend not reachable. Run: uvicorn main:app --reload --port 8000');
      setMessages(p => [...p, { id: Date.now() + 'e', role: 'assistant', content: errMsg, ts: new Date().toISOString() }]);
    }
    setLoading(false);
  }, [loading, user, voiceEnabled]);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError('Speech recognition not supported. Use Chrome browser.'); return; }
    recognitionRef.current?.stop();
    const rec = new SR();
    rec.lang = 'en-IN'; rec.continuous = false; rec.interimResults = false;
    rec.onstart  = () => setListening(true);
    rec.onend    = () => setListening(false);
    rec.onerror  = (e: any) => { setListening(false); setError(`Mic error: ${e.error}`); };
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setTimeout(() => send(transcript), 300);
    };
    rec.start();
    recognitionRef.current = rec;
  }, [send]);

  const stopListening = () => { recognitionRef.current?.stop(); setListening(false); };
  const stopSpeaking  = () => { window.speechSynthesis?.cancel(); setSpeaking(false); };

  const renderContent = (text: string) =>
    text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**') && line.length > 4)
        return <p key={i} className="font-bold text-white mt-1">{line.slice(2, -2)}</p>;
      if (line.startsWith('• ') || line.startsWith('- '))
        return (
          <li key={i} className="ml-4 list-disc text-slate-200">
            {line.slice(2).split(/\*\*(.*?)\*\*/g).map((p, j) =>
              j % 2 === 1 ? <strong key={j} className="text-white">{p}</strong> : <span key={j}>{p}</span>
            )}
          </li>
        );
      if (line.startsWith('|'))
        return <p key={i} className="font-mono text-xs text-slate-300 bg-slate-800 px-2 py-0.5 rounded my-0.5">{line}</p>;
      if (line === '') return <br key={i} />;
      return (
        <p key={i} className="text-slate-200">
          {line.split(/\*\*(.*?)\*\*/g).map((p, j) =>
            j % 2 === 1 ? <strong key={j} className="text-white font-semibold">{p}</strong> : <span key={j}>{p}</span>
          )}
        </p>
      );
    });

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="mb-4 anim-fade-up flex-shrink-0 flex items-start justify-between">
        <div>
          <h1 className="section-title text-2xl mb-1">🤖 AI Assistant</h1>
          <p className="text-slate-400 text-sm">Powered by Claude · Personalized to your profile · 🎤 Voice enabled</p>
        </div>
        <button
          onClick={() => { setVoiceEnabled(v => !v); if (speaking) stopSpeaking(); }}
          className={`btn-ghost text-xs px-3 py-2 flex items-center gap-2 border rounded-xl transition-all ${voiceEnabled ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-300' : 'border-slate-700 text-slate-400'}`}>
          {voiceEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
        </button>
      </div>

      <div className="flex-1 card overflow-hidden flex flex-col anim-fade-up anim-delay-1 min-h-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scroll">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0 font-bold ${msg.role === 'assistant' ? 'bg-indigo-500/20 text-indigo-300 text-base' : 'bg-emerald-500/20 text-emerald-300'}`}>
                {msg.role === 'assistant' ? '🤖' : (user?.name?.[0] || 'S')}
              </div>
              <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'assistant' ? 'glass-sm text-slate-200' : 'bg-indigo-500 text-white'}`}>
                {msg.role === 'assistant' ? <div className="space-y-0.5">{renderContent(msg.content)}</div> : <span>{msg.content}</span>}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center text-base">🤖</div>
              <div className="glass-sm rounded-2xl px-4 py-3 flex gap-1.5 items-center">
                {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay:`${i*0.15}s` }}/>)}
                <span className="text-slate-500 text-xs ml-2">Claude is thinking…</span>
              </div>
            </div>
          )}

          {speaking && (
            <div className="flex items-center gap-2 text-xs text-indigo-400 px-2">
              <div className="flex gap-0.5 items-end">
                {[6,10,14,10,6].map((h,i) => (
                  <div key={i} className="w-1 bg-indigo-400 rounded-full animate-pulse" style={{ height:`${h}px`, animationDelay:`${i*0.1}s` }}/>
                ))}
              </div>
              <span>Speaking…</span>
              <button onClick={stopSpeaking} className="text-slate-500 hover:text-slate-200 ml-1 text-xs">✕ Stop</button>
            </div>
          )}

          {listening && (
            <div className="flex items-center gap-2 text-xs text-rose-400 px-2">
              <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping"/>
              <span>Listening… speak your question</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-slate-800 p-4 flex-shrink-0">
          <div className="flex gap-2 overflow-x-auto no-scroll pb-2 mb-3">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)} disabled={loading}
                className="btn-ghost text-xs py-1.5 px-3 whitespace-nowrap flex-shrink-0 border border-slate-700 hover:border-indigo-500/40 disabled:opacity-40">
                {s}
              </button>
            ))}
          </div>

          {error && <p className="text-xs text-amber-400 mb-2 bg-amber-500/10 px-3 py-1.5 rounded-lg">⚠️ {error}</p>}

          <div className="flex gap-2">
            <button
              onClick={listening ? stopListening : startListening}
              disabled={loading}
              title={listening ? 'Stop listening' : 'Click to speak your question'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all border ${
                listening ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-700 hover:border-indigo-500/40 text-slate-400 hover:text-indigo-300'
              }`}>
              {listening ? '⏹' : '🎤'}
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send(input))}
              placeholder={listening ? '🎤 Listening…' : 'Ask anything about your academics…'}
              className="input flex-1 text-sm"
              disabled={loading || listening}
            />
            <button onClick={() => send(input)} disabled={loading || !input.trim() || listening}
              className="btn-primary px-5 text-sm disabled:opacity-40">
              Send
            </button>
          </div>
          <p className="text-slate-600 text-[10px] mt-2 font-mono">Claude AI · 🎤 Voice input supported · 🔊 Toggle voice output above</p>
        </div>
      </div>
    </div>
  );
}
