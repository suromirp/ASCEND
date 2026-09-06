import { describe, it, expect, beforeEach } from 'vitest';
import {
  wipeAllData,
  seedIfEmpty,
  resetScheduleToDefault,
  ProgramsRepo,
  PlannedSessionsRepo,
  SessionLogsRepo,
  InjuryNotesRepo,
  TrainingGoalsRepo,
  CapabilityEvidenceRepo,
} from './database';
import { mondayOfWeek, todayISO, addDays } from '../utils/dates';
import type { InjuryNote } from '../models/injury';
import type { TrainingGoal } from '../models/goals';
import type { CapabilityEvidence } from '../models/capability';

// Production incident: Settings' "SCHEMA OPNIEUW LADEN" called the
// full-factory-reset resetToDemoData(), silently wiping sessionLogs/
// injuryNotes/capabilityEvidence/trainingGoals along with the schedule.
// resetScheduleToDefault() replaces that wiring — these tests lock its
// actual contract: only programs/sessionTemplates/plannedSessions ever
// change, and even PlannedSessions are never touched once a SessionLog
// references them.
describe('resetScheduleToDefault', () => {
  beforeEach(async () => {
    await wipeAllData();
    await seedIfEmpty();
  });

  async function seedUnrelatedUserData() {
    const injury: InjuryNote = { id: 'inj1', date: todayISO(), bodyPart: 'Knie', severity: 'licht' };
    await InjuryNotesRepo.put(injury);

    const goal: TrainingGoal = {
      id: 'goal1',
      name: 'Test doel',
      requirements: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'paused',
    };
    await TrainingGoalsRepo.put(goal);

    const evidence: CapabilityEvidence = {
      id: 'ev1',
      key: { dimension: 'strength' },
      measured: { amount: 80, unit: 'kg' },
      date: todayISO(),
      evidenceType: 'manual',
      source: 'manualEntry',
    };
    await CapabilityEvidenceRepo.put(evidence);

    return { injury, goal, evidence };
  }

  it('never touches sessionLogs, injuryNotes, trainingGoals or capabilityEvidence', async () => {
    const { injury, goal, evidence } = await seedUnrelatedUserData();

    const sessions = await PlannedSessionsRepo.getAll();
    const todaySession = sessions.find((s) => s.scheduledDate === todayISO());
    expect(todaySession).toBeDefined();

    const log = {
      id: 'log1',
      plannedSessionId: todaySession!.id,
      templateId: todaySession!.templateId,
      type: 'strength' as const,
      completedDate: todayISO(),
      completedAt: new Date().toISOString(),
      variant: 'full' as const,
      durationMinutes: 45,
      source: 'manual' as const,
    };
    await SessionLogsRepo.put(log);

    await resetScheduleToDefault('next_week');

    expect(await SessionLogsRepo.getAll()).toEqual([log]);
    expect(await InjuryNotesRepo.getAll()).toEqual([injury]);
    expect(await TrainingGoalsRepo.getAll()).toEqual([goal]);
    expect(await CapabilityEvidenceRepo.getAll()).toEqual([evidence]);
  });

  it('never deletes a PlannedSession a SessionLog still references, even under the "this_week" (immediate) cutoff', async () => {
    const sessions = await PlannedSessionsRepo.getAll();
    const todaySession = sessions.find((s) => s.scheduledDate === todayISO());
    expect(todaySession).toBeDefined();

    await SessionLogsRepo.put({
      id: 'log1',
      plannedSessionId: todaySession!.id,
      templateId: todaySession!.templateId,
      type: 'strength',
      completedDate: todayISO(),
      completedAt: new Date().toISOString(),
      variant: 'full',
      durationMinutes: 45,
      source: 'manual',
    });

    await resetScheduleToDefault('this_week');

    const after = await PlannedSessionsRepo.getAll();
    expect(after.some((s) => s.id === todaySession!.id)).toBe(true);
  });

  it("'next_week' leaves the rest of the current week's schedule untouched and only regenerates from next Monday", async () => {
    const before = await PlannedSessionsRepo.getAll();
    const thisWeekIds = new Set(
      before.filter((s) => s.scheduledDate >= mondayOfWeek(todayISO()) && s.scheduledDate < addDays(mondayOfWeek(todayISO()), 7)).map((s) => s.id),
    );
    expect(thisWeekIds.size).toBeGreaterThan(0);

    await resetScheduleToDefault('next_week');

    const after = await PlannedSessionsRepo.getAll();
    const afterIds = new Set(after.map((s) => s.id));
    for (const id of thisWeekIds) {
      expect(afterIds.has(id)).toBe(true);
    }
    // Next week onward was regenerated with fresh ids from the standard rotation.
    const nextMonday = addDays(mondayOfWeek(todayISO()), 7);
    expect(after.some((s) => s.scheduledDate >= nextMonday)).toBe(true);
  });

  it("'this_week' regenerates today onward (any unlogged session there gets replaced)", async () => {
    await resetScheduleToDefault('this_week');
    const program = (await ProgramsRepo.getAll())[0];
    expect(program.startDate).toBe(mondayOfWeek(todayISO()));

    const after = await PlannedSessionsRepo.getAll();
    expect(after.some((s) => s.scheduledDate === todayISO())).toBe(true);
  });
});
