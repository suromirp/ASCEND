// Het schema van de database, de upgrade per versie en het openen.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Program } from '../models/program';
import type { SessionTemplate, PlannedSession, SessionLog } from '../models/training';
import type { Objective, MilestoneProgress } from '../models/objectives';
import type { RecoveryMetric, BodyMetric, NutritionMetric } from '../models/metrics';
import type { InjuryNote } from '../models/injury';
import type { TrainingGoal, GoalMilestone, GoalMilestoneProgress } from '../models/goals';
import type { TrainingPrescription } from '../models/prescription';
import type { PlanChangeProposal } from '../models/planChange';
import type { StrengthProgramStrategy, StrengthProgramRecommendation } from '../models/strengthProgram';
import type { WeeklyPrescription } from '../models/weeklyPrescription';
import type { CapabilityEvidence } from '../models/capability';
import type { PreImportSnapshot } from './backupTypes';
import type { ActivityStreams } from '../models/activityStreams';
import { whenStorageOpen } from './lifecycle';

export const SCHEMA_VERSION = 1;
const DB_NAME = 'ascend-db';
const DB_VERSION = 9;

export interface AscendDB extends DBSchema {
  meta: { key: string; value: unknown };
  programs: { key: string; value: Program };
  sessionTemplates: { key: string; value: SessionTemplate };
  plannedSessions: { key: string; value: PlannedSession; indexes: { 'by-week': string; 'by-date': string } };
  sessionLogs: { key: string; value: SessionLog; indexes: { 'by-date': string } };
  // Legacy — kept, not deleted, so a pre-goal-engine export still imports
  // cleanly. Emptied by storage/goalMigration.ts once trainingGoals/
  // goalMilestones/goalMilestoneProgress take over as the live source.
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
  // --- Goal engine foundation (Technical Architecture v0.3.1 REVISED, Phase 1) ---
  trainingGoals: { key: string; value: TrainingGoal };
  goalMilestones: { key: string; value: GoalMilestone; indexes: { 'by-goal': string } };
  goalMilestoneProgress: { key: string; value: GoalMilestoneProgress; indexes: { 'by-goal': string } };
  trainingPrescriptions: { key: string; value: TrainingPrescription; indexes: { 'by-plannedSession': string } };
  // --- Capability & Demand (Technical Architecture v0.3.1 REVISED, Phase 2) ---
  // Manual-entry rows ONLY (Storage plan) — direct/derived/proxy evidence
  // computed from SessionLog[] (engine/capability.ts#extractEvidenceFromLogs)
  // stays a derived read model, never duplicated into storage.
  capabilityEvidence: { key: string; value: CapabilityEvidence };
  // --- Rolling adaptation (Technical Architecture v0.3.1 REVISED, Phase 6) ---
  // Storage plan's own "Audit trail of shown proposals + resolution" —
  // append-only in practice: every id is fresh (makeId), nothing in this
  // codebase ever calls put() twice for the same id, and no delete is
  // exposed. Every PlanChangeProposal the Adaptive Replanner actually
  // applies to the forecast range is recorded here, resolvedAt/resolution
  // already set (auto-applied, not user-confirmed) — the same record a
  // future committed-range Proposal Engine flow would write once a
  // proposal is accepted there too.
  planChangeProposals: { key: string; value: PlanChangeProposal };
  // --- Strength Program Strategy (Strength Program Strategy Addendum v0.1,
  // Phase 8) --- ASCEND owns block strategy/frequency/split/placement;
  // MacroFactor Workouts (or a future provider) keeps owning exercise-level
  // content. One row per strength-training block (not per workout) —
  // historical blocks are kept, not overwritten, mirroring
  // planChangeProposals' own append-only-in-spirit pattern.
  strengthProgramStrategies: { key: string; value: StrengthProgramStrategy };
  // Append-only suggestions (§5: "a review is a suggestion, not an
  // automatic rewrite") — no delete exposed, same pattern as
  // planChangeProposals.
  strengthProgramRecommendations: { key: string; value: StrengthProgramRecommendation };
  // --- Weekly Prescription Builder (WAT vóór WAAR architecture pass) ---
  // One CURRENT row per week (old row deleted, new one put on each
  // recompute) — NOT append-only: the audit trail of WHY a week's
  // composition changed lives in planChangeProposals (trigger
  // 'weekly_prescription_computed'), never duplicated here.
  weeklyPrescriptions: { key: string; value: WeeklyPrescription; indexes: { 'by-week': string } };
  // --- Run in detail (version 9) ---
  // The full series of a run or tocht, packed as binary numbers, one row per log (key: the id
  // of the log). Apart from sessionLogs on purpose: loading all logs at every start stays as
  // fast as it was, and a series can go without a log losing anything. The track is never in
  // it. They travel in the backup file (default on, base64) but not in the snapshots taken
  // before an import (models/activityStreams.ts,
  // docs/beslissingen/2026-10-27-run-in-detail-gegevens.md).
  activityStreams: { key: string; value: ActivityStreams };
}

