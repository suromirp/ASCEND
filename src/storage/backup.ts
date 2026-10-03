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
import type { TrainingGoal, GoalMilestone, GoalMilestoneProgress } from '../models/goals';
import type { CapabilityEvidence } from '../models/capability';
import type { InjuryNote } from '../models/injury';
import {
  ProgramsRepo,
  SessionTemplatesRepo,
  PlannedSessionsRepo,
  SessionLogsRepo,
  TrainingGoalsRepo,
  GoalMilestonesRepo,
  GoalMilestoneProgressRepo,
  CapabilityEvidenceRepo,
  InjuryNotesRepo,
  SettingsRepo,
  BackupSnapshotsRepo,
  MetaRepo,
  PlanChangeProposalsRepo,
  StrengthProgramStrategiesRepo,
  StrengthProgramRecommendationsRepo,
  applyBackupWrites,
  type AppSettings,
} from './database';
import type { PlanChangeProposal } from '../models/planChange';
import type { StrengthProgramStrategy, StrengthProgramRecommendation } from '../models/strengthProgram';
import { migrateGr5ObjectiveData, buildMarathonGoal } from '../engine/goalMigration';
import { migrateExport, type AscendExport } from './migrations';
import { makeId } from '../utils/id';
import {
  CURRENT_BACKUP_SCHEMA_VERSION,
  ALL_CATEGORIES,
  type AscendBackupEnvelope,
  type AscendBackupPayloadV4,
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

// A V1 backup's legacy objectives/milestoneProgress are migrated into
// trainingGoals/goalMilestones/goalMilestoneProgress here — the exact same
// transform storage/goalMigration.ts runs on-device (engine/goalMigration.ts),
// so restoring an old backup never silently loses GR5/marathon goal
// progress just because the on-disk shape has moved on. Today's app only
// ever has one GR5-shaped Objective, but this maps every row present, not
// just the first, in case an old export ever carried more than one.
function migrateLegacyObjectives(
  objectives: Objective[],
  legacyProgress: MilestoneProgress[],
  settings: Partial<AppSettings>,
): { trainingGoals: TrainingGoal[]; goalMilestones: GoalMilestone[]; goalMilestoneProgress: GoalMilestoneProgress[] } {
  const trainingGoals: TrainingGoal[] = [];
  const goalMilestones: GoalMilestone[] = [];
  const goalMilestoneProgress: GoalMilestoneProgress[] = [];

  for (const objective of objectives) {
    const migrated = migrateGr5ObjectiveData(objective, legacyProgress);
    trainingGoals.push(migrated.goal);
    goalMilestones.push(...migrated.milestones);
    goalMilestoneProgress.push(...migrated.progress);
  }

  const marathonGoal = buildMarathonGoal(settings.marathonRaceType, settings.marathonTargetDate, settings.marathonTargetTimeMinutes);
  if (marathonGoal) trainingGoals.push(marathonGoal);

  return { trainingGoals, goalMilestones, goalMilestoneProgress };
}

// --- export direction --------------------------------------------------------

export async function buildBackupEnvelope(): Promise<AscendBackupEnvelope> {
  const [programs, templates, plannedSessions, sessionLogs, trainingGoals, goalMilestones, goalMilestoneProgress, capabilityEvidence, injuryNotes, settings, goalEngineConfig, strengthProgramStrategies, strengthProgramRecommendations, planChangeProposals, adviceResponses] = await Promise.all([
    ProgramsRepo.getAll(),
    SessionTemplatesRepo.getAll(),
    PlannedSessionsRepo.getAll(),
    SessionLogsRepo.getAll(),
    TrainingGoalsRepo.getAll(),
    GoalMilestonesRepo.getAll(),
    GoalMilestoneProgressRepo.getAll(),
    CapabilityEvidenceRepo.getAll(),
    InjuryNotesRepo.getAll(),
    SettingsRepo.get(),
    MetaRepo.get<Partial<import('../models/goalEngineConfig').GoalEngineConfig>>('goalEngineConfig'),
    StrengthProgramStrategiesRepo.getAll(),
    StrengthProgramRecommendationsRepo.getAll(),
    PlanChangeProposalsRepo.getAll(),
    MetaRepo.get<Record<string, unknown>>('adviceResponses'),
  ]);

  const payload: AscendBackupPayloadV4 = {
    version: 4,
    program: programs[0] ?? null,
    templates,
    plannedSessions,
    sessionLogs,
    trainingGoals,
    goalMilestones,
    goalMilestoneProgress,
    capabilityEvidence,
    injuryNotes,
    settings,
    goalEngineConfig: goalEngineConfig ?? null,
    strengthProgramStrategies,
    strengthProgramRecommendations,
    planChangeProposals,
    adviceResponses: adviceResponses ?? null,
  };

  return {
    backupSchemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
    appVersion: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : undefined,
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

// A file can be hand-edited, cut off or simply from somewhere else. Every
// record is checked for the fields the app relies on before it can reach
// storage; anything incomplete is dropped and counted, never written —
// one broken log used to crash the Today screen for good.
const DATE_RE = /^\d{4}-\d{2}-\d{2}/;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const hasId = (v: unknown): v is Record<string, unknown> & { id: string } => isRecord(v) && typeof v.id === 'string' && v.id.length > 0;
const isDate = (v: unknown): boolean => typeof v === 'string' && DATE_RE.test(v);

const isTemplate = (v: unknown) => hasId(v) && typeof v.name === 'string' && typeof v.type === 'string';
const isPlanned = (v: unknown) => hasId(v) && typeof v.templateId === 'string' && isDate(v.scheduledDate) && isDate(v.weekStartDate) && typeof v.status === 'string';
const isLog = (v: unknown) => hasId(v) && typeof v.templateId === 'string' && isDate(v.completedDate) && typeof v.completedAt === 'string';

interface Counter { n: number }

function cleanList<T>(raw: unknown, valid: (v: unknown) => boolean, skipped: Counter): T[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((v) => {
    if (valid(v)) return true;
    skipped.n++;
    return false;
  }) as T[];
}

function cleanSettings(raw: unknown, skipped: Counter): Partial<AppSettings> | undefined {
  if (!isRecord(raw)) return undefined;
  const s: Record<string, unknown> = { ...raw };
  const lists: [string, (v: unknown) => boolean][] = [
    ['weightEntries', (e) => isRecord(e) && isDate(e.date) && typeof e.kg === 'number' && Number.isFinite(e.kg)],
    ['illnessEpisodes', (e) => hasId(e) && isDate(e.startDate) && typeof e.kind === 'string'],
  ];
  for (const [key, valid] of lists) {
    if (!(key in s)) continue;
    const cleaned = cleanList(s[key], valid, skipped);
    if (cleaned === undefined) {
      delete s[key];
      skipped.n++;
    } else {
      s[key] = cleaned;
    }
  }
  return s as Partial<AppSettings>;
}

interface RawSource {
  createdAt: string;
  sourceBackupSchemaVersion: number;
  raw: Record<string, unknown>;
  // V1 and the legacy flat export carry objectives/milestoneProgress
  // instead of goal-engine records.
  legacyGoals: boolean;
  hasCapability: boolean;
  hasV4Extras: boolean;
}

function buildNormalized({ createdAt, sourceBackupSchemaVersion, raw, legacyGoals, hasCapability, hasV4Extras }: RawSource): NormalizedBackupData {
  const skipped: Counter = { n: 0 };
  const templates = cleanList<SessionTemplate>(raw.templates, isTemplate, skipped);
  const plannedSessions = cleanList<PlannedSession>(raw.plannedSessions, isPlanned, skipped);
  const sessionLogs = cleanList<SessionLog>(raw.sessionLogs, isLog, skipped);
  const injuryNotes = cleanList<InjuryNote>(raw.injuryNotes, hasId, skipped);
  const capabilityEvidence = hasCapability ? cleanList<CapabilityEvidence>(raw.capabilityEvidence, hasId, skipped) : undefined;
  const settings = cleanSettings(raw.settings, skipped);
  const program = hasId(raw.program) ? (raw.program as unknown as Program) : null;

  let trainingGoals: TrainingGoal[] | undefined;
  let goalMilestones: GoalMilestone[] | undefined;
  let goalMilestoneProgress: GoalMilestoneProgress[] | undefined;
  if (legacyGoals) {
    const objectives = cleanList<Objective>(raw.objectives, hasId, skipped);
    if (objectives !== undefined) {
      const migrated = migrateLegacyObjectives(objectives, cleanList<MilestoneProgress>(raw.milestoneProgress, hasId, skipped) ?? [], settings ?? {});
      trainingGoals = migrated.trainingGoals;
      goalMilestones = migrated.goalMilestones;
      goalMilestoneProgress = migrated.goalMilestoneProgress;
    }
  } else {
    trainingGoals = cleanList<TrainingGoal>(raw.trainingGoals, hasId, skipped);
    goalMilestones = cleanList<GoalMilestone>(raw.goalMilestones, hasId, skipped);
    goalMilestoneProgress = cleanList<GoalMilestoneProgress>(raw.goalMilestoneProgress, hasId, skipped);
  }

  const normalized: NormalizedBackupData = {
    createdAt,
    sourceBackupSchemaVersion,
    program,
    templates: templates ?? [],
    plannedSessions: plannedSessions ?? [],
    sessionLogs: sessionLogs ?? [],
    trainingGoals: trainingGoals ?? [],
    goalMilestones: goalMilestones ?? [],
    goalMilestoneProgress: goalMilestoneProgress ?? [],
    capabilityEvidence: capabilityEvidence ?? [],
    injuryNotes: injuryNotes ?? [],
    settings: settings ?? {},
    present: {
      program_and_templates: templates !== undefined,
      training_history: sessionLogs !== undefined,
      planned_schedule: plannedSessions !== undefined,
      objectives_and_milestones: trainingGoals !== undefined,
      capability_evidence: capabilityEvidence !== undefined,
      injuries: injuryNotes !== undefined,
      app_settings: settings !== undefined,
    },
    skippedInvalid: 0,
  };

  if (hasV4Extras) {
    if (isRecord(raw.goalEngineConfig)) normalized.goalEngineConfig = raw.goalEngineConfig as NormalizedBackupData['goalEngineConfig'];
    normalized.strengthProgramStrategies = cleanList<StrengthProgramStrategy>(raw.strengthProgramStrategies, hasId, skipped);
    normalized.strengthProgramRecommendations = cleanList<StrengthProgramRecommendation>(raw.strengthProgramRecommendations, hasId, skipped);
    normalized.planChangeProposals = cleanList<PlanChangeProposal>(raw.planChangeProposals, hasId, skipped);
    if (isRecord(raw.adviceResponses)) normalized.adviceResponses = raw.adviceResponses;
  }

  normalized.skippedInvalid = skipped.n;
  return normalized;
}

export function normalizeBackupToCurrentModel(raw: unknown): NormalizedBackupData {
  if (!isRecord(raw)) {
    throw new Error('Kon het bestand niet lezen. Is dit een geldig ASCEND-back-upbestand (.json)?');
  }
  const obj = raw;

  // New-style envelope (v0.3.2+).
  if (typeof obj.backupSchemaVersion === 'number' && isRecord(obj.payload)) {
    if (obj.backupSchemaVersion > CURRENT_BACKUP_SCHEMA_VERSION) {
      throw new Error(
        `Deze back-up komt van een nieuwere versie van ASCEND (schema v${obj.backupSchemaVersion}). Werk de app bij voordat je hem importeert.`,
      );
    }
    const payload = obj.payload;
    const createdAt = typeof obj.createdAt === 'string' ? obj.createdAt : new Date().toISOString();
    const version = payload.version;
    if (version !== 1 && version !== 2 && version !== 3 && version !== 4) {
      throw new Error('Deze back-up heeft een onbekende gegevensversie en kan niet worden geïmporteerd.');
    }
    return buildNormalized({
      createdAt,
      sourceBackupSchemaVersion: obj.backupSchemaVersion,
      raw: payload,
      legacyGoals: version === 1,
      // V1/V2 predate the Capability Engine: no manual baseline evidence
      // could exist yet, so it's a true absence, not data loss.
      hasCapability: version >= 3,
      hasV4Extras: version >= 4,
    });
  }

  // Legacy flat export shape (pre-v0.3.2 — see migrations.ts).
  if (typeof obj.schemaVersion === 'number' && typeof obj.exportDate === 'string') {
    const migrated = migrateExport(obj as unknown as AscendExport) as unknown as Record<string, unknown> & { exportDate: string };
    return buildNormalized({
      createdAt: migrated.exportDate,
      sourceBackupSchemaVersion: 0,
      raw: migrated,
      legacyGoals: true,
      hasCapability: false,
      hasV4Extras: false,
    });
  }

  throw new Error('Kon het bestand niet herkennen als een ASCEND-back-upbestand.');
}

// JSON.parse with a message the user can act on. A file cut off halfway
// (a failed download, a sync conflict) is the common case.
export function parseBackupText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Dit bestand is beschadigd of onvolledig: het is geen geldige back-up. Er is niets gewijzigd.');
  }
}

// --- category action support & defaults --------------------------------------

// Not every action makes sense for every category (v0.3.2 §Conflict & Merge
// Semantics) — planned_schedule in particular is governed by the separate
// PlanPolicy question below, never a free 4-way choice, since "merge two
// schedules" has no coherent meaning for a single-device local app.
// Training history has no 'replace': logs are append-only (CLAUDE.md), so
// no import may ever delete one. Restoring an older backup adds what's
// missing and keeps everything logged since.
export const CATEGORY_SUPPORTED_ACTIONS: Record<BackupDataCategory, CategoryAction[]> = {
  program_and_templates: ['keep_current', 'merge', 'replace'],
  training_history: ['keep_current', 'merge', 'ignore'],
  planned_schedule: ['keep_current', 'replace'],
  objectives_and_milestones: ['keep_current', 'merge', 'replace'],
  capability_evidence: ['keep_current', 'merge', 'replace', 'ignore'],
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
      training_history: 'merge',
      planned_schedule: 'replace',
      objectives_and_milestones: 'replace',
      capability_evidence: 'replace',
      injuries: 'replace',
      app_settings: 'replace',
    };
  }
  // merge and custom
  return {
    program_and_templates: 'merge',
    training_history: 'merge',
    objectives_and_milestones: 'merge',
    capability_evidence: 'merge',
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
  toRemove: number;
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
    return { final: current, toAdd: 0, toReplace: 0, toSkipDuplicate: 0, toRemove: 0, conflicts: [] };
  }
  const currentById = new Map(current.map((c) => [c.id, c]));
  if (action === 'replace') {
    const incomingIds = new Set(incoming.map((i) => i.id));
    let toAdd = 0;
    let toReplace = 0;
    let toSkipDuplicate = 0;
    for (const inc of incoming) {
      const existing = currentById.get(inc.id);
      if (!existing) toAdd++;
      else if (shallowEqual(existing, inc)) toSkipDuplicate++;
      else toReplace++;
    }
    const toRemove = current.filter((c) => !incomingIds.has(c.id)).length;
    return { final: incoming, toAdd, toReplace, toSkipDuplicate, toRemove, conflicts: [] };
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
        reason: 'Bestaand record met dit id verschilt van de back-up en wordt niet overschreven (geschiedenis wordt nooit herschreven).',
      });
    }
  }

  return { final, toAdd, toReplace, toSkipDuplicate, toRemove: 0, conflicts };
}

