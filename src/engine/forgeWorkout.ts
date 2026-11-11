// ASCEND: the workout screen of Forge, the rules behind it. Pure; no React, no
// storage. The screen (components/forge/ForgeWorkout.tsx) calls these functions
// and renders the result.
//
// The layout follows the way the owner trains in MacroFactor Workouts: per
// exercise a table that is always open, warm-up rows (W) and working sets,
// the prescription per set, kg and reps already filled in, a box to tick and a
// bubble with the reps in reserve. Decision:
// docs/beslissingen/2026-10-22-forge-workoutscherm.md.
//
// What this file decides:
// - the rows of an exercise: from the Forge prescription (engine/strengthModel.ts)
//   when there is history, else from the template ("4 x 6-8");
// - when the rest timer starts (after a working set and after the LAST warm-up
//   set, not after the other warm-up sets) and for how long;
// - which plates go on each side of the bar, and what changes from the set before;
// - which exercises can stand in for another one (same muscles, same gym);
// - what is stored: only ticked rows, as SetLog with kind, kg, reps and RIR.

import { EXERCISES, exerciseById } from '../data/exercises';
import { FAMILY_ONLY } from '../data/exerciseFamilies';
import type { Exercise, MovementPattern, MuscleGroup, Resistance } from '../models/exercise';
import type { Program } from '../models/program';
import type { ExercisePrescription, ExerciseSetLog, SessionLog, SessionTemplate, SetBand, SetKind, SetLog, SetTarget } from '../models/training';
import { formatNumberNL } from '../utils/number';
import { fatigueEvents, fatigueWord, legFatigueOn } from './legFatigue';
import { earlierTodayPoints, easeExerciseReason, easeSlots, EASE_RIR, EASE_RIR_EXTRA } from './legDayEase';
import { legSorenessList, type SoreSource } from './legSoreness';
import type { LegEaseHow } from './legEaseSettings';
import { cleanExerciseName } from './exerciseMatch';
import { exerciseHistories, exerciseKey, legsTiredAt, type ExerciseHistory, type LegsTired } from './strengthHistory';
import { assumedRaise, DEFAULT_RIR, dumbbellTotalFor, expectedReps, fatigueFactor, formatWeight, HARD_SET_MAX_RIR, isHardPair, lastDateBefore, prescribe, raisedText, TOP_SET_LADDER, topSetWarmups, usedBefore, warmupSets, warmupShapes, type DoneBefore, type Prescription, type SetAim, type WarmupSet } from './strengthModel';
import { COMPOUND_PATTERNS, isCompound, newWarmState, noteWorked, warmupKind, type WarmKind, type WarmState } from './warmup';
import { programLine } from './programLine';
import type { GymProfile, ResolvedStrengthSettings } from './strengthSettings';
import { barFor, candidatesFor, loadFromExternal, profileFor } from './strengthWeights';
import { spotterApplies, spotterSlot } from './spotter';
import { isWorkSet } from './workSets';
import { ladderRows, MAX_ROW_SECONDS, withLastBand } from './forgeLadder';
import { adjustFirstSet, CROSS_PER_SET, crossFatigue, expectedHard, hardSetsLogged, crossHistory, crossLine, crossPoints, hardPlanned, learnCross, normalBefore, setsBefore, type CrossFatigue, type CrossHistory, type EarlierWork } from './forgeCrossFatigue';

// --- the shapes ---------------------------------------------------------------------------

export interface RowTarget {
  weightKg?: number;
  repsLow: number;
  repsHigh: number;
  rir?: number;
  // A hold or a plank: seconds instead of reps.
  timedSec?: number;
  // Een houding op een ladder (Exercise.measure 'hold'): het voorschrift in seconden, die je zelf invult
  // (WorkoutRow.seconds). Anders dan `timedSec`, dat alleen een doel zonder invoer is.
  holdSec?: number;
  // A set to failure from repsLow ("9+").
  failure?: boolean;
  // "7+ met 1 over": een set tot falen die Zonder spotter een open set met reserve werd (SetTarget.open).
  open?: boolean;
  // De reserve is door Forge opgehoogd naar minstens 1, omdat falen zonder spotter gevaarlijk is
  // (engine/spotter.ts). Alleen voor het teken bij de set; leeft in het concept, niet in het log.
  spotter?: boolean;
}

export interface WorkoutRow {
  id: string;
  kind: SetKind;
  target: RowTarget;
  // What you fill in. Prefilled from the target, so ticking is enough.
  weightKg?: number;
  reps?: number;
  rir?: number;
  // Een houding: hoe lang je hem hield (naar het log als SetLog.seconds, met reps 1).
  seconds?: number;
  // De band die hielp (SetLog.band), alleen bij Pull-Up en Dip met Band bij optrekken en dip.
  band?: SetBand;
  // "Ging het netjes?" (SetLog.clean): afwezig is onbekend.
  clean?: boolean;
  // The RIR is the aim of the plan, not what you felt: you ticked the set without
  // touching the field (or the setting "Met het doel" filled it in). Stored on the
  // SetLog as rirAssumed. Typing or choosing a RIR yourself clears it.
  rirAssumed?: boolean;
  done: boolean;
  // When the row was ticked (epoch ms). Lives in the draft; it goes onto the log as SetLog.at.
  // Unticking removes it.
  doneAt?: number;
  // You changed kg or reps yourself, or took the prescription: a weight you
  // change on an earlier set no longer carries over to this one. Lives in the
  // draft only; it is never part of the log.
  edited?: boolean;
  // "Forge rekent mee" (engine/forgeReckon.ts): the reps Forge last put in this row (the plan, or an
  // estimate), to see afterwards whether you did something else than asked. Draft only.
  forgeReps?: number;
  // The weight Forge put in this row after an adjustment during the training ("Forge rekent mee" after a
  // set, Lichter). Absent: the weight of the prescription (`target.weightKg`). A weight you type yourself
  // never sets it. Goes onto the log as SetLog.forgeKg next to `rirAssumed`. Draft only otherwise.
  forgeKg?: number;
  // The reps are Forge's estimate for a weight you typed (the row is `edited` for the weight, not for the
  // reps), so another weight may estimate them again. Typing reps yourself clears it. Draft only.
  repsEstimated?: boolean;
  // A warm-up row: its weight as a share of the first working weight. While you
  // do not touch the row, it follows that weight (and an empty row fills in as
  // soon as set 1 gets a weight). Lives in the draft only.
  share?: number;
}

export interface WorkoutExercise {
  // The slot in the template (its exercise id): stable through a swap.
  slot: string;
  // The id in our own list, or the slot when the list does not know the name.
  exerciseId: string;
  name: string;
  known: boolean;
  rows: WorkoutRow[];
  // The weights really used on this exercise before today (cables and stacks), so
  // a proposal in the training rounds to weights the machine has (engine/forgeAdjust.ts).
  usedKg?: number[];
  // The Forge sentence why ("Zelfde gewicht als vorige keer...").
  reason?: string;
  // The sets of the last time, warm-up and work, in order.
  previous?: SetLog[];
  // How many trainings with this exercise came before today ("Hoeveel over?" asks every set the first
  // three times, engine/forgeReckon.ts#asksReserve). Absent in an old draft: not counted.
  trainings?: number;
  restSec: number;
  // The name of the exercise this one replaced, for this training only.
  swappedFrom?: string;
  // De ruil kwam van Stap lichter of Stap zwaarder (niet van Ruilen): de rijen zijn die van de stap zelf. Staat in
  // het concept naast `swappedFrom`; een heropend concept houdt een geruilde oefening zoals hij was (mergeDraft).
  ladderStep?: boolean;
  timed: boolean;
  // Een houding met seconden die je invult (Exercise.measure 'hold'); geen RIR (forgeLadder.ts#ladderRows).
  hold?: boolean;
  // Dumbbells are logged as the total of two (the weights are sums of two from the rack).
  dumbbellTotal?: boolean;
  // The share of strength each earlier working set costs the next, as the proposal
  // counted it (learned or 3%); the adjusting in the training reads it from here.
  fatiguePerSet?: number;
  // The extra share after a hard top set before a back-off set (strengthModel.ts#fatigueFactor), as the
  // proposal counted it (learned or 6%). Absent in an old draft: the start value.
  fatigueAfterHard?: number;
  // Werksets van het programma die jij weghaalde, met hun plek, voor "Terugzetten" (engine/forgeRows.ts).
  dropped?: { row: WorkoutRow; index: number }[];
  // The estimated strength the prescription counted with for the first working set ("Forge rekent mee").
  strengthKg?: number;
  // "Forge rekent mee" made the step up after the top of the range: the line that says so, the reason
  // without the step, and the working sets as they would have been, for Terugzetten (engine/forgeReckon.ts).
  raise?: { line: string; reason?: string; back: { rowId: string; weightKg?: number; reps: number }[] };
  // Je zette de stap omhoog terug (undoRaise): de oefening telt dan als aangeraakt, zodat een heropend
  // concept het teruggezette gewicht houdt en niet opnieuw het plan met de stap krijgt.
  raiseUndone?: boolean;
}

// --- rep ranges ------------------------------------------------------------------------------

