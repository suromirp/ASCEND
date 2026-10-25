import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Program } from '../models/program';
import type { SessionTemplate, PlannedSession, SessionLog } from '../models/training';
import type { Objective, MilestoneProgress } from '../models/objectives';
import type { RecoveryMetric, BodyMetric, NutritionMetric } from '../models/metrics';
import type { InjuryNote } from '../models/injury';
import type { IllnessEpisode } from '../models/illness';
import type { LeavePeriod } from '../models/leave';
import type { ExternalOneRm, WeightEntry } from '../models/metrics';
import type { MorningCheckIn, NightJudgment, WeeklyHealthCheck, WeeklyIntention } from '../models/checkIn';
import type { InfluenceEntry } from '../models/influence';
import type { TrainingGoal, GoalMilestone, GoalMilestoneProgress } from '../models/goals';
import type { TrainingPrescription } from '../models/prescription';
import type { PlanChangeProposal } from '../models/planChange';
import type { StrengthProgramStrategy, StrengthProgramRecommendation } from '../models/strengthProgram';
import type { WeeklyPrescription } from '../models/weeklyPrescription';
import type { GoalEngineConfig } from '../models/goalEngineConfig';
import { DEFAULT_GOAL_ENGINE_CONFIG } from '../models/goalEngineConfig';
import type { CapabilityEvidence } from '../models/capability';
import type { PreImportSnapshot } from './backupTypes';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { addDays, formatDateNL, mondayOfWeek, resolveProgramWeek, todayISO, weekdayShortNL } from '../utils/dates';
import type { OverviewSettings } from '../engine/overviewSettings';
import type { StrengthSettings } from '../engine/strengthSettings';
import type { ClothingAdjust } from '../engine/clothingFeedback';
import type { RunInsightSettings } from '../engine/runInsightSettings';
import type { MorningNoticeSettings } from '../engine/morningNotice';
import { activeSwaps, patternSlotOf, layoutPhases, patternForWeek, planEndDay, programEndDate, templateForPhase, type PatternSwap, type PhaseLengthOverrides } from '../engine/programLayout';
import { DEFAULT_ENABLED_SPORTS, isSportEnabled, isTemplatePlannable, parseWeekShape, weeklyPatternTemplates, type WeekShape } from '../engine/sports';
import { arrangeWeekForRestDay, type RestWeekday } from '../engine/restDay';
import { describeRepair, lockLevel, visibleRepair } from '../engine/weekValidator';
import { patternDays, planPass } from '../engine/planPass';
import { resolveVariantDuration, withDurationScope, type DurationScope } from '../engine/substitutions';
import { raceBlocks, revivePrescriptionRemovedTests } from '../engine/raceBlock';
import { strayTrekRows } from '../engine/leaveStrays';
import { relayoutForRestDay } from '../engine/restDayProposal';
import { TENT_PACK_KG, packMilestoneUpdate, packWeightOf, programPackGoal, programPackTarget } from '../engine/gr5Profile';
import { makeId } from '../utils/id';
import { whenStorageOpen } from './lifecycle';
import { BOOT_MIGRATIONS_KEY } from '../engine/bootWatch';
import type { JourneyState } from '../engine/journey';
import type { PackListState } from '../engine/packList';

export const SCHEMA_VERSION = 1;
const DB_NAME = 'ascend-db';
const DB_VERSION = 8;

interface AscendDB extends DBSchema {
  meta: { key: string; value: unknown };
  programs: { key: string; value: Program };
  sessionTemplates: { key: string; value: SessionTemplate };
  plannedSessions: { key: string; value: PlannedSession; indexes: { 'by-week': string; 'by-date': string } };
  sessionLogs: { key: string; value: SessionLog; indexes: { 'by-date': string } };
  // Legacy — kept, not deleted, so a pre-goal-engine export still imports
  // cleanly. Emptied by storage/goalMigration.ts once trainingGoals/
  // goalMilestones/goalMilestoneProgress take over as the live source.
  objectives: { key: string; value: Objective };
  milestoneProgress: { key: string; value: MilestoneProgress; indexes: { 'by-objective': string } };
  recoveryMetrics: { key: string; value: RecoveryMetric };
  bodyMetrics: { key: string; value: BodyMetric };
  nutritionMetrics: { key: string; value: NutritionMetric };
  injuryNotes: { key: string; value: InjuryNote };
  // Snapshots taken automatically right before an import is applied — see
  // storage/backupImport.ts. A separate store (not reused for anything else)
  // specifically so the import transaction itself can never overwrite the
  // one copy that would let a bad import be undone.
  backupSnapshots: { key: string; value: PreImportSnapshot };
  // --- Goal engine foundation (Technical Architecture v0.3.1 REVISED, Phase 1) ---
  trainingGoals: { key: string; value: TrainingGoal };
  goalMilestones: { key: string; value: GoalMilestone; indexes: { 'by-goal': string } };
  goalMilestoneProgress: { key: string; value: GoalMilestoneProgress; indexes: { 'by-goal': string } };
  trainingPrescriptions: { key: string; value: TrainingPrescription; indexes: { 'by-plannedSession': string } };
  // --- Capability & Demand (Technical Architecture v0.3.1 REVISED, Phase 2) ---
  // Manual-entry rows ONLY (Storage plan) — direct/derived/proxy evidence
  // computed from SessionLog[] (engine/capability.ts#extractEvidenceFromLogs)
  // stays a derived read model, never duplicated into storage.
  capabilityEvidence: { key: string; value: CapabilityEvidence };
  // --- Rolling adaptation (Technical Architecture v0.3.1 REVISED, Phase 6) ---
  // Storage plan's own "Audit trail of shown proposals + resolution" —
  // append-only in practice: every id is fresh (makeId), nothing in this
  // codebase ever calls put() twice for the same id, and no delete is
  // exposed. Every PlanChangeProposal the Adaptive Replanner actually
  // applies to the forecast range is recorded here, resolvedAt/resolution
  // already set (auto-applied, not user-confirmed) — the same record a
  // future committed-range Proposal Engine flow would write once a
  // proposal is accepted there too.
  planChangeProposals: { key: string; value: PlanChangeProposal };
  // --- Strength Program Strategy (Strength Program Strategy Addendum v0.1,
  // Phase 8) --- ASCEND owns block strategy/frequency/split/placement;
  // MacroFactor Workouts (or a future provider) keeps owning exercise-level
  // content. One row per strength-training block (not per workout) —
  // historical blocks are kept, not overwritten, mirroring
  // planChangeProposals' own append-only-in-spirit pattern.
  strengthProgramStrategies: { key: string; value: StrengthProgramStrategy };
  // Append-only suggestions (§5: "a review is a suggestion, not an
  // automatic rewrite") — no delete exposed, same pattern as
  // planChangeProposals.
  strengthProgramRecommendations: { key: string; value: StrengthProgramRecommendation };
  // --- Weekly Prescription Builder (WAT vóór WAAR architecture pass) ---
  // One CURRENT row per week (old row deleted, new one put on each
  // recompute) — NOT append-only: the audit trail of WHY a week's
  // composition changed lives in planChangeProposals (trigger
  // 'weekly_prescription_computed'), never duplicated here.
  weeklyPrescriptions: { key: string; value: WeeklyPrescription; indexes: { 'by-week': string } };
}

let dbPromise: Promise<IDBPDatabase<AscendDB>> | null = null;

// While the app is out of view (or frozen), no new transaction starts: a frozen
// ASCEND with an open transaction would hold the storage for every other
// ASCEND (storage/lifecycle.ts). The caller simply waits until it is back.
export async function getDB(): Promise<IDBPDatabase<AscendDB>> {
  await whenStorageOpen();
  return openDatabase();
}

function openDatabase(): Promise<IDBPDatabase<AscendDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AscendDB>(DB_NAME, DB_VERSION, {
      // Guarded with objectStoreNames.contains(...) on every store — this
      // callback re-runs (from oldVersion, not from scratch) on every real
      // user's device the first time they open the app after a DB_VERSION
      // bump, so a bare createObjectStore() would throw
      // "object store already exists" for anything created by an earlier
      // version.
      upgrade(db) {
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
        if (!db.objectStoreNames.contains('programs')) db.createObjectStore('programs', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('sessionTemplates')) db.createObjectStore('sessionTemplates', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('plannedSessions')) {
          const planned = db.createObjectStore('plannedSessions', { keyPath: 'id' });
          planned.createIndex('by-week', 'weekStartDate');
          planned.createIndex('by-date', 'scheduledDate');
        }
        if (!db.objectStoreNames.contains('sessionLogs')) {
          const logs = db.createObjectStore('sessionLogs', { keyPath: 'id' });
          logs.createIndex('by-date', 'completedDate');
        }
        if (!db.objectStoreNames.contains('objectives')) db.createObjectStore('objectives', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('milestoneProgress')) {
          const progress = db.createObjectStore('milestoneProgress', { keyPath: 'id' });
          progress.createIndex('by-objective', 'objectiveId');
        }
        if (!db.objectStoreNames.contains('recoveryMetrics')) db.createObjectStore('recoveryMetrics', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('bodyMetrics')) db.createObjectStore('bodyMetrics', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('nutritionMetrics')) db.createObjectStore('nutritionMetrics', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('injuryNotes')) db.createObjectStore('injuryNotes', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('backupSnapshots')) db.createObjectStore('backupSnapshots', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('trainingGoals')) db.createObjectStore('trainingGoals', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('goalMilestones')) {
          const store = db.createObjectStore('goalMilestones', { keyPath: 'id' });
          store.createIndex('by-goal', 'goalId');
        }
        if (!db.objectStoreNames.contains('goalMilestoneProgress')) {
          const store = db.createObjectStore('goalMilestoneProgress', { keyPath: 'id' });
          store.createIndex('by-goal', 'goalId');
        }
        if (!db.objectStoreNames.contains('trainingPrescriptions')) {
          const store = db.createObjectStore('trainingPrescriptions', { keyPath: 'id' });
          store.createIndex('by-plannedSession', 'plannedSessionId');
        }
        if (!db.objectStoreNames.contains('capabilityEvidence')) db.createObjectStore('capabilityEvidence', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('planChangeProposals')) db.createObjectStore('planChangeProposals', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('strengthProgramStrategies')) db.createObjectStore('strengthProgramStrategies', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('strengthProgramRecommendations')) db.createObjectStore('strengthProgramRecommendations', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('weeklyPrescriptions')) {
          const store = db.createObjectStore('weeklyPrescriptions', { keyPath: 'id' });
          store.createIndex('by-week', 'weekStartDate');
        }
      },
      // Another ASCEND window was updated to a newer DB version: close this
      // connection so that upgrade can finish, and reload into the new
      // version instead of running old code against a changed database.
      blocking() {
        void dbPromise?.then((db) => db.close());
        dbPromise = null;
        if (typeof window !== 'undefined') window.location.reload();
      },
      // This window is the newer one, waiting for an old one to let go.
      blocked() {
        dbBlockedListeners.forEach((fn) => fn());
      },
      // The browser closed the connection by itself (Android can do that to an
      // app in the background, or when storage is cleared): the next call opens
      // a fresh one instead of using the closed connection.
      terminated() {
        dbPromise = null;
      },
    });
  }
  return dbPromise;
}

