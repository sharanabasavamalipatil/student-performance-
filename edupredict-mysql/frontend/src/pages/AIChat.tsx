import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore } from '../hooks';
import { DEMO_USERS, toast } from '../store';

interface Message {
  role: 'user' | 'ai';
  content: string;
  ts: number;
  isVoice?: boolean;
}

// ── AI Response Logic ─────────────────────────────────────────────────────────
function aiRespond(msg: string, user: any, studentUser: any): string {
  const q = msg.toLowerCase();
  const cgpa = studentUser?.cgpa ?? 7.0;
  const branch = studentUser?.branch ?? 'Computer Science';
  const semester = studentUser?.semester ?? 4;
  const name = user?.name?.split(' ')[0] || 'there';

  if (q.includes('hello') || q.includes('hi') || q.includes('hey'))
    return `Hello ${name}! 👋 I'm your AI academic assistant.\n\nI can help you with:\n• 📊 CGPA analysis & improvement tips\n• 📚 Course recommendations\n• 💼 Career & placement guidance\n• 🧘 Study tips & stress management\n• 🔮 Performance predictions\n\nWhat's on your mind?`;

  if (q.includes('cgpa') || q.includes('gpa') || q.includes('grade')) {
    if (cgpa >= 8.5) return `Your CGPA of ${cgpa} is excellent! 🌟 You're in the top 10% of your cohort.\n\nNext steps:\n• Apply for research internships (CGPA > 8.5 is a great qualifier)\n• Start working on a capstone project\n• Target top-tier companies in placements\n• Consider pursuing higher studies (M.Tech/MS)`;
    if (cgpa >= 7.0) return `Your CGPA of ${cgpa} is good! Here's how to push it higher:\n\n1. 📖 Revise lecture notes within 24 hours\n2. 🤝 Form study groups for tough subjects\n3. 📝 Solve previous year question papers\n4. 🙋 Ask faculty for doubt sessions\n5. 📅 Start exam prep 3 weeks in advance\n\nAim for 8+ next semester — you can do it! 💪`;
    return `Your CGPA of ${cgpa} needs attention. Here's a recovery plan:\n\n⚠️ First — clear any backlogs immediately\n📅 Create a daily 4-hour study schedule\n🤝 Join study groups or find a study partner\n👨‍🏫 Consult faculty for academic guidance\n📚 Focus on core subjects that carry more credits\n\nMany successful engineers had setbacks. What matters is the turnaround! 💙`;
  }

  if (q.includes('course') || q.includes('learn') || q.includes('recommend')) {
    if (branch === 'Computer Science') return `For ${branch} Semester ${semester}, here's your roadmap:\n\n🥇 **Must-do now:**\n• Data Structures & Algorithms (freeCodeCamp)\n• Machine Learning (Stanford Online)\n\n🥈 **High value:**\n• Full Stack Web Development (Traversy Media)\n• System Design (Gaurav Sen)\n\n🥉 **Foundational:**\n• Git & GitHub (freeCodeCamp)\n• SQL & Database Design (Mosh)\n\nAll free on YouTube! Check the 📚 Courses tab!`;
    if (branch === 'Data Science') return `For ${branch}, focus on this stack:\n\n1. **Python + Pandas** — core data wrangling\n2. **Statistics** (StatQuest) — mathematical backbone\n3. **Machine Learning** — career essential\n4. **SQL** — every data job needs this\n5. **Data Visualization** — communication skill\n\nCheck the ⭐ Recommendations tab for personalized picks!`;
    if (branch === 'Mechanical') return `For ${branch}, here's your learning path:\n\n🔧 **Design & Simulation:**\n• SolidWorks CAD (industry standard)\n• FEA with ANSYS (simulation skills)\n\n💻 **Cross-domain (high value):**\n• Python for Engineers (automation)\n• Embedded Systems & IoT (mechatronics)\n\nThese will make you stand out in campus placements!`;
    return `Based on your ${branch} branch, check the ⭐ Recommendations tab for personalized courses with YouTube links!`;
  }

  if (q.includes('placement') || q.includes('job') || q.includes('career') || q.includes('interview'))
    return `Placement roadmap for ${branch}:\n\n📌 **6 months before:**\n• Solve 150+ DSA problems on LeetCode\n• Build 2-3 solid GitHub projects\n• Get AWS/Google Cloud certified\n\n📌 **3 months before:**\n• Practice mock interviews (Pramp, Interviewing.io)\n• Polish your resume & LinkedIn\n• Apply to internships for experience\n\n📌 **1 month before:**\n• System design practice\n• HR & behavioral questions\n• Research target companies\n\nWith CGPA ${cgpa}: target ${cgpa >= 7 ? 'Infosys, Cognizant, Capgemini (Tier-1)' : 'TCS, Wipro, Tech Mahindra (Tier-2 — step up from here!)'} 🎯`;

  if (q.includes('stress') || q.includes('anxiety') || q.includes('mental') || q.includes('burnout'))
    return `Your wellbeing matters most! 💙\n\nEvidence-based strategies:\n\n🧘 **Mindfulness:** 10 min daily meditation\n🏃 **Exercise:** 30 min walk — releases endorphins\n😴 **Sleep:** 7-8 hours consolidates memory\n📅 **Planning:** Break big tasks into small steps\n🤝 **Talk:** Friends, family, or campus counselor\n🎮 **Breaks:** Pomodoro — 25 min study, 5 min rest\n\nYou're not alone. Most students go through this. It gets better! 🌅`;

  if (q.includes('python') || q.includes('programming'))
    return `Python learning path (0 to job-ready):\n\n**Week 1-2:** Syntax, loops, functions\n→ Programming with Mosh (YouTube FREE)\n\n**Week 3-4:** OOP, file handling, libraries\n**Month 2:** NumPy, Pandas, Matplotlib\n**Month 3:** Build 3 projects:\n• Web scraper\n• Data dashboard\n• Automation script\n\nCheck 📚 Courses tab → search "Python" for the full YouTube course!`;

  if (q.includes('backlog') || q.includes('fail'))
    return `Backlogs are stressful but absolutely recoverable! Here's how:\n\n1. 📋 List all pending subjects + exam dates\n2. 📄 Solve last 5 years' question papers (most questions repeat!)\n3. 👥 Join a study group for tough subjects\n4. ⏰ Dedicate 2 focused hours daily per backlog\n5. 👨‍🏫 Attend faculty's extra classes\n\nMany IIT/NIT graduates had backlogs. The comeback is always possible! 💪`;

  if (q.includes('semester') || q.includes('credit'))
    return `You're in Semester ${semester}. Key tips for this semester:\n\n• Master fundamentals — they compound in later sems\n• Attend every lab session (practical marks are crucial)\n• Form study groups in Week 1 (not Week 13!)\n• Track all assignment deadlines in a calendar\n• Start exam prep 3 weeks before, not 3 days!\n\nWant course recommendations for Sem ${semester}?`;

  if (q.includes('project') || q.includes('github'))
    return `Great projects unlock jobs! Here's what to build:\n\n🔥 **High-impact project ideas for ${branch}:**\n${ branch === 'Computer Science' ? '• Student Performance Predictor (ML + React)\n• Real-time Chat App (WebSockets)\n• E-commerce platform (Full stack)\n• Automated Testing Bot' : branch === 'Data Science' ? '• COVID-19 Data Dashboard\n• Stock Price Predictor (LSTM)\n• Sentiment Analysis Tool\n• Movie Recommendation System' : '• Automation using Python + Arduino\n• CAD model portfolio on GrabCAD\n• IoT-based smart home system\n• FEA simulation case studies' }\n\n📌 Put everything on GitHub with a clear README. Recruiters check GitHub!`;

  return `That's a great question! I can help you with:\n\n• 📊 CGPA analysis for ${branch}\n• 📚 Course recommendations (with YouTube links!)\n• 💼 Career planning & placements\n• 🧘 Study strategies & mental wellness\n• 🔮 Performance predictions\n\nCould you be more specific? Try: "What courses should I take?" or "How to improve my CGPA?"`;
}


