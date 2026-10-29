import { useEffect, useState } from 'react';
import { activeMinutes, activeSeconds, formatSessionClock, isPaused } from '../../engine/forgeSession';
import { requestOpenSession, type SessionState } from '../../utils/forgeSessionStore';
import { Icon } from '../icons';
import { Pictogram } from '../pictograms';

// De pil boven de tabbalk (docs/beslissingen/2026-10-29-forge-als-sessie.md): zolang er een training loopt en
// het volle scherm van Forge niet open is. Links het pictogram kracht en de naam, rechts de klok. Tik opent Forge
// op de sessie. De klok loopt elke seconde, bij pauze staat hij stil en is hij gedempt.
const nowMs = () => Date.now();

// Elke seconde opnieuw tekenen zolang de klok loopt; het moment zelf wordt bij het tekenen gelezen,
// zodat de klok na "Verder" meteen klopt.
function useSecond(running: boolean): number {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);
  return nowMs();
}

export function SessionPill({ session }: { session: SessionState }) {
  const clock = { startedAt: session.startedAt, pauses: session.pauses };
  const paused = isPaused(clock);
  const now = useSecond(!paused);
  const seconds = activeSeconds(clock, now);
  const minutes = activeMinutes(clock, now);
  const label = `Training ${session.pointer.name}, ${minutes === 1 ? '1 minuut' : `${minutes} minuten`}, ${paused ? 'gepauzeerd' : 'loopt'}`;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 mx-auto w-full max-w-md px-4"
      style={{ bottom: 'calc(4.5rem + max(env(safe-area-inset-bottom), 8px) + 8px)' }}
    >
      <button
        type="button"
        onClick={requestOpenSession}
        aria-label={label}
        className="mx-pill-in pointer-events-auto flex min-h-[44px] w-full items-center gap-3 rounded-full border pl-4 pr-4 text-left active:opacity-80"
        style={{ background: 'var(--color-raised)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
        data-testid="session-pill"
      >
        <span style={{ color: 'var(--color-sport-strength)' }}><Pictogram name="kracht" size={22} /></span>
        <span className="min-w-0 flex-1 truncate font-display text-base leading-tight">{session.pointer.name}</span>
        {paused ? (
          <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><Icon name="pauze" size={16} /></span>
        ) : (
          <span aria-hidden="true" className="mx-pill-dot h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--color-action)' }} />
        )}
        <span aria-hidden="true" className="shrink-0 font-sans text-sm font-semibold tabular-nums" style={{ color: paused ? 'var(--color-ink-dim)' : 'var(--color-ink)' }}>
          {formatSessionClock(seconds, false)}
        </span>
      </button>
    </div>
  );
}
