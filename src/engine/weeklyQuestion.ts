// ASCEND, the question of the week (data/weeklyQuestions.ts).
//
// One "Als ..., wat doe je dan?" a week on Today, and the one line you answer
// with. Which question it is follows from the week and the phase of the
// program, with fixed rules and no AI or randomness: the same week always
// gives the same question, on any device.
//
// How the pick works:
// - The phase of the week decides the pool: basis, opbouw, wedstrijdblok (the
//   weeks of a secondary race block up to and including race week), the week
//   after the race, bergcapaciteit, expeditieklaar, taper, and the weeks after
//   the main goal date (the trek itself). The pools do not overlap, so a
//   question never returns in another phase.
// - Phases that run toward an event (wedstrijd, expeditie, taper) count from
//   the end: the last question of the pool belongs to the last week, however
//   long the phase is set. The other pools turn around with the week number,
//   so consecutive weeks never get the same question until the pool has been
//   used up. Each pool is at least as long as the weeks it covers between now
//   and the goal (weeklyQuestion.test.ts walks the whole way).
// - Without a program or a goal (Onderhoud) the general pool is used: the
//   basis and opbouw questions, which do not depend on a specific phase.
//
// Your answers are kept as WeeklyIntention in the settings and are append-only:
// an answer is never rewritten. See answerIntention below.
//
// Pure: no React, no IndexedDB.

import { WEEK_QUESTIONS, type WeekQuestion, type WeekQuestionPhase } from '../data/weeklyQuestions';
import type { WeeklyIntention } from '../models/checkIn';
import type { GoalMilestone, TrainingGoal } from '../models/goals';
import type { Program } from '../models/program';
import { addDays, daysBetween, mondayOfWeek, resolveProgramWeek } from '../utils/dates';
import { PHASE_BASIS, PHASE_BERG, PHASE_EXPEDITIE, PHASE_OPBOUW, PHASE_TAPER } from './programLayout';

export const MAX_ANSWER_LENGTH = 160;

// How long after the main goal date the trek questions are used (weeks).
const GR5_WEEKS = 8;

// A Monday long before any program, the zero point of the week count.
const EPOCH_MONDAY = '2024-01-01';

export type QuestionPool = WeekQuestionPhase | 'algemeen';

// What the pick needs to know about a week. Built by weekQuestionContext.
export interface WeekQuestionContext {
  weekStart: string; // Monday
  // The program phase this week falls in, when there is one.
  phase?: { id: string; weekInPhase: number; weekCount: number };
  // Secondary race blocks (engine/raceBlock.ts#raceBlocks), by their Mondays.
  races?: { blockStart: string; raceWeek: string }[];
  // The main goal's date, also when it is already past.
  goalDate?: string;
}

// The main goal's date, also after it has passed (the trek weeks need it).
// Same choice as engine/programLayout.ts#programAnchorDate: the active goal
// that has the Ascent Ladder.
export function mainGoalDate(goals: TrainingGoal[], milestones: GoalMilestone[]): string | undefined {
  const withLadder = new Set(milestones.map((m) => m.goalId));
  const main = goals.find((g) => g.status === 'active' && withLadder.has(g.id));
  return main && main.status === 'active' ? main.targetDate : undefined;
}

export function weekQuestionContext(inputs: {
  weekStart: string;
  program: Program | null | undefined;
  races?: { blockStart: string; raceWeek: string }[];
  goalDate?: string;
}): WeekQuestionContext {
  const weekStart = mondayOfWeek(inputs.weekStart);
  const position = inputs.program ? resolveProgramWeek(inputs.program, weekStart) : null;
  return {
    weekStart,
    phase: position ? { id: position.phase.id, weekInPhase: position.weekInPhase, weekCount: position.phase.weekCount } : undefined,
    races: inputs.races,
    goalDate: inputs.goalDate,
  };
}

// Which pool a week draws from.
export function questionPool(ctx: WeekQuestionContext): QuestionPool {
  const { weekStart, goalDate } = ctx;
  if (goalDate && weekStart > goalDate && weekStart <= addDays(goalDate, 7 * GR5_WEEKS)) return 'gr5';
  for (const race of ctx.races ?? []) {
    if (weekStart >= race.blockStart && weekStart <= race.raceWeek) return 'wedstrijd';
    if (weekStart === addDays(race.raceWeek, 7)) return 'na_wedstrijd';
  }
  switch (ctx.phase?.id) {
    case PHASE_BASIS: return 'basis';
    case PHASE_OPBOUW: return 'opbouw';
    case PHASE_BERG: return 'berg';
    case PHASE_EXPEDITIE: return 'expeditie';
    case PHASE_TAPER: return 'taper';
    default: return 'algemeen';
  }
}