// ── Teacher AI Response ───────────────────────────────────────────────────────
function aiRespondTeacher(msg: string, user: any, teacherUser: any): string {
  const q = msg.toLowerCase();
  const name = user?.name?.split(' ')[0] || 'Professor';
  const dept = teacherUser?.department ?? 'your department';
  const subject = teacherUser?.subject ?? 'your subject';

  if (q.includes('hello') || q.includes('hi') || q.includes('hey'))
    return `Hello ${name}! 👋 I'm your AI faculty assistant.\n\nI can help you with:\n• 📊 Analysing class performance\n• 🚨 Strategies for at-risk students\n• 📚 Course & curriculum advice\n• 🏅 Student motivation & engagement\n• 📝 Teaching best practices for ${subject}\n\nWhat would you like help with today?`;

  if (q.includes('at-risk') || q.includes('struggling') || q.includes('failing') || q.includes('weak'))
    return `Strategies for at-risk students in ${dept}:\n\n🔍 **Early Detection:**\n• Monitor attendance drops > 3 consecutive days\n• Watch for CGPA below 6.0 — intervene immediately\n• Check assignment submission rates weekly\n\n📞 **Intervention:**\n• One-on-one counselling sessions\n• Assign a peer mentor (top student pairing)\n• Break syllabus into smaller, manageable chunks\n• Create a personalised improvement plan\n\n🏅 **Motivation:**\n• Award points for small wins (EduPredict Award Points)\n• Celebrate improvement, not just top scores\n• Set short-term achievable targets\n\nThe EduPredict At-Risk page shows all students needing immediate attention!`;

  if (q.includes('engag') || q.includes('motivat') || q.includes('participat'))
    return `Student Engagement Strategies for ${subject}:\n\n🎮 **Gamification (built into EduPredict!):**\n• Award points for active participation\n• Run leaderboard challenges weekly\n• Tier-based rewards (Bronze → Platinum)\n\n📚 **Pedagogy:**\n• Start classes with a 2-min real-world problem\n• Use peer teaching for complex topics\n• Incorporate YouTube videos (see Courses tab)\n• Weekly quizzes with points rewards\n\n🤝 **Community:**\n• Study group formation in Week 1\n• Hackathon/project competitions\n• Industry guest lectures\n\nStudents with 60+ EduPredict points show 34% higher engagement on average!`;

  if (q.includes('cgpa') || q.includes('grade') || q.includes('performance') || q.includes('improve class'))
    return `Improving Class Average CGPA:\n\n📊 **Current class avg: 7.54** — here's how to push it higher:\n\n📝 **Assessment Design:**\n• Continuous assessment (30%) reduces exam pressure\n• Include application-based questions, not just theory\n• Provide detailed feedback within 48 hours\n\n📚 **Teaching:**\n• Map each lecture to a real career application\n• Use the EduPredict Courses tab — free YouTube resources\n• Flipped classroom: students watch videos, class = problems\n\n🎯 **Targeting the middle tier:**\n• Students at 6.0-7.0 CGPA have the most upside potential\n• Small improvements here move the class average significantly\n• Personalised attention pays off most here\n\nCheck Analytics → Performance Trends to track week-on-week improvement!`;

  if (q.includes('course') || q.includes('curriculum') || q.includes('recommend') || q.includes('teach'))
    return `Course & Curriculum Tips for ${dept}:\n\n📌 **Supplement with free YouTube resources:**\n• Students learn better with multiple explanations\n• EduPredict Courses tab has curated resources by branch\n• Assign specific videos as pre-class preparation\n\n🔗 **High-value topics to emphasise:**\n${dept === 'Computer Science' ? '• DSA — #1 skill for placements\n• Cloud/DevOps — fastest growing area\n• ML/AI basics — cross-domain demand' : dept === 'Data Science' ? '• Python + Pandas — core data skill\n• SQL — every data job needs it\n• Statistics — mathematical foundation' : '• CAD/Simulation tools (SolidWorks, ANSYS)\n• IoT & Embedded Systems — modern relevance\n• Python for automation — cross-domain value'}\n\n📈 **Connect curriculum to placements:**\n• Share which topics appear in interviews\n• Invite alumni to talk about real-world usage\n• Run mini-projects for each major topic`;

  if (q.includes('award') || q.includes('points') || q.includes('reward'))
    return `Using EduPredict Points to Motivate Students:\n\n🏅 **Best practices for awarding points:**\n\n• **Consistency:** Award points same day as the achievement\n• **Transparency:** Tell students publicly what earns points\n• **Variety:** Mix academic (quiz, project) with social (mentoring, clubs)\n\n📊 **Point values that work:**\n• Assignment completed: 5 pts (low barrier, builds habit)\n• Quiz performance: 10 pts (encourages preparation)\n• Project submitted: 15 pts (encourages initiative)\n• Hackathon: 20 pts (rewards ambition)\n• Research paper: 40 pts (highest academic value)\n\n🎯 **Impact:**\n• Bronze → Silver jump (60 pts): students feel first milestone\n• Gold tier (120 pts): motivates top students to push further\n• Points = ATS resume boost for placements!\n\nGo to Award Points in the sidebar to get started!`;

  if (q.includes('analytics') || q.includes('data') || q.includes('report') || q.includes('trend'))
    return `Using EduPredict Analytics Effectively:\n\n📈 **What to track weekly:**\n• Class average CGPA trend (improving or declining?)\n• Attendance correlation with performance\n• Distribution shift (more Excellent, fewer At-Risk?)\n• Points awarded vs engagement levels\n\n🚨 **Red flags to act on immediately:**\n• Any student dropping below 6.0 CGPA\n• Attendance below 75% (exam debar risk)\n• No points awarded to a student in 3+ weeks\n\n📊 **Using the data:\n• Share anonymised class stats with students (motivates improvement)\n• Identify which topics cause the most grade drops\n• Compare semester-on-semester to measure teaching effectiveness\n\nCheck the Analytics page for the full breakdown!`;

  if (q.includes('stress') || q.includes('mental') || q.includes('wellbeing') || q.includes('counsel'))
    return `Supporting Student Mental Health:\n\n💙 **Signs to watch for:**\n• Sudden drop in attendance or submission rates\n• Withdrawn behaviour in class discussions\n• Significant grade decline over 2+ weeks\n\n🤝 **What you can do:**\n• Private check-in conversation (non-judgmental)\n• Refer to campus counselling services\n• Flexible deadline (with documentation) when appropriate\n• Award points for effort, not just results\n\n📋 **Campus resources to share:**\n• Student counselling cell\n• Peer support programs\n• Academic remediation support\n\nEmpathy from faculty is one of the strongest retention factors. A 5-minute check-in can change a student's trajectory! 💙`;

  return `Great question for ${dept}! I can help you with:\n\n• 🚨 At-risk student intervention strategies\n• 📊 Class performance improvement\n• 🎮 Student engagement & gamification\n• 📚 Course recommendations to supplement your teaching\n• 🏅 Using EduPredict's points system effectively\n• 📈 Reading the analytics dashboard\n\nCould you be more specific? For example: "How to help my at-risk students?" or "Best engagement strategies for ${subject}?"`;
}

