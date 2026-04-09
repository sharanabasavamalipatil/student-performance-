import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Role = 'student' | 'teacher';
export interface User {
  id: string; name: string; email: string; role: Role;
  branch?: string; semester?: number; cgpa?: number;
  department?: string; subject?: string;
}

interface AuthState {
  user: User | null; token: string | null; role: Role | null;
  isAuthenticated: boolean; _hasHydrated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setHasHydrated: (v: boolean) => void;
}

const safeStorage = {
  getItem: (name: string) => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(name);
  },
  setItem: (name: string, value: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(name, value);
  },
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
  },
};

export const useAuthStore = create<AuthState>()(persist(
  (set) => ({
    user: null, token: null, role: null, isAuthenticated: false, _hasHydrated: false,
    setAuth: (user, token) => set({ user, token, role: user.role, isAuthenticated: true }),
    logout: () => {
      set({ user: null, token: null, role: null, isAuthenticated: false });
      // Clear persisted storage so next hydration starts fresh
      if (typeof window !== 'undefined') {
        localStorage.removeItem('edupredict-auth-v2');
      }
    },
    setHasHydrated: (v) => set({ _hasHydrated: v }),
  }),
  {
    name: 'edupredict-auth-v2',
    storage: createJSONStorage(() => safeStorage),
    onRehydrateStorage: () => (state) => { state?.setHasHydrated(true); },
  }
));

export interface PointEntry {
  id: string; activity_id: string; icon: string; label: string; category: string;
  points_earned: number; total_after: number; note: string;
  awarded_by: string; teacher_id: string; date: string;
}
export interface Notif {
  id: string; type: string; title: string; message: string;
  timestamp: string; read: boolean; icon: string;
}
interface PointsState {
  db: Record<string, { points: number; log: PointEntry[] }>;
  notifs: Record<string, Notif[]>;
  award: (sid: string, entry: PointEntry, total: number) => void;
  addNotif: (sid: string, n: Notif) => void;
  markRead: (sid: string, nid: string) => void;
  getPoints: (sid: string) => number;
  getLog: (sid: string) => PointEntry[];
  getNotifs: (sid: string) => Notif[];
}
const initDb: Record<string, { points: number; log: PointEntry[] }> = {};
['S001','S002','S003','S004','S005','S006','S007','S008'].forEach(id => { initDb[id] = { points: 0, log: [] }; });

export const usePointsStore = create<PointsState>()(persist(
  (set, get) => ({
    db: initDb, notifs: {},
    award: (sid, entry, total) => set(s => ({ db: { ...s.db, [sid]: { points: total, log: [entry, ...(s.db[sid]?.log || [])] } } })),
    addNotif: (sid, n) => set(s => ({ notifs: { ...s.notifs, [sid]: [n, ...(s.notifs[sid] || [])] } })),
    markRead: (sid, nid) => set(s => ({ notifs: { ...s.notifs, [sid]: (s.notifs[sid]||[]).map(n => n.id===nid?{...n,read:true}:n) } })),
    getPoints: sid => get().db[sid]?.points || 0,
    getLog: sid => get().db[sid]?.log || [],
    getNotifs: sid => get().notifs[sid] || [],
  }),
  { name: 'edupredict-points-v2', storage: createJSONStorage(() => safeStorage) }
));

