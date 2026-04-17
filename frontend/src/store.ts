export type Role = 'student' | 'teacher';

export interface User {
  id: string; name: string; email: string; role: Role;
  branch?: string; semester?: number; cgpa?: number;
  department?: string; subject?: string;
}

export interface PointEntry {
  id: string; activity_id: string; icon: string; label: string; category: string;
  points_earned: number; total_after: number; note: string; awarded_by: string;
  teacher_id: string; date: string;
}

export interface Notif {
  id: string; type: string; title: string; message: string;
  timestamp: string; read: boolean; icon: string;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'achievement';
export interface Toast {
  id: string; type: ToastType; title: string; message: string;
  duration?: number; action?: { label: string; onClick: () => void };
}

export interface CourseProgress {
  courseId: string;
  status: 'watchlist' | 'in-progress' | 'completed';
  watchedAt?: string; completedAt?: string; userRating?: number;
}

export interface StudyStreak {
  current: number; longest: number; lastStudyDate: string;
  todayMinutes: number; weeklyGoal: number;
}

const STORAGE_KEY = 'edupredict-auth-v3';
const POINTS_KEY = 'edupredict-points-v3';
const COURSE_PROGRESS_KEY = 'edupredict-course-progress-v4';
const STREAK_KEY = 'edupredict-streak-v4';

function load<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; }
  catch { return fallback; }
}
function save(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export const DEMO_USERS = {
  students: [
    { id:'S001', name:'Priya Sharma',  email:'priya@edu.in',  password:'student123', role:'student' as Role, branch:'Computer Science',            semester:6, cgpa:8.7 },
    { id:'S002', name:'Arjun Mehta',   email:'arjun@edu.in',  password:'student123', role:'student' as Role, branch:'Data Science',                semester:4, cgpa:7.2 },
    { id:'S003', name:'Kavya Reddy',   email:'kavya@edu.in',  password:'student123', role:'student' as Role, branch:'Electronics & Communication', semester:5, cgpa:6.5 },
    { id:'S004', name:'Rohan Singh',   email:'rohan@edu.in',  password:'student123', role:'student' as Role, branch:'Mechanical',                  semester:3, cgpa:5.8 },
    { id:'S005', name:'Sneha Iyer',    email:'sneha@edu.in',  password:'student123', role:'student' as Role, branch:'Information Technology',      semester:7, cgpa:9.1 },
    { id:'S006', name:'Vikram Patel',  email:'vikram@edu.in', password:'student123', role:'student' as Role, branch:'Computer Science',            semester:5, cgpa:7.8 },
    { id:'S007', name:'Divya Nair',    email:'divya@edu.in',  password:'student123', role:'student' as Role, branch:'Data Science',                semester:6, cgpa:8.3 },
    { id:'S008', name:'Kiran Joshi',   email:'kiran@edu.in',  password:'student123', role:'student' as Role, branch:'Mechanical',                  semester:4, cgpa:6.9 },
  ],
  teachers: [
    { id:'T001', name:'Dr. Rajesh Kumar', email:'rajesh@faculty.in', password:'teacher123', role:'teacher' as Role, department:'Computer Science', subject:'Machine Learning' },
    { id:'T002', name:'Prof. Anita Bose', email:'anita@faculty.in',  password:'teacher123', role:'teacher' as Role, department:'Data Science',     subject:'Data Structures' },
    { id:'T003', name:'Dr. Suresh Nair',  email:'suresh@faculty.in', password:'teacher123', role:'teacher' as Role, department:'Electronics',      subject:'Digital Circuits' },
  ],
};

export const ACTIVITY_RULES = [
  { id:'hackathon',    label:'Hackathon Participation',  points:20, icon:'🏆', category:'competition' },
  { id:'project',      label:'Project Submitted',        points:15, icon:'🔧', category:'academic'    },
  { id:'quiz',         label:'Quiz / Test Performance',  points:10, icon:'📝', category:'academic'    },
  { id:'assignment',   label:'Assignment Completed',     points:5,  icon:'✅', category:'academic'    },
  { id:'mentoring',    label:'Peer Mentoring',           points:12, icon:'🤝', category:'social'      },
  { id:'volunteering', label:'Community Volunteering',   points:8,  icon:'💙', category:'social'      },
  { id:'paper',        label:'Research Paper Published', points:40, icon:'📜', category:'academic'    },
  { id:'club',         label:'Club / Society Event',     points:6,  icon:'🎭', category:'social'      },
  { id:'sports',       label:'Sports / Fitness Event',   points:5,  icon:'⚽', category:'wellness'    },
  { id:'course',       label:'Course Completed',         points:25, icon:'📚', category:'academic'    },
  { id:'bonus',        label:'Bonus / Special Award',    points:0,  icon:'🌟', category:'bonus'       },
];

export const getTier = (pts: number) => {
  if (pts >= 200) return { tier:'Platinum', color:'#a78bfa', badge:'🏅 Platinum', atsBoost:35, nextAt:null as null|number };
  if (pts >= 120) return { tier:'Gold',     color:'#fbbf24', badge:'🥇 Gold',     atsBoost:25, nextAt:200 };
  if (pts >= 60)  return { tier:'Silver',   color:'#38bdf8', badge:'🥈 Silver',   atsBoost:15, nextAt:120 };
  return                  { tier:'Bronze',  color:'#fb923c', badge:'🥉 Bronze',   atsBoost:5,  nextAt:60  };
};

export function avatarColor(name: string) {
  const colors = ['#6366f1','#10b981','#38bdf8','#f43f5e','#fbbf24','#fb923c','#a78bfa','#f472b6'];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % colors.length;
  return colors[h];
}
export function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// Auth
interface AuthState { user: User | null; token: string | null; }
let authState: AuthState = load(STORAGE_KEY, { user: null, token: null });
const authListeners = new Set<() => void>();
export const useAuth = {
  getState: () => authState,
  setAuth: (user: User, token: string) => { authState = { user, token }; save(STORAGE_KEY, authState); authListeners.forEach(l => l()); },
  logout: () => { authState = { user: null, token: null }; save(STORAGE_KEY, authState); authListeners.forEach(l => l()); },
  subscribe: (fn: () => void) => { authListeners.add(fn); return () => authListeners.delete(fn); },
};

// Points
interface PointsDB { [sid: string]: { points: number; log: PointEntry[] } }
interface NotifsDB { [sid: string]: Notif[] }
interface PointsState { db: PointsDB; notifs: NotifsDB; }
const initDb: PointsDB = {};
['S001','S002','S003','S004','S005','S006','S007','S008'].forEach(id => { initDb[id] = { points: 0, log: [] }; });
let pointsState: PointsState = load(POINTS_KEY, { db: initDb, notifs: {} });
const pointsListeners = new Set<() => void>();
export const usePoints = {
  getState: () => pointsState,
  award: (sid: string, entry: PointEntry, total: number) => {
    const prev = pointsState.db[sid] || { points: 0, log: [] };
    pointsState = { ...pointsState, db: { ...pointsState.db, [sid]: { points: total, log: [entry, ...prev.log] } } };
    save(POINTS_KEY, pointsState); pointsListeners.forEach(l => l());
  },
  addNotif: (sid: string, n: Notif) => {
    const prev = pointsState.notifs[sid] || [];
    pointsState = { ...pointsState, notifs: { ...pointsState.notifs, [sid]: [n, ...prev] } };
    save(POINTS_KEY, pointsState); pointsListeners.forEach(l => l());
  },
  markRead: (sid: string, nid: string) => {
    const prev = pointsState.notifs[sid] || [];
    pointsState = { ...pointsState, notifs: { ...pointsState.notifs, [sid]: prev.map(n => n.id === nid ? { ...n, read: true } : n) } };
    save(POINTS_KEY, pointsState); pointsListeners.forEach(l => l());
  },
  getPoints: (sid: string) => pointsState.db[sid]?.points || 0,
  getLog: (sid: string) => pointsState.db[sid]?.log || [],
  getNotifs: (sid: string) => pointsState.notifs[sid] || [],
  subscribe: (fn: () => void) => { pointsListeners.add(fn); return () => pointsListeners.delete(fn); },
};

// Toast Store
let toasts: Toast[] = [];
const toastListeners = new Set<() => void>();
export const toastStore = {
  getToasts: () => toasts,
  show: (t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    toasts = [...toasts, { ...t, id }];
    toastListeners.forEach(l => l());
    const dur = t.duration ?? 4000;
    if (dur > 0) setTimeout(() => toastStore.dismiss(id), dur);
    return id;
  },
  dismiss: (id: string) => { toasts = toasts.filter(t => t.id !== id); toastListeners.forEach(l => l()); },
  subscribe: (fn: () => void) => { toastListeners.add(fn); return () => toastListeners.delete(fn); },
};
export const toast = {
  success: (title: string, message = '', duration = 4000) => toastStore.show({ type: 'success', title, message, duration }),
  error:   (title: string, message = '', duration = 5000) => toastStore.show({ type: 'error',   title, message, duration }),
  warning: (title: string, message = '', duration = 5000) => toastStore.show({ type: 'warning', title, message, duration }),
  info:    (title: string, message = '', duration = 4000) => toastStore.show({ type: 'info',    title, message, duration }),
  achievement: (title: string, message = '', duration = 6000) => toastStore.show({ type: 'achievement', title, message, duration }),
};

// Course Progress Store
interface CourseProgressDB { [userId: string]: { [courseId: string]: CourseProgress } }
let courseProgressState: CourseProgressDB = load(COURSE_PROGRESS_KEY, {});
const courseProgressListeners = new Set<() => void>();
export const courseProgressStore = {
  getAll: (userId: string) => courseProgressState[userId] || {},
  get: (userId: string, courseId: string): CourseProgress | undefined => courseProgressState[userId]?.[courseId],
  set: (userId: string, progress: CourseProgress) => {
    courseProgressState = { ...courseProgressState, [userId]: { ...(courseProgressState[userId] || {}), [progress.courseId]: progress } };
    save(COURSE_PROGRESS_KEY, courseProgressState); courseProgressListeners.forEach(l => l());
  },
  remove: (userId: string, courseId: string) => {
    const up = { ...(courseProgressState[userId] || {}) }; delete up[courseId];
    courseProgressState = { ...courseProgressState, [userId]: up };
    save(COURSE_PROGRESS_KEY, courseProgressState); courseProgressListeners.forEach(l => l());
  },
  subscribe: (fn: () => void) => { courseProgressListeners.add(fn); return () => courseProgressListeners.delete(fn); },
};

// Streak Store
interface StreakDB { [userId: string]: StudyStreak }
let streakDB: StreakDB = load(STREAK_KEY, {});
const streakListeners = new Set<() => void>();
const defaultStreak = (): StudyStreak => ({ current: 0, longest: 0, lastStudyDate: '', todayMinutes: 0, weeklyGoal: 60 });
export const streakStore = {
  get: (userId: string): StudyStreak => streakDB[userId] || defaultStreak(),
  logStudy: (userId: string, minutes: number) => {
    const today = new Date().toISOString().split('T')[0];
    const s = streakDB[userId] || defaultStreak();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let newStreak = s.lastStudyDate === today ? s.current : s.lastStudyDate === yesterday ? s.current + 1 : 1;
    const todayMins = s.lastStudyDate === today ? s.todayMinutes + minutes : minutes;
    const longest = Math.max(s.longest, newStreak);
    const updated: StudyStreak = { current: newStreak, longest, lastStudyDate: today, todayMinutes: todayMins, weeklyGoal: s.weeklyGoal };
    streakDB = { ...streakDB, [userId]: updated }; save(STREAK_KEY, streakDB); streakListeners.forEach(l => l());
    return updated;
  },
  setGoal: (userId: string, goalMinutes: number) => {
    const s = streakStore.get(userId);
    streakDB = { ...streakDB, [userId]: { ...s, weeklyGoal: goalMinutes } }; save(STREAK_KEY, streakDB); streakListeners.forEach(l => l());
  },
  subscribe: (fn: () => void) => { streakListeners.add(fn); return () => streakListeners.delete(fn); },
};

// ─── Notification Center Store ────────────────────────────────────────────────
export type NotifCenterType = 'points' | 'alert' | 'course' | 'achievement' | 'system' | 'reminder';

export interface NotifCenter {
  id: string;
  type: NotifCenterType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  icon: string;
  action?: { label: string; page: string };
  forRole: 'student' | 'teacher' | 'all';
  userId?: string; // if targeted to specific user
}

const NOTIF_CENTER_KEY = 'edupredict-notif-center-v1';

interface NotifCenterDB { [userId: string]: NotifCenter[] }

const SYSTEM_NOTIFS: NotifCenter[] = [
  {
    id: 'sys-001', type: 'system', icon: '🎓', forRole: 'student',
    title: 'Welcome to EduPredict Enhanced!',
    message: 'Your personalized learning dashboard is ready. Explore courses, track progress, and build study streaks!',
    timestamp: new Date(Date.now() - 3600000).toISOString(), read: false,
    action: { label: 'Browse Courses', page: 'courses' },
  },
  {
    id: 'sys-002', type: 'reminder', icon: '📅', forRole: 'student',
    title: 'Semester Mid-terms in 3 Weeks',
    message: 'Start your revision early. Check the Predictor to see which subjects need the most attention.',
    timestamp: new Date(Date.now() - 7200000).toISOString(), read: false,
    action: { label: 'Open Predictor', page: 'predictor' },
  },
  {
    id: 'sys-003', type: 'alert', icon: '🚀', forRole: 'student',
    title: 'New Courses Added!',
    message: '3 new YouTube courses added for your branch. Check out System Design, Cybersecurity, and Statistics.',
    timestamp: new Date(Date.now() - 86400000).toISOString(), read: false,
    action: { label: 'View Courses', page: 'courses' },
  },
  {
    id: 'sys-004', type: 'achievement', icon: '🏆', forRole: 'student',
    title: 'Placement Season Starting!',
    message: 'Campus placements begin next month. Update your resume, check your ATS score, and prepare your portfolio.',
    timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), read: false,
    action: { label: 'My Points & ATS', page: 'points' },
  },
  // Teacher notifications
  {
    id: 'sys-005', type: 'alert', icon: '🚨', forRole: 'teacher',
    title: 'At-Risk Students Detected',
    message: '2 students in your class have CGPA below 6.0 and may need immediate academic intervention.',
    timestamp: new Date(Date.now() - 1800000).toISOString(), read: false,
    action: { label: 'View At-Risk', page: 'atrisk' },
  },
  {
    id: 'sys-006', type: 'reminder', icon: '📊', forRole: 'teacher',
    title: 'Weekly Analytics Report Ready',
    message: 'Class performance trends for this week are available. Avg CGPA has improved by 0.2 points.',
    timestamp: new Date(Date.now() - 3 * 3600000).toISOString(), read: false,
    action: { label: 'View Analytics', page: 'analytics' },
  },
  {
    id: 'sys-007', type: 'system', icon: '🏅', forRole: 'teacher',
    title: 'Award Points Reminder',
    message: "You haven't awarded points to students this week. Recognise their achievements to boost engagement!",
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), read: false,
    action: { label: 'Award Points', page: 'award' },
  },
  {
    id: 'sys-008', type: 'course', icon: '📚', forRole: 'teacher',
    title: '3 Students Completed Courses',
    message: 'Priya, Sneha, and Divya completed their assigned YouTube courses this week. Consider awarding points!',
    timestamp: new Date(Date.now() - 4 * 3600000).toISOString(), read: false,
    action: { label: 'Award Points', page: 'award' },
  },
];

