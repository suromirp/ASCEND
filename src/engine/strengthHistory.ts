// ASCEND: the strength model read from the logs, for the page Kracht. Pure.
//
// This is the quiet part: ASCEND counts along with the strength trainings that
// come in through the MacroFactor export, per exercise, and says what it would
// have advised before each of them ("vergelijking"). Nothing here changes a
// plan or a log.

import { exerciseById } from '../data/exercises';
import type { Exercise } from '../models/exercise';
import type { Program } from '../models/program';
import type { SessionLog, SessionTemplate } from '../models/training';
import { addDays, daysBetween, formatDateNL } from '../utils/dates';
import { matchExercise, normalizeExerciseName } from './exerciseMatch';
import { FATIGUE_THRESHOLDS, fatigueEvents, legFatigueOn, type FatigueEvent, type LegFatigueInputs } from './legFatigue';
import { logSport } from './sports';
import {
  analyseSessions,
  deriveRange,
  describePlannedSet,
  lastWeightMismatch,
  prescribe,
  referenceWeight,
  topSetOf,
  type Prescription,
  type RepRange,
  type SessionInput,
  type SessionPoint,
} from './strengthModel';
import type { ResolvedStrengthSettings } from './strengthSettings';
import { isWorkSet } from './workSets';

// --- tired legs --------------------------------------------------------------------------

export interface LegsTired {
  // "een bergtocht gisteren": what the legs are tired from, in words.
  because: string;
}

// The thresholds of "a mountain hike, a long run or a hard run" in the 48
// hours before a leg exercise. Choices of this file (the report names the three
// but not the numbers).
export const HIKE_CLIMB_M = 500;
export const LONG_HIKE_MINUTES = 180;
export const LONG_RUN_MINUTES = 75;
export const HARD_RUN_RPE = 7;
export const HARD_RUN_MINUTES = 20;

function hardLegLabel(log: SessionLog): string | undefined {
  const sport = logSport(log);
  const data = log.outdoorData ?? log.cardioData;
  const climb = Math.max(log.outdoorData?.elevationGainM ?? 0, log.outdoorData?.elevationLossM ?? 0, data?.elevationGainM ?? 0);
  if (sport === 'hiking') {
    if (climb >= HIKE_CLIMB_M) return 'een bergtocht';
    if (log.durationMinutes >= LONG_HIKE_MINUTES) return 'een lange tocht';
  }
  if (sport === 'running') {
    if (log.durationMinutes >= LONG_RUN_MINUTES) return 'een lange duurloop';
    if ((log.rpe ?? 0) >= HARD_RUN_RPE && log.durationMinutes >= HARD_RUN_MINUTES) return 'een harde loop';
  }
  return undefined;
}

const dayWord = (ago: number) => (ago <= 0 ? 'eerder vandaag' : ago === 1 ? 'gisteren' : 'eergisteren');

export interface LegsDeps {
  logs: SessionLog[];
  templates: SessionTemplate[];
  program?: Program | null;
  bodyKg?: number;
  events?: FatigueEvent[];
}

// Are the legs tired on this day, from what happened in the 48 hours before
// (a mountain hike, a long or hard run) or because the leg index says so?
// `before` is the moment of the training itself: on the same day only what came
// earlier counts.
export function legsTiredAt(date: string, before: string | undefined, deps: LegsDeps): LegsTired | undefined {
  for (const log of deps.logs) {
    if (log.type === 'strength') continue;
    const ago = daysBetween(log.completedDate, date);
    if (ago < 0 || ago > 2) continue;
    if (ago === 0 && before && log.completedAt >= before) continue;
    const label = hardLegLabel(log);
    if (label) return { because: `${label} ${dayWord(ago)}` };
  }
  const inputs: LegFatigueInputs = { logs: deps.logs, plannedSessions: [], templates: deps.templates, today: date, bodyKg: deps.bodyKg, program: deps.program };
  const events = deps.events ?? fatigueEvents(inputs);
  const result = legFatigueOn(date, inputs, events);
  if (result.index > FATIGUE_THRESHOLDS.hard.fresh) return { because: 'de zware dagen ervoor' };
  return undefined;
}

// --- per exercise ---------------------------------------------------------------------------

