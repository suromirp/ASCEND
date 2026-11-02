import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import {
  wipeAllData, seedIfEmpty, syncProgramHorizon, GoalEngineConfigRepo, ProgramsRepo, SessionLogsRepo, PlannedSessionsRepo, SessionTemplatesRepo, TrainingGoalsRepo, SettingsRepo, StrengthProgramStrategiesRepo,
} from './database';
import { applyHorizonPlanNow, computeHorizonPlan, type HorizonChangeInput } from './horizonPlan';
import { undoPlanChangeNow } from './undoPlanChange';
import type { RecentPlanChange } from '../models/planChange';
import { reshapeStrength, strengthNotes, strengthPlanItems } from '../engine/directionStrength';
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

  const build = async (target: number, extra: Partial<Parameters<typeof strengthPlanItems>[1]> = {}) => {
    const [templates, settings, config, planned, logs, programs] = await Promise.all([
      SessionTemplatesRepo.getAll(), SettingsRepo.get(), GoalEngineConfigRepo.get(), PlannedSessionsRepo.getAll(), SessionLogsRepo.getAll(), ProgramsRepo.getAll(),
    ]);
    const reshape = reshapeStrength({ templates, weekShape: settings.weekShape, restDay: settings.restDay, target })!;
    const plan = strengthPlanItems(reshape, {
      templates, plannedSessions: planned, logs, program: programs[0], today: TODAY, restDay: settings.restDay,
      leave: settings.leavePeriods, illnessEpisodes: settings.illnessEpisodes,
      dailyTimeBudget: config.availability.dailyTimeBudget, pairing: config.strategy.sameDayPairingPreference, ...extra,
    });
    const items = plan.items;
    const input: HorizonChangeInput = {
      title: 'Richting', why: 'Test.', explanation: 'Test.', trigger: 'direction_changed',
      settings: { direction: 'easy', directionStart: FROM, weekShape: reshape.shape },
      strengthBlock: reshape.strategy,
      ...(items.length > 0 ? { startItems: items } : {}),
    };
    return { reshape, input, plan };
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

  const down = async () => {
    const d = await build(1);
    await applyHorizonPlanNow(await computeHorizonPlan(d.input));
    await syncProgramHorizon();
  };

  it('zet nooit kracht in een vakantie en zegt dat het in die week niet paste', async () => {
    await down();
    const start = addDays(FROM, 14);
    await SettingsRepo.set({ leavePeriods: [{ id: 'v1', kind: 'no_training', startDate: start, endDate: addDays(start, 6) }] });
    const up = await build(3);
    const adds = up.plan.items.filter((i) => i.action === 'add').map((i) => i.newSessionDraft!.scheduledDate);
    expect(adds.length).toBeGreaterThan(0);
    expect(adds.every((d) => d < start || d > addDays(start, 6))).toBe(true);
    expect(up.plan.noRoomWeeks).toBeGreaterThanOrEqual(1);
    expect(strengthNotes(up.reshape, up.plan, true).join(' ')).toMatch(/In \d+ week(en)? paste het niet, daar blijft het bij 1 keer\./);
  });

  it('zet geen kracht in een ziekteperiode', async () => {
    await down();
    await SettingsRepo.set({ illnessEpisodes: [{ id: 'z1', kind: 'cold_above_neck', startDate: TODAY } as never] });
    const up = await build(3);
    const first = addDays(TODAY, 7);
    expect(up.plan.items.filter((i) => i.action === 'add').every((i) => i.newSessionDraft!.scheduledDate > first)).toBe(true);
  });

  it('laat kracht weg in een week waar een verschoven lange duurloop of een zware beendag het te dichtbij maakt', async () => {
    await down();
    const up0 = await build(3);
    const lowerDay = up0.reshape.shape.days.tpl_lower_a;
    const week = addDays(FROM, 21);
    const date = addDays(week, lowerDay - 1);
    const rows = await PlannedSessionsRepo.getAll();
    const heavy = rows.find((x) => x.templateId === 'tpl_long_run' && x.weekStartDate === week)!;
    await PlannedSessionsRepo.put({ ...heavy, scheduledDate: date, lock: { by: 'user', at: `${TODAY}T08:00:00.000Z` } });
    const up = await build(3);
    const adds = up.plan.items.filter((i) => i.action === 'add').map((i) => i.newSessionDraft!);
    expect(adds.some((a) => a.weekStartDate === week && a.templateId === 'tpl_lower_a')).toBe(false);
    expect(up.plan.noRoomWeeks + up.plan.partialWeeks).toBeGreaterThanOrEqual(1);
  });

  it('zonder enige toevoeging zegt het voorstel dat er geen extra keer bij past', async () => {
    await down();
    await SettingsRepo.set({ leavePeriods: [{ id: 'v2', kind: 'no_training', startDate: addDays(FROM, 1), endDate: addDays(FROM, 7 * 60) }] });
    const up = await build(3);
    expect(up.plan.addedWeeks).toBe(0);
    expect(strengthNotes(up.reshape, up.plan, false)).toEqual(['Je richting vraagt 3 keer kracht; op je dagen past er nu geen extra keer bij.']);
  });

  it('laat kracht van vandaag en een open Forge-training staan en raakt alleen het aantal van het krachtblok aan', async () => {
    const rows = await PlannedSessionsRepo.getAll();
    const todays = rows.find((x) => x.templateId === 'tpl_upper_b' && x.scheduledDate >= TODAY)!;
    const open = rows.filter((x) => x.templateId === 'tpl_upper_b' && x.scheduledDate > TODAY).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
    const { plan } = await build(1, { openPlannedId: open.id });
    const gone = new Set(plan.items.filter((i) => i.action === 'remove').map((i) => i.plannedSessionId));
    expect(gone.has(open.id)).toBe(false);
    expect(rows.filter((x) => x.scheduledDate <= TODAY && gone.has(x.id))).toEqual([]);
    void todays;
    const before = (await StrengthProgramStrategiesRepo.getAll()).filter((x) => x.status === 'active' || x.status === 'ending');
    const { input } = await build(1);
    await applyHorizonPlanNow(await computeHorizonPlan(input));
    const after = (await StrengthProgramStrategiesRepo.getAll()).filter((x) => x.status === 'active' || x.status === 'ending');
    for (const a of after) {
      const b = before.find((x) => x.id === a.id)!;
      expect(a.splitType).toBe(b.splitType);
      expect([...a.sessionTemplateIds].sort()).toEqual([...b.sessionTemplateIds].sort());
      expect(a.sessionsPerWeek).toBe(1);
    }
  });

  it('zet Benen A niet de dag na een lange duurloop, ook niet als de maandag vrij is', async () => {
    await down();
    const up0 = await build(3);
    const lowerDay = up0.reshape.shape.days.tpl_lower_a;
    const week = addDays(FROM, 21);
    const rows = await PlannedSessionsRepo.getAll();
    const run = rows.find((x) => x.templateId === 'tpl_long_run' && x.weekStartDate === week)!;
    await PlannedSessionsRepo.put({ ...run, scheduledDate: addDays(week, lowerDay - 2), lock: { by: 'user', at: `${TODAY}T08:00:00.000Z` } });
    const up = await build(3);
    expect(up.plan.items.some((i) => i.action === 'add' && i.newSessionDraft!.templateId === 'tpl_lower_a' && i.newSessionDraft!.weekStartDate === week)).toBe(false);
    expect(up.plan.noRoomWeeks + up.plan.partialWeeks).toBeGreaterThanOrEqual(1);
  });

  it('kracht die met Akkoord erbij kwam blijft later niet stil op een vakantiedag staan', async () => {
    await down();
    const up = await build(3);
    expect((await applyHorizonPlanNow(await computeHorizonPlan(up.input))).status).toMatch(/applied|partial/);
    await syncProgramHorizon();
    const week = addDays(FROM, 14);
    const added = (await PlannedSessionsRepo.getAll()).find((x) => x.templateId === 'tpl_lower_a' && x.weekStartDate === week && x.status !== 'skipped')!;
    expect(added.lock?.by).toBe('proposal');
    await SettingsRepo.set({ leavePeriods: [{ id: 'v3', kind: 'no_training', startDate: addDays(week, 0), endDate: addDays(week, 6) }] });
    await syncProgramHorizon();
    await syncProgramHorizon();
    const left = (await PlannedSessionsRepo.getAll()).filter((x) => x.weekStartDate === week && x.status !== 'skipped' && x.scheduledDate >= week && x.scheduledDate <= addDays(week, 6));
    expect(left).toEqual([]);
  });

  it('wat je zelf vastzette blijft op een vakantiedag staan', async () => {
    const week = addDays(FROM, 14);
    const mine = (await PlannedSessionsRepo.getAll()).find((x) => x.templateId === 'tpl_upper_a' && x.weekStartDate === week)!;
    await PlannedSessionsRepo.put({ ...mine, lock: { by: 'user', at: `${TODAY}T08:00:00.000Z` } });
    await SettingsRepo.set({ leavePeriods: [{ id: 'v4', kind: 'no_training', startDate: addDays(week, 0), endDate: addDays(week, 6) }] });
    await syncProgramHorizon();
    expect((await PlannedSessionsRepo.getAll()).some((x) => x.id === mine.id && x.status !== 'skipped')).toBe(true);
  });
});
