import { useState, useEffect } from 'react';
import {
  useAuth, usePoints, courseProgressStore, toastStore, streakStore,
  notifCenterStore, assignmentStore,
  User, PointEntry, Notif, Toast, CourseProgress, StudyStreak, NotifCenter, Assignment,
} from './store';

export function useAuthStore() {
  const [state, setState] = useState(() => useAuth.getState());
  useEffect(() => useAuth.subscribe(() => setState(useAuth.getState())), []);
  return {
    user: state.user, token: state.token, isAuthenticated: !!state.user,
    role: state.user?.role ?? null, setAuth: useAuth.setAuth, logout: useAuth.logout,
  };
}

export function usePointsStore() {
  const [state, setState] = useState(() => usePoints.getState());
  useEffect(() => usePoints.subscribe(() => setState(usePoints.getState())), []);
  return {
    award: usePoints.award, addNotif: usePoints.addNotif, markRead: usePoints.markRead,
    getPoints: usePoints.getPoints, getLog: usePoints.getLog, getNotifs: usePoints.getNotifs,
    db: state.db, notifs: state.notifs,
  };
}

export function useUser(): User | null { return useAuthStore().user; }

export function useToasts(): Toast[] {
  const [toasts, setToasts] = useState(() => toastStore.getToasts());
  useEffect(() => toastStore.subscribe(() => setToasts([...toastStore.getToasts()])), []);
  return toasts;
}

export function useCourseProgress(userId: string) {
  const [progress, setProgress] = useState(() => courseProgressStore.getAll(userId));
  useEffect(() => courseProgressStore.subscribe(() => setProgress({ ...courseProgressStore.getAll(userId) })), [userId]);
  return {
    progress,
    get: (courseId: string): CourseProgress | undefined => progress[courseId],
    set: (p: CourseProgress) => courseProgressStore.set(userId, p),
    remove: (courseId: string) => courseProgressStore.remove(userId, courseId),
    completedCount: Object.values(progress).filter(p => p.status === 'completed').length,
    inProgressCount: Object.values(progress).filter(p => p.status === 'in-progress').length,
    watchlistCount: Object.values(progress).filter(p => p.status === 'watchlist').length,
  };
}

export function useStreak(userId: string) {
  const [streak, setStreak] = useState(() => streakStore.get(userId));
  useEffect(() => streakStore.subscribe(() => setStreak({ ...streakStore.get(userId) })), [userId]);
  return {
    streak,
    logStudy: (minutes: number) => streakStore.logStudy(userId, minutes),
    setGoal: (goalMinutes: number) => streakStore.setGoal(userId, goalMinutes),
  };
}

export function useNotifCenter(userId: string, role: 'student' | 'teacher') {
  const [notifs, setNotifs] = useState<NotifCenter[]>(() => notifCenterStore.getAll(userId, role));
  useEffect(() => notifCenterStore.subscribe(() => setNotifs([...notifCenterStore.getAll(userId, role)])), [userId, role]);
  return {
    notifs,
    unreadCount: notifs.filter(n => !n.read).length,
    markRead: (id: string) => notifCenterStore.markRead(userId, id),
    markAllRead: () => notifCenterStore.markAllRead(userId),
    add: (n: Omit<NotifCenter, 'id' | 'timestamp'>) => notifCenterStore.add(userId, n),
    delete: (id: string) => notifCenterStore.delete(userId, id),
  };
}

export function useAssignments(userId: string, branch = 'Computer Science') {
  const [assignments, setAssignments] = useState<Assignment[]>(() => assignmentStore.getAll(userId, branch));
  useEffect(() => assignmentStore.subscribe(() => setAssignments([...assignmentStore.getAll(userId, branch)])), [userId]);

  const overdue = assignments.filter(a => a.status !== 'completed' && new Date(`${a.dueDate}T${a.dueTime}`) < new Date());
  const dueSoon = assignments.filter(a => {
    const due = new Date(`${a.dueDate}T${a.dueTime}`);
    const diff = (due.getTime() - Date.now()) / 86400000;
    return a.status !== 'completed' && diff >= 0 && diff <= 2;
  });

  return {
    assignments,
    overdue, dueSoon,
    pending:    assignments.filter(a => a.status === 'pending'),
    inProgress: assignments.filter(a => a.status === 'in-progress'),
    completed:  assignments.filter(a => a.status === 'completed'),
    add:      (a: Omit<Assignment, 'id' | 'createdAt'>) => assignmentStore.add(a),
    update:   (id: string, changes: Partial<Assignment>) => assignmentStore.update(userId, id, changes),
    remove:   (id: string) => assignmentStore.delete(userId, id),
    markDone: (id: string) => assignmentStore.update(userId, id, { status: 'completed', completedAt: new Date().toISOString() }),
  };
}
