// ASCEND — Backup / Import / Restore pipeline
//
// Implements ASCEND Technical Architecture v0.3.2, scoped to what actually
// exists in the app today (see backupTypes.ts for the scoping rationale).
//
// Flow: buildBackupEnvelope() (export direction) is the mirror of
// normalizeBackupToCurrentModel() + buildImportPreview() + createImportPlan()
// + applyImportPlan() (import direction). The import direction never mutates
// IndexedDB until applyImportPlan — everything before that (diffing,
// conflict detection, preview) reads current data but only returns plain
// objects, so the caller (ImportWizard) can freely re-diff as the user
// changes their category selections without touching storage.
//
// applyImportPlan always takes a PreImportSnapshot first and only then
// writes — via database.ts#applyBackupWrites, a single atomic multi-store
// transaction — so a bad import can always be undone by re-importing that
// snapshot's own envelope.

import type { Program } from '../models/program';
import type { SessionTemplate, PlannedSession, SessionLog } from '../models/training';
import type { Objective, MilestoneProgress } from '../models/objectives';
import type { InjuryNote } from '../models/injury';
import {
  ProgramsRepo,
  SessionTemplatesRepo,
  PlannedSessionsRepo,
  SessionLogsRepo,
  ObjectivesRepo,
  MilestoneProgressRepo,
  InjuryNotesRepo,
  SettingsRepo,
  BackupSnapshotsRepo,
  applyBackupWrites,
  type AppSettings,
} from './database';
import { migrateExport, type AscendExport } from './migrations';
import { makeId } from '../utils/id';
import {
  CURRENT_BACKUP_SCHEMA_VERSION,
  ALL_CATEGORIES,
  type AscendBackupEnvelope,
  type AscendBackupPayloadV1,
  type NormalizedBackupData,
  type BackupDataCategory,
  type CategoryAction,
  type ImportMode,
  type PlanPolicy,
  type ImportConflict,
  type ImportDiffEntry,
  type ImportPreview,
  type ImportPlan,
  type PreImportSnapshot,
} from './backupTypes';

// --- export direction --------------------------------------------------------

export async function buildBackupEnvelope(): Promise<AscendBackupEnvelope> {
  const [programs, templates, plannedSessions, sessionLogs, objectives, milestoneProgress, injuryNotes, settings] = await Promise.all([
    ProgramsRepo.getAll(),
    SessionTemplatesRepo.getAll(),
    PlannedSessionsRepo.getAll(),
    SessionLogsRepo.getAll(),
    ObjectivesRepo.getAll(),
    MilestoneProgressRepo.getAll(),
    InjuryNotesRepo.getAll(),
    SettingsRepo.get(),
  ]);

  const payload: AscendBackupPayloadV1 = {
    version: 1,
    program: programs[0] ?? null,
    templates,
    plannedSessions,
    sessionLogs,
    objectives,
    milestoneProgress,
    injuryNotes,
    settings,
  };

  return {
    backupSchemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    payload,
  };
}

export function backupFileName(createdAt: string): string {
  // Double extension is deliberate (v0.3.2 §File naming): the leading
  // `.ascend-backup` segment is what a future ASCEND-aware file picker or
  // Android/iOS share-sheet integration can filter on, while the trailing
  // `.json` keeps every existing OS/browser/text-editor treating it as
  // plain, previewable JSON — nothing generic breaks on a file it doesn't
  // recognize.
  return `ascend-${createdAt.slice(0, 10)}.ascend-backup.json`;
}

// --- import direction: normalize ---------------------------------------------

