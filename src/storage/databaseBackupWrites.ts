// Een back-up in een keer schrijven, en alles wissen.

import type { Program } from '../models/program';
import type { SessionTemplate, PlannedSession, SessionLog } from '../models/training';
import type { RecoveryMetric } from '../models/metrics';
import type { InjuryNote } from '../models/injury';
import type { TrainingGoal, GoalMilestone, GoalMilestoneProgress } from '../models/goals';
import type { PlanChangeProposal } from '../models/planChange';
import type { StrengthProgramStrategy, StrengthProgramRecommendation } from '../models/strengthProgram';
import type { CapabilityEvidence } from '../models/capability';
import type { ActivityStreams } from '../models/activityStreams';
import { BOOT_MIGRATIONS_KEY } from '../engine/bootWatch';
import type { AppSettings } from './databaseSettings';
import { getDB } from './databaseSchema';
import { withDerivedWeek } from './databaseRepos';

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
  // Only rows whose key the store does not have yet, looked up inside this
  // transaction: for history (logs, milestone progress, audit trails, series,
  // mornings), which a backup only ever adds to. What the device wrote since
  // the preview read it (a trim, a link afterwards, a resolved proposal) is
  // never overwritten by the copy in the file.
  onlyNew?: boolean;
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
  // The full series that came with a backup (only those the device does not have yet).
  activityStreams?: BackupStoreWrite<ActivityStreams>;
  // The mornings that came with a backup (only those the device does not have yet).
  recoveryMetrics?: BackupStoreWrite<RecoveryMetric>;
  // A value is written as it is; a function gets what is stored at the moment of writing,
  // read in this transaction, and returns what to write. An import passes a function for
  // whatever it merges with the device (the history lists in settings, the skill goals,
  // routes): something saved between the preview and Akkoord then stays.
  settings?: AppSettings | MetaChange<AppSettings>;
  // Other meta keys (goalEngineConfig, adviceResponses), a value or a function as above.
  meta?: Record<string, unknown>;
}

export type MetaChange<T> = (stored: unknown) => T;

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
  // All or nothing: a put that throws (a value that cannot be stored) must not
  // leave the writes queued before it to commit on their own.
  const abort = () => {
    try {
      tx.abort();
    } catch {
      // Al afgebroken of al klaar.
    }
  };

  try {
    for (const key of ['programs', 'sessionTemplates', 'plannedSessions', 'sessionLogs', 'trainingGoals', 'goalMilestones', 'goalMilestoneProgress', 'capabilityEvidence', 'injuryNotes', 'planChangeProposals', 'strengthProgramStrategies', 'strengthProgramRecommendations', 'activityStreams', 'recoveryMetrics'] as const) {
      const write = writes[key];
      if (!write) continue;
      const store = tx.objectStore(key);
      if (write.clear) ops.push(store.clear());
      const keyPath = store.keyPath as string;
      for (const raw of write.puts) {
        const value = (key === 'plannedSessions' ? withDerivedWeek(raw as PlannedSession) : raw) as never;
        if (!write.clear && write.onlyNew && key === 'goalMilestoneProgress') {
          // One line per milestone: also not next to a line with another id (storage/milestoneClearing.ts).
          const row = value as GoalMilestoneProgress;
          const progress = tx.objectStore('goalMilestoneProgress');
          ops.push(Promise.all([progress.getKey(row.id), progress.index('by-goal').getAll(row.goalId)])
            .then(([have, ofGoal]) => (have === undefined && !ofGoal.some((p) => p.milestoneId === row.milestoneId) ? progress.put(row) : undefined)));
        } else if (!write.clear && write.onlyNew) {
          const id = (value as Record<string, string>)[keyPath];
          ops.push(store.getKey(id).then((have) => (have === undefined ? store.put(value) : undefined)));
        } else {
          ops.push(store.put(value));
        }
      }
    }

    const metaStore = tx.objectStore('meta');
    // A function reads the stored value inside this transaction and writes what it returns.
    const writeMeta = <T,>(key: string, value: T | MetaChange<T>, also?: (written: T) => Promise<unknown> | undefined) => {
      if (typeof value !== 'function') {
        ops.push(metaStore.put(value, key));
        const extra = also?.(value);
        if (extra) ops.push(extra);
        return;
      }
      ops.push(metaStore.get(key).then((stored) => {
        const next = (value as MetaChange<T>)(stored);
        return Promise.all([metaStore.put(next, key), also?.(next)]);
      }));
    };
    if (writes.settings) {
      // The plan in the backup was laid out for its own rest day: restored
      // together, that rest day is already applied, so the sync doesn't lay
      // the week out again (docs/onderzoek/Planning op een lijn.md, conflict 16).
      writeMeta<AppSettings>('settings', writes.settings, (settings) => (writes.plannedSessions?.clear ? metaStore.put(settings.restDay ?? 1, 'appliedRestDay') : undefined));
    }
    for (const [key, value] of Object.entries(writes.meta ?? {})) writeMeta(key, value);
    ops.push(tx.objectStore('meta').delete(BOOT_MIGRATIONS_KEY));
  } catch (err) {
    abort();
    await Promise.allSettled([...ops, tx.done]);
    throw err;
  }

  try {
    await Promise.all([...ops, tx.done]);
  } catch (err) {
    abort();
    await tx.done.catch(() => undefined);
    throw err;
  }
}

// Every store in one transaction: all of it is gone, or (on a failure halfway) none
// of it. Taken from the database itself, so a new store can never be forgotten here.
// `meta` is written in the same transaction after the clear (flags for the next start).
export async function clearAllStores(meta: Record<string, unknown> = {}): Promise<void> {
  const db = await getDB();
  const names = [...db.objectStoreNames];
  const tx = db.transaction(names, 'readwrite');
  const ops: Promise<unknown>[] = [];
  try {
    for (const name of names) ops.push(tx.objectStore(name).clear());
    for (const [key, value] of Object.entries(meta)) ops.push(tx.objectStore('meta').put(value, key));
    await Promise.all([...ops, tx.done]);
  } catch (err) {
    // A put that cannot be stored must not let the clears commit on their own.
    try {
      tx.abort();
    } catch {
      // Al afgebroken of al klaar.
    }
    await Promise.allSettled([...ops, tx.done]);
    throw err;
  }
}

// Everything, the pre-import copies included: the same wipe as "Alles verwijderen"
// (databaseSeed.ts#resetToDemoData), without putting the start back.
export async function wipeAllData(): Promise<void> {
  await clearAllStores();
}