export interface HistorySession extends SessionInput {
  logId: string;
  trainingName: string;
  tired?: LegsTired;
}

export interface ExerciseHistory {
  key: string;
  exercise?: Exercise;
  // Dutch name from the list, otherwise the name as it came in.
  name: string;
  sessions: HistorySession[];
}

export function exerciseKey(exerciseId: string, exerciseName: string): { key: string; exercise?: Exercise } {
  const exercise = exerciseById(exerciseId) ?? (matchExercise(exerciseName) ? exerciseById(matchExercise(exerciseName)!) : undefined);
  return { key: exercise?.id ?? `naam:${normalizeExerciseName(exerciseName)}`, exercise };
}

export function exerciseHistories(logs: SessionLog[], templates: SessionTemplate[], deps: LegsDeps): ExerciseHistory[] {
  const names = new Map(templates.map((t) => [t.id, t.name]));
  const events = deps.events ?? fatigueEvents({ logs: deps.logs, plannedSessions: [], templates: deps.templates, today: '9999-12-31', program: deps.program });
  const map = new Map<string, ExerciseHistory>();
  const tiredCache = new Map<string, LegsTired | undefined>();
  for (const log of [...logs].sort((a, b) => a.completedAt.localeCompare(b.completedAt))) {
    for (const entry of log.strengthData ?? []) {
      if (!entry.sets.some(isWorkSet)) continue;
      const { key, exercise } = exerciseKey(entry.exerciseId, entry.exerciseName);
      let history = map.get(key);
      if (!history) {
        history = { key, exercise, name: exercise?.name ?? entry.exerciseName, sessions: [] };
        map.set(key, history);
      }
      const existing = history.sessions.find((s) => s.logId === log.id);
      if (existing) {
        existing.sets = [...existing.sets, ...entry.sets];
        continue;
      }
      let tired: LegsTired | undefined;
      if (exercise?.loadsLegs) {
        const ck = log.id;
        if (!tiredCache.has(ck)) tiredCache.set(ck, legsTiredAt(log.completedDate, log.completedAt, { ...deps, events }));
        tired = tiredCache.get(ck);
      }
      history.sessions.push({ date: log.completedDate, sets: [...entry.sets], logId: log.id, trainingName: names.get(log.templateId) ?? 'Krachttraining', legsTired: !!tired, ...(tired ? { tired } : {}) });
    }
  }
  return [...map.values()];
}

// --- the view of one exercise ---------------------------------------------------------------------

export interface LinePoint {
  label: string;
  value: number;
}

export interface ExerciseView {
  history: ExerciseHistory;
  points: SessionPoint[];
  range: RepRange;
  // What you can handle for the middle of the rep range, per training: the
  // line of the chart. Not the estimated maximum.
  line: LinePoint[];
  // The last point of the line, with the reps and reps in reserve it is for.
  now?: { weightKg: number; reps: number; rir: number };
  next?: Prescription;
  // The last weight is something the gym profile cannot make: no proposal.
  weightMismatch?: boolean;
  // The estimated strength (shown in the explanation only).
  strengthKg?: number;
}

export function exerciseView(history: ExerciseHistory, settings: ResolvedStrengthSettings, bodyKg: number | undefined, today: string, tiredNow?: LegsTired): ExerciseView {
  const ctx = { exercise: history.exercise, bodyKg, maxToFailure: settings.estimateUpTo };
  const points = analyseSessions(history.sessions, ctx);
  const range = deriveRange(points);
  const line: LinePoint[] = [];
  let now: ExerciseView['now'];
  for (const p of points) {
    if (p.smoothed === undefined) continue;
    const ref = referenceWeight(p.smoothed, range, ctx);
    if (!ref) continue;
    line.push({ label: formatDateNL(p.date), value: ref.weightKg });
    now = { weightKg: ref.weightKg, reps: ref.reps, rir: range.rir };
  }
  const input = { exercise: history.exercise, sessions: history.sessions, date: lastDateOrToday(history, today), bodyKg, settings, tired: tiredNow };
  const next = prescribe(input);
  const weightMismatch = !next && lastWeightMismatch(input);
  return { history, points, range, line, now, next, ...(weightMismatch ? { weightMismatch } : {}), strengthKg: [...points].reverse().find((p) => p.smoothed !== undefined)?.smoothed };
}

