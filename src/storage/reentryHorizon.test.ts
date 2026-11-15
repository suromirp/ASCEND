import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, seedIfEmpty, syncProgramHorizon, PlannedSessionsRepo, SettingsRepo } from './database';
import { applyHorizonPlanNow, computeHorizonPlan, horizonLogWorthy, type HorizonChangeInput } from './horizonPlan';
import { undoPlanChangeNow } from './undoPlanChange';
import { SessionTemplatesRepo, ProgramsRepo } from './database';
import { primePlanningRegisters } from '../state/planningSync';
import { resolveEffectiveFullDuration, setDurationAdjustments } from '../engine/substitutions';
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
  afterEach(() => { vi.useRealTimers(); setDurationAdjustments([]); });

  it('alleen lengtes: het voorstel noemt ze, geen rij verandert, Akkoord bewaart de week', async () => {
    await syncProgramHorizon();
    const before = JSON.stringify(await PlannedSessionsRepo.getAll());
    const week = { from: TODAY, until: addDays(TODAY, 6), factor: 0.5 };
    const input: HorizonChangeInput = { title: 'Rustiger instap', why: 'Test.', explanation: 'Test.', trigger: 'reentry_planned', settings: { reentryWeeks: [week] } };
    const plan = await computeHorizonPlan(input);
    expect(plan.lengths.length).toBeGreaterThan(0);
    expect(plan.proposal.changes).toEqual([]);
    // De kop zegt wat er verandert, niet dat de planning niet hoeft te veranderen.
    expect(plan.proposal.consequences).toBe(`${plan.lengths.length} trainingen krijgen een andere lengte. Wat je al deed en wat je zelf vastzette blijft staan.`);
    expect(JSON.stringify(await PlannedSessionsRepo.getAll())).toBe(before);
    expect((await SettingsRepo.get()).reentryWeeks).toBeUndefined();
    const result = await applyHorizonPlanNow(plan);
    expect(result.status).toMatch(/applied|unchanged/);
    expect((await SettingsRepo.get()).reentryWeeks).toEqual([week]);
    expect(JSON.stringify(await PlannedSessionsRepo.getAll())).toBe(before);
    // De registers die Week en Vandaag lezen (refresh zet ze met dezelfde stap): korter tijdens de instap, en na het
    // terugzetten in de instellingen weer de gewone duur, zonder herladen.
    const templates = await SessionTemplatesRepo.getAll();
    const run = (await PlannedSessionsRepo.getAll()).find((s) => s.scheduledDate > TODAY && s.scheduledDate <= week.until && s.status !== 'skipped' && templates.find((t) => t.id === s.templateId)?.type === 'cardio')!;
    const tpl = templates.find((t) => t.id === run.templateId)!;
    const program = (await ProgramsRepo.getAll())[0];
    await primePlanningRegisters();
    const eased = resolveEffectiveFullDuration(tpl, run.scheduledDate, program);
    await SettingsRepo.set({ reentryWeeks: [] });
    await primePlanningRegisters();
    const plain = resolveEffectiveFullDuration(tpl, run.scheduledDate, program);
    expect(eased).toBeLessThan(plain);
    await SettingsRepo.set({ reentryWeeks: [week] });
    if (result.status === 'failed' || result.status === 'stale') throw new Error(result.status);
    // Alleen lengtes: toch in het logboek van wijzigingen.
    expect(horizonLogWorthy(plan, result)).toBe(true);
    expect(horizonLogWorthy({ lengths: [] }, { status: 'unchanged', restore: {} })).toBe(false);
    // Ongedaan maken zet de instellingen terug zoals ze waren: geen instap meer.
    await undoPlanChangeNow({ id: plan.proposal.id, trigger: 'reentry_planned', title: 'Rustiger instap', lines: [], why: '', before: result.before, addedIds: result.addedIds, settingsBefore: result.restore.settings, createdAt: new Date().toISOString() });
    expect((await SettingsRepo.get()).reentryWeeks).toBeUndefined();
  });
});
