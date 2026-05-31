import { useAuthStore, usePointsStore } from '../hooks';
import { getTier, initials, avatarColor, notifCenterStore } from '../store';
import { useState, useEffect, useRef, useCallback } from 'react';
import NotificationCenter from './NotificationCenter';

interface Props { page: string; setPage: (p: string) => void; }

const STUDENT_NAV = [
  { id:'student',       icon:'🏠', label:'Dashboard'    },
  { id:'predictor',     icon:'🔮', label:'Predictor'    },
  { id:'courses',       icon:'📚', label:'Courses'      },
  { id:'assignments',   icon:'📝', label:'Assignments'  },
  { id:'recommend',     icon:'⭐', label:'Recommended'  },
  { id:'points',        icon:'🏅', label:'My Points'    },
  { id:'chat',          icon:'🤖', label:'AI Assistant' },
  { id:'leaderboard',   icon:'🏆', label:'Leaderboard'  },
  { id:'notifications', icon:'🔔', label:'Notifications'},
];
const TEACHER_NAV = [
  { id:'teacher',       icon:'📊', label:'Overview'     },
  { id:'award',         icon:'🏅', label:'Award Points' },
  { id:'students',      icon:'🎓', label:'Students'     },
  { id:'analytics',     icon:'📈', label:'Analytics'    },
  { id:'atrisk',        icon:'🚨', label:'At Risk'      },
  { id:'leaderboard',   icon:'🏆', label:'Leaderboard'  },
  { id:'chat',          icon:'🤖', label:'AI Assistant' },
  { id:'notifications', icon:'🔔', label:'Notifications'},
];

const MIN_W = 56;
const MAX_W = 300;
const DEF_W = 240;
const SNAP  = 72;