// "6-8" -> 6 to 8, "10 per been" -> 10, "8-10 per been" -> 8 to 10, "45s" -> 45 seconds.
export function parseReps(text: string): RowTarget | undefined {
  const t = text.toLowerCase();
  const timed = t.match(/(\d+)\s*(s|sec|seconden|seconds)\b/);
  if (timed) {
    const n = Number(timed[1]);
    return { repsLow: n, repsHigh: n, timedSec: n };
  }
  const range = t.match(/(\d+)\s*(?:-|\u2013|tot|to)\s*(\d+)/);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    return { repsLow: Math.min(a, b), repsHigh: Math.max(a, b) };
  }
  const one = t.match(/(\d+)/);
  return one ? { repsLow: Number(one[1]), repsHigh: Number(one[1]) } : undefined;
}

const midReps = (t: RowTarget) => Math.round((t.repsLow + t.repsHigh) / 2);

// --- rest ------------------------------------------------------------------------------------

const COMPOUND = COMPOUND_PATTERNS;
const SMALL: Set<MovementPattern> = new Set(['calf', 'shin', 'core', 'hip']);

// The rest after a set, in seconds. Heavier and compound longer: a barbell
// squat, deadlift, press or row 3 minutes; another compound exercise 2 minutes,
// 2,5 with low reps; an isolation exercise 1,5 minutes; calves, shins, hips and
// core 1 minute. Starting values (the research report, chapter 3: longer rest
// keeps more reps on compound lifts); your own value per exercise wins.
const REST_BARBELL_COMPOUND = 180;
const REST_COMPOUND = 120;
const REST_COMPOUND_LOW_REPS = 150;
const REST_ISOLATION = 90;
const REST_SMALL = 60;

export function estimatedRest(exercise: Exercise | undefined, repsHigh?: number): number {
  if (!exercise) return repsHigh !== undefined && repsHigh <= 8 ? REST_COMPOUND : REST_ISOLATION;
  if (SMALL.has(exercise.pattern)) return REST_SMALL;
  if (!COMPOUND.has(exercise.pattern)) return REST_ISOLATION;
  // Drie minuten alleen voor zwaar werk met de stang (8 herhalingen of minder); bij 10 of meer is
  // twee minuten genoeg, zoals MacroFactor het doet (eigenaar, 5 november).
  if (exercise.resistance === 'barbell' && (repsHigh === undefined || repsHigh <= 8)) return REST_BARBELL_COMPOUND;
  return repsHigh !== undefined && repsHigh <= 6 ? REST_COMPOUND_LOW_REPS : REST_COMPOUND;
}

// After the last warm-up set the rest is short, not the full rest of a working
// set: 60 seconds after a single ramp or feel set, 90 after a build-up (the
// research: 60 to 90 seconds after the set at 80%).
export const REST_AFTER_WARMUP = 90;
export const REST_AFTER_RAMP = 60;

export function restFor(exerciseId: string, exercise: Exercise | undefined, repsHigh: number | undefined, own: Record<string, number>): number {
  return own[exerciseId] ?? estimatedRest(exercise, repsHigh);
}

// "2:30", "1:00", "45 s".
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// --- planning the rows -------------------------------------------------------------------------

export interface PlanContext {
  logs: SessionLog[];
  templates: SessionTemplate[];
  program?: Program | null;
  bodyKg?: number;
  settings: ResolvedStrengthSettings;
  // The day of the training.
  date: string;
  // Forge counts along (the setting "Kracht meerekenen"). Off: the template only.
  modelOn: boolean;
  // Spierpijn die je meldde: ook dat maakt je benen moe (engine/strengthHistory.ts#legsTiredAt).
  sore?: SoreSource;
  // Je koos "Lichter" voor deze training (engine/legDayEase.ts): meer reserve en een set minder voor
  // wat de benen belast. Zonder keuze verandert er niets. `because`: waardoor, in de regel eronder.
  ease?: { how: LegEaseHow; because: string };
}

export interface PlanState {
  histories: Map<string, ExerciseHistory>;
  tiredNow?: LegsTired;
  // What is warm in this training so far (engine/warmup.ts).
  warm: WarmState;
  // The compound exercises before this one and their heaviest working weight, for the warm-up of a top set.
  done: { exercise: Exercise; weightKg: number }[];
  // Vermoeidheid tussen oefeningen (engine/forgeCrossFatigue.ts): de harde werksets van het voorschrift van de
  // oefeningen hiervoor in deze training, en per log uit je historie hoeveel er normaal voor stonden.
  // Afwezig zonder de instelling of zonder het model.
  before?: EarlierWork[];
  cross?: CrossHistory;
}

// Wat je eerder in deze training deed op de spieren van deze oefening (een gedeelde hoofdspier):
// het zwaarste werkgewicht in hetzelfde patroon en in een ander patroon.
function doneBefore(state: PlanState, exercise: Exercise): DoneBefore | undefined {
  const shared = state.done.filter((d) => d.exercise.primary.some((m) => exercise.primary.includes(m) || exercise.secondary.includes(m)) || exercise.primary.some((m) => d.exercise.primary.includes(m)));
  if (shared.length === 0) return undefined;
  const same = shared.filter((d) => d.exercise.pattern === exercise.pattern).map((d) => d.weightKg);
  const other = shared.filter((d) => d.exercise.pattern !== exercise.pattern).map((d) => d.weightKg);
  return { ...(same.length > 0 ? { samePatternKg: Math.max(...same) } : {}), ...(other.length > 0 ? { otherPatternKg: Math.max(...other) } : {}) };
}

function noteDone(state: PlanState, exercise: Exercise | undefined, rows: WorkoutRow[]): void {
  if (!exercise || !isCompound(exercise)) return;
  const kg = Math.max(0, ...rows.filter((r) => r.kind === 'work').map((r) => r.weightKg ?? r.target.weightKg ?? 0));
  if (kg > 0) state.done.push({ exercise, weightKg: kg });
}

export function planState(ctx: PlanContext): PlanState {
  const strengthLogs = ctx.logs.filter((l) => l.strengthData && l.strengthData.length > 0);
  const deps = { logs: ctx.logs, templates: ctx.templates, program: ctx.program, bodyKg: ctx.bodyKg, ...(ctx.sore ? { sore: ctx.sore } : {}) };
  const histories = new Map(exerciseHistories(strengthLogs, ctx.templates, deps).map((h) => [h.key, h]));
  const crossOn = ctx.modelOn && ctx.settings.crossFatigue;
  return { histories, tiredNow: legsTiredAt(ctx.date, undefined, deps), warm: newWarmState(), done: [], ...(crossOn ? { before: [], cross: crossHistory(strengthLogs, ctx.settings.assumedCounts) } : {}) };
}

// The state for one exercise that is swapped: what is warm is what the exercises
// before its place in the training have worked.
export function planStateBefore(ctx: PlanContext, workout: WorkoutExercise[], slot: string): PlanState {
  const state = planState(ctx);
  for (const ex of workout) {
    if (ex.slot === slot) break;
    // Zelfde regel als planExercise: een timed oefening en een houding keren daar vroeg terug en tellen niet mee.
    if (!ex.timed && !ex.hold) {
      noteWorked(state.warm, exerciseOf(ex), ex.rows.some((r) => r.kind === 'warmup'));
      noteDone(state, exerciseOf(ex), ex.rows);
      state.before?.push({ exercise: exerciseOf(ex), hard: expectedHard(hardPlanned(ex.rows), loggedHard(state.histories.get(exerciseKey(ex.exerciseId, ex.name).key), ctx)) });
    }
  }
  return state;
}

function lastSession(history: ExerciseHistory | undefined, date: string) {
  return history?.sessions.filter((s) => s.date < date).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
}

// One exercise of the training. `swapTo` puts another exercise in the slot. `opts.ladderStep`: the swap came from
// Stap lichter or Stap zwaarder (not from Ruilen); only then a ladder step gets the rows of the step itself.
export interface PlanExerciseOptions {
  ladderStep?: boolean;
}

