import { useToasts } from '../hooks';
import { toastStore, Toast, ToastType } from '../store';

const TOAST_STYLES: Record<ToastType, { border: string; icon: string; glow: string; bg: string }> = {
  success:     { border: '#10b981', icon: '✅', glow: 'rgba(16,185,129,0.15)', bg: 'rgba(16,185,129,0.08)' },
  error:       { border: '#f43f5e', icon: '❌', glow: 'rgba(244,63,94,0.15)',  bg: 'rgba(244,63,94,0.08)'  },
  warning:     { border: '#fbbf24', icon: '⚠️', glow: 'rgba(251,191,36,0.15)', bg: 'rgba(251,191,36,0.08)' },
  info:        { border: '#38bdf8', icon: 'ℹ️', glow: 'rgba(56,189,248,0.15)', bg: 'rgba(56,189,248,0.08)' },
  achievement: { border: '#a78bfa', icon: '🏆', glow: 'rgba(167,139,250,0.2)', bg: 'rgba(167,139,250,0.1)' },
};

function ToastItem({ t }: { t: Toast }) {
  const s = TOAST_STYLES[t.type];
  return (
    <div
      className="relative flex items-start gap-3 rounded-2xl px-4 py-3 shadow-2xl"
      style={{
        background: `${s.bg}`,
        backdropFilter: 'blur(20px)',
        border: `1px solid ${s.border}50`,
        boxShadow: `0 8px 32px ${s.glow}, 0 2px 8px rgba(0,0,0,0.4)`,
        minWidth: '300px',
        maxWidth: '380px',
        animation: 'toastIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <span className="text-xl flex-shrink-0 mt-0.5">{s.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-slate-100 leading-snug">{t.title}</div>
        {t.message && <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{t.message}</div>}
        {t.action && (
          <button
            onClick={() => { t.action!.onClick(); toastStore.dismiss(t.id); }}
            className="mt-2 text-xs font-semibold px-3 py-1 rounded-lg transition-all"
            style={{ background: `${s.border}20`, color: s.border, border: `1px solid ${s.border}40` }}
          >
            {t.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => toastStore.dismiss(t.id)}
        className="text-slate-500 hover:text-slate-300 text-lg leading-none flex-shrink-0 transition-colors"
        style={{ marginTop: '-2px' }}
      >×</button>
      {/* Progress bar */}
      {(t.duration ?? 4000) > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl overflow-hidden">
          <div
            className="h-full"
            style={{
              background: s.border,
              animation: `toastProgress ${t.duration ?? 4000}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useToasts();
  if (toasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(100%) scale(0.8); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3" style={{ pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem t={t} />
          </div>
        ))}
      </div>
    </>
  );
}