export const DEMO_USERS = {
  students: [
    { id:'S001',name:'Priya Sharma', email:'priya@edu.in',  password:'student123',role:'student' as Role,branch:'Computer Science',           semester:6,cgpa:8.7,studentId:'CS2021001' },
    { id:'S002',name:'Arjun Mehta',  email:'arjun@edu.in',  password:'student123',role:'student' as Role,branch:'Data Science',               semester:4,cgpa:7.2,studentId:'DS2022002' },
    { id:'S003',name:'Kavya Reddy',  email:'kavya@edu.in',  password:'student123',role:'student' as Role,branch:'Electronics & Communication',semester:5,cgpa:6.5,studentId:'EC2021003' },
    { id:'S004',name:'Rohan Singh',  email:'rohan@edu.in',  password:'student123',role:'student' as Role,branch:'Mechanical',                 semester:3,cgpa:5.8,studentId:'ME2023004' },
    { id:'S005',name:'Sneha Iyer',   email:'sneha@edu.in',  password:'student123',role:'student' as Role,branch:'Information Technology',     semester:7,cgpa:9.1,studentId:'IT2020005' },
    { id:'S006',name:'Vikram Patel', email:'vikram@edu.in', password:'student123',role:'student' as Role,branch:'Computer Science',           semester:5,cgpa:7.8,studentId:'CS2021006' },
    { id:'S007',name:'Divya Nair',   email:'divya@edu.in',  password:'student123',role:'student' as Role,branch:'Data Science',               semester:6,cgpa:8.3,studentId:'DS2021007' },
    { id:'S008',name:'Kiran Joshi',  email:'kiran@edu.in',  password:'student123',role:'student' as Role,branch:'Mechanical',                 semester:4,cgpa:6.9,studentId:'ME2022008' },
  ],
  teachers: [
    { id:'T001',name:'Dr. Rajesh Kumar',email:'rajesh@faculty.in',password:'teacher123',role:'teacher' as Role,department:'Computer Science',subject:'Machine Learning' },
    { id:'T002',name:'Prof. Anita Bose',email:'anita@faculty.in', password:'teacher123',role:'teacher' as Role,department:'Data Science',    subject:'Data Structures' },
    { id:'T003',name:'Dr. Suresh Nair', email:'suresh@faculty.in',password:'teacher123',role:'teacher' as Role,department:'Electronics',     subject:'Digital Circuits' },
  ],
};

export const ACTIVITY_RULES = [
  { id:'hackathon',    label:'Hackathon Participation', points:20,icon:'🏆',category:'competition' },
  { id:'project',      label:'Project Submitted',        points:15,icon:'🔧',category:'academic'   },
  { id:'certification',label:'Certification Earned',    points:25,icon:'📜',category:'skill'       },
  { id:'internship',   label:'Internship Completed',    points:30,icon:'💼',category:'experience'  },
  { id:'quiz',         label:'Quiz / Assessment',       points:5, icon:'✏️',category:'academic'   },
  { id:'workshop',     label:'Workshop Attended',       points:10,icon:'🎓',category:'skill'       },
  { id:'volunteering', label:'Community Volunteering',  points:8, icon:'🤝',category:'social'      },
  { id:'paper',        label:'Research Paper Published',points:40,icon:'📝',category:'academic'   },
  { id:'club',         label:'Club / Society Event',    points:6, icon:'🎭',category:'social'      },
  { id:'sports',       label:'Sports / Fitness Event',  points:5, icon:'⚽',category:'wellness'    },
  { id:'bonus',        label:'Bonus / Special Award',   points:0, icon:'🌟',category:'bonus'       },
  { id:'deduction',    label:'Point Deduction',         points:0, icon:'⚠️',category:'deduction'  },
];

export const getTier = (pts: number) => {
  if (pts>=200) return { tier:'Platinum',color:'#a78bfa',badge:'🏅 Platinum',atsBoost:35,nextAt:null as number|null };
  if (pts>=120) return { tier:'Gold',    color:'#fbbf24',badge:'🥇 Gold',    atsBoost:25,nextAt:200 };
  if (pts>=60)  return { tier:'Silver',  color:'#38bdf8',badge:'🥈 Silver',  atsBoost:15,nextAt:120 };
  return             { tier:'Bronze',  color:'#fb923c',badge:'🥉 Bronze',  atsBoost:5, nextAt:60  };
};
export function avatarColor(name: string) {
  const c=['#6366f1','#10b981','#38bdf8','#f43f5e','#fbbf24','#fb923c','#a78bfa','#f472b6'];
  let h=0; for(const ch of name) h=(h*31+ch.charCodeAt(0))%c.length; return c[h];
}
export function initials(name: string) { return name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }
