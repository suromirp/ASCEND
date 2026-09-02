// ASCEND — Training domain models
//
// Architectural rule (spec §15): a workout definition (SessionTemplate) is
// never bound directly to a calendar day. A PlannedSession schedules a
// template onto a date. A SessionLog records what actually happened.
// Changing the plan must never rewrite history — SessionLog rows are
// append-only and are never mutated once created.

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
}

// A single mobility item — either a dynamic warm-up move (before training)
// or a static stretch (after training, or in the standalone problem-area
// library). durationSec is per side when the stretch is one-sided.
export interface Stretch {
  name: string;
  durationSec?: number;
  note?: string;
}

// The reusable definition of a workout — "what" a session is, independent of
// when it happens.
export interface SessionTemplate {
  id: string;
  name: string;
  type: SessionType;
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
}

export type SessionVariant = 'full' | 'short' | 'minimum' | 'custom';

export interface SetLog {
  reps: number;
  weightKg?: number;
  rpe?: number;
}

export interface ExerciseSetLog {
  exerciseId: string;
  exerciseName: string;
  sets: SetLog[];
}

// What the session was actually done on/in — a treadmill run and an
// outdoor run (or an incline treadmill and a real hike) aren't
// interchangeable: GPS-based D+/D- only means something outdoors, and the
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
  estimatedElevation?: boolean; // see OutdoorMetric.estimatedElevation
  environment?: TrainingEnvironment;
  modality?: ActivityModality;
  guidanceMode?: GuidanceMode;
  garminSuggestedType?: string; // e.g. 'Base', 'Tempo' — only when guidanceMode === 'garmin_suggested'
  avgHeartRate?: number;
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
  cadence?: number;
  power?: number; // e.g. Friday's Easy Bike fallback
  maxElevationM?: number;
  backpackWeightKg?: number;
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

// The immutable record of what actually happened. Never edited after
// creation — corrections are made by adding a new log, not mutating this one.
export interface SessionLog {
  id: string;
  plannedSessionId?: string; // absent for ad-hoc / unplanned sessions
  templateId: string;
  type: SessionType;
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
  source: MetricSource;
}

export type SubjectiveFeel = 'better' | 'normal' | 'worse';
