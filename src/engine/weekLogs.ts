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
import type { LeavePeriod } from '../models/leave';
import { logDay, plannedByIdOf, type PlannedById } from './logDay';
import { isDraftOpen, isPausedFor, pauseRules, type TemplateLookup } from './sessionStatus';

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

// Wat niet meetelt als training, voor `countsAsTraining`: een dag waarop je ziek
// was, en een training die ASCEND zelf uit de planning haalde bij een
// herindeling (een nieuw krachtblok, de weekplanning). Met `programStart` ook
// een sessie van voor de start van het programma (restjes van een eerdere
// planning), zoals de reeks. Wat jij overgeslagen hebt, of liet vallen na het
// missen, telt wel mee.
export function leftOutOfCount(
  plannedSessions: readonly (Pick<PlannedSession, 'id' | 'scheduledDate' | 'status' | 'catchUp'> & Partial<Pick<PlannedSession, 'templateId' | 'leave'>>)[],
  planChangeLog: readonly PlanChangeProposal[],
  illnessEpisodes: IllnessEpisode[] | undefined,
  asOf: string,
  programStart: string | undefined,
  // Een vakantie of tocht die je zelf meldde, of zonder sportschool wat de sportschool nodig heeft
  // (engine/leave.ts#isAwayFor, met `templates`): wat daar stond en niet gedaan is, telt niet als gemist. Een loop of
  // wandeling zonder sportschool telt gewoon (docs/beslissingen/2026-11-15-week-telling-zonder-sportschool.md). Wat je er wel deed, telt gewoon mee als gedaan; zo ook op een
  // zieke dag (`loggedIds` geldt voor beide, engine/sessionStatus.ts#isPausedFor). Verplicht: zonder loggedIds viel
  // een gelogde training op een zieke dag stil uit de telling (Warden, 15 november).
  // `races`: de dagen van de races (engine/raceWindow.ts#raceDatesOf). Een training uit de afbouw die niet gedaan is,
  // telt na de racedag niet als gemist (engine/raceWindow.ts#isTaperDay), net als een vakantiedag.
  // `openDraft`: de geplande sessie waar nog een concept van in Forge ligt (engine/sessionStatus.ts#openDraftId). Een
  // voorbije training die nog loopt telt niet als gemist en niet als gedaan, tot hij afgerond of verwijderd is.
  // Met periodes ook de sjablonen (verplicht), zodat zonder sportschool alleen telt wat de sportschool nodig heeft.
  away: { loggedIds: ReadonlySet<string | undefined>; races?: readonly string[]; openDraft?: string } & ({ periods?: undefined; templates?: TemplateLookup } | { periods: LeavePeriod[] | undefined; templates: TemplateLookup }),
): (id: string) => boolean {
  const removedBy = new Map<string, string>();
  for (const p of planChangeLog) {
    if (p.resolution !== 'accepted') continue;
    for (const c of p.changes) if (c.action === 'remove' && c.plannedSessionId) removedBy.set(c.plannedSessionId, p.trigger);
  }
  const byId = new Map(plannedSessions.map((s) => [s.id, s]));
  // De oude rij van een gemiste training die je naar later zette telt niet: de nieuwe rij telt
  // (docs/beslissingen/2026-11-05-inhalen-heet-verplaatsen.md). Zo zegt de ring bovenaan Week hetzelfde
  // als de weekterugblik.
  const movedOn = new Set<string>();
  for (const s of plannedSessions) if (s.catchUp?.fromId && s.status !== 'skipped') movedOn.add(s.catchUp.fromId);
  // Ziek, weg en de afbouw: de ene regel voor de telling (engine/dayRules.ts, stap tellen).
  const rules = pauseRules({ leave: away.periods, illness: illnessEpisodes, races: away.races }, asOf);
  return (id) => {
    const s = byId.get(id);
    if (!s) return false;
    if (programStart && s.scheduledDate < programStart) return true;
    if (!away.loggedIds.has(s.id) && isPausedFor({ scheduledDate: s.scheduledDate, templateId: s.templateId ?? '' }, { templates: away.templates }, asOf, rules)) return true;
    // Wat een periode liet vallen (de rest van de lopen bij Licht, een krachttraining zonder dag): telt niet.
    if (s.status === 'skipped' && s.leave?.role === 'dropped') return true;
    if (!away.loggedIds.has(s.id) && isDraftOpen(s, away.openDraft, asOf)) return true;
    if (s.status !== 'skipped') return false;
    if (movedOn.has(id)) return true;
    const trigger = removedBy.get(id);
    return !!trigger && trigger !== 'session_skipped' && trigger !== 'session_missed';
  };
}