const dbBlockedListeners = new Set<() => void>();
export function onDatabaseBlocked(fn: () => void): () => void {
  dbBlockedListeners.add(fn);
  return () => dbBlockedListeners.delete(fn);
}

// --- generic helpers -------------------------------------------------------

async function getAll<K extends keyof AscendDB>(store: K) {
  const db = await getDB();
  // @ts-expect-error — generic store name, value shape narrowed by caller
  return db.getAll(store);
}

async function putAll<K extends keyof AscendDB>(store: K, values: unknown[]) {
  const db = await getDB();
  // @ts-expect-error — generic store name
  const tx = db.transaction(store, 'readwrite');
  const normalized = store === 'plannedSessions' ? values.map((v) => withDerivedWeek(v as PlannedSession)) : values;
  await Promise.all([...normalized.map((v) => tx.store.put(v as never)), tx.done]);
}

async function put<K extends keyof AscendDB>(store: K, value: unknown) {
  const db = await getDB();
  // @ts-expect-error — generic store name
  return db.put(store, value);
}

async function del<K extends keyof AscendDB>(store: K, key: string) {
  const db = await getDB();
  // @ts-expect-error — generic store name
  return db.delete(store, key);
}

async function clearStore<K extends keyof AscendDB>(store: K) {
  const db = await getDB();
  // @ts-expect-error — generic store name
  return db.clear(store);
}

// --- typed accessors ---------------------------------------------------

export const ProgramsRepo = {
  getAll: () => getAll('programs') as Promise<Program[]>,
  put: (p: Program) => put('programs', p),
  delete: (id: string) => del('programs', id),
};

export const SessionTemplatesRepo = {
  getAll: () => getAll('sessionTemplates') as Promise<SessionTemplate[]>,
  put: (t: SessionTemplate) => put('sessionTemplates', t),
};

// A week is derived, never stored on its own (CLAUDE.md): a session always
// belongs to the Monday-week of the day it is on. Every write goes through
// here, so a move to another week can't leave it counted in its old week
// too (production bug: totals and "x / 7" doubled after a cross-week move).
export function withDerivedWeek(s: PlannedSession): PlannedSession {
  const monday = mondayOfWeek(s.scheduledDate);
  return s.weekStartDate === monday ? s : { ...s, weekStartDate: monday };
}

// One-time repair for sessions moved across weeks before the fix above.
export async function normalizePlannedSessionWeeks(): Promise<number> {
  const all = await PlannedSessionsRepo.getAll();
  const wrong = all.filter((s) => s.weekStartDate !== mondayOfWeek(s.scheduledDate));
  if (wrong.length > 0) await putAll('plannedSessions', wrong);
  return wrong.length;
}

export const PlannedSessionsRepo = {
  getAll: () => getAll('plannedSessions') as Promise<PlannedSession[]>,
  put: (s: PlannedSession) => put('plannedSessions', withDerivedWeek(s)),
  delete: (id: string) => del('plannedSessions', id),
  byWeek: async (weekStartDate: string) => {
    const db = await getDB();
    return db.getAllFromIndex('plannedSessions', 'by-week', weekStartDate);
  },
};

export const SessionLogsRepo = {
  getAll: () => getAll('sessionLogs') as Promise<SessionLog[]>,
  put: (l: SessionLog) => put('sessionLogs', l),
  delete: (id: string) => del('sessionLogs', id),
};

export const ObjectivesRepo = {
  getAll: () => getAll('objectives') as Promise<Objective[]>,
  put: (o: Objective) => put('objectives', o),
};

export const MilestoneProgressRepo = {
  getAll: () => getAll('milestoneProgress') as Promise<MilestoneProgress[]>,
  put: (m: MilestoneProgress) => put('milestoneProgress', m),
  delete: (id: string) => del('milestoneProgress', id),
};

export const InjuryNotesRepo = {
  getAll: () => getAll('injuryNotes') as Promise<InjuryNote[]>,
  put: (n: InjuryNote) => put('injuryNotes', n),
  delete: (id: string) => del('injuryNotes', id),
};

// --- goal engine foundation repos ---------------------------------------
// Named, exported interfaces (not just inferred object shapes) — the
// platform-boundary groundwork from Technical Architecture v0.3.1 REVISED's
// Platform & Deployment Architecture section: a future
// AndroidStorageAdapter/iOSStorageAdapter implements the same interface
// over SQLite/native storage without engine/models code caring which one
// is live.

export interface TrainingGoalsRepo {
  getAll(): Promise<TrainingGoal[]>;
  put(goal: TrainingGoal): Promise<unknown>;
  delete(id: string): Promise<void>;
}

export const TrainingGoalsRepo: TrainingGoalsRepo = {
  getAll: () => getAll('trainingGoals') as Promise<TrainingGoal[]>,
  put: (goal: TrainingGoal) => put('trainingGoals', goal),
  delete: (id: string) => del('trainingGoals', id),
};

export interface GoalMilestonesRepo {
  getAll(): Promise<GoalMilestone[]>;
  byGoal(goalId: string): Promise<GoalMilestone[]>;
  put(milestone: GoalMilestone): Promise<unknown>;
  delete(id: string): Promise<void>;
}

export const GoalMilestonesRepo: GoalMilestonesRepo = {
  getAll: () => getAll('goalMilestones') as Promise<GoalMilestone[]>,
  byGoal: async (goalId: string) => {
    const db = await getDB();
    return db.getAllFromIndex('goalMilestones', 'by-goal', goalId);
  },
  put: (milestone: GoalMilestone) => put('goalMilestones', milestone),
  delete: (id: string) => del('goalMilestones', id),
};

export interface GoalMilestoneProgressRepo {
  getAll(): Promise<GoalMilestoneProgress[]>;
  byGoal(goalId: string): Promise<GoalMilestoneProgress[]>;
  put(progress: GoalMilestoneProgress): Promise<unknown>;
  delete(id: string): Promise<void>;
}

export const GoalMilestoneProgressRepo: GoalMilestoneProgressRepo = {
  getAll: () => getAll('goalMilestoneProgress') as Promise<GoalMilestoneProgress[]>,
  byGoal: async (goalId: string) => {
    const db = await getDB();
    return db.getAllFromIndex('goalMilestoneProgress', 'by-goal', goalId);
  },
  put: (progress: GoalMilestoneProgress) => put('goalMilestoneProgress', progress),
  delete: (id: string) => del('goalMilestoneProgress', id),
};

export interface TrainingPrescriptionsRepo {
  getAll(): Promise<TrainingPrescription[]>;
  byPlannedSession(plannedSessionId: string): Promise<TrainingPrescription | undefined>;
  put(prescription: TrainingPrescription): Promise<unknown>;
  delete(id: string): Promise<void>;
}

export const TrainingPrescriptionsRepo: TrainingPrescriptionsRepo = {
  getAll: () => getAll('trainingPrescriptions') as Promise<TrainingPrescription[]>,
  byPlannedSession: async (plannedSessionId: string) => {
    const db = await getDB();
    return db.getFromIndex('trainingPrescriptions', 'by-plannedSession', plannedSessionId);
  },
  put: (prescription: TrainingPrescription) => put('trainingPrescriptions', prescription),
  delete: (id: string) => del('trainingPrescriptions', id),
};

// goalEngineConfig deliberately isn't a store — a single meta key, same
// pattern as AppSettings, since strategy/guardrails/availability are all
// read/written together as one small config unit with no indexed queries.
export interface GoalEngineConfigRepo {
  get(): Promise<GoalEngineConfig>;
  set(patch: Partial<GoalEngineConfig>): Promise<GoalEngineConfig>;
}

export const GoalEngineConfigRepo: GoalEngineConfigRepo = {
  get: async () => {
    const stored = await MetaRepo.get<Partial<GoalEngineConfig>>('goalEngineConfig');
    return { ...DEFAULT_GOAL_ENGINE_CONFIG, ...stored };
  },
  set: async (patch: Partial<GoalEngineConfig>) => {
    const next = { ...(await GoalEngineConfigRepo.get()), ...patch, updatedAt: new Date().toISOString() };
    await MetaRepo.set('goalEngineConfig', next);
    return next;
  },
};

// Manual-entry evidence only (v0.3.1 REVISED Storage plan) — direct/
// derived/proxy evidence extracted from SessionLog[] is never persisted
// here, only computed live (engine/capability.ts).
export interface CapabilityEvidenceRepo {
  getAll(): Promise<CapabilityEvidence[]>;
  put(evidence: CapabilityEvidence): Promise<unknown>;
  delete(id: string): Promise<void>;
}

export const CapabilityEvidenceRepo: CapabilityEvidenceRepo = {
  getAll: () => getAll('capabilityEvidence') as Promise<CapabilityEvidence[]>,
  put: (evidence: CapabilityEvidence) => put('capabilityEvidence', evidence),
  delete: (id: string) => del('capabilityEvidence', id),
};

// Append-only audit trail (Phase 6) — no delete exposed on purpose. Every
// id is fresh (makeId), so put() is only ever an insert in practice, never
// an overwrite of an existing record.
export interface PlanChangeProposalsRepo {
  getAll(): Promise<PlanChangeProposal[]>;
  put(proposal: PlanChangeProposal): Promise<unknown>;
}

export const PlanChangeProposalsRepo: PlanChangeProposalsRepo = {
  getAll: () => getAll('planChangeProposals') as Promise<PlanChangeProposal[]>,
  put: (proposal: PlanChangeProposal) => put('planChangeProposals', proposal),
};

// Historical blocks are kept (put upserts by id; a completed/archived
// strategy is never deleted, only its status changes) — delete is exposed
// only for the rare case of discarding a genuine mistake, never used to
// "clean up" finished blocks.
export interface StrengthProgramStrategiesRepo {
  getAll(): Promise<StrengthProgramStrategy[]>;
  put(strategy: StrengthProgramStrategy): Promise<unknown>;
  delete(id: string): Promise<void>;
}

export const StrengthProgramStrategiesRepo: StrengthProgramStrategiesRepo = {
  getAll: () => getAll('strengthProgramStrategies') as Promise<StrengthProgramStrategy[]>,
  put: (strategy: StrengthProgramStrategy) => put('strengthProgramStrategies', strategy),
  delete: (id: string) => del('strengthProgramStrategies', id),
};

// Append-only (§5) — no delete exposed, same pattern as PlanChangeProposalsRepo.
export interface StrengthProgramRecommendationsRepo {
  getAll(): Promise<StrengthProgramRecommendation[]>;
  put(recommendation: StrengthProgramRecommendation): Promise<unknown>;
}

export const StrengthProgramRecommendationsRepo: StrengthProgramRecommendationsRepo = {
  getAll: () => getAll('strengthProgramRecommendations') as Promise<StrengthProgramRecommendation[]>,
  put: (recommendation: StrengthProgramRecommendation) => put('strengthProgramRecommendations', recommendation),
};

