import { describe, it, expect } from 'vitest';
import { logSatisfiesRequirement, requirementAutoSatisfied, computeObjectiveProgress } from './progression';
import type { Objective, MilestoneRequirement } from '../models/objectives';
import type { SessionLog } from '../models/training';

// Locks in the current milestone-completion model: any single log that
// meets a requirement clears it (no confidence/repeatable-anchor concept
// exists yet — this is the exact behavior the future Capability Engine
// audit in v0.3/v0.3.1 is measured against, not an idealized target).

function log(overrides: Partial<SessionLog> = {}): SessionLog {
  return {
    id: 'l1',
    templateId: 'tpl_x',
    type: 'hiking',
    completedDate: '2026-09-10',
    completedAt: '2026-09-10T10:00:00.000Z',
    variant: 'full',
    durationMinutes: 60,
    source: 'manual',
    ...overrides,
  };
}

describe('logSatisfiesRequirement', () => {
  it('duration: matches type and minimum minutes', () => {
    const req: MilestoneRequirement = { kind: 'duration', activityType: 'hiking', minMinutes: 60 };
    expect(logSatisfiesRequirement(log({ durationMinutes: 60 }), req)).toBe(true);
    expect(logSatisfiesRequirement(log({ durationMinutes: 59 }), req)).toBe(false);
    expect(logSatisfiesRequirement(log({ type: 'cardio', durationMinutes: 90 }), req)).toBe(false);
  });

  it('elevation: gain and optional loss both required', () => {
    const req: MilestoneRequirement = { kind: 'elevation', minMeters: 500, minLossMeters: 500 };
    expect(logSatisfiesRequirement(log({ outdoorData: { durationMinutes: 60, elevationGainM: 500, elevationLossM: 500, source: 'manual' } }), req)).toBe(true);
    expect(logSatisfiesRequirement(log({ outdoorData: { durationMinutes: 60, elevationGainM: 500, elevationLossM: 100, source: 'manual' } }), req)).toBe(false);
  });

  it('distance: uses outdoor or cardio distance', () => {
    const req: MilestoneRequirement = { kind: 'distance', minKm: 15 };
    expect(logSatisfiesRequirement(log({ outdoorData: { durationMinutes: 60, distanceKm: 15, source: 'manual' } }), req)).toBe(true);
    expect(logSatisfiesRequirement(log({ cardioData: { durationMinutes: 60, distanceKm: 20, source: 'manual' } }), req)).toBe(true);
    expect(logSatisfiesRequirement(log({}), req)).toBe(false);
  });

  it('backpack: weight and optional distance both required', () => {
    const req: MilestoneRequirement = { kind: 'backpack', minWeightKg: 12, minKm: 15 };
    expect(logSatisfiesRequirement(log({ outdoorData: { durationMinutes: 60, backpackWeightKg: 12, distanceKm: 15, source: 'manual' } }), req)).toBe(true);
    expect(logSatisfiesRequirement(log({ outdoorData: { durationMinutes: 60, backpackWeightKg: 8, distanceKm: 15, source: 'manual' } }), req)).toBe(false);
  });

  it('manual requirements are never auto-satisfied by a log', () => {
    expect(logSatisfiesRequirement(log(), { kind: 'manual' })).toBe(false);
  });
});

describe('requirementAutoSatisfied — consecutiveDays', () => {
  it('is true once enough distinct non-recovery training dates run back to back', () => {
    const logs = [
      log({ completedDate: '2026-09-08', type: 'cardio' }),
      log({ completedDate: '2026-09-09', type: 'hiking' }),
    ];
    expect(requirementAutoSatisfied({ kind: 'consecutiveDays', days: 2 }, logs)).toBe(true);
  });

  it('is false when the streak is broken', () => {
    const logs = [
      log({ completedDate: '2026-09-08', type: 'cardio' }),
      log({ completedDate: '2026-09-10', type: 'hiking' }),
    ];
    expect(requirementAutoSatisfied({ kind: 'consecutiveDays', days: 2 }, logs)).toBe(false);
  });

  it('does not count recovery sessions toward the streak', () => {
    const logs = [
      log({ completedDate: '2026-09-08', type: 'cardio' }),
      log({ completedDate: '2026-09-09', type: 'recovery' }),
    ];
    expect(requirementAutoSatisfied({ kind: 'consecutiveDays', days: 2 }, logs)).toBe(false);
  });
});

describe('computeObjectiveProgress', () => {
  const objective: Objective = {
    id: 'obj_test',
    name: 'Test Ladder',
    milestones: [
      { id: 'm1', objectiveId: 'obj_test', order: 1, title: 'First', requirement: { kind: 'duration', activityType: 'hiking', minMinutes: 30 } },
      { id: 'm2', objectiveId: 'obj_test', order: 2, title: 'Second', requirement: { kind: 'duration', activityType: 'hiking', minMinutes: 90 } },
      { id: 'm3', objectiveId: 'obj_test', order: 3, title: 'Third', requirement: { kind: 'manual' } },
    ],
  };

  it('marks the first not-yet-completed milestone as current, the next as upcoming, the rest as future', () => {
    const progress = computeObjectiveProgress(objective, [], []);
    expect(progress.milestones.map((m) => m.status)).toEqual(['current', 'upcoming', 'future']);
    expect(progress.completedCount).toBe(0);
    expect(progress.currentMilestone?.definition.id).toBe('m1');
  });

  it('auto-clears a milestone from log history even without an explicit MilestoneProgress row', () => {
    const logs = [log({ type: 'hiking', durationMinutes: 30 })];
    const progress = computeObjectiveProgress(objective, [], logs);
    expect(progress.milestones[0].status).toBe('completed');
    expect(progress.milestones[1].status).toBe('current');
    expect(progress.completedCount).toBe(1);
  });

  it('clearing an out-of-order milestone does not surface it as completed while an earlier one is still open', () => {
    // Real, slightly surprising current behavior worth locking in: the
    // "first incomplete = current" pass unconditionally overwrites every
    // later milestone's derived status to upcoming/future, even one with
    // its own MilestoneProgress row — order in the ladder always wins over
    // an out-of-sequence manual clear for what's *displayed*, though the
    // underlying MilestoneProgress row is untouched (append-only history is
    // never lost, only the view-model's status for it here).
    const progress = computeObjectiveProgress(
      objective,
      [{ id: 'p1', objectiveId: 'obj_test', milestoneId: 'm3', clearedDate: '2026-09-10' }],
      [],
    );
    expect(progress.milestones.map((m) => m.status)).toEqual(['current', 'upcoming', 'future']);
    expect(progress.completedCount).toBe(0);
  });
});