function poolQuestions(pool: QuestionPool, questions: WeekQuestion[]): WeekQuestion[] {
  if (pool === 'algemeen') return questions.filter((q) => q.phase === 'basis' || q.phase === 'opbouw');
  return questions.filter((q) => q.phase === pool);
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

// Weeks since a fixed Monday: the turning number of the pools that are not
// counted from an end.
export function weekNumber(weekStart: string): number {
  return Math.floor(daysBetween(EPOCH_MONDAY, mondayOfWeek(weekStart)) / 7);
}

// How many weeks are left in the phase the pool is counted back from (0 is
// the last week), or undefined when the pool is not counted from an end.
function weeksToEnd(pool: QuestionPool, ctx: WeekQuestionContext): number | undefined {
  if (pool === 'wedstrijd') {
    const race = (ctx.races ?? []).find((r) => ctx.weekStart >= r.blockStart && ctx.weekStart <= r.raceWeek);
    return race ? Math.round(daysBetween(ctx.weekStart, race.raceWeek) / 7) : undefined;
  }
  if ((pool === 'expeditie' || pool === 'taper') && ctx.phase) return ctx.phase.weekCount - ctx.phase.weekInPhase;
  return undefined;
}

// The question for a week. Always returns one, as long as the question list
// has a question for the pool (the tests make sure it has).
export function pickWeekQuestion(ctx: WeekQuestionContext, questions: WeekQuestion[] = WEEK_QUESTIONS): WeekQuestion {
  const pool = poolQuestions(questionPool(ctx), questions);
  const list = pool.length > 0 ? pool : questions;
  const toEnd = weeksToEnd(questionPool(ctx), ctx);
  const index = toEnd !== undefined ? mod(list.length - 1 - toEnd, list.length) : mod(weekNumber(ctx.weekStart), list.length);
  return list[index];
}

// --- your answers ------------------------------------------------------------

export function intentionForWeek(list: WeeklyIntention[] | undefined, weekStart: string): WeeklyIntention | undefined {
  return list?.find((e) => e.weekStart === weekStart);
}

// On Today until you answered, in the week itself. "Later" hides it for the
// rest of that day.
export function shouldShowWeeklyQuestion(list: WeeklyIntention[] | undefined, weekStart: string, today: string): boolean {
  if (mondayOfWeek(today) !== weekStart) return false;
  const entry = intentionForWeek(list, weekStart);
  if (entry?.answer) return false;
  return entry?.laterOn !== today;
}

function sorted(list: WeeklyIntention[]): WeeklyIntention[] {
  return [...list].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

function withEntry(list: WeeklyIntention[] | undefined, entry: WeeklyIntention): WeeklyIntention[] {
  return sorted([...(list ?? []).filter((e) => e.weekStart !== entry.weekStart), entry]);
}

// The line as stored: one line, no stray spaces, not longer than the field.
export function cleanAnswer(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_ANSWER_LENGTH).trim();
}

// Saves your plan for a week. Append-only: a week that already has an answer
// keeps it, and an empty line is not an answer.
export function answerIntention(list: WeeklyIntention[] | undefined, question: WeekQuestion, weekStart: string, answer: string, nowIso: string): WeeklyIntention[] {
  const text = cleanAnswer(answer);
  const existing = intentionForWeek(list, weekStart);
  if (!text || existing?.answer) return list ?? [];
  return withEntry(list, { weekStart, questionId: question.id, question: existing?.question ?? question.vraag, answer: text, answeredAt: nowIso });
}

// "Later": the card is hidden for the rest of today and comes back tomorrow.
export function postponeIntention(list: WeeklyIntention[] | undefined, question: WeekQuestion, weekStart: string, today: string): WeeklyIntention[] {
  const existing = intentionForWeek(list, weekStart);
  if (existing?.answer) return list ?? [];
  return withEntry(list, { weekStart, questionId: existing?.questionId ?? question.id, question: existing?.question ?? question.vraag, laterOn: today });
}

// Restoring a backup never drops an answer the device has, and an answer
// beats a week that was only postponed. Otherwise the device's own record
// wins, the same rule as the other history lists in the settings.
export function mergeIntentions(incoming: WeeklyIntention[] | undefined, current: WeeklyIntention[] | undefined): WeeklyIntention[] | undefined {
  if (!incoming && !current) return undefined;
  const byWeek = new Map((incoming ?? []).map((e) => [e.weekStart, e]));
  for (const e of current ?? []) {
    const other = byWeek.get(e.weekStart);
    byWeek.set(e.weekStart, other?.answer && !e.answer ? other : e);
  }
  return sorted([...byWeek.values()]);
}

// A record from a file or from storage that can be trusted: used on import,
// where a damaged line is dropped instead of reaching the screen.
export function isWeeklyIntention(v: unknown): v is WeeklyIntention {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const e = v as Record<string, unknown>;
  const optionalText = (x: unknown) => x === undefined || typeof x === 'string';
  return (
    typeof e.weekStart === 'string' && /^\d{4}-\d{2}-\d{2}/.test(e.weekStart)
    && typeof e.questionId === 'string' && e.questionId.length > 0
    && typeof e.question === 'string'
    && optionalText(e.answer) && optionalText(e.answeredAt) && optionalText(e.laterOn)
  );
}