let dbPromise: Promise<IDBPDatabase<AscendDB>> | null = null;

// While the app is out of view (or frozen), no new transaction starts: a frozen
// ASCEND with an open transaction would hold the storage for every other
// ASCEND (storage/lifecycle.ts). The caller simply waits until it is back.
export async function getDB(): Promise<IDBPDatabase<AscendDB>> {
  await whenStorageOpen();
  return openDatabase();
}

function openDatabase(): Promise<IDBPDatabase<AscendDB>> {
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
        if (!db.objectStoreNames.contains('trainingGoals')) db.createObjectStore('trainingGoals', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('goalMilestones')) {
          const store = db.createObjectStore('goalMilestones', { keyPath: 'id' });
          store.createIndex('by-goal', 'goalId');
        }
        if (!db.objectStoreNames.contains('goalMilestoneProgress')) {
          const store = db.createObjectStore('goalMilestoneProgress', { keyPath: 'id' });
          store.createIndex('by-goal', 'goalId');
        }
        if (!db.objectStoreNames.contains('trainingPrescriptions')) {
          const store = db.createObjectStore('trainingPrescriptions', { keyPath: 'id' });
          store.createIndex('by-plannedSession', 'plannedSessionId');
        }
        if (!db.objectStoreNames.contains('capabilityEvidence')) db.createObjectStore('capabilityEvidence', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('planChangeProposals')) db.createObjectStore('planChangeProposals', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('strengthProgramStrategies')) db.createObjectStore('strengthProgramStrategies', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('strengthProgramRecommendations')) db.createObjectStore('strengthProgramRecommendations', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('weeklyPrescriptions')) {
          const store = db.createObjectStore('weeklyPrescriptions', { keyPath: 'id' });
          store.createIndex('by-week', 'weekStartDate');
        }
        // Version 9: only a new store; nothing that exists is touched.
        if (!db.objectStoreNames.contains('activityStreams')) db.createObjectStore('activityStreams', { keyPath: 'logId' });
      },
      // Another ASCEND window was updated to a newer DB version: close this
      // connection so that upgrade can finish, and reload into the new
      // version instead of running old code against a changed database.
      blocking() {
        void dbPromise?.then((db) => db.close());
        dbPromise = null;
        if (typeof window !== 'undefined') window.location.reload();
      },
      // This window is the newer one, waiting for an old one to let go.
      blocked() {
        dbBlockedListeners.forEach((fn) => fn());
      },
      // The browser closed the connection by itself (Android can do that to an
      // app in the background, or when storage is cleared): the next call opens
      // a fresh one instead of using the closed connection.
      terminated() {
        dbPromise = null;
      },
    });
  }
  return dbPromise;
}

const dbBlockedListeners = new Set<() => void>();
export function onDatabaseBlocked(fn: () => void): () => void {
  dbBlockedListeners.add(fn);
  return () => dbBlockedListeners.delete(fn);
}
