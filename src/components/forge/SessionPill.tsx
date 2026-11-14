import { useEffect, useRef, useState } from 'react';
import { activeMinutes, activeSeconds, formatSessionClock, isPaused, setsPhrase } from '../../engine/forgeSession';
import { promptKey, requestOpenSession, wasPrompted, type SessionState } from '../../utils/forgeSessionStore';
import { Icon } from '../icons';
import { Pictogram } from '../pictograms';
import { useAppData } from '../../state/AppDataContext';
import { sportPictogram } from '../sportKind';
import { SessionChoiceSheet } from './SessionChoiceSheet';
import { useLeftCheck, useLeftSession, useSessionWorld } from './useForgeSession';

// De pil boven de tabbalk (docs/beslissingen/2026-10-29-forge-als-sessie.md): zolang er een training loopt en
// het volle scherm van Forge niet open is. Links het pictogram van de training (kracht, of eigen gewicht) en de naam, rechts de klok. Tik opent Forge
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
  const { templates } = useAppData();
  const template = templates.find((t) => t.id === session.pointer.templateId);
  // Bleef de training liggen (na middernacht, na de grens of overgeslagen), dan is hij een concept: geen lopende
  // klok, een regel "Niet afgerond", en een tik opent de keuze in plaats van Forge.
  const left = useLeftSession(session);
  const check = useLeftCheck();
  // Het blad gaat vanzelf open bij het opstarten (de pil verschijnt) en bij een terugkomst in de app, één keer per
  // concept; nooit op een minuut-tik midden in gebruik, en niet als een ander keuzeblad er al over gaat (wasPrompted).
  const [choosing, setChoosing] = useState(() => !!left && !wasPrompted(promptKey(session, left.lastActionAt)));
  const checkRef = useRef(() => {});
  useEffect(() => {
    checkRef.current = () => {
      const now = check(session, Date.now());
      if (now && !wasPrompted(promptKey(session, now.lastActionAt))) setChoosing(true);
    };
  });
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkRef.current();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  // Bij het opstarten laadt de app nog; zodra hij klaar is, is dat nog steeds het openen.
  const { loading } = useSessionWorld();
  useEffect(() => {
    if (!loading) checkRef.current();
  }, [loading]);
  const clock = { startedAt: session.startedAt, pauses: session.pauses };
  const paused = isPaused(clock);
  const now = useSecond(!paused && !left);
  const seconds = activeSeconds(clock, now);
  const minutes = activeMinutes(clock, now);
  const label = left
    ? `Training ${session.pointer.name}, niet afgerond, ${setsPhrase(session.doneSets)}. Afronden, verder of verwijderen`
    : `Training ${session.pointer.name}, ${minutes === 1 ? '1 minuut' : `${minutes} minuten`}, ${paused ? 'gepauzeerd' : 'loopt'}`;
  return (
    <>
    <div
      className="pointer-events-none fixed inset-x-0 z-30 mx-auto w-full max-w-md px-4"
      style={{ bottom: 'calc(4.5rem + max(var(--rand-onder), 8px) + 8px)' }}
    >
      <button
        type="button"
        onClick={() => (left ? setChoosing(true) : requestOpenSession())}
        aria-label={label}
        className="mx-pill-in pointer-events-auto flex min-h-[44px] w-full items-center gap-3 rounded-full border pl-4 pr-4 text-left active:opacity-80"
        style={{ background: 'var(--color-raised)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
        data-testid="session-pill"
      >
        <span style={{ color: 'var(--color-sport-strength)' }}><Pictogram name={template ? sportPictogram(template) : 'kracht'} size={22} /></span>
        <span className="min-w-0 flex-1 truncate font-display text-base leading-tight">{session.pointer.name}</span>
        {left ? (
          <span aria-hidden="true" className="shrink-0 text-xs font-medium" style={{ color: 'var(--color-warning)' }}>Niet afgerond</span>
        ) : paused ? (
          <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><Icon name="pauze" size={16} /></span>
        ) : (
          <span aria-hidden="true" className="mx-pill-dot h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--color-action)' }} />
        )}
        {!left && (
          <span aria-hidden="true" className="shrink-0 font-sans text-sm font-semibold tabular-nums" style={{ color: paused ? 'var(--color-ink-dim)' : 'var(--color-ink)' }}>
            {formatSessionClock(seconds, false)}
          </span>
        )}
      </button>
    </div>
    {choosing && <SessionChoiceSheet session={session} {...(left ? { left } : {})} onClose={() => setChoosing(false)} />}
    </>
  );
}
