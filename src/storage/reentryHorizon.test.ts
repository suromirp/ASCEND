import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, seedIfEmpty, syncProgramHorizon, PlannedSessionsRepo, SettingsRepo } from './database';
import { applyHorizonPlanNow, computeHorizonPlan, type HorizonChangeInput } from './horizonPlan';
import { addDays } from '../utils/dates';

// Rustiger instap na een pauze (engine/reentry.ts) door de echte planningsronde: het voorstel noemt de
// trainingen die korter worden, er verandert niets voor Akkoord en geen rij, en na Akkoord staat de week in
// de instellingen. Alles nagemaakt.
const TODAY = '2026-10-21';

describe('rustiger instap als voorstel van de planningsronde', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    await wipeAllData();
    await seedIfEmpty();
    await runBootMigrations({ build: 'test-reentry', stepLimitMs: 120_000 });
  });
  afterEach(() => vi.useRealTimers());

  it('alleen lengtes: het voorstel noemt ze, geen rij verandert, Akkoord bewaart de week', async () => {
    await syncProgramHorizon();
    const before = JSON.stringify(await PlannedSessionsRepo.getAll());
    const week = { from: TODAY, until: addDays(TODAY, 6), factor: 0.5 };
    const input: HorizonChangeInput = { title: 'Rustiger instap', why: 'Test.', explanation: 'Test.', trigger: 'reentry_planned', settings: { reentryWeeks: [week] } };
    const plan = await computeHorizonPlan(input);
    expect(plan.lengths.length).toBeGreaterThan(0);
    expect(plan.proposal.changes).toEqual([]);
    expect(JSON.stringify(await PlannedSessionsRepo.getAll())).toBe(before);
    expect((await SettingsRepo.get()).reentryWeeks).toBeUndefined();
    const result = await applyHorizonPlanNow(plan);
    expect(result.status).toMatch(/applied|unchanged/);
    expect((await SettingsRepo.get()).reentryWeeks).toEqual([week]);
    expect(JSON.stringify(await PlannedSessionsRepo.getAll())).toBe(before);
  });
});
