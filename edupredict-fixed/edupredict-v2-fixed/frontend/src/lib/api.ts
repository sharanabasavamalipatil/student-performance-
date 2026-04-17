import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({ baseURL: BASE, timeout: 20000 });

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('edupredict-auth-v2');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token || null;
  } catch {
    return null;
  }
}

api.interceptors.request.use(cfg => {
  const t = getStoredToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
  }
  return Promise.reject(err);
});

export const authAPI   = { login: (e: string, p: string) => api.post('/api/auth/login', { email: e, password: p }), me: () => api.get('/api/auth/me') };
export const studentsAPI = { list: (p?: object) => api.get('/api/students', { params: p }), awardPoints: (id: string, d: object) => api.post(`/api/students/${id}/points`, d), getPoints: (id: string) => api.get(`/api/students/${id}/points`), allPoints: () => api.get('/api/students/all-points') };
export const mlAPI     = { predict: (d: object) => api.post('/api/predict', d), recommend: (d: object) => api.post('/api/recommend', d), atRisk: () => api.get('/api/at-risk'), analytics: () => api.get('/api/analytics'), modelInfo: () => api.get('/api/models/info') };
export const chatAPI   = { send: (msg: string, ctx?: object) => api.post('/api/chat', { message: msg, context: ctx }), history: (uid: string) => api.get(`/api/chat/history/${uid}`) };
export const coursesAPI = { list: (p?: object) => api.get('/api/courses', { params: p }) };
export const leaderboardAPI = { get: () => api.get('/api/leaderboard') };

export default api;
