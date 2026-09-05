// ASCEND — Backup / Import / Restore domain types
//
// Implements ASCEND Technical Architecture v0.3.2's backup/import/restore
// design, scoped to what actually exists in the app today — there is no
// TrainingGoal/GoalMilestone/TrainingPrescription yet, those land with the
// goal engine in a later phase. The envelope/versioned-payload shape is
// deliberately built so a V2 payload (once the goal engine ships) can be
// added as one more union member without redesigning this file, and so
// PlanPolicy can grow a 'recalculate_plan' option later the same way.
//
// Lives under storage/, not models/, on purpose: this is a serialization
///persistence-schema concern, not a core domain concept — models/ has no
// IndexedDB-shaped types today (AppSettings itself lives in
// storage/database.ts for the same reason), and this file already needs to
// import that type.

import type { Program } from '../models/program';
import type { SessionTemplate, PlannedSession, SessionLog } from '../models/training';
import type { Objective, MilestoneProgress } from '../models/objectives';
import type { InjuryNote } from '../models/injury';
import type { AppSettings } from './database';

// --- Backup envelope & versioned payload -----------------------------------

export const CURRENT_BACKUP_SCHEMA_VERSION = 1;

export interface AscendBackupPayloadV1 {
  version: 1;
  program: Program | null;
  templates: SessionTemplate[];
  plannedSessions: PlannedSession[];
  sessionLogs: SessionLog[];
  objectives: Objective[];
  milestoneProgress: MilestoneProgress[];
  injuryNotes: InjuryNote[];
  settings: AppSettings;
}

export type AscendBackupPayload = AscendBackupPayloadV1;

export interface AscendBackupEnvelope {
  backupSchemaVersion: number;
  appVersion?: string;
  createdAt: string;
  payload: AscendBackupPayload;
}

// The common shape every source version normalizes into — the only shape
// the rest of the import pipeline (diff/preview/plan/apply) ever operates
// on. Distinct from AscendBackupPayloadV1 mainly so a future V2 normalizer
// has somewhere to converge to without this type itself needing to change.
export interface NormalizedBackupData {
  createdAt: string;
  // 0 means the source was a pre-v0.3.2 legacy AscendExport file (no
  // envelope at all) — distinct from a real backupSchemaVersion, which
  // starts at 1. Only used for ImportPreview.backupMeta.isFromOlderVersion.
  sourceBackupSchemaVersion: number;
  program: Program | null;
  templates: SessionTemplate[];
  plannedSessions: PlannedSession[];
  sessionLogs: SessionLog[];
  objectives: Objective[];
  milestoneProgress: MilestoneProgress[];
  injuryNotes: InjuryNote[];
  settings: Partial<AppSettings>;
}

// --- Data categories ---------------------------------------------------------

export type BackupDataCategory =
  | 'program_and_templates'
  | 'training_history'
  | 'planned_schedule'
  | 'objectives_and_milestones'
  | 'injuries'
  | 'app_settings';

export const ALL_CATEGORIES: BackupDataCategory[] = [
  'program_and_templates',
  'training_history',
  'planned_schedule',
  'objectives_and_milestones',
  'injuries',
  'app_settings',
];

export const CATEGORY_LABEL: Record<BackupDataCategory, string> = {
  program_and_templates: 'Trainingsschema (templates)',
  training_history: 'Trainingsgeschiedenis',
  planned_schedule: 'Huidige planning',
  objectives_and_milestones: 'Doelen en mijlpalen',
  injuries: 'Blessures',
  app_settings: 'Instellingen',
};

export type CategoryAction = 'keep_current' | 'merge' | 'replace' | 'ignore';

// --- Import modes & plan policy ----------------------------------------------

export type ImportMode = 'full_restore' | 'merge' | 'custom';

// 'recalculate_plan' deliberately doesn't exist yet — it depends on the
// goal-engine recompute pipeline (a later phase). Adding it later only
// means one more union member and one more UI option; nothing here needs
// to change shape.
export type PlanPolicy = 'keep_current_plan' | 'restore_backup_plan';

// --- Diff, preview, plan ------------------------------------------------------

export interface ImportConflict {
  id: string;
  reason: string;
}

export interface ImportDiffEntry {
  category: BackupDataCategory;
  action: CategoryAction;
  toAdd: number;
  toReplace: number;
  toSkipDuplicate: number;
  conflicts: ImportConflict[];
}

export interface ImportPreview {
  backupMeta: {
    createdAt: string;
    backupSchemaVersion: number;
    recordCounts: Partial<Record<BackupDataCategory, number>>;
    hasTrainingPlan: boolean;
    isFromOlderVersion: boolean;
    restoreDateWarning?: string;
  };
  diffByCategory: ImportDiffEntry[];
  settingsChanges: { key: string; current: unknown; incoming: unknown }[];
}

export interface ImportPlan {
  id: string;
  sourceBackupSchemaVersion: number;
  backupCreatedAt: string;
  mode: ImportMode;
  categorySelections: Partial<Record<BackupDataCategory, CategoryAction>>;
  planPolicy?: PlanPolicy;
  conflicts: ImportConflict[];
  preImportSnapshotId: string;
  approvedAt: string;
}

// --- Pre-import snapshot -------------------------------------------------------

export interface PreImportSnapshot {
  id: string;
  createdAt: string;
  envelope: AscendBackupEnvelope;
  reason: 'pre_import';
  relatedImportPlanId?: string;
}

// --- File adapter boundary ------------------------------------------------------
// Core/application code only ever talks to this interface — never to
// window.showDirectoryPicker/showSaveFilePicker/<input type=file> directly.
// Keeps the import/backup domain logic platform-agnostic (v0.3.1's
// Platform & Deployment Architecture): a future AndroidBackupFileAdapter /
// iOSBackupFileAdapter implements the same interface without any of the
// code in backupImport.ts changing.

export interface SaveResult {
  success: boolean;
  savedTo?: string;
}

export interface PickedBackupFile {
  name: string;
  readText(): Promise<string>;
}

export interface BackupFileAdapter {
  saveBackup(data: Blob, suggestedName: string): Promise<SaveResult>;
  pickBackupFile(): Promise<PickedBackupFile | null>;
  supportsPreferredDirectory(): boolean;
  choosePreferredDirectory?(): Promise<void>;
  hasPreferredDirectory?(): Promise<boolean>;
}