// A training can be today itself; the prescription is for after the last one.
function lastDateOrToday(history: ExerciseHistory, today: string): string {
  const last = history.sessions.reduce((m, s) => (s.date > m ? s.date : m), '');
  return today > last ? today : addDays(last, 1);
}

export function exerciseViews(histories: ExerciseHistory[], settings: ResolvedStrengthSettings, bodyKg: number | undefined, today: string, tiredNow?: LegsTired): ExerciseView[] {
  return histories
    .map((h) => exerciseView(h, settings, bodyKg, today, tiredNow))
    .sort((a, b) => b.history.sessions.length - a.history.sessions.length || a.history.name.localeCompare(b.history.name, 'nl'));
}

// --- the comparison: what ASCEND would have said, next to what was done ---------------------------------

export interface ComparisonRow {
  logId: string;
  date: string;
  trainingName: string;
  exerciseKey: string;
  exerciseName: string;
  prescribed: string;
  actual: string;
  prescribedKg: number;
  actualKg: number;
  withinOneStep: boolean;
  reason: string;
  // Why the advice was what it was, in a word: 'tired' means tired legs explained it.
  kind: Prescription['kind'];
}

export function comparisonRows(histories: ExerciseHistory[], settings: ResolvedStrengthSettings, bodyKg: number | undefined): ComparisonRow[] {
  const rows: ComparisonRow[] = [];
  for (const h of histories) {
    const ctx = { exercise: h.exercise, bodyKg, maxToFailure: settings.estimateUpTo };
    for (let i = 1; i < h.sessions.length; i++) {
      const s = h.sessions[i];
      const rx = prescribe({ exercise: h.exercise, sessions: h.sessions.slice(0, i), date: s.date, bodyKg, settings, tired: s.tired });
      const top = topSetOf(s.sets, ctx);
      if (!rx || !top) continue;
      const first = rx.sets[0];
      if (first.weightKg === 0 && top.weightKg === 0) continue;
      const actualSet = { weightKg: top.weightKg, repsLow: top.reps, repsHigh: top.reps, rir: top.rir ?? 0 };
      const actual = top.rir === undefined ? describeActual(h.exercise, top.weightKg, top.reps) : describePlannedSet(h.exercise, actualSet);
      rows.push({
        logId: s.logId,
        date: s.date,
        trainingName: s.trainingName,
        exerciseKey: h.key,
        exerciseName: h.name,
        prescribed: describePlannedSet(h.exercise, first),
        actual,
        prescribedKg: first.weightKg,
        actualKg: top.weightKg,
        withinOneStep: Math.abs(top.weightKg - first.weightKg) <= rx.stepKg + 1e-6,
        reason: rx.reason,
        kind: rx.kind,
      });
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date) || a.exerciseName.localeCompare(b.exerciseName, 'nl'));
}

function describeActual(exercise: Exercise | undefined, weightKg: number, reps: number): string {
  return describePlannedSet(exercise, { weightKg, repsLow: reps, repsHigh: reps, rir: 0 }).replace(/, tot het uiterste$/, '');
}

export interface Accuracy {
  total: number;
  within: number;
  sentence: string;
}

// The one honest sentence above the comparison.
export const MIN_COMPARISONS = 5;

export function accuracy(rows: ComparisonRow[]): Accuracy {
  const total = rows.length;
  const within = rows.filter((r) => r.withinOneStep).length;
  if (total === 0) return { total, within, sentence: 'Er is nog geen training waarvoor ASCEND vooraf iets had kunnen voorstellen. Daarvoor zijn minstens twee trainingen van dezelfde oefening nodig, met herhalingen in reserve.' };
  if (total < MIN_COMPARISONS) {
    return { total, within, sentence: `Nog te weinig om iets over te zeggen: pas ${total} keer kon ASCEND vooraf iets voorstellen. Vanaf ${MIN_COMPARISONS} keer staat hier hoe vaak het klopte.` };
  }
  return { total, within, sentence: `Bij ${within} van de ${total} oefeningen zat het voorstel van ASCEND hooguit één stap van het gewicht dat je echt pakte.` };
}