export function normalizeBackupToCurrentModel(raw: unknown): NormalizedBackupData {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Kon het bestand niet lezen — is dit een geldig ASCEND-back-up bestand (.json)?');
  }
  const obj = raw as Record<string, unknown>;

  // New-style envelope (v0.3.2+).
  if (typeof obj.backupSchemaVersion === 'number' && typeof obj.payload === 'object' && obj.payload !== null) {
    if (obj.backupSchemaVersion > CURRENT_BACKUP_SCHEMA_VERSION) {
      throw new Error(
        `Deze back-up komt van een nieuwere versie van ASCEND (schema v${obj.backupSchemaVersion}). Werk de app bij voor je deze importeert.`,
      );
    }
    const payload = obj.payload as Record<string, unknown>;
    if (payload.version !== 1) {
      throw new Error(`Deze back-up heeft een onbekende gegevensversie en kan niet worden geïmporteerd.`);
    }
    const p = payload as unknown as AscendBackupPayloadV1;
    return {
      createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : new Date().toISOString(),
      sourceBackupSchemaVersion: obj.backupSchemaVersion,
      program: p.program ?? null,
      templates: p.templates ?? [],
      plannedSessions: p.plannedSessions ?? [],
      sessionLogs: p.sessionLogs ?? [],
      objectives: p.objectives ?? [],
      milestoneProgress: p.milestoneProgress ?? [],
      injuryNotes: p.injuryNotes ?? [],
      settings: p.settings ?? {},
    };
  }

  // Legacy flat export shape (pre-v0.3.2 — see migrations.ts).
  if (typeof obj.schemaVersion === 'number' && typeof obj.exportDate === 'string') {
    const migrated = migrateExport(obj as unknown as AscendExport);
    return {
      createdAt: migrated.exportDate,
      sourceBackupSchemaVersion: 0,
      program: (migrated.program as Program | null | undefined) ?? null,
      templates: (migrated.templates as SessionTemplate[] | undefined) ?? [],
      plannedSessions: (migrated.plannedSessions as PlannedSession[] | undefined) ?? [],
      sessionLogs: (migrated.sessionLogs as SessionLog[] | undefined) ?? [],
      objectives: (migrated.objectives as Objective[] | undefined) ?? [],
      milestoneProgress: (migrated.milestoneProgress as MilestoneProgress[] | undefined) ?? [],
      injuryNotes: (migrated.injuryNotes as InjuryNote[] | undefined) ?? [],
      settings: (migrated.settings as Partial<AppSettings> | undefined) ?? {},
    };
  }

  throw new Error('Kon het bestand niet herkennen als een geldig ASCEND-back-up bestand.');
}

// --- category action support & defaults --------------------------------------

// Not every action makes sense for every category (v0.3.2 §Conflict & Merge
// Semantics) — planned_schedule in particular is governed by the separate
// PlanPolicy question below, never a free 4-way choice, since "merge two
// schedules" has no coherent meaning for a single-device local app.
export const CATEGORY_SUPPORTED_ACTIONS: Record<BackupDataCategory, CategoryAction[]> = {
  program_and_templates: ['keep_current', 'merge', 'replace'],
  training_history: ['keep_current', 'merge', 'replace', 'ignore'],
  planned_schedule: ['keep_current', 'replace'],
  objectives_and_milestones: ['keep_current', 'merge', 'replace'],
  injuries: ['keep_current', 'merge', 'replace', 'ignore'],
  app_settings: ['keep_current', 'replace'],
};

// Mode B (merge) deliberately omits planned_schedule entirely — the schedule
// is only ever touched via the separate PlanPolicy answer, never a bare
// category default. Mode C (custom) starts from the same sensible base as
// merge, since a blank slate of choices is worse UX than a reasonable
// starting point the user then tweaks.
export function defaultActionsForMode(mode: ImportMode): Partial<Record<BackupDataCategory, CategoryAction>> {
  if (mode === 'full_restore') {
    return {
      program_and_templates: 'replace',
      training_history: 'replace',
      planned_schedule: 'replace',
      objectives_and_milestones: 'replace',
      injuries: 'replace',
      app_settings: 'replace',
    };
  }
  // merge and custom
  return {
    program_and_templates: 'merge',
    training_history: 'merge',
    objectives_and_milestones: 'merge',
    injuries: 'merge',
    app_settings: 'keep_current',
  };
}

export function defaultPlanPolicyForMode(mode: ImportMode): PlanPolicy {
  return mode === 'full_restore' ? 'restore_backup_plan' : 'keep_current_plan';
}

// --- generic list-category resolution ----------------------------------------

interface Keyed {
  id: string;
}

