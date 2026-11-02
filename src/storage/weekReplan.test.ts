import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, seedIfEmpty, syncProgramHorizon, PlannedSessionsRepo, SessionLogsRepo, TrainingGoalsRepo, PlanChangeProposalsRepo } from './database';
import { undoPlanChangeNow } from './undoPlanChange';
import { restoredRow } from '../engine/testMoveRestore';
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

  it('na Akkoord heeft de sync niets meer te herstellen, ook met een zware beendag op maandag van de week erna', async () => {
    const nextLower = (await PlannedSessionsRepo.getAll()).find((x) => x.templateId === 'tpl_lower_a' && x.scheduledDate >= '2026-11-09' && x.scheduledDate <= '2026-11-15')!;
    expect(nextLower).toBeTruthy();
    // Van het systeem, op maandag direct na de lange duurloop van zondag.
    await PlannedSessionsRepo.put({ ...nextLower, scheduledDate: '2026-11-09' });
    await messUp();
    const proposal = (await planWeekReplan(MON))!;
    expect(proposal.nextWeek).toBe(true);
    await writeWeekReplan(proposal);
    const result = await syncProgramHorizon();
    expect(result.repairs).toBeUndefined();
    expect(result.added + result.removed + result.swapped).toBe(0);
  });

  it('schrijft nooit een rij die bij het uitrekenen niet in de gecontroleerde dagen stond', async () => {
    await messUp();
    const proposal = (await planWeekReplan(MON))!;
    const far = (await PlannedSessionsRepo.getAll()).find((x) => x.scheduledDate > '2026-12-01')!;
    const sneaky = { ...proposal, diff: { ...proposal.diff, writes: [...proposal.diff.writes, { ...far, scheduledDate: '2026-12-31' }] } };
    const before = await PlannedSessionsRepo.getAll();
    await expect(writeWeekReplan(sneaky)).rejects.toThrow(REPLAN_STALE);
    expect(await PlannedSessionsRepo.getAll()).toEqual(before);
  });

  it('het Akkoord staat in het wijzigingslog, en Ongedaan maken wordt daar ook genoteerd', async () => {
    await messUp();
    const proposal = (await planWeekReplan(MON))!;
    await writeWeekReplan(proposal);
    const log = await PlanChangeProposalsRepo.getAll();
    expect(log.find((p) => p.id === proposal.proposal.id)).toMatchObject({ resolution: 'accepted', issue: 'Week opnieuw gepland' });
  });

  it('een ingehaalde training die teruggaat wordt genoemd', async () => {
    const row = (await week()).find(open)!;
    await PlannedSessionsRepo.put({ ...row, id: 'ingehaald', scheduledDate: SUN, catchUp: { fromId: row.id, fromDate: '2026-11-02' }, lock: yours });
    const proposal = (await planWeekReplan(MON))!;
    expect(proposal.caughtUp.length).toBe(1);
  });

  it('een rij die weer op de planning komt (Toch doen, of na een verplaatste test) is van jou, en Ongedaan maken zet hem terug', async () => {
    const row = (await week()).find(open)!;
    const skipped = { ...row, status: 'skipped' as const, lock: { by: 'proposal' as const, proposalId: 'retry1', at: '2026-11-02T08:00:00.000Z' } };
    await PlannedSessionsRepo.put(skipped);
    await PlannedSessionsRepo.put(restoredRow(skipped, skipped.scheduledDate, yours));
    expect((await PlannedSessionsRepo.getAll()).find((x) => x.id === row.id)).toMatchObject({ status: 'planned', lock: yours });
    await undoPlanChangeNow({ id: 'u1', trigger: 'session_moved', title: 'Sessies verplaatst', lines: [], why: '', before: [skipped], addedIds: [], createdAt: '2026-11-04T08:00:00.000Z' });
    expect((await PlannedSessionsRepo.getAll()).find((x) => x.id === row.id)).toEqual(skipped);
  });
});
