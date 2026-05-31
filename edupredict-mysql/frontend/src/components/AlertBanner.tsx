import { useState } from 'react';

export interface AlertBannerItem {
  id: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  icon: string;
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

const COLORS = {
  danger:  { bg: 'rgba(244,63,94,0.12)',   border: 'rgba(244,63,94,0.3)',   text: '#fda4af' },
  warning: { bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.3)',  text: '#fde68a' },
  info:    { bg: 'rgba(56,189,248,0.10)',  border: 'rgba(56,189,248,0.3)',  text: '#bae6fd' },
  success: { bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.3)',  text: '#6ee7b7' },
};

export default function AlertBanner({ alerts }: { alerts: AlertBannerItem[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = alerts.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {visible.map(a => {
        const c = COLORS[a.type];
        return (
          <div
            key={a.id}
            className="flex items-start gap-3 px-4 py-3 rounded-xl"
            style={{ background: c.bg, border: `1px solid ${c.border}` }}
          >
            <span className="text-xl flex-shrink-0">{a.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm mb-0.5" style={{ color: c.text }}>{a.title}</div>
              <div className="text-xs text-slate-400">{a.message}</div>
              {a.action && (
                <button
                  onClick={a.action.onClick}
                  className="mt-2 text-xs font-semibold underline underline-offset-2 transition-opacity hover:opacity-70"
                  style={{ color: c.text }}
                >
                  {a.action.label} →
                </button>
              )}
            </div>
            <button
              onClick={() => setDismissed(p => new Set([...p, a.id]))}
              className="text-slate-500 hover:text-slate-300 text-lg leading-none flex-shrink-0 transition-colors"
            >×</button>
          </div>
        );
      })}
    </div>
  );
}
