import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Program } from '../models/program';
import type { SessionTemplate, PlannedSession, SessionLog } from '../models/training';
import type { Objective, MilestoneProgress } from '../models/objectives';
import type { RecoveryMetric, BodyMetric, NutritionMetric } from '../models/metrics';
import { buildDefaultProgramData } from '../data/defaultProgram';

export const SCHEMA_VERSION = 1;
const DB_NAME = 'ascend-db';
const DB_VERSION = 1;

interface AscendDB extends DBSchema {
  meta: { key: string; value: unknown };
  programs: { key: string; value: Program };
  sessionTemplates: { key: string; value: SessionTemplate };
  plannedSessions: { key: string; value: PlannedSession; indexes: { 'by-week': string; 'by-date': string } };
  sessionLogs: { key: string; value: SessionLog; indexes: { 'by-date': string } };
  objectives: { key: string; value: Objective };
  milestoneProgress: { key: string; value: MilestoneProgress; indexes: { 'by-objective': string } };
  recoveryMetrics: { key: string; value: RecoveryMetric };
  bodyMetrics: { key: string; value: BodyMetric };
  nutritionMetrics: { key: string; value: NutritionMetric };
}

let dbPromise: Promise<IDBPDatabase<AscendDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<AscendDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AscendDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('meta');
        db.createObjectStore('programs', { keyPath: 'id' });
        db.createObjectStore('sessionTemplates', { keyPath: 'id' });
        const planned = db.createObjectStore('plannedSessions', { keyPath: 'id' });
        planned.createIndex('by-week', 'weekStartDate');
        planned.createIndex('by-date', 'scheduledDate');
        const logs = db.createObjectStore('sessionLogs', { keyPath: 'id' });
        logs.createIndex('by-date', 'completedDate');
        db.createObjectStore('objectives', { keyPath: 'id' });
        const progress = db.createObjectStore('milestoneProgress', { keyPath: 'id' });
        progress.createIndex('by-objective', 'objectiveId');
        db.createObjectStore('recoveryMetrics', { keyPath: 'id' });
        db.createObjectStore('bodyMetrics', { keyPath: 'id' });
        db.createObjectStore('nutritionMetrics', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
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
  await Promise.all([...values.map((v) => tx.store.put(v as never)), tx.done]);
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
};

export const SessionTemplatesRepo = {
  getAll: () => getAll('sessionTemplates') as Promise<SessionTemplate[]>,
  put: (t: SessionTemplate) => put('sessionTemplates', t),
};

export const PlannedSessionsRepo = {
  getAll: () => getAll('plannedSessions') as Promise<PlannedSession[]>,
  put: (s: PlannedSession) => put('plannedSessions', s),
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

export const RecoveryMetricsRepo = { getAll: () => getAll('recoveryMetrics') as Promise<RecoveryMetric[]> };
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
}

export const DEFAULT_SETTINGS: AppSettings = {
  strengthTrackedExternally: false,
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

export async function seedIfEmpty(): Promise<void> {
  const seeded = await MetaRepo.get<boolean>('seeded');
  if (seeded) return;

  const { program, templates, plannedSessions, objectives, sessionLogs, milestoneProgress } = buildDefaultProgramData();
  await ProgramsRepo.put(program);
  await putAll('sessionTemplates', templates);
  await putAll('plannedSessions', plannedSessions);
  await putAll('objectives', objectives);
  await putAll('sessionLogs', sessionLogs);
  await putAll('milestoneProgress', milestoneProgress);
  await MetaRepo.set('seeded', true);
  await MetaRepo.set('schemaVersion', SCHEMA_VERSION);
  await MetaRepo.set('gr5LadderVersion', GR5_LADDER_CONTENT_VERSION);
}

// The GR5 ladder (Objective + MilestoneDefinitions) is static content, not
// historical data — unlike MilestoneProgress/SessionLog it's safe to
// overwrite in place when the copy improves. Bump this when
// buildObjective() in data/defaultProgram.ts changes, so an already-seeded
// device picks up the new ladder once instead of staying stuck on whatever
// content existed the day it was first opened. Milestone ids are
// order-based (`obj_gr5_m{order}`); reordering is safe here because
// non-manual milestones aren't referenced by id in MilestoneProgress at
// all (their status is recomputed live from logs), and the two 'manual'
// milestones keep the same order position across this content revision.
const GR5_LADDER_CONTENT_VERSION = 2;

export async function syncObjectiveDefinitions(): Promise<void> {
  const version = await MetaRepo.get<number>('gr5LadderVersion');
  if (version === GR5_LADDER_CONTENT_VERSION) return;
  const { objectives } = buildDefaultProgramData();
  for (const objective of objectives) {
    await ObjectivesRepo.put(objective);
  }
  await MetaRepo.set('gr5LadderVersion', GR5_LADDER_CONTENT_VERSION);
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
  ]);
  await MetaRepo.set('seeded', false);
  await seedIfEmpty();
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
    clearStore('meta'),
  ]);
}
