// ASCEND: a planned training as an intervals.icu workout, for the watch.
//
// intervals.icu sends the workouts in its agenda to Garmin Connect, and from
// there to the watch. ASCEND puts the trainings of the coming week in that
// agenda (integrations/intervalsIcu.ts does the sending; this file only
// decides WHAT is sent). Pure: no React, no IndexedDB, no network.
//
// The text is intervals.icu's own "workout builder" syntax (checked against
// the forum's Workout Builder Syntax Quick Guide, October 2026):
//
//   Warming-up
//   - Inlopen 10m
//
//   Herhalingen 2x
//   - Drempeltempo 7m 6:05/km-6:20/km Pace
//   - Rustig 1m30s 7:10/km-8:00/km Pace
//
// One line per step: "- cue duration target". Text before the duration is the
// cue the watch shows ("m" is minutes, "s" seconds, "h" hours). A repeat is a
// header ending in "2x", with an empty line before and after the block.
//
// Choices, and why:
// - Heart rate OR pace for a whole session, never mixed. A tempo run and the
//   intervals run on pace (from the test, engine/racePaces.ts) when there is
//   a test; everything else runs on heart rate zones, like the guide in the
//   app says. intervals.icu converts one kind of target per workout, and
//   pace targets only reach the watch when the pace is a plain number.
// - A step shorter than two minutes gets no heart rate target (the heart rate
//   lags, the watch would beep for nothing), and a recovery step never gets
//   one (a beep telling you your heart rate is too high is the opposite of
//   recovery). Pace targets hold from one minute on.
// - Warming up, cooling down and walking (up and down a hill) get no target at
//   all, heart rate or pace: you do them by feel, and a number to hold there
//   only distracts.
// - Strength is NOT sent. The content lives in MacroFactor; a note on the
//   watch would only be clutter and a strength workout without exercises
//   starts nothing useful. A rest day, the race (nothing to prescribe, you
//   run your own race) and anything without a Garmin sport are skipped too.
// - The 5 km test is sent as warm-up, "5km" without a target and cool-down:
//   a test is run by feel and a beep on a "target" would spoil it.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import { WORKOUTS, type StepKind } from '../data/workoutStructure';
import { addDays, formatWeekdayDayMonthNL } from '../utils/dates';
import { buildWorkoutPlan, type PlanStep, type WorkoutPlan } from './workoutPlan';
import { formatPace, type PaceRange, type RacePaces } from './racePaces';
import { hrPercentTarget, type WatchHrPlan } from './watchHeartRate';
import { resolvePlace } from './trainingPlace';
import { getModality } from '../data/modalities';
import { placeBrief } from '../data/placeBrief';

export const WATCH_EXTERNAL_PREFIX = 'ascend:';
// intervals.icu sends about the next 7 days to the watch, so that is as far
// ahead as ASCEND fills the agenda too.
export const WATCH_DAYS = 7;

// In front of the name of every event, so the trainings ASCEND sends are easy
// to tell apart from your own in intervals.icu and Garmin Connect.
export type WatchNamePrefix = 'short' | 'long' | 'none';
export const WATCH_NAME_PREFIXES: Record<WatchNamePrefix, string> = { short: 'ASC ', long: 'ASCEND \u00b7 ', none: '' };
// The advice: short, so it stays short on the watch screen.
export const DEFAULT_WATCH_NAME_PREFIX: WatchNamePrefix = 'short';

export interface WatchBuildOptions {
  // Which prefix goes before the name ("ASC ", "ASCEND \u00b7 " or none), and, unless
  // none, a short dated line in the description. Absent = short
  // (AppSettings.watchNamePrefix).
  namePrefix?: WatchNamePrefix;
  // How a heart rate target is written (engine/watchHeartRate.ts): ASCEND's
  // own beats as a percentage of the threshold of intervals.icu, or the zone
  // name. Absent = the zone name. Only runs use it: the zones of ASCEND are
  // running zones.
  hr?: WatchHrPlan;
  // The stored choice Waar train je? per planned training (storage/trainingPlace.ts, unread). A run whose
  // chosen way is the StairMaster goes to the watch as a walking workout of its own. Absent = the
  // workout of the training, as before.
  places?: Record<string, string>;
  // "Eigen workout bij een andere manier" (AppSettings.watchPlaceWorkout). Absent = on; off = `places` is ignored.
  placeWorkout?: boolean;
}