let notifCenterDB: NotifCenterDB = load(NOTIF_CENTER_KEY, {});
const notifCenterListeners = new Set<() => void>();

function getOrInitNotifs(userId: string, role: 'student' | 'teacher'): NotifCenter[] {
  if (!notifCenterDB[userId]) {
    // Seed with system notifs for their role
    notifCenterDB[userId] = SYSTEM_NOTIFS.filter(n => n.forRole === role || n.forRole === 'all');
    save(NOTIF_CENTER_KEY, notifCenterDB);
  }
  return notifCenterDB[userId];
}

export const notifCenterStore = {
  getAll: (userId: string, role: 'student' | 'teacher') => getOrInitNotifs(userId, role),
  getUnreadCount: (userId: string, role: 'student' | 'teacher') =>
    getOrInitNotifs(userId, role).filter(n => !n.read).length,
  markRead: (userId: string, notifId: string) => {
    const notifs = notifCenterDB[userId] || [];
    notifCenterDB = {
      ...notifCenterDB,
      [userId]: notifs.map(n => n.id === notifId ? { ...n, read: true } : n),
    };
    save(NOTIF_CENTER_KEY, notifCenterDB);
    notifCenterListeners.forEach(l => l());
  },
  markAllRead: (userId: string) => {
    const notifs = notifCenterDB[userId] || [];
    notifCenterDB = {
      ...notifCenterDB,
      [userId]: notifs.map(n => ({ ...n, read: true })),
    };
    save(NOTIF_CENTER_KEY, notifCenterDB);
    notifCenterListeners.forEach(l => l());
  },
  add: (userId: string, notif: Omit<NotifCenter, 'id' | 'timestamp'>) => {
    const newNotif: NotifCenter = {
      ...notif,
      id: Math.random().toString(36).slice(2),
      timestamp: new Date().toISOString(),
    };
    notifCenterDB = {
      ...notifCenterDB,
      [userId]: [newNotif, ...(notifCenterDB[userId] || [])],
    };
    save(NOTIF_CENTER_KEY, notifCenterDB);
    notifCenterListeners.forEach(l => l());
    return newNotif;
  },
  delete: (userId: string, notifId: string) => {
    notifCenterDB = {
      ...notifCenterDB,
      [userId]: (notifCenterDB[userId] || []).filter(n => n.id !== notifId),
    };
    save(NOTIF_CENTER_KEY, notifCenterDB);
    notifCenterListeners.forEach(l => l());
  },
  subscribe: (fn: () => void) => { notifCenterListeners.add(fn); return () => notifCenterListeners.delete(fn); },
};

