import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import {
  wipeAllData, seedIfEmpty, syncProgramHorizon, resetScheduleToDefault, syncTemplateAndScheduleDefinitions, MetaRepo, ProgramsRepo, PlannedSessionsRepo, SessionLogsRepo, SessionTemplatesRepo, TrainingGoalsRepo,
  GoalMilestonesRepo, StrengthProgramStrategiesRepo, GoalEngineConfigRepo, SettingsRepo,
} from './database';
import { applyHorizonPlanNow, computeHorizonPlan, type HorizonChangeInput } from './horizonPlan';
import { buildFirstPlan, defaultAnswers, kindOfExistingGoals, type StartAnswers } from '../engine/firstPlan';
import { isEmptyStart, needsFirstPlan } from '../engine/freshStart';
import { isoWeekday, mondayOfWeek, addDays } from '../utils/dates';
import { runWeeklyPrescriptionStep } from './weeklyPrescriptionStep';
import { computeForecastReplan } from '../engine/adaptiveReplanner';
import { applyPlanChangeItems } from '../engine/proposalEngine';

// De eerste start: een lege app plant niets tot je hebt gezegd wat je wilt, en
// het plan komt als voorstel met Akkoord (docs/beslissingen/2026-10-25-eerst-vragen-dan-plannen.md).
// Testdata is nagemaakt en de datum staat vast.

const TODAY = '2026-11-02';

async function facts() {
  const [programs, planned, logs, goals] = await Promise.all([ProgramsRepo.getAll(), PlannedSessionsRepo.getAll(), SessionLogsRepo.getAll(), TrainingGoalsRepo.getAll()]);
  return { programs: programs.length, plannedSessions: planned.length, sessionLogs: logs.length, trainingGoals: goals.length };
}

async function inputFor(answers: StartAnswers, withExisting = false): Promise<{ input: HorizonChangeInput; setup: ReturnType<typeof buildFirstPlan> }> {
  const templates = await SessionTemplatesRepo.getAll();
  const existing = withExisting ? { kind: kindOfExistingGoals(await TrainingGoalsRepo.getAll(), await GoalMilestonesRepo.getAll()) } : undefined;
  const setup = buildFirstPlan(answers, templates, TODAY, undefined, existing);
  const { marathonRaceType, marathonTargetDate, ...rest } = setup.settings;
  return {
    setup,
    input: {
      title: setup.title,
      why: 'Volgt je antwoorden.',
      explanation: 'Test.',
      trigger: 'goal_created',
      program: setup.program,
      goals: setup.goals,
      settings: { ...rest, ...(marathonRaceType ? { marathonRaceType, marathonTargetDate } : {}) },
      firstPlan: { milestones: setup.milestones, strategy: setup.strategy, allowedDays: setup.allowedDays, restDay: setup.settings.restDay },
    },
  };
}

describe('een nieuwe app', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    await wipeAllData();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('start leeg: de sjablonen zijn er, een programma, doel en planning niet', async () => {
    await runBootMigrations({ build: 'test-first-start' });
    expect((await SessionTemplatesRepo.getAll()).length).toBeGreaterThan(5);
    expect(await facts()).toEqual({ programs: 0, plannedSessions: 0, sessionLogs: 0, trainingGoals: 0 });
    expect(isEmptyStart(await facts())).toBe(true);
    expect(await StrengthProgramStrategiesRepo.getAll()).toEqual([]);
    expect(await MetaRepo.get('seeded')).toBe(true);
    expect(await MetaRepo.get('seededAt')).toBeUndefined();
  });

  it('de planningsronde plant niets zonder programma, ook niet na een tweede opening', async () => {
    await runBootMigrations({ build: 'test-first-start' });
    const result = await syncProgramHorizon();
    expect(result).toMatchObject({ added: 0, swapped: 0, removed: 0 });
    await runBootMigrations({ build: 'test-first-start-2' });
    await syncProgramHorizon();
    expect((await PlannedSessionsRepo.getAll()).length).toBe(0);
  });

  it('het standaardprogramma met planning blijft beschikbaar met de gewone aanroep (voor de tests en de demo)', async () => {
    await seedIfEmpty();
    expect((await ProgramsRepo.getAll()).length).toBe(1);
    expect((await PlannedSessionsRepo.getAll()).length).toBeGreaterThan(50);
    expect(await MetaRepo.get('seededAt')).toBeTruthy();
  });

  it('een bestaande installatie verandert niet bij het openen', async () => {
    await seedIfEmpty();
    await runBootMigrations({ build: 'test-existing-1' });
    await syncProgramHorizon();
    const key = async () => JSON.stringify({
      planned: [...(await PlannedSessionsRepo.getAll())].sort((a, b) => a.id.localeCompare(b.id)),
      programs: await ProgramsRepo.getAll(),
      goals: await TrainingGoalsRepo.getAll(),
    });
    const before = await key();
    await seedIfEmpty({ withProgram: false });
    await runBootMigrations({ build: 'test-existing-2' });
    await syncProgramHorizon();
    expect(await key()).toBe(before);
  });

  it('gegevens zonder merkteken worden niet overschreven en tellen niet als lege start', async () => {
    await seedIfEmpty();
    const program = (await ProgramsRepo.getAll())[0];
    await ProgramsRepo.put({ ...program, name: 'Mijn eigen programma' });
    await MetaRepo.set('seeded', false);
    await seedIfEmpty({ withProgram: false });
    expect((await ProgramsRepo.getAll())[0].name).toBe('Mijn eigen programma');
    expect(isEmptyStart(await facts())).toBe(false);
  });
});