// One current row per week (put deletes the old row for the same week via
// the caller's own delete-then-put convention, mirroring
// TrainingPrescriptionsRepo's byPlannedSession pattern) — the "why" audit
// trail lives in PlanChangeProposalsRepo, never duplicated here.
export interface WeeklyPrescriptionsRepo {
  getAll(): Promise<WeeklyPrescription[]>;
  byWeekStartDate(weekStartDate: string): Promise<WeeklyPrescription | undefined>;
  put(prescription: WeeklyPrescription): Promise<unknown>;
  delete(id: string): Promise<void>;
}

export const WeeklyPrescriptionsRepo: WeeklyPrescriptionsRepo = {
  getAll: () => getAll('weeklyPrescriptions') as Promise<WeeklyPrescription[]>,
  byWeekStartDate: async (weekStartDate: string) => {
    const db = await getDB();
    return db.getFromIndex('weeklyPrescriptions', 'by-week', weekStartDate);
  },
  put: (prescription: WeeklyPrescription) => put('weeklyPrescriptions', prescription),
  delete: (id: string) => del('weeklyPrescriptions', id),
};

export const BackupSnapshotsRepo = {
  getAll: () => getAll('backupSnapshots') as Promise<PreImportSnapshot[]>,
  put: (s: PreImportSnapshot) => put('backupSnapshots', s),
  delete: (id: string) => del('backupSnapshots', id),
};

export const RecoveryMetricsRepo = {
  getAll: () => getAll('recoveryMetrics') as Promise<RecoveryMetric[]>,
  putAll: (metrics: RecoveryMetric[]) => putAll('recoveryMetrics', metrics),
  delete: (id: string) => del('recoveryMetrics', id),
};
export const BodyMetricsRepo = { getAll: () => getAll('bodyMetrics') as Promise<BodyMetric[]> };
export const NutritionMetricsRepo = { getAll: () => getAll('nutritionMetrics') as Promise<NutritionMetric[]> };

export const MetaRepo = {
  get: async <T,>(key: string): Promise<T | undefined> => {
    const db = await getDB();
    return db.get('meta', key) as Promise<T | undefined>;
  },
  set: async (key: string, value: unknown) => {
    const db = await getDB();
    return db.put('meta', value, key);
  },
};

// User-facing app preferences (as opposed to internal bookkeeping like
// `seeded`/`schemaVersion` above). Stored as a single object under one meta
// key so future settings don't each need their own key and migration.
export interface AppSettings {
  // When true, strength sessions are tracked externally (e.g. MacroFactor)
  // and ASCEND only records that the session happened, skipping the
  // per-exercise sets/reps/weight entry form.
  strengthTrackedExternally: boolean;
  // Synthesised drum hits on app open (see utils/introDrums.ts) — no audio
  // file, generated with the Web Audio API. Browsers block autoplay
  // without a user gesture, so it actually fires on the first tap/click
  // after launch, not literally on the splash frame itself.
  introSoundEnabled: boolean;
  // ISO timestamp of the last successful Settings → Export. Everything is
  // local-only (see CLAUDE.md) — this is what a weekly "you haven't backed
  // up" nudge compares against.
  lastExportedAt?: string;
  // ISO timestamp the export nudge was last dismissed. Tracked separately
  // from lastExportedAt so dismissing it actually snoozes for a week,
  // rather than reappearing on the very next app open.
  lastExportReminderDismissedAt?: string;
  // How fast runs and hikes build up (engine/ambition.ts). Unset: standaard.
  ambition?: 'rustig' | 'standaard' | 'stevig';
  // Real rest, or a light recovery day of 20-30 minutes (data/restDayCopy.ts).
  restDayMode?: 'rest' | 'active';
  // Your rest day, Monday to Friday (engine/restDay.ts). Unset: Monday.
  restDay?: RestWeekday;
  // Leg strength and a hard run on one day, 6+ hours apart (engine/scheduler.ts#setHardSameDayAllowed).
  hardSameDay?: boolean;
  // Your own heart rate values (Settings → Training → Mijn hartslag); the
  // training screens then show zones in bpm (engine/heartRateZones.ts).
  heartRate?: { maxHr?: number; lthr?: number; restingHr?: number };
  // "Nieuw begonnen" card on Today closed with NIEUW BEGINNEN.
  freshStartDismissedAt?: string;
  // Marathon goal — deliberately not a second Objective/MilestoneDefinition
  // ladder (several screens assume objectives[0] is "the" objective); a
  // standalone settings-backed goal instead, mirroring the GR5 card's UI.
  // undefined raceType means the goal card is hidden/not yet set up.
  marathonRaceType?: 'half' | 'full';
  marathonTargetDate?: string; // ISO date
  marathonTargetTimeMinutes?: number;
  // Fase 2 — how plan changes reach the calendar (engine/changeImpact.ts).
  // Absent = 'auto_small'. Optional with a default, so older stored
  // settings and backups need no migration step.
  changeApplyMode?: 'always_ask' | 'auto_small' | 'auto_all';
  // Fase 2 — which sports ASCEND may plan (engine/sports.ts). Logging is
  // never restricted. Absent = engine/sports.ts#DEFAULT_ENABLED_SPORTS.
  enabledSports?: { running: boolean; hiking: boolean; cycling: boolean };
  // "Zoveel keer per week" per sport (engine/sportFrequency.ts). A sport
  // missing here is on Automatisch: the weekly pattern and weekly planning
  // decide. Optional, so older settings need no migration.
  sportFrequency?: Partial<Record<'running' | 'hiking' | 'cycling', number>>;
  // The shape of your week, chosen at the first questions (engine/weekShape.ts,
  // read by engine/sports.ts#weeklyPatternTemplates). Unset: the full default
  // pattern. Optional, so older settings and backups need no migration.
  weekShape?: WeekShape;
  // Fase 3 — the long Sunday from Bergcapaciteit on (engine/programLayout.ts).
  // Absent = 'hike'. Optional, so older settings need no migration.
  longSundaySession?: 'hike' | 'run';
  // Your own starting estimate of how long a strength training takes, per
  // template id (engine/durationLearning.ts). ASCEND switches to what it
  // learns from your logs once there are enough. Optional, no migration.
  sessionDurationEstimates?: Record<string, number>;
  // Your own phase lengths toward the goal (engine/programLayout.ts
  // #PhaseLengthOverrides). Absent = fully automatic. Optional, no migration.
  programPhaseOverrides?: PhaseLengthOverrides;
  // Ziek gemeld (engine/illness.ts). Optional, so older settings and
  // backups need no migration; travels with the settings in an export.
  illnessEpisodes?: IllnessEpisode[];
  // Vrije dagen, vakanties en tochten (engine/leave.ts). Optional and
  // additive, so older settings need no change; travels with the settings in
  // a backup (backup schema 5, storage/migrations.ts#migrateLeavePeriods).
  // Added and removed only with Akkoord on the proposal that goes with it.
  leavePeriods?: LeavePeriod[];
  // The next tocht (a trek you set up as a goal of your own, models/leave.ts
  // TrekDetails) on Vandaag. Absent = on. Optional and additive.
  showNextTrek?: boolean;
  // Bergschoenen inlopen (engine/bootBreakIn.ts): het doel in kilometers (absent
  // = 100) en of een lange tocht ernaar herinnert (absent = aan). Optional and
  // additive; the date and name live in `journey.boots`.
  bootBreakInKm?: number;
  bootBreakInReminder?: boolean;
  // The line about the watch on a training ("Verstuurd naar je horloge om
  // 19.04", or the offer to link) and the small watch mark in the Week list
  // (only for sent or failed). Absent = on. Optional and additive.
  showWatchStatus?: boolean;
  showWatchStatusOnWeek?: boolean;
  // What goes before the name of a training sent to the watch: "ASC " (short,
  // absent = short), "ASCEND \u00b7 " (long) or nothing. Unless none, the
  // description starts with a dated line. Optional and additive.
  watchNamePrefix?: 'short' | 'long' | 'none';
  // Whose heart rate numbers the watch gets (engine/watchHeartRate.ts):
  // 'ascend' (absent = ascend) writes the beats of your own zones as a
  // percentage that intervals.icu turns into the same beats; 'intervals' sends
  // the zone name as before. Optional and additive.
  watchHeartRate?: 'ascend' | 'intervals';
  // An easy or long run gets only an upper limit (start of zone 1 to the end
  // of zone 2). Absent = on. Only with watchHeartRate 'ascend'.
  watchCalmRun?: boolean;
  // Take a done or past training out of the intervals.icu agenda at the next
  // round. Absent = on. Optional and additive.
  watchRemoveDone?: boolean;
  // The button "Tekst voor Strava kopiëren" on a done training (engine/
  // activityText.ts). Absent = on. Optional and additive, so no migration step.
  stravaText?: boolean;
  // Rest after a bergtocht: 'soft' (absent = soft) lets the short version of a
  // heavy leg day stand 48 hours after it, 'strict' keeps 72 hours.
  trekLegRest?: 'soft' | 'strict';
  // After the main goal (engine/programLayout.ts#planEndDay): 'stop' (absent =
  // stop) plans nothing during and after it until you choose a new goal;
  // 'maintain' plans maintenance weeks once the trip is over. During the trip
  // itself nothing is planned either way. Optional and additive.
  afterMainGoal?: 'stop' | 'maintain';
  // Kennisbank: what you marked as read and this week's lesson
  // (engine/weeklyLesson.ts). Optional and additive; travels in an export.
  knowledge?: { read?: string[]; week?: { weekStart: string; topicId: string } };
  // Trend weight (engine/bodyWeight.ts), e.g. from MacroFactor, entered
  // about every two weeks. Kept with the settings so it travels in an
  // export without a backup schema change; carries a source like every
  // other metric, so a Health Connect/MacroFactor adapter can fill it.
  weightEntries?: WeightEntry[];
  // The 1RM per exercise as MacroFactor reports it (models/metrics.ts#ExternalOneRm,
  // engine/macrofactorOneRm.ts), shown next to ASCEND's own estimate on Forge.
  // History, like the weight: kept with the settings so it travels in a backup
  // without a schema change, and a restore adds to it and never drops a day the
  // device has. Optional and additive: absent on an older device or backup, and
  // read defensively on import (storage/migrations.ts#migrateExternalOneRm).
  externalOneRm?: ExternalOneRm[];
  // The short morning check-in: legs, energy, sleep (models/checkIn.ts).
  // Optional and additive, travels with the settings in an export.
  morningCheckIns?: MorningCheckIn[];
  // Your own verdict on a night the watch only partly measured, per date
  // (engine/shortNight.ts, models/checkIn.ts#NightJudgment). The numbers from the
  // watch are never changed; this is ASCEND's own note. Optional and additive, so
  // the backup schema number does not move; travels with the settings and is read
  // defensively on import (storage/migrations.ts#migrateNightJudgments).
  nightJudgments?: NightJudgment[];
  // "Vragen bij een korte nacht": ask instead of warning when the watch saw
  // doubtfully little sleep. Absent = on. Optional and additive.
  askShortNight?: boolean;
  // "Wat speelde er": your own notes about a day or a training (models/influence.ts).
  // Never changes a log or the watch numbers. Optional and additive, so the backup
  // schema number does not move; travels with the settings and is read defensively
  // on import (storage/migrations.ts#migrateInfluences), merged per id on restore.
  influences?: InfluenceEntry[];
  // The switches of "Wat speelde er" (group Lichaam). All absent = the advice:
  // the sign on a training with a deviating heart rate, the overview on Je stand and
  // the proposal to move a test are on, and the possible cause includes your pattern.
  influenceSign?: boolean;
  influenceCause?: 'uit' | 'weet' | 'patroon';
  influenceOverview?: boolean;
  influenceTestMove?: boolean;
  // The one question per week in the week review (models/checkIn.ts).
  weeklyHealthChecks?: WeeklyHealthCheck[];
  // The question of the week and your one-line plan (engine/weeklyQuestion.ts).
  // Optional and additive, so older settings and backups need no schema step;
  // it travels with the settings in an export and is validated on import.
  weeklyIntentions?: WeeklyIntention[];
  weightReminderSnoozedAt?: string; // ISO date
  // Reisplanner: which tasks on the way to the GR5 are ticked off
  // (engine/journey.ts). Optional and additive, so older settings and
  // backups need no schema step; travels with the settings in an export and
  // is read defensively (normalizeJourneyState).
  journey?: JourneyState;
  // Paklijst with weights (engine/packList.ts). Absent means the example
  // list from data/packList.ts. Same rules as `journey`.
  packList?: PackListState;
  // Days between weight reminders; 0 = never remind. Absent = 14.
  weightReminderDays?: number;
  // "Gewicht uit MacroFactor gebruiken" (engine/bodyWeight.ts#weightsInUse):
  // absent or true = the weight read from a MacroFactor export counts, false =
  // it stays stored but is not used. Optional and additive, so older settings
  // and backups need no schema step; travels with the settings in an export.
  weightFromMacroFactor?: boolean;
  // "Vetpercentage tonen" (engine/bodyFat.ts): absent or true = the fat percentage and the
  // fat-free mass from the weigh-ins are shown under Lichaamsgewicht, false = they stay stored
  // but are not shown. Optional and additive, so older settings and backups need no step.
  showBodyFat?: boolean;
  // Where you live, for distances to training spots (engine/trainingSpots.ts).
  // Only ever stored on this device.
  homeLocation?: { name: string; lat: number; lon: number };
  // "Overzichten en vragen" (engine/overviewSettings.ts): what shows on Today
  // and what ASCEND proposes. Absent or missing keys = how the app always was.
  // Optional and additive; travels with the settings in a backup.
  overviews?: OverviewSettings;
  // "Forge" / Kracht meerekenen (engine/strengthSettings.ts): the switch, the
  // choices and the gym profile. Absent or missing keys = the advice. Optional
  // and additive; travels with the settings in a backup, where only valid
  // values are kept (storage/backup.ts).
  strengthModel?: StrengthSettings;
  // What you told ASCEND about the clothing advice: degrees to dress lighter
  // (plus) or heavier (minus), per sport, plus or minus 4 at most
  // (engine/clothingFeedback.ts). Absent = 0 everywhere. Optional and additive,
  // so older settings and backups need no migration step; travels with the
  // settings in a backup and is read defensively on import.
  clothingAdjust?: ClothingAdjust;
  // What the back button does on a tab ('today': to Vandaag first, 'previous':
  // to the tab before) and for how many minutes after a restart the app opens
  // where you were (0 = never). Absent = the advice (engine/navigationSettings.ts).
  // Optional and additive; travels in a backup, where only valid values are kept
  // (storage/migrations.ts#cleanNavigationSettings).
  tabBack?: 'today' | 'previous';
  resumeMinutes?: number;
  // "Beweging" (engine/motionSettings.ts): how much the app moves. Absent = 'full'.
  // Optional and additive; read defensively, so no migration step is needed.
  motion?: 'full' | 'calm' | 'off';
  // "Lucht bovenaan" (engine/skySettings.ts): the light or dark sky on the tabs, by
  // the clock ('auto', the default), always light or always dark, and from when it is
  // dark. Optional and additive; read defensively, so no migration step is needed.
  sky?: 'auto' | 'day' | 'night';
  skyNightFrom?: 'zon' | '19:00' | '20:00' | '21:00' | '22:00';
  // "Intensiteit tellen" (engine/intensitySettings.ts): of Je stand de minuten telt naar je
  // hartslag ('heartrate', de standaard) of naar het plan ('plan'). Optional and additive;
  // read defensively, so no migration step is needed.
  intensityCounting?: 'heartrate' | 'plan';
  // "Figuur" (engine/figureSettings.ts): of het figuur op Lichaam een man of een vrouw is.
  // Absent = 'auto' (van de koppeling als die het weet, anders een man). Optional and
  // additive; read defensively, so no migration step is needed.
  figure?: 'auto' | 'man' | 'vrouw';
  // "Loopinzicht" (engine/runInsightSettings.ts): the two lines after a run or
  // tocht, the weather lookup and the chest strap. Absent or missing keys = the
  // advice. Optional and additive; travels with the settings in a backup, where
  // only valid values are kept (storage/backup.ts).
  runInsight?: RunInsightSettings;
  // "Ochtendmelding" (engine/morningNotice.ts): a notice in the morning with the
  // question how you feel, shown by the service worker on a periodic sync. Absent
  // = off, at 07:30. The service worker reads this record from IndexedDB, so keep
  // the name and the shape. Optional and additive; travels with the settings in a
  // backup (the permission of the phone does not), where it is read defensively.
  morningNotice?: MorningNoticeSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  strengthTrackedExternally: false,
  introSoundEnabled: true,
};

