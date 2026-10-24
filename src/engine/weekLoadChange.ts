// ASCEND: een rustweek doortrainen of terugzetten, en een week herhalen of de
// herhaling terugzetten, raakt alleen wat nog open is
// (docs/beslissingen/2026-10-24-rustweek-via-voorstel.md).
//
// De belasting van een week staat niet op de trainingen zelf: ze volgt uit de
// plek van de week in het programma (utils/dates.ts#resolveProgramWeek). Een
// wijziging midden in de week zou dus ook de dagen ervoor anders laten lezen.
// Daarom houdt het programma de dagen voor de wijziging vast zoals ze stonden
// (Program.heldWeekDays): een gedane of voorbije training verandert nooit.
// Wat je zelf vastzette (een slot) houdt zijn lengte: die krijgt een vaste
// lengte in het voorstel. Hoogtemeters en rugzak volgen de week wel, en het
// voorstel zegt dat er per training bij. Wat overblijft zijn de open trainingen; is er niets
// meer open dat zou veranderen, dan is er niets te kiezen.
//
// Pure: no React, no IndexedDB.

import type { HeldWeekDays, Program } from '../models/program';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { addDays, formatDateNL, mondayOfWeek, resolveProgramWeek, weekdayShortNL } from '../utils/dates';
import { PHASE_TAPER, WAVE_LENGTH, progressionTarget } from './programLayout';
import { lockLevel } from './weekValidator';

// The minutes of a session with this program, as the screens show them.
export type MinutesOf = (session: PlannedSession, template: SessionTemplate, program: Program) => number;

export interface WeekLoadContext {
  sessions: PlannedSession[];
  logs: SessionLog[];
  templates: SessionTemplate[];
  today: string;
  minutesOf: MinutesOf;
}

export interface LoadChange {
  // 'past': the week is over. 'done': nothing open changes any more. 'open': there is something to choose.
  state: 'past' | 'done' | 'open';
  // The program as it would be, with the days before `from` held.
  program: Program;
  // The first day the change reaches.
  from: string;
  // Open trainings that get another length, D+ or rucksack.
  open: PlannedSession[];
  // Yours (a lock): they keep their length, as a fixed length.
  kept: { session: PlannedSession; minutes: number }[];
  // More minutes in the open trainings than before.
  heavier: boolean;
  // Some of the open trainings are in a later week (a repeat shifts the rest of the wave).
  laterWeeks: boolean;
  // One sentence for under the button, or instead of it.
  sentence: string;
  // Per open training what changes ("Duurloop op zo 25 okt: 50 naar 70 minuten"),
  // and per training of yours that it keeps its length.
  lines: string[];
  keptLines: string[];
}

// The first day a change of this week may touch: not before today, and only
// after the last training of the week that is done.
export function changeStart(weekStart: string, today: string, sessions: PlannedSession[], logs: SessionLog[]): string {
  const monday = mondayOfWeek(weekStart);
  const sunday = addDays(monday, 6);
  let from = today > monday ? today : monday;
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  for (const s of sessions) {
    if (logged.has(s.id) && s.scheduledDate <= sunday && s.scheduledDate >= from) from = addDays(s.scheduledDate, 1);
  }
  return from;
}

// The program with the days of this week before `from` held as they stand.
export function holdDaysBefore(program: Program, weekStart: string, from: string): Program {
  const monday = mondayOfWeek(weekStart);
  if (from <= monday) return program;
  const until = from < addDays(monday, 7) ? from : addDays(monday, 7);
  const held = program.heldWeekDays ?? [];
  // Already held up to this day or later: the state now applies to no day yet.
  if (held.some((h) => h.week === monday && h.until >= until)) return program;
  const entry: HeldWeekDays = {
    week: monday,
    until,
    ...(program.skippedRestWeeks?.includes(monday) ? { restSkipped: true as const } : {}),
    ...(program.repeatedWeeks?.includes(monday) ? { repeated: true as const } : {}),
  };
  const next = [...held, entry].sort((a, b) => a.week.localeCompare(b.week) || a.until.localeCompare(b.until));
  return { ...program, heldWeekDays: next };
}

// The program as the current choices have it, without the held days: for
// questions about the week as a whole (is it skipped, repeated).
export function currentChoices(program: Program): Program {
  return program.heldWeekDays ? { ...program, heldWeekDays: undefined } : program;
}

export function isRestWeekAt(program: Program, monday: string): boolean {
  const position = resolveProgramWeek(currentChoices(program), monday);
  return !!position && position.phase.id !== PHASE_TAPER && ((position.weekInPhase - 1) % WAVE_LENGTH) + 1 === WAVE_LENGTH;
}

// Whole weeks until the next rest week that is not trained through.
export function weeksToNextRestWeek(program: Program, weekStart: string): number | undefined {
  const monday = mondayOfWeek(weekStart);
  for (let k = 1; k <= 104; k++) {
    const week = addDays(monday, 7 * k);
    if (!resolveProgramWeek(program, week)) return undefined;
    if (isRestWeekAt(program, week) && !program.skippedRestWeeks?.includes(week)) return k;
  }
  return undefined;
}

