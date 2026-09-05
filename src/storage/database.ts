import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Program } from '../models/program';
import type { SessionTemplate, PlannedSession, SessionLog } from '../models/training';
import type { Objective, MilestoneProgress } from '../models/objectives';
import type { RecoveryMetric, BodyMetric, NutritionMetric } from '../models/metrics';
import type { InjuryNote } from '../models/injury';
import type { PreImportSnapshot } from './backupTypes';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { addDays, mondayOfWeek, todayISO } from '../utils/dates';
import { makeId } from '../utils/id';

export const SCHEMA_VERSION = 1;
const DB_NAME = 'ascend-db';
const DB_VERSION = 3;

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
  injuryNotes: { key: string; value: InjuryNote };
  // Snapshots taken automatically right before an import is applied — see
  // storage/backupImport.ts. A separate store (not reused for anything else)
  // specifically so the import transaction itself can never overwrite the
  // one copy that would let a bad import be undone.
  backupSnapshots: { key: string; value: PreImportSnapshot };
}

let dbPromise: Promise<IDBPDatabase<AscendDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<AscendDB>> {
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

export const InjuryNotesRepo = {
  getAll: () => getAll('injuryNotes') as Promise<InjuryNote[]>,
  put: (n: InjuryNote) => put('injuryNotes', n),
  delete: (id: string) => del('injuryNotes', id),
};

export const BackupSnapshotsRepo = {
  getAll: () => getAll('backupSnapshots') as Promise<PreImportSnapshot[]>,
  put: (s: PreImportSnapshot) => put('backupSnapshots', s),
  delete: (id: string) => del('backupSnapshots', id),
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
  // Marathon goal — deliberately not a second Objective/MilestoneDefinition
  // ladder (several screens assume objectives[0] is "the" objective); a
  // standalone settings-backed goal instead, mirroring the GR5 card's UI.
  // undefined raceType means the goal card is hidden/not yet set up.
  marathonRaceType?: 'half' | 'full';
  marathonTargetDate?: string; // ISO date
  marathonTargetTimeMinutes?: number;
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
  await MetaRepo.set('scheduleVersion', SCHEDULE_CONTENT_VERSION);
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
const SCHEDULE_CONTENT_VERSION = 2;

// One-time correction for exactly the fragmentation v1 could cause (see
// above): a week where tpl_upper_a appears twice — once on its old Monday
// slot (already scheduled/logged before v1 ran) and once on its new Friday
// slot (written by v1, since Friday fell after v1's same-day cutoff) — with
// tpl_hill_intervals/tpl_long_run also freshly written into that week's
// Saturday/Sunday. Reverts just those three still-unlogged sessions back to
// the old Friday/Saturday/Sunday templates (Bergconditie/Lower B/Herstel),
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

  const totalWeeks = program.phases.reduce((sum, p) => sum + p.weekCount, 0);
  const templatesWithDay = templates.filter((t) => t.defaultDayOfWeek);
  const newSessions: PlannedSession[] = [];
  for (let week = 0; week < totalWeeks; week++) {
    const weekStart = addDays(program.startDate, week * 7);
    templatesWithDay.forEach((t, order) => {
      const date = addDays(weekStart, (t.defaultDayOfWeek as number) - 1);
      if (date < cutoff) return;
      newSessions.push({
        id: makeId('planned'),
        templateId: t.id,
        scheduledDate: date,
        weekStartDate: weekStart,
        status: 'planned',
        order,
      });
    });
  }
  await putAll('plannedSessions', newSessions);

  await MetaRepo.set('scheduleVersion', SCHEDULE_CONTENT_VERSION);
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
  ]);
  await MetaRepo.set('seeded', false);
  await seedIfEmpty();
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
  objectives?: BackupStoreWrite<Objective>;
  milestoneProgress?: BackupStoreWrite<MilestoneProgress>;
  injuryNotes?: BackupStoreWrite<InjuryNote>;
  settings?: AppSettings;
}

export async function applyBackupWrites(writes: BackupWriteSet): Promise<void> {
  const db = await getDB();
  const storeNames = (Object.keys(writes) as (keyof BackupWriteSet)[])
    .filter((k) => writes[k] !== undefined)
    .map((k) => (k === 'settings' ? 'meta' : k))
    // 'settings' collapses onto 'meta' — dedupe in case both were present.
    .filter((v, i, arr) => arr.indexOf(v) === i);
  if (storeNames.length === 0) return;

  const tx = db.transaction(storeNames, 'readwrite');
  const ops: Promise<unknown>[] = [];

  for (const key of ['programs', 'sessionTemplates', 'plannedSessions', 'sessionLogs', 'objectives', 'milestoneProgress', 'injuryNotes'] as const) {
    const write = writes[key];
    if (!write) continue;
    const store = tx.objectStore(key);
    if (write.clear) ops.push(store.clear());
    for (const value of write.puts) ops.push(store.put(value as never));
  }

  if (writes.settings) {
    ops.push(tx.objectStore('meta').put(writes.settings, 'settings'));
  }

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
    clearStore('meta'),
  ]);
}