export const SettingsRepo = {
  get: async (): Promise<AppSettings> => {
    const stored = await MetaRepo.get<Partial<AppSettings>>('settings');
    return { ...DEFAULT_SETTINGS, ...stored };
  },
  set: async (patch: Partial<AppSettings>): Promise<AppSettings> => {
    const next = { ...(await SettingsRepo.get()), ...patch };
    await MetaRepo.set('settings', next);
    return next;
  },
};

// Whether today's daily stretch routine has been checked off. Stores the
// ISO date it was last marked done for each routine, not a bare boolean —
// comparing that date to today's is what makes the checkbox reset itself
// every day without any cleanup job.
export interface StretchCompletion {
  morning?: string;
  evening?: string;
}

export const StretchCompletionRepo = {
  get: async (): Promise<StretchCompletion> => {
    return (await MetaRepo.get<StretchCompletion>('stretchCompletion')) ?? {};
  },
  set: async (patch: Partial<StretchCompletion>): Promise<StretchCompletion> => {
    const next = { ...(await StretchCompletionRepo.get()), ...patch };
    await MetaRepo.set('stretchCompletion', next);
    return next;
  },
};

// --- seeding & reset ---------------------------------------------------

// What a new device gets. `withProgram: true` (the default, kept for the demo
// data and for the tests that need a running plan) fills the whole default
// program: a GR5 goal and a planning. The app itself opens with
// `withProgram: false` (storage/bootMigrations.ts): only the building blocks
// every screen reads (the training templates); no program, no goal, nothing
// planned. The plan comes after the first questions, as a proposal with Akkoord
// (docs/beslissingen/2026-10-25-eerst-vragen-dan-plannen.md).
//
// A device is new when no seeding was ever recorded. Whether the app is
// "empty" for the screens is derived from the data itself (engine/freshStart.ts#isEmptyStart),
// so a device with data is never treated as a new start, marker or not.
export async function seedIfEmpty(options: { withProgram?: boolean } = {}): Promise<void> {
  const seeded = await MetaRepo.get<boolean>('seeded');
  if (seeded) return;
  const withProgram = options.withProgram ?? true;

  if (!withProgram) {
    // Only the building blocks; never a program, so data that is already there
    // (a marker lost, a backup put back in an odd order) is never overwritten.
    await putAll('sessionTemplates', buildDefaultProgramData().templates);
    await MetaRepo.set('seeded', true);
    // No seededAt: the card "Nieuw begonnen" is for devices that were filled
    // with the default program; this one waits for your own choices.
    await MetaRepo.set('schemaVersion', SCHEMA_VERSION);
    await MetaRepo.set('scheduleVersion', SCHEDULE_CONTENT_VERSION);
    return;
  }

  const { program, templates, plannedSessions, objectives, sessionLogs, milestoneProgress } = buildDefaultProgramData();
  await ProgramsRepo.put(program);
  await putAll('sessionTemplates', templates);
  await putAll('plannedSessions', plannedSessions);
  await putAll('objectives', objectives);
  await putAll('sessionLogs', sessionLogs);
  await putAll('milestoneProgress', milestoneProgress);
  await MetaRepo.set('seeded', true);
  // When this device started from an empty database: Today offers to put a
  // backup back for the first days (engine/freshStart.ts).
  await MetaRepo.set('seededAt', new Date().toISOString());
  await MetaRepo.set('schemaVersion', SCHEMA_VERSION);
  await MetaRepo.set('scheduleVersion', SCHEDULE_CONTENT_VERSION);
}

// syncObjectiveDefinitions()/GR5_LADDER_CONTENT_VERSION retired (Technical
// Architecture v0.3.1 REVISED, Migration plan): its job — keeping the
// legacy GR5 ladder's static content current on an already-seeded device —
// is superseded by storage/goalMigration.ts's one-time migration to
// TrainingGoal/GoalMilestone. The legacy `objectives` store this used to
// upsert into is still seeded once by seedIfEmpty() above (migration reads
// its user-specific state — targetDate/progress — from there), but its
// static content (name/milestones) no longer needs ongoing sync: the
// migrated GoalMilestone rows are the live source of truth from here on.

// SessionTemplate definitions are static content, same reasoning as
// syncObjectiveDefinitions above — safe to overwrite in place. The weekly
// PlannedSession pattern they generate is not: an already-seeded device has
// its own program.startDate and, more importantly, real SessionLogs whose
// plannedSessionId points at specific PlannedSession rows. Bump this when
// buildTemplates()/the defaultDayOfWeek pattern in data/defaultProgram.ts
// changes shape (not for wording-only tweaks, which upsert for free).
//
// Only PlannedSessions from the Monday *after* the week containing today
// are regenerated — the whole week someone is mid-way through, including
// its still-future days, is left exactly as already scheduled. (v1 of this
// cut off at "today" itself, which could fragment the in-progress week:
// Monday already logged under the old pattern, but Thursday/Friday/
// Saturday of that same week silently reshaped underneath it — see the
// v1->v2 correction below.) Nothing that already happened silently
// reshapes itself, and no already-logged session's plannedSessionId ever
// dangles. A future session the user already skipped or moved is still
// replaced by this — same full-overwrite tradeoff syncObjectiveDefinitions/
// resetToDemoData already make for non-historical data, just scoped to
// "not this week or earlier" here.
// v3: swapped Bovenlichaam A/Bovenlichaam B's defaultDayOfWeek (data/defaultProgram.ts) —
// Bovenlichaam A was displaced from Monday to Friday by an earlier reshape (moving
// Herstel onto Monday) while Bovenlichaam B stayed put on Thursday, an unintended
// side effect that left Bovenlichaam B landing before Bovenlichaam A each week with no
// actual training rationale behind the order (confirmed via git history —
// user bug report). Fixed at the source; this bump carries it to already-
// seeded devices the same safe way v1->v2 did.
const SCHEDULE_CONTENT_VERSION = 3;