// ── Voice hook ────────────────────────────────────────────────────────────────
function useVoice(onTranscript: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN';
      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        onTranscript(transcript);
        setListening(false);
      };
      rec.onerror = () => { setListening(false); toast.error('Voice error', 'Could not hear you. Try again.'); };
      rec.onend = () => setListening(false);
      recRef.current = rec;
    }
  }, []);

  const toggle = useCallback(() => {
    if (!recRef.current) return;
    if (listening) { recRef.current.stop(); setListening(false); }
    else { recRef.current.start(); setListening(true); toast.info('Listening…', 'Speak your question'); }
  }, [listening]);

  return { listening, supported, toggle };
}

// ── Text to Speech ────────────────────────────────────────────────────────────
function speak(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  // Clean markdown for speech
  const clean = text.replace(/\*\*/g, '').replace(/•/g, '').replace(/\n+/g, '. ').slice(0, 500);
  const utt = new SpeechSynthesisUtterance(clean);
  utt.lang = 'en-IN';
  utt.rate = 0.95;
  utt.pitch = 1.05;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Female'))
    || voices.find(v => v.lang.startsWith('en'));
  if (preferred) utt.voice = preferred;
  window.speechSynthesis.speak(utt);
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MsgBubble({ m, onSpeak }: { m: Message; onSpeak: () => void }) {
  const isAI = m.role === 'ai';
  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'} items-end gap-2`}>
      {isAI && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 mb-1"
          style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}>🤖</div>
      )}
      <div className="flex flex-col gap-1 max-w-[80%]">
        <div
          className="rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed"
          style={isAI
            ? { background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(148,163,184,0.12)', color: '#e2e8f0' }
            : { background: '#6366f1', color: 'white' }
          }
        >
          {m.content}
        </div>
        <div className={`flex items-center gap-2 ${isAI ? 'justify-start' : 'justify-end'}`}>
          <span className="text-[10px] text-slate-600">{new Date(m.ts).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</span>
          {m.isVoice && <span className="text-[10px] text-indigo-400">🎤 voice</span>}
          {isAI && (
            <button onClick={onSpeak} className="text-[10px] text-slate-500 hover:text-indigo-400 transition-colors" title="Read aloud">🔊</button>
          )}
        </div>
      </div>
      {!isAI && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mb-1"
          style={{ background: 'rgba(99,102,241,0.3)', border: '1px solid rgba(99,102,241,0.5)', color: '#a5b4fc' }}>
          You
        </div>
      )}
    </div>
  );
}

