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
import { defaultActionsForMode, mergeSettingsHistory, type ResolvedListCategory } from './backupMerge';
import { DEFAULT_SETTINGS, type AppSettings } from './databaseSettings';
import { SKILL_GOALS_KEY } from './skillGoals';
import { SAVED_ROUTES_KEY } from './places';
import { readSavedRouteList, routesOfPlaces } from './migrationsPlaces';
import { readSkillGoalStore } from './migrationsSkill';
import { mergeSkillStores } from '../engine/skillGoal';
import type { GoalMilestoneProgress } from '../models/goals';
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
  const envelope = await buildBackupEnvelope({ streams: false, mornings: false, wholeState: true });
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
  // A replace clears the store and writes the whole list; a merge only writes the rows
  // that are new or that the file changes, never the device's own rows back from the
  // copy read above (something may have changed them since).
  const listWrite = <T,>(action: CategoryAction, r: ResolvedListCategory<T> | undefined) => {
    if (!r || !touches(action)) return undefined;
    if (action === 'replace') return { clear: true, puts: r.final };
    return r.writes.length > 0 ? { clear: false, puts: r.writes } : undefined;
  };
  // History only grows: only rows that are new, and only when the store still lacks
  // them at the moment of writing (databaseBackupWrites.ts, onlyNew).
  const historyWrite = <T,>(r: ResolvedListCategory<T> | undefined) =>
    r && r.writes.length > 0 ? { clear: false, onlyNew: true, puts: r.writes } : undefined;

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

  // What merges with the device (the history lists in settings, the skill goals, the routes
  // that stay with the places) is merged again with what is stored at the moment of writing,
  // inside the transaction: a weighing, an illness or a route saved between the preview and
  // Akkoord is not lost. A plain value from the file is written as it is.
  const settingsWrite = resolved.settings && effective.app_settings === 'replace' && backup.settings
    ? (stored: unknown): AppSettings => {
      const now: AppSettings = { ...DEFAULT_SETTINGS, ...(stored as Partial<AppSettings> | undefined) };
      return { ...now, ...mergeSettingsHistory(now, backup.settings) };
    }
    : resolved.settings;
  const metaWrites: Record<string, unknown> = { ...resolved.meta, ...restoredMeta };
  if (SKILL_GOALS_KEY in metaWrites && backup.skillGoals) {
    const incoming = backup.skillGoals;
    const replace = goalsAction === 'replace';
    metaWrites[SKILL_GOALS_KEY] = (stored: unknown) => mergeSkillStores(readSkillGoalStore(stored), incoming, replace);
  }
  if (SAVED_ROUTES_KEY in metaWrites && backup.places && !backup.savedRoutes) {
    const places = backup.places;
    metaWrites[SAVED_ROUTES_KEY] = (stored: unknown) => routesOfPlaces(readSavedRouteList(stored), places);
  }

  try {
    await applyBackupWrites({
      programs: touches(programAction) && resolved.program ? { clear: true, puts: [resolved.program] } : undefined,
      sessionTemplates: listWrite(programAction, resolved.templates),
      strengthProgramStrategies: listWrite(programAction, resolved.strengthProgramStrategies),
      plannedSessions: touches(effective.planned_schedule) ? { clear: true, puts: resolved.plannedSessions.final } : undefined,
      // Never cleared: logs, milestone progress and audit trails only grow.
      sessionLogs: touches(historyAction) ? historyWrite(resolved.sessionLogs) : undefined,
      planChangeProposals: touches(historyAction) ? historyWrite(resolved.planChangeProposals) : undefined,
      strengthProgramRecommendations: touches(historyAction) ? historyWrite(resolved.strengthProgramRecommendations) : undefined,
      activityStreams: streamPuts.length > 0 ? { clear: false, onlyNew: true, puts: streamPuts } : undefined,
      recoveryMetrics: morningPuts.length > 0 ? { clear: false, onlyNew: true, puts: morningPuts } : undefined,
      trainingGoals: listWrite(goalsAction, resolved.trainingGoals),
      goalMilestones: listWrite(goalsAction, resolved.goalMilestones),
      goalMilestoneProgress: touches(goalsAction) ? historyWrite(oneLinePerMilestone(resolved.goalMilestoneProgress)) : undefined,
      capabilityEvidence: listWrite(effective.capability_evidence, resolved.capabilityEvidence),
      injuryNotes: listWrite(effective.injuries, resolved.injuryNotes),
      settings: settingsWrite,
      meta: Object.keys(metaWrites).length > 0 ? metaWrites : undefined,
    });
  } catch (err) {
    const detail = err instanceof Error ? ` (${err.message})` : '';
    throw new Error(`Importeren is mislukt. Er is niets gewijzigd.${detail}`);
  }
  // De geplande sessies zijn vervangen: een lopende training hoort bij de oude planning (wijzer en concepten mee).
  if (touches(effective.planned_schedule) || touches(programAction)) clearForgeSessions();
}

// A milestone has one line: of two lines in the file for the same milestone only the first
// is written (the store checks the device's own lines inside the transaction).
function oneLinePerMilestone(r: ResolvedListCategory<GoalMilestoneProgress>): ResolvedListCategory<GoalMilestoneProgress> {
  const seen = new Set<string>();
  const writes = r.writes.filter((p) => {
    const key = `${p.goalId}|${p.milestoneId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { ...r, writes };
}