function useIsMobile() {
  const [mob, setMob] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMob(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mob;
}

export default function Sidebar({ page, setPage }: Props) {
  const { user, role, logout } = useAuthStore();
  const { getPoints, getNotifs } = usePointsStore();
  const isMobile  = useIsMobile();
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [width, setWidth]               = useState(() => {
    const s = localStorage.getItem('sidebar-width');
    return s ? parseInt(s) : DEF_W;
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartW = useRef(DEF_W);
  const collapsed  = width <= SNAP;

  useEffect(() => {
    if (!user) return;
    const update = () => setUnreadNotifs(notifCenterStore.getUnreadCount(user.id, role as 'student'|'teacher'));
    update();
    return notifCenterStore.subscribe(update);
  }, [user?.id, role]);

  useEffect(() => { setMobileOpen(false); }, [page]);
  useEffect(() => {
    document.body.style.overflow = (isMobile && mobileOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen, isMobile]);
  useEffect(() => { localStorage.setItem('sidebar-width', String(width)); }, [width]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    dragStartW.current = width;
    setIsDragging(true);
  }, [width]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      let w = dragStartW.current + (e.clientX - dragStartX.current);
      if (w < MIN_W + 10) w = MIN_W;
      else if (w < SNAP)  w = SNAP;
      if (w > MAX_W) w = MAX_W;
      setWidth(w);
    };
    const onUp = () => {
      setIsDragging(false);
      setWidth(w => { if (w <= SNAP) return MIN_W; if (w < 130) return DEF_W; return w; });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isDragging]);

  if (!user) return null;

  const nav          = role === 'teacher' ? TEACHER_NAV : STUDENT_NAV;
  const pts          = role === 'student' ? getPoints(user.id) : null;
  const tier         = pts !== null ? getTier(pts) : null;
  const pointsUnread = role === 'student' ? getNotifs(user.id).filter(n => !n.read).length : 0;
  const col          = avatarColor(user.name);

  /* ── Single nav link ── */
  const NavLink = ({ item }: { item: typeof STUDENT_NAV[0] }) => {
    const active     = page === item.id;
    const showBadge  = (item.id === 'points' && pointsUnread > 0) || (item.id === 'notifications' && unreadNotifs > 0);
    const badgeCount = item.id === 'notifications' ? unreadNotifs : pointsUnread;
    return (
      <button
        title={collapsed ? item.label : undefined}
        onClick={() => setPage(item.id)}
        style={{
          width:'100%', display:'flex', alignItems:'center',
          gap: collapsed ? 0 : '0.7rem',
          padding: collapsed ? '0.625rem' : '0.625rem 0.875rem',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius:'0.875rem',
          background: active ? 'rgba(99,102,241,0.18)' : 'transparent',
          color: active ? '#a5b4fc' : '#64748b',
          border: active ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
          cursor:'pointer', fontFamily:'inherit',
          fontWeight: active ? 600 : 500, fontSize:'0.875rem',
          transition:'all 0.15s', position:'relative',
        }}
        onMouseEnter={e => {
          if (!active) { (e.currentTarget as HTMLElement).style.background='rgba(30,41,59,0.6)'; (e.currentTarget as HTMLElement).style.color='#cbd5e1'; }
        }}
        onMouseLeave={e => {
          if (!active) { (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.color='#64748b'; }
        }}
      >
        <span style={{ fontSize:'1.05rem', flexShrink:0, position:'relative' }}>
          {item.icon}
          {collapsed && showBadge && (
            <span style={{ position:'absolute', top:'-3px', right:'-3px', width:'7px', height:'7px', borderRadius:'50%', background:'#f43f5e' }} />
          )}
        </span>
        {!collapsed && (
          <>
            <span style={{ flex:1, textAlign:'left', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.label}</span>
            {showBadge && (
              <span style={{ background:'#f43f5e', color:'white', fontSize:'10px', fontWeight:700, minWidth:'16px', height:'16px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px', flexShrink:0 }}>
                {badgeCount > 9 ? '9+' : badgeCount}
              </span>
            )}
            {item.id === 'chat' && (
              <span style={{ fontSize:'10px', padding:'2px 6px', borderRadius:'999px', background:'rgba(16,185,129,0.18)', color:'#34d399', fontWeight:700, flexShrink:0 }}>AI</span>
            )}
          </>
        )}
      </button>
    );
  };

  /* ── Inner content (shared by desktop + mobile drawer) ── */
  const Inner = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', padding:'1rem 0.875rem 0.75rem', borderBottom:'1px solid rgba(148,163,184,0.08)', minHeight:'56px', justifyContent:(collapsed && !mobile) ? 'center' : 'space-between', flexShrink:0 }}>
        {(!collapsed || mobile) && (
          <div style={{ display:'flex', alignItems:'center', gap:'0.625rem', minWidth:0 }}>
            <span style={{ fontSize:'1.5rem', flexShrink:0 }}>🎓</span>
            <div>
              <div style={{ fontWeight:800, fontSize:'0.95rem', letterSpacing:'-0.02em', background:'linear-gradient(135deg,#6366f1,#a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>EduPredict</div>
              <div style={{ fontSize:'9px', color:'#475569', fontFamily:"'JetBrains Mono',monospace", marginTop:1 }}>{role === 'teacher' ? 'Faculty Portal' : 'Student Portal'}</div>
            </div>
          </div>
        )}
        {collapsed && !mobile && <span style={{ fontSize:'1.5rem' }}>🎓</span>}
        <div style={{ display:'flex', gap:'4px', flexShrink:0 }}>
          <NotificationCenter userId={user.id} role={role as 'student'|'teacher'} setPage={setPage} />
          {mobile && (
            <button onClick={() => setMobileOpen(false)} style={{ color:'#64748b', width:'32px', height:'32px', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'8px', background:'rgba(30,41,59,0.5)', border:'none', cursor:'pointer', fontSize:'1.2rem' }}>×</button>
          )}
        </div>
      </div>

      {/* User pill */}
      {(!collapsed || mobile) && (
        <div style={{ padding:'0.625rem 0.875rem', borderBottom:'1px solid rgba(148,163,184,0.08)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.625rem', background:'rgba(30,41,59,0.65)', border:'1px solid rgba(148,163,184,0.08)', borderRadius:'0.875rem', padding:'0.625rem 0.75rem' }}>
            <div style={{ width:'32px', height:'32px', borderRadius:'9px', background:`${col}22`, border:`1.5px solid ${col}44`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'11px', color:col, flexShrink:0 }}>
              {initials(user.name)}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:'12px', color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.name}</div>
              <div style={{ fontSize:'10px', color:'#475569', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {role === 'teacher' ? (user as any).department : (user as any).branch}
              </div>
              {tier && <div style={{ fontSize:'10px', fontWeight:700, color:tier.color }}>{tier.badge} · {pts} pts</div>}
            </div>
          </div>
        </div>
      )}

      {/* Collapsed avatar */}
      {collapsed && !mobile && (
        <div style={{ display:'flex', justifyContent:'center', padding:'0.625rem 0', borderBottom:'1px solid rgba(148,163,184,0.08)', flexShrink:0 }}>
          <div title={user.name} style={{ width:'32px', height:'32px', borderRadius:'9px', background:`${col}22`, border:`1.5px solid ${col}44`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'11px', color:col }}>
            {initials(user.name)}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex:1, padding:'0.5rem', display:'flex', flexDirection:'column', gap:'2px', overflowY:'auto', scrollbarWidth:'none' }}>
        {nav.map(item => <NavLink key={item.id} item={item} />)}
      </nav>

      {/* Collapse toggle */}
      {!mobile && (
        <div style={{ padding:'0 0.5rem 0.5rem', flexShrink:0 }}>
          <button onClick={() => setWidth(w => w <= SNAP ? DEF_W : MIN_W)}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', padding:'8px', borderRadius:'10px', background:'rgba(30,41,59,0.35)', border:'1px solid rgba(148,163,184,0.06)', color:'#475569', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}
            title={collapsed ? 'Expand' : 'Collapse'}>
            <span style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition:'transform 0.3s', display:'inline-block', fontSize:'16px' }}>›</span>
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      )}

      {/* Sign out */}
      <div style={{ padding:'0 0.5rem 1rem', flexShrink:0 }}>
        <button onClick={logout}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'10px', borderRadius:'10px', background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.15)', color:'#f87171', fontSize:'13px', cursor:'pointer', fontFamily:'inherit', fontWeight:600, transition:'all .15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(244,63,94,0.18)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(244,63,94,0.08)'; }}>
          <span>←</span>
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── MOBILE: top bar (only < 768px) ── */}
      {isMobile && (
        <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 1rem', background:'rgba(2,6,23,0.98)', borderBottom:'1px solid rgba(148,163,184,0.08)', backdropFilter:'blur(14px)' }}>
          <button onClick={() => setMobileOpen(true)} style={{ display:'flex', flexDirection:'column', gap:'5px', alignItems:'center', justifyContent:'center', width:'36px', height:'36px', borderRadius:'10px', background:'rgba(30,41,59,0.7)', border:'1px solid rgba(148,163,184,0.1)', cursor:'pointer' }}>
            <span style={{ display:'block', width:'16px', height:'2px', borderRadius:'1px', background:'#94a3b8' }} />
            <span style={{ display:'block', width:'16px', height:'2px', borderRadius:'1px', background:'#94a3b8' }} />
            <span style={{ display:'block', width:'16px', height:'2px', borderRadius:'1px', background:'#94a3b8' }} />
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <span>🎓</span>
            <span style={{ fontWeight:800, background:'linear-gradient(135deg,#6366f1,#a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>EduPredict</span>
          </div>
          <NotificationCenter userId={user.id} role={role as 'student'|'teacher'} setPage={setPage} />
        </div>
      )}

      {/* ── MOBILE: overlay + drawer ── */}
      {isMobile && mobileOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:40, background:'rgba(2,6,23,0.7)', backdropFilter:'blur(4px)' }} onClick={() => setMobileOpen(false)} />
      )}
      {isMobile && (
        <aside style={{ position:'fixed', left:0, top:0, height:'100vh', width:'280px', display:'flex', flexDirection:'column', zIndex:50, background:'rgba(10,15,30,0.99)', borderRight:'1px solid rgba(148,163,184,0.1)', backdropFilter:'blur(20px)', transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)', transition:'transform 0.3s cubic-bezier(0.4,0,0.2,1)' }}>
          <Inner mobile />
        </aside>
      )}

      {/* ── DESKTOP: fixed left sidebar ── */}
      {!isMobile && (
        <aside style={{ position:'fixed', left:0, top:0, height:'100vh', display:'flex', flexDirection:'column', zIndex:40, width:`${width}px`, background:'rgba(10,15,30,0.97)', borderRight:'1px solid rgba(148,163,184,0.08)', backdropFilter:'blur(16px)', userSelect: isDragging ? 'none' : 'auto', transition: isDragging ? 'none' : 'width 0.25s cubic-bezier(0.4,0,0.2,1)' }}>
          <Inner />
          {/* Drag handle */}
          <div onMouseDown={onMouseDown} onDoubleClick={() => setWidth(w => w <= SNAP ? DEF_W : MIN_W)}
            style={{ position:'absolute', top:0, right:0, height:'100%', width:'8px', cursor:'col-resize', zIndex:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:'3px', height:'48px', borderRadius:'2px', background: isDragging ? 'rgba(99,102,241,0.8)' : 'rgba(148,163,184,0.12)', transition:'background 0.2s' }} />
          </div>
        </aside>
      )}
    </>
  );
}
