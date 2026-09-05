import { useRegisterSW } from 'virtual:pwa-register/react';

// vite-plugin-pwa is set to registerType: 'autoUpdate' (vite.config.ts), so
// a new build is already fetched and waiting in the background — this is
// just the one visible moment where the user is told a reload will pick it
// up, instead of it happening silently on some later, unrelated refresh.
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div
      className="animate-rise-in fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: 'calc(4.5rem + max(env(safe-area-inset-bottom), 8px) + 0.75rem)' }}
    >
      <div
        className="flex w-full max-w-md items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-lg"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-bronze)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Nieuwe versie beschikbaar</p>
        <button
          onClick={() => updateServiceWorker(true)}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide"
          style={{ background: 'linear-gradient(135deg, var(--color-gold), var(--color-bronze-dark))', color: '#15130d' }}
        >
          HERLADEN
        </button>
      </div>
    </div>
  );
}