// ─── Assignment Tracker Store ─────────────────────────────────────────────────
export type AssignmentPriority = 'low' | 'medium' | 'high';
export type AssignmentStatus   = 'pending' | 'in-progress' | 'completed';

export interface Assignment {
  id: string;
  userId: string;
  title: string;
  subject: string;
  description: string;
  dueDate: string;       // ISO date string YYYY-MM-DD
  dueTime: string;       // HH:MM
  priority: AssignmentPriority;
  status: AssignmentStatus;
  createdAt: string;
  completedAt?: string;
  tags: string[];
}

const ASSIGNMENT_KEY = 'edupredict-assignments-v1';

interface AssignmentDB { [userId: string]: Assignment[] }
let assignmentDB: AssignmentDB = load(ASSIGNMENT_KEY, {});
const assignmentListeners = new Set<() => void>();

// Seed demo assignments for students
const seedAssignments = (userId: string, branch: string): Assignment[] => {
  const today = new Date();
  const d = (offsetDays: number) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offsetDays);
    return dt.toISOString().split('T')[0];
  };

  const byBranch: Record<string, Assignment[]> = {
    'Computer Science': [
      { id:'a1', userId, title:'DSA Assignment – Binary Trees', subject:'Data Structures', description:'Implement AVL tree with insert, delete and search. Submit code + report.', dueDate:d(2), dueTime:'23:59', priority:'high', status:'pending', createdAt:new Date().toISOString(), tags:['DSA','Trees','Code'] },
      { id:'a2', userId, title:'OS Lab – Process Scheduling', subject:'Operating Systems', description:'Simulate Round Robin and SJF scheduling algorithms in C.', dueDate:d(5), dueTime:'17:00', priority:'medium', status:'in-progress', createdAt:new Date().toISOString(), tags:['OS','C','Lab'] },
      { id:'a3', userId, title:'DBMS Mini Project', subject:'Database Management', description:'Design ER diagram and implement normalized database for Library Management System.', dueDate:d(10), dueTime:'23:59', priority:'high', status:'pending', createdAt:new Date().toISOString(), tags:['DBMS','SQL','Project'] },
      { id:'a4', userId, title:'CN Assignment – TCP/IP', subject:'Computer Networks', description:'Write a 10-page report on TCP/IP stack with diagrams.', dueDate:d(-1), dueTime:'23:59', priority:'medium', status:'completed', createdAt:new Date().toISOString(), completedAt:new Date().toISOString(), tags:['Networks','Report'] },
    ],
    'Data Science': [
      { id:'a1', userId, title:'ML Model – House Price Prediction', subject:'Machine Learning', description:'Train and evaluate a regression model on the Kaggle housing dataset. Submit Jupyter notebook.', dueDate:d(3), dueTime:'23:59', priority:'high', status:'in-progress', createdAt:new Date().toISOString(), tags:['ML','Python','Kaggle'] },
      { id:'a2', userId, title:'Statistics Assignment 3', subject:'Probability & Statistics', description:'Problems on hypothesis testing, p-values, and confidence intervals.', dueDate:d(6), dueTime:'17:00', priority:'medium', status:'pending', createdAt:new Date().toISOString(), tags:['Stats','Math'] },
      { id:'a3', userId, title:'Data Visualisation Dashboard', subject:'Data Visualisation', description:'Create an interactive dashboard using Plotly/Tableau on a dataset of your choice.', dueDate:d(12), dueTime:'23:59', priority:'low', status:'pending', createdAt:new Date().toISOString(), tags:['Plotly','Dashboard'] },
    ],
    'Mechanical': [
      { id:'a1', userId, title:'SolidWorks CAD – Gear Assembly', subject:'CAD/CAM', description:'Design a 3-gear assembly in SolidWorks with proper constraints. Submit .sldprt files.', dueDate:d(4), dueTime:'17:00', priority:'high', status:'pending', createdAt:new Date().toISOString(), tags:['SolidWorks','CAD','Lab'] },
      { id:'a2', userId, title:'Thermodynamics Problem Set 5', subject:'Thermodynamics', description:'Solve all 12 problems from Chapter 7 on Rankine cycle efficiency.', dueDate:d(2), dueTime:'23:59', priority:'high', status:'in-progress', createdAt:new Date().toISOString(), tags:['Thermodynamics','Problems'] },
      { id:'a3', userId, title:'FEA Simulation Report', subject:'Finite Element Analysis', description:'Run stress analysis on a bracket in ANSYS and document results.', dueDate:d(8), dueTime:'17:00', priority:'medium', status:'pending', createdAt:new Date().toISOString(), tags:['ANSYS','FEA','Report'] },
    ],
    'Electronics & Communication': [
      { id:'a1', userId, title:'Verilog HDL – ALU Design', subject:'Digital Circuits', description:'Implement a 4-bit ALU in Verilog supporting 8 operations. Simulate in ModelSim.', dueDate:d(3), dueTime:'23:59', priority:'high', status:'pending', createdAt:new Date().toISOString(), tags:['Verilog','VLSI','Lab'] },
      { id:'a2', userId, title:'Signals & Systems Assignment 4', subject:'Signals & Systems', description:'DFT and IDFT problems, convolution, Fourier transform derivations.', dueDate:d(5), dueTime:'17:00', priority:'medium', status:'in-progress', createdAt:new Date().toISOString(), tags:['Signals','Math'] },
      { id:'a3', userId, title:'IoT Project Proposal', subject:'Internet of Things', description:'Submit a 2-page project proposal for your IoT semester project with component list.', dueDate:d(7), dueTime:'23:59', priority:'low', status:'pending', createdAt:new Date().toISOString(), tags:['IoT','Project'] },
    ],
    'Information Technology': [
      { id:'a1', userId, title:'Web Dev – Full Stack App', subject:'Web Technologies', description:'Build a CRUD web app with React frontend and Node.js backend. Deploy to Vercel.', dueDate:d(5), dueTime:'23:59', priority:'high', status:'in-progress', createdAt:new Date().toISOString(), tags:['React','Node','Fullstack'] },
      { id:'a2', userId, title:'Cybersecurity Lab – Pen Testing', subject:'Information Security', description:'Perform a penetration test on the provided VM and document vulnerabilities found.', dueDate:d(4), dueTime:'17:00', priority:'high', status:'pending', createdAt:new Date().toISOString(), tags:['Security','Kali','Lab'] },
      { id:'a3', userId, title:'Cloud Computing – AWS Setup', subject:'Cloud Computing', description:'Launch an EC2 instance, configure a load balancer, and document the steps.', dueDate:d(9), dueTime:'23:59', priority:'medium', status:'pending', createdAt:new Date().toISOString(), tags:['AWS','Cloud'] },
    ],
  };

  return byBranch[branch] ?? byBranch['Computer Science'];
};