export function planExercise(planned: ExercisePrescription, ctx: PlanContext, state: PlanState, swapTo?: Exercise, opts: PlanExerciseOptions = {}): WorkoutExercise {
  const found = swapTo ? { key: swapTo.id, exercise: swapTo } : exerciseKey(planned.id, planned.exerciseName);
  const exercise = found.exercise;
  // Zonder spotter: bij een oefening waar falen gevaarlijk is vraagt het voorschrift minstens 1 over
  // (engine/spotter.ts). Daarna rekent alles gewoon door met dat voorschrift.
  const spot = spotterApplies(exercise, ctx.settings) ? spotterSlot(planned) : undefined;
  const slot = spot?.slot ?? planned;
  const exerciseId = exercise?.id ?? slot.id;
  const name = exercise?.name ?? cleanExerciseName(slot.exerciseName);
  const parsed = parseReps(slot.reps);
  const base = parsed ?? { repsLow: 8, repsHigh: 10 };
  // A program from MacroFactor gives every set its own range and RIR.
  const targets = slot.setTargets && slot.setTargets.length > 0 ? slot.setTargets.slice(0, 10) : undefined;
  const setCount = targets ? targets.length : Math.max(1, Math.min(10, slot.sets || 1));
  const history = state.histories.get(found.key);
  const last = lastSession(history, ctx.date);
  const baseRir = slot.rpe !== undefined ? Math.max(0, Math.min(5, 10 - slot.rpe)) : DEFAULT_RIR;

  // Een houding, of een stap van een ladder waar je met Stap lichter of Stap zwaarder naartoe tikte (en Stappen bij
  // calisthenics staat aan): de rijen komen van die stap zelf, niet van het model
  // (docs/beslissingen/2026-11-09-calisthenics-forge-rij.md). Gewoon Ruilen naar een ladderstap blijft bij het model.
  const bandOn = ctx.settings.ladderRow && ctx.settings.askBand;
  const ladderStep = !!swapTo && !!opts.ladderStep && ctx.settings.ladderRow && !!exercise?.ladder;
  if (exercise && (exercise.measure === 'hold' || ladderStep)) {
    const made = ladderRows({ slotId: slot.id, exercise, setCount, previous: last?.sets, ...(exercise.measure === 'hold' ? {} : { rir: fromSlotRir(targets, baseRir) }), band: bandOn });
    return {
      slot: slot.id,
      exerciseId,
      name,
      known: true,
      rows: made.rows,
      ...(last ? { previous: last.sets } : {}),
      trainings: history?.sessions.filter((s) => s.date < ctx.date).length ?? 0,
      restSec: restFor(exerciseId, exercise, made.hold ? undefined : made.rows[0]?.target.repsHigh, ctx.settings.restSeconds),
      timed: false,
      ...(made.hold ? { hold: true } : {}),
      ...(swapTo ? { swappedFrom: cleanExerciseName(slot.exerciseName) } : {}),
      ...(ladderStep ? { ladderStep: true } : {}),
    };
  }

  if (base.timedSec !== undefined) {
    const rows: WorkoutRow[] = Array.from({ length: setCount }, (_, i) => ({ id: `${slot.id}:s${i}`, kind: 'work', target: base, done: false }));
    return { slot: slot.id, exerciseId, name, known: !!exercise, rows, restSec: restFor(exerciseId, exercise, undefined, ctx.settings.restSeconds), timed: true, ...(swapTo ? { swappedFrom: cleanExerciseName(slot.exerciseName) } : {}) };
  }

  // What warm-up this exercise needs, from what the exercises before it warmed.
  // "Per oefening" (setting): every compound exercise gets the full build-up.
  const warmKind: WarmKind = ctx.settings.warmupScope === 'exercise' && exercise && isCompound(exercise) ? 'full' : warmupKind(exercise, state.warm);
  const tired = !!(exercise?.loadsLegs && state.tiredNow);
  // The plan (template or program) gives the range and the reps in reserve; the
  // history is only the fallback (decision 2026-10-23-bereik-uit-het-plan.md).
  const firstTarget = targets?.find((t) => !t.failure);
  const fromSlot = targets ? (firstTarget ? { low: firstTarget.repsLow, high: firstTarget.repsHigh, rir: firstTarget.rir } : undefined) : parsed ? { low: parsed.repsLow, high: parsed.repsHigh, ...(slot.rpe !== undefined ? { rir: baseRir } : {}) } : undefined;
  // A swapped exercise is another exercise: the range of the template is not its
  // own (squat 5 to 8 is not leg extension 5 to 8). The reps in reserve stay.
  const plan = swapTo ? (fromSlot?.rir !== undefined ? { rir: fromSlot.rir } : undefined) : fromSlot;
  const learned = usedBefore({ sessions: history?.sessions ?? [], date: ctx.date, settings: ctx.settings, exercise });
  let rx: Prescription | undefined;
  let rxInput: Parameters<typeof prescribe>[0] | undefined;
  if (ctx.modelOn && history && history.sessions.length > 0) {
    const lastStrengthDate = lastDateBefore([...state.histories.values()].flatMap((h) => h.sessions.map((s) => s.date)), ctx.date);
    rxInput = {
      exercise,
      sessions: history.sessions,
      date: ctx.date,
      ...(lastStrengthDate ? { lastStrengthDate } : {}),
      bodyKg: ctx.bodyKg,
      settings: ctx.settings,
      ...(tired && state.tiredNow ? { tired: state.tiredNow } : {}),
      warm: warmKind,
      ...(plan ? { plan } : {}),
      nearestOnMismatch: true,
    };
    rx = prescribe(rxInput);
  }

  // Dumbbells logged as the total of two: the weights are sums of two from the rack.
  const dumbbellTotal = rx?.dumbbellTotal ?? dumbbellTotalFor({ exercise, sessions: history?.sessions ?? [], date: ctx.date, settings: ctx.settings });
  const lastTop = last?.sets.filter(isWorkSet).filter((s) => s.reps > 0).sort((a, b) => (b.weightKg ?? 0) - (a.weightKg ?? 0))[0];
  const lastFirst = last?.sets.filter(isWorkSet)[0];
  const weightsOf = (r: Prescription | undefined, reckon = ctx.settings.reckon) => {
    const program = r && targets ? programWeights(r, targets, exercise, ctx, lastTop?.weightKg, tired, warmKind, learned, dumbbellTotal, lastFirst, reckon) : undefined;
    const weights: (number | undefined)[] = [];
    for (let i = 0; i < setCount; i++) {
      const t = targets?.[i];
      weights.push(t ? (program?.weights[i] ?? (r ? r.sets[Math.min(i, r.sets.length - 1)].weightKg : (slot.targetWeightKg ?? lastTop?.weightKg))) : r ? r.sets[Math.min(i, r.sets.length - 1)].weightKg : (slot.targetWeightKg ?? lastTop?.weightKg));
    }
    return { program, weights };
  };
  const { program: fromProgram, weights: workWeights } = weightsOf(rx);
  // Warm-up: from the prescription; with no prescription (no history, or none
  // with reps in reserve) from the working weight there is, else empty rows that
  // fill in when set 1 gets a weight.
  let warmups: WarmupSet[] = fromProgram?.warmups ?? rx?.warmups ?? [];
  let emptyWarmups: { share: number; reps: number }[] = [];
  if (!rx && ctx.modelOn && exercise) {
    const w0 = workWeights[0];
    if (w0 !== undefined) {
      const candidates = candidatesFor(exercise, profileFor(ctx.settings.profile, dumbbellTotal), { bodyKg: ctx.bodyKg, lastExternalKg: w0, usedKg: learned, stackWeights: ctx.settings.stackWeights, dumbbellTotal });
      if (candidates) warmups = warmupSets(ctx.settings, exercise, candidates, w0, undefined, warmKind, ctx.bodyKg, dumbbellTotal);
    } else {
      emptyWarmups = warmupShapes(ctx.settings, exercise, warmKind);
    }
  }
  // Een zware topset (0 of 1 over of tot falen) krijgt opwarmstappen naar de sprong toe: koud de volle ladder,
  // warm van een oefening ervoor op dezelfde spieren alleen de stappen naar de topset (strengthModel.ts#topSetWarmups).
  const firstAim = targets?.[0] ? { rir: targets[0].rir, failure: targets[0].failure } : { rir: rx?.sets[0]?.rir ?? baseRir };
  const hardTop = !!exercise && isCompound(exercise) && (!!firstAim.failure || firstAim.rir <= HARD_SET_MAX_RIR);
  if (hardTop && ctx.modelOn && warmKind !== 'none' && workWeights[0] !== undefined) {
    const candidates = candidatesFor(exercise, profileFor(ctx.settings.profile, dumbbellTotal), { bodyKg: ctx.bodyKg, lastExternalKg: workWeights[0], usedKg: learned, stackWeights: ctx.settings.stackWeights, dumbbellTotal });
    const cold = warmKind === 'full';
    const made = candidates ? topSetWarmups(ctx.settings, exercise, candidates, workWeights[0], cold ? undefined : doneBefore(state, exercise), ctx.bodyKg, dumbbellTotal) : warmups;
    // Koud: de bestaande opbouw blijft als hij al een volle ladder is. Warm: de stappen naar de sprong.
    if (!cold || (warmups.length < TOP_SET_LADDER && made.length > warmups.length)) {
      warmups = made;
      emptyWarmups = [];
    }
  }
  let rows: WorkoutRow[] = [];
  const firstWeight = workWeights[0];
  for (const [i, w] of warmups.entries()) {
    const target: RowTarget = { weightKg: w.weightKg, repsLow: w.reps, repsHigh: w.reps };
    rows.push({ id: `${slot.id}:w${i}`, kind: 'warmup', target, weightKg: w.weightKg, reps: w.reps, done: false, ...(firstWeight ? { share: w.weightKg / firstWeight } : {}) });
  }
  for (const [i, w] of emptyWarmups.entries()) {
    rows.push({ id: `${slot.id}:w${i}`, kind: 'warmup', target: { repsLow: w.reps, repsHigh: w.reps }, reps: w.reps, done: false, share: w.share });
  }
  const workRow = (r: Prescription | undefined, weightKg: number | undefined, i: number): { target: RowTarget; reps: number } => {
    let target: RowTarget;
    const t = targets?.[i];
    if (t) {
      target = { ...(weightKg !== undefined ? { weightKg } : {}), repsLow: t.repsLow, repsHigh: t.repsHigh, rir: t.rir, ...(t.failure ? { failure: true } : {}), ...(t.open ? { open: true } : {}) };
    } else if (r) {
      const s = r.sets[Math.min(i, r.sets.length - 1)];
      target = { weightKg: s.weightKg, repsLow: s.repsLow, repsHigh: s.repsHigh, rir: s.rir };
    } else {
      target = { weightKg, repsLow: base.repsLow, repsHigh: base.repsHigh, rir: baseRir };
    }
    let reps = target.failure ? target.repsLow : i === 0 && r && !targets ? r.targetReps : midReps(target);
    // With a program the row starts at what the model expects at this weight, never
    // above it (and not outside the range): ticking is then honest.
    if (t && r && !t.failure && target.weightKg !== undefined) {
      const load = loadFromExternal(exercise, target.weightKg, ctx.bodyKg, dumbbellTotal);
      if (load !== undefined) {
        const strength = ctx.settings.workSets === 'equal' ? r.strengthKg : r.strengthKg * fatigueFactor(aimsOf(targets!), 0, i, r.fatiguePerSet, r.fatigueAfterHard);
        reps = Math.min(reps, Math.max(t.repsLow, expectedReps(strength, load, t.rir)));
      }
    }
    return { target, reps };
  };
  for (let i = 0; i < setCount; i++) {
    const made = workRow(rx, workWeights[i], i);
    let target = made.target;
    const reps = made.reps;
    if (spot?.raised[i]) target = { ...target, spotter: true };
    rows.push({ id: `${slot.id}:s${i}`, kind: 'work', target, ...(target.weightKg !== undefined ? { weightKg: target.weightKg } : {}), reps, forgeReps: reps, ...(target.rir !== undefined && ctx.settings.rirPrefill === 'target' ? { rir: target.rir, rirAssumed: true } : {}), done: false });
  }
  // Vermoeidheid tussen oefeningen: meer harde sets voor dezelfde spieren ervoor dan normaal maakt de eerste set
  // iets lichter (engine/forgeCrossFatigue.ts). Alleen het voorschrift; er is hier nog niets ingevuld.
  const cross = rx && history ? crossFor(exercise, found.key, history, ctx, state) : undefined;
  let crossNote: string | undefined;
  const crossAdjust = (r: Prescription, weightKg: number | undefined, reps: number, target: RowTarget) =>
    cross && weightKg !== undefined
      ? adjustFirstSet({ weightKg, reps, target }, r.strengthKg, cross.factor, (kg) => loadFromExternal(exercise, kg, ctx.bodyKg, dumbbellTotal), candidatesFor(exercise, profileFor(ctx.settings.profile, dumbbellTotal), { bodyKg: ctx.bodyKg, lastExternalKg: weightKg, usedKg: learned, stackWeights: ctx.settings.stackWeights, dumbbellTotal }))
      : undefined;
  if (cross && rx) {
    const fi = rows.findIndex((r) => r.kind === 'work');
    const first = rows[fi];
    const made = first ? crossAdjust(rx, first.weightKg, first.reps ?? 0, first.target) : undefined;
    if (first && made && first.weightKg !== undefined) {
      const lighter = made.weightKg < first.weightKg - 1e-9;
      crossNote = crossLine(cross, { lighter, fewerReps: (first.reps ?? 0) - made.reps });
      rows[fi] = { ...first, weightKg: made.weightKg, target: { ...first.target, weightKg: made.weightKg }, reps: made.reps, forgeReps: made.reps };
      if (lighter) {
        // Een latere werkset wordt nooit zwaarder dan de eerste; een opwarmset die nu te dicht bij het werkgewicht
        // zit valt weg (zoals strengthModel.ts#buildWarmups), de rest volgt het nieuwe gewicht.
        for (let k = fi + 1; k < rows.length; k++) {
          const r = rows[k];
          if (r.kind === 'work' && r.weightKg !== undefined && r.weightKg > made.weightKg) rows[k] = { ...r, weightKg: made.weightKg, target: { ...r.target, weightKg: made.weightKg } };
        }
        for (let k = fi - 1; k >= 0; k--) {
          const r = rows[k];
          if (r.kind !== 'warmup' || r.weightKg === undefined) continue;
          if (r.weightKg >= made.weightKg * 0.92) rows.splice(k, 1);
          else if (made.weightKg > 0) rows[k] = { ...r, share: r.weightKg / made.weightKg };
        }
      }
    }
  }
  // Band bij optrekken en dip: de band van je vorige keer staat klaar op de werksets.
  if (bandOn && exercise?.assist === 'band') rows = withLastBand(rows, last?.sets);
  // The body part counts as warm only after an exercise that got warm-up sets. Na de bijstelling hierboven, zodat
  // de volgende oefening het echte werkgewicht en de echte opwarmsets ziet.
  noteWorked(state.warm, exercise, rows.some((r) => r.kind === 'warmup'));
  noteDone(state, exercise, rows);
  // "Forge rekent mee" ging een stap omhoog: de sets zoals ze zonder die stap waren, voor Terugzetten.
  let raise: WorkoutExercise['raise'];
  const raisedBy = fromProgram?.raised ?? rx?.raised;
  if (raisedBy && history) {
    const back = prescribe({ ...rxInput!, settings: { ...ctx.settings, reckon: false } });
    if (back) {
      const backProgram = targets ? programWeights(back, targets, exercise, { ...ctx, settings: { ...ctx.settings, reckon: false } }, lastTop?.weightKg, tired, warmKind, learned, dumbbellTotal, lastFirst, false) : undefined;
      // Terugzetten houdt de vermoeidheid tussen oefeningen vast: dezelfde bijstelling op de eerste set, latere sets
      // nooit zwaarder dan die, en de zin erbij in de reden die terugkomt.
      const backSets = weightsOf(back, false).weights.map((w, i) => {
        const made = workRow(back, w, i);
        return { rowId: `${slot.id}:s${i}`, ...(made.target.weightKg !== undefined ? { weightKg: made.target.weightKg } : {}), reps: made.reps, target: made.target };
      });
      let backNote: string | undefined;
      const b0 = backSets[0];
      const eased = b0 ? crossAdjust(back, b0.weightKg, b0.reps, b0.target) : undefined;
      if (b0 && eased && b0.weightKg !== undefined) {
        const lighter = eased.weightKg < b0.weightKg - 1e-9;
        backNote = crossLine(cross!, { lighter, fewerReps: b0.reps - eased.reps });
        backSets[0] = { ...b0, weightKg: eased.weightKg, reps: eased.reps };
        for (let k = 1; k < backSets.length; k++) {
          const w = backSets[k].weightKg;
          if (w !== undefined && w > eased.weightKg) backSets[k] = { ...backSets[k], weightKg: eased.weightKg };
        }
      }
      const backReason = backProgram?.differs ? `Je programma vraagt nu ${programLine(targets!)}.` : back.reason;
      raise = {
        line: raisedText(raisedBy, exercise?.resistance === 'assisted_bodyweight'),
        reason: backNote ? (backReason ? `${backNote} ${backReason}` : backNote) : backReason,
        back: backSets.map(({ target: _t, ...b }) => {
          void _t;
          return b;
        }),
      };
    }
  }
  const repsHigh = rows.find((r) => r.kind === 'work')?.target.repsHigh;
  const programRest = targets?.find((x) => x.restSec !== undefined)?.restSec;
  const why = rx ? (fromProgram?.differs ? `Je programma vraagt nu ${programLine(targets!)}.` : rx.reason) : undefined;
  const noticed = why && rx?.notice ? `${rx.notice} ${why}` : why;
  const reason = crossNote ? (noticed ? `${crossNote} ${noticed}` : crossNote) : noticed;
  state.before?.push({ exercise, hard: expectedHard(hardPlanned(rows), loggedHard(history, ctx)) });
  return {
    slot: slot.id,
    exerciseId,
    name,
    known: !!exercise,
    rows,
    ...(learned && learned.length > 0 ? { usedKg: [...new Set(learned)] } : {}),
    ...(reason ? { reason } : {}),
    ...(last ? { previous: last.sets } : {}),
    trainings: history?.sessions.filter((s) => s.date < ctx.date).length ?? 0,
    restSec: ctx.settings.restSeconds[exerciseId] ?? programRest ?? restFor(exerciseId, exercise, repsHigh, ctx.settings.restSeconds),
    timed: false,
    ...(dumbbellTotal ? { dumbbellTotal } : {}),
    // Met vermoeidheid tussen oefeningen rekent "Forge rekent mee" in de training met de bijgestelde kracht
    // (forgeReckon.ts#strengthFor), tot een set anders ging dan gevraagd.
    ...(rx ? { fatiguePerSet: rx.fatiguePerSet, fatigueAfterHard: rx.fatigueAfterHard, strengthKg: cross && crossNote ? rx.strengthKg * cross.factor : rx.strengthKg } : {}),
    ...(raise ? { raise } : {}),
    ...(swapTo ? { swappedFrom: cleanExerciseName(slot.exerciseName) } : {}),
  };
}

