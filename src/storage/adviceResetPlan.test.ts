import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, PlannedSessionsRepo, SettingsRepo, ProgramsRepo, SessionTemplatesRepo } from './database';
import { applyHorizonPlanNow, computeHorizonPlan, type HorizonChangeInput } from './horizonPlan';
import { resetPatch } from '../engine/settingsDiff';
import { primePlanningRegisters } from '../state/planningSync';
import { resolveEffectiveFullDuration } from '../engine/substitutions';
import { buildFirstPlan, defaultAnswers } from '../engine/firstPlan';

// Backlog Q (profiel instellingen, 14 november): Alles terug naar het advies zette de beginnersstart stil terug,
// en de duurlopen werden korter zonder voorstel. Nu: eerst een voorstel dat de kortere lengtes noemt, niets
// verandert voor Akkoord, en na Akkoord staat Week meteen goed (niet pas bij de volgende opening).
// Nagemaakte gebruiker: Fit blijven via de start, beginnersstart daarna zelf op Nee gezet.

const TODAY = '2026-11-24';
const WEEK_END = '2026-12-01';

async function weekMinutes(): Promise<Record<string, number>> {
  await primePlanningRegisters();
  const templates = await SessionTemplatesRepo.getAll();
  const program = (await ProgramsRepo.getAll())[0];
  const out: Record<string, number> = {};
  for (const s of await PlannedSessionsRepo.getAll()) {
    if (s.scheduledDate < TODAY || s.scheduledDate >= WEEK_END || s.status === 'skipped') continue;
    out[s.templateId] = s.plannedMinutes ?? resolveEffectiveFullDuration(templates.find((t) => t.id === s.templateId)!, s.scheduledDate, program);
  }
  return out;
}

describe('Alles terug naar het advies raakt de planning alleen met Akkoord', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T07:30:00`));
    await wipeAllData();
    await runBootMigrations({ build: 'test-advice-reset' });
    const setup = buildFirstPlan(defaultAnswers('fit'), await SessionTemplatesRepo.getAll(), TODAY);
    const { marathonRaceType: _r, marathonTargetDate: _d, ...settings } = setup.settings;
    const first: HorizonChangeInput = {
      title: setup.title, why: 'Test.', explanation: 'Test.', trigger: 'goal_created', program: setup.program, goals: setup.goals,
      settings: { ...settings, beginnerStart: 'nee' },
      firstPlan: { milestones: setup.milestones, strategy: setup.strategy, allowedDays: setup.allowedDays, restDay: setup.settings.restDay },
    };
    expect((await applyHorizonPlanNow(await computeHorizonPlan(first, { prime: primePlanningRegisters }), { prime: primePlanningRegisters })).status).toBe('applied');
  });
  afterEach(() => vi.useRealTimers());

  it('het voorstel noemt de kortere duurlopen; Akkoord zet ze meteen in Week', async () => {
    const before = await weekMinutes();
    expect(before).toMatchObject({ tpl_easy_run: 55, tpl_long_run: 95 });
    const settings = await SettingsRepo.get();
    const { now, plan: patch, planTitles } = resetPatch(settings, ['beginnersstart']);
    expect(now).toEqual({});
    expect(planTitles).toEqual(['Beginnersstart']);

    const stored = JSON.stringify(await PlannedSessionsRepo.getAll());
    const plan = await computeHorizonPlan({ title: 'Alle instellingen: terug naar het advies', why: 'Test.', explanation: 'Test.', trigger: 'availability_changed', settings: patch }, { prime: primePlanningRegisters });
    // De kop zegt wat er verandert, niet "hoeft niet te veranderen".
    expect(plan.proposal.consequences).not.toContain('hoeft niet');
    expect(plan.lengths).toContain('Rustige duurloop op do 26 november: 55 naar 35 minuten');
    expect(plan.lengths).toContain('Lange duurloop op zo 29 november: 95 naar 60 minuten');
    // Voor Akkoord verandert er niets.
    expect(JSON.stringify(await PlannedSessionsRepo.getAll())).toBe(stored);
    expect((await SettingsRepo.get()).beginnerStart).toBe('nee');
    expect(await weekMinutes()).toEqual(before);

    const result = await applyHorizonPlanNow(plan, { prime: primePlanningRegisters });
    expect(result.status).toMatch(/applied|unchanged/);
    expect((await SettingsRepo.get()).beginnerStart).toBeUndefined();
    // Meteen, zonder nieuwe opening: wat het voorstel liet zien.
    expect(await weekMinutes()).toMatchObject({ tpl_easy_run: 35, tpl_long_run: 60 });
  });

  it('Liever niet: geen Akkoord, dan blijven instelling en week zoals ze waren', async () => {
    const before = await weekMinutes();
    const { plan: patch } = resetPatch(await SettingsRepo.get(), ['beginnersstart']);
    await computeHorizonPlan({ title: 'Terug', why: 'Test.', explanation: 'Test.', trigger: 'availability_changed', settings: patch }, { prime: primePlanningRegisters });
    expect((await SettingsRepo.get()).beginnerStart).toBe('nee');
    expect(await weekMinutes()).toEqual(before);
  });
});
