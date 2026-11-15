import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, seedIfEmpty, syncProgramHorizon, PlannedSessionsRepo, SessionTemplatesRepo, SessionLogsRepo, SettingsRepo, ProgramsRepo, GoalEngineConfigRepo } from './database';
import { applyHorizonPlanNow, computeHorizonPlan } from './horizonPlan';
import { runWeeklyPrescriptionStep } from './weeklyPrescriptionStep';
import { computeSportDisableProposal, computeSportEnableProposal } from '../engine/scheduleFit';
import { isStrengthTemplate, STRENGTH_OFF_WARNING } from '../engine/strengthTraining';
import { DEFAULT_ENABLED_SPORTS, weeklyPatternTemplates } from '../engine/sports';
import { primePlanningRegisters } from '../state/planningSync';
import { addDays } from '../utils/dates';

// Backlog Q en besluit 2026-11-14-keuzes-avond.md punt 3: kracht mag uit, met een waarschuwing, en de planning
// verandert alleen via een voorstel. Door de echte planningsronde: voor Akkoord niets, na Akkoord geen
// krachttraining meer (ook niet na een nieuwe opening of het weekvoorschrift), en weer aan zet ze terug.
// Nagemaakte gebruiker: het volledige programma met zijn doel.

const TODAY = '2026-11-16';
const UNTIL = addDays(TODAY, 27);

async function openStrength(): Promise<string[]> {
  const templates = await SessionTemplatesRepo.getAll();
  const logged = new Set((await SessionLogsRepo.getAll()).map((l) => l.plannedSessionId));
  return (await PlannedSessionsRepo.getAll())
    .filter((s) => s.scheduledDate >= TODAY && s.scheduledDate <= UNTIL && s.status !== 'skipped' && !logged.has(s.id))
    .filter((s) => { const t = templates.find((x) => x.id === s.templateId); return !!t && isStrengthTemplate(t); })
    .map((s) => `${s.scheduledDate} ${s.templateId}`);
}

async function strengthInput(on: boolean) {
  const [planned, templates, logs, settings, programs, config] = await Promise.all([
    PlannedSessionsRepo.getAll(), SessionTemplatesRepo.getAll(), SessionLogsRepo.getAll(), SettingsRepo.get(), ProgramsRepo.getAll(), GoalEngineConfigRepo.get(),
  ]);
  const byId = new Map(templates.map((t) => [t.id, t]));
  const items = on
    ? computeSportEnableProposal(
        weeklyPatternTemplates(templates, { ...settings, enabledSports: { ...DEFAULT_ENABLED_SPORTS, ...settings.enabledSports }, strengthTraining: undefined }).filter(isStrengthTemplate),
        'Krachttraining', planned, templates, programs[0], config.availability.dailyTimeBudget, 'automatic', TODAY,
      ).proposal.changes
    : computeSportDisableProposal((s) => { const t = byId.get(s.templateId); return !!t && isStrengthTemplate(t); }, 'Krachttraining', planned, logs, TODAY).changes;
  return {
    title: on ? 'Krachttraining weer aangezet' : 'Krachttraining uitgezet', why: 'Test.', explanation: 'Test.', trigger: 'availability_changed' as const,
    settings: { strengthTraining: on ? undefined : (false as const) }, startItems: items, ...(on ? {} : { notes: [STRENGTH_OFF_WARNING] }),
  };
}

describe('krachttraining uit en weer aan', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    await wipeAllData();
    await seedIfEmpty();
    await runBootMigrations({ build: 'test-strength-off', seedProgram: true });
    await syncProgramHorizon();
  });
  afterEach(() => vi.useRealTimers());

  it('uit: eerst een voorstel met de waarschuwing, pas na Akkoord geen krachttraining meer', async () => {
    const strengthBefore = await openStrength();
    expect(strengthBefore.length).toBeGreaterThan(0);
    const stored = JSON.stringify(await PlannedSessionsRepo.getAll());
    const plan = await computeHorizonPlan(await strengthInput(false), { prime: primePlanningRegisters });
    expect(plan.notes).toContain(STRENGTH_OFF_WARNING);
    expect(plan.proposal.changes.filter((c) => c.action === 'remove').length).toBeGreaterThanOrEqual(strengthBefore.length);
    // Voor Akkoord verandert er niets.
    expect(JSON.stringify(await PlannedSessionsRepo.getAll())).toBe(stored);
    expect((await SettingsRepo.get()).strengthTraining).toBeUndefined();

    expect((await applyHorizonPlanNow(plan, { prime: primePlanningRegisters })).status).toBe('applied');
    expect((await SettingsRepo.get()).strengthTraining).toBe(false);
    expect(await openStrength()).toEqual([]);
    // Een nieuwe opening en het weekvoorschrift brengen haar niet terug.
    await syncProgramHorizon();
    await runWeeklyPrescriptionStep(TODAY);
    await syncProgramHorizon();
    expect(await openStrength()).toEqual([]);
    // De week houdt lopen.
    const templates = await SessionTemplatesRepo.getAll();
    const runs = (await PlannedSessionsRepo.getAll()).filter((s) => s.scheduledDate >= TODAY && s.scheduledDate <= addDays(TODAY, 6) && s.status !== 'skipped' && templates.find((t) => t.id === s.templateId)?.type !== 'strength');
    expect(runs.length).toBeGreaterThan(0);
  });

  it('weer aan: de krachttrainingen komen terug, ook pas na Akkoord', async () => {
    const strengthBefore = await openStrength();
    await applyHorizonPlanNow(await computeHorizonPlan(await strengthInput(false), { prime: primePlanningRegisters }), { prime: primePlanningRegisters });
    expect(await openStrength()).toEqual([]);
    const plan = await computeHorizonPlan(await strengthInput(true), { prime: primePlanningRegisters });
    expect(await openStrength()).toEqual([]);
    expect(plan.proposal.changes.some((c) => c.action === 'add')).toBe(true);
    await applyHorizonPlanNow(plan, { prime: primePlanningRegisters });
    expect((await SettingsRepo.get()).strengthTraining).toBeUndefined();
    const back = await openStrength();
    expect(back.length).toBeGreaterThan(0);
    // Dezelfde soorten als ervoor.
    expect(new Set(back.map((x) => x.split(' ')[1]))).toEqual(new Set(strengthBefore.map((x) => x.split(' ')[1])));
  });
});