// ── Main Chat ─────────────────────────────────────────────────────────────────
export default function AIChat() {
  const { user, role } = useAuthStore();
  const studentUser = DEMO_USERS.students.find(s => s.id === user?.id);
  const teacherUser = DEMO_USERS.teachers.find(t => t.id === user?.id);
  const isTeacher = role === 'teacher';

  const welcomeMsg = isTeacher
    ? `Hello ${user?.name?.split(' ')[0] || ''}! 👋 I'm your AI faculty assistant.\n\nI can help you with:\n• 📊 Class performance analysis\n• 🚨 At-risk student strategies\n• 📚 Course & curriculum advice\n• 🏅 Student engagement tips\n• 📝 Teaching best practices\n\n🎤 Click the mic button to speak your question!`
    : `Hello ${user?.name?.split(' ')[0] || ''}! 👋 I'm your AI academic assistant.\n\nAsk me anything about courses, CGPA improvement, career guidance, or study strategies!\n\n🎤 You can also use the microphone button to speak your questions!`;

  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: welcomeMsg, ts: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleTranscript = (transcript: string) => {
    setInput(transcript);
    // Auto-send after voice input
    setTimeout(() => sendMessage(transcript, true), 300);
  };

  const { listening, supported, toggle: toggleVoice } = useVoice(handleTranscript);

  const sendMessage = async (text: string, isVoice = false) => {
    const userMsg = text.trim();
    if (!userMsg || loading) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', content: userMsg, ts: Date.now(), isVoice }]);
    setLoading(true);
    await new Promise(r => setTimeout(r, 700 + Math.random() * 500));
    const reply = isTeacher ? aiRespondTeacher(userMsg, user, teacherUser) : aiRespond(userMsg, user, studentUser);
    setMessages(m => [...m, { role: 'ai', content: reply, ts: Date.now() }]);
    setLoading(false);
    if (autoSpeak || isVoice) {
      setSpeaking(true);
      speak(reply);
      setTimeout(() => setSpeaking(false), 4000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };

  const handleSpeak = (content: string) => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); }
    else { setSpeaking(true); speak(content); setTimeout(() => setSpeaking(false), 8000); }
  };

  const quickPrompts = isTeacher ? [
    'How to help at-risk students?',
    'Best student engagement strategies',
    'How to improve class average CGPA?',
    'Tips for motivating students',
    'How to identify struggling students early?',
    'Course recommendations for my department',
  ] : [
    'Recommend courses for me',
    'How to improve my CGPA?',
    'Placement preparation tips',
    'I feel stressed about exams',
    'What projects should I build?',
    'Python learning path',
  ];

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-start justify-between mb-4 anim-fade-up">
        <div>
          <h1 className="text-2xl font-bold mb-1">🤖 AI Assistant</h1>
          <p className="text-slate-400 text-sm">Ask anything — type or speak your question</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {/* Auto-speak toggle */}
          <button
            onClick={() => setAutoSpeak(p => !p)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all"
            style={autoSpeak
              ? { background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)' }
              : { background: 'rgba(30,41,59,0.5)', color: '#64748b', border: '1px solid rgba(148,163,184,0.1)' }
            }
            title="Auto-speak AI replies"
          >
            🔊 {autoSpeak ? 'Auto-speak ON' : 'Auto-speak OFF'}
          </button>
          {speaking && (
            <button onClick={() => { window.speechSynthesis.cancel(); setSpeaking(false); }}
              className="text-xs px-3 py-1.5 rounded-full animate-pulse"
              style={{ background: 'rgba(244,63,94,0.15)', color: '#f87171', border: '1px solid rgba(244,63,94,0.3)' }}>
              ⏹ Stop
            </button>
          )}
        </div>
      </div>

      {/* Voice status banner */}
      {listening && (
        <div className="flex-shrink-0 mb-3 flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)' }}>
          <div className="flex gap-1">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="w-1 rounded-full bg-rose-400"
                style={{ height: `${8 + Math.random() * 16}px`, animation: `voiceBar 0.5s ease-in-out ${i * 0.1}s infinite alternate` }} />
            ))}
          </div>
          <span className="text-rose-300 text-sm font-medium">Listening… speak your question</span>
          <button onClick={toggleVoice} className="ml-auto text-xs text-rose-400 hover:text-rose-300">Cancel</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-2">
        {messages.map((m, i) => (
          <MsgBubble key={i} m={m} onSpeak={() => handleSpeak(m.content)} />
        ))}
        {loading && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}>🤖</div>
            <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(148,163,184,0.12)' }}>
              <div className="flex gap-1 items-center">
                {[0,150,300].map(d => (
                  <span key={d} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
                <span className="text-xs text-slate-500 ml-2">Thinking…</span>
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick prompts */}
      <div className="flex-shrink-0 mt-3">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {quickPrompts.map(p => (
            <button key={p} onClick={() => sendMessage(p)}
              className="btn-ghost text-xs py-1.5 px-3 rounded-full hover:border-indigo-500/40 transition-all">
              {p}
            </button>
          ))}
        </div>

        {/* Input bar */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={listening ? '🎤 Listening…' : 'Type a message or click 🎤 to speak…'}
            className="input text-sm flex-1"
            disabled={loading || listening}
          />

          {/* Mic button */}
          {supported && (
            <button
              type="button"
              onClick={toggleVoice}
              disabled={loading}
              className="flex items-center justify-center w-12 h-12 rounded-xl transition-all flex-shrink-0"
              style={listening
                ? { background: 'rgba(244,63,94,0.3)', border: '2px solid #f43f5e', animation: 'pulse 1s infinite' }
                : { background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(148,163,184,0.15)' }
              }
              title={listening ? 'Stop listening' : 'Speak your question'}
            >
              <span className="text-xl">{listening ? '⏹' : '🎤'}</span>
            </button>
          )}

          <button
            type="submit"
            disabled={loading || !input.trim() || listening}
            className="btn-primary px-5 text-sm disabled:opacity-40 flex-shrink-0"
          >
            Send
          </button>
        </form>

        {!supported && (
          <p className="text-xs text-slate-600 mt-1.5 text-center">
            Voice input not supported in this browser. Try Chrome for the best experience.
          </p>
        )}
      </div>

      <style>{`
        @keyframes voiceBar {
          from { transform: scaleY(0.4); opacity: 0.6; }
          to   { transform: scaleY(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
