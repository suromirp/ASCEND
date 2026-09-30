import { useEffect, useState, type ReactNode } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { JUST_UPDATED, markJustUpdated } from '../utils/updateFlag';

// vite-plugin-pwa runs in 'prompt' mode (vite.config.ts): a new build is
// downloaded in the background and then WAITS — nothing reloads by itself
// (that silent second reload used to replay the whole splash). This bar is
// the one moment the user is told, and tapping it is the only reload. The
// app looks for a new version when it's opened again and once an hour.
const UPDATE_CHECK_MS = 60 * 60 * 1000;

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      setInterval(() => void registration.update(), UPDATE_CHECK_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update();
      });
    },
  });
  const [updating, setUpdating] = useState(false);

  if (!needRefresh) return null;

  return (
    <Bar>
      <div className="min-w-0">
        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Nieuwe versie van ASCEND</p>
        <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Bijwerken duurt een tel, je gegevens blijven staan.</p>
      </div>
      <button
        onClick={() => {
          setUpdating(true);
          markJustUpdated();
          void updateServiceWorker(true);
        }}
        disabled={updating}
        className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, var(--color-gold), var(--color-bronze-dark))', color: '#15130d' }}
      >
        {updating ? 'BEZIG…' : 'BIJWERKEN'}
      </button>
    </Bar>
  );
}

// The confirmation after the update reload — replaces the splash.
export function UpdatedNotice() {
  const [visible, setVisible] = useState(JUST_UPDATED);
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, [visible]);
  if (!visible) return null;
  return (
    <Bar>
      <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Bijgewerkt naar de nieuwste versie</p>
      <button onClick={() => setVisible(false)} aria-label="Sluiten" className="px-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>×</button>
    </Bar>
  );
}

function Bar({ children }: { children: ReactNode }) {
  return (
    <div
      className="animate-rise-in fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: 'calc(4.5rem + max(env(safe-area-inset-bottom), 8px) + 0.75rem)' }}
    >
      <div
        className="flex w-full max-w-md items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-lg"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-bronze)' }}
      >
        {children}
      </div>
    </div>
  );
}
