'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, usePointsStore, getTier, initials, avatarColor } from '@/store';
import toast from 'react-hot-toast';

const STUDENT_NAV = [
  { href:'/student',           icon:'🏠', label:'Dashboard'     },
  { href:'/student/points',    icon:'🏅', label:'My Points'     },
  { href:'/student/predictor', icon:'🔮', label:'Predictor'     },
  { href:'/student/courses',   icon:'📚', label:'Courses'       },
  { href:'/student/chat',      icon:'🤖', label:'AI Assistant'  },
  { href:'/leaderboard',       icon:'🏆', label:'Leaderboard'   },
];

const TEACHER_NAV = [
  { href:'/teacher',           icon:'📊', label:'Overview'      },
  { href:'/teacher/points',    icon:'🏅', label:'Award Points'  },
  { href:'/teacher/students',  icon:'🎓', label:'Students'      },
  { href:'/teacher/analytics', icon:'📈', label:'Analytics'     },
  { href:'/teacher/at-risk',   icon:'🚨', label:'At Risk'       },
  { href:'/leaderboard',       icon:'🏆', label:'Leaderboard'   },
];

export default function Sidebar() {
  const { user, role, logout } = useAuthStore();
  const { getPoints, getNotifs } = usePointsStore();
  const pathname = usePathname();
  const router   = useRouter();
  if (!user) return null;

  const nav = role === 'teacher' ? TEACHER_NAV : STUDENT_NAV;
  const pts  = role === 'student' ? getPoints(user.id) : null;
  const tier = pts !== null ? getTier(pts) : null;
  const unreadNotifs = role === 'student' ? getNotifs(user.id).filter(n => !n.read).length : 0;
  const col  = avatarColor(user.name);

  const handleLogout = () => { logout(); toast.success('Logged out'); router.push('/login'); };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass border-r border-slate-800/50 flex flex-col z-40 pt-0">
      {/* Brand */}
      <div className="px-5 pt-6 pb-4 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎓</span>
          <div>
            <div className="font-display font-bold text-lg text-gradient">EduPredict</div>
            <div className="text-[10px] text-slate-500 font-mono">v2.0 · {role === 'teacher' ? 'Faculty Portal' : 'Student Portal'}</div>
          </div>
        </div>
      </div>

      {/* User card */}
      <div className="px-4 py-4 border-b border-slate-800/50">
        <div className="glass-sm rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm flex-shrink-0"
            style={{ background:`${col}22`, color:col, border:`1px solid ${col}44` }}>
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm text-slate-100 truncate">{user.name}</div>
            <div className="text-xs text-slate-500 truncate">{role === 'teacher' ? user.department : user.branch}</div>
            {tier && <div className="text-[10px] font-bold mt-0.5" style={{ color: tier.color }}>{tier.badge} · {pts} pts</div>}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scroll">
        {nav.map(item => {
          const active = pathname === item.href || (item.href !== '/leaderboard' && item.href !== '/student' && item.href !== '/teacher' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={active ? 'sidebar-active' : 'sidebar-link'}>
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
              {item.label === 'My Points' && unreadNotifs > 0 && (
                <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{unreadNotifs}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-slate-800/50">
        <button onClick={handleLogout} className="w-full btn-ghost text-xs py-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10">Sign Out →</button>
      </div>
    </aside>
  );
}
