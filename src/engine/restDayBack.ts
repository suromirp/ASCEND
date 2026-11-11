// ASCEND: de rustdag komt terug (regel REST-BACK, besluit docs/beslissingen/2026-11-01-rustdag-terug.md).
//
// Een voorstel kan de rij Herstel op je vaste rustdag laten vervallen om plek te maken (TEST-RETRY,
// een inhaalvoorstel). Gaat wat daar kwam later weer weg, dan is de dag leeg maar staat Herstel nog
// op overgeslagen met het slot van dat voorstel. Dan stelt ASCEND voor de rij terug te zetten, met
// Akkoord en Liever niet; nooit stil. Wat je zelf oversloeg (jouw slot) blijft van jou, net als wat een
// vakantie of tocht liet gaan (die zet het zelf terug). Historie (gelogd of voorbij) raakt dit nooit.
//
// Geen rustdag terug na rust (besluit docs/beslissingen/2026-11-01-rustdag-na-rust.md): hadden de twee
// dagen ervoor geen trainingsbelasting, dan is er niets om van te herstellen. En staat er een gemiste test
// of sleuteltraining die op die dag past, dan blijft de dag vrij om in te halen: dat voorstel gaat voor.
//
// Ook de weergave van een lege dag in Week staat hier: op je vaste rustdag heet die "Rustdag", en is die
// bezet, dan heet de vrije dag die deze week je rust is "Rustdag deze week".
//
// Puur: geen React, geen IndexedDB.

import type { Advice } from './adviceEngine';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { IllnessEpisode } from '../models/illness';
import type { LeavePeriod } from '../models/leave';
import { addDays, daysBetween, formatDateNL, isoWeekday, mondayOfWeek, weekdayLongNL } from '../utils/dates';
import { makeId } from '../utils/id';
import { isIllnessDay } from './illness';
import { leaveDays } from './leave';
import { hasRole } from './templateRoles';
import { isKeyFor, type KeyFocus } from './keySession';
import { hardRunApart } from './hardRunApart';
import { respectsHeavySpacing } from './scheduler';
import { caughtUpMap } from './catchUp';
import { restDayThisWeek } from './restDayThisWeek';

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
  // Wat de sleuteltraining is (engine/keySession.ts), dezelfde als bij het inhalen. Zonder: de lange duurloop of de bergtocht.
  keyFocus?: KeyFocus;
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
    // Twee dagen zonder belasting ervoor: geen rust nodig.
    if (!trainedOn(addDays(date, -1), input, byId) && !trainedOn(addDays(date, -2), input, byId)) continue;
    // Een gemiste test of sleuteltraining die op die dag past: inhalen gaat voor.
    if (catchUpFits(date, s, input, byId)) continue;
    seen.add(date);
    out.push(s);
  }
  return out.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.id.localeCompare(b.id));
}

// Had deze dag trainingsbelasting: dezelfde keuze als de belasting per dag (engine/weekProfile.ts#dayLoads):
// wat gedaan is op de dag van doen, wat nog komt op de geplande dag, en niets wat gemist, overgeslagen of
// rust is. Een ziektedag heeft dus vanzelf geen belasting.
function trainedOn(day: string, input: RestBackInput, byId: Map<string, SessionTemplate>): boolean {
  const logged = new Set(input.logs.map((l) => l.plannedSessionId).filter(Boolean));
  if (input.logs.some((l) => l.completedDate === day && l.type !== 'recovery')) return true;
  return day >= input.today && input.plannedSessions.some((o) => o.scheduledDate === day && o.status !== 'skipped' && !logged.has(o.id) && !!byId.get(o.templateId) && byId.get(o.templateId)!.type !== 'recovery');
}

// Een gemiste belangrijke training (een test, of een sleuteltraining van engine/keySession.ts) in de zeven dagen
// voor `date`, niet gelogd, niet ingehaald, niet door een voorstel of vakantie losgelaten en niet op een
// ziektedag, die op `date` past met de 48 uur tussen zware beendagen en, net als bij het inhalen, zonder
// harde loop ernaast (engine/hardRunApart.ts). Gemist is voorbij zonder log, of zelf
// overgeslagen.
function catchUpFits(date: string, rest: PlannedSession, input: RestBackInput, byId: Map<string, SessionTemplate>): boolean {
  const logged = new Set(input.logs.map((l) => l.plannedSessionId).filter(Boolean));
  const caughtUp = caughtUpMap(input.plannedSessions);
  const around = input.plannedSessions.filter((o) => o.id !== rest.id && o.status !== 'skipped' && (o.scheduledDate >= input.today || logged.has(o.id)));
  return input.plannedSessions.some((m) => {
    const t = byId.get(m.templateId);
    if (!t || !(hasRole(t, 'test') || isKeyFor(t, input.keyFocus))) return false;
    if (m.scheduledDate >= date || m.scheduledDate < addDays(date, -7) || logged.has(m.id) || caughtUp.has(m.id) || m.leave || m.catchUp) return false;
    if (isIllnessDay(m.scheduledDate, input.illnessEpisodes, input.today)) return false;
    const missed = m.status === 'skipped' ? m.lock?.by === 'user' : m.scheduledDate < input.today;
    if (!missed) return false;
    // Hetzelfde gedaan binnen twee dagen, zonder koppeling: niet gemist.
    if (input.logs.some((l) => !l.plannedSessionId && l.templateId === m.templateId && Math.abs(daysBetween(l.completedDate, m.scheduledDate)) <= 2)) return false;
    if (!respectsHeavySpacing(date, t, around.filter((o) => o.id !== m.id), byId, input.logs, m.id)) return false;
    return hasRole(t, 'test') || hardRunApart(date, m, t, { plannedSessions: around, logs: input.logs, asOf: input.today }, byId);
  });
}

