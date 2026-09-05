// ASCEND — pure Objective/AppSettings -> goal-engine transforms
//
// Kept separate from storage/goalMigration.ts (which only orchestrates
// reading/writing IndexedDB) so the exact same transform can also be used
// by storage/backup.ts to correctly restore a pre-Phase-1 backup — without
// this, restoring an old export would silently lose GR5/marathon goal data
// migrated on the original device. Pure functions, no IndexedDB — matches
// the platform-agnostic-core boundary (Technical Architecture v0.3.1
// REVISED, Platform & Deployment Architecture).
//
// Deliberately takes plain parameters rather than AppSettings (which lives
// in storage/database.ts) — engine/ never imports from storage/.

import type { Objective, MilestoneProgress } from '../models/objectives';
import type { TrainingGoal, GoalMilestone, GoalMilestoneProgress } from '../models/goals';
import { makeId } from '../utils/id';

// One-time id remap (Technical Architecture v0.3.1 REVISED, Migration
// plan) — stable semantic ids. Order matches
// data/defaultProgram.ts#buildObjective()'s milestone order exactly
// (obj_gr5_m1..m12).
export const LEGACY_MILESTONE_ID_MAP: Record<string, string> = {
  obj_gr5_m1: 'ms_gr5_easy_run_40min',
  obj_gr5_m2: 'ms_gr5_bergconditie_60min',
  obj_gr5_m3: 'ms_gr5_wandeling_15km',
  obj_gr5_m4: 'ms_gr5_dplus_300',
  obj_gr5_m5: 'ms_gr5_dplus_500',
  obj_gr5_m6: 'ms_gr5_dplus_750',
  obj_gr5_m7: 'ms_gr5_dplus_1000_descent',
  obj_gr5_m8: 'ms_gr5_15km_1000dplus',
  obj_gr5_m9: 'ms_gr5_rugzaksessie',
  obj_gr5_m10: 'ms_gr5_twee_dagen',
  obj_gr5_m11: 'ms_gr5_weekend_simulatie',
  obj_gr5_m12: 'ms_gr5_klaar',
};

export interface MigratedGr5Data {
  goal: TrainingGoal;
  milestones: GoalMilestone[];
  progress: GoalMilestoneProgress[];
}

export function migrateGr5ObjectiveData(objective: Objective, legacyProgress: MilestoneProgress[]): MigratedGr5Data {
  const now = new Date().toISOString();
  const requirements: TrainingGoal['requirements'] = objective.targetDistanceKm
    ? [{ id: makeId('req'), kind: 'distance', scope: 'TOTAL_EVENT', target: { amount: objective.targetDistanceKm, unit: 'km' } }]
    : [];

  const goal: TrainingGoal = objective.targetDate
    ? { id: objective.id, name: objective.name, requirements, createdAt: now, updatedAt: now, status: 'active', targetDate: objective.targetDate }
    : { id: objective.id, name: objective.name, requirements, createdAt: now, updatedAt: now, status: 'paused' };

  const milestones: GoalMilestone[] = objective.milestones.map((m) => ({
    id: LEGACY_MILESTONE_ID_MAP[m.id] ?? m.id,
    goalId: objective.id,
    order: m.order,
    title: m.title,
    requirement: m.requirement,
  }));

  const progress: GoalMilestoneProgress[] = legacyProgress
    .filter((p) => p.objectiveId === objective.id)
    .map((p) => ({
      id: p.id,
      goalId: p.objectiveId,
      milestoneId: LEGACY_MILESTONE_ID_MAP[p.milestoneId] ?? p.milestoneId,
      clearedDate: p.clearedDate,
      sourceSessionLogId: p.sourceSessionLogId,
      note: p.note,
    }));

  return { goal, milestones, progress };
}

const RACE_DISTANCE_KM: Record<'half' | 'full', number> = { half: 21.1, full: 42.2 };

export function buildMarathonGoal(
  marathonRaceType: 'half' | 'full' | undefined,
  marathonTargetDate: string | undefined,
  marathonTargetTimeMinutes: number | undefined,
): TrainingGoal | null {
  if (!marathonRaceType) return null;

  const now = new Date().toISOString();
  const requirements: TrainingGoal['requirements'] = [
    { id: makeId('req'), kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: RACE_DISTANCE_KM[marathonRaceType], unit: 'km' }, discipline: 'running' },
  ];
  if (marathonTargetTimeMinutes !== undefined) {
    requirements.push({ id: makeId('req'), kind: 'targetTime', scope: 'SINGLE_EVENT', target: { amount: marathonTargetTimeMinutes, unit: 'min' }, discipline: 'running' });
  }

  return marathonTargetDate
    ? { id: makeId('goal'), name: 'Marathon', requirements, createdAt: now, updatedAt: now, status: 'active', targetDate: marathonTargetDate }
    : { id: makeId('goal'), name: 'Marathon', requirements, createdAt: now, updatedAt: now, status: 'paused' };
}
