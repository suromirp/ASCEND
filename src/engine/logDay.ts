// ASCEND: op welke dag een log telt bij het WEERGEVEN (rij, grafiek, kalender).
//
// Een training uit MacroFactor die voor middernacht begon en erna klaar was, draagt de
// datum van het bestand (`completedDate`), maar hoort bij de geplande training van de dag
// erna. Alleen dan telt de dag van de geplande training: de log komt uit MacroFactor
// (`source === 'macrofactor'`) en de geplande dag is precies de dag NA `completedDate`.
// Een handmatige log, een horlogelog, een log met een zelf gekozen dag en een log bij een
// sessie van een dag eerder houden hun eigen datum.
//
// Alleen lezen: de log wordt nooit herschreven. Planning, beenindex, belasting over 7 en
// 28 dagen, readiness en Stand blijven op `completedDate`
// (docs/beslissingen/2026-10-29-dag-van-een-training.md).

import type { PlannedSession, SessionLog } from '../models/training';
import { daysBetween } from '../utils/dates';

export type PlannedById = ReadonlyMap<string, Pick<PlannedSession, 'scheduledDate'>>;

// De ene grens voor logDay en voor de keuze "Welke dag?": de geplande dag ligt precies een dag na de dag van het bestand.
export const isNextDay = (fileDay: string, plannedDay: string): boolean => daysBetween(fileDay, plannedDay) === 1;

export function logDay(log: Pick<SessionLog, 'completedDate' | 'plannedSessionId' | 'source'>, plannedById: PlannedById): string {
  if (!log.plannedSessionId || log.source !== 'macrofactor') return log.completedDate;
  const planned = plannedById.get(log.plannedSessionId);
  if (!planned) return log.completedDate;
  return isNextDay(log.completedDate, planned.scheduledDate) ? planned.scheduledDate : log.completedDate;
}

export function plannedByIdOf(sessions: readonly Pick<PlannedSession, 'id' | 'scheduledDate'>[]): Map<string, Pick<PlannedSession, 'scheduledDate'>> {
  return new Map(sessions.map((s) => [s.id, s]));
}

// De logs die op een dag tussen `from` en `to` (inclusief) tellen, voor de maandtotalen op Logboek.
export function logsInRange<L extends Pick<SessionLog, 'completedDate' | 'plannedSessionId' | 'source'>>(logs: readonly L[], plannedById: PlannedById, from: string, to: string): L[] {
  return logs.filter((l) => {
    const day = logDay(l, plannedById);
    return day >= from && day <= to;
  });
}

// Wat gepland staat en nog geen log heeft: een sessie met een log is gedaan, nooit een vlag.
export function withoutLog<S extends Pick<PlannedSession, 'id'>>(sessions: readonly S[], logs: readonly Pick<SessionLog, 'plannedSessionId'>[]): S[] {
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  return sessions.filter((s) => !logged.has(s.id));
}
