import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import StudentDashboard from './pages/StudentDashboard';
import Predictor from './pages/Predictor';
import Courses from './pages/Courses';
import Recommendations from './pages/Recommendations';
import MyPoints from './pages/MyPoints';
import AIChat from './pages/AIChat';
import Leaderboard from './pages/Leaderboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AwardPoints from './pages/AwardPoints';
import StudentsPage from './pages/StudentsPage';
import Analytics from './pages/Analytics';
import AtRisk from './pages/AtRisk';
import Notifications from './pages/Notifications';
import Assignments from './pages/Assignments';
import AIEvaluator from './pages/AIEvaluator';
import ToastContainer from './components/ToastContainer';
import { useAuthStore } from './hooks';

function useSidebarWidth() {
  const [w, setW] = useState(() => {
    const s = localStorage.getItem('sidebar-width');
    return s ? parseInt(s) : 240;
  });
  useEffect(() => {
    const id = setInterval(() => {
      const s = localStorage.getItem('sidebar-width');
      if (s) setW(parseInt(s));
    }, 50);
    return () => clearInterval(id);
  }, []);
  return w;
}

const PAGE_TITLES: Record<string, string> = {
  student: 'Dashboard', teacher: 'Overview', predictor: 'Performance Predictor',
  courses: 'Course Library', recommend: 'Recommendations', points: 'My Points',
  chat: 'AI Assistant', leaderboard: 'Leaderboard', notifications: 'Notifications',
  assignments: 'Assignments', award: 'Award Points', students: 'All Students',
  analytics: 'Analytics', atrisk: 'At-Risk Students', evaluator: 'AI Evaluator',
};

export default function App() {
  const { user, role, isAuthenticated } = useAuthStore();
  const sidebarW = useSidebarWidth();
  const [page, setPage] = useState(() => {
    if (!user) return 'login';
    return role === 'teacher' ? 'teacher' : 'student';
  });
  const [history, setHistory] = useState<string[]>([]);

  const navigateTo = (p: string) => {
    if (p !== page) setHistory(h => [...h.slice(-10), page]);
    setPage(p);
  };
  const goBack = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setPage(prev);
  };
  const homePage = role === 'teacher' ? 'teacher' : 'student';

  useEffect(() => { if (!isAuthenticated) setPage('login'); }, [isAuthenticated]);
  useEffect(() => {
    const main = document.getElementById('main-content');
    if (main) main.scrollTop = 0;
  }, [page]);

  if (!isAuthenticated) {
    return (
      <>
        <Login onLogin={() => { setHistory([]); setPage(role === 'teacher' ? 'teacher' : 'student'); }} />
        <ToastContainer />
      </>
    );
  }

  const renderPage = () => {
    if (page === 'notifications') return <Notifications setPage={navigateTo} />;
    if (page === 'assignments')   return <Assignments />;
    if (role === 'teacher') {
      switch (page) {
        case 'teacher':     return <TeacherDashboard setPage={navigateTo} />;
        case 'award':       return <AwardPoints />;
        case 'students':    return <StudentsPage />;
        case 'analytics':   return <Analytics />;
        case 'atrisk':      return <AtRisk />;
        case 'leaderboard': return <Leaderboard />;
        case 'chat':        return <AIChat />;
        case 'evaluator':   return <AIEvaluator />;
        default:            return <TeacherDashboard setPage={navigateTo} />;
      }
    }
    switch (page) {
      case 'student':     return <StudentDashboard setPage={navigateTo} />;
      case 'predictor':   return <Predictor />;
      case 'courses':     return <Courses />;
      case 'recommend':   return <Recommendations />;
      case 'points':      return <MyPoints />;
      case 'chat':        return <AIChat />;
      case 'leaderboard': return <Leaderboard />;
      case 'evaluator':   return <AIEvaluator />;
      default:            return <StudentDashboard setPage={navigateTo} />;
    }
  };

  const pageTitle = PAGE_TITLES[page] || 'EduPredict';

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#020617' }}>
      <Sidebar page={page} setPage={navigateTo} />

      {/* ── Right side: topbar + content ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          marginLeft: `${sidebarW}px`,
          transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* ── Fixed desktop top bar ── */}
        <header
          id="desktop-topbar"
          style={{
            position: 'fixed',
            top: 0,
            // starts right after the sidebar
            left: `${sidebarW}px`,
            right: 0,
            height: '56px',
            zIndex: 30,
            background: 'rgba(2,6,23,0.92)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(148,163,184,0.08)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 1.5rem',
            gap: '1rem',
            transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {/* Back button + Breadcrumb */}
          <div style={{ display:'flex', alignItems:'center', gap:'10px', flex:1, minWidth:0 }}>
            {history.length > 0 && page !== homePage && (
              <button
                onClick={goBack}
                style={{
                  display:'flex', alignItems:'center', gap:5,
                  padding:'4px 12px', borderRadius:8,
                  background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.25)',
                  color:'#a5b4fc', fontSize:12, fontWeight:700, cursor:'pointer',
                  fontFamily:'inherit', flexShrink:0, transition:'all .15s',
                }}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(99,102,241,0.2)';}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(99,102,241,0.1)';}}
              >
                ← Back
              </button>
            )}
            <span style={{ fontSize:'11px', color:'#475569', fontFamily:"'JetBrains Mono',monospace", cursor:'pointer', flexShrink:0 }}
              onClick={() => navigateTo(homePage)}>EduPredict</span>
            <span style={{ color:'#334155', fontSize:'12px', flexShrink:0 }}>›</span>
            <span style={{ fontSize:'13px', fontWeight:700, color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {pageTitle}
            </span>
          </div>

          {/* User info */}
          {user && (
            <div style={{ display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#e2e8f0', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{user.name}</div>
                <div style={{ fontSize:'10px', color:'#475569', fontFamily:"'JetBrains Mono',monospace", textTransform:'capitalize' }}>{role}</div>
              </div>
            </div>
          )}
        </header>

        {/* Mobile topbar offset via inline style (works regardless of Tailwind) */}
        <style>{`
          @media (max-width: 767px) {
            #desktop-topbar { display: none !important; }
            #main-content { padding-top: 56px !important; }
          }
          @media (min-width: 768px) {
            #main-content { padding-top: 56px !important; }
          }
        `}</style>

        {/* ── Scrollable page content ── */}
        <main
          id="main-content"
          style={{
            flex: 1,
            overflowY: 'auto',
            height: '100vh',
          }}
        >
          <div
            style={{
              maxWidth: '960px',
              margin: '0 auto',
              padding: '28px 28px 72px',
              width: '100%',
            }}
          >
            {renderPage()}
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
