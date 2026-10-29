// ASCEND: op welke dag een log telt bij het WEERGEVEN (rij, grafiek, kalender).
//
// Een training uit MacroFactor die op de ene dag begon en een dag later werd
// afgemaakt draagt de datum van het bestand (`completedDate`), maar hoort bij de
// geplande training van de dag erna. Dan telt de dag van de geplande training,
// zodat de rij en de grafiek hetzelfde zeggen. Hoogstens een dag verschil: een
// log die ver van zijn geplande dag ligt (later ingehaald, verschoven) houdt
// zijn eigen datum.
//
// Alleen lezen: de log wordt nooit herschreven. Planning, beenindex, belasting
// over 7 en 28 dagen en readiness blijven op `completedDate`
// (docs/beslissingen/2026-10-29-dag-van-een-training.md).

import type { PlannedSession, SessionLog } from '../models/training';
import { daysBetween } from '../utils/dates';

export type PlannedById = ReadonlyMap<string, Pick<PlannedSession, 'scheduledDate'>>;

export function logDay(log: Pick<SessionLog, 'completedDate' | 'plannedSessionId'>, plannedById: PlannedById): string {
  if (!log.plannedSessionId) return log.completedDate;
  const planned = plannedById.get(log.plannedSessionId);
  if (!planned) return log.completedDate;
  return Math.abs(daysBetween(log.completedDate, planned.scheduledDate)) <= 1 ? planned.scheduledDate : log.completedDate;
}

export function plannedByIdOf(sessions: readonly Pick<PlannedSession, 'id' | 'scheduledDate'>[]): Map<string, Pick<PlannedSession, 'scheduledDate'>> {
  return new Map(sessions.map((s) => [s.id, s]));
}