// Een naam midden in een zin: "Herstelwandeling" wordt "herstelwandeling".
const inSentence = (name: string) => `${name.charAt(0).toLowerCase()}${name.slice(1)}`;

// Het voorstel per rij. Akkoord zet dezelfde rij terug op zijn dag (een 'add' die de overgeslagen rij
// noemt): gepland, zonder slot, zoals het systeem hem had. Liever niet onthoudt het antwoord (id per rij).
export function restBackAdvice(input: RestBackInput & { on?: boolean }): Advice[] {
  if (input.on === false) return [];
  const byId = new Map(input.templates.map((t) => [t.id, t]));
  return restDaysToBringBack(input).map((s) => {
    const date = s.scheduledDate;
    const weekday = weekdayLongNL(date);
    const Weekday = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}`;
    // Titel en item noemen dezelfde rij: de naam van wat terugkomt (in de lijst van het voorstel staat die naam ook).
    const name = inSentence(byId.get(s.templateId)?.name ?? 'Herstel');
    const title = `Je ${name} op ${weekday} kan terug`;
    const lead = `${Weekday} ${formatDateNL(date)} staat weer leeg. Zet je hem terug?`;
    const effect = `Met Akkoord staat de ${name} weer op ${weekday} ${formatDateNL(date)}, zoals je week hem had. Met Liever niet blijft de dag leeg en vraagt ASCEND er niet meer naar.`;
    const why = `Een eerder voorstel liet de ${name} op je vaste rustdag vervallen om plek te maken. Wat daar kwam, staat nu ergens anders, en je trainde de dagen ervoor, dus de dag is weer leeg. Een vaste rustdag in de week kan helpen om fris aan je volgende training te beginnen. ASCEND zet hem niet stil terug: alleen jij beslist.`;
    const item: PlanChangeItem = {
      plannedSessionId: s.id, action: 'add', toDate: date,
      newSessionDraft: { templateId: s.templateId, scheduledDate: date, weekStartDate: mondayOfWeek(date) },
      reason: `De dag is weer leeg: je ${name} komt terug.`, generatedBy: ['engine/restDayBack.ts', REST_BACK_RULE],
    };
    const proposal: PlanChangeProposal = {
      id: makeId('planchange'), trigger: 'session_skipped', issue: title, changes: [item], alternatives: [],
      consequences: `De ${name} staat weer op ${weekday} ${formatDateNL(date)}.`, explanation: why, createdAt: new Date().toISOString(),
    };
    return { id: `restback:${s.id}`, trigger: 'plan_update', ruleId: REST_BACK_RULE, title, effect, lead, brief: `${Weekday} ${formatDateNL(date)} staat leeg`, why, priority: 2, proposal };
  });
}

// Een lege dag in Week: op je vaste rustdag "Rustdag", anders "Vrij". Staat de rust van die week al op
// een andere dag (een rij Herstel die niet overgeslagen is, na REST-SWAP of REST-PULL), dan is de lege
// vaste rustdag gewoon "Vrij", zodat Week geen twee keer rust in één week toont. Is je vaste rustdag bezet
// (met `extra`: de logs en vandaag), dan heet de dag die deze week je rust is "Rustdag deze week", met de
// reden erbij (engine/restDayThisWeek.ts). Alleen weergave.
export function emptyDayText(
  date: string,
  restDay: number | undefined,
  sessions: PlannedSession[] = [],
  templateById: Map<string, SessionTemplate> = new Map(),
  extra?: { logs: SessionLog[]; today: string; leave?: LeavePeriod[] },
): { rest: boolean; title: string; line: string } {
  const monday = mondayOfWeek(date);
  const restElsewhere = sessions.some((o) => o.status !== 'skipped' && o.scheduledDate !== date && mondayOfWeek(o.scheduledDate) === monday && templateById.get(o.templateId)?.type === 'recovery');
  if (restDay && isoWeekday(date) === restDay && !restElsewhere) return { rest: true, title: 'Rustdag', line: 'je vaste rustdag' };
  const thisWeek = extra ? restDayThisWeek({ anyDay: date, restDay, sessions, logs: extra.logs, templateById, today: extra.today, leave: extra.leave }) : null;
  return thisWeek?.date === date
    ? { rest: true, title: 'Rustdag deze week', line: thisWeek.reason }
    : { rest: false, title: 'Vrij', line: 'niets gepland' };
}
