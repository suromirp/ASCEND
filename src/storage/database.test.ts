import { describe, it, expect, beforeEach } from 'vitest';
import {
  wipeAllData,
  seedIfEmpty,
  resetScheduleToDefault,
  resetToDemoData,
  restartProgramAtWeekOne,
  rebuildPlanningFromWeekOne,
  restorePatternSessionsRemovedByPrescription,
  PlanChangeProposalsRepo,
  ProgramsRepo,
  PlannedSessionsRepo,
  SessionLogsRepo,
  InjuryNotesRepo,
  TrainingGoalsRepo,
  CapabilityEvidenceRepo,
  WeeklyPrescriptionsRepo,
  SettingsRepo,
  GoalMilestonesRepo,
  syncProgramHorizon,
} from './database';
import { migrateToGoalEngine } from './goalMigration';
import { mondayOfWeek, todayISO, addDays } from '../utils/dates';
import type { InjuryNote } from '../models/injury';
import type { TrainingGoal } from '../models/goals';
import type { CapabilityEvidence } from '../models/capability';
import type { WeeklyPrescription } from '../models/weeklyPrescription';

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

// Weekly Prescription Builder — one current row per week, indexed by
// weekStartDate (DB_VERSION 7->8).
describe('WeeklyPrescriptionsRepo', () => {
  beforeEach(async () => {
    await wipeAllData();
    await seedIfEmpty();
  });

  function prescription(overrides: Partial<WeeklyPrescription> & { id: string; weekStartDate: string }): WeeklyPrescription {
    return {
      lines: [],
      skeletonSignature: 'sig',
      consecutiveKeepWeeks: 0,
      reviewDue: false,
      specificityRampBand: 'base',
      goalSnapshot: [],
      generatedBy: ['test'],
      computedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  it('round-trips a row and reads it back by week', async () => {
    const row = prescription({ id: 'wp1', weekStartDate: '2026-09-21' });
    await WeeklyPrescriptionsRepo.put(row);

    expect(await WeeklyPrescriptionsRepo.byWeekStartDate('2026-09-21')).toEqual(row);
    expect(await WeeklyPrescriptionsRepo.getAll()).toEqual([row]);
  });

  it('delete removes exactly the targeted row', async () => {
    await WeeklyPrescriptionsRepo.put(prescription({ id: 'wp1', weekStartDate: '2026-09-21' }));
    await WeeklyPrescriptionsRepo.put(prescription({ id: 'wp2', weekStartDate: '2026-09-28' }));
    await WeeklyPrescriptionsRepo.delete('wp1');

    const remaining = await WeeklyPrescriptionsRepo.getAll();
    expect(remaining.map((r) => r.id)).toEqual(['wp2']);
  });

  it('wipeAllData clears the store', async () => {
    await WeeklyPrescriptionsRepo.put(prescription({ id: 'wp1', weekStartDate: '2026-09-21' }));
    await wipeAllData();
    expect(await WeeklyPrescriptionsRepo.getAll()).toEqual([]);
  });
});

// Production incident: a full "reset alles" left the user with a Marathon
// goal stuck in status:'paused' — invisible to Goal Focus/scheduling but
// still rendered on its card as if fully configured. Root cause:
// resetToDemoData cleared trainingGoals but left settings.marathonRaceType/
// marathonTargetDate in place — a second, shadow pointer into that same
// goal. The next migrateToGoalEngine() run (goalEngineMigrated is unset by
// the reset) read those stale settings straight back out and silently
// re-minted the exact goal the user believed they'd wiped.
describe('resetToDemoData', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('clears the marathon settings fields too, so the next migration does not resurrect a stale goal', async () => {
    await seedIfEmpty();
    await SettingsRepo.set({ marathonRaceType: 'half' }); // race type picked, no targetDate — mirrors the incident
    await migrateToGoalEngine();

    const beforeReset = await TrainingGoalsRepo.getAll();
    expect(beforeReset.some((g) => g.name === 'Marathon' && g.status === 'paused')).toBe(true);

    await resetToDemoData();

    const settingsAfterReset = await SettingsRepo.get();
    expect(settingsAfterReset.marathonRaceType).toBeUndefined();
    expect(settingsAfterReset.marathonTargetDate).toBeUndefined();
    expect(settingsAfterReset.marathonTargetTimeMinutes).toBeUndefined();

    // The real regression: resetToDemoData unsets goalEngineMigrated, so
    // the very next migration run must not resurrect the goal from
    // leftover settings.
    await migrateToGoalEngine();
    const afterReset = await TrainingGoalsRepo.getAll();
    expect(afterReset.some((g) => g.name === 'Marathon')).toBe(false);
  });
});

describe('restartProgramAtWeekOne', () => {
  beforeEach(async () => {
    await wipeAllData();
    await seedIfEmpty();
  });

  it('makes this week week 1 without deleting or moving anything already planned', async () => {
    const [program] = await ProgramsRepo.getAll();
    await ProgramsRepo.put({ ...program, startDate: addDays(mondayOfWeek(todayISO()), -7) }); // user is "in week 2"
    const before = await PlannedSessionsRepo.getAll();

    await restartProgramAtWeekOne('this_week');

    const [after] = await ProgramsRepo.getAll();
    expect(after.startDate).toBe(mondayOfWeek(todayISO()));
    const sessions = await PlannedSessionsRepo.getAll();
    const byId = new Map(sessions.map((s) => [s.id, s]));
    for (const s of before) expect(byId.get(s.id)).toEqual(s);
    // the program's last week (now one week later) gets its sessions
    const totalWeeks = after.phases.reduce((sum, p) => sum + p.weekCount, 0);
    const lastWeek = addDays(after.startDate, (totalWeeks - 1) * 7);
    expect(sessions.some((s) => s.weekStartDate === lastWeek)).toBe(true);
  });

  it('can start week 1 next week', async () => {
    await restartProgramAtWeekOne('next_week');
    const [after] = await ProgramsRepo.getAll();
    expect(after.startDate).toBe(addDays(mondayOfWeek(todayISO()), 7));
  });
});

describe('rebuildPlanningFromWeekOne (schone start)', () => {
  beforeEach(async () => {
    await wipeAllData();
    await seedIfEmpty();
  });

  it('drops a session the user moved, keeps logged history, and leaves out switched-off sports', async () => {
    const tomorrow = addDays(todayISO(), 1);
    const future = (await PlannedSessionsRepo.getAll()).filter((s) => s.scheduledDate >= tomorrow);
    const moved = { ...future[0], scheduledDate: addDays(future[0].scheduledDate, 1), status: 'moved' as const, movedFromDate: future[0].scheduledDate };
    await PlannedSessionsRepo.put(moved);
    const loggedSession = future[1];
    await SessionLogsRepo.put({ id: 'log1', plannedSessionId: loggedSession.id, templateId: loggedSession.templateId, type: 'cardio', completedDate: todayISO(), completedAt: new Date().toISOString(), variant: 'full', durationMinutes: 30, source: 'manual' });

    await rebuildPlanningFromWeekOne('this_week', (tpls) => tpls.filter((t) => t.defaultDayOfWeek && t.type !== 'hiking'));

    const after = await PlannedSessionsRepo.getAll();
    expect(after.find((s) => s.id === moved.id)).toBeUndefined();
    expect(after.find((s) => s.id === loggedSession.id)).toBeDefined();
    expect(after.filter((s) => s.scheduledDate >= todayISO() && s.id !== loggedSession.id).every((s) => s.status === 'planned')).toBe(true);
    const templates = await import('./database').then((m) => m.SessionTemplatesRepo.getAll());
    const hikingIds = new Set(templates.filter((t) => t.type === 'hiking').map((t) => t.id));
    // The logged session stays whatever its sport (history is never touched).
    expect(after.some((s) => s.scheduledDate >= todayISO() && s.id !== loggedSession.id && hikingIds.has(s.templateId))).toBe(false);
    expect((await SessionLogsRepo.getAll()).map((l) => l.id)).toContain('log1');
  });

  it("does not put a second copy next to a session that is already logged on that day", async () => {
    const future = (await PlannedSessionsRepo.getAll()).filter((s) => s.scheduledDate >= todayISO()).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    const logged = future[0];
    await SessionLogsRepo.put({ id: 'log-today', plannedSessionId: logged.id, templateId: logged.templateId, type: 'cardio', completedDate: todayISO(), completedAt: new Date().toISOString(), variant: 'full', durationMinutes: 30, source: 'manual' });

    await rebuildPlanningFromWeekOne('this_week');

    const sameSlot = (await PlannedSessionsRepo.getAll()).filter((s) => s.templateId === logged.templateId && s.scheduledDate === logged.scheduledDate);
    expect(sameSlot.map((s) => s.id)).toEqual([logged.id]);
  });
});

describe('restorePatternSessionsRemovedByPrescription', () => {
  beforeEach(async () => {
    await wipeAllData();
    await seedIfEmpty();
  });

  it('brings back a long run the weekly prescription took out and drops what it put in, once', async () => {
    const source = 'engine/weeklyPrescriptionEngine.ts#computeWeeklyPrescriptionPlan';
    const future = (await PlannedSessionsRepo.getAll()).filter((s) => s.scheduledDate > addDays(todayISO(), 14));
    const longRun = future.find((s) => s.templateId === 'tpl_long_run')!;
    await PlannedSessionsRepo.put({ ...longRun, status: 'skipped' });
    const added = { id: 'added-berg', templateId: 'tpl_bergconditie', scheduledDate: addDays(longRun.scheduledDate, -2), weekStartDate: longRun.weekStartDate, status: 'planned' as const, order: 99 };
    await PlannedSessionsRepo.put(added);
    await PlanChangeProposalsRepo.put({
      id: 'wp1', trigger: 'weekly_prescription_computed', issue: 'Weekprescriptie bijgewerkt', alternatives: [], consequences: '', explanation: '', createdAt: '', resolvedAt: '', resolution: 'accepted',
      changes: [
        { plannedSessionId: longRun.id, action: 'remove', generatedBy: [source] },
        { action: 'add', newSessionDraft: { templateId: added.templateId, scheduledDate: added.scheduledDate, weekStartDate: added.weekStartDate }, generatedBy: [source] },
      ],
    });

    expect(await restorePatternSessionsRemovedByPrescription()).toBe(1);
    const after = await PlannedSessionsRepo.getAll();
    expect(after.find((s) => s.id === longRun.id)?.status).toBe('planned');
    expect(after.find((s) => s.id === 'added-berg')).toBeUndefined();
    expect(await restorePatternSessionsRemovedByPrescription()).toBe(0);
  });
});

describe('planned sessions always belong to the week of their date', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('a session moved into next week is stored in next week', async () => {
    await PlannedSessionsRepo.put({ id: 'x', templateId: 'tpl', scheduledDate: '2026-10-06', weekStartDate: '2026-09-28', status: 'moved', order: 0 });
    const [stored] = await PlannedSessionsRepo.getAll();
    expect(stored.weekStartDate).toBe('2026-10-05');
  });
});

