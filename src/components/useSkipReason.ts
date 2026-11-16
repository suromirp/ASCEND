// De ene weg van de app naar engine/skipReason.ts: het blad, de rij in Week en de rij op Vandaag geven dezelfde invoer
// mee (voorstellen, periodes, ziekte, races, het concept in Forge). Geen tweede afleiding in een component.

import { useCallback, useMemo } from 'react';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { useAppData } from '../state/AppDataContext';
import { raceDatesOf } from '../engine/raceWindow';
import { skipReason, type SkipReason } from '../engine/skipReason';
import { todayISO } from '../utils/dates';

export function useSkipReason(): (session: PlannedSession, template: SessionTemplate | undefined) => SkipReason | undefined {
  const { settings, sessionLogs, planChangeLog, plannedSessions, templates, openDraftId } = useAppData();
  // De races alleen als een rij erom vraagt, en één keer per stand.
  const races = useMemo(() => {
    let cache: string[] | undefined;
    return () => (cache ??= raceDatesOf(plannedSessions, templates));
  }, [plannedSessions, templates]);
  const logged = useMemo(() => new Set(sessionLogs.map((l) => l.plannedSessionId)), [sessionLogs]);
  return useCallback((session, template) => {
    const today = todayISO();
    // Alleen een overgeslagen rij of een voorbije zonder log kan een reden hebben; de rest rekent niets.
    if (logged.has(session.id) || (session.status !== 'skipped' && session.scheduledDate >= today)) return undefined;
    return skipReason({
      session, template, today, logged: false,
      proposals: planChangeLog, leave: settings.leavePeriods, illness: settings.illnessEpisodes, races: races(), openDraft: openDraftId,
    });
  }, [logged, planChangeLog, settings.leavePeriods, settings.illnessEpisodes, races, openDraftId]);
}
