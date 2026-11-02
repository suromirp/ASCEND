import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, syncProgramHorizon, PlannedSessionsRepo, SessionTemplatesRepo, SettingsRepo } from './database';
import { applyHorizonPlanNow, computeHorizonPlan, type HorizonChangeInput } from './horizonPlan';
import { buildBackupEnvelope, normalizeBackupToCurrentModel } from './backup';
import { buildFirstPlan, defaultAnswers } from '../engine/firstPlan';
import type { SportHandlingMap } from '../engine/sportRole';

// Sporten die meetellen, stap 7: een vaste dag komt pas met Akkoord in je planning, en de rijen reizen mee
// in de back-up. Nagemaakte data.
const TODAY = '2026-11-02';
const football: SportHandlingMap = { football: { role: 'fixed', fixed: [{ day: 2, minutes: 60, intensity: 'moderate' }, { day: 6, minutes: 90, intensity: 'high' }] } };

async function start() {
  await runBootMigrations({ build: 'test-fixed' });
  const setup = buildFirstPlan({ ...defaultAnswers('fit'), daysPerWeek: 4 }, await SessionTemplatesRepo.getAll(), TODAY, `${TODAY}T08:00:00.000Z`);
  const { marathonRaceType: _a, marathonTargetDate: _b, ...rest } = setup.settings;
  void _a; void _b;
  const input: HorizonChangeInput = {
    title: setup.title, why: 'Test.', explanation: 'Test.', trigger: 'goal_created', program: setup.program, goals: setup.goals, settings: rest,
    firstPlan: { milestones: setup.milestones, strategy: setup.strategy, allowedDays: setup.allowedDays, restDay: setup.settings.restDay },
  };
  expect((await applyHorizonPlanNow(await computeHorizonPlan(input))).status).toBe('applied');
  await syncProgramHorizon();
}

describe('vaste dag via het voorstel', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    await wipeAllData();
  });
  afterEach(() => vi.useRealTimers());

  it('eerst het voorstel, pas met Akkoord de rijen; daarna verandert de dagelijkse ronde niets', async () => {
    await start();
    const before = await PlannedSessionsRepo.getAll();
    const plan = await computeHorizonPlan({ title: 'Voetbal vast', why: 'Test.', explanation: 'Test.', trigger: 'availability_changed', settings: { sportHandling: football } });
    expect(plan.proposal.changes.length).toBeGreaterThan(0);
    // Nog niets bewaard.
    expect(await PlannedSessionsRepo.getAll()).toEqual(before);
    expect((await SettingsRepo.get()).sportHandling).toBeUndefined();
    expect((await applyHorizonPlanNow(plan)).status).toBe('applied');
    const rows = (await PlannedSessionsRepo.getAll()).filter((s) => s.fixed);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((s) => s.lock?.by === 'user' && s.templateId === 'sport_football')).toBe(true);
    const again = await syncProgramHorizon();
    expect(again.repairs).toBeUndefined();
  });

  it('een vaste rij reist mee in de back-up; een kapotte afspraak valt weg en de rij blijft', async () => {
    await start();
    await applyHorizonPlanNow(await computeHorizonPlan({ title: 'Voetbal vast', why: 'Test.', explanation: 'Test.', trigger: 'availability_changed', settings: { sportHandling: football } }));
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.plannedSessions?.filter((s) => s.fixed).length).toBeGreaterThan(0);
    envelope.payload.plannedSessions = envelope.payload.plannedSessions.map((s: { fixed?: unknown }) => (s.fixed ? { ...s, fixed: { sport: 'tennis', day: 9 } } : s));
    const broken = normalizeBackupToCurrentModel(envelope);
    expect(broken.plannedSessions?.some((s) => s.fixed)).toBe(false);
    expect(broken.plannedSessions?.length).toBe(back.plannedSessions?.length);
  });
});
