// ASCEND: een voorstel bij een probleem in de week (regel WEEK-CHECK,
// docs/visie/Waarschuwingen in Week.md, hoofdstuk 5). De weekcontrole mag zelf
// alleen herstellen wat het systeem plande. Staat er iets mis bij een training
// die jij of een geaccepteerd voorstel vastzette, dan doet ze niets stil: ze
// rekent de herstelling die ze anders zou doen (`repairWeeks` met `mayMove` op
// precies die training) en biedt hem aan als voorstel met Akkoord.
//
// Een voorstel komt er alleen als de week er aantoonbaar beter van wordt:
// minder bevindingen en geen nieuwe, dezelfde maat als `judge` in de controle.
// In een volle week kan de enige herstelling een training laten vervallen zijn,
// de lichtste, nooit een lange duurloop, harde loop, test, wedstrijd of tocht.
// Uitzondering bij TEST-DAY: staat er iets van jou op de dag van je test en lost
// verplaatsen het niet op, dan is het weghalen ervan de laatste keuze, alleen als
// de week nog een sessie met dezelfde rol heeft.
// Wat de planning verandert gaat zo altijd langs ProposalSheet.
//
// Pure: no React, no IndexedDB.

import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import type { PlannedSession, SessionTemplate, TemplateRole } from '../models/training';
import { addDays, isoWeekday, mondayOfWeek, weekdayLongNL, weekdayOf } from '../utils/dates';
import { makeId } from '../utils/id';
import type { Advice, AdviceOption } from './adviceEngine';
import { isHardRun, isLegHeavyTemplate } from './scheduler';
import { hasRole, isTestOrRace, templateRoles } from './templateRoles';
import { dayName, weekConcerns, type WeekConcern } from './weekConcerns';
import { findingKey, lockLevel, repairWeeks, validateWeeks, type CheckInput } from './weekValidator';

const SOURCE = ['engine/weekFixProposal.ts'];
const MAX_OPTIONS = 3;
// The roles that say what a session is for; the others are traits (easy pace, extra, asks the legs).
const TASK_ROLES: readonly TemplateRole[] = ['long', 'key', 'hard_run', 'hard_load'];

// Eén wijziging aan één training: een andere dag, korter, of laten vervallen.
// `keeps`: bij weghalen de sessie met dezelfde rol die in de week blijft staan.
interface Change { id: string; from: string; to?: string; removed?: boolean; minutes?: number; keeps?: string }

const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
const lower = (s: string) => `${s.charAt(0).toLowerCase()}${s.slice(1)}`;

// The id of the proposal for a concern, known without working the proposal out: Week can tell from it whether
// you already said Liever niet, without waiting for the calculation (docs/beslissingen/2026-10-28-voorstel-eindstand.md).
export function weekFixId(concern: WeekConcern, sessions: PlannedSession[]): string {
  const ids = [...concern.finding.sessionIds].sort();
  const dates = ids.map((id) => sessions.find((s) => s.id === id)?.scheduledDate ?? '').join(',');
  return `weekfix:${concern.rule}:${ids.join(',')}:${dates}`;
}

