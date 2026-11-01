// ASCEND: de rustdag komt terug (regel REST-BACK, besluit docs/beslissingen/2026-11-01-rustdag-terug.md).
//
// Een voorstel kan de rij Herstel op je vaste rustdag laten vervallen om plek te maken (TEST-RETRY,
// een inhaalvoorstel). Gaat wat daar kwam later weer weg, dan is de dag leeg maar staat Herstel nog
// op overgeslagen met het slot van dat voorstel. Dan stelt ASCEND voor de rij terug te zetten, met
// Akkoord en Liever niet; nooit stil. Wat je zelf oversloeg (jouw slot) blijft van jou, net als wat een
// vakantie of tocht liet gaan (die zet het zelf terug). Historie (gelogd of voorbij) raakt dit nooit.
//
// Ook de weergave van een lege dag in Week staat hier: op je vaste rustdag heet die "Rustdag".
//
// Puur: geen React, geen IndexedDB.

import type { Advice } from './adviceEngine';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { IllnessEpisode } from '../models/illness';
import type { LeavePeriod } from '../models/leave';
import { formatDateNL, isoWeekday, mondayOfWeek, weekdayLongNL } from '../utils/dates';
import { makeId } from '../utils/id';
import { isIllnessDay } from './illness';
import { leaveDays } from './leave';

export const REST_BACK_RULE = 'REST-BACK';

export interface RestBackInput {
  plannedSessions: PlannedSession[];
  logs: SessionLog[];
  templates: SessionTemplate[];
  today: string;
  // Je vaste rustdag, 1 (maandag) tot 7 (zondag).
  restDay?: number;
  // De dag van je hoofddoel: daarop en daarna staat niets.
  anchor?: string;
  leave?: LeavePeriod[];
  illnessEpisodes?: IllnessEpisode[];
}

// De rijen Herstel die een voorstel liet vervallen op een vaste rustdag die nu weer leeg is.
export function restDaysToBringBack(input: RestBackInput): PlannedSession[] {
  const { plannedSessions, logs, today, restDay } = input;
  if (!restDay) return [];
  const byId = new Map(input.templates.map((t) => [t.id, t]));
  const isRest = (s: PlannedSession) => byId.get(s.templateId)?.type === 'recovery';
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const leave = leaveDays(input.leave);
  const out: PlannedSession[] = [];
  const seen = new Set<string>();
  for (const s of plannedSessions) {
    const date = s.scheduledDate;
    if (s.status !== 'skipped' || !isRest(s) || s.lock?.by !== 'proposal' || s.leave || s.catchUp) continue;
    if (date < today || logged.has(s.id) || isoWeekday(date) !== restDay || seen.has(date)) continue;
    if ((input.anchor && date >= input.anchor) || leave.has(date) || isIllnessDay(date, input.illnessEpisodes, today)) continue;
    // De dag is weer leeg: niets gepland dat niet overgeslagen is, en niets gedaan op die dag.
    if (plannedSessions.some((o) => o.id !== s.id && o.status !== 'skipped' && o.scheduledDate === date)) continue;
    if (logs.some((l) => l.completedDate === date)) continue;
    // De week heeft zijn rust al ergens anders (een rustdag die meeschoof): niet nog een.
    const monday = mondayOfWeek(date);
    if (plannedSessions.some((o) => o.id !== s.id && o.status !== 'skipped' && isRest(o) && mondayOfWeek(o.scheduledDate) === monday)) continue;
    seen.add(date);
    out.push(s);
  }
  return out.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.id.localeCompare(b.id));
}

// Het voorstel per rij. Akkoord zet dezelfde rij terug op zijn dag (een 'add' die de overgeslagen rij
// noemt): gepland, zonder slot, zoals het systeem hem had. Liever niet onthoudt het antwoord (id per rij).
export function restBackAdvice(input: RestBackInput & { on?: boolean }): Advice[] {
  if (input.on === false) return [];
  return restDaysToBringBack(input).map((s) => {
    const date = s.scheduledDate;
    const weekday = weekdayLongNL(date);
    const title = `Je rustdag op ${weekday} is weer vrij`;
    // De titel en de eerste regel lezen samen als "Je rustdag op maandag is weer vrij. Zet hem terug?".
    const lead = `Zet hem terug? Dan staat hij weer op ${weekday} ${formatDateNL(date)}.`;
    const effect = `Zet hem terug? Met Akkoord staat je rustdag weer op ${weekday} ${formatDateNL(date)}. Met Liever niet blijft de dag leeg en vraagt ASCEND er niet meer naar.`;
    const why = 'Een eerder voorstel liet je rustdag vervallen om plek te maken. Wat daar kwam, staat nu ergens anders, dus de dag is weer leeg. Een vaste rustdag in de week kan helpen om fris aan je volgende training te beginnen. ASCEND zet hem niet stil terug: alleen jij beslist.';
    const item: PlanChangeItem = {
      plannedSessionId: s.id, action: 'add', toDate: date,
      newSessionDraft: { templateId: s.templateId, scheduledDate: date, weekStartDate: mondayOfWeek(date) },
      reason: 'De dag is weer leeg: je rustdag komt terug.', generatedBy: ['engine/restDayBack.ts', REST_BACK_RULE],
    };
    const proposal: PlanChangeProposal = {
      id: makeId('planchange'), trigger: 'session_skipped', issue: title, changes: [item], alternatives: [],
      consequences: `Je rustdag staat weer op ${weekday} ${formatDateNL(date)}.`, explanation: why, createdAt: new Date().toISOString(),
    };
    return { id: `restback:${s.id}`, trigger: 'plan_update', ruleId: REST_BACK_RULE, title, effect, lead, brief: `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${formatDateNL(date)} staat leeg`, why, priority: 2, proposal };
  });
}

// Een lege dag in Week: op je vaste rustdag "Rustdag", anders "Vrij". Staat de rust van die week al op
// een andere dag (een rij Herstel die niet overgeslagen is, na REST-SWAP of REST-PULL), dan is de lege
// vaste rustdag gewoon "Vrij", zodat Week geen twee keer rust in één week toont. Alleen weergave.
export function emptyDayText(
  date: string,
  restDay: number | undefined,
  sessions: PlannedSession[] = [],
  templateById: Map<string, SessionTemplate> = new Map(),
): { rest: boolean; title: string; line: string } {
  const monday = mondayOfWeek(date);
  const restElsewhere = sessions.some((o) => o.status !== 'skipped' && o.scheduledDate !== date && mondayOfWeek(o.scheduledDate) === monday && templateById.get(o.templateId)?.type === 'recovery');
  return restDay && isoWeekday(date) === restDay && !restElsewhere
    ? { rest: true, title: 'Rustdag', line: 'je vaste rustdag' }
    : { rest: false, title: 'Vrij', line: 'niets gepland' };
}
