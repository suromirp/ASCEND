// Back-up terugzetten: momentopnames, het plan en het schrijven.

import { filterRecovery } from '../engine/watchUse';
import { getWatchState } from './externalActivities';
import type { RecoveryMetric } from '../models/metrics';
import type { ActivityStreams } from '../models/activityStreams';
import { BackupSnapshotsRepo, ActivityStreamsRepo, RecoveryMetricsRepo, applyBackupWrites } from './database';
import { makeId } from '../utils/id';
import type { NormalizedBackupData, BackupDataCategory, CategoryAction, ImportMode, PlanPolicy, ImportConflict, ImportPlan, PreImportSnapshot } from './backupTypes';
import { BackupMessageError } from './backupMessage';
import { clearForgeSessions } from '../utils/forgeSessionStore';
import { buildBackupEnvelope } from './backupExport';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { defaultActionsForMode, type ResolvedListCategory } from './backupMerge';
import { loadCurrentData, computeDiff } from './backupPreview';

// --- plan & apply ---------------------------------------------------------

// Enough to undo the last few imports; older copies only cost storage
// (each one is the whole database).
const MAX_SNAPSHOTS = 5;

export async function listSnapshots(): Promise<PreImportSnapshot[]> {
  const all = await BackupSnapshotsRepo.getAll();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createPreImportSnapshot(): Promise<PreImportSnapshot> {
  const envelope = await buildBackupEnvelope({ streams: false, mornings: false });
  const snapshot: PreImportSnapshot = {
    id: makeId('snapshot'),
    createdAt: new Date().toISOString(),
    envelope,
    reason: 'pre_import',
  };
  await BackupSnapshotsRepo.put(snapshot);
  const all = await listSnapshots();
  for (const old of all.slice(MAX_SNAPSHOTS)) await BackupSnapshotsRepo.delete(old.id);
  return snapshot;
}

// Puts a pre-import copy back: everything returns to that moment, except
// trainings logged since — those are never deleted (history is
// append-only). Takes its own snapshot first, so this too can be undone.
export async function restoreSnapshot(id: string): Promise<void> {
  const snapshot = (await BackupSnapshotsRepo.getAll()).find((s) => s.id === id);
  if (!snapshot) throw new BackupMessageError('Deze kopie bestaat niet meer.');
  const backup = normalizeBackupToCurrentModel(snapshot.envelope);
  const before = await createPreImportSnapshot();
  const selections = defaultActionsForMode('full_restore');
  const plan = createImportPlan(backup, 'full_restore', selections, 'restore_backup_plan', [], before.id);
  await applyImportPlan(backup, plan);
}

export function createImportPlan(
  backup: NormalizedBackupData,
  mode: ImportMode,
  categorySelections: Partial<Record<BackupDataCategory, CategoryAction>>,
  planPolicy: PlanPolicy | undefined,
  conflicts: ImportConflict[],
  preImportSnapshotId: string,
): ImportPlan {
  return {
    id: makeId('importplan'),
    sourceBackupSchemaVersion: backup.sourceBackupSchemaVersion,
    backupCreatedAt: backup.createdAt,
    mode,
    categorySelections,
    planPolicy,
    conflicts,
    preImportSnapshotId,
    approvedAt: new Date().toISOString(),
  };
}

// The plan is exactly what was approved — this never re-asks a question or
// makes a new decision, it only re-derives the same resolveListCategory
// output (pure, deterministic) and issues the writes. A snapshot must
// already exist (created by createPreImportSnapshot before the user ever
// saw the confirmation step) so an import can always be undone.
export async function applyImportPlan(backup: NormalizedBackupData, plan: ImportPlan): Promise<void> {
  const current = await loadCurrentData();
  const { resolved, effective } = computeDiff(current, backup, plan.categorySelections, plan.planPolicy);

  const touches = (a: CategoryAction) => a !== 'keep_current' && a !== 'ignore';
  const listWrite = <T,>(action: CategoryAction, r: ResolvedListCategory<T> | undefined) =>
    r && touches(action) ? { clear: action === 'replace', puts: r.final } : undefined;

  const programAction = effective.program_and_templates;
  const historyAction = effective.training_history;
  const goalsAction = effective.objectives_and_milestones;

  // A device that had no program yet (a new installation) gets one from the
  // backup: the old default strength block must not turn up unasked at the next
  // update, so its flag is set (storage/goalMigration.ts#migrateStrengthProgramDefault).
  const restoredMeta: Record<string, unknown> = !current.program && touches(programAction) && resolved.program ? { strengthProgramDefaultSeeded: true } : {};

  // The series that came with the file: only for logs that are there afterwards, and never over
  // a set the device already has for that log (its own is the newer reading). With "Volledige
  // reeks bewaren" off (as it is afterwards) no series are written at all.
  let streamPuts: ActivityStreams[] = [];
  const keepStreams = (resolved.settings ?? current.settings)?.keepStreams !== false;
  if (keepStreams && touches(historyAction) && backup.activityStreams && backup.activityStreams.length > 0) {
    const have = new Set(await ActivityStreamsRepo.keys());
    const logIds = new Set(resolved.sessionLogs.final.map((l) => l.id));
    streamPuts = backup.activityStreams.filter((s) => logIds.has(s.logId) && !have.has(s.logId));
  }

  // The mornings that came with the file: only those the device does not have yet, never over a
  // morning the device fetched itself (its own is the newer reading). What is switched off under
  // "Wat ASCEND van je horloge gebruikt" stays out (engine/watchUse.ts#filterRecovery).
  let morningPuts: RecoveryMetric[] = [];
  if (touches(historyAction) && backup.mornings && backup.mornings.length > 0) {
    const have = new Set((await RecoveryMetricsRepo.getAll()).map((m) => m.id));
    morningPuts = filterRecovery(backup.mornings.filter((m) => !have.has(m.id)), (await getWatchState()).use);
  }

  try {
    await applyBackupWrites({
      programs: touches(programAction) && resolved.program ? { clear: true, puts: [resolved.program] } : undefined,
      sessionTemplates: listWrite(programAction, resolved.templates),
      strengthProgramStrategies: listWrite(programAction, resolved.strengthProgramStrategies),
      plannedSessions: touches(effective.planned_schedule) ? { clear: true, puts: resolved.plannedSessions.final } : undefined,
      // Never cleared: logs, milestone progress and audit trails only grow.
      sessionLogs: touches(historyAction) ? { clear: false, puts: resolved.sessionLogs.final } : undefined,
      planChangeProposals: touches(historyAction) && resolved.planChangeProposals ? { clear: false, puts: resolved.planChangeProposals.final } : undefined,
      strengthProgramRecommendations: touches(historyAction) && resolved.strengthProgramRecommendations ? { clear: false, puts: resolved.strengthProgramRecommendations.final } : undefined,
      activityStreams: streamPuts.length > 0 ? { clear: false, puts: streamPuts } : undefined,
      recoveryMetrics: morningPuts.length > 0 ? { clear: false, puts: morningPuts } : undefined,
      trainingGoals: listWrite(goalsAction, resolved.trainingGoals),
      goalMilestones: listWrite(goalsAction, resolved.goalMilestones),
      goalMilestoneProgress: touches(goalsAction) ? { clear: false, puts: resolved.goalMilestoneProgress.final } : undefined,
      capabilityEvidence: listWrite(effective.capability_evidence, resolved.capabilityEvidence),
      injuryNotes: listWrite(effective.injuries, resolved.injuryNotes),
      settings: resolved.settings,
      meta: Object.keys({ ...resolved.meta, ...restoredMeta }).length > 0 ? { ...resolved.meta, ...restoredMeta } : undefined,
    });
  } catch (err) {
    const detail = err instanceof Error ? ` (${err.message})` : '';
    throw new Error(`Importeren is mislukt. Er is niets gewijzigd.${detail}`);
  }
  // De geplande sessies zijn vervangen: een lopende training hoort bij de oude planning (wijzer en concepten mee).
  if (touches(effective.planned_schedule) || touches(programAction)) clearForgeSessions();
}
