import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { JUST_UPDATED } from '../utils/updateFlag';
import { subscribeToUpdate, updateIsWaiting, applyUpdateNow } from '../utils/swUpdate';
import { Icon } from './icons';

// The service worker is registered at page load (utils/swUpdate.ts, started
// from main.tsx) and updates itself at a quiet moment (utils/updatePolicy.ts):
// on a cold start, and after the app was in the background for about half an
// hour, never while a sheet or form is open. This bar is the safety net for
// when the app simply stays open: a new version waits, and tapping BIJWERKEN
// is the reload. The "Bijgewerkt" notice below confirms either way.

export function UpdatePrompt() {
  const needRefresh = useSyncExternalStore(subscribeToUpdate, updateIsWaiting);
  const [updating, setUpdating] = useState(false);

  if (!needRefresh) return null;

  return (
    <Bar attention>
      <div className="min-w-0">
        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Nieuwe versie van ASCEND</p>
        <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Bijwerken duurt een tel, je gegevens blijven staan.</p>
      </div>
      <button
        onClick={() => {
          setUpdating(true);
          applyUpdateNow();
        }}
        disabled={updating}
        className="min-h-[44px] shrink-0 rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
        style={{ background: 'var(--color-action-fill)', color: 'var(--color-on-action)' }}
      >
        {updating ? 'Bezig…' : 'Bijwerken'}
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
      <button onClick={() => setVisible(false)} aria-label="Sluiten" className="min-h-[44px] min-w-[44px] text-sm" style={{ color: 'var(--color-ink-dim)' }}><Icon name="sluiten" size={20} /></button>
    </Bar>
  );
}

function Bar({ children, attention = false }: { children: ReactNode; attention?: boolean }) {
  return (
    <div
      className="animate-rise-in fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: 'calc(4.5rem + max(env(safe-area-inset-bottom), 8px) + 0.75rem)' }}
    >
      <div role="status"
        className={`${attention ? 'mx-attention ' : ''}flex w-full max-w-md items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-lg`}
        style={{ background: 'var(--color-raised)', borderColor: 'var(--color-card-border)' }}
      >
        {children}
      </div>
    </div>
  );
}
