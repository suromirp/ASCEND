// ASCEND — "Deze week nog een keer" (docs/visie/Trainingswetenschap.md,
// knelpunt 3 en idee 5).
//
// The build-up follows the calendar: after a week in which little got done
// (and you were not ill) the plan steps up to the next, heavier week anyway.
// A coach would say: this week once more. When last week clearly fell short,
// ASCEND proposes that this week carries last week's load (minutes of the
// runs, D+ and pack of the hikes) instead of the step up. Akkoord records it
// on the program (Program.repeatedWeeks); Liever niet changes nothing and the
// question is not asked again for that week.
//
// How it is recorded, and why this way. The program has no stored weeks; a
// week's load is read from its position (utils/dates.ts#resolveProgramWeek).
// A list of repeated Mondays on the program, like skippedRestWeeks, keeps it
// that way: a repeated week reads the load of the week before it, and so do
// the weeks after it in the same wave, up to the rest week. The wave loses its
// heaviest step and nothing else:
//   wave 1-2-3-rust, repeat in week 2:  1-1-2-rust
//   wave 1-2-3-rust, repeat in week 3:  1-2-2-rust
// A calendar shift (everything one week later) was the other option. It
// needs a week to give: the goal date is fixed, so the taper and the race
// block would have to be eaten into, or a later wave cut short, and every
// session of every later week would move with it. The repeat inside the wave
// moves nothing past the rest week: later waves, the taper and the race block
// stay exactly where they were, and the step from a lowered peak to the next
// wave is held small by the 110% rule (engine/substitutions.ts), which
// measures against what you actually ran. At most one repeat per wave.
//
// Only the weeks where this can be done cleanly are offered: week 2 or 3 of a
// wave in the same phase (not the taper), after a week 1 or 2 of that wave.
// After a poor week 3 the rest week follows anyway, and a poor rest week
// asks for nothing.
//
// The sessions themselves follow along without being rewritten: the minutes,
// D+ and pack come from the program position at the moment they are read. The
// planning round (storage/database.ts#syncProgramHorizon) adjusts only what
// the system planned (the Saturday alternates between hills and "op en af"
// by wave week); what you pinned and what is history is never touched.
//
// Pure: no React, no IndexedDB.

import type { Program } from '../models/program';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { PlanChangeProposal } from '../models/planChange';
import type { IllnessEpisode } from '../models/illness';
import { addDays, daysBetween, mondayOfWeek, resolveProgramWeek } from '../utils/dates';
import { PHASE_TAPER, WAVE_LENGTH, progressionTarget } from './programLayout';
import { activeIllness, recoveryRamp } from './illness';
import { KEY_TEMPLATES, buildWeekReview } from './weekReview';

// Below this share of the planned trainings (rest sessions not counted) a
// week fell short. A round, explainable line, not a number from a study.
export const REPEAT_SHARE_LIMIT = 0.6;
// With fewer planned trainings one miss decides the share, so only the
// key session counts then.
export const REPEAT_MIN_PLANNED = 3;
// Offered on Monday, Tuesday and Wednesday of the week that would repeat.
const OFFER_DAYS = 2;

// --- 1. did last week fall short -------------------------------------------

export interface WeekOutcome {
  planned: number; // trainings that counted: no rest sessions, no ill days
  done: number;
  keyPlanned: number; // long run or mountain hike
  keyDone: number;
}

export interface WeekVerdict {
  fellShort: boolean;
  fewDone: boolean; // under REPEAT_SHARE_LIMIT of the trainings
  keyMissed: boolean; // the key session was planned and not done
  share?: number; // done / planned
}

export function judgeWeek(outcome: WeekOutcome): WeekVerdict {
  const share = outcome.planned > 0 ? outcome.done / outcome.planned : undefined;
  const fewDone = outcome.planned >= REPEAT_MIN_PLANNED && share !== undefined && share < REPEAT_SHARE_LIMIT;
  const keyMissed = outcome.keyPlanned > 0 && outcome.keyDone === 0;
  return { fellShort: fewDone || keyMissed, fewDone, keyMissed, share };
}

// --- 2. where a repeat can sit ---------------------------------------------

export interface RepeatState {
  repeated: boolean; // this very week repeats the week before
  shifted: boolean; // this week carries the load of the week before
}