// Een gedane training telt op de dag van uitvoeren (docs/beslissingen/2026-11-23-telt-op-dag-van-uitvoeren.md, I-58):
// de dag van zijn log, dezelfde dag als die van de minuten (`weekLogsOf`: met `plannedById` de dag uit engine/logDay.ts,
// anders `completedDate`). Heeft een training meer logs, dan telt de vroegste. Zonder log de geplande dag. Alleen lezen:
// geen log en geen geplande training wordt herschreven.
export function countDayOf(logs: readonly SessionLog[], plannedById?: PlannedById): (s: Pick<PlannedSession, 'id' | 'scheduledDate'>) => string {
  const first = new Map<string, string>();
  for (const l of logs) {
    if (!l.plannedSessionId) continue;
    const day = plannedById ? logDay(l, plannedById) : l.completedDate;
    const was = first.get(l.plannedSessionId);
    if (was === undefined || day < was) first.set(l.plannedSessionId, day);
  }
  return (s) => first.get(s.id) ?? s.scheduledDate;
}

// Wat een week in "x van n" anders telt door de dag van uitvoeren: `out` zijn de gedane trainingen die in deze week
// gepland stonden en in een andere week gedaan zijn, `in` de gedane trainingen van een andere week die in deze week
// gedaan zijn. `counts` zegt welke geplande training meetelt (countsAsTraining, zonder de oude rij van een inhaal).
export function weekExecutionShift<S extends Pick<PlannedSession, 'id' | 'scheduledDate'>>(plannedSessions: readonly S[], logs: readonly SessionLog[], weekStart: string, counts: (s: S) => boolean, plannedById?: PlannedById): { out: S[]; in: S[] } {
  const weekEnd = addDays(weekStart, 6);
  const inWeek = (d: string) => d >= weekStart && d <= weekEnd;
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const dayOf = countDayOf(logs, plannedById);
  const out: S[] = [];
  const into: S[] = [];
  for (const s of plannedSessions) {
    if (!logged.has(s.id) || !counts(s)) continue;
    const planned = inWeek(s.scheduledDate);
    const done = inWeek(dayOf(s));
    if (planned && !done) out.push(s);
    if (!planned && done) into.push(s);
  }
  return { out, in: into };
}

// De weekbalk (components/vandaag/WeekStrip.tsx) per dag van de week: een training staat op de dag van uitvoeren als
// hij gedaan is, anders op zijn geplande dag (I-58). `sessions` is het hele plan, zodat een training van een andere
// week die deze week gedaan is er ook staat. Een MacroFactor-log over middernacht telt op zijn geplande dag, zoals de minuten.
export function stripSessionsByDay<S extends Pick<PlannedSession, 'id' | 'scheduledDate'>>(sessions: readonly S[], logs: readonly SessionLog[], weekStart: string): Map<string, S[]> {
  const dayOf = countDayOf(logs, plannedByIdOf(sessions));
  const weekEnd = addDays(weekStart, 6);
  const out = new Map<string, S[]>();
  for (const s of sessions) {
    const day = dayOf(s);
    if (day < weekStart || day > weekEnd) continue;
    out.set(day, [...(out.get(day) ?? []), s]);
  }
  return out;
}