// One-time correction for exactly the fragmentation v1 could cause (see
// above): a week where tpl_upper_a appears twice — once on its old Monday
// slot (already scheduled/logged before v1 ran) and once on its new Friday
// slot (written by v1, since Friday fell after v1's same-day cutoff) — with
// tpl_hill_intervals/tpl_long_run also freshly written into that week's
// Saturday/Sunday. Reverts just those three still-unlogged sessions back to
// the old Friday/Saturday/Sunday templates (Bergconditie/Benen B/Herstel),
// so the in-progress week reads as one coherent plan again; the new pattern
// still takes over cleanly from the following Monday (already correct,
// untouched by this).
async function fixV1WeekFragmentation(): Promise<void> {
  const [sessions, logs] = await Promise.all([PlannedSessionsRepo.getAll(), SessionLogsRepo.getAll()]);
  const loggedPlannedIds = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));

  const byWeek = new Map<string, PlannedSession[]>();
  for (const s of sessions) {
    const list = byWeek.get(s.weekStartDate);
    if (list) list.push(s);
    else byWeek.set(s.weekStartDate, [s]);
  }

  const REVERT: Record<string, string> = {
    tpl_hill_intervals: 'tpl_lower_b',
    tpl_long_run: 'tpl_herstel',
  };

  for (const weekSessions of byWeek.values()) {
    const upperAs = weekSessions.filter((s) => s.templateId === 'tpl_upper_a').sort((a, b) => (a.scheduledDate < b.scheduledDate ? -1 : 1));
    if (upperAs.length < 2) continue; // not a fragmented week

    // Only the later (Friday, written by v1) occurrence is the erroneous
    // duplicate — the earliest one is the legitimate original Monday slot
    // and must never be touched, logged or not.
    const duplicate = upperAs[upperAs.length - 1];
    if (!loggedPlannedIds.has(duplicate.id)) {
      await PlannedSessionsRepo.put({ ...duplicate, templateId: 'tpl_bergconditie' });
    }

    for (const s of weekSessions) {
      if (s.id === duplicate.id || loggedPlannedIds.has(s.id)) continue;
      if (REVERT[s.templateId]) {
        await PlannedSessionsRepo.put({ ...s, templateId: REVERT[s.templateId] });
      }
    }
  }
}

// Keeps every built-in SessionTemplate on this device equal to its current
// definition in data/defaultProgram.ts — adds new ones (e.g. tpl_bike) and
// updates changed ones (e.g. a new usual weekday) — without touching the
// schedule. syncTemplateAndScheduleDefinitions below only runs on a
// content-version bump and then regenerates future weeks, which would throw
// away a user's own placement; a changed template definition on its own
// never needs that. The new definitions take effect in the planning at the
// next clean restart (Settings → Training → Programma) or wherever ASCEND
// plans new sessions.
export async function ensureDefaultTemplates(): Promise<void> {
  const existing = new Map((await SessionTemplatesRepo.getAll()).map((t) => [t.id, t]));
  const changed = buildDefaultProgramData().templates.filter((t) => JSON.stringify(existing.get(t.id)) !== JSON.stringify(t));
  if (changed.length > 0) await putAll('sessionTemplates', changed);
}

export async function syncTemplateAndScheduleDefinitions(): Promise<void> {
  const version = await MetaRepo.get<number>('scheduleVersion');
  if (version === SCHEDULE_CONTENT_VERSION) return;

  if (version === 1) {
    await fixV1WeekFragmentation();
  }

  const { templates } = buildDefaultProgramData();
  await putAll('sessionTemplates', templates);

  const [programs, existingSessions] = await Promise.all([ProgramsRepo.getAll(), PlannedSessionsRepo.getAll()]);
  const program = programs[0];
  if (!program) {
    await MetaRepo.set('scheduleVersion', SCHEDULE_CONTENT_VERSION);
    return;
  }

  const cutoff = addDays(mondayOfWeek(todayISO()), 7);
  const toDelete = existingSessions.filter((s) => s.scheduledDate >= cutoff);
  await Promise.all(toDelete.map((s) => PlannedSessionsRepo.delete(s.id)));

  const ctx = await patternContext(templates, await defaultPatternSelector());
  await putAll('plannedSessions', patternSessions(program, templates, ctx.pattern, ctx.swaps, { from: cutoff, until: ctx.anchor }));

  await MetaRepo.set('scheduleVersion', SCHEDULE_CONTENT_VERSION);
}

// Emptied (not deleted) by storage/goalMigration.ts once the one-time
// migration has copied their content forward — see that file.
export async function clearLegacyObjectiveStores(): Promise<void> {
  await Promise.all([clearStore('objectives'), clearStore('milestoneProgress')]);
}

export async function resetToDemoData(): Promise<void> {
  await Promise.all([
    clearStore('programs'),
    clearStore('sessionTemplates'),
    clearStore('plannedSessions'),
    clearStore('sessionLogs'),
    clearStore('objectives'),
    clearStore('milestoneProgress'),
    clearStore('recoveryMetrics'),
    clearStore('bodyMetrics'),
    clearStore('nutritionMetrics'),
    clearStore('injuryNotes'),
    clearStore('trainingGoals'),
    clearStore('goalMilestones'),
    clearStore('goalMilestoneProgress'),
    clearStore('trainingPrescriptions'),
    clearStore('capabilityEvidence'),
    clearStore('planChangeProposals'),
    clearStore('strengthProgramStrategies'),
    clearStore('strengthProgramRecommendations'),
    clearStore('weeklyPrescriptions'),
    // "Alles verwijderen" means everything: settings, availability, coach
    // answers, illness and weight history, and the pre-import copies that
    // hold a full copy of the old history.
    clearStore('backupSnapshots'),
    clearStore('meta'),
  ]);
  // Production incident: trainingGoals above is cleared, but the marathon
  // fields in `settings` (AppSettings) are a second, shadow pointer into
  // that same goal — storage/goalMigration.ts#migrateToGoalEngine reads
  // them straight back out and silently re-mints the exact same
  // TrainingGoal (buildMarathonGoal) the moment goalEngineMigrated is unset
  // below. Without this, "reset alles" leaves a stale marathonRaceType
  // behind that regenerates a goal the user believed they'd wiped —
  // status:'paused' if marathonTargetDate was never set, which is silently
  // invisible everywhere (see MarathonGoalCard's status badge/pages/Ascend.tsx).
  await SettingsRepo.set({ marathonRaceType: undefined, marathonTargetDate: undefined, marathonTargetTimeMinutes: undefined });
  await MetaRepo.set('seeded', false);
  await MetaRepo.set('goalEngineMigrated', false);
  await MetaRepo.set('strengthProgramDefaultSeeded', false);
  // Like a fresh install: only the templates, no program or planning, so the app
  // opens on the welcome and asks before it plans anything
  // (docs/beslissingen/2026-10-25-eerst-vragen-dan-plannen.md).
  await seedIfEmpty({ withProgram: false });
}

// User-facing "reset my schedule" — Settings' SCHEMA OPNIEUW LADEN button.
// Deliberately NOT resetToDemoData: that's a full factory reset (wipes
// sessionLogs/injuryNotes/capabilityEvidence/trainingGoals/... too), which
// is wrong here — a user asking to reset their *schedule* still wants their
// training history, injuries and goals intact (production bug report: this
// button silently deleted "geschiedenis en al mijn afgeronde activiteiten").
//
// Only ever touches `programs`/`sessionTemplates`/`plannedSessions` — the
// same content `syncTemplateAndScheduleDefinitions` treats as safe to
// regenerate — and even then only PlannedSessions from `cutoff` onward,
// with logged ones excluded on top of that as a second, independent guard
// (a SessionLog's plannedSessionId must never dangle). `startFrom` decides
// where the standard weekly rotation restarts as "Maand 1, Week 1":
// 'this_week' takes effect immediately (today onward, this week's earlier
// days/logs untouched); 'next_week' leaves the rest of the current week
// exactly as already scheduled and only starts the fresh pattern next
// Monday. Either way `program.startDate` moves to this week's Monday, so
// week/phase numbering always restarts cleanly from Week 1 — dates before
// it simply resolve outside the (new) program via resolveProgramWeek,
// exactly like any date before a fresh install's startDate.
export async function resetScheduleToDefault(startFrom: 'this_week' | 'next_week'): Promise<void> {
  const [programs, existingSessions, logs] = await Promise.all([
    ProgramsRepo.getAll(),
    PlannedSessionsRepo.getAll(),
    SessionLogsRepo.getAll(),
  ]);
  const program = programs[0];
  if (!program) return;

  const thisMonday = mondayOfWeek(todayISO());
  const cutoff = startFrom === 'this_week' ? todayISO() : addDays(thisMonday, 7);

  const { templates } = buildDefaultProgramData();
  await putAll('sessionTemplates', templates);
  const ctx = await patternContext(templates, await defaultPatternSelector());
  const next = withPackTarget({ ...program, startDate: thisMonday, phases: layoutPhases(thisMonday, ctx.anchor, todayISO(), ctx.overrides) }, ctx.packTarget);
  await ProgramsRepo.put(next);

  const loggedPlannedIds = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const toDelete = existingSessions.filter((s) => s.scheduledDate >= cutoff && !loggedPlannedIds.has(s.id));
  const kept = keptLoggedSlots(existingSessions, loggedPlannedIds, cutoff);
  const newSessions = patternSessions(next, templates, ctx.pattern, ctx.swaps, { from: cutoff, until: ctx.anchor, skipSlot: (id, date) => kept.has(`${id}|${date}`) });
  await replacePlannedSessions(toDelete, newSessions);
}

// Logged sessions on or after the cutoff stay; a rebuilt pattern must not
// put the same template on the same day next to one (the user would be
// asked to do a session they already did).
function keptLoggedSlots(sessions: PlannedSession[], loggedIds: Set<string | undefined>, cutoff: string): Set<string> {
  return new Set(sessions.filter((s) => s.scheduledDate >= cutoff && loggedIds.has(s.id)).map((s) => `${s.templateId}|${s.scheduledDate}`));
}