// Lists that live inside AppSettings but are history, not preferences:
// restoring settings must never drop a weigh-in or an illness episode the
// device has and the backup doesn't. Union, the device's own record wins.
function mergeSettingsHistory(current: AppSettings, incoming: Partial<AppSettings>): Partial<AppSettings> {
  const merged: Partial<AppSettings> = { ...incoming };
  if (incoming.weightEntries || current.weightEntries) {
    const byDate = new Map((incoming.weightEntries ?? []).map((e) => [e.date, e]));
    for (const e of current.weightEntries ?? []) byDate.set(e.date, e);
    merged.weightEntries = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
  if (incoming.illnessEpisodes || current.illnessEpisodes) {
    const byId = new Map((incoming.illnessEpisodes ?? []).map((e) => [e.id, e]));
    for (const e of current.illnessEpisodes ?? []) byId.set(e.id, e);
    merged.illnessEpisodes = [...byId.values()].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }
  return merged;
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
  trainingGoals: TrainingGoal[];
  goalMilestones: GoalMilestone[];
  goalMilestoneProgress: GoalMilestoneProgress[];
  capabilityEvidence: CapabilityEvidence[];
  injuryNotes: InjuryNote[];
  settings: AppSettings;
  strengthProgramStrategies: StrengthProgramStrategy[];
  strengthProgramRecommendations: StrengthProgramRecommendation[];
  planChangeProposals: PlanChangeProposal[];
}

async function loadCurrentData(): Promise<CurrentData> {
  const [programs, templates, plannedSessions, sessionLogs, trainingGoals, goalMilestones, goalMilestoneProgress, capabilityEvidence, injuryNotes, settings, strengthProgramStrategies, strengthProgramRecommendations, planChangeProposals] = await Promise.all([
    ProgramsRepo.getAll(),
    SessionTemplatesRepo.getAll(),
    PlannedSessionsRepo.getAll(),
    SessionLogsRepo.getAll(),
    TrainingGoalsRepo.getAll(),
    GoalMilestonesRepo.getAll(),
    GoalMilestoneProgressRepo.getAll(),
    CapabilityEvidenceRepo.getAll(),
    InjuryNotesRepo.getAll(),
    SettingsRepo.get(),
    StrengthProgramStrategiesRepo.getAll(),
    StrengthProgramRecommendationsRepo.getAll(),
    PlanChangeProposalsRepo.getAll(),
  ]);
  return { program: programs[0] ?? null, templates, plannedSessions, sessionLogs, trainingGoals, goalMilestones, goalMilestoneProgress, capabilityEvidence, injuryNotes, settings, strengthProgramStrategies, strengthProgramRecommendations, planChangeProposals };
}

interface DiffResult {
  diffByCategory: ImportDiffEntry[];
  settingsChanges: { key: string; current: unknown; incoming: unknown }[];
  // The action that is actually applied per category: what the user asked,
  // except 'keep_current' when the file doesn't contain that category.
  effective: Record<BackupDataCategory, CategoryAction>;
  resolved: {
    program: Program | null;
    templates: ResolvedListCategory<SessionTemplate>;
    plannedSessions: ResolvedListCategory<PlannedSession>;
    sessionLogs: ResolvedListCategory<SessionLog>;
    trainingGoals: ResolvedListCategory<TrainingGoal>;
    goalMilestones: ResolvedListCategory<GoalMilestone>;
    goalMilestoneProgress: ResolvedListCategory<GoalMilestoneProgress>;
    capabilityEvidence: ResolvedListCategory<CapabilityEvidence>;
    injuryNotes: ResolvedListCategory<InjuryNote>;
    strengthProgramStrategies: ResolvedListCategory<StrengthProgramStrategy> | undefined;
    strengthProgramRecommendations: ResolvedListCategory<StrengthProgramRecommendation> | undefined;
    planChangeProposals: ResolvedListCategory<PlanChangeProposal> | undefined;
    settings: AppSettings | undefined;
    meta: Record<string, unknown>;
  };
}

function computeDiff(
  current: CurrentData,
  backup: NormalizedBackupData,
  categorySelections: Partial<Record<BackupDataCategory, CategoryAction>>,
  planPolicy: PlanPolicy | undefined,
): DiffResult {
  const diffByCategory: ImportDiffEntry[] = [];
  const requested: Record<BackupDataCategory, CategoryAction> = {
    program_and_templates: categorySelections.program_and_templates ?? 'keep_current',
    // An older plan could still carry 'replace' for history — logs are
    // append-only, so it can only ever mean merge.
    training_history: categorySelections.training_history === 'replace' ? 'merge' : (categorySelections.training_history ?? 'keep_current'),
    planned_schedule: resolvePlannedScheduleAction(planPolicy),
    objectives_and_milestones: categorySelections.objectives_and_milestones ?? 'keep_current',
    capability_evidence: categorySelections.capability_evidence ?? 'keep_current',
    injuries: categorySelections.injuries ?? 'keep_current',
    app_settings: categorySelections.app_settings ?? 'keep_current',
  };
  const effective = Object.fromEntries(
    ALL_CATEGORIES.map((c) => [c, backup.present[c] ? requested[c] : 'keep_current']),
  ) as Record<BackupDataCategory, CategoryAction>;
  const missing = (c: BackupDataCategory) => !backup.present[c] && requested[c] !== 'keep_current' && requested[c] !== 'ignore';

  const entry = (category: BackupDataCategory, parts: ResolvedListCategory<unknown & Keyed>[]): ImportDiffEntry => ({
    category,
    action: effective[category],
    toAdd: parts.reduce((n, p) => n + p.toAdd, 0),
    toReplace: parts.reduce((n, p) => n + p.toReplace, 0),
    toSkipDuplicate: parts.reduce((n, p) => n + p.toSkipDuplicate, 0),
    toRemove: parts.reduce((n, p) => n + p.toRemove, 0),
    missingInBackup: missing(category),
    conflicts: parts.flatMap((p) => p.conflicts),
  });

  const programAction = effective.program_and_templates;
  const templatesResolved = resolveListCategory(programAction, backup.templates, current.templates, true);
  const strategiesResolved = backup.strengthProgramStrategies
    ? resolveListCategory(programAction, backup.strengthProgramStrategies, current.strengthProgramStrategies, true)
    : undefined;
  const resolvedProgram = programAction === 'keep_current' || programAction === 'ignore'
    ? current.program
    : programAction === 'replace'
      ? (backup.program ?? current.program)
      : (current.program ?? backup.program); // merge: adopt backup's program only if there wasn't one already
  diffByCategory.push(entry('program_and_templates', [templatesResolved]));

  const historyAction = effective.training_history;
  const sessionLogsResolved = resolveListCategory(historyAction, backup.sessionLogs, current.sessionLogs, false);
  // Append-only audit trails travel with the history and only ever merge.
  const proposalsResolved = backup.planChangeProposals
    ? resolveListCategory(historyAction === 'merge' ? 'merge' : 'keep_current', backup.planChangeProposals, current.planChangeProposals, false)
    : undefined;
  const recommendationsResolved = backup.strengthProgramRecommendations
    ? resolveListCategory(historyAction === 'merge' ? 'merge' : 'keep_current', backup.strengthProgramRecommendations, current.strengthProgramRecommendations, false)
    : undefined;
  diffByCategory.push(entry('training_history', [sessionLogsResolved]));

  const scheduleAction = effective.planned_schedule;
  const plannedSessionsResolved = resolveListCategory(scheduleAction, backup.plannedSessions, current.plannedSessions, true);
  diffByCategory.push(entry('planned_schedule', [plannedSessionsResolved]));

  const goalsAction = effective.objectives_and_milestones;
  const trainingGoalsResolved = resolveListCategory(goalsAction, backup.trainingGoals, current.trainingGoals, true);
  const goalMilestonesResolved = resolveListCategory(goalsAction, backup.goalMilestones, current.goalMilestones, true);
  // Milestone progress is a record of what was actually cleared — append-
  // only like the logs, so even a goal 'replace' only ever merges it.
  const goalMilestoneProgressResolved = resolveListCategory(goalsAction === 'replace' ? 'merge' : goalsAction, backup.goalMilestoneProgress, current.goalMilestoneProgress, false);
  diffByCategory.push(entry('objectives_and_milestones', [trainingGoalsResolved, goalMilestonesResolved, goalMilestoneProgressResolved]));

  // Manual CapabilityEvidence rows are user-authored answers, not
  // append-only observed history — a conflicting id can be safely
  // overwritten by a newer answer on merge, same as InjuryNote.
  const capabilityEvidenceResolved = resolveListCategory(effective.capability_evidence, backup.capabilityEvidence, current.capabilityEvidence, true);
  diffByCategory.push(entry('capability_evidence', [capabilityEvidenceResolved]));

  const injuryNotesResolved = resolveListCategory(effective.injuries, backup.injuryNotes, current.injuryNotes, true);
  diffByCategory.push(entry('injuries', [injuryNotesResolved]));

  const settingsAction = effective.app_settings;
  const settingsChanges: { key: string; current: unknown; incoming: unknown }[] = [];
  let resolvedSettings: AppSettings | undefined;
  const meta: Record<string, unknown> = {};
  if (settingsAction === 'replace') {
    const incoming = mergeSettingsHistory(current.settings, backup.settings);
    resolvedSettings = { ...current.settings, ...incoming };
    for (const key of Object.keys(incoming) as (keyof AppSettings)[]) {
      if (!shallowEqual(current.settings[key], incoming[key])) {
        settingsChanges.push({ key, current: current.settings[key], incoming: incoming[key] });
      }
    }
    if (backup.goalEngineConfig) meta.goalEngineConfig = backup.goalEngineConfig;
    if (backup.adviceResponses) meta.adviceResponses = backup.adviceResponses;
  }
  diffByCategory.push({
    category: 'app_settings',
    action: settingsAction,
    toAdd: 0,
    toReplace: settingsChanges.length,
    toSkipDuplicate: 0,
    toRemove: 0,
    missingInBackup: missing('app_settings'),
    conflicts: [],
  });

  return {
    diffByCategory,
    settingsChanges,
    effective,
    resolved: {
      program: resolvedProgram,
      templates: templatesResolved,
      plannedSessions: plannedSessionsResolved,
      sessionLogs: sessionLogsResolved,
      trainingGoals: trainingGoalsResolved,
      goalMilestones: goalMilestonesResolved,
      goalMilestoneProgress: goalMilestoneProgressResolved,
      capabilityEvidence: capabilityEvidenceResolved,
      injuryNotes: injuryNotesResolved,
      strengthProgramStrategies: strategiesResolved,
      strengthProgramRecommendations: recommendationsResolved,
      planChangeProposals: proposalsResolved,
      settings: resolvedSettings,
      meta,
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
    objectives_and_milestones: backup.trainingGoals.length + backup.goalMilestones.length + backup.goalMilestoneProgress.length,
    capability_evidence: backup.capabilityEvidence.length,
    injuries: backup.injuryNotes.length,
    app_settings: Object.keys(backup.settings).length,
  };

  const ageMs = Date.now() - new Date(backup.createdAt).getTime();
  const restoreDateWarning =
    Number.isFinite(ageMs) && ageMs > THIRTY_DAYS_MS
      ? 'Deze back-up is meer dan 30 dagen oud. Je planning en instellingen gaan terug naar die stand.'
      : undefined;
  const logsSinceBackup = current.sessionLogs.filter((l) => l.completedAt > backup.createdAt).length;

  return {
    backupMeta: {
      createdAt: backup.createdAt,
      backupSchemaVersion: backup.sourceBackupSchemaVersion,
      recordCounts,
      hasTrainingPlan: backup.program !== null,
      isFromOlderVersion: backup.sourceBackupSchemaVersion < CURRENT_BACKUP_SCHEMA_VERSION,
      restoreDateWarning,
      logsSinceBackup,
      skippedInvalid: backup.skippedInvalid,
    },
    diffByCategory,
    settingsChanges,
  };
}

// --- plan & apply ---------------------------------------------------------

// Enough to undo the last few imports; older copies only cost storage
// (each one is the whole database).
const MAX_SNAPSHOTS = 5;

export async function listSnapshots(): Promise<PreImportSnapshot[]> {
  const all = await BackupSnapshotsRepo.getAll();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createPreImportSnapshot(): Promise<PreImportSnapshot> {
  const envelope = await buildBackupEnvelope();
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
  if (!snapshot) throw new Error('Deze kopie bestaat niet meer.');
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
      trainingGoals: listWrite(goalsAction, resolved.trainingGoals),
      goalMilestones: listWrite(goalsAction, resolved.goalMilestones),
      goalMilestoneProgress: touches(goalsAction) ? { clear: false, puts: resolved.goalMilestoneProgress.final } : undefined,
      capabilityEvidence: listWrite(effective.capability_evidence, resolved.capabilityEvidence),
      injuryNotes: listWrite(effective.injuries, resolved.injuryNotes),
      settings: resolved.settings,
      meta: Object.keys(resolved.meta).length > 0 ? resolved.meta : undefined,
    });
  } catch (err) {
    const detail = err instanceof Error ? ` (${err.message})` : '';
    throw new Error(`Importeren is mislukt. Er is niets gewijzigd.${detail}`);
  }
}

export { ALL_CATEGORIES };