export function repeatState(program: Program, weekStart: string): RepeatState {
  const position = resolveProgramWeek(program, weekStart);
  return { repeated: !!position?.repeated, shifted: !!position?.loadShift };
}

// The program with this week repeated, or the repeat taken back.
export function withWeekRepeated(program: Program, weekStart: string, repeat: boolean): Program {
  const monday = mondayOfWeek(weekStart);
  const others = (program.repeatedWeeks ?? []).filter((w) => w !== monday);
  const next = repeat ? [...others, monday].sort() : others;
  return { ...program, repeatedWeeks: next.length ? next : undefined };
}

const waveOf = (weekInPhase: number) => ((weekInPhase - 1) % WAVE_LENGTH) + 1;

// Can `weekStart` repeat the week before it? Same phase, no taper, week 2 or
// 3 of the wave, no repeat in this wave yet.
export function canRepeatWeek(program: Program, weekStart: string): boolean {
  const monday = mondayOfWeek(weekStart);
  const here = resolveProgramWeek(program, monday);
  const before = resolveProgramWeek(program, addDays(monday, -7));
  if (!here || !before || here.phase.id !== before.phase.id || here.phase.id === PHASE_TAPER) return false;
  if (here.loadShift || before.loadShift) return false;
  const wave = waveOf(here.weekInPhase);
  return wave >= 2 && wave <= WAVE_LENGTH - 1 && waveOf(before.weekInPhase) === wave - 1;
}

// --- 3. what it costs -------------------------------------------------------

export interface LoadLine {
  minutes: number;
  elevationGainM?: number;
  backpackKg?: number;
}

export interface KeyImpact {
  name: string;
  thisWeek: { from: LoadLine; to: LoadLine };
  // The heaviest week of the wave, when it is not this week itself.
  peak?: { from: LoadLine; to: LoadLine };
}

function loadAt(template: SessionTemplate, program: Program, date: string): LoadLine | undefined {
  const target = progressionTarget(template, program, date);
  if (!target) return undefined;
  const { elevationGainM, backpackKg } = target.step;
  return { minutes: Math.round(target.minutes), ...(elevationGainM ? { elevationGainM } : {}), ...(backpackKg ? { backpackKg } : {}) };
}

// The key session of the week (long run or mountain hike) before and after
// the repeat: this week, and the heaviest week of the wave.
export function keyImpact(program: Program, weekStart: string, plannedSessions: PlannedSession[], templates: SessionTemplate[]): KeyImpact | undefined {
  const monday = mondayOfWeek(weekStart);
  const key = plannedSessions.find((s) => s.scheduledDate >= monday && s.scheduledDate <= addDays(monday, 6) && s.status !== 'skipped' && KEY_TEMPLATES.includes(s.templateId));
  const template = key && templates.find((t) => t.id === key.templateId);
  const position = resolveProgramWeek(program, monday);
  if (!key || !template || !position) return undefined;
  const repeated = withWeekRepeated(program, monday, true);
  const line = (date: string) => {
    const from = loadAt(template, program, date);
    const to = loadAt(template, repeated, date);
    return from && to ? { from, to } : undefined;
  };
  const thisWeek = line(key.scheduledDate);
  if (!thisWeek) return undefined;
  const peakDate = addDays(key.scheduledDate, 7 * (WAVE_LENGTH - 1 - waveOf(position.weekInPhase)));
  const peak = waveOf(position.weekInPhase) < WAVE_LENGTH - 1 ? line(peakDate) : undefined;
  return { name: template.name, thisWeek, ...(peak ? { peak } : {}) };
}

// --- 4. the proposal --------------------------------------------------------

export interface RepeatWeekProposal {
  id: string; // per week: a "liever niet" holds for that week
  weekStart: string; // the week that would repeat
  previousWeek: string;
  done: number;
  planned: number;
  verdict: WeekVerdict;
  missedKey: string[]; // names of the key sessions that were not done
  impact?: KeyImpact;
}

export interface RepeatWeekInputs {
  program: Program | null | undefined;
  plannedSessions: PlannedSession[];
  logs: SessionLog[];
  templates: SessionTemplate[];
  today: string;
  illnessEpisodes?: IllnessEpisode[];
  planChangeLog?: PlanChangeProposal[];
  // Monday of the race week of every running race before the main goal. The
  // race block keeps its own taper: no repeat in the week before, during or
  // after a race.
  raceWeeks?: string[];
  respondedIds: Set<string>;
}

