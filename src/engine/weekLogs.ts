// ASCEND: wat er in een week gedaan is, op één plek geteld voor Week en de
// weekterugblik (engine/weekReview.ts), zodat de twee niet uit elkaar lopen.
//
// - Een week telt wat je deed op de dag van doen (`completedDate`), met of
//   zonder plan. Een rustdag is geen training en telt niet mee, zoals overal.
// - Een losse training is een log waar op Week geen geplande training bij
//   hoort: zonder `plannedSessionId`, of met een die niet meer in de planning
//   staat. Die staat op Week als gedane rij op zijn dag
//   (docs/beslissingen/2026-10-24-losse-training-op-week.md).
// - De tijd bovenaan Week is wat gedaan is (dezelfde som als de weekterugblik)
//   plus wat nog openstaat op het geplande aantal minuten.
//
// Puur: geen React, geen IndexedDB. Er wordt niets opgeslagen of herschreven.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { addDays } from '../utils/dates';
import type { IllnessEpisode } from '../models/illness';
import type { PlanChangeProposal } from '../models/planChange';
import { isIllnessDay } from './illness';
import { logDay, type PlannedById } from './logDay';

type TemplateTypes = Map<string, Pick<SessionTemplate, 'type'>>;

// De ene definitie van "telt als training" voor "x van y gedaan": Week, het
// Jaaroverzicht en de weekterugblik. Een rustdag telt niet. Een overgeslagen
// training telt wel mee als gepland en niet gedaan (anders staat er "4 van 4"
// terwijl er twee zijn overgeslagen). `leftOut` is wat ASCEND zelf uit de
// planning haalde of een dag waarop je ziek was: dat telt niet.
export function countsAsTraining(session: Pick<PlannedSession, 'id'>, template: Pick<SessionTemplate, 'type'> | undefined, leftOut?: (id: string) => boolean): boolean {
  if (template?.type === 'recovery') return false;
  return !leftOut?.(session.id);
}

// De logs van een week naar de dag waarop ze gedaan zijn, zonder rustdagen.
// Met `plannedById` telt een log op de dag van zijn geplande training (engine/logDay.ts), voor Week.
export function weekLogsOf(logs: SessionLog[], templateById: TemplateTypes, weekStart: string, plannedById?: PlannedById): SessionLog[] {
  const weekEnd = addDays(weekStart, 6);
  const dayOf = (l: SessionLog) => (plannedById ? logDay(l, plannedById) : l.completedDate);
  return logs.filter((l) => dayOf(l) >= weekStart && dayOf(l) <= weekEnd && templateById.get(l.templateId)?.type !== 'recovery');
}

// De minuten die een week gedaan is: de som van de weekterugblik.
export function weekDoneMinutes(logs: SessionLog[], templateById: TemplateTypes, weekStart: string, plannedById?: PlannedById): number {
  return weekLogsOf(logs, templateById, weekStart, plannedById).reduce((n, l) => n + (l.durationMinutes || 0), 0);
}

// De losse trainingen van een week, op volgorde van dag en tijd. Alles wat een
// rustdag was staat er ook bij: het is gedaan, ook als het niet meetelt.
export function looseLogsOfWeek(logs: SessionLog[], plannedSessions: Pick<PlannedSession, 'id'>[], weekStart: string): SessionLog[] {
  const weekEnd = addDays(weekStart, 6);
  const planned = new Set(plannedSessions.map((s) => s.id));
  return logs
    .filter((l) => l.completedDate >= weekStart && l.completedDate <= weekEnd && (!l.plannedSessionId || !planned.has(l.plannedSessionId)))
    .sort((a, b) => a.completedDate.localeCompare(b.completedDate) || a.completedAt.localeCompare(b.completedAt));
}

// Wat nog open staat op het geplande aantal minuten: geen rustdag, geen
// overgeslagen training en niets waar al een log bij hoort.
export function weekOpenMinutes(
  sessions: PlannedSession[],
  logs: Pick<SessionLog, 'plannedSessionId'>[],
  templateById: Map<string, SessionTemplate>,
  minutesOf: (s: PlannedSession, t: SessionTemplate) => number,
): number {
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  let total = 0;
  for (const s of sessions) {
    const t = templateById.get(s.templateId);
    if (!t || t.type === 'recovery' || s.status === 'skipped' || logged.has(s.id)) continue;
    total += minutesOf(s, t);
  }
  return total;
}

// De tijd bovenaan Week: "gedaan van totaal". Het totaal is wat gedaan is plus
// wat nog open staat, dus gedaan blijft nooit boven het totaal.
export function weekTime(
  sessions: PlannedSession[],
  logs: SessionLog[],
  templateById: Map<string, SessionTemplate>,
  weekStart: string,
  minutesOf: (s: PlannedSession, t: SessionTemplate) => number,
  plannedById?: PlannedById,
): { doneMinutes: number; totalMinutes: number } {
  const doneMinutes = weekDoneMinutes(logs, templateById, weekStart, plannedById);
  return { doneMinutes, totalMinutes: doneMinutes + weekOpenMinutes(sessions, logs, templateById, minutesOf) };
}

// Wat niet meetelt als training, voor `countsAsTraining`: een dag waarop je ziek
// was, en een training die ASCEND zelf uit de planning haalde bij een
// herindeling (een nieuw krachtblok, de weekplanning). Wat jij overgeslagen
// hebt, of liet vallen na het missen, telt wel mee.
export function leftOutOfCount(
  plannedSessions: readonly Pick<PlannedSession, 'id' | 'scheduledDate' | 'status'>[],
  planChangeLog: readonly PlanChangeProposal[],
  illnessEpisodes: IllnessEpisode[] | undefined,
  asOf: string,
): (id: string) => boolean {
  const removedBy = new Map<string, string>();
  for (const p of planChangeLog) {
    if (p.resolution !== 'accepted') continue;
    for (const c of p.changes) if (c.action === 'remove' && c.plannedSessionId) removedBy.set(c.plannedSessionId, p.trigger);
  }
  const byId = new Map(plannedSessions.map((s) => [s.id, s]));
  return (id) => {
    const s = byId.get(id);
    if (!s) return false;
    if (illnessEpisodes && isIllnessDay(s.scheduledDate, illnessEpisodes, asOf)) return true;
    if (s.status !== 'skipped') return false;
    const trigger = removedBy.get(id);
    return !!trigger && trigger !== 'session_skipped' && trigger !== 'session_missed';
  };
}
