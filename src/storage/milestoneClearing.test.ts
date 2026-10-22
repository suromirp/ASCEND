import { describe, it, expect, beforeEach } from 'vitest';
import { wipeAllData, TrainingGoalsRepo, GoalMilestonesRepo, GoalMilestoneProgressRepo, SessionLogsRepo } from './database';
import { recordClearedMilestones } from './milestoneClearing';
import type { SessionLog } from '../models/training';

const goal = {
  id: 'g1', name: 'Testdoel', requirements: [],
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  status: 'active' as const, targetDate: '2027-06-01',
};

const log = (id: string, date: string, km: number): SessionLog => ({
  id, templateId: 't', type: 'hiking', completedDate: date, completedAt: `${date}T10:00:00.000Z`,
  variant: 'full', durationMinutes: 90, source: 'manual', outdoorData: { distanceKm: km, durationMinutes: 90, source: 'manual' },
});

describe('recordClearedMilestones', () => {
  beforeEach(async () => {
    await wipeAllData();
    await TrainingGoalsRepo.put(goal);
    await GoalMilestonesRepo.put({ id: 'm1', goalId: 'g1', order: 1, title: 'Vijf kilometer', requirement: { kind: 'distance', minKm: 5 } });
    await GoalMilestonesRepo.put({ id: 'm2', goalId: 'g1', order: 2, title: 'Tien kilometer', requirement: { kind: 'distance', minKm: 10 } });
  });

  async function save(l: SessionLog) {
    await SessionLogsRepo.put(l);
    return recordClearedMilestones(l);
  }

  it('records the milestone a log clears, with the log that cleared it', async () => {
    expect(await save(log('a', '2026-10-20', 6))).toBe('Vijf kilometer');
    expect(await GoalMilestoneProgressRepo.getAll()).toEqual([expect.objectContaining({ goalId: 'g1', milestoneId: 'm1', clearedDate: '2026-10-20', sourceSessionLogId: 'a' })]);
  });

  it('writes nothing when the log does not clear the front of the ladder', async () => {
    expect(await save(log('a', '2026-10-20', 3))).toBeUndefined();
    expect(await GoalMilestoneProgressRepo.getAll()).toEqual([]);
  });

  it('never writes a second line for a milestone that already has one, when logs follow each other', async () => {
    expect(await save(log('a', '2026-10-20', 6))).toBe('Vijf kilometer');
    // The second one also qualifies for the first milestone, which is cleared by now.
    expect(await save(log('b', '2026-10-21', 6))).toBeUndefined();
    const rows = await GoalMilestoneProgressRepo.getAll();
    expect(rows.filter((r) => r.milestoneId === 'm1')).toHaveLength(1);
    expect(rows).toHaveLength(1);
  });

  it('moves on to the next milestone when the next log clears it', async () => {
    await save(log('a', '2026-10-20', 6));
    expect(await save(log('b', '2026-10-21', 11))).toBe('Tien kilometer');
    expect((await GoalMilestoneProgressRepo.getAll()).map((r) => r.milestoneId).sort()).toEqual(['m1', 'm2']);
  });
});
