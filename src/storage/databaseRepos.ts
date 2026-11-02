// Algemene hulpjes en de repo per store.

import type { Program } from '../models/program';
import type { SessionTemplate, PlannedSession, SessionLog } from '../models/training';
import type { Objective, MilestoneProgress } from '../models/objectives';
import type { RecoveryMetric } from '../models/metrics';
import type { InjuryNote } from '../models/injury';
import type { TrainingGoal, GoalMilestone, GoalMilestoneProgress } from '../models/goals';
import type { TrainingPrescription } from '../models/prescription';
import type { PlanChangeProposal } from '../models/planChange';
import type { StrengthProgramStrategy, StrengthProgramRecommendation } from '../models/strengthProgram';
import type { WeeklyPrescription } from '../models/weeklyPrescription';
import type { GoalEngineConfig } from '../models/goalEngineConfig';
import { DEFAULT_GOAL_ENGINE_CONFIG } from '../models/goalEngineConfig';
import type { CapabilityEvidence } from '../models/capability';
import type { PreImportSnapshot } from './backupTypes';
import type { ActivityStreams } from '../models/activityStreams';
import { mondayOfWeek } from '../utils/dates';
import { streamsBytes } from '../engine/streamPack';
import { type AscendDB, getDB } from './databaseSchema';

// --- generic helpers -------------------------------------------------------

async function getAll<K extends keyof AscendDB>(store: K) {
  const db = await getDB();
  // @ts-expect-error — generic store name, value shape narrowed by caller
  return db.getAll(store);
}

export async function putAll<K extends keyof AscendDB>(store: K, values: unknown[]) {
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

export async function clearStore<K extends keyof AscendDB>(store: K) {
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
  // A log that goes takes its series with it.
  delete: async (id: string) => {
    const db = await getDB();
    const tx = db.transaction(['sessionLogs', 'activityStreams'], 'readwrite');
    await Promise.all([tx.objectStore('sessionLogs').delete(id), tx.objectStore('activityStreams').delete(id), tx.done]);
  },
};

// The full series of runs and tochten (models/activityStreams.ts). Reading everything at once
// is for the backup and the size; the screens read one log's series by its id.
export const ActivityStreamsRepo = {
  get: async (logId: string) => (await getDB()).get('activityStreams', logId),
  getAll: () => getAll('activityStreams') as Promise<ActivityStreams[]>,
  keys: async () => (await getDB()).getAllKeys('activityStreams') as Promise<string[]>,
  put: (s: ActivityStreams) => put('activityStreams', s),
  delete: (logId: string) => del('activityStreams', logId),
  clear: () => clearStore('activityStreams'),
  // The bytes the series take, counted one row at a time so the whole store is never in memory.
  totalBytes: async () => {
    const db = await getDB();
    let total = 0;
    let rows = 0;
    let cursor = await db.transaction('activityStreams').store.openCursor();
    while (cursor) {
      total += streamsBytes(cursor.value);
      rows++;
      cursor = await cursor.continue();
    }
    return { bytes: total, rows };
  },
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
  // In één readwrite-transactie: alles of niets (storage/morningArchive.ts).
  deleteMany: async (ids: readonly string[]) => {
    if (ids.length === 0) return;
    const db = await getDB();
    const tx = db.transaction('recoveryMetrics', 'readwrite');
    const done = tx.done;
    done.catch(() => undefined);
    const requests: Promise<unknown>[] = [];
    try {
      for (const id of ids) {
        const request = tx.store.delete(id);
        request.catch(() => undefined);
        requests.push(request);
      }
      await Promise.all(requests);
    } catch (err) {
      // Een fout halverwege: de hele transactie terug, ook wat al gewist was.
      try {
        tx.abort();
      } catch {
        // Al afgebroken.
      }
      throw err;
    }
    await done;
  },
};

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

// Delete-then-add in one transaction: an app closed halfway used to leave
// the future with no planning at all.
export async function replacePlannedSessions(toDelete: PlannedSession[], toAdd: PlannedSession[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('plannedSessions', 'readwrite');
  await Promise.all([
    ...toDelete.map((s) => tx.store.delete(s.id)),
    ...toAdd.map((s) => tx.store.put(withDerivedWeek(s))),
    tx.done,
  ]);
}
