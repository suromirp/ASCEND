// ASCEND — Training domain models
//
// Architectural rule (spec §15): a workout definition (SessionTemplate) is
// never bound directly to a calendar day. A PlannedSession schedules a
// template onto a date. A SessionLog records what actually happened.
// Changing the plan must never rewrite history — SessionLog rows are
// append-only and are never mutated once created. One exception, at the
// owner's explicit request: a log made by hand takes over the measured numbers
// of the watch (`manualMeasured` keeps the hand-made ones, so it can be undone;
// docs/beslissingen/2026-10-22-garmin-is-leidend.md).

import type { SessionStressProfile } from './prescription';
import type { PainReport } from './checkIn';
import type { PlannedLeaveMark } from './leave';

export type MetricSource = 'manual' | 'garmin' | 'health-connect' | 'macrofactor' | 'import';

export type SessionType = 'strength' | 'cardio' | 'hiking' | 'recovery' | 'adventure';

export type ExercisePriority = 'core' | 'accessory' | 'optional';

export interface ExercisePrescription {
  id: string;
  exerciseName: string;
  sets: number;
  reps: string; // e.g. "8" or "8-10"
  targetWeightKg?: number;
  rpe?: number;
  priority: ExercisePriority;
  notes?: string;
}

export interface DurationVariants {
  full: number;
  short?: number;
  minimum?: number;
}

export interface CardioTarget {
  zone?: string; // e.g. "Zone 2"
  targetDurationMin?: number;
  targetDistanceKm?: number;
}

export interface OutdoorTarget {
  targetDistanceKm?: number;
  targetElevationM?: number;
  backpackWeightKg?: number;
}

// Some sessions (Easy Run, Bergconditie) don't have a single fixed duration
// — they follow a week-by-week build within a training block (wennen →
// opbouwen → zwaarste week → deload). `weekInPhase` matches
// ResolvedProgramPosition.weekInPhase from utils/dates#resolveProgramWeek.
export interface WeeklyProgressionStep {
  weekInPhase: number;
  targetMinutes: number;
  note?: string; // e.g. "Wennen", "Deload"
  // Set for a step that belongs to one phase only (the mountain hike's
  // D+/backpack ladder, engine/programLayout.ts#progressionTarget). Those
  // match the exact week in that phase and are never scaled per cycle.
  phaseId?: string;
  // What the session asks for besides time, shown with the target.
  elevationGainM?: number;
  backpackKg?: number;
}

// A single mobility item — either a dynamic warm-up move (before training)
// or a static stretch (after training, or in the standalone problem-area
// library). durationSec is per side when the stretch is one-sided.
export interface Stretch {
  name: string;
  durationSec?: number;
  note?: string;
  // A short (~1-2 min), demonstration-only reference video — never a
  // required watch, just an optional "hoe ziet dit eruit" link.
  videoUrl?: string;
}

// The reusable definition of a workout — "what" a session is, independent of
// when it happens.
export interface SessionTemplate {
  id: string;
  name: string;
  type: SessionType;
  // Which endurance sport this is, when type alone doesn't say (a cycling
  // session is type 'cardio' like a run). Absent = derived from type
  // (engine/sports.ts#templateSport): cardio -> running, hiking -> hiking.
  sport?: 'running' | 'hiking' | 'cycling';
  focus?: string; // e.g. "Borst • Rug • Schouders"
  durationVariants: DurationVariants;
  weeklyProgression?: WeeklyProgressionStep[];
  exercises?: ExercisePrescription[];
  cardioTarget?: CardioTarget;
  outdoorTarget?: OutdoorTarget;
  notes?: string;
  defaultDayOfWeek?: number; // 1 (Monday) – 7 (Sunday), used only for seeding
  // Dynamic warm-up (same routine for every training day) and a static
  // cool-down tailored to this session's muscle groups. Both are reference
  // lists shown in ExerciseLogger — logging a session never requires
  // stretch data, they're purely informational.
  warmup?: Stretch[];
  cooldown?: Stretch[];
  // The sensible default stress profile for this workout shape (Technical
  // Architecture v0.3.1 REVISED, Phase 3 — replaces hardcoded isLegHeavy).
  // A TrainingPrescription may layer a partial override on top for one
  // specific occurrence; engine/stressProfile.ts#resolveEffectiveStressProfile
  // is the only place that layering happens. Absent on a template falls
  // back to legacyIsLegHeavyToStressProfile(templateId) — kept only as a
  // bridge for any template that hasn't been backfilled.
  baseStressProfile?: SessionStressProfile;
  // Time-budget scheduling redesign — an escape hatch for a same-day
  // pairing verdict that doesn't follow from load categories alone (the
  // categorical rule in engine/concurrentTraining.ts is the default; this
  // overrides it for a specific named pair). Subsumes the old hardcoded
  // INTENTIONAL_BACK_TO_BACK_TEMPLATE_IDS set in engine/scheduler.ts (the
  // deliberate Saturday hill-intervals + Sunday long-run exception) as
  // data instead of code, generalized to same-day pairing too. Only ever
  // read for THIS template against the named other one — never implies
  // anything about how the other template treats pairing with this one;
  // callers that need the relationship checked either way look up both
  // sides explicitly.
  pairingOverride?: { withTemplateId: string; verdict: 'prefer' | 'avoid' }[];
}