interface ResolvedListCategory<T> {
  final: T[];
  toAdd: number;
  toReplace: number;
  toSkipDuplicate: number;
  conflicts: ImportConflict[];
}

function shallowEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// allowReplaceOverwrite=false means a merge conflict (same id, different
// content) is surfaced rather than silently applied — the append-only
// guarantee CLAUDE.md calls out for SessionLog/MilestoneProgress. Mutable
// categories (InjuryNote) pass true: a backup's newer version of the same
// record (e.g. a resolvedDate added since) is expected to win.
function resolveListCategory<T extends Keyed>(
  action: CategoryAction,
  incoming: T[],
  current: T[],
  allowReplaceOverwrite: boolean,
): ResolvedListCategory<T> {
  if (action === 'keep_current' || action === 'ignore') {
    return { final: current, toAdd: 0, toReplace: 0, toSkipDuplicate: 0, conflicts: [] };
  }
  if (action === 'replace') {
    return { final: incoming, toAdd: 0, toReplace: incoming.length, toSkipDuplicate: 0, conflicts: [] };
  }

  // merge
  const final = [...current];
  const indexById = new Map(current.map((c, i) => [c.id, i]));
  let toAdd = 0;
  let toReplace = 0;
  let toSkipDuplicate = 0;
  const conflicts: ImportConflict[] = [];

  for (const inc of incoming) {
    const existingIndex = indexById.get(inc.id);
    if (existingIndex === undefined) {
      final.push(inc);
      toAdd++;
      continue;
    }
    const existing = final[existingIndex];
    if (shallowEqual(existing, inc)) {
      toSkipDuplicate++;
      continue;
    }
    if (allowReplaceOverwrite) {
      final[existingIndex] = inc;
      toReplace++;
    } else {
      conflicts.push({
        id: inc.id,
        reason: 'Bestaand record met dit id verschilt van de back-up en wordt niet overschreven (geschiedenis is append-only).',
      });
    }
  }

  return { final, toAdd, toReplace, toSkipDuplicate, conflicts };
}

// --- preview ------------------------------------------------------------------

function resolvePlannedScheduleAction(planPolicy: PlanPolicy | undefined): CategoryAction {
  return planPolicy === 'restore_backup_plan' ? 'replace' : 'keep_current';
}

interface CurrentData {
  program: Program | null;
  templates: SessionTemplate[];
  plannedSessions: PlannedSession[];
  sessionLogs: SessionLog[];
  objectives: Objective[];
  milestoneProgress: MilestoneProgress[];
  injuryNotes: InjuryNote[];
  settings: AppSettings;
}

async function loadCurrentData(): Promise<CurrentData> {
  const [programs, templates, plannedSessions, sessionLogs, objectives, milestoneProgress, injuryNotes, settings] = await Promise.all([
    ProgramsRepo.getAll(),
    SessionTemplatesRepo.getAll(),
    PlannedSessionsRepo.getAll(),
    SessionLogsRepo.getAll(),
    ObjectivesRepo.getAll(),
    MilestoneProgressRepo.getAll(),
    InjuryNotesRepo.getAll(),
    SettingsRepo.get(),
  ]);
  return { program: programs[0] ?? null, templates, plannedSessions, sessionLogs, objectives, milestoneProgress, injuryNotes, settings };
}

interface DiffResult {
  diffByCategory: ImportDiffEntry[];
  settingsChanges: { key: string; current: unknown; incoming: unknown }[];
  resolved: {
    program: Program | null;
    templates: ResolvedListCategory<SessionTemplate>;
    plannedSessions: ResolvedListCategory<PlannedSession>;
    sessionLogs: ResolvedListCategory<SessionLog>;
    objectives: ResolvedListCategory<Objective>;
    milestoneProgress: ResolvedListCategory<MilestoneProgress>;
    injuryNotes: ResolvedListCategory<InjuryNote>;
    settings: AppSettings | undefined;
  };
}