export type WatchSport = 'Run' | 'Walk' | 'Hike' | 'Ride';
type WatchTarget = 'HR' | 'PACE';

export interface WatchWorkout {
  plannedId: string;
  // The id ASCEND gives the event in intervals.icu (its external_id): the
  // only way ASCEND ever recognises its own events.
  externalId: string;
  date: string;
  name: string;
  type: WatchSport;
  description: string;
  movingTimeSec: number;
  target: WatchTarget;
  // Changes whenever anything the watch would show changes.
  fingerprint: string;
}

// Trainings that are not sent, whatever their structure says.
const NOT_SENT = new Set(['tpl_race']);
// The test is a distance, not a time.
const DISTANCE_STEPS: Record<string, string> = { tpl_test_run: '5km' };
// Sessions where the hard blocks run on pace when there is a test.
const PACE_SESSIONS = new Set(['tpl_tempo_run', 'tpl_intervals']);

const HR_MIN_SECONDS = 120;
const PACE_MIN_SECONDS = 60;

export function externalIdFor(plannedId: string): string {
  return `${WATCH_EXTERNAL_PREFIX}${plannedId}`;
}

// "1h30m", "10m", "1m30s", "90s" is written "1m30s": whole units, none zero.
export function formatStepDuration(seconds: number): string {
  const total = Math.max(1, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h ? `${h}h` : ''}${m ? `${m}m` : ''}${s ? `${s}s` : ''}`;
}

// "6:05/km-6:20/km Pace": absolute pace, the form the watch understands.
export function paceTarget(range: PaceRange): string {
  const fast = Math.min(range.fast, range.slow);
  const slow = Math.max(range.fast, range.slow);
  return `${formatPace(fast)}/km-${formatPace(slow)}/km Pace`;
}

// The cue shows on the watch; digits and symbols in it could be read as part
// of a duration, so only letters and spaces stay.
function cue(label: string): string {
  return label.replace(/[^\p{L} ]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function stepRange(step: PlanStep, template: SessionTemplate, paces: RacePaces): PaceRange {
  if (step.kind === 'work') {
    return template.id === 'tpl_intervals' ? paces.interval : paces.threshold;
  }
  return paces.easy;
}

// Steps done by feel: no target on the watch.
const OPEN_KINDS = new Set<StepKind>(['warmup', 'cooldown', 'walk']);

function hrTarget(step: PlanStep, hr?: WatchHrPlan): string | undefined {
  if (step.noTarget || step.kind === 'recover' || OPEN_KINDS.has(step.kind) || step.seconds < HR_MIN_SECONDS) return undefined;
  if (hr?.kind === 'bpm') {
    const percent = hrPercentTarget(hr, step.intensity);
    if (percent) return percent;
  }
  if (step.intensity === 4) return 'Z4-Z5 HR';
  return `Z${step.intensity} HR`;
}

const HEADER: Partial<Record<StepKind, string>> = { warmup: 'Warming-up', cooldown: 'Cooling-down' };

interface WorkoutText {
  text: string;
  target: WatchTarget;
}

// The workout text for a session. `paces` is optional: without a test every
// session runs on heart rate zones.
function intervalsWorkoutText(plan: WorkoutPlan, template: SessionTemplate, paces?: RacePaces, hr?: WatchHrPlan): WorkoutText {
  const target: WatchTarget = paces && PACE_SESSIONS.has(template.id) ? 'PACE' : 'HR';
  const distance = DISTANCE_STEPS[template.id];

  const stepCue = (step: PlanStep): string => (distance && step.kind === 'work' ? 'Test' : cue(step.label));
  const line = (step: PlanStep): string => {
    const label = stepCue(step);
    const amount = distance && step.kind === 'work' ? distance : formatStepDuration(step.seconds);
    let goal: string | undefined;
    if (distance && step.kind === 'work') goal = undefined;
    else if (OPEN_KINDS.has(step.kind)) goal = undefined;
    else if (target === 'PACE') goal = step.seconds >= PACE_MIN_SECONDS && paces ? paceTarget(stepRange(step, template, paces)) : undefined;
    else goal = hrTarget(step, hr);
    return ['-', label, amount, goal].filter(Boolean).join(' ');
  };

  const blocks: string[] = [];
  for (const item of plan.items) {
    if ('step' in item) {
      const header = HEADER[item.step.kind];
      blocks.push(header ? `${header}\n${line(item.step)}` : line(item.step));
    } else {
      blocks.push(`Herhalingen ${item.repeat}x\n${item.steps.map(line).join('\n')}`);
    }
  }
  return { text: blocks.join('\n\n'), target };
}

// The sport of the workout ASCEND sends for this training; the Briefing compares it with the chosen way of
// training (engine/briefing.ts#watchPlaceLine).
export function watchSportOf(template: SessionTemplate): WatchSport | undefined {
  return sportOf(template);
}

// The ways of training that get a workout of their own: a fixed list, the StairMaster only. A new way joins
// only after a decision of its own (docs/beslissingen/2026-11-12-stairmaster-horloge.md): each way needs its own
// names for the steps, its own zones and a sentence in the Briefing that is true for it.
const OWN_WORKOUT_PLACES = new Set(['stairmaster_intervals', 'stairmaster']);

// The way of training that gets a workout of its own, or undefined when the workout of the training stands.
// Only a running workout with the StairMaster chosen. intervals.icu and Garmin have no stair stepper as a kind
// of planned workout; Walk is the kind ASCEND already sends for walking trainings.
export function watchPlaceOf(template: SessionTemplate, stored: unknown, placeWorkout?: boolean): string | undefined {
  if (placeWorkout === false || typeof stored !== 'string' || !OWN_WORKOUT_PLACES.has(stored) || sportOf(template) !== 'Run') return undefined;
  const place = resolvePlace(template, stored);
  return place === stored && getModality(template.id, place) ? place : undefined;
}

// The sport of the workout for this training with this choice of place.
export function watchSportFor(template: SessionTemplate, stored: unknown, placeWorkout?: boolean): WatchSport | undefined {
  return watchPlaceOf(template, stored, placeWorkout) ? 'Walk' : sportOf(template);
}

// The plan as the walking way names its steps ("Stevig traplopen" for "Hard bergop"); minutes and repeats stay.
function walkingPlan(plan: WorkoutPlan, templateId: string, place: string): WorkoutPlan {
  const steps = placeBrief(templateId, place)?.steps;
  if (!steps) return plan;
  const relabel = (s: PlanStep): PlanStep => (steps[s.label] ? { ...s, label: steps[s.label].label } : s);
  return { ...plan, items: plan.items.map((it) => ('step' in it ? { step: relabel(it.step) } : { repeat: it.repeat, steps: it.steps.map(relabel) })) };
}

// The line above the steps of a walking workout: which way, and how hard the hard blocks are. A hard block
// shorter than two minutes has no heart rate target (the heart rate lags), so the effort is said in words.
function walkingNote(plan: WorkoutPlan, templateId: string, place: string): string {
  const label = getModality(templateId, place)?.label ?? 'Wandelen';
  const hard = plan.timeline.some((s) => s.intensity === 4 && s.kind !== 'warmup' && s.kind !== 'cooldown');
  return hard ? `${label}. Op gevoel en hartslag, geen tempo. De stevige blokken: RPE 8-9.` : `${label}. Op gevoel en hartslag, geen tempo.`;
}

function sportOf(template: SessionTemplate): WatchSport | undefined {
  const spec = WORKOUTS[template.id]?.garminSport;
  if (!spec) return undefined;
  if (spec.startsWith('Hardlopen')) return 'Run';
  if (spec.startsWith('Fietsen')) return 'Ride';
  if (spec.includes('Hike')) return 'Hike';
  if (spec.startsWith('Wandelen')) return 'Walk';
  return undefined;
}

// A small stable hash (djb2): only to see whether something changed.
function fingerprintOf(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// One planned session as a watch workout, or undefined when it is not sent
// (strength, rest, the race, no structure).
export function buildWatchWorkout(
  session: PlannedSession,
  template: SessionTemplate,
  program: Program | null | undefined,
  paces?: RacePaces,
  options: WatchBuildOptions = {},
): WatchWorkout | undefined {
  if (NOT_SENT.has(template.id)) return undefined;
  const base = sportOf(template);
  if (!base) return undefined;
  const raw = buildWorkoutPlan(template, session.scheduledDate, program);
  if (!raw) return undefined;
  // A walking way for a run: the same steps in time, named by the way, as a walking workout without pace.
  const place = watchPlaceOf(template, options.places?.[session.id], options.placeWorkout);
  const type: WatchSport = place ? 'Walk' : base;
  const plan = place ? walkingPlan(raw, template.id, place) : raw;
  const built = intervalsWorkoutText(plan, template, place ? undefined : paces, type === 'Run' ? options.hr : undefined);
  const target = built.target;
  const prefix = WATCH_NAME_PREFIXES[options.namePrefix ?? DEFAULT_WATCH_NAME_PREFIX];
  const marked = options.namePrefix !== 'none';
  const steps = place ? `${walkingNote(plan, template.id, place)}\n\n${built.text}` : built.text;
  const text = marked ? `Gepland door ASCEND voor ${formatWeekdayDayMonthNL(session.scheduledDate)}\n\n${steps}` : steps;
  const movingTimeSec = plan.timeline.reduce((sum, s) => sum + s.seconds, 0);
  const base0 = { plannedId: session.id, externalId: externalIdFor(session.id), date: session.scheduledDate, name: `${prefix}${template.name}`, type, description: text, movingTimeSec, target };
  return { ...base0, fingerprint: fingerprintOf(JSON.stringify([base0.date, base0.name, base0.type, base0.description, base0.movingTimeSec, base0.target])) };
}

export interface SelectInput {
  sessions: PlannedSession[];
  logs: SessionLog[];
  templates: SessionTemplate[];
  program: Program | null | undefined;
  paces?: RacePaces;
  today: string;
  days?: number;
  options?: WatchBuildOptions;
}

// What should be on the watch: the planned trainings of today and the coming
// days that are not done and not skipped. In the order they come.
export function selectWatchWorkouts(input: SelectInput): WatchWorkout[] {
  const { sessions, logs, templates, program, paces, today, options } = input;
  const last = addDays(today, (input.days ?? WATCH_DAYS) - 1);
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const byId = new Map(templates.map((t) => [t.id, t]));
  const out: { w: WatchWorkout; order: number }[] = [];
  for (const s of sessions) {
    if (s.scheduledDate < today || s.scheduledDate > last) continue;
    if (s.status === 'skipped' || logged.has(s.id)) continue;
    const template = byId.get(s.templateId);
    if (!template) continue;
    const w = buildWatchWorkout(s, template, program, paces, options);
    if (w) out.push({ w, order: s.order });
  }
  return out.sort((a, b) => a.w.date.localeCompare(b.w.date) || a.order - b.order).map((x) => x.w);
}

// --- what to do about the difference ------------------------------------------

// What ASCEND remembers of an event it put in the agenda.
export interface TrackedWorkout {
  externalId: string;
  date: string;
  fingerprint: string;
  eventId?: number;
  // When ASCEND last wrote this event to the agenda (ISO timestamp); older
  // records have none (engine/watchStatus.ts falls back to the last round).
  sentAt?: string;
  // The kind of workout that was written (a run, or a walking workout for the StairMaster); older records
  // have none and were always the workout of the training.
  type?: WatchSport;
}

export interface SyncPlan {
  create: WatchWorkout[];
  update: { workout: WatchWorkout; tracked: TrackedWorkout }[];
  remove: { plannedId: string; tracked: TrackedWorkout }[];
  // Done or past, with removal of done trainings switched off: nothing to send
  // or delete, ASCEND just stops tracking it (it stays in the agenda).
  forget: string[];
}

// Compares what should be on the watch with what ASCEND put there before.
// Only things in `tracked` are ever updated or removed: an event the owner put
// in intervals.icu himself is not in it, so it is never touched.
//
// With `removeDone` (AppSettings.watchRemoveDone, absent = on) a training that
// is done (it has a log) or whose day has passed is also taken out of the
// agenda, instead of only being forgotten. Only events ASCEND tracked: the
// activity itself is a separate thing in intervals.icu and is never touched.
export function planWatchSync(
  desired: WatchWorkout[],
  tracked: Record<string, TrackedWorkout>,
  today: string,
  loggedPlannedIds: Set<string>,
  options: { removeDone?: boolean } = {},
): SyncPlan {
  const plan: SyncPlan = { create: [], update: [], remove: [], forget: [] };
  const wanted = new Set(desired.map((d) => d.plannedId));
  for (const w of desired) {
    const t = tracked[w.plannedId];
    if (!t) plan.create.push(w);
    else if (t.fingerprint !== w.fingerprint || t.date !== w.date) plan.update.push({ workout: w, tracked: t });
  }
  for (const [plannedId, t] of Object.entries(tracked)) {
    if (wanted.has(plannedId)) continue;
    const done = t.date < today || loggedPlannedIds.has(plannedId);
    if (done && options.removeDone === false) plan.forget.push(plannedId);
    else plan.remove.push({ plannedId, tracked: t });
  }
  return plan;
}