describe('het eerste plan als voorstel met Akkoord', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    await wipeAllData();
    await runBootMigrations({ build: 'test-first-plan' });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('het voorstel schrijft niets; Akkoord zet het plan neer op de gekozen dagen', async () => {
    const { input, setup } = await inputFor({ ...defaultAnswers('trek'), goalDate: '2027-07-10', daysPerWeek: 4, allowedDays: [2, 4, 6, 7] });
    const plan = await computeHorizonPlan(input);
    expect(plan.proposal.changes.length).toBeGreaterThan(0);
    expect(plan.proposal.changes.every((c) => c.action === 'add')).toBe(true);
    // Alleen kijken: er is nog niets opgeslagen.
    expect(await facts()).toEqual({ programs: 0, plannedSessions: 0, sessionLogs: 0, trainingGoals: 0 });
    expect(await GoalMilestonesRepo.getAll()).toEqual([]);

    const result = await applyHorizonPlanNow(plan);
    expect(result.status).toBe('applied');
    expect((await ProgramsRepo.getAll()).length).toBe(1);
    expect((await TrainingGoalsRepo.getAll()).map((g) => g.targetDate)).toEqual(['2027-07-10']);
    expect((await GoalMilestonesRepo.getAll()).length).toBe(setup.milestones.length);
    expect((await StrengthProgramStrategiesRepo.getAll())).toHaveLength(1);
    expect((await GoalEngineConfigRepo.get()).availability.allowedDays).toEqual(['tue', 'thu', 'sat', 'sun']);
    expect(await MetaRepo.get('strengthProgramDefaultSeeded')).toBe(true);
    expect((await SettingsRepo.get()).restDay).toBe(setup.settings.restDay);

    // De week: vier trainingen op de dagen die kunnen, en rust op de rustdag.
    const planned = await PlannedSessionsRepo.getAll();
    const templates = new Map((await SessionTemplatesRepo.getAll()).map((t) => [t.id, t]));
    const training = planned.filter((s) => templates.get(s.templateId)?.type !== 'recovery' && s.status !== 'skipped');
    expect(training.length).toBeGreaterThan(40);
    for (const s of training) expect([2, 4, 6, 7]).toContain(isoWeekday(s.scheduledDate));
    const firstFullWeek = training.filter((s) => s.weekStartDate === '2026-11-09');
    expect(firstFullWeek).toHaveLength(4);
    expect(training.some((s) => isoWeekday(s.scheduledDate) === setup.settings.restDay)).toBe(false);
    // Niets in het verleden en niets vóór vandaag.
    expect(planned.every((s) => s.scheduledDate >= TODAY)).toBe(true);
  });

  it('een tweede planningsronde na Akkoord verandert niets meer', async () => {
    const { input } = await inputFor({ ...defaultAnswers('fit'), daysPerWeek: 3 });
    const plan = await computeHorizonPlan(input);
    expect((await applyHorizonPlanNow(plan)).status).toBe('applied');
    const rows = async () => JSON.stringify([...(await PlannedSessionsRepo.getAll())].sort((a, b) => a.id.localeCompare(b.id)));
    const before = await rows();
    const again = await syncProgramHorizon();
    expect(again).toMatchObject({ added: 0, swapped: 0, removed: 0 });
    expect(await rows()).toBe(before);
  });

  it('direct na het eerste plan is er geen reden om het krachtblok te herzien', async () => {
    const { input } = await inputFor({ ...defaultAnswers('trek'), goalDate: '2027-07-10' });
    const plan = await computeHorizonPlan(input);
    // Akkoord komt later dan de vragen.
    vi.setSystemTime(new Date(`${TODAY}T08:05:00`));
    expect((await applyHorizonPlanNow(plan)).status).toBe('applied');
    const [strategy] = await StrengthProgramStrategiesRepo.getAll();
    const config = await GoalEngineConfigRepo.get();
    const goals = await TrainingGoalsRepo.getAll();
    // Dezelfde vergelijkingen als state/AppDataContext.tsx#runStrengthReviewCheck.
    expect(goals.some((g) => g.status === 'active' && g.updatedAt > strategy.updatedAt)).toBe(false);
    expect(Boolean(config.updatedAt && config.updatedAt > strategy.updatedAt)).toBe(false);
    expect(strategy.createdAt).toBe(strategy.updatedAt);
  });

  it('de rest van de planning (forecast, weekprescriptie) houdt de gekozen week aan, ook ver vooruit', async () => {
    const { input } = await inputFor({ ...defaultAnswers('trek'), goalDate: '2027-07-10', daysPerWeek: 4, allowedDays: [2, 4, 6, 7] });
    expect((await applyHorizonPlanNow(await computeHorizonPlan(input))).status).toBe('applied');
    const templates = new Map((await SessionTemplatesRepo.getAll()).map((t) => [t.id, t]));
    // Wat de app bij een koude start daarna doet (zoals bootReplay.test.ts): sync, forecast, weekprescriptie, nog eens.
    for (let round = 0; round < 2; round++) {
      await runBootMigrations({ build: `test-m5-${round}` });
      await syncProgramHorizon();
      const planned = await PlannedSessionsRepo.getAll();
      const forecast = computeForecastReplan({ plannedSessions: planned, templates: [...templates.values()], availability: (await GoalEngineConfigRepo.get()).availability, asOf: TODAY });
      const { sessions, unsupported } = applyPlanChangeItems(forecast.proposal.changes, planned);
      expect(unsupported).toEqual([]);
      for (const s of sessions) await PlannedSessionsRepo.put(s);
      // De forecast vindt niets dat op een dag staat waarop je niet kunt.
      expect(forecast.proposal.changes, `ronde ${round}`).toEqual([]);
      await runWeeklyPrescriptionStep(TODAY);
    }
    const open = (await PlannedSessionsRepo.getAll()).filter((s) => s.status !== 'skipped');
    // Alles, ook een rustwandeling, staat op een dag waarop je kunt.
    for (const s of open) expect([2, 4, 6, 7], `${s.templateId} op ${s.scheduledDate}`).toContain(isoWeekday(s.scheduledDate));
    const all = open.filter((s) => templates.get(s.templateId)?.type !== 'recovery');
    const weeks = new Map<string, number>();
    for (const s of all) {
      weeks.set(s.weekStartDate, (weeks.get(s.weekStartDate) ?? 0) + 1);
    }
    // Elke volle week vanaf de eerste hele week (ook in het forecastbereik) heeft er vier.
    const fullWeeks = [...weeks.entries()].filter(([w]) => w >= '2026-11-09' && w < addDays(mondayOfWeek('2027-07-10'), -7));
    expect(fullWeeks.length).toBeGreaterThan(30);
    for (const [w, n] of fullWeeks) expect(n, `week ${w}`).toBe(4);
  });

  it('zonder kracht komt er geen krachtblok, en de vlag houdt het oude blok weg', async () => {
    const { input } = await inputFor({ ...defaultAnswers('fit'), strength: false, daysPerWeek: 3 });
    const plan = await computeHorizonPlan(input);
    await applyHorizonPlanNow(plan);
    expect(await StrengthProgramStrategiesRepo.getAll()).toEqual([]);
    await runBootMigrations({ build: 'test-first-plan-2' });
    expect(await StrengthProgramStrategiesRepo.getAll()).toEqual([]);
  });

  it('gaat er onderweg iets mis, dan is de app weer helemaal leeg', async () => {
    const { input } = await inputFor({ ...defaultAnswers('trek'), goalDate: '2027-07-10' });
    const plan = await computeHorizonPlan(input);
    const sync: typeof syncProgramHorizon = async () => { throw new Error('de ronde faalt'); };
    const result = await applyHorizonPlanNow(plan, { sync });
    expect(result.status).toBe('failed');
    expect(await facts()).toEqual({ programs: 0, plannedSessions: 0, sessionLogs: 0, trainingGoals: 0 });
    expect(await GoalMilestonesRepo.getAll()).toEqual([]);
    expect(await StrengthProgramStrategiesRepo.getAll()).toEqual([]);
    expect((await GoalEngineConfigRepo.get()).availability.allowedDays).toHaveLength(7);
    expect(isEmptyStart(await facts())).toBe(true);
  });

  it('is er intussen een programma, dan is het voorstel verlopen en gebeurt er niets', async () => {
    const { input } = await inputFor(defaultAnswers('fit'));
    const plan = await computeHorizonPlan(input);
    await ProgramsRepo.put({ id: 'prog_ander', name: 'Ander', startDate: '2026-11-02', phases: [] });
    const result = await applyHorizonPlanNow(plan);
    expect(result.status).toBe('stale');
    expect(await PlannedSessionsRepo.getAll()).toEqual([]);
  });

  it('"Schema opnieuw laden" en een nieuwe inhoudsversie houden de week die je koos', async () => {
    const { input } = await inputFor({ ...defaultAnswers('fit'), daysPerWeek: 3, allowedDays: [2, 4, 6] });
    expect((await applyHorizonPlanNow(await computeHorizonPlan(input))).status).toBe('applied');
    const templates = new Map((await SessionTemplatesRepo.getAll()).map((t) => [t.id, t]));
    const days = async () => (await PlannedSessionsRepo.getAll())
      .filter((s) => s.scheduledDate >= '2026-11-09' && templates.get(s.templateId)?.type !== 'recovery')
      .map((s) => isoWeekday(s.scheduledDate));
    await resetScheduleToDefault('next_week');
    expect(new Set(await days())).toEqual(new Set([2, 4, 6]));
    await MetaRepo.set('scheduleVersion', 1);
    await syncTemplateAndScheduleDefinitions();
    expect(new Set(await days())).toEqual(new Set([2, 4, 6]));
  });

  it('een doel dat al met de hand is ingesteld blijft staan en het plan komt erop te liggen', async () => {
    const handmade = buildFirstPlan({ ...defaultAnswers('race'), race: '10k', goalDate: '2027-03-14' }, await SessionTemplatesRepo.getAll(), TODAY).goals[0];
    await TrainingGoalsRepo.put(handmade);
    // Zonder programma gebeurt er met dat doel niets: de app moet nog steeds het eerste plan vragen.
    expect(await syncProgramHorizon()).toMatchObject({ added: 0 });
    expect(needsFirstPlan({ programs: 0, plannedSessions: 0 })).toBe(true);
    expect(isEmptyStart(await facts())).toBe(false);
    const { input } = await inputFor(defaultAnswers('race'), true);
    const plan = await computeHorizonPlan(input);
    expect((await applyHorizonPlanNow(plan)).status).toBe('applied');
    const goals = await TrainingGoalsRepo.getAll();
    expect(goals).toHaveLength(1);
    expect(goals[0].id).toBe(handmade.id);
    expect((await PlannedSessionsRepo.getAll()).length).toBeGreaterThan(20);
  });

  it('een hardloopwedstrijd zonder tocht plant ook (het wedstrijdblok), op de gekozen dagen', async () => {
    const { input } = await inputFor({ ...defaultAnswers('race'), race: '10k', goalDate: '2027-03-14', daysPerWeek: 4 });
    const plan = await computeHorizonPlan(input);
    expect((await applyHorizonPlanNow(plan)).status).toBe('applied');
    expect((await PlannedSessionsRepo.getAll()).length).toBeGreaterThan(20);
    expect((await TrainingGoalsRepo.getAll())[0].name).toBe('10 kilometer');
  });
});