function computeDiff(
  current: CurrentData,
  backup: NormalizedBackupData,
  categorySelections: Partial<Record<BackupDataCategory, CategoryAction>>,
  planPolicy: PlanPolicy | undefined,
): DiffResult {
  const diffByCategory: ImportDiffEntry[] = [];

  const programAction = categorySelections.program_and_templates ?? 'keep_current';
  const templatesResolved = resolveListCategory(programAction, backup.templates, current.templates, true);
  const resolvedProgram = programAction === 'keep_current' || programAction === 'ignore'
    ? current.program
    : programAction === 'replace'
      ? (backup.program ?? current.program)
      : (current.program ?? backup.program); // merge: adopt backup's program only if there wasn't one already
  diffByCategory.push({
    category: 'program_and_templates',
    action: programAction,
    toAdd: templatesResolved.toAdd,
    toReplace: templatesResolved.toReplace,
    toSkipDuplicate: templatesResolved.toSkipDuplicate,
    conflicts: templatesResolved.conflicts,
  });

  const historyAction = categorySelections.training_history ?? 'keep_current';
  const sessionLogsResolved = resolveListCategory(historyAction, backup.sessionLogs, current.sessionLogs, false);
  diffByCategory.push({
    category: 'training_history',
    action: historyAction,
    toAdd: sessionLogsResolved.toAdd,
    toReplace: sessionLogsResolved.toReplace,
    toSkipDuplicate: sessionLogsResolved.toSkipDuplicate,
    conflicts: sessionLogsResolved.conflicts,
  });

  const scheduleAction = resolvePlannedScheduleAction(planPolicy);
  const plannedSessionsResolved = resolveListCategory(scheduleAction, backup.plannedSessions, current.plannedSessions, true);
  diffByCategory.push({
    category: 'planned_schedule',
    action: scheduleAction,
    toAdd: plannedSessionsResolved.toAdd,
    toReplace: plannedSessionsResolved.toReplace,
    toSkipDuplicate: plannedSessionsResolved.toSkipDuplicate,
    conflicts: plannedSessionsResolved.conflicts,
  });

  const objectivesAction = categorySelections.objectives_and_milestones ?? 'keep_current';
  const objectivesResolved = resolveListCategory(objectivesAction, backup.objectives, current.objectives, true);
  const milestoneProgressResolved = resolveListCategory(objectivesAction, backup.milestoneProgress, current.milestoneProgress, false);
  diffByCategory.push({
    category: 'objectives_and_milestones',
    action: objectivesAction,
    toAdd: objectivesResolved.toAdd + milestoneProgressResolved.toAdd,
    toReplace: objectivesResolved.toReplace + milestoneProgressResolved.toReplace,
    toSkipDuplicate: objectivesResolved.toSkipDuplicate + milestoneProgressResolved.toSkipDuplicate,
    conflicts: [...objectivesResolved.conflicts, ...milestoneProgressResolved.conflicts],
  });

  const injuriesAction = categorySelections.injuries ?? 'keep_current';
  const injuryNotesResolved = resolveListCategory(injuriesAction, backup.injuryNotes, current.injuryNotes, true);
  diffByCategory.push({
    category: 'injuries',
    action: injuriesAction,
    toAdd: injuryNotesResolved.toAdd,
    toReplace: injuryNotesResolved.toReplace,
    toSkipDuplicate: injuryNotesResolved.toSkipDuplicate,
    conflicts: injuryNotesResolved.conflicts,
  });

  const settingsAction = categorySelections.app_settings ?? 'keep_current';
  const settingsChanges: { key: string; current: unknown; incoming: unknown }[] = [];
  let resolvedSettings: AppSettings | undefined;
  if (settingsAction === 'replace') {
    resolvedSettings = { ...current.settings, ...backup.settings };
    for (const key of Object.keys(backup.settings) as (keyof AppSettings)[]) {
      const incomingValue = backup.settings[key];
      const currentValue = current.settings[key];
      if (!shallowEqual(currentValue, incomingValue)) {
        settingsChanges.push({ key, current: currentValue, incoming: incomingValue });
      }
    }
  }
  diffByCategory.push({
    category: 'app_settings',
    action: settingsAction,
    toAdd: 0,
    toReplace: settingsChanges.length,
    toSkipDuplicate: 0,
    conflicts: [],
  });

  return {
    diffByCategory,
    settingsChanges,
    resolved: {
      program: resolvedProgram,
      templates: templatesResolved,
      plannedSessions: plannedSessionsResolved,
      sessionLogs: sessionLogsResolved,
      objectives: objectivesResolved,
      milestoneProgress: milestoneProgressResolved,
      injuryNotes: injuryNotesResolved,
      settings: resolvedSettings,
    },
  };
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function buildImportPreview(
  backup: NormalizedBackupData,
  categorySelections: Partial<Record<BackupDataCategory, CategoryAction>>,
  planPolicy: PlanPolicy | undefined,
): Promise<ImportPreview> {
  const current = await loadCurrentData();
  const { diffByCategory, settingsChanges } = computeDiff(current, backup, categorySelections, planPolicy);

  const recordCounts: Partial<Record<BackupDataCategory, number>> = {
    program_and_templates: backup.templates.length,
    training_history: backup.sessionLogs.length,
    planned_schedule: backup.plannedSessions.length,
    objectives_and_milestones: backup.objectives.length + backup.milestoneProgress.length,
    injuries: backup.injuryNotes.length,
    app_settings: Object.keys(backup.settings).length,
  };

  const ageMs = Date.now() - new Date(backup.createdAt).getTime();
  const restoreDateWarning =
    Number.isFinite(ageMs) && ageMs > THIRTY_DAYS_MS
      ? 'Deze back-up is meer dan 30 dagen oud — recentere gegevens kunnen verloren gaan als je deze herstelt.'
      : undefined;

  return {
    backupMeta: {
      createdAt: backup.createdAt,
      backupSchemaVersion: backup.sourceBackupSchemaVersion,
      recordCounts,
      hasTrainingPlan: backup.program !== null,
      isFromOlderVersion: backup.sourceBackupSchemaVersion < CURRENT_BACKUP_SCHEMA_VERSION,
      restoreDateWarning,
    },
    diffByCategory,
    settingsChanges,
  };
}

// --- plan & apply ---------------------------------------------------------

export async function createPreImportSnapshot(): Promise<PreImportSnapshot> {
  const envelope = await buildBackupEnvelope();
  const snapshot: PreImportSnapshot = {
    id: makeId('snapshot'),
    createdAt: new Date().toISOString(),
    envelope,
    reason: 'pre_import',
  };
  await BackupSnapshotsRepo.put(snapshot);
  return snapshot;
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
  const { resolved } = computeDiff(current, backup, plan.categorySelections, plan.planPolicy);

  const programAction = plan.categorySelections.program_and_templates ?? 'keep_current';
  const touchesProgram = programAction !== 'keep_current' && programAction !== 'ignore';
  const historyAction = plan.categorySelections.training_history ?? 'keep_current';
  const scheduleAction = resolvePlannedScheduleAction(plan.planPolicy);
  const objectivesAction = plan.categorySelections.objectives_and_milestones ?? 'keep_current';
  const injuriesAction = plan.categorySelections.injuries ?? 'keep_current';

  await applyBackupWrites({
    programs: touchesProgram && resolved.program ? { clear: true, puts: [resolved.program] } : undefined,
    sessionTemplates: programAction === 'keep_current' || programAction === 'ignore'
      ? undefined
      : { clear: programAction === 'replace', puts: resolved.templates.final },
    plannedSessions: scheduleAction === 'keep_current' ? undefined : { clear: true, puts: resolved.plannedSessions.final },
    sessionLogs: historyAction === 'keep_current' || historyAction === 'ignore'
      ? undefined
      : { clear: historyAction === 'replace', puts: resolved.sessionLogs.final },
    objectives: objectivesAction === 'keep_current' ? undefined : { clear: objectivesAction === 'replace', puts: resolved.objectives.final },
    milestoneProgress: objectivesAction === 'keep_current'
      ? undefined
      : { clear: objectivesAction === 'replace', puts: resolved.milestoneProgress.final },
    injuryNotes: injuriesAction === 'keep_current' || injuriesAction === 'ignore'
      ? undefined
      : { clear: injuriesAction === 'replace', puts: resolved.injuryNotes.final },
    settings: resolved.settings,
  });
}

export { ALL_CATEGORIES };
