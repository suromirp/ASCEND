// ASCEND — strategy, guardrails & availability (Technical Architecture
// v0.3.1 REVISED, review point 6 & 13). Bundled together as one versioned
// meta blob (storage/database.ts#GoalEngineConfigRepo) — none of the three
// need indexed queries, all three are read/written together as one small
// config unit.

export type ProgressionStyle = 'conservative' | 'balanced' | 'aggressive' | 'custom';

export interface TrainingStrategyProfile {
  progressionStyle: ProgressionStyle;
  strengthProtection: 'low' | 'normal' | 'high';
  planningFlexibility: 'strict' | 'normal' | 'flexible';
  missedSessionPreference: 'prefer_move' | 'balanced' | 'prefer_skip';
  legHeavySpacingMode: 'strict' | 'balanced' | 'flexible' | 'custom';
  legHeavySpacingHours?: number;
  // Time-budget scheduling redesign (production feedback: "1 trainingsdag =
  // 1 training" was too rigid for anyone combining strength + running +
  // hiking) — how eager the placement engines are to put a second real
  // session on a day that already has one, same enum-of-named-modes
  // convention as missedSessionPreference above rather than a bespoke
  // boolean/config shape. 'automatic' lets engine/scheduler.ts#dayHasRoomFor
  // decide from the day's own time budget; 'never' preserves the original
  // one-session-per-day behavior exactly.
  sameDayPairingPreference: 'automatic' | 'always' | 'only_if_useful' | 'never';
}

export type GuardrailMode = 'block' | 'warn' | 'allow';

// ONLY configurable guardrails are represented as data. System invariants
// (below) are never a TrainingGuardrail row.
export interface TrainingGuardrail {
  id: string;
  ruleId: string;
  mode: GuardrailMode;
}

// Enforced unconditionally by the (future) Constraint Engine. Not
// configurable, not stored as toggleable objects, never given a
// BLOCK/WARN/ALLOW mode.
export const SYSTEM_INVARIANTS = [
  'history_never_rewritten',        // SessionLog & GoalMilestoneProgress stay append-only
  'deterministic_behavior',          // same input + engine version + rule version -> same output
  'no_corrupt_state',
  'confirmation_horizon_respected',  // current/next week always proposal-gated, never silent
] as const;

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

// Time-budget scheduling redesign — replaces the old, effectively-unused
// maxSessionDurationMin: Partial<Record<Weekday, number>> (confirmed dead:
// never read anywhere outside its own type/default, and no Settings UI
// ever wrote to it — see TrainingAvailability's own history). Three tiers,
// not one hard number, because a user's real day never has a single sharp
// cutoff: preferredMinutes is what they'd say if asked ("~90 min"),
// softFlexMinutes is a small, expected overshoot that's still fine
// (engine/scheduler.ts#dayHasRoomFor treats preferred+softFlex as the real
// ceiling), hardMaximumMinutes is the genuine hard constraint some days
// have ("moet om 19:30 weg") and is optional — most days have none.
export interface DailyTimeBudget {
  preferredMinutes: number;
  softFlexMinutes: number;
  hardMaximumMinutes?: number;
}

export interface TrainingAvailability {
  allowedDays: Weekday[];
  dailyTimeBudget: Partial<Record<Weekday, DailyTimeBudget>>;
  longSessionDays: Weekday[];
  temporaryExceptions: { date: string; reason: string; available: boolean; maxDurationMin?: number }[];
}

export interface GoalEngineConfig {
  strategy: TrainingStrategyProfile;
  guardrails: TrainingGuardrail[];
  availability: TrainingAvailability;
  // Stamped by storage/database.ts#GoalEngineConfigRepo.set on every write —
  // absent until the first edit. First real consumer (Phase 8): a Strength
  // Program review needs to honestly detect "availability/priority changed
  // since the current strength block started" without inventing a diff of
  // its own; a single blob-level timestamp is enough for that, an
  // ASCEND_HEURISTIC-free fact rather than a guess at which field changed.
  updatedAt?: string;
}

export const DEFAULT_GOAL_ENGINE_CONFIG: GoalEngineConfig = {
  strategy: {
    progressionStyle: 'balanced',
    strengthProtection: 'normal',
    planningFlexibility: 'normal',
    missedSessionPreference: 'balanced',
    legHeavySpacingMode: 'balanced',
    sameDayPairingPreference: 'automatic',
  },
  guardrails: [],
  availability: {
    allowedDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    dailyTimeBudget: {},
    longSessionDays: [],
    temporaryExceptions: [],
  },
};
