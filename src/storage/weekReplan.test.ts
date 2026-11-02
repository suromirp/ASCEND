import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, seedIfEmpty, syncProgramHorizon, PlannedSessionsRepo, SessionLogsRepo, TrainingGoalsRepo } from './database';
import { planWeekReplan, writeWeekReplan, undoWeekReplan, REPLAN_STALE, REPLAN_UNDO_STALE } from './weekReplan';
import type { PlannedSession, SessionLog } from '../models/training';
import type { TrainingGoal } from '../models/goals';

// Nagemaakt: een week van maandag 2 november 2026, vandaag woensdag 4 november. Een reeks
// verplaatsingen maakt de week scheef; Week opnieuw plannen zet hem terug zoals het plan hem maakt.
const TODAY = '2026-11-04';
const MON = '2026-11-02';
const SUN = '2026-11-08';
const yours = { by: 'user' as const, at: '2026-11-03T08:00:00.000Z' };
const inWeek = (s: PlannedSession) => s.scheduledDate >= MON && s.scheduledDate <= SUN;
const open = (s: PlannedSession) => s.status !== 'skipped' && s.scheduledDate >= TODAY;
const shape = (rows: PlannedSession[]) => rows.filter(inWeek).filter(open).map((s) => `${s.scheduledDate} ${s.templateId}`).sort();

async function week(): Promise<PlannedSession[]> {
  return (await PlannedSessionsRepo.getAll()).filter(inWeek);
}

describe('Week opnieuw plannen', () => {
  let plan: string[];
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    await wipeAllData();
    await seedIfEmpty();
    await runBootMigrations({ build: 'test-replan' });
    const g0 = (await TrainingGoalsRepo.getAll())[0];
    await TrainingGoalsRepo.put({ ...g0, status: 'active', targetDate: '2027-08-01' } as TrainingGoal);
    await syncProgramHorizon();
    await syncProgramHorizon();
    plan = shape(await week());
  });
  afterEach(() => vi.useRealTimers());

  // Alles wat nog moet op één dag (de laatste), alles van jou, plus een extra kopie van de langste training.
  async function messUp(): Promise<PlannedSession[]> {
    const rows = (await week()).filter(open);
    expect(rows.length).toBeGreaterThan(2);
    const last = rows.map((r) => r.scheduledDate).sort().at(-1)!;
    const target = last === TODAY ? SUN : last;
    for (const r of rows) await PlannedSessionsRepo.put({ ...r, scheduledDate: target, status: 'moved', movedFromDate: r.scheduledDate, lock: yours });
    await PlannedSessionsRepo.put({ ...rows[0], id: 'extra-copy', scheduledDate: TODAY, lock: yours });
    return week();
  }

  it('een scheve week wordt weer het plan; ook wat je zelf verplaatste gaat terug', async () => {
    const messy = await messUp();
    expect(shape(messy)).not.toEqual(plan);
    const proposal = (await planWeekReplan(MON))!;
    expect(proposal.hadYours).toBe(true);
    expect(proposal.diff.writes.length + proposal.diff.removedIds.length).toBeGreaterThan(0);
    await writeWeekReplan(proposal);
    const after = await week();
    expect(shape(after)).toEqual(plan);
    // Niets van jou blijft vastgezet in wat nog moet.
    expect(after.filter(open).some((s) => s.lock)).toBe(false);
    // Een tweede keer: geen verschil meer.
    const again = (await planWeekReplan(MON))!;
    expect(again.diff.writes).toEqual([]);
    expect(again.diff.removedIds).toEqual([]);
  });

  it('gelogde en voorbije dagen blijven precies zoals ze waren', async () => {
    const past = (await week()).filter((s) => s.scheduledDate < TODAY);
    const done = past[0];
    if (done) await SessionLogsRepo.put({ id: 'log1', plannedSessionId: done.id, templateId: done.templateId, type: 'cardio', completedDate: done.scheduledDate, variant: 'full', durationMinutes: 40 } as SessionLog);
    await messUp();
    const before = (await week()).filter((s) => s.scheduledDate < TODAY);
    const logsBefore = await SessionLogsRepo.getAll();
    await writeWeekReplan((await planWeekReplan(MON))!);
    expect((await week()).filter((s) => s.scheduledDate < TODAY)).toEqual(before);
    expect(await SessionLogsRepo.getAll()).toEqual(logsBefore);
  });

  it('geen verschil: het voorstel heeft niets te doen', async () => {
    const proposal = (await planWeekReplan(MON))!;
    expect(proposal.diff.writes).toEqual([]);
    expect(proposal.diff.removedIds).toEqual([]);
  });

  it('een week die al voorbij is plant hij niet opnieuw', async () => {
    expect(await planWeekReplan('2026-10-26')).toBeNull();
  });

  it('ongedaan maken zet de week precies terug', async () => {
    const messy = await messUp();
    const written = await writeWeekReplan((await planWeekReplan(MON))!);
    await undoWeekReplan(written);
    const back = await week();
    const byId = (rows: PlannedSession[]) => [...rows].sort((a, b) => a.id.localeCompare(b.id));
    expect(byId(back)).toEqual(byId(messy));
  });

  it('ongedaan maken kan niet meer als de week intussen veranderde, en verandert dan niets', async () => {
    await messUp();
    const written = await writeWeekReplan((await planWeekReplan(MON))!);
    const row = written.written[0];
    await PlannedSessionsRepo.put({ ...row, scheduledDate: SUN, lock: yours });
    const between = await week();
    await expect(undoWeekReplan(written)).rejects.toThrow(REPLAN_UNDO_STALE);
    expect(await week()).toEqual(between);
  });

  it('alles of niets: veranderde de week na het voorstel, dan schrijft hij niets', async () => {
    await messUp();
    const proposal = (await planWeekReplan(MON))!;
    const row = (await week()).find(open)!;
    await PlannedSessionsRepo.put({ ...row, plannedMinutes: 12 });
    const between = await week();
    await expect(writeWeekReplan(proposal)).rejects.toThrow(REPLAN_STALE);
    expect(await week()).toEqual(between);
  });

  it('alles of niets: gaat het halverwege mis, dan blijft alles staan', async () => {
    const messy = await messUp();
    const proposal = (await planWeekReplan(MON))!;
    expect(proposal.diff.writes.length).toBeGreaterThan(1);
    // De laatste rij is kapot (geen id): het schrijven faalt halverwege.
    const broken = { ...proposal, diff: { ...proposal.diff, writes: [...proposal.diff.writes, { ...proposal.diff.writes[0], id: undefined as unknown as string }] } };
    await expect(writeWeekReplan(broken)).rejects.toBeTruthy();
    const byId = (rows: PlannedSession[]) => [...rows].sort((a, b) => a.id.localeCompare(b.id));
    expect(byId(await week())).toEqual(byId(messy));
  });
});