export function repeatWeekId(weekStart: string): string {
  return `repeat-week:${weekStart}`;
}

function illBetween(episodes: IllnessEpisode[] | undefined, from: string, until: string, today: string): boolean {
  return (episodes ?? []).some((e) => e.startDate <= until && (e.endDate ?? today) >= from);
}

export function proposeRepeatWeek(inputs: RepeatWeekInputs): RepeatWeekProposal | undefined {
  const { program, today, illnessEpisodes } = inputs;
  if (!program) return undefined;
  const weekStart = mondayOfWeek(today);
  if (daysBetween(weekStart, today) > OFFER_DAYS) return undefined;
  const id = repeatWeekId(weekStart);
  if (inputs.respondedIds.has(id)) return undefined;
  if (!canRepeatWeek(program, weekStart)) return undefined;
  const previousWeek = addDays(weekStart, -7);

  // The week before was not a rest week and not an ill week; the way back
  // from an illness has its own schedule (engine/illness.ts).
  if (illBetween(illnessEpisodes, previousWeek, addDays(previousWeek, 6), today) || activeIllness(illnessEpisodes) || recoveryRamp(illnessEpisodes, today)) return undefined;
  // The race block has its own taper and short days around the race.
  if ((inputs.raceWeeks ?? []).some((w) => Math.abs(daysBetween(w, weekStart)) <= 7 || Math.abs(daysBetween(w, previousWeek)) <= 7)) return undefined;

  const review = buildWeekReview({
    weekStart: previousWeek, plannedSessions: inputs.plannedSessions, logs: inputs.logs, templates: inputs.templates, program,
    planChangeLog: inputs.planChangeLog ?? [], asOf: today, illnessEpisodes,
  });
  if (!review) return undefined;
  const verdict = judgeWeek(review);
  if (!verdict.fellShort) return undefined;

  const names = new Map(inputs.templates.map((t) => [t.id, t.name]));
  const missedKey = [...new Set(review.missedTemplateIds.filter((t) => KEY_TEMPLATES.includes(t)))].map((t) => names.get(t) ?? 'de lange training');
  return {
    id, weekStart, previousWeek, done: review.done, planned: review.planned, verdict, missedKey,
    impact: keyImpact(program, weekStart, inputs.plannedSessions, inputs.templates),
  };
}

// --- 5. words ---------------------------------------------------------------

export function describeLoad(l: LoadLine): string {
  const parts = [`${l.minutes} minuten`];
  if (l.elevationGainM) parts.push(`${Math.round(l.elevationGainM)} m omhoog`);
  if (l.backpackKg) parts.push(`${String(l.backpackKg).replace('.', ',')} kg rugzak`);
  return parts.join(', ');
}

// The sentence about last week: what fell short.
export function shortfallSentence(p: RepeatWeekProposal): string {
  const counted = `${p.done} van de ${p.planned} trainingen`;
  const key = p.missedKey.length > 0 ? p.missedKey.map((n) => n.toLowerCase()).join(' en de ') : '';
  if (p.verdict.fewDone && p.verdict.keyMissed) return `Vorige week deed je ${counted}, en de ${key} bleef liggen.`;
  if (p.verdict.fewDone) return `Vorige week deed je ${counted}.`;
  return `Vorige week bleef de ${key} liggen, de belangrijkste training van de week.`;
}

// What the repeat costs, in the numbers of the key session.
export function costSentence(impact: KeyImpact | undefined): string {
  if (!impact) return 'De minuten van je lopen, de hoogtemeters en de rugzak blijven op het niveau van vorige week.';
  const name = impact.name.toLowerCase();
  const first = `Je ${name} wordt deze week ${describeLoad(impact.thisWeek.to)} in plaats van ${describeLoad(impact.thisWeek.from)}.`;
  if (!impact.peak) return `${first} Dat is de zwaarste week van deze golf, die dus lichter wordt.`;
  return `${first} De zwaarste week van deze golf wordt daardoor ook lichter: ${describeLoad(impact.peak.to)} in plaats van ${describeLoad(impact.peak.from)}.`;
}