// Wat je de laatste trainingen bij deze oefening als harde sets logde (zelfde regel als de historie), nieuwste laatst.
function loggedHard(history: ExerciseHistory | undefined, ctx: PlanContext): (number | undefined)[] {
  return (history?.sessions ?? []).filter((s) => s.date < ctx.date).map((s) => hardSetsLogged(s.sets, ctx.settings.assumedCounts));
}

// Vermoeidheid tussen oefeningen voor deze oefening: de harde sets ervoor vandaag (het voorschrift) tegen wat er
// normaal voor stond in je historie van dezelfde oefening. De kost per set is geleerd of vast 2%, met de
// instelling "Vermoeidheid per set". Undefined: niets bijstellen (uit, te weinig data, geen verschil).
function crossFor(exercise: Exercise | undefined, key: string, history: ExerciseHistory, ctx: PlanContext, state: PlanState): CrossFatigue | undefined {
  if (!state.before || !state.cross) return undefined;
  const today = setsBefore(exercise, state.before);
  if (today === undefined) return undefined;
  const earlier = history.sessions.filter((s) => s.date < ctx.date).map((s) => ({ ...s, before: state.cross!.get(s.logId)?.get(key) }));
  const normal = normalBefore(earlier.map((s) => s.before));
  if (normal === undefined || today <= normal) return undefined;
  const dumbbellTotal = dumbbellTotalFor({ exercise, sessions: history.sessions, date: ctx.date, settings: ctx.settings });
  const perSet = ctx.settings.fatigue === 'learned' ? learnCross(crossPoints(earlier, { exercise, bodyKg: ctx.bodyKg, maxToFailure: ctx.settings.estimateUpTo, dumbbellTotal })).perSet : CROSS_PER_SET;
  return crossFatigue(today, normal, perSet);
}

