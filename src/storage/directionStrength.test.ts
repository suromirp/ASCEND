import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import {
  wipeAllData, seedIfEmpty, syncProgramHorizon, GoalEngineConfigRepo, ProgramsRepo, SessionLogsRepo, PlannedSessionsRepo, SessionTemplatesRepo, TrainingGoalsRepo, SettingsRepo, StrengthProgramStrategiesRepo,
} from './database';
import { applyHorizonPlanNow, computeHorizonPlan, type HorizonChangeInput } from './horizonPlan';
import { undoPlanChangeNow } from './undoPlanChange';
import type { RecentPlanChange } from '../models/planChange';
import { reshapeStrength, strengthPlanItems } from '../engine/directionStrength';
import { isStrengthTemplateId } from '../engine/weekShape';
import { mondayOfWeek, addDays } from '../utils/dates';
import type { TrainingGoal } from '../models/goals';

// Een richting die het aantal keer kracht verandert gaat door de gewone planningsronde: de weken erna
// volgen, wat je zelf vastzette en het verleden blijven. Testdata is nagemaakt.

const TODAY = '2026-10-26';
const FROM = mondayOfWeek(TODAY);

const strengthPerWeek = async (): Promise<number[]> => {
  const rows = (await PlannedSessionsRepo.getAll()).filter((s) => s.scheduledDate >= addDays(FROM, 7) && s.scheduledDate < addDays(FROM, 7 * 9) && s.status !== 'skipped' && isStrengthTemplateId(s.templateId));
  return Array.from({ length: 8 }, (_, i) => rows.filter((s) => s.scheduledDate >= addDays(FROM, 7 * (i + 1)) && s.scheduledDate < addDays(FROM, 7 * (i + 2))).length);
};

describe('een richting verandert het aantal keer kracht', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    await wipeAllData();
    await seedIfEmpty();
    await runBootMigrations({ build: 'test-kracht', seedProgram: true });
    for (const g of await TrainingGoalsRepo.getAll()) await TrainingGoalsRepo.put({ ...g, status: 'archived' } as TrainingGoal);
    await SettingsRepo.set({ restDay: 1, noGoalWaves: 'agreed' });
    await syncProgramHorizon();
    await syncProgramHorizon();
  });
  afterEach(() => vi.useRealTimers());

  const build = async (target: number) => {
    const [templates, settings, config, planned, logs, programs] = await Promise.all([
      SessionTemplatesRepo.getAll(), SettingsRepo.get(), GoalEngineConfigRepo.get(), PlannedSessionsRepo.getAll(), SessionLogsRepo.getAll(), ProgramsRepo.getAll(),
    ]);
    const reshape = reshapeStrength({ templates, weekShape: settings.weekShape, restDay: settings.restDay, target })!;
    const items = strengthPlanItems(reshape, {
      templates, plannedSessions: planned, logs, program: programs[0], today: TODAY,
      dailyTimeBudget: config.availability.dailyTimeBudget, pairing: config.strategy.sameDayPairingPreference,
    });
    const input: HorizonChangeInput = {
      title: 'Richting', why: 'Test.', explanation: 'Test.', trigger: 'direction_changed',
      settings: { direction: 'easy', directionStart: FROM, weekShape: reshape.shape },
      strengthBlock: reshape.strategy,
      ...(items.length > 0 ? { startItems: items } : {}),
    };
    return { reshape, input };
  };

  it('Rustig aan haalt kracht weg uit alle weken die komen, het voorstel laat het zien, en ongedaan maken zet alles terug', async () => {
    expect((await strengthPerWeek()).every((n) => n === 3)).toBe(true);
    const wasStrategies = JSON.stringify(await StrengthProgramStrategiesRepo.getAll());
    const wasSettings = (await SettingsRepo.get()).weekShape;

    const { input } = await build(1);
    const plan = await computeHorizonPlan(input);
    expect(plan.proposal.changes.filter((c) => c.action === 'remove').length).toBeGreaterThan(8);
    const result = await applyHorizonPlanNow(plan);
    expect(result.status).toMatch(/applied|partial/);
    await syncProgramHorizon();

    expect((await strengthPerWeek()).every((n) => n === 1)).toBe(true);
    for (const st of (await StrengthProgramStrategiesRepo.getAll()).filter((x) => x.status === 'active')) expect(st.sessionsPerWeek).toBe(1);
    expect((await SettingsRepo.get()).weekShape).not.toEqual(wasSettings);

    if (result.status !== 'applied') throw new Error('verwacht applied');
    await undoPlanChangeNow({
      id: 'u', trigger: 'direction_changed', title: 'Richting', lines: [], why: '', before: result.before, addedIds: result.addedIds,
      settingsBefore: result.restore.settings, strategiesBefore: result.restore.strategies, createdAt: new Date().toISOString(),
    } as RecentPlanChange);
    expect(JSON.stringify(await StrengthProgramStrategiesRepo.getAll())).toBe(wasStrategies);
    expect((await strengthPerWeek()).every((n) => n === 3)).toBe(true);
  });

  it('wat je zelf vastzette blijft staan, ook als die training vervalt in de richting', async () => {
    const upperB = (await PlannedSessionsRepo.getAll()).filter((x) => x.templateId === 'tpl_upper_b' && x.scheduledDate > FROM).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[2];
    await PlannedSessionsRepo.put({ ...upperB, lock: { by: 'user', at: `${TODAY}T08:00:00.000Z` } });
    const { input } = await build(1);
    expect((await applyHorizonPlanNow(await computeHorizonPlan(input))).status).toMatch(/applied|partial/);
    await syncProgramHorizon();
    const left = (await PlannedSessionsRepo.getAll()).find((x) => x.id === upperB.id);
    expect(left && left.status !== 'skipped').toBe(true);
  });

  it('Sterker worden zet er kracht bij op een vrije dag, ook in de weken die al gepland staan', async () => {
    const down = await build(1);
    await applyHorizonPlanNow(await computeHorizonPlan(down.input));
    await syncProgramHorizon();
    expect((await strengthPerWeek()).every((n) => n === 1)).toBe(true);
    const up = await build(3);
    expect(up.reshape.added).toEqual(['tpl_lower_a', 'tpl_upper_b']);
    await applyHorizonPlanNow(await computeHorizonPlan(up.input));
    await syncProgramHorizon();
    expect((await strengthPerWeek()).every((n) => n === 3)).toBe(true);
  });
});
