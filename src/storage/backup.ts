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

export { buildBackupEnvelope, backupFileName } from './backupExport';
export type { BuildEnvelopeOptions } from './backupExport';
export { normalizeBackupToCurrentModel, parseBackupText } from './backupNormalize';
export { CATEGORY_SUPPORTED_ACTIONS, defaultActionsForMode, defaultPlanPolicyForMode } from './backupMerge';
export { fixedSportImportNote, buildImportPreview } from './backupPreview';
export { listSnapshots, createPreImportSnapshot, restoreSnapshot, createImportPlan, applyImportPlan } from './backupApply';
export { BackupMessageError, backupErrorText } from './backupMessage';
export { ALL_CATEGORIES } from './backupTypes';