// De reserve die het plan vraagt (het programma per set, of de RPE van het sjabloon), anders de standaard.
function fromSlotRir(targets: SetTarget[] | undefined, baseRir: number): number {
  const t = targets?.find((x) => !x.failure);
  return t ? t.rir : baseRir;
}

// What each set of a program asks, for the fatigue after a hard top set.
const aimsOf = (targets: SetTarget[]): SetAim[] => targets.map((t) => ({ rir: t.rir, ...(t.failure ? { failure: true } : {}) }));

// What each work set of a training asks, in order (the rows of Forge).
export const workAims = (ex: WorkoutExercise): SetAim[] => ex.rows.filter((r) => r.kind === 'work').map((r) => ({ ...(r.target.rir !== undefined ? { rir: r.target.rir } : {}), ...(r.target.failure ? { failure: true } : {}) }));

// The weight per set when a program asks for its own range and RIR per set:
// the heaviest weight at which the estimated strength (tired a little per
// earlier set, unless the sets are equal) still gives the bottom of the
// range with the asked reps left. A set whose range and RIR are Forge's own
// keeps Forge's weight, with its limits per training (KR-5).
// "Forge rekent mee" with a RIR you did not fill in: the top set of last time went 3 or more reps over the
// top of its range ("7+" has 7 as its top), so it goes at least one step heavier (`ASSUMED_RAISE_REPS`).
function programWeights(rx: Prescription, targets: SetTarget[], exercise: Exercise | undefined, ctx: PlanContext, lastWeightKg: number | undefined, tired: boolean, warm: WarmKind, usedKg?: number[], dumbbellTotal?: boolean, lastFirst?: SetLog, reckon = ctx.settings.reckon): { weights: number[]; warmups: WarmupSet[]; differs: boolean; raised?: NonNullable<Prescription['raised']> } | undefined {
  const candidates = candidatesFor(exercise, profileFor(ctx.settings.profile, dumbbellTotal), { bodyKg: ctx.bodyKg, lastExternalKg: lastWeightKg, usedKg, stackWeights: ctx.settings.stackWeights, dumbbellTotal });
  if (!candidates) return undefined;
  let differs = false;
  let raised: NonNullable<Prescription['raised']> | undefined;
  const aims = aimsOf(targets);
  const weights = targets.map((t, i) => {
    // Forge's own weight only where no hard top set came before: after one the back-off sets count
    // with the extra drop (fatigueFactor), which the sets of the plain prescription do not know.
    const afterTop = aims.slice(0, i).some((a, j) => isHardPair(a, aims[j + 1]));
    if (t.repsLow === rx.range.low && t.repsHigh === rx.range.high && t.rir === rx.range.rir && !t.failure && !afterTop) return rx.sets[Math.min(i, rx.sets.length - 1)].weightKg;
    differs = true;
    const strength = ctx.settings.workSets === 'equal' ? rx.strengthKg : rx.strengthKg * fatigueFactor(aimsOf(targets), 0, i, rx.fatiguePerSet, rx.fatigueAfterHard);
    const need = Math.max(1, t.repsLow - (tired ? 1 : 0));
    let idx = 0;
    for (let j = candidates.length - 1; j >= 0; j--) {
      if (expectedReps(strength, candidates[j].loadKg, t.rir) >= need) {
        idx = j;
        break;
      }
    }
    if (i === 0 && reckon && !tired && ctx.settings.progression !== 'reps_first' && lastFirst?.weightKg !== undefined && assumedRaise(lastFirst, t)) {
      const at = candidates.findIndex((c) => Math.abs(c.externalKg - lastFirst.weightKg!) < 1e-6);
      if (at >= 0 && idx <= at && at + 1 < candidates.length) {
        idx = at + 1;
        raised = { fromKg: candidates[at].externalKg, stepKg: Math.abs(candidates[idx].externalKg - candidates[at].externalKg), reps: lastFirst.reps };
      }
    }
    return candidates[idx].externalKg;
  });
  const warmups = differs ? warmupSets(ctx.settings, exercise, candidates, weights[0], rx.strengthKg, warm, ctx.bodyKg, dumbbellTotal) : rx.warmups;
  return { weights, warmups, differs, ...(raised ? { raised } : {}) };
}

export function planWorkout(slots: ExercisePrescription[], ctx: PlanContext): WorkoutExercise[] {
  const state = planState(ctx);
  if (!ctx.ease) return slots.map((slot) => planExercise(slot, ctx, state));
  // Lichter: dezelfde training met voorschriften die meer reserve vragen; daarna rekent het model gewoon.
  const eased = easeSlots(slots, ctx.ease.how);
  const raised = new Set(eased.raised);
  const line = easeExerciseReason(ctx.ease.how === 'extra' ? EASE_RIR_EXTRA : EASE_RIR, ctx.ease.because);
  return eased.slots.map((slot) => {
    const ex = planExercise(slot, ctx, state);
    return raised.has(slot.id) ? { ...ex, reason: ex.reason ? `${line} ${ex.reason}` : line } : ex;
  });
}

// --- what you do on the screen -------------------------------------------------------------------

export const exerciseOf = (ex: Pick<WorkoutExercise, 'exerciseId' | 'known'>): Exercise | undefined => (ex.known ? exerciseById(ex.exerciseId) : undefined);

// The most a row can hold: a typo like 2000 kg becomes 500.
export const MAX_ROW_KG = 500;
export const MAX_ROW_REPS = 100;

export function updateRow(ex: WorkoutExercise, rowId: string, patch: Partial<Pick<WorkoutRow, 'weightKg' | 'reps' | 'rir' | 'seconds'>>): WorkoutExercise {
  const clean = { ...patch };
  if (clean.seconds !== undefined) clean.seconds = Math.min(MAX_ROW_SECONDS, Math.max(0, Math.round(clean.seconds)));
  // Negative is the help of an assisted machine; the screen keeps other exercises at 0 or more.
  if (clean.weightKg !== undefined) clean.weightKg = Math.min(MAX_ROW_KG, Math.max(-MAX_ROW_KG, clean.weightKg));
  if (clean.reps !== undefined) clean.reps = Math.min(MAX_ROW_REPS, Math.max(0, Math.round(clean.reps)));
  // A RIR you give yourself is measured; one you clear is empty again.
  const mine = 'rir' in clean;
  return { ...ex, rows: ex.rows.map((r) => (r.id === rowId ? { ...r, ...clean, ...(mine ? { rirAssumed: false } : {}) } : r)) };
}

export interface TickResult {
  workout: WorkoutExercise[];
  // Start the rest timer for this many seconds.
  restSec?: number;
}

// Tick or untick a row. Ticking fills what is still empty from the target. The
// rest timer starts after a working set and after the last warm-up set of an
// exercise, not after the other warm-up sets, and not after the very last set
// of the training.
// A ticked row with what is still empty filled in from its target.
// A working set ticked with no weight takes the weight of the set before it
// (`carryKg`): a set of 7 reps with no weight would count for nothing.
function fillTicked(row: WorkoutRow, carryKg: number | undefined, now: number): WorkoutRow {
  return {
    ...row,
    done: true,
    doneAt: now,
    ...(row.weightKg === undefined && row.target.weightKg !== undefined ? { weightKg: row.target.weightKg } : row.weightKg === undefined && row.kind === 'work' && carryKg !== undefined ? { weightKg: carryKg } : {}),
    ...(row.reps === undefined ? { reps: row.target.timedSec ?? midReps(row.target) } : {}),
    // Een houding afgevinkt zonder seconden neemt het voorschrift over, zoals bij herhalingen.
    ...(row.target.holdSec !== undefined && row.seconds === undefined ? { seconds: row.target.holdSec } : {}),
    // A RIR left empty is filled with the aim and marked as not measured.
    ...(row.rir === undefined && row.kind === 'work' && row.target.rir !== undefined ? { rir: row.target.rir, rirAssumed: true } : {}),
  };
}

// An unticked row loses its time as well.
function unticked(row: WorkoutRow): WorkoutRow {
  const { doneAt: _at, ...rest } = row;
  void _at;
  return { ...rest, done: false };
}

