import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, seedIfEmpty, syncProgramHorizon, PlannedSessionsRepo, ProgramsRepo, SessionTemplatesRepo, SettingsRepo, TrainingGoalsRepo, type AppSettings } from './database';
import { applyHorizonPlanNow, computeHorizonPlan } from './horizonPlan';
import { progressionTarget } from '../engine/programLayout';
import { directionChangeLines } from '../engine/directionChange';
import type { DirectionId } from '../data/directions';
import type { TrainingGoal } from '../models/goals';
import { addDays } from '../utils/dates';

// Zonder doel stap 4: een richting kiezen is een voorstel met Akkoord, en pas bij Akkoord volgt de
// planning. Nagemaakte gebruiker: het volledige programma, alle doelen gearchiveerd.

const TODAY = '2026-10-26';

async function setUp() {
  await seedIfEmpty();
  await runBootMigrations({ build: 'test-direction', seedProgram: true });
  for (const g of await TrainingGoalsRepo.getAll()) await TrainingGoalsRepo.put({ ...g, status: 'archived' } as TrainingGoal);
  await SettingsRepo.set({ restDay: 1 });
  await syncProgramHorizon();
}

const input = (id: DirectionId, extra: Partial<AppSettings> = {}) => ({
  title: 'Richting', why: 'Test.', explanation: 'Test.', trigger: 'direction_changed' as const,
  settings: { direction: id, directionStart: TODAY, ...extra }, notes: directionChangeLines(id, {}),
});

async function open() {
  return (await PlannedSessionsRepo.getAll()).filter((s) => s.scheduledDate >= TODAY && s.status !== 'skipped');
}