export function doneSentence(program: Program, weekStart: string): string {
  const k = weeksToNextRestWeek(program, weekStart);
  if (k === undefined) return 'Deze week is al zo goed als klaar.';
  return `Deze week is al zo goed als klaar; de volgende rustweek komt ${k === 1 ? 'volgende week' : `over ${k} weken`}.`;
}

export const PAST_SENTENCE = 'Deze week is voorbij. Wat je deed blijft staan zoals het was.';

function changeSentence(n: number, heavier: boolean, laterWeeks: boolean): string {
  const what = n === 1 ? 'de training die nog komt' : `de ${n} trainingen die nog komen`;
  const when = laterWeeks ? 'deze week en volgende week' : 'deze week';
  return `Maakt ${what} ${when} ${heavier ? 'zwaarder' : 'lichter'}.`;
}

const kg = (n: number) => String(n).replace('.', ',');

type Step = { elevationGainM?: number; backpackKg?: number };

function stepParts(a?: Step, b?: Step): string[] {
  const parts: string[] = [];
  if ((a?.elevationGainM ?? 0) !== (b?.elevationGainM ?? 0)) parts.push(`${Math.round(a?.elevationGainM ?? 0)} naar ${Math.round(b?.elevationGainM ?? 0)} m omhoog`);
  if ((a?.backpackKg ?? 0) !== (b?.backpackKg ?? 0)) parts.push(`${kg(a?.backpackKg ?? 0)} naar ${kg(b?.backpackKg ?? 0)} kg rugzak`);
  return parts;
}

function loadDiff(was: number, now: number, a?: Step, b?: Step): string {
  const parts: string[] = [];
  if (was !== now) parts.push(`${Math.round(was)} naar ${Math.round(now)} minuten`);
  return [...parts, ...stepParts(a, b)].join(', ');
}

// Yours keeps its length, but the D+ and the rucksack follow the week like
// any other training of it: the line says so, so the sheet hides nothing.
function keptLine(on: string, was: number, lengthHeld: boolean, a?: Step, b?: Step): string {
  const step = stepParts(a, b);
  const keeps = lengthHeld ? `houdt zijn ${was} minuten` : 'houdt zijn lengte';
  return step.length ? `${on} zette je zelf vast; die ${keeps}, maar gaat van ${step.join(' en van ')}.` : `${on} zette je zelf vast; die ${keeps}.`;
}

const sameStep = (a: ReturnType<typeof progressionTarget>, b: ReturnType<typeof progressionTarget>) =>
  (a?.step.elevationGainM ?? 0) === (b?.step.elevationGainM ?? 0) && (a?.step.backpackKg ?? 0) === (b?.step.backpackKg ?? 0);

// What `change` does to the week of `weekStart`, up to `until` (the last day
// it can reach): which open trainings get another load and which of yours keep
// their length.
export function loadChange(program: Program, weekStart: string, until: string, change: (p: Program) => Program, ctx: WeekLoadContext): LoadChange {
  const monday = mondayOfWeek(weekStart);
  const from = changeStart(monday, ctx.today, ctx.sessions, ctx.logs);
  const next = change(holdDaysBefore(program, monday, from));
  const base = { program: next, from, open: [], kept: [], heavier: false, laterWeeks: false, lines: [], keptLines: [] };
  if (addDays(monday, 6) < ctx.today) return { ...base, state: 'past', sentence: PAST_SENTENCE };

  const logged = new Set(ctx.logs.map((l) => l.plannedSessionId).filter(Boolean));
  const byId = new Map(ctx.templates.map((t) => [t.id, t]));
  const open: PlannedSession[] = [];
  const kept: LoadChange['kept'] = [];
  const lines: string[] = [];
  const keptLines: string[] = [];
  let before = 0;
  let after = 0;
  for (const s of [...ctx.sessions].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))) {
    const t = byId.get(s.templateId);
    if (!t || t.type === 'recovery' || s.status === 'skipped' || s.scheduledDate < from || s.scheduledDate > until) continue;
    const level = lockLevel(s, logged, ctx.today);
    if (level === 0) continue;
    const was = s.plannedMinutes ?? ctx.minutesOf(s, t, program);
    const now = s.plannedMinutes ?? ctx.minutesOf(s, t, next);
    const stepWas = progressionTarget(t, program, s.scheduledDate);
    const stepNow = progressionTarget(t, next, s.scheduledDate);
    if (was === now && sameStep(stepWas, stepNow)) continue;
    const on = `${t.name} op ${weekdayShortNL(s.scheduledDate).toLowerCase()} ${formatDateNL(s.scheduledDate)}`;
    if (level === 1) {
      if (was !== now) kept.push({ session: s, minutes: was });
      keptLines.push(keptLine(on, was, was !== now, stepWas?.step, stepNow?.step));
      continue;
    }
    open.push(s);
    lines.push(`${on}: ${loadDiff(was, now, stepWas?.step, stepNow?.step)}`);
    before += was;
    after += now;
  }
  if (open.length === 0) return { ...base, kept, keptLines, state: 'done', sentence: doneSentence(program, monday) };
  const heavier = after > before;
  const laterWeeks = open.some((s) => s.scheduledDate > addDays(monday, 6));
  return { ...base, state: 'open', open, kept, keptLines, lines, heavier, laterWeeks, sentence: changeSentence(open.length, heavier, laterWeeks) };
}