// The box above the column: every set of the exercise ticked at once, or all
// unticked again when every set already was. Rest follows as after one set.
export function tickAllRows(workout: WorkoutExercise[], slot: string, now: number = Date.now()): TickResult {
  const ex = workout.find((e) => e.slot === slot);
  if (!ex || ex.rows.length === 0) return { workout };
  const untick = ex.rows.every((r) => r.done);
  let carry: number | undefined;
  const next = workout.map((e) =>
    e.slot === slot
      ? {
          ...e,
          rows: e.rows.map((r) => {
            const out = untick ? unticked(r) : r.done ? r : fillTicked(r, carry, now);
            if (r.kind === 'work' && out.weightKg !== undefined) carry = out.weightKg;
            return out;
          }),
        }
      : e,
  );
  if (untick) return { workout: next };
  const allDone = next.every((e) => e.rows.every((r) => r.done));
  return allDone ? { workout: next } : { workout: next, restSec: ex.restSec };
}

export function tickRow(workout: WorkoutExercise[], slot: string, rowId: string, now: number = Date.now()): TickResult {
  const ex = workout.find((e) => e.slot === slot);
  const row = ex?.rows.find((r) => r.id === rowId);
  if (!ex || !row) return { workout };
  const done = !row.done;
  const index = ex.rows.indexOf(row);
  const before = ex.rows.slice(0, index).reverse().find((r) => r.kind === 'work' && r.weightKg !== undefined)?.weightKg;
  const filled: WorkoutRow = done ? fillTicked(row, before, now) : unticked(row);
  const next = workout.map((e) => (e.slot === slot ? { ...e, rows: e.rows.map((r) => (r.id === rowId ? filled : r)) } : e));
  if (!done) return { workout: next };
  const lastWarmup = row.kind === 'warmup' && !ex.rows.slice(index + 1).some((r) => r.kind === 'warmup');
  const allDone = next.every((e) => e.rows.every((r) => r.done));
  const rest = (row.kind === 'work' || lastWarmup) && !allDone;
  if (!rest) return { workout: next };
  if (row.kind === 'work') return { workout: next, restSec: ex.restSec };
  const single = ex.rows.filter((r) => r.kind === 'warmup').length === 1;
  return { workout: next, restSec: Math.min(ex.restSec, single ? REST_AFTER_RAMP : REST_AFTER_WARMUP) };
}

// One more working set (a copy of the last one, not ticked) or warm-up set (in
// front of the working sets).
export function addRow(ex: WorkoutExercise, kind: SetKind): WorkoutExercise {
  const n = ex.rows.length;
  const id = `${ex.slot}:a${Date.now().toString(36)}${n}`;
  if (kind === 'work') {
    const lastWork = [...ex.rows].reverse().find((r) => r.kind === 'work');
    const target = lastWork?.target ?? { repsLow: 8, repsHigh: 10, rir: DEFAULT_RIR };
    const row: WorkoutRow = { id, kind, target, ...(lastWork?.weightKg !== undefined ? { weightKg: lastWork.weightKg } : {}), reps: lastWork?.reps ?? midReps(target), ...(lastWork?.seconds !== undefined ? { seconds: lastWork.seconds } : {}), ...(lastWork?.band !== undefined ? { band: lastWork.band } : {}), done: false };
    return { ...ex, rows: [...ex.rows, row] };
  }
  const firstWork = ex.rows.find((r) => r.kind === 'work');
  const weight = firstWork?.weightKg !== undefined ? Math.round(firstWork.weightKg * 0.5 / 2.5) * 2.5 : undefined;
  const row: WorkoutRow = { id, kind, target: { ...(weight !== undefined ? { weightKg: weight } : {}), repsLow: 8, repsHigh: 8 }, ...(weight !== undefined ? { weightKg: weight } : {}), reps: 8, done: false };
  const at = ex.rows.findIndex((r) => r.kind === 'work');
  const rows = at < 0 ? [...ex.rows, row] : [...ex.rows.slice(0, at), row, ...ex.rows.slice(at)];
  return { ...ex, rows };
}

// The last row that is not ticked yet goes; a ticked row stays (you did it).
export function removeLastRow(ex: WorkoutExercise): WorkoutExercise {
  const index = ex.rows.map((r) => !r.done).lastIndexOf(true);
  if (index < 0 || ex.rows.length <= 1) return ex;
  return { ...ex, rows: ex.rows.filter((_, i) => i !== index) };
}

export function progress(workout: WorkoutExercise[]): { done: number; total: number } {
  const work = workout.flatMap((e) => e.rows.filter((r) => r.kind === 'work'));
  return { done: work.filter((r) => r.done).length, total: work.length };
}

// --- storing ---------------------------------------------------------------------------------

// Only ticked rows with reps go into the log; a hold is not a set with reps.
export function toStrengthData(workout: WorkoutExercise[]): ExerciseSetLog[] | undefined {
  const out: ExerciseSetLog[] = [];
  for (const ex of workout) {
    if (ex.timed) continue;
    // Een houding gaat als seconden met reps 1, zodat alles wat herhalingen telt blijft werken; zonder RIR.
    const sets: SetLog[] = ex.rows
      .filter((r) => r.done && (ex.hold ? holdSeconds(r) !== undefined : (r.reps ?? 0) > 0))
      .map((r) => ({
        reps: ex.hold ? 1 : r.reps!,
        ...(ex.hold ? { seconds: holdSeconds(r)! } : {}),
        ...(r.weightKg !== undefined ? { weightKg: r.weightKg } : {}),
        ...(r.kind === 'work' && r.rir !== undefined && !ex.hold ? { rir: r.rir } : {}),
        ...(r.band !== undefined ? { band: r.band } : {}),
        ...(typeof r.clean === 'boolean' ? { clean: r.clean } : {}),
        kind: r.kind,
        rowId: r.id,
        ...(typeof r.doneAt === 'number' && Number.isFinite(r.doneAt) ? { at: new Date(r.doneAt).toISOString() } : {}),
        ...(r.kind === 'work' && r.rir !== undefined && r.rirAssumed && !ex.hold ? { rirAssumed: true } : {}),
        // Wat Forge vroeg, voor "Afvinken telt als het doel" (engine/assumedSets.ts) en voor "Hoe goed kent
        // Forge je" (engine/forgeCalibration.ts): bij elke werkset, niet alleen bij een afgevinkte.
        ...(r.kind === 'work' && !ex.hold ? askedFields(r) : {}),
      }));
    if (sets.length > 0) out.push({ exerciseId: ex.exerciseId, exerciseName: ex.name, sets });
  }
  return out.length > 0 ? out : undefined;
}

// Wat Forge bij deze set vroeg: herhalingen, gewicht, het gewicht na een bijstelling (alleen als dat van het
// voorschrift afwijkt) en de RIR van het doel.
function askedFields(r: WorkoutRow): Partial<SetLog> {
  return {
    ...(r.forgeReps !== undefined && r.forgeReps > 0 && r.target.timedSec === undefined ? { repsAsked: r.forgeReps } : {}),
    ...(r.target.weightKg !== undefined ? { weightKgAsked: r.target.weightKg } : {}),
    ...(typeof r.forgeKg === 'number' && Number.isFinite(r.forgeKg) && r.forgeKg !== r.target.weightKg ? { forgeKg: r.forgeKg } : {}),
    ...(r.target.rir !== undefined && !r.target.failure ? { rirAsked: r.target.rir } : {}),
  };
}

// De seconden van een gedane houding: wat je invulde als dat een geldig getal boven 0 is, anders het voorschrift.
function holdSeconds(r: WorkoutRow): number | undefined {
  const ok = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;
  return ok(r.seconds) ? r.seconds : ok(r.target.holdSec) ? r.target.holdSec : undefined;
}

// The reps in reserve of the hardest working set on the legs, for the leg index.
export function hardestLegRir(workout: WorkoutExercise[]): number | undefined {
  const rirs = workout
    .filter((ex) => exerciseOf(ex)?.loadsLegs)
    .flatMap((ex) => ex.rows.filter((r) => r.done && r.kind === 'work' && r.rir !== undefined).map((r) => r.rir!));
  return rirs.length > 0 ? Math.min(4, Math.min(...rirs)) : undefined;
}

// --- words for the table ------------------------------------------------------------------------

const kgText = (n: number) => formatNumberNL(n, 2);

// "11-13", "8", or "9+" for a set to failure (and for an open set with reserve, "7+ met 1 over").
export function repsText(t: RowTarget): string {
  return t.failure || t.open ? `${t.repsLow}+` : t.repsLow === t.repsHigh ? `${t.repsLow}` : `${t.repsLow}-${t.repsHigh}`;
}

// "47,5 kg x 11-13" in the prescription column. A hold: "45 sec".
// With help on an assisted machine: "hulp 30 kg × 9-11", not "-30 kg".
export function targetText(row: WorkoutRow, exercise?: Exercise): string {
  const t = row.target;
  if (t.timedSec !== undefined) return `${t.timedSec} sec`;
  if (t.holdSec !== undefined) return t.weightKg !== undefined ? `${weightText(t.weightKg, exercise)} × ${t.holdSec} sec` : `${t.holdSec} sec`;
  const reps = repsText(t);
  return t.weightKg !== undefined ? `${weightText(t.weightKg, exercise)} × ${reps}` : `${reps} herh.`;
}