describe('een richting kiezen zonder doel', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    await wipeAllData();
    await setUp();
  });
  afterEach(() => vi.useRealTimers());

  it('zonder keuze staat er geen bergtocht en geen rugzak in het plan', async () => {
    const ids = (await open()).map((s) => s.templateId);
    expect(ids).not.toContain('tpl_mountain_hike');
    expect(ids).not.toContain('tpl_hike_day_one');
    expect((await ProgramsRepo.getAll())[0].phases.every((p) => p.id === 'phase_golf')).toBe(true);
  });

  it('het voorstel verandert niets tot Akkoord', async () => {
    const before = JSON.stringify(await PlannedSessionsRepo.getAll());
    const plan = await computeHorizonPlan(input('easy'));
    expect(plan.notes).toContain('Richting: Rustig aan.');
    expect(JSON.stringify(await PlannedSessionsRepo.getAll())).toBe(before);
    expect((await SettingsRepo.get()).direction).toBeUndefined();
  });

  it('Rustig aan bij Akkoord: geen heuvelloop meer, wel een herstelloop, en vlakke weken', async () => {
    const plan = await computeHorizonPlan(input('easy'));
    expect(plan.proposal.changes.length).toBeGreaterThan(0);
    expect((await applyHorizonPlanNow(plan)).status).toBe('applied');
    expect((await SettingsRepo.get()).direction).toBe('easy');
    const ids = (await open()).map((s) => s.templateId);
    expect(ids).not.toContain('tpl_hill_intervals');
    expect(ids).toContain('tpl_recovery_run');
    const program = (await ProgramsRepo.getAll())[0];
    expect(program.direction).toMatchObject({ id: 'easy' });
    const easy = (await SessionTemplatesRepo.getAll()).find((t) => t.id === 'tpl_easy_run')!;
    const weeks = [0, 1, 2, 3, 4, 5].map((w) => progressionTarget(easy, program, addDays(TODAY, 7 * w + 3))!.minutes);
    expect(new Set(weeks).size).toBe(1);
  });

  it('Fit blijven bij Akkoord: drie gelijke weken en een lichtere vierde', async () => {
    const plan = await computeHorizonPlan(input('maintain'));
    // Alleen andere lengtes: geen rij verandert, de lengtes staan in het voorstel.
    expect(plan.lengths.length).toBeGreaterThan(0);
    expect(['applied', 'unchanged']).toContain((await applyHorizonPlanNow(plan)).status);
    const program = (await ProgramsRepo.getAll())[0];
    const long = (await SessionTemplatesRepo.getAll()).find((t) => t.id === 'tpl_long_run')!;
    const m = [0, 1, 2, 3].map((w) => progressionTarget(long, program, addDays(TODAY, 7 * w + 6))!.minutes);
    expect(m[0]).toBe(m[1]);
    expect(m[1]).toBe(m[2]);
    expect(m[3]).toBeLessThan(m[2]);
  });

  it('Fitter worden bij Akkoord: drie weken met meer minuten, dan een lichtere week', async () => {
    expect(['applied', 'unchanged']).toContain((await applyHorizonPlanNow(await computeHorizonPlan(input('improve')))).status);
    const program = (await ProgramsRepo.getAll())[0];
    expect(program.direction?.factors).toHaveLength(4);
    const long = (await SessionTemplatesRepo.getAll()).find((t) => t.id === 'tpl_long_run')!;
    const m = [0, 1, 2, 3].map((w) => progressionTarget(long, program, addDays(TODAY, 7 * w + 6))!.minutes);
    expect(m[1]).toBeGreaterThan(m[0]);
    expect(m[2]).toBeGreaterThan(m[1]);
    expect(m[3]).toBeLessThan(m[2]);
  });

  it('de minuten van een week volgen het weekbudget, kracht houdt zijn lengte', async () => {
    expect(['applied', 'unchanged']).toContain((await applyHorizonPlanNow(await computeHorizonPlan(input('maintain', { beginnerStart: 'nee' })))).status);
    const program = (await ProgramsRepo.getAll())[0];
    const byId = new Map((await SessionTemplatesRepo.getAll()).map((t) => [t.id, t]));
    const week = (await open()).filter((s) => s.scheduledDate >= '2026-11-02' && s.scheduledDate <= '2026-11-08');
    let counted = 0;
    for (const s of week) {
      const t = byId.get(s.templateId)!;
      if (t.type === 'strength' || t.type === 'recovery') continue;
      counted += progressionTarget(t, program, s.scheduledDate)!.minutes * (s.templateId === 'tpl_hill_intervals' ? 2 : 1);
    }
    expect(Math.abs(counted - 150)).toBeLessThanOrEqual(5);
  });

  it('beginnersstart: weinig gesport, dan vier weken geen heuvelloop, daarna wel', async () => {
    expect((await applyHorizonPlanNow(await computeHorizonPlan(input('maintain')))).status).toBe('applied');
    const program = (await ProgramsRepo.getAll())[0];
    expect(program.phases.map((p) => p.id)).toEqual(['phase_golf_start', 'phase_golf']);
    const sessions = await open();
    const first = sessions.filter((s) => s.scheduledDate < addDays(TODAY, 28)).map((s) => s.templateId);
    const later = sessions.filter((s) => s.scheduledDate >= addDays(TODAY, 28)).map((s) => s.templateId);
    expect(first).not.toContain('tpl_hill_intervals');
    expect(first).toContain('tpl_recovery_run');
    expect(later).toContain('tpl_hill_intervals');
  });

  it('Sterker worden bij Akkoord: geen heuvelloop, rustige duur', async () => {
    expect((await applyHorizonPlanNow(await computeHorizonPlan(input('stronger', { beginnerStart: 'nee' })))).status).toBe('applied');
    expect((await open()).map((s) => s.templateId)).not.toContain('tpl_hill_intervals');
  });

  it('golven van drie weken: een factor per week van de golf en hele golven in het plan', async () => {
    expect(['applied', 'unchanged']).toContain((await applyHorizonPlanNow(await computeHorizonPlan(input('improve', { beginnerStart: 'nee', waves: { length: 3 } })))).status);
    const program = (await ProgramsRepo.getAll())[0];
    expect(program.direction?.factors).toHaveLength(3);
    expect(program.phases.at(-1)?.wave).toEqual({ length: 3, light: true });
    expect(program.phases.at(-1)!.weekCount % 3).toBe(0);
  });

  it('na een golf: een stap hoger is een voorstel dat bij Akkoord het budget en de lengtes verhoogt', async () => {
    expect(['applied', 'unchanged']).toContain((await applyHorizonPlanNow(await computeHorizonPlan(input('maintain', { beginnerStart: 'nee' })))).status);
    const before = (await ProgramsRepo.getAll())[0].direction!.factors![0];
    const plan = await computeHorizonPlan({ ...input('maintain'), trigger: 'wave_review', settings: { weekBudget: { minutes: 165 }, waveReviewDone: '2026-09-28' } });
    expect((await SettingsRepo.get()).weekBudget).toBeUndefined();
    expect(['applied', 'unchanged']).toContain((await applyHorizonPlanNow(plan)).status);
    expect((await SettingsRepo.get()).waveReviewDone).toBe('2026-09-28');
    expect((await ProgramsRepo.getAll())[0].direction!.factors![0]).toBeGreaterThan(before);
  });

  it('beginnersstart op Nee: de heuvelloop blijft', async () => {
    expect(['applied', 'unchanged']).toContain((await applyHorizonPlanNow(await computeHorizonPlan(input('maintain', { beginnerStart: 'nee' })))).status);
    expect((await open()).filter((s) => s.scheduledDate < addDays(TODAY, 28)).map((s) => s.templateId)).toContain('tpl_hill_intervals');
  });
});
