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
import { withDerivedWeek, clearStore } from './databaseRepos';

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
  // The full series that came with a backup (only those the device does not have yet).
  activityStreams?: BackupStoreWrite<ActivityStreams>;
  // The mornings that came with a backup (only those the device does not have yet).
  recoveryMetrics?: BackupStoreWrite<RecoveryMetric>;
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

  for (const key of ['programs', 'sessionTemplates', 'plannedSessions', 'sessionLogs', 'trainingGoals', 'goalMilestones', 'goalMilestoneProgress', 'capabilityEvidence', 'injuryNotes', 'planChangeProposals', 'strengthProgramStrategies', 'strengthProgramRecommendations', 'activityStreams', 'recoveryMetrics'] as const) {
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
    clearStore('activityStreams'),
    clearStore('meta'),
  ]);
}