export const assignmentStore = {
  getAll: (userId: string, branch = 'Computer Science'): Assignment[] => {
    if (!assignmentDB[userId]) {
      assignmentDB[userId] = seedAssignments(userId, branch);
      save(ASSIGNMENT_KEY, assignmentDB);
    }
    return assignmentDB[userId];
  },
  add: (assignment: Omit<Assignment, 'id' | 'createdAt'>): Assignment => {
    const newA: Assignment = { ...assignment, id: Math.random().toString(36).slice(2), createdAt: new Date().toISOString() };
    assignmentDB = { ...assignmentDB, [assignment.userId]: [newA, ...(assignmentDB[assignment.userId] || [])] };
    save(ASSIGNMENT_KEY, assignmentDB);
    assignmentListeners.forEach(l => l());
    return newA;
  },
  update: (userId: string, id: string, changes: Partial<Assignment>) => {
    assignmentDB = {
      ...assignmentDB,
      [userId]: (assignmentDB[userId] || []).map(a => a.id === id ? { ...a, ...changes } : a),
    };
    save(ASSIGNMENT_KEY, assignmentDB);
    assignmentListeners.forEach(l => l());
  },
  delete: (userId: string, id: string) => {
    assignmentDB = { ...assignmentDB, [userId]: (assignmentDB[userId] || []).filter(a => a.id !== id) };
    save(ASSIGNMENT_KEY, assignmentDB);
    assignmentListeners.forEach(l => l());
  },
  subscribe: (fn: () => void) => { assignmentListeners.add(fn); return () => assignmentListeners.delete(fn); },
};