// Delete-then-add in one transaction: an app closed halfway used to leave
// the future with no planning at all.
async function replacePlannedSessions(toDelete: PlannedSession[], toAdd: PlannedSession[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('plannedSessions', 'readwrite');
  await Promise.all([
    ...toDelete.map((s) => tx.store.delete(s.id)),
    ...toAdd.map((s) => tx.store.put(withDerivedWeek(s))),
    tx.done,
  ]);
}

// "Schone start vanaf week 1" (Settings → Training → Programma). Week 1
// moves to this or next week AND the planning from then on is rebuilt from
// the program's own weekly pattern: your own moves/skips from there on are
// dropped (that is the point of starting over), logged sessions and all
// history stay. selectPattern lets the caller shape the weekly pattern
// (engine/sports.ts#weeklyPatternTemplates: sports on/off, a weekly ride);
// the caller then applies the active strength block and the
// weekly planning on top (state/AppDataContext.tsx#restartProgram), so the
// rebuilt week follows the user's settings instead of a bare template.
export async function rebuildPlanningFromWeekOne(
  startFrom: 'this_week' | 'next_week',
  selectPattern: (templates: SessionTemplate[]) => SessionTemplate[] = (templates) => templates.filter((t) => t.defaultDayOfWeek),
): Promise<{ created: number; removed: number }> {
  const [programs, existingSessions, logs, templates] = await Promise.all([
    ProgramsRepo.getAll(),
    PlannedSessionsRepo.getAll(),
    SessionLogsRepo.getAll(),
    SessionTemplatesRepo.getAll(),
  ]);
  const program = programs[0];
  if (!program) return { created: 0, removed: 0 };

  const thisMonday = mondayOfWeek(todayISO());
  const newStart = startFrom === 'this_week' ? thisMonday : addDays(thisMonday, 7);
  const cutoff = startFrom === 'this_week' ? todayISO() : newStart;
  const ctx = await patternContext(templates, selectPattern);
  const next = withPackTarget({ ...program, startDate: newStart, phases: layoutPhases(newStart, ctx.anchor, todayISO(), ctx.overrides) }, ctx.packTarget);
  await ProgramsRepo.put(next);

  const loggedPlannedIds = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const toDelete = existingSessions.filter((s) => s.scheduledDate >= cutoff && !loggedPlannedIds.has(s.id));
  const kept = keptLoggedSlots(existingSessions, loggedPlannedIds, cutoff);
  const newSessions = patternSessions(next, templates, ctx.pattern, ctx.swaps, { from: cutoff, until: ctx.anchor, skipSlot: (id, date) => kept.has(`${id}|${date}`) });
  await replacePlannedSessions(toDelete, newSessions);
  return { created: newSessions.length, removed: toDelete.length };
}

// "Opnieuw beginnen bij week 1" (Settings → Training). Only moves where
// week 1 starts — weeks are derived from Program.startDate (CLAUDE.md), so
// every week number, phase and week-in-phase progression target shifts
// with it. Unlike resetScheduleToDefault, nothing already planned is
// deleted or moved (the user's own placement, strength block included) and
// history is untouched. The one thing added: default-pattern sessions for
// weeks inside the new program span that have no sessions at all yet
// (the extra week(s) at the end when week 1 moves later), from today on.
export async function restartProgramAtWeekOne(startFrom: 'this_week' | 'next_week'): Promise<void> {
  const [programs, existingSessions] = await Promise.all([ProgramsRepo.getAll(), PlannedSessionsRepo.getAll()]);
  const program = programs[0];
  if (!program) return;

  const thisMonday = mondayOfWeek(todayISO());
  const newStart = startFrom === 'this_week' ? thisMonday : addDays(thisMonday, 7);
  const templates = await SessionTemplatesRepo.getAll();
  const ctx = await patternContext(templates);
  const next = withPackTarget({ ...program, startDate: newStart, phases: layoutPhases(newStart, ctx.anchor, todayISO(), ctx.overrides) }, ctx.packTarget);
  await ProgramsRepo.put(next);

  const weeksWithSessions = new Set(existingSessions.map((s) => mondayOfWeek(s.scheduledDate)));
  const newSessions = patternSessions(next, templates, ctx.pattern, ctx.swaps, { from: todayISO(), until: ctx.anchor, skipWeek: (w) => weeksWithSessions.has(w) });
  if (newSessions.length > 0) await putAll('plannedSessions', newSessions);
}

// --- the program toward the goal date (Fase 3) --------------------------

interface PatternContext {
  pattern: SessionTemplate[];
  swaps: PatternSwap[];
  anchor: string | undefined;
  overrides: PhaseLengthOverrides | undefined;
  // The main goal's rucksack target, for Program.packTargetKg.
  packTarget: number | undefined;
}

// The program with the pack target of its main goal (or without, when the
// goal has none): the pack ladder reads it from the program.
function withPackTarget(program: Program, kg: number | undefined): Program {
  const { packTargetKg: _old, ...rest } = program;
  void _old;
  return kg === undefined ? rest : { ...rest, packTargetKg: kg };
}

// What a rebuilt week looks like for this user: their sports, the hike
// swaps they allow, and the goal date nothing may be planned on or after.
// `given`: settings and goals as they would be (the preview of a change, before
// anything is stored); without it, as stored.
// The default weekly pattern for the two places that lay out the default
// schedule on their own (a new content version, "Schema opnieuw laden"): the
// templates with a usual weekday, as before. Once you chose the shape of your
// week at the start (AppSettings.weekShape) the pattern is the one of
// weeklyPatternTemplates, so these never bring back the days you left out.
async function defaultPatternSelector(): Promise<((templates: SessionTemplate[]) => SessionTemplate[]) | undefined> {
  const weekShape = parseWeekShape((await SettingsRepo.get()).weekShape);
  return weekShape ? undefined : (all) => all.filter((t) => t.defaultDayOfWeek);
}

async function patternContext(
  templates: SessionTemplate[],
  selectPattern?: (templates: SessionTemplate[]) => SessionTemplate[],
  given?: { settings: AppSettings; goals: TrainingGoal[]; milestones: GoalMilestone[] },
): Promise<PatternContext> {
  const [settings, goals, milestones] = given ? [given.settings, given.goals, given.milestones] : await Promise.all([SettingsRepo.get(), TrainingGoalsRepo.getAll(), GoalMilestonesRepo.getAll()]);
  const enabledSports = { ...DEFAULT_ENABLED_SPORTS, ...settings.enabledSports };
  const pattern = arrangeWeekForRestDay(selectPattern ? selectPattern(templates) : weeklyPatternTemplates(templates, { ...settings, enabledSports }), templates, settings.restDay, parseWeekShape(settings.weekShape)?.allowed);
  return {
    pattern,
    // A hike only replaces a session when the caller's pattern would plan
    // it too (hike templates have no weekday of their own, hence the probe).
    swaps: activeSwaps(templates, settings, (t) => isTemplatePlannable(t, enabledSports) && (!selectPattern || selectPattern([{ ...t, defaultDayOfWeek: 7 }]).length > 0)),
    // The plan ends on the main goal's day, also during and after it.
    anchor: planEndDay(goals, milestones, todayISO(), settings.afterMainGoal),
    overrides: settings.programPhaseOverrides,
    packTarget: programPackTarget(goals, milestones),
  };
}

// The weekly pattern laid over every program week, from `from` on and
// before `until` (the goal day itself stays free).
function patternSessions(
  program: Program,
  templates: SessionTemplate[],
  pattern: SessionTemplate[],
  swaps: PatternSwap[],
  opts: { from: string; until?: string; skipWeek?: (weekStart: string) => boolean; skipSlot?: (templateId: string, date: string) => boolean },
): PlannedSession[] {
  const totalWeeks = program.phases.reduce((sum, p) => sum + p.weekCount, 0);
  const out: PlannedSession[] = [];
  for (let week = 0; week < totalWeeks; week++) {
    const weekStart = addDays(mondayOfWeek(program.startDate), week * 7);
    if (opts.skipWeek?.(weekStart)) continue;
    const phaseId = resolveProgramWeek(program, weekStart)?.phase.id;
    patternForWeek(pattern, templates, swaps, phaseId).forEach(({ template, dayOfWeek }, order) => {
      const date = addDays(weekStart, dayOfWeek - 1);
      if (date < opts.from || (opts.until && date >= opts.until) || opts.skipSlot?.(template.id, date)) return;
      out.push({ id: makeId('planned'), templateId: template.id, scheduledDate: date, weekStartDate: weekStart, status: 'planned', order });
    });
  }
  return out;
}

// Mijlpaal 11 (de volle rugzaktocht) vraagt het rugzakdoel van het doel. Zet
// je dat doel op een ander gewicht, dan gaat de eis mee. Wat je al behaalde
// blijft behaald (engine/gr5Profile.ts#keepClearedMilestones); alleen
// toevoegen of de mijlpaal zelf bijwerken, nooit een behaalde rij aanraken.
async function syncPackMilestone(goals: TrainingGoal[], milestones: GoalMilestone[], logs: SessionLog[]): Promise<void> {
  const goal = programPackGoal(goals, milestones);
  if (!goal) return;
  const update = packMilestoneUpdate(milestones, await GoalMilestoneProgressRepo.byGoal(goal.id), logs, goal.id, packWeightOf(goal.requirements) ?? TENT_PACK_KG);
  if (!update) return;
  for (const row of update.keep) await GoalMilestoneProgressRepo.put(row);
  await GoalMilestonesRepo.put(update.milestone);
}

export interface ProgramHorizonResult {
  phasesChanged: boolean;
  added: number;
  swapped: number;
  removed: number;
  // What the week check put right, and what the sync itself changed in a
  // session that was already stored (a long run that becomes a mountain hike,
  // a session after the goal day that goes), for the notice "Planning
  // bijgewerkt": nothing changes on the plan without being said.
  // before: those sessions just before the check (what undo of the check
  // alone puts back); stored: as they were stored before this run (what
  // undo of the action that caused the run puts back).
  // addedIds: sessions the run put on the plan itself (a walk on a trek day):
  // undo takes those off again.
  repairs?: { lines: string[]; before: PlannedSession[]; stored: PlannedSession[]; addedIds?: string[] };
}

// A change that is not stored yet: the planning run as it would be with it
// (the preview of a proposal with Akkoord, Warden Logica punten 1 en 2).
export interface HorizonOverrides {
  // Settings as they would be (merged over the stored ones).
  settings?: Partial<AppSettings>;
  // Goals as they would be: these rows replace the stored ones with the same id.
  goals?: TrainingGoal[];
  // The plan to start from instead of the stored one (a proposal of its own
  // applied first, like a sport switched off).
  sessions?: PlannedSession[];
  // A proposal shows it: a test or race the system planned on or after the
  // new goal day may go too. Without it (the sync on its own) it stays.
  releaseAnchors?: boolean;
  // The duration registers as they would be with these settings (another
  // ambition): only for the one synchronous planning pass, never on the
  // module (engine/substitutions.ts#withDurationScope).
  registers?: DurationScope;
  // The program as it would be (a rest week trained through, a week repeated,
  // engine/weekLoadChange.ts). Only for a preview; Akkoord stores it first.
  program?: Program;
  // The ladder of a goal that is not stored yet (the first plan): added to the
  // stored milestones, so the preview knows which goal is the main one.
  milestones?: GoalMilestone[];
}

export interface HorizonRun {
  result: ProgramHorizonResult;
  // The plan the run started from, and the plan after it.
  before: PlannedSession[];
  after: PlannedSession[];
  program: Program | null;
  // The day the plan ends (the main goal's day), as the run used it.
  anchor?: string;
}

const dayNL = (iso: string) => `${weekdayShortNL(iso).toLowerCase()} ${formatDateNL(iso)}`;

// Keeps the stored program in line with the main goal's date, on every
// boot and whenever a goal or the related settings change:
// - the phases are counted back from the goal date (taper right before it),
// - weeks of the program that have no sessions at all get the weekly
//   pattern (so there is never an empty week before the goal),
// - planned, unlogged sessions from today on follow their week's phase
//   (long run becomes a mountain hike from Bergcapaciteit on, and back),
// - nothing unlogged stays planned on or after the goal day.
// History is never touched: logged sessions and past days stay as they are.
// What you placed or moved yourself, or an accepted proposal fixed
// (weekValidator.ts#lockLevel 1), is never changed or removed here; a test or
// race only through a proposal. What it does change in a stored session is
// said in the notice. Changing a goal or a setting that moves the plan is a
// proposal first (previewProgramHorizon), so normally the run after it finds
// nothing left to do.
// Idempotent: a second run changes nothing.
export async function syncProgramHorizon(overrides: Pick<HorizonOverrides, 'releaseAnchors'> = {}): Promise<ProgramHorizonResult> {
  return (await runProgramHorizon(false, overrides)).result;
}

// The same run in memory: what the plan would look like with a change that is
// not stored yet. Writes nothing.
export async function previewProgramHorizon(overrides: HorizonOverrides = {}): Promise<HorizonRun> {
  return runProgramHorizon(true, { releaseAnchors: true, ...overrides });
}

async function runProgramHorizon(dryRun: boolean, overrides: HorizonOverrides): Promise<HorizonRun> {
  const [programs, storedSessions, logs, templates, storedSettings, storedGoals, storedMilestones] = await Promise.all([
    ProgramsRepo.getAll(),
    PlannedSessionsRepo.getAll(),
    SessionLogsRepo.getAll(),
    SessionTemplatesRepo.getAll(),
    SettingsRepo.get(),
    TrainingGoalsRepo.getAll(),
    GoalMilestonesRepo.getAll(),
  ]);
  const milestones = overrides.milestones ? [...storedMilestones, ...overrides.milestones.filter((m) => !storedMilestones.some((s) => s.id === m.id))] : storedMilestones;
  const sessions = [...(overrides.sessions ?? storedSessions)];
  const startedFrom = [...sessions];
  const program = overrides.program ?? programs[0];
  if (!program) return { result: { phasesChanged: false, added: 0, swapped: 0, removed: 0 }, before: startedFrom, after: startedFrom, program: null };
  const settings: AppSettings = overrides.settings ? { ...storedSettings, ...overrides.settings } : storedSettings;
  const replaced = new Map((overrides.goals ?? []).map((g) => [g.id, g]));
  const goals = [...storedGoals.map((g) => replaced.get(g.id) ?? g), ...[...replaced.values()].filter((g) => !storedGoals.some((s) => s.id === g.id))];
  const today = todayISO();
  const ctx = await patternContext(templates, undefined, { settings, goals, milestones });
  const next: Program = withPackTarget({ ...program, phases: layoutPhases(program.startDate, ctx.anchor, today, ctx.overrides) }, ctx.packTarget);
  const phasesChanged = JSON.stringify(program.phases) !== JSON.stringify(next.phases);
  // The pack target of the goal travels with the phases (the ladder of the
  // hikes reads it from the program).
  if (!dryRun && (phasesChanged || program.packTargetKg !== next.packTargetKg)) await ProgramsRepo.put(next);

  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const proposals = await PlanChangeProposalsRepo.getAll();
  // Tochtdagen an older version left behind as skipped rows when a tocht was
  // changed or removed (engine/leaveStrays.ts): off the plan, never a logged one.
  const strays = new Set(strayTrekRows(sessions, proposals, logs));
  if (strays.size > 0) {
    if (!dryRun) for (const id of strays) await PlannedSessionsRepo.delete(id);
    sessions.splice(0, sessions.length, ...sessions.filter((s) => !strays.has(s.id)));
  }
  // Test runs the weekly prescription wrongly took out come back first.
  const revived = revivePrescriptionRemovedTests(sessions, proposals, logged, today);
  if (revived.length > 0) {
    if (!dryRun) for (const r of revived) await PlannedSessionsRepo.put(r);
    const byId = new Map(revived.map((r) => [r.id, r]));
    sessions.splice(0, sessions.length, ...sessions.map((s) => byId.get(s.id) ?? s));
  }
  const open = (s: PlannedSession) => s.scheduledDate >= today && !logged.has(s.id);
  // Who may touch it (weekValidator.ts#lockLevel): yours never, a test or race
  // only when a proposal shows it.
  const mayGo = (s: PlannedSession) => { const level = lockLevel(s, logged, today); return level === 3 || (level === 2 && !!overrides.releaseAnchors); };
  // A row you skipped yourself is yours too (lockLevel 1): it stays, like
  // everything else you set (Warden Planning punt 10).
  const toRemove = ctx.anchor ? sessions.filter((s) => open(s) && s.scheduledDate >= ctx.anchor! && (s.status === 'skipped' ? lockLevel(s, logged, today) !== 1 : mayGo(s))) : [];
  const removedIds = new Set(toRemove.map((s) => s.id));

  const swapped: PlannedSession[] = [];
  const templateIds = new Set(templates.map((t) => t.id));
  for (const s of sessions) {
    // A walk a period of yours put on the plan (engine/leaveBlock.ts) is not a pattern session.
    if (!open(s) || removedIds.has(s.id) || s.status === 'skipped' || s.leave) continue;
    const target = templateForPhase(s.templateId, ctx.swaps, resolveProgramWeek(next, s.scheduledDate)?.phase.id, lockLevel(s, logged, today));
    if (target !== s.templateId && templateIds.has(target)) swapped.push({ ...s, templateId: target });
  }

  // Your rest day changed: every session the system planned goes to the day
  // its place in the week has in the new spread, by that place, not by its
  // template: a tempo run or test goes with the easy run, the mountain hike
  // with the long run (docs/onderzoek/Planning op een lijn.md, conflict 4).
  // A leg swap of the race block is laid out fresh; the race block below
  // makes it again where it is still needed. What you moved or skipped
  // yourself, logged sessions and anything an accepted proposal fixed stay
  // where they are. Only at the change itself.
  const appliedRestDay = (await MetaRepo.get<number>('appliedRestDay')) ?? 1;
  const wantedRestDay = settings.restDay ?? 1;
  // Normally the rest day is laid out by its own proposal with Akkoord
  // (engine/restDayProposal.ts), which stores appliedRestDay with it; this is
  // only for a rest day stored some other way (older data).
  if (appliedRestDay !== wantedRestDay) {
    const swappedById = new Map(swapped.map((x) => [x.id, x]));
    const current = sessions.filter((s) => !removedIds.has(s.id)).map((s) => swappedById.get(s.id) ?? s);
    for (const fresh of relayoutForRestDay(current, { today, anchor: ctx.anchor, logged, slotDays: patternDays(templates, settings, wantedRestDay) })) swappedById.set(fresh.id, fresh);
    swapped.splice(0, swapped.length, ...swappedById.values());
    if (!dryRun) await MetaRepo.set('appliedRestDay', wantedRestDay);
  }

  const weeksWithSessions = new Set(sessions.filter((s) => !removedIds.has(s.id)).map((s) => mondayOfWeek(s.scheduledDate)));
  const added = patternSessions(next, templates, ctx.pattern, ctx.swaps, {
    from: today,
    until: ctx.anchor ?? programEndDate(next),
    skipWeek: (w) => weeksWithSessions.has(w) || addDays(w, 6) < today,
  });

  // A running race before the main goal: its own block (engine/raceBlock.ts).
  if (!dryRun) await syncPackMilestone(goals, milestones, logs);
  const ladder = new Set(milestones.map((m) => m.goalId));
  const mainGoalId = goals.find((g) => g.status === 'active' && ladder.has(g.id))?.id;
  const blocks = raceBlocks(goals, mainGoalId, ctx.anchor, today);
  // The plan as it will be after the steps above, then the last two steps:
  // the race block and the week check (engine/planPass.ts, the same pass a
  // proposal is previewed with). The week check repairs only what the
  // system planned, and says so.
  const pending = new Map<string, PlannedSession>([...swapped, ...added].map((x) => [x.id, x]));
  const removedNow = new Set(toRemove.map((r) => r.id));
  const stored = new Map(sessions.map((s) => [s.id, s]));
  const asWillBe = [
    ...sessions.filter((s) => !removedNow.has(s.id)).map((s) => pending.get(s.id) ?? s),
    ...added,
  ];
  const engineConfig = await GoalEngineConfigRepo.get();
  const restDay = settings.restDay ?? 1;
  const pass = withDurationScope(overrides.registers, () => planPass(asWillBe, {
    today, logs, templates, program: next, blocks, restDay, goalDay: ctx.anchor,
    dailyTimeBudget: engineConfig.availability.dailyTimeBudget, sameDayPairingPreference: engineConfig.strategy.sameDayPairingPreference,
    slotDays: patternDays(templates, settings, restDay),
    minutesOf: (s, t) => resolveVariantDuration(t, 'full', s.scheduledDate, next),
    newId: () => makeId('planned'),
    leave: settings.leavePeriods, hikingEnabled: isSportEnabled('hiking', settings.enabledSports), trekRest: settings.trekLegRest,
  }));
  if (!dryRun && pass.remaining.length > 0) console.info('Weekcontrole:', pass.remaining.map((f) => `${f.rule} ${f.date}: ${f.message}`));

  // Write only what differs from what is stored.
  const resultIds = new Set(pass.sessions.map((s) => s.id));
  const writes = pass.sessions.filter((s) => { const was = stored.get(s.id); return !was || JSON.stringify(was) !== JSON.stringify(s); });
  for (const s of sessions) if (!removedNow.has(s.id) && !resultIds.has(s.id)) toRemove.push(s);

  if (!dryRun && toRemove.length + writes.length > 0) await replacePlannedSessions(toRemove, writes);
  const byTemplate = new Map(templates.map((t) => [t.id, t.name]));
  // Only what you would notice: a session that was never stored and is let go
  // again in the same run (a pattern week inside a holiday) is not news.
  const shown = pass.repairs.filter(visibleRepair).filter((r) => !(r.removed && !stored.has(r.sessionId)));
  const nameOf = (id: string) => byTemplate.get((stored.get(id) ?? asWillBe.find((s) => s.id === id) ?? pass.sessions.find((s) => s.id === id))?.templateId ?? '') ?? 'Training';
  const addedIds = [...new Set(shown.filter((r) => r.added).map((r) => r.sessionId))].filter((id) => resultIds.has(id));
  // What the sync itself changed in a stored session: said too, never silent.
  const ownLines: string[] = [];
  const ownIds: string[] = [];
  for (const s of swapped) {
    const was = stored.get(s.id);
    if (!was || was.templateId === s.templateId) continue;
    ownLines.push(`${byTemplate.get(was.templateId) ?? 'Training'} op ${dayNL(was.scheduledDate)} wordt ${byTemplate.get(s.templateId) ?? 'een andere training'} (past bij de fase van die week)`);
    ownIds.push(s.id);
  }
  for (const s of toRemove) {
    if (!removedNow.has(s.id) || s.status === 'skipped') continue;
    ownLines.push(`${byTemplate.get(s.templateId) ?? 'Training'} op ${dayNL(s.scheduledDate)} vervalt (na de dag van je hoofddoel plant ASCEND niets meer)`);
    ownIds.push(s.id);
  }
  // A skipped row of the system that goes is not news on its own, but undo of
  // the notice puts it back with the rest.
  for (const s of toRemove) if (removedNow.has(s.id) && s.status === 'skipped' && stored.has(s.id)) ownIds.push(s.id);
  const repairedIds = [...new Set([...ownIds, ...shown.map((r) => r.sessionId)])].filter((id) => !addedIds.includes(id));
  const beforeCheck = new Map(pass.beforeCheck.map((s) => [s.id, s]));
  const lines = [...ownLines, ...shown.map((r) => describeRepair(r, nameOf(r.sessionId)))];
  const repairs = lines.length === 0 ? undefined : {
    lines,
    before: repairedIds.map((id) => beforeCheck.get(id) ?? stored.get(id)).filter((s): s is PlannedSession => !!s),
    stored: repairedIds.map((id) => stored.get(id) ?? beforeCheck.get(id)).filter((s): s is PlannedSession => !!s),
    ...(addedIds.length > 0 ? { addedIds } : {}),
  };
  const newCount = writes.filter((w) => !stored.has(w.id)).length;
  const removedFinal = new Set(toRemove.map((s) => s.id));
  return {
    result: { phasesChanged, added: newCount, swapped: writes.length - newCount, removed: toRemove.length, repairs },
    before: startedFrom,
    after: pass.sessions.filter((s) => !removedFinal.has(s.id)),
    program: next,
    anchor: ctx.anchor,
  };
}


// --- atomic multi-store backup writes -----------------------------------

// One write set per store: `clear` wipes the store before `puts` are
// written (used for a 'replace' category action), omitted entirely means
// "don't touch this store at all" (a 'keep_current' or 'ignore' category
// action, or a category not part of this import). `puts` alone with
// `clear: false` is a merge — existing rows stay, these are added/overwrite
// by id.
//
// Real IndexedDB constraint this exists to satisfy: a transaction
// auto-closes the moment an unrelated promise is awaited inside it. So this
// function assumes every decision (what to add, what conflicts, what the
// final settings object should be) was already made by the caller — it only
// ever issues synchronous store calls before `tx.done`, never anything that
// awaits outside the transaction's own operations.
export interface BackupStoreWrite<T> {
  clear: boolean;
  puts: T[];
}

export interface BackupWriteSet {
  programs?: BackupStoreWrite<Program>;
  sessionTemplates?: BackupStoreWrite<SessionTemplate>;
  plannedSessions?: BackupStoreWrite<PlannedSession>;
  sessionLogs?: BackupStoreWrite<SessionLog>;
  trainingGoals?: BackupStoreWrite<TrainingGoal>;
  goalMilestones?: BackupStoreWrite<GoalMilestone>;
  goalMilestoneProgress?: BackupStoreWrite<GoalMilestoneProgress>;
  capabilityEvidence?: BackupStoreWrite<CapabilityEvidence>;
  injuryNotes?: BackupStoreWrite<InjuryNote>;
  planChangeProposals?: BackupStoreWrite<PlanChangeProposal>;
  strengthProgramStrategies?: BackupStoreWrite<StrengthProgramStrategy>;
  strengthProgramRecommendations?: BackupStoreWrite<StrengthProgramRecommendation>;
  settings?: AppSettings;
  // Other meta keys (goalEngineConfig, adviceResponses), written as-is.
  meta?: Record<string, unknown>;
}

export async function applyBackupWrites(writes: BackupWriteSet): Promise<void> {
  const db = await getDB();
  const storeNames = (Object.keys(writes) as (keyof BackupWriteSet)[])
    .filter((k) => writes[k] !== undefined)
    .map((k) => (k === 'settings' ? 'meta' : k))
    // 'settings' collapses onto 'meta' — dedupe in case both were present.
    .filter((v, i, arr) => arr.indexOf(v) === i);
  if (storeNames.length === 0) return;
  // Put-back data has not been through the opening steps yet: forget that they
  // ran, so the next opening runs them over it (storage/bootMigrations.ts).
  if (!storeNames.includes('meta')) storeNames.push('meta');

  const tx = db.transaction(storeNames, 'readwrite');
  const ops: Promise<unknown>[] = [];

  for (const key of ['programs', 'sessionTemplates', 'plannedSessions', 'sessionLogs', 'trainingGoals', 'goalMilestones', 'goalMilestoneProgress', 'capabilityEvidence', 'injuryNotes', 'planChangeProposals', 'strengthProgramStrategies', 'strengthProgramRecommendations'] as const) {
    const write = writes[key];
    if (!write) continue;
    const store = tx.objectStore(key);
    if (write.clear) ops.push(store.clear());
    for (const value of write.puts) ops.push(store.put((key === 'plannedSessions' ? withDerivedWeek(value as PlannedSession) : value) as never));
  }

  if (writes.settings) {
    ops.push(tx.objectStore('meta').put(writes.settings, 'settings'));
    // The plan in the backup was laid out for its own rest day: restored
    // together, that rest day is already applied, so the sync doesn't lay
    // the week out again (docs/onderzoek/Planning op een lijn.md, conflict 16).
    if (writes.plannedSessions?.clear) ops.push(tx.objectStore('meta').put(writes.settings.restDay ?? 1, 'appliedRestDay'));
  }
  for (const [key, value] of Object.entries(writes.meta ?? {})) {
    ops.push(tx.objectStore('meta').put(value, key));
  }
  ops.push(tx.objectStore('meta').delete(BOOT_MIGRATIONS_KEY));

  await Promise.all([...ops, tx.done]);
}

export async function wipeAllData(): Promise<void> {
  await Promise.all([
    clearStore('programs'),
    clearStore('sessionTemplates'),
    clearStore('plannedSessions'),
    clearStore('sessionLogs'),
    clearStore('objectives'),
    clearStore('milestoneProgress'),
    clearStore('recoveryMetrics'),
    clearStore('bodyMetrics'),
    clearStore('nutritionMetrics'),
    clearStore('injuryNotes'),
    clearStore('trainingGoals'),
    clearStore('goalMilestones'),
    clearStore('goalMilestoneProgress'),
    clearStore('trainingPrescriptions'),
    clearStore('capabilityEvidence'),
    clearStore('planChangeProposals'),
    clearStore('strengthProgramStrategies'),
    clearStore('strengthProgramRecommendations'),
    clearStore('weeklyPrescriptions'),
    clearStore('meta'),
  ]);
}

// Repair for production feedback "hoe kan het dat in opkomende weken de
// lange duurloop een kruis krijgt?": the weekly prescription used to take
// a session of the weekly pattern (Lange Duurloop) out of upcoming weeks
// and put another candidate (Bergconditie) in. It no longer does
// (engine/weeklyPrescriptionEngine.ts); this restores what it removed,
// from today on, and drops the sessions it added in those same weeks — the
// next prescription run re-adds anything still genuinely needed.
// Idempotent: a restored session is no longer skipped, so a second run
// finds nothing to do. Logged sessions and past days are never touched.
export async function restorePatternSessionsRemovedByPrescription(): Promise<number> {
  // One-time repair. Running it on every start used to put a session the
  // user later skipped on purpose straight back into the planning.
  let restoredCount = 0;
  if (!(await MetaRepo.get<boolean>('patternRestoreDone'))) {
    restoredCount += await restorePatternSessionsOnce((t) => t?.defaultDayOfWeek !== undefined);
    await MetaRepo.set('patternRestoreDone', true);
  }
  // Second repair (docs/onderzoek/Planning op een lijn.md, conflict 1): the
  // prescription also took out sessions that fill a pattern slot without a
  // fixed weekday of their own: the tempo runs and intervals of the race
  // block, the mountain hikes of Expeditieklaar. Back they come, and the
  // skipped copies of the race left by an older bug go.
  if (!(await MetaRepo.get<boolean>('slotRestoreDone'))) {
    restoredCount += await restorePatternSessionsOnce((t, id) => !!t && (t.defaultDayOfWeek !== undefined || patternSlotOf(id) !== id) && id !== 'tpl_test_run');
    await removeSkippedRaceCopies();
    await MetaRepo.set('slotRestoreDone', true);
  }
  return restoredCount;
}

// Skipped rows of the race on a day that has an open race: copies, never
// logged, nothing to keep.
async function removeSkippedRaceCopies(): Promise<void> {
  const [sessions, logs] = await Promise.all([PlannedSessionsRepo.getAll(), SessionLogsRepo.getAll()]);
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const openRaceDays = new Set(sessions.filter((s) => s.templateId === 'tpl_race' && s.status !== 'skipped').map((s) => s.scheduledDate));
  for (const s of sessions) {
    if (s.templateId === 'tpl_race' && s.status === 'skipped' && !logged.has(s.id) && openRaceDays.has(s.scheduledDate)) await PlannedSessionsRepo.delete(s.id);
  }
}

async function restorePatternSessionsOnce(isPatternTemplate: (template: SessionTemplate | undefined, templateId: string) => boolean): Promise<number> {
  const [proposals, sessions, logs, templates, settings] = await Promise.all([
    PlanChangeProposalsRepo.getAll(),
    PlannedSessionsRepo.getAll(),
    SessionLogsRepo.getAll(),
    SessionTemplatesRepo.getAll(),
    SettingsRepo.get(),
  ]);
  const today = todayISO();
  // A restored session goes to its slot's day as the week is now: the rest
  // day may have changed while it was out.
  const slotDays = patternDays(templates, settings, settings.restDay ?? 1);
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const byId = new Map(sessions.map((s) => [s.id, s]));
  const fromPrescription = (generatedBy: string[] | undefined) => (generatedBy ?? []).some((g) => g.startsWith('engine/weeklyPrescriptionEngine'));
  const isPattern = (templateId: string) => isPatternTemplate(templateById.get(templateId), templateId);
  let restored = 0;

  for (const proposal of proposals) {
    if (proposal.trigger !== 'weekly_prescription_computed' || proposal.resolution !== 'accepted') continue;
    const restoredWeeks = new Set<string>();
    for (const item of proposal.changes) {
      if (item.action !== 'remove' || !item.plannedSessionId || !fromPrescription(item.generatedBy)) continue;
      const session = byId.get(item.plannedSessionId);
      if (!session || session.status !== 'skipped' || logged.has(session.id) || session.scheduledDate < today || !isPattern(session.templateId)) continue;
      const slotDay = slotDays.get(patternSlotOf(session.templateId));
      const onSlot = slotDay ? addDays(mondayOfWeek(session.scheduledDate), slotDay - 1) : session.scheduledDate;
      const back: PlannedSession = { ...session, status: 'planned', ...(onSlot >= today ? { scheduledDate: onSlot } : {}) };
      await PlannedSessionsRepo.put(back);
      byId.set(back.id, back);
      restoredWeeks.add(session.weekStartDate);
      restored++;
    }
    for (const item of proposal.changes) {
      const draft = item.newSessionDraft;
      if (item.action !== 'add' || !draft || !restoredWeeks.has(draft.weekStartDate) || !fromPrescription(item.generatedBy) || isPattern(draft.templateId)) continue;
      const added = [...byId.values()].find((s) => s.templateId === draft.templateId && s.scheduledDate === draft.scheduledDate && s.weekStartDate === draft.weekStartDate && s.status !== 'skipped' && !logged.has(s.id));
      if (!added || added.scheduledDate < today) continue;
      await PlannedSessionsRepo.delete(added.id);
      byId.delete(added.id);
    }
  }
  return restored;
}