const weightText = (kg: number, exercise?: Exercise): string => (exercise?.resistance === 'assisted_bodyweight' ? formatWeight(exercise, kg) : `${kgText(kg)} kg`);

// The set of last time at the same place: the n-th warm-up for a warm-up row,
// the n-th working set for a working row.
export function previousFor(ex: WorkoutExercise, row: WorkoutRow): SetLog | undefined {
  if (!ex.previous) return undefined;
  const sameKind = ex.rows.filter((r) => r.kind === row.kind);
  const n = sameKind.indexOf(row);
  const prev = ex.previous.filter((s) => (row.kind === 'warmup' ? !isWorkSet(s) : isWorkSet(s)));
  return prev[n];
}

export function previousText(set: SetLog | undefined, exercise?: Exercise): string | undefined {
  if (!set) return undefined;
  if (typeof set.seconds === 'number') return set.weightKg !== undefined ? `${weightText(set.weightKg, exercise)} × ${set.seconds} sec` : `${set.seconds} sec`;
  return set.weightKg !== undefined ? `${weightText(set.weightKg, exercise)} × ${set.reps}` : `${set.reps} herh.`;
}

// --- plates ----------------------------------------------------------------------------------

export interface PlateLoad {
  barKg: number;
  // Per side, from the inside out (heaviest first).
  perSide: number[];
  // What could not be made with the plates, per side (0 when it fits).
  shortKg: number;
}

export interface PlateStep extends PlateLoad {
  // Per side, compared with the set before: what goes on and what comes off.
  add: number[];
  remove: number[];
}

const cents = (kg: number) => Math.round(kg * 100);

// No side is ever loaded beyond this; a typo like 2000 kg stops here instead of
// making the calculator count for seconds.
const MAX_SIDE_KG = 500;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

// Fewest plates for every amount up to `targetKg`, in steps of the greatest
// common divisor of the plates, so the table stays small (a few thousand cells).
function plateTable(targetKg: number, plates: number[], cap: number) {
  const usable = plates.filter((p) => p <= cap + 1e-9).map(cents).filter((p) => p > 0);
  const unit = usable.reduce((g, p) => gcd(g, p), 0) || 1;
  const steps = usable.map((p) => p / unit).sort((a, b) => b - a);
  const top = Math.floor(cents(Math.min(targetKg, MAX_SIDE_KG)) / unit);
  const best = new Array<number>(top + 1).fill(Infinity);
  const pick = new Array<number>(top + 1).fill(0);
  best[0] = 0;
  for (let t = 1; t <= top; t++) {
    for (const p of steps) {
      if (p <= t && best[t - p] + 1 < best[t]) {
        best[t] = best[t - p] + 1;
        pick[t] = p;
      }
    }
  }
  const read = (t: number) => {
    const out: number[] = [];
    for (let i = t; i > 0; i -= pick[i]) out.push((pick[i] * unit) / 100);
    return out.sort((x, y) => y - x);
  };
  return { unit, top, best, read };
}

// The fewest plates (of the ones not heavier than `cap`) that make `amount`
// exactly, heaviest first. Undefined when it cannot be made.
function fewestPlates(amountKg: number, plates: number[], cap = Infinity): number[] | undefined {
  const target = cents(amountKg);
  if (target < 0 || amountKg > MAX_SIDE_KG) return undefined;
  if (target === 0) return [];
  const table = plateTable(amountKg, plates, cap);
  if (target % table.unit !== 0 || !Number.isFinite(table.best[table.top])) return undefined;
  return table.read(table.top);
}

// The heaviest amount not above `amountKg` the plates can make, with the fewest plates.
function closestPlates(amountKg: number, plates: number[]): { plates: number[]; madeKg: number } {
  const table = plateTable(amountKg, plates, Infinity);
  for (let t = table.top; t > 0; t--) {
    if (Number.isFinite(table.best[t])) return { plates: table.read(t), madeKg: (t * table.unit) / 100 };
  }
  return { plates: [], madeKg: 0 };
}

export function usesPlates(exercise: Exercise | undefined): boolean {
  return exercise?.resistance === 'barbell' || exercise?.resistance === 'machine_plates';
}

// The plates per side for one weight, from scratch.
export function plateLoad(totalKg: number, exercise: Exercise | undefined, profile: GymProfile, barKg?: number): PlateLoad | undefined {
  if (!usesPlates(exercise) || !(totalKg > 0)) return undefined;
  const bar = exercise?.resistance === 'barbell' ? (barKg ?? barFor(profile, totalKg)) : 0;
  const side = (totalKg - bar) / 2;
  if (side < -1e-9) return { barKg: bar, perSide: [], shortKg: 0 };
  // The heaviest weight not above the side that the plates can make.
  const made = closestPlates(side, profile.platesKg);
  return { barKg: bar, perSide: made.plates, shortKg: Math.max(0, cents(side) - cents(made.madeKg)) / 100 };
}

function diff(from: number[], to: number[]): { add: number[]; remove: number[] } {
  const left = [...from];
  const add: number[] = [];
  for (const p of to) {
    const i = left.findIndex((q) => Math.abs(q - p) < 1e-9);
    if (i >= 0) left.splice(i, 1);
    else add.push(p);
  }
  return { add, remove: left.sort((a, b) => b - a) };
}

// From the plates that are on the bar to a new weight with the fewest moves:
// plates come off from the outside, new ones go on the outside, and a stack
// stays heaviest inside. 47,5 to 45 kg is one 1,25 off; 45 to 42,5 is the 2,5
// off and a 1,25 on, not the whole side again.
export function nextLoad(previous: PlateLoad | undefined, totalKg: number, exercise: Exercise | undefined, profile: GymProfile): PlateStep | undefined {
  const fresh = plateLoad(totalKg, exercise, profile, previous?.barKg);
  if (!fresh) return undefined;
  if (!previous || fresh.shortKg > 0) return { ...fresh, add: fresh.perSide, remove: previous ? previous.perSide : [] };
  const side = (totalKg - fresh.barKg) / 2;
  let best: { keep: number; add: number[]; moves: number; count: number } | undefined;
  for (let keep = previous.perSide.length; keep >= 0; keep--) {
    const kept = previous.perSide.slice(0, keep);
    const rest = side - kept.reduce((n, p) => n + p, 0);
    const cap = kept.length > 0 ? kept[kept.length - 1] : Infinity;
    const add = fewestPlates(rest, profile.platesKg, cap);
    if (!add) continue;
    const moves = previous.perSide.length - keep + add.length;
    const count = keep + add.length;
    if (!best || moves < best.moves || (moves === best.moves && count < best.count)) best = { keep, add, moves, count };
  }
  if (!best) return { ...fresh, ...diff(previous.perSide, fresh.perSide) };
  return {
    barKg: fresh.barKg,
    perSide: [...previous.perSide.slice(0, best.keep), ...best.add],
    shortKg: 0,
    add: best.add,
    remove: previous.perSide.slice(best.keep).reverse(),
  };
}

// The loading of every row of an exercise in order, each from the one before
// (the bar of the first working set for all of them).
export function plateSteps(ex: WorkoutExercise, profile: GymProfile): (PlateStep | undefined)[] {
  const exercise = exerciseOf(ex);
  if (!usesPlates(exercise)) return ex.rows.map(() => undefined);
  const firstWork = ex.rows.find((r) => r.kind === 'work' && r.weightKg !== undefined)?.weightKg;
  const bar = exercise?.resistance === 'barbell' ? barFor(profile, firstWork ?? ex.rows.find((r) => r.weightKg !== undefined)?.weightKg) : 0;
  let previous: PlateLoad | undefined = { barKg: bar, perSide: [], shortKg: 0 };
  return ex.rows.map((r) => {
    if (r.weightKg === undefined || r.weightKg <= 0) return undefined;
    // As you would load a bar: the fewest plates, heaviest inside. Fewer moves only
    // when that gives as few plates (47,5 to 45 is one 1,25 off, not a new stack).
    const fresh = plateLoad(r.weightKg, exercise, profile, previous?.barKg);
    const moved = nextLoad(previous, r.weightKg, exercise, profile);
    if (!fresh) return moved;
    const step: PlateStep = moved && moved.perSide.length <= fresh.perSide.length ? moved : { ...fresh, ...diff(previous?.perSide ?? [], fresh.perSide) };
    previous = step;
    return step;
  });
}

// "1 x 10, 1 x 2,5" (counted per weight, heaviest first).
export function plateList(plates: number[]): string {
  const counts = new Map<number, number>();
  for (const p of [...plates].sort((a, b) => b - a)) counts.set(p, (counts.get(p) ?? 0) + 1);
  return [...counts].map(([p, n]) => `${n} × ${kgText(p)}`).join(', ');
}

// --- swapping -------------------------------------------------------------------------------

// How well `e` can take the place of `current`: shared main muscles weigh most, then the same movement.
// Zero when they share no main muscle.
export function swapScore(current: Exercise, e: Exercise): number {
  const primary = e.primary.filter((m) => current.primary.includes(m)).length;
  if (primary === 0) return 0;
  const secondary = e.secondary.filter((m) => current.secondary.includes(m) || current.primary.includes(m)).length;
  return primary * 3 + secondary + (e.pattern === current.pattern ? 4 : 0) + (e.loadsLegs === current.loadsLegs ? 1 : 0);
}