export function planWeekFix(input: CheckInput, concern: WeekConcern, weekStart: string): Advice | null {
  const monday = mondayOfWeek(weekStart);
  const byTemplate = new Map(input.templates.map((t) => [t.id, t]));
  const logged = new Set(input.logs.map((l) => l.plannedSessionId).filter(Boolean));
  const level = (s: PlannedSession) => lockLevel(s, logged, input.today);
  const sessionById = (id: string) => input.sessions.find((s) => s.id === id);
  const templateOf = (s: PlannedSession): SessionTemplate | undefined => byTemplate.get(s.templateId);
  const base: CheckInput = { ...input, reportYours: true };
  const weeks = new Set([-7, 0, 7].map((o) => addDays(monday, o)));
  const before = validateWeeks(base, weeks);
  const beforeKeys = new Set(before.map(findingKey));
  const isRecovery = (s: PlannedSession) => templateOf(s)?.type === 'recovery';

  const apply = (changes: Change[]): PlannedSession[] => {
    const by = new Map(changes.map((c) => [c.id, c]));
    return input.sessions
      .filter((s) => !by.get(s.id)?.removed)
      .map((s) => {
        const c = by.get(s.id);
        if (!c) return s;
        const date = c.to ?? s.scheduledDate;
        return { ...s, scheduledDate: date, weekStartDate: mondayOfWeek(date), ...(c.minutes ? { plannedMinutes: c.minutes } : {}) };
      });
  };
  // A day with no time budget takes a moved session only when it is empty (as in the week check).
  const roomOk = (changes: Change[]) => {
    const after = apply(changes);
    return changes.every((c) => {
      if (!c.to || c.to === c.from) return true;
      if (input.dailyTimeBudget?.[weekdayOf(c.to)]) return true;
      return !after.some((o) => o.id !== c.id && o.scheduledDate === c.to && o.status !== 'skipped' && !isRecovery(o));
    });
  };
  const improves = (changes: Change[]) => {
    if (changes.length === 0 || !roomOk(changes)) return false;
    const after = validateWeeks({ ...base, sessions: apply(changes) }, weeks);
    return !after.some((f) => findingKey(f) === concern.key) && after.length < before.length && after.every((f) => beforeKeys.has(findingKey(f)));
  };

  // What the week check would do for these sessions of yours, if it were allowed.
  const viaCheck = (ids: string[]): Change[] => {
    const result = repairWeeks({ ...base, mayMove: ids });
    const merged = new Map<string, Change>();
    for (const r of result.repairs) {
      if (!ids.includes(r.sessionId) || r.rule === 'WEEK-START') continue;
      const prev = merged.get(r.sessionId);
      merged.set(r.sessionId, { id: r.sessionId, from: prev?.from ?? r.from, to: r.removed ? undefined : r.to, removed: r.removed, minutes: r.plannedMinutes ?? prev?.minutes });
    }
    return [...merged.values()].filter((c) => c.removed || c.to !== c.from || c.minutes);
  };

  // Another day of the same week for one session, the nearest that is better.
  const viaScan = (id: string): Change[] => {
    const s = sessionById(id);
    if (!s) return [];
    const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
      .filter((d) => d !== s.scheduledDate && d >= input.today && (!input.goalDay || d < input.goalDay) && !(input.raceDays ?? []).includes(d) && isoWeekday(d) !== input.restDay)
      .sort((a, b) => Math.abs(Date.parse(a) - Date.parse(s.scheduledDate)) - Math.abs(Date.parse(b) - Date.parse(s.scheduledDate)) || a.localeCompare(b));
    for (const d of days) {
      const change: Change = { id, from: s.scheduledDate, to: d };
      if (improves([change])) return [change];
    }
    return [];
  };

  // May this one go without hurting the plan? Never a long run, hard run, test, race or tocht.
  const droppable = (s: PlannedSession) => {
    const t = templateOf(s);
    if (!t || s.status === 'skipped' || s.raceBlock || s.leave) return false;
    const l = level(s);
    if (l === 0 || l === 2) return false;
    return t.type !== 'recovery' && t.type !== 'hiking' && t.type !== 'adventure' && !hasRole(t, 'long') && !isTestOrRace(t) && !isHardRun(t) && !isLegHeavyTemplate(t);
  };
  const minutesOf = (s: PlannedSession) => s.plannedMinutes ?? (templateOf(s) ? input.minutesOf?.(s, templateOf(s)!) ?? templateOf(s)!.durationVariants.full : 0);

  const sessions = concern.finding.sessionIds.map(sessionById).filter((s): s is PlannedSession => !!s);
  const yours = sessions.filter((s) => level(s) === 1);
  const candidates: Change[][] = [];
  const push = (c: Change[]) => { if (c.length > 0 && improves(c)) candidates.push(c); };
  let lastResort: Change[] | null = null;
  // Another session of the same week, not skipped, with the same task: the same template, or a role that says
  // what the session is for (a long run, a hard run). A shared trait such as an easy pace is not enough.
  const sameRoleElsewhere = (s: PlannedSession): PlannedSession | undefined => {
    const t = templateOf(s);
    if (!t || isTestOrRace(t)) return undefined;
    const roles = templateRoles(t).filter((r) => TASK_ROLES.includes(r));
    return input.sessions
      .filter((o) => o.id !== s.id && o.status !== 'skipped' && mondayOfWeek(o.scheduledDate) === monday)
      .filter((o) => {
        const ot = templateOf(o);
        return !!ot && !isTestOrRace(ot) && (ot.id === t.id || roles.some((r) => hasRole(ot, r)));
      })
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
  };

  switch (concern.rule) {
    case 'REST-DAY': {
      const subject = sessionById(concern.finding.subjectId);
      if (!subject) return null;
      push(viaCheck([subject.id]));
      if (droppable(subject)) push([{ id: subject.id, from: subject.scheduledDate, removed: true }]);
      else {
        // The lightest other training of the week goes and the one on your rest day takes its day.
        const others = input.sessions
          .filter((s) => s.id !== subject.id && mondayOfWeek(s.scheduledDate) === monday && s.scheduledDate >= input.today && droppable(s))
          .sort((a, b) => minutesOf(a) - minutesOf(b) || a.scheduledDate.localeCompare(b.scheduledDate));
        for (const x of others) {
          const swap: Change[] = [{ id: x.id, from: x.scheduledDate, removed: true }, { id: subject.id, from: subject.scheduledDate, to: x.scheduledDate }];
          if (improves(swap)) { candidates.push(swap); break; }
        }
      }
      break;
    }
    case 'LEG-SPACING': {
      // The later one first (as the check would), then the earlier one.
      const ordered = [...sessions].sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
      const mine = ordered.filter((s) => level(s) === 1 || level(s) === 3);
      if (mine[0] && mine[0].id === concern.finding.subjectId) push(viaCheck([mine[0].id]));
      for (const s of mine) push(viaScan(s.id));
      break;
    }
    case 'ONE-LONG': {
      const later = [...sessions].sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate)).find((s) => level(s) === 1 || level(s) === 3);
      const short = later && templateOf(later)?.durationVariants.short;
      if (later && short) push([{ id: later.id, from: later.scheduledDate, minutes: short }]);
      break;
    }
    case 'TEST-FRESH': {
      const test = sessionById(concern.finding.subjectId);
      const near = input.sessions.filter((s) => level(s) === 1 && test && s.scheduledDate < test.scheduledDate && s.scheduledDate >= addDays(test.scheduledDate, -7)).map((s) => s.id);
      push(viaCheck(near));
      break;
    }
    default: {
      // TWO-HARD-RUNS, TEST-DAY and AFTER-TEST: the one the rule would change, then the other of yours.
      const subject = sessionById(concern.finding.subjectId);
      if (subject && level(subject) === 1) push(viaCheck([subject.id]));
      for (const s of yours) if (s.id !== subject?.id) push(viaScan(s.id));
      // TEST-DAY in a full week: as the last choice the other session goes, only when it is yours and the week
      // keeps another session with the same role. Never the test or race itself.
      if (concern.rule === 'TEST-DAY' && subject && level(subject) === 1) {
        const twin = sameRoleElsewhere(subject);
        if (twin) {
          const removal: Change[] = [{ id: subject.id, from: subject.scheduledDate, removed: true, keeps: twin.id }];
          if (improves(removal)) lastResort = removal;
        }
      }
    }
  }
  if (candidates.length === 0 && !lastResort) return null;

  // The same change twice is one option.
  const seen = new Set<string>();
  const unique = candidates.filter((c) => {
    const sig = c.map((x) => `${x.id}>${x.removed ? 'weg' : x.to ?? x.from}/${x.minutes ?? ''}`).sort().join('|');
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  }).slice(0, lastResort ? MAX_OPTIONS - 1 : MAX_OPTIONS);
  if (lastResort) unique.push(lastResort);

  const nameOf = (id: string) => templateOf(sessionById(id)!)?.name ?? 'Training';
  const sentence = (changes: Change[]) => {
    const after = apply(changes);
    const freeNow = (date: string) => !after.some((o) => o.scheduledDate === date && o.status !== 'skipped' && !isRecovery(o));
    const parts: string[] = [];
    for (const c of changes) {
      const free = freeNow(c.from) ? ` ${capital(weekdayLongNL(c.from))} is dan vrij.` : '';
      const kept = c.keeps ? sessionById(c.keeps) : undefined;
      const keep = kept ? ` Je houdt de ${lower(nameOf(kept.id))} op ${dayName(kept.scheduledDate)}.` : '';
      if (c.removed) parts.push(`Laat ${nameOf(c.id)} op ${dayName(c.from)} gaan.${freeNow(c.from) ? ` Dan heb je ${weekdayLongNL(c.from)} vrij.` : ''}${keep}`);
      else if (c.to && c.to !== c.from) parts.push(`${nameOf(c.id)} gaat van ${dayName(c.from)} naar ${dayName(c.to)}.${free}`);
      else parts.push(`${nameOf(c.id)} op ${dayName(c.from)} wordt de korte versie, ${c.minutes} minuten.`);
    }
    return parts.join(' ');
  };
  const labelOf = (changes: Change[]) => {
    const lead = changes.find((c) => c.removed) ?? changes[0];
    if (lead.removed && lead.keeps) return `${nameOf(lead.id)} op ${dayName(lead.from)} weghalen`;
    return lead.removed ? `${nameOf(lead.id)} laten vervallen` : lead.to && lead.to !== lead.from ? `${nameOf(lead.id)} verplaatsen` : `${nameOf(lead.id)} korter`;
  };
  const items = (changes: Change[]): PlanChangeItem[] => changes.map((c) => ({
    plannedSessionId: c.id,
    action: c.removed ? 'remove' : 'move',
    fromDate: c.from,
    toDate: c.removed ? undefined : c.to ?? c.from,
    ...(c.minutes ? { plannedMinutes: c.minutes } : {}),
    reason: concern.headline,
    generatedBy: SOURCE,
  }));
  const proposalOf = (changes: Change[]): PlanChangeProposal => ({
    id: makeId('planchange'),
    trigger: 'plan_check',
    issue: concern.title,
    changes: items(changes),
    alternatives: [],
    consequences: sentence(changes),
    explanation: concern.why,
    createdAt: new Date().toISOString(),
  });
  const options: AdviceOption[] = unique.map((c) => ({ label: labelOf(c), effect: sentence(c), proposal: proposalOf(c) }));

  return {
    id: weekFixId(concern, input.sessions),
    trigger: 'plan_update',
    ruleId: 'WEEK-CHECK',
    title: concern.title,
    effect: options[0].effect,
    why: concern.why,
    priority: 40,
    proposal: options[0].proposal,
    ...(options.length > 1 ? { options } : {}),
  };
}