export type PlannedSessionStatus = 'planned' | 'moved' | 'skipped' | 'optional';

// A template scheduled onto a specific calendar date. Completion is derived
// (a SessionLog exists referencing this id) rather than stored as a flag, so
// the plan and the historical record can never drift out of sync.
export interface PlannedSession {
  id: string;
  templateId: string;
  scheduledDate: string; // ISO date (yyyy-mm-dd)
  weekStartDate: string; // ISO date of the Monday of that week
  status: PlannedSessionStatus;
  movedFromDate?: string;
  order: number;
  // A fixed length for this one session instead of its week's progression,
  // e.g. a long run caught up in a week that already has its own
  // (engine/adviceEngine.ts). Optional, additive: older data has none.
  plannedMinutes?: number;
  // Set when the race block swapped this session to another day so a tempo
  // run or test keeps its distance from heavy legs (engine/raceBlock.ts): so
  // it can be swapped back when the run moves away. `short`: the minutes were
  // set to the short version for it. Optional, additive.
  raceBlock?: { pair: string; from: string; to: string; short?: boolean };
  // Set when the race block made this Saturday session a quiet run with
  // strides because the week has only three runs (engine/raceBlock.ts): so it
  // can become the quality session again when a fourth run joins, or when the
  // goal goes. Optional, additive.
  blockQuiet?: true;
  // You placed this session yourself, or accepted a proposal that moves it or
  // shows it here. The automatic planning never moves, swaps, shortens or
  // retemplates it (docs/onderzoek/Planning op een lijn.md). Optional, additive.
  lock?: PlanLock;
  // Planned to walk with poles. Optional, additive; without it the last log
  // of the same training decides (engine/legFatigue.ts).
  poles?: boolean;
  // A period of free days or a holiday placed, moved or let go of this
  // session (models/leave.ts, engine/leave.ts). Optional, additive.
  leave?: PlannedLeaveMark;
}

export interface PlanLock {
  by: 'user' | 'proposal';
  proposalId?: string;
  at: string;
}

export type SessionVariant = 'full' | 'short' | 'minimum' | 'custom';

export type SetKind = 'warmup' | 'work';

export interface SetLog {
  reps: number;
  weightKg?: number;
  rpe?: number;
  // Reps in reserve after this set: how many were left (0 = to failure), 0 to 10.
  // Absent when unknown.
  rir?: number;
  // A warm-up set or a working set. Absent means a working set, so every log
  // from before this field reads as it always did.
  kind?: SetKind;
}

export interface ExerciseSetLog {
  exerciseId: string;
  exerciseName: string;
  sets: SetLog[];
}

// What the session was actually done on/in — a treadmill run and an
// outdoor run (or an incline treadmill and a real hike) aren't
// interchangeable: GPS-based D+/D− only means something outdoors, and the
// incline % estimate only means something on a treadmill. Kept as a coarse
// tag alongside the richer `modality` below (derived from the chosen
// modality's own metadata) since it's still the simplest thing for a
// History line to show at a glance.
export type TrainingEnvironment = 'treadmill' | 'outdoor';

