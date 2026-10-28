import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { legEaseMoveAdvice, type Advice } from '../engine/adviceEngine';
import { currentBodyKg } from '../engine/bodyWeight';
import { EASE_SAVE_FAILED, easeTarget, easeTargetOf, legDaySignals, makeDecision, morningRestDay, moveReason, recordDecision, removeDecision, shouldOfferEase, type EaseOffer, type EaseTarget, type LegDaySignals, type SignalDeps } from '../engine/legDayEase';
import { resolveLegEase, resolveLegEaseHow, type LegEaseHow, type LegEaseMode } from '../engine/legEaseSettings';
import type { LegEaseChoice } from '../models/legEase';
import { resolveVariantDuration } from '../engine/substitutions';
import { todayISO } from '../utils/dates';
import { TimeoutError, withTimeout } from '../utils/withTimeout';

// Een zware beendag op vermoeide benen (engine/legDayEase.ts), voor de kaart op Vandaag en het
// scherm van Forge: wat er speelt, of er een voorstel is, en de twee keuzes bewaren. Alle
// beslissingen staan in de engine; dit leest alleen de gegevens en bewaart wat je kiest. Een fout
// in de berekening maakt de kaart stil (niets te zeggen is niets zeggen).

export interface LegEaseState {
  target: EaseTarget;
  signals: LegDaySignals;
  offer: EaseOffer;
  // De dag later als voorstel met Akkoord, als er deze week een goede dag is.
  move?: Advice;
}

export interface LegEaseApi {
  mode: LegEaseMode;
  how: LegEaseHow;
  state?: LegEaseState;
  // Bewaart wat je koos. Gooit bij een fout, de aanroeper zegt wat er gebeurde.
  choose: (choice: LegEaseChoice) => Promise<void>;
  undo: () => Promise<void>;
}

// `sessionId`: het scherm van een training (Forge) wil het voorstel voor die ene training; Vandaag
// kiest zelf de zware beendag van vandaag.
export function useLegEase(sessionId?: string | null): LegEaseApi {
  const { sessionLogs, plannedSessions, templates, program, settings, injuryNotes, goalEngineConfig, answeredAdviceIds, updateSettings } = useAppData();
  const mode = resolveLegEase(settings);
  const how = resolveLegEaseHow(settings);
  const today = todayISO();
  const bodyKg = currentBodyKg(settings.weightEntries, settings.weightFromMacroFactor);
  const checkIns = settings.morningCheckIns;

  const state = useMemo<LegEaseState | undefined>(() => {
    if (mode === 'uit' || sessionId === null) return undefined;
    try {
      const own = sessionId ? plannedSessions.find((s) => s.id === sessionId) : undefined;
      const target = sessionId ? (own && own.scheduledDate === today ? easeTargetOf(own, templates.find((t) => t.id === own.templateId)) : undefined) : easeTarget(today, plannedSessions, templates, sessionLogs);
      if (!target) return undefined;
      // Een rustige ochtend: dan spreekt het rustadvies van de ochtendcheck, niet deze kaart.
      if (!sessionId && morningRestDay(today, checkIns, sessionLogs)) return undefined;
      const deps: SignalDeps = {
        logs: sessionLogs, plannedSessions, templates, program, bodyKg, today,
        minutesOf: (s, t) => resolveVariantDuration(t, 'full', s.scheduledDate, program),
        injuries: injuryNotes, checkIns: checkIns ?? [],
      };
      const signals = legDaySignals(today, deps, target.session.id);
      const offer = shouldOfferEase(signals, target, mode, settings.legEaseDays, sessionLogs);
      if (offer.state === 'none') return undefined;
      let move: Advice | undefined;
      if (offer.canMove && !sessionId) {
        const found = legEaseMoveAdvice({
          logs: sessionLogs, plannedSessions, templates, injuries: injuryNotes, program,
          dailyTimeBudget: goalEngineConfig.availability.dailyTimeBudget,
          sameDayPairingPreference: goalEngineConfig.strategy.sameDayPairingPreference,
          enabledSports: settings.enabledSports, respondedIds: answeredAdviceIds, asOf: today, illnessEpisodes: settings.illnessEpisodes,
        }, target.session.id, moveReason(signals), signals.sore ? 2 : 1);
        move = found && !answeredAdviceIds.has(found.id) ? found : undefined;
      }
      return { target, signals, offer, move };
    } catch (err) {
      console.error('Lichter bij vermoeide benen: berekening mislukt:', err);
      return undefined;
    }
  }, [mode, sessionId, today, sessionLogs, plannedSessions, templates, program, bodyKg, injuryNotes, checkIns, settings.legEaseDays, settings.enabledSports, settings.illnessEpisodes, goalEngineConfig, answeredAdviceIds]);

  const choose = useCallback(async (choice: LegEaseChoice) => {
    if (!state) return;
    await updateSettings({ legEaseDays: recordDecision(settings.legEaseDays, makeDecision(state.signals, state.target.session.id, choice)) });
  }, [state, settings.legEaseDays, updateSettings]);

  const undo = useCallback(async () => {
    if (!state) return;
    await updateSettings({ legEaseDays: removeDecision(settings.legEaseDays, state.signals.date, state.target.session.id) });
  }, [state, settings.legEaseDays, updateSettings]);

  return { mode, how, state, choose, undo };
}

const SAVE_LIMIT_MS = 8000;

// Een knop die wacht heeft een grens in tijd en een zichtbare uitkomst: na een fout of een time-out staat er
// een zin en "Opnieuw". Na een time-out loopt het opslaan door en kan het nog lukken.
export function useGuardedSave() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [retry, setRetry] = useState<(() => void) | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const run = useCallback(function run(action: () => Promise<void>, after?: () => void) {
    setBusy(true);
    setFailed(null);
    setRetry(null);
    withTimeout(action(), SAVE_LIMIT_MS, 'Opslaan')
      .then(() => {
        if (alive.current) after?.();
      })
      .catch((err) => {
        if (!alive.current) return;
        setFailed(err instanceof TimeoutError ? 'Nog niet bevestigd, kijk zo of het staat.' : EASE_SAVE_FAILED);
        setRetry(() => () => run(action, after));
      })
      .finally(() => {
        if (alive.current) setBusy(false);
      });
  }, []);
  return { busy, failed, retry, run };
}