// Wat Week laat zien: de meldingen van de getoonde week en per melding het voorstel, als dat er is.
// Met `proposals` uit (de instelling) blijven de meldingen en de rijteksten, maar komt er geen voorstel.
export interface WeekNotice {
  concerns: WeekConcern[];
  fixes: Record<string, Advice>;
  // Meldingen waar op Vandaag al een voorstel voor staat: hier geen tweede.
  covered: string[];
}

// De sessies waar een open voorstel van Vandaag al over gaat: alle wijzigingen en opties, en de
// test waar TEST-MAKE-ROOM omheen plant (het id van dat advies is `testroom:<sessie>`).
export function adviceSessionIds(advice: Advice[]): Set<string> {
  const ids = new Set<string>();
  for (const a of advice) {
    if (a.id.startsWith('testroom:')) ids.add(a.id.slice('testroom:'.length));
    for (const p of [a.proposal, ...(a.options ?? []).map((o) => o.proposal)]) {
      for (const c of p?.changes ?? []) if (c.plannedSessionId) ids.add(c.plannedSessionId);
    }
  }
  return ids;
}

// The cheap half of `weekNotice`: the concerns (about 10 ms) with what a proposal of Vandaag already covers, and
// no proposals. Week draws this at once; the proposals follow when you ask for them.
export function weekNoticeConcerns(input: CheckInput, weekStart: string, taken: Set<string> = new Set()): WeekNotice {
  const concerns = weekConcerns(input, weekStart);
  const covered = concerns.filter((c) => [...c.finding.sessionIds, c.finding.subjectId].some((id) => taken.has(id))).map((c) => c.key);
  return { concerns, fixes: {}, covered };
}

export const TAKEN_LINE = 'Hier staat al een voorstel voor op Vandaag.';

export function weekNotice(input: CheckInput, weekStart: string, proposals: boolean, taken: Set<string> = new Set()): WeekNotice {
  const concerns = weekConcerns(input, weekStart);
  const fixes: Record<string, Advice> = {};
  const covered: string[] = [];
  const touches = (ids: Iterable<string>) => [...ids].some((id) => taken.has(id));
  for (const c of concerns) {
    if (touches([...c.finding.sessionIds, c.finding.subjectId])) { covered.push(c.key); continue; }
    if (!proposals) continue;
    const fix = planWeekFix(input, c, weekStart);
    if (!fix) continue;
    if (touches(adviceSessionIds([fix]))) { covered.push(c.key); continue; }
    fixes[c.key] = fix;
  }
  return { concerns, fixes, covered };
}