// Which specific way of training this was — a free-form key into
// data/modalities.ts (e.g. 'run_outdoor', 'stairmaster', 'incline_treadmill').
// Deliberately a plain string, not a TypeScript union: the set of
// modalities is content (data/modalities.ts), not domain structure, so
// adding one shouldn't require a model change. One shared metric shape
// with this tag is used for every modality rather than a separate
// interface per activity (running/cycling/stairmaster/...) — same fields
// (distance, HR, cadence, ...) apply loosely across most of them, and the
// UI only shows what's relevant for the selected modality.
export type ActivityModality = string;

// How the session's target/intensity was decided — ASCEND's own plan, the
// Daily Suggested Workout shown on the Garmin watch (selected manually;
// there is no supported API to read it automatically), or a free session
// with no prescribed target at all.
export type GuidanceMode = 'ascend_guided' | 'garmin_suggested' | 'free';

export interface CardioMetric {
  durationMinutes: number;
  distanceKm?: number;
  elevationGainM?: number; // e.g. incline treadmill work counts toward D+ conditioning
  // Descent, when a wearable measured it (imported activities). Optional.
  elevationLossM?: number;
  estimatedElevation?: boolean; // see OutdoorMetric.estimatedElevation
  environment?: TrainingEnvironment;
  modality?: ActivityModality;
  guidanceMode?: GuidanceMode;
  garminSuggestedType?: string; // e.g. 'Base', 'Tempo' — only when guidanceMode === 'garmin_suggested'
  avgHeartRate?: number;
  maxHeartRate?: number; // highest heart rate of the whole activity (imported). Optional.
  hrZones?: number[];
  paceMinPerKm?: number;
  cadence?: number;
  power?: number;
  source: MetricSource;
}

export interface OutdoorMetric {
  durationMinutes: number;
  distanceKm?: number;
  elevationGainM?: number;
  elevationLossM?: number;
  environment?: TrainingEnvironment;
  modality?: ActivityModality;
  guidanceMode?: GuidanceMode;
  garminSuggestedType?: string;
  // True when elevationGainM came from the incline-treadmill estimate
  // (distance × incline%), not a GPS/altimeter measurement — a treadmill
  // doesn't actually change your altitude, so Total Ascent from a wearable
  // isn't trustworthy there. History/readiness label this distinctly
  // rather than presenting it as measured D+.
  estimatedElevation?: boolean;
  avgHeartRate?: number;
  maxHeartRate?: number; // highest heart rate of the whole activity (imported). Optional.
  cadence?: number;
  power?: number; // e.g. Friday's Easy Bike fallback
  maxElevationM?: number;
  backpackWeightKg?: number;
  // Walked with poles. Lowers the descent load in the leg fatigue index
  // (engine/legFatigue.ts). Optional, additive: older logs have none.
  poles?: boolean;
  terrain?: string;
  weatherNotes?: string;
  technicalDifficulty?: string;
  // StairMaster/Stepmill only — a machine's own step/floor count and
  // reported vertical. Never merged into elevationGainM: it's not a GPS or
  // barometric measurement of real outdoor D+, just a same-caveat cousin
  // of the treadmill incline estimate above.
  steps?: number;
  machineVerticalM?: number;
  source: MetricSource;
}

// The numbers a watch measures, as they were typed in by hand before the
// watch's own numbers replaced them (engine/watchAlign.ts). Kept on the log, so
// nothing is lost and "Terugzetten" can put them back. A key is present only
// for a field the watch changed or added; `null` means: there was no value, so
// putting back means taking the field away again.
export type MeasuredField = 'durationMinutes' | 'distanceKm' | 'elevationGainM' | 'elevationLossM' | 'avgHeartRate' | 'maxHeartRate' | 'cadence' | 'estimatedElevation';