// Een echte vervanger: dezelfde beweging (familie, data/exerciseFamilies.ts), met een korte reden.
export interface SwapChoice {
  exercise: Exercise;
  // Het droge feit eerst: wat is hetzelfde, dan wat anders is.
  reason: string;
}

export interface SwapGroups {
  // Doet hetzelfde: de eerste is de aanbevolen keuze.
  same: SwapChoice[];
  // Zelfde spier, anders: dezelfde hoofdspier, een andere beweging.
  other: Exercise[];
}

const EQUIPMENT_TEXT: Record<Resistance, string> = {
  barbell: 'met een stang',
  dumbbell: 'met dumbbells',
  cable: 'aan de kabel',
  machine_stack: 'op een toestel',
  machine_plates: 'op een toestel met schijven',
  bodyweight: 'met je eigen gewicht',
  assisted_bodyweight: 'met hulp',
  pack_or_vest: 'met een rugzak of vest',
};

// Wat de nuance zegt als de vervanger hem heeft (`on`) of juist mist (`off`).
const NUANCE_TEXT: Record<string, { on: string; off: string }> = {
  pause: { on: 'met een pauze', off: 'zonder pauze' },
  wide: { on: 'met een brede greep', off: 'zonder brede greep' },
  low: { on: 'op een lage helling', off: 'zonder lage helling' },
  front: { on: 'met de last voor', off: 'met de last op je rug' },
  light: { on: 'met een lichtere last', off: 'met een zwaardere last' },
  single: { on: 'op één arm of been', off: 'op twee armen of benen' },
  underhand: { on: 'met onderhandse greep', off: 'met bovenhandse greep' },
  preacher: { on: 'met je armen op een steun', off: 'zonder steun voor je armen' },
  floor: { on: 'met een kleiner bereik', off: 'met een groter bereik' },
  step: { on: 'met een stap', off: 'zonder stap' },
  walking: { on: 'al lopend', off: 'op één plek' },
  elevated: { on: 'met je voet verhoogd', off: 'met je voet op de grond' },
  feet: { on: 'met je voeten verhoogd', off: 'met je voeten op de grond' },
  trap: { on: 'met een trapbar', off: 'met een rechte stang' },
  sumo: { on: 'met brede stand', off: 'met smalle stand' },
  quad: { on: 'meer voor je quadriceps', off: 'minder voor je quadriceps' },
  hinged: { on: 'met je romp voorovergebogen', off: 'zonder voorovergebogen romp' },
  legs: { on: 'met hulp van je benen', off: 'zonder hulp van je benen' },
  negative: { on: 'alleen het zakken', off: 'het hele bereik' },
  lying: { on: 'liggend', off: 'zittend' },
  frog: { on: 'met je voeten tegen elkaar', off: 'met je voeten naast elkaar' },
  y: { on: 'met je armen in een Y', off: 'met je armen langs je zij' },
  added: { on: 'met extra gewicht', off: 'zonder extra gewicht' },
};

const nuancesOf = (e: Exercise): string[] => e.nuance ?? [];

// Hoe ver `e` van `current` afligt binnen één familie: 1 voor andere uitrusting, 1 als de een je eigen
// gewicht is en de ander een last die je kiest, 1 per kenmerk dat maar één van beide heeft.
export function swapDistance(current: Exercise, e: Exercise): number {
  const ownWeight = (x: Exercise) => x.resistance === 'bodyweight';
  const cn = nuancesOf(current);
  const en = nuancesOf(e);
  const differing = cn.filter((n) => !en.includes(n)).length + en.filter((n) => !cn.includes(n)).length;
  return (e.resistance !== current.resistance ? 1 : 0) + (ownWeight(e) !== ownWeight(current) ? 1 : 0) + differing;
}

// "Zelfde beweging en spieren, met dumbbells." Het droge feit eerst, dan wat anders is.
export function swapReasonSame(current: Exercise, e: Exercise): string {
  const parts: string[] = [];
  if (e.resistance !== current.resistance) parts.push(EQUIPMENT_TEXT[e.resistance]);
  const cn = nuancesOf(current);
  const en = nuancesOf(e);
  for (const n of en) if (!cn.includes(n) && NUANCE_TEXT[n]) parts.push(NUANCE_TEXT[n].on);
  for (const n of cn) if (!en.includes(n) && NUANCE_TEXT[n]) parts.push(NUANCE_TEXT[n].off);
  return parts.length === 0 ? 'Zelfde beweging en spieren.' : `Zelfde beweging en spieren, ${parts.join(', ')}.`;
}

// Twee groepen om te ruilen. Eerst de echte vervangers (zelfde familie, de kleinste afstand eerst, bij
// gelijke afstand de volgorde in de lijst); de eerste is de aanbevolen keuze. Dan de rest die dezelfde
// hoofdspier raakt (swapScore boven 0), met de voorkeur voor bergspieren bij gelijke score
// (engine/mountainMuscles.ts#swapPreference; Forge ruilt nooit zelf). Een oefening zonder familie heeft
// geen echte vervangers en valt terug op de oude lijst. Nooit de oefening zelf of een die al in de
// training zit, en geen stangoefening zonder stang. Een ladderstap uit `FAMILY_ONLY` alleen in de eerste
// groep (data/exerciseFamilies.ts). `limit` telt over beide groepen.
export function swapGroups(current: Exercise | undefined, profile: GymProfile, inTraining: string[] = [], limit = 8, prefer: readonly MuscleGroup[] = []): SwapGroups {
  if (!current) return { same: [], other: [] };
  const taken = new Set([current.id, ...inTraining]);
  const serves = (e: Exercise) => (prefer.some((m) => e.primary.includes(m) || e.secondary.includes(m)) ? 0 : 1);
  const same: { e: Exercise; distance: number; order: number }[] = [];
  const other: { e: Exercise; score: number }[] = [];
  EXERCISES.forEach((e, order) => {
    if (taken.has(e.id)) return;
    if (e.resistance === 'barbell' && profile.barsKg.length === 0) return;
    const score = swapScore(current, e);
    if (score === 0) return;
    // Een ladderstap in een bestaande familie is alleen een vervanger voor wie op dezelfde ladder staat.
    if (current.family && e.family === current.family && (!FAMILY_ONLY.has(e.id) || current.ladder?.id === e.ladder?.id)) same.push({ e, distance: swapDistance(current, e), order });
    else if (!FAMILY_ONLY.has(e.id)) other.push({ e, score });
  });
  same.sort((a, b) => a.distance - b.distance || a.order - b.order);
  other.sort((a, b) => b.score - a.score || serves(a.e) - serves(b.e) || a.e.name.localeCompare(b.e.name));
  const first = same.slice(0, limit).map((s) => ({ exercise: s.e, reason: swapReasonSame(current, s.e) }));
  return { same: first, other: other.slice(0, Math.max(0, limit - first.length)).map((s) => s.e) };
}

// De twee groepen achter elkaar, voor wie maar één lijst wil.
export function swapOptions(current: Exercise | undefined, profile: GymProfile, inTraining: string[] = [], limit = 8, prefer: readonly MuscleGroup[] = []): Exercise[] {
  const g = swapGroups(current, profile, inTraining, limit, prefer);
  return [...g.same.map((s) => s.exercise), ...g.other];
}

// --- the legs ---------------------------------------------------------------------------------

// One short line on a leg day: why the legs may be tired, or the leg index. A hard run earlier today
// (a test run too) counts along: the index leaves a training of the same day out on purpose, so the
// points it still carries are added here (engine/legDayEase.ts#earlierTodayPoints).
export interface LegDayLineDeps {
  logs: SessionLog[];
  templates: SessionTemplate[];
  program?: Program | null;
  bodyKg?: number;
  sore?: SoreSource;
  // The training itself, so it does not count as "earlier".
  excludeId?: string;
}

export function legDayLine(date: string, deps: LegDayLineDeps): string {
  const inputs = { logs: deps.logs, plannedSessions: [], templates: deps.templates, today: date, bodyKg: deps.bodyKg, program: deps.program, ...(deps.sore ? { soreness: legSorenessList(deps.sore.checkIns, deps.sore.injuries) } : {}) };
  const earlier = earlierTodayPoints(date, { logs: deps.logs, templates: deps.templates, program: deps.program, bodyKg: deps.bodyKg, excludeId: deps.excludeId });
  if (earlier.points > 0) {
    const index = legFatigueOn(date, inputs, fatigueEvents(inputs)).index + earlier.points;
    const what = earlier.label === 'testloop' ? 'Je testloop' : 'Je loop';
    const when = earlier.morning ? 'van vanochtend' : 'van eerder vandaag';
    return `${what} ${when} telt nog mee. Beenindex ${formatNumberNL(index, 0)}, ${fatigueWord(index).word.toLowerCase()}.`;
  }
  const tired = legsTiredAt(date, undefined, deps);
  if (tired) return `Je benen zijn nog moe van ${tired.because}. Zelfde gewicht, een herhaling minder is normaal.`;
  const index = legFatigueOn(date, inputs, fatigueEvents(inputs)).index;
  return `Beenindex ${formatNumberNL(index, 0)}, ${fatigueWord(index).word.toLowerCase()}.`;
}
