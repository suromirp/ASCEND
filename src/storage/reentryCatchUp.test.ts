import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, seedIfEmpty, syncProgramHorizon, PlannedSessionsRepo, SessionTemplatesRepo, SessionLogsRepo, SettingsRepo } from './database';
import { applyHorizonPlanNow, computeHorizonPlan } from './horizonPlan';
import { snapshotWritten, undoPlanChangeNow } from './undoPlanChange';
import { primePlanningRegisters } from '../state/planningSync';
import { REENTRY_TITLE, REENTRY_WHY, reentryCatchUp, reentryCatchUpItems, reentryNote } from '../engine/reentry';
import type { RecentPlanChange } from '../models/planChange';
import { addDays } from '../utils/dates';

// I-159: een lichte gemiste training op de eerste rustdag van de instap, door de echte planningsronde. Voor Akkoord
// verandert er niets, na Akkoord staat de training op de rustdag (ook na een nieuwe ronde), en Ongedaan maken zet hem
// terug op zijn dag en haalt de instap weg. Nagemaakte gebruiker: het volledige programma met zijn doel.

const START = '2026-11-16';

const rowOf = async (id: string) => (await PlannedSessionsRepo.getAll()).find((s) => s.id === id);

describe('rustiger instap: een gemiste training op de eerste rustdag, alleen met Akkoord', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${START}T08:00:00`));
    await wipeAllData();
    await seedIfEmpty();
    await runBootMigrations({ build: 'test-reentry-catch-up', seedProgram: true });
    await syncProgramHorizon();
  });
  afterEach(() => vi.useRealTimers());

  it('Akkoord zet hem op de rustdag, een nieuwe ronde laat hem staan, Ongedaan maken zet alles terug', async () => {
    const [planned, templates, logs] = await Promise.all([PlannedSessionsRepo.getAll(), SessionTemplatesRepo.getAll(), SessionLogsRepo.getAll()]);
    // De eerste dag in de komende weken met een gemiste lichte training de dagen ervoor en een rustdag in de zeven dagen.
    let found;
    let today = START;
    for (let k = 3; k < 28 && !found; k++) {
      today = addDays(START, k);
      found = reentryCatchUp({ week: { from: today, until: addDays(today, 6), factor: 0.75 }, pauseFrom: addDays(today, -3), today, plannedSessions: planned, logs, templates });
    }
    expect(found).toBeDefined();
    const c = found!;
    vi.setSystemTime(new Date(`${today}T08:00:00`));
    const week = { from: today, until: addDays(today, 6), factor: 0.75 };
    const was = planned.find((s) => s.id === c.sessionId)!;
    const before = JSON.stringify(await PlannedSessionsRepo.getAll());

    const plan = await computeHorizonPlan({
      title: REENTRY_TITLE, why: 'Rustiger instap na een pauze.', explanation: REENTRY_WHY, trigger: 'reentry_planned',
      settings: { reentryWeeks: [week] }, notes: [reentryNote(week, undefined, undefined, c)], startItems: reentryCatchUpItems(c),
    }, { prime: primePlanningRegisters });
    expect(plan.proposal.changes.some((ch) => ch.plannedSessionId === c.sessionId && ch.toDate === c.toDate)).toBe(true);
    // Voor Akkoord (en dus ook met Liever niet) verandert er niets.
    expect(JSON.stringify(await PlannedSessionsRepo.getAll())).toBe(before);
    expect((await SettingsRepo.get()).reentryWeeks).toBeUndefined();

    const result = await applyHorizonPlanNow(plan, { prime: primePlanningRegisters });
    expect(result.status).toBe('applied');
    expect(await rowOf(c.sessionId)).toMatchObject({ scheduledDate: c.toDate, movedFromDate: c.fromDate });
    await syncProgramHorizon();
    expect((await rowOf(c.sessionId))?.scheduledDate).toBe(c.toDate);

    if (result.status !== 'applied') return;
    const change: RecentPlanChange = {
      id: plan.proposal.id, trigger: plan.proposal.trigger, title: plan.proposal.issue, lines: [], why: plan.proposal.explanation,
      before: result.before, addedIds: result.addedIds, written: await snapshotWritten(result.before, result.addedIds),
      settingsBefore: result.restore.settings, goalsBefore: result.restore.goals, goalsAdded: result.restore.newGoalIds, createdAt: `${today}T08:05:00.000Z`,
    };
    await undoPlanChangeNow(change);
    const back = await rowOf(c.sessionId);
    expect(back?.scheduledDate).toBe(was.scheduledDate);
    expect(back?.lock).toBeUndefined();
    expect((await SettingsRepo.get()).reentryWeeks ?? []).toEqual([]);
  });
});