describe('syncProgramHorizon (Fase 3: plan tot aan het doel)', () => {
  beforeEach(async () => {
    await wipeAllData();
    await seedIfEmpty();
  });

  async function setGoal(targetDate: string) {
    await TrainingGoalsRepo.put({ id: 'g_gr5', name: 'GR5', requirements: [], createdAt: '', updatedAt: '', status: 'active', targetDate });
    await GoalMilestonesRepo.put({ id: 'g_gr5_m1', goalId: 'g_gr5', order: 1, title: 'x', requirement: { kind: 'manual' } as never });
  }

  it('plans every week up to the goal, nothing on or after it, and ends with the taper', async () => {
    const goal = addDays(mondayOfWeek(todayISO()), 40 * 7);
    await setGoal(goal);
    const result = await syncProgramHorizon();
    expect(result.phasesChanged).toBe(true);
    const [program] = await ProgramsRepo.getAll();
    expect(program.phases[program.phases.length - 1].id).toBe('phase_taper');
    const sessions = await PlannedSessionsRepo.getAll();
    expect(sessions.some((s) => s.scheduledDate >= goal)).toBe(false);
    const weeks = new Set(sessions.map((s) => s.weekStartDate));
    for (let w = 1; w < 40; w++) expect(weeks.has(addDays(mondayOfWeek(todayISO()), w * 7))).toBe(true);
    // Hikes in the mountain phases, the long run before them.
    expect(sessions.some((s) => s.templateId === 'tpl_mountain_hike')).toBe(true);
    expect(sessions.some((s) => s.templateId === 'tpl_hike_day_one')).toBe(true);
    // Idempotent.
    expect(await syncProgramHorizon()).toEqual({ phasesChanged: false, added: 0, swapped: 0, removed: 0 });
  });

  it('a goal moved earlier removes the unlogged sessions after it and turns long runs into hikes', async () => {
    await setGoal(addDays(mondayOfWeek(todayISO()), 40 * 7));
    await syncProgramHorizon();
    const earlier = addDays(mondayOfWeek(todayISO()), 10 * 7);
    await setGoal(earlier);
    const result = await syncProgramHorizon();
    expect(result.removed).toBeGreaterThan(0);
    const sessions = await PlannedSessionsRepo.getAll();
    expect(sessions.some((s) => s.scheduledDate >= earlier)).toBe(false);
    // With 10 weeks left there is no basis any more: the Sundays are hikes.
    const sundays = sessions.filter((s) => s.scheduledDate > addDays(todayISO(), 7) && (s.templateId === 'tpl_long_run' || s.templateId === 'tpl_mountain_hike'));
    expect(sundays.every((s) => s.templateId === 'tpl_mountain_hike')).toBe(true);
  });

  it('keeps the long run when the user prefers it, and never touches a logged session', async () => {
    await setGoal(addDays(mondayOfWeek(todayISO()), 10 * 7));
    await syncProgramHorizon();
    const hike = (await PlannedSessionsRepo.getAll()).find((s) => s.templateId === 'tpl_mountain_hike')!;
    await SessionLogsRepo.put({ id: 'l', plannedSessionId: hike.id, templateId: hike.templateId, type: 'hiking', completedDate: todayISO(), completedAt: new Date().toISOString(), variant: 'full', durationMinutes: 120, source: 'manual' });
    await SettingsRepo.set({ longSundaySession: 'run' });
    await syncProgramHorizon();
    const sessions = await PlannedSessionsRepo.getAll();
    expect(sessions.find((s) => s.id === hike.id)?.templateId).toBe('tpl_mountain_hike');
    expect(sessions.filter((s) => s.id !== hike.id).some((s) => s.templateId === 'tpl_mountain_hike' || s.templateId === 'tpl_hike_day_one')).toBe(false);
  });

  it('without a goal date the planning keeps running past week 16', async () => {
    const result = await syncProgramHorizon();
    expect(result.added).toBe(0);
    const [program] = await ProgramsRepo.getAll();
    expect(program.phases.reduce((n, p) => n + p.weekCount, 0)).toBeGreaterThanOrEqual(13);
  });
});
