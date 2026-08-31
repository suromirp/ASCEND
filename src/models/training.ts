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

export interface CardioMetric {
  durationMinutes: number;
  distanceKm?: number;
  elevationGainM?: number; // e.g. incline treadmill work counts toward D+ conditioning
  avgHeartRate?: number;
  hrZones?: number[];
  paceMinPerKm?: number;
  cadence?: number;
  source: MetricSource;
}

export interface OutdoorMetric {
  durationMinutes: number;
  distanceKm?: number;
  elevationGainM?: number;
  elevationLossM?: number;
  avgHeartRate?: number;
  maxElevationM?: number;
  backpackWeightKg?: number;
  terrain?: string;
  weatherNotes?: string;
  technicalDifficulty?: string;
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
  source: MetricSource;
}
