// De klok van een Forge-sessie: begin bij de eerste handeling, pauzeren en verder, en de vraag na een lange
// onderbreking (engine/forgeSession.ts). Het concept bewaart de uitkomst; dit houdt alleen de stand bij.

import { useCallback, useEffect, useRef, useState } from 'react';
import { breakAsPause, breakCounts, cleanPauses, isPaused, longBreakMs, pause as pauseClock, resolveBreakAsk, resume as resumeClock, type Pause } from '../../engine/forgeSession';
import { haptics } from '../../utils/haptics';
import { lastActionOfDraft, type WorkoutDraft } from './forgeDraft';
import type { useAppData } from '../../state/AppDataContext';

export function useForgeClock(restored: WorkoutDraft | undefined, readOnly: boolean, settings: ReturnType<typeof useAppData>['settings']) {
  // De sessie begint op het moment van starten en houdt dat, ook na sluiten, herladen en een volgende dag.
  // De sessie begint pas bij de eerste echte handeling (afvinken, typen, een set toevoegen of weghalen, Pauzeren);
  // alleen openen is nog geen sessie: geen concept, geen wijzer, geen pil.
  const [startedAt, setStartedAt] = useState<number | null>(() => (restored ? restored.startedAt : null));
  const startedRef = useRef<number | null>(startedAt);
  // Het laatste moment dat jij iets deed: de lange onderbreking meet daarvandaan.
  const [firstAction] = useState<number>(() => (restored ? lastActionOfDraft(restored, restored.startedAt as number) : 0));
  const lastAction = useRef<number>(firstAction);
  const begin = useCallback((): number => {
    if (startedRef.current !== null) return startedRef.current;
    const now = Date.now();
    startedRef.current = now;
    lastAction.current = now;
    setStartedAt(now);
    return now;
  }, []);
  const [pauses, setPauses] = useState<Pause[]>(() => cleanPauses(restored?.pauses));
  const paused = startedAt !== null && isPaused({ startedAt, pauses });
  const breakAfter = resolveBreakAsk(settings);
  // "Je was 22 uur weg. Telt die tijd mee?": één keer per terugkomst, alleen als de klok liep.
  const [awayMs, setAwayMs] = useState<number | undefined>(() => (restored && !readOnly ? longBreakMs({ startedAt: restored.startedAt as number, pauses: cleanPauses(restored.pauses), lastActionAt: firstAction }, Date.now(), breakAfter) : undefined));

  // Pauzeren en verder gaan staan meteen in het concept.
  const togglePause = useCallback(() => {
    const start = begin();
    const now = Date.now();
    const next = isPaused({ startedAt: start, pauses }) ? resumeClock({ startedAt: start, pauses }, now) : pauseClock({ startedAt: start, pauses }, now);
    if (next.lastActionAt !== undefined) lastAction.current = next.lastActionAt;
    setPauses(next.pauses ?? []);
    haptics.tap();
  }, [begin, pauses]);
  // Terug in de app terwijl dit scherm openstond: ook dan de vraag, als de klok liep.
  const clockNow = useRef<{ startedAt: number; pauses: Pause[] } | null>(null);
  useEffect(() => {
    clockNow.current = startedAt === null ? null : { startedAt, pauses };
  });
  useEffect(() => {
    if (readOnly) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (!clockNow.current) return;
      const gap = longBreakMs({ ...clockNow.current, lastActionAt: lastAction.current }, Date.now(), breakAfter);
      if (gap !== undefined) setAwayMs(gap);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [readOnly, breakAfter]);
  const answerBreak = (counts: boolean) => {
    if (startedAt === null) return;
    const now = Date.now();
    const before = { startedAt, pauses, lastActionAt: lastAction.current };
    const next = counts ? breakCounts(before, now) : breakAsPause(before, now);
    lastAction.current = now;
    // Altijd een nieuwe lijst, ook bij "Ja": het concept moet het nieuwe moment van handelen meekrijgen.
    setPauses([...(next.pauses ?? [])]);
    setAwayMs(undefined);
  };

  return { startedAt, pauses, paused, lastAction, awayMs, setAwayMs, begin, togglePause, answerBreak };
}
