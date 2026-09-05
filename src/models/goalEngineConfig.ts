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

export interface TrainingAvailability {
  allowedDays: Weekday[];
  maxSessionDurationMin: Partial<Record<Weekday, number>>;
  longSessionDays: Weekday[];
  temporaryExceptions: { date: string; reason: string; available: boolean; maxDurationMin?: number }[];
}

export interface GoalEngineConfig {
  strategy: TrainingStrategyProfile;
  guardrails: TrainingGuardrail[];
  availability: TrainingAvailability;
}

export const DEFAULT_GOAL_ENGINE_CONFIG: GoalEngineConfig = {
  strategy: {
    progressionStyle: 'balanced',
    strengthProtection: 'normal',
    planningFlexibility: 'normal',
    missedSessionPreference: 'balanced',
    legHeavySpacingMode: 'balanced',
  },
  guardrails: [],
  availability: {
    allowedDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    maxSessionDurationMin: {},
    longSessionDays: [],
    temporaryExceptions: [],
  },
};