export interface ManualMeasured {
  // When the watch's numbers took over (ISO date-time).
  at: string;
  values: Partial<Record<MeasuredField, number | boolean | null>>;
  // The block of the log that holds the measured fields. `blockAdded`: the log
  // had no such block, the replacement made it (putting back removes it again).
  // Absent on a strength log that MacroFactor took over (see `strength`).
  block?: 'cardioData' | 'outdoorData';
  blockAdded?: true;
  // The source the block had before ('manual' unless the log said otherwise).
  blockSource?: MetricSource;
  // The milestones this replacement cleared (GoalMilestoneProgress ids): putting
  // back takes exactly those away again, the way removing a log does.
  clearedProgressIds?: string[];
  // "MacroFactor is leidend voor kracht" (engine/macrofactorLead.ts,
  // docs/beslissingen/2026-10-22-macrofactor-leidend-voor-kracht.md): a strength
  // log made by hand that took over the numbers MacroFactor measured. The
  // duration goes in `values.durationMinutes`; the rest is here. A key is
  // present only for a field that was replaced or added; `null`: there was no
  // value, so putting back takes the field away again.
  strength?: ManualStrength;
}

export interface ManualStrength {
  // The id of the MacroFactor workout that took over: it is never offered again.
  workoutId: string;
  strengthData?: ExerciseSetLog[] | null;
  strengthRir?: number | null;
  // The log had no id and source of its own: the workout's id and source
  // 'macrofactor' were put on it, and this is the source it had.
  tied?: { source: MetricSource };
}

// The record of what actually happened. Corrections are made by adding a new
// log, not mutating this one (exception: `manualMeasured`, see above).
export interface SessionLog {
  id: string;
  plannedSessionId?: string; // absent for ad-hoc / unplanned sessions
  templateId: string;
  type: SessionType;
  // Fase 4 — the endurance sport this was, when type alone doesn't say (a
  // ride is type 'cardio' like a run). Optional: older logs are read via
  // their modality (engine/sports.ts#logSport).
  sport?: 'running' | 'hiking' | 'cycling';
  completedDate: string; // ISO date
  completedAt: string; // ISO datetime
  variant: SessionVariant;
  durationMinutes: number;
  rpe?: number;
  notes?: string;
  strengthData?: ExerciseSetLog[];
  cardioData?: CardioMetric;
  outdoorData?: OutdoorMetric;
  // Subjective "how did this feel vs. normal" — mainly used to catch
  // Saturday's hill/incline intervals being dosed too hard: two 'worse'
  // lange-duurloop sessions in a row afterward is a signal to lighten
  // Saturday (engine/recoveryCheck.ts). Optional everywhere; never
  // required, since MacroFactor's own quick-complete flow stays low-friction.
  subjectiveFeel?: SubjectiveFeel;
  // Where it hurt during or after (data/bodyAreas.ts, free text allowed).
  // Optional, additive: older logs and backups simply don't have it.
  painAreas?: string[];
  // Pain on a spot with a score (models/checkIn.ts, engine/pain.ts). The
  // areas above stay filled for older readers. Optional, additive.
  painReports?: PainReport[];
  // What the hard part of an interval, hill or tempo session actually was
  // (engine/workoutDetails.ts). Optional, additive: older logs and
  // backups simply don't have it.
  workout?: WorkoutDetails;
  // Strength: reps left in the hardest (leg) sets, 0 to 4 (RIR). Optional.
  strengthRir?: number;
  // A hard run or test: how your legs felt at the warm-up, held against the
  // leg index (engine/learning.ts). Optional, additive.
  legsAtStart?: 'fris' | 'normaal' | 'zwaar';
  // The id of this activity at the place it came from (engine/activityImport.ts),
  // so the same activity is never imported twice. Absent on manual logs and
  // on every log made before imports existed. Optional, additive.
  externalId?: string;
  // A log made by hand that took over the watch's numbers: the hand-made ones
  // as they were. Optional, additive; present only on such a log.
  manualMeasured?: ManualMeasured;
  source: MetricSource;
}

export interface WorkoutDetails {
  reps?: number;
  repSeconds?: number; // length of one hard repeat
  blockMinutes?: number; // a continuous hard block (tempo, the steady end)
  peakHeartRate?: number;
  blockHeartRate?: number; // average heart rate in the block
}

export type SubjectiveFeel = 'better' | 'normal' | 'worse';
