import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import {
  wipeAllData, seedIfEmpty, syncProgramHorizon, PlannedSessionsRepo, TrainingGoalsRepo, SettingsRepo, ProgramsRepo, SessionTemplatesRepo, SessionLogsRepo,
} from './database';
import { applyHorizonPlanNow, computeHorizonPlan, type HorizonApplyResult, type HorizonPlan } from './horizonPlan';
import { undoPlanChangeNow } from './undoPlanChange';
import { resolveVariantDuration } from '../engine/substitutions';
import { computeSportDisableProposal, computeSportEnableProposal } from '../engine/scheduleFit';
import { DEFAULT_ENABLED_SPORTS, templateSport, weeklyPatternTemplates } from '../engine/sports';
import { DEFAULT_GOAL_ENGINE_CONFIG } from '../models/goalEngineConfig';
import type { TrainingGoal } from '../models/goals';
import type { PlannedSession } from '../models/training';
import type { RecentPlanChange } from '../models/planChange';

// Warden Planning (ronde 2), punten 2, 3, 7 en 9: Akkoord op een doel- of
// instellingsvoorstel is alles of niets, een voorbeeld zet nooit de gedeelde
// duren om, en ongedaan maken zet alles terug. Testdata is nagemaakt.

const TODAY = '2026-10-21';
const base = { why: 'Test.', explanation: 'Test.', trigger: 'goal_changed' as const };
const rows = async () => JSON.stringify([...(await PlannedSessionsRepo.getAll())].sort((a, b) => a.id.localeCompare(b.id)));

async function mainGoal(date: string): Promise<TrainingGoal> {
  const g0 = (await TrainingGoalsRepo.getAll())[0];
  const g = { ...g0, status: 'active', targetDate: date } as TrainingGoal;
  await TrainingGoalsRepo.put(g);
  return g;
}

// What AppDataContext#showHorizonResult puts in the notice, for undo.
function noticeOf(plan: HorizonPlan, result: HorizonApplyResult): RecentPlanChange {
  if (!('before' in result)) throw new Error(`niet toegepast: ${result.status}`);
  return {
    id: plan.proposal.id, trigger: plan.proposal.trigger, title: plan.proposal.issue, lines: [], why: '',
    before: result.before, addedIds: result.addedIds,
    settingsBefore: result.restore.settings, goalsBefore: result.restore.goals, goalsAdded: result.restore.newGoalIds,
    createdAt: new Date().toISOString(),
  };
}

describe('Akkoord op een doel of planningsinstelling: alles of niets', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    await wipeAllData();
    await seedIfEmpty();
    await runBootMigrations({ build: 'test-horizon-safety' });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('faalt de planningsronde in de tweede ronde, dan staat alles weer zoals het was en zegt het pas dan "niets aangepast"', async () => {
    const g = await mainGoal('2027-08-01');
    await syncProgramHorizon();
    const plan = await computeHorizonPlan({ ...base, title: 'Doeldatum', goals: [{ ...g, targetDate: '2027-01-15' }] });
    expect(plan.counts.removed).toBeGreaterThan(0);
    const planBefore = await rows();
    const programBefore = JSON.stringify(await ProgramsRepo.getAll());
    let calls = 0;
    const sync: typeof syncProgramHorizon = async (o) => {
      calls++;
      if (calls === 2) throw new Error('ronde 2 faalt');
      return syncProgramHorizon(o);
    };
    const result = await applyHorizonPlanNow(plan, { sync });
    expect(calls).toBe(2);
    expect(result.status).toBe('failed');
    expect(await rows()).toBe(planBefore);
    expect((await TrainingGoalsRepo.getAll()).find((x) => x.id === g.id)?.targetDate).toBe('2027-08-01');
    expect(JSON.stringify(await ProgramsRepo.getAll())).toBe(programBefore);
  });

  it('faalt de ronde na een instelling, dan staat ook de instelling terug', async () => {
    await mainGoal('2027-08-01');
    await syncProgramHorizon();
    const plan = await computeHorizonPlan({ ...base, trigger: 'availability_changed', title: 'De lange zondag', settings: { longSundaySession: 'run' } });
    const planBefore = await rows();
    const result = await applyHorizonPlanNow(plan, { sync: async () => { throw new Error('ronde faalt'); } });
    expect(result.status).toBe('failed');
    expect((await SettingsRepo.get()).longSundaySession).toBeUndefined();
    expect(await rows()).toBe(planBefore);
  });

  it('een voorbeeld met een andere ambitie zet de gedeelde duren nooit om, ook niet terwijl het rekent', async () => {
    await mainGoal('2027-08-01');
    await syncProgramHorizon();
    const [templates, programs, planned] = await Promise.all([SessionTemplatesRepo.getAll(), ProgramsRepo.getAll(), PlannedSessionsRepo.getAll()]);
    const byId = new Map(templates.map((t) => [t.id, t]));
    const target = planned
      .filter((s) => s.scheduledDate >= TODAY && s.scheduledDate <= '2026-11-03' && byId.get(s.templateId)?.weeklyProgression)
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
    const tpl = byId.get(target.templateId)!;
    const stored = resolveVariantDuration(tpl, 'full', target.scheduledDate, programs[0]);
    // Every other reader (Vandaag, Week, the watch sync) samples the registers
    // while the preview runs.
    const seen = new Set<number>();
    const timer = setInterval(() => seen.add(resolveVariantDuration(tpl, 'full', target.scheduledDate, programs[0])), 0);
    const plan = await computeHorizonPlan({ ...base, trigger: 'availability_changed', title: 'Ambitie', settings: { ambition: 'rustig' } });
    clearInterval(timer);
    expect(plan.lengths.length).toBeGreaterThan(0);
    expect(seen.size).toBeGreaterThan(0);
    expect([...seen]).toEqual([stored]);
    // And after a failed Akkoord too.
    await applyHorizonPlanNow(plan, { sync: async () => { throw new Error('faalt'); } });
    expect(resolveVariantDuration(tpl, 'full', target.scheduledDate, programs[0])).toBe(stored);
  });

  it('ongedaan maken van een andere doeldatum zet het doel en de rijen terug', async () => {
    const g = await mainGoal('2027-08-01');
    await syncProgramHorizon();
    const planBefore = await rows();
    const plan = await computeHorizonPlan({ ...base, title: 'Doeldatum', goals: [{ ...g, targetDate: '2027-01-15' }] });
    const result = await applyHorizonPlanNow(plan);
    expect(result.status).toBe('applied');
    await undoPlanChangeNow(noticeOf(plan, result));
    expect((await TrainingGoalsRepo.getAll()).find((x) => x.id === g.id)?.targetDate).toBe('2027-08-01');
    expect(await rows()).toBe(planBefore);
  });

  it('ongedaan maken van een nieuw doel uit de wizard haalt het doel weer weg', async () => {
    const g = await mainGoal('2027-08-01');
    await syncProgramHorizon();
    const planBefore = await rows();
    const race = {
      ...g, id: 'goal_test_halve', name: 'Halve marathon', planRole: undefined, targetDate: '2027-03-14', status: 'active',
      requirements: [{ id: 'req_test', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 21.1, unit: 'km' }, discipline: 'running' }],
    } as TrainingGoal;
    const plan = await computeHorizonPlan({ ...base, trigger: 'goal_created', title: 'Nieuw doel', goals: [race] });
    expect(plan.proposal.changes.length).toBeGreaterThan(0);
    const result = await applyHorizonPlanNow(plan);
    expect((await TrainingGoalsRepo.getAll()).some((x) => x.id === race.id)).toBe(true);
    const notice = noticeOf(plan, result);
    expect(notice.goalsAdded).toEqual([race.id]);
    await undoPlanChangeNow(notice);
    expect((await TrainingGoalsRepo.getAll()).some((x) => x.id === race.id)).toBe(false);
    expect(await rows()).toBe(planBefore);
    // The next sync finds nothing left to do.
    const again = await syncProgramHorizon();
    expect([again.added, again.swapped, again.removed]).toEqual([0, 0, 0]);
  });

  it('een sport uit en weer aan, met het eigen voorstel ervoor: pas na Akkoord, en ongedaan maken zet het terug', async () => {
    await mainGoal('2027-08-01');
    await syncProgramHorizon();
    const [planned, templates, logs, programs] = await Promise.all([PlannedSessionsRepo.getAll(), SessionTemplatesRepo.getAll(), SessionLogsRepo.getAll(), ProgramsRepo.getAll()]);
    const byId = new Map(templates.map((t) => [t.id, t]));
    const isRun = (s: PlannedSession) => { const t = byId.get(s.templateId); return !!t && templateSport(t) === 'running'; };
    const off = computeSportDisableProposal(isRun, 'Hardlopen', planned, logs, TODAY);
    expect(off.changes.length).toBeGreaterThan(0);
    const planBefore = await rows();
    const offPlan = await computeHorizonPlan({ ...base, trigger: 'availability_changed', title: 'Hardlopen uit', settings: { enabledSports: { ...DEFAULT_ENABLED_SPORTS, running: false } }, startItems: off.changes });
    expect((await SettingsRepo.get()).enabledSports?.running).toBeUndefined();
    expect(await rows()).toBe(planBefore);
    const offResult = await applyHorizonPlanNow(offPlan);
    expect(offResult.status).toBe('applied');
    expect((await SettingsRepo.get()).enabledSports?.running).toBe(false);
    const openRuns = (await PlannedSessionsRepo.getAll()).filter((s) => s.scheduledDate >= TODAY && s.status !== 'skipped' && isRun(s));
    expect(openRuns).toEqual([]);

    // On again: its own proposal puts runs back in the weeks ahead.
    const now = await PlannedSessionsRepo.getAll();
    const pattern = weeklyPatternTemplates(templates, { enabledSports: { running: true } }).filter((t) => templateSport(t) === 'running');
    const on = computeSportEnableProposal(pattern, 'Hardlopen', now, templates, programs[0], DEFAULT_GOAL_ENGINE_CONFIG.availability.dailyTimeBudget, DEFAULT_GOAL_ENGINE_CONFIG.strategy.sameDayPairingPreference, TODAY).proposal;
    const onPlan = await computeHorizonPlan({ ...base, trigger: 'availability_changed', title: 'Hardlopen aan', settings: { enabledSports: { ...DEFAULT_ENABLED_SPORTS, running: true } }, ...(on.changes.length ? { startItems: on.changes } : {}) });
    const onResult = await applyHorizonPlanNow(onPlan);
    expect(onResult.status).toBe('applied');
    expect((await SettingsRepo.get()).enabledSports?.running).toBe(true);
    expect((await PlannedSessionsRepo.getAll()).some((s) => s.scheduledDate >= TODAY && s.status !== 'skipped' && isRun(s))).toBe(true);

    // Undo of "aan" puts the plan of "uit" back, with the setting.
    const afterOff = JSON.stringify(offResult.status === 'applied' ? (await undoPlanChangeNow(noticeOf(onPlan, onResult))).settings?.enabledSports : null);
    expect(afterOff).toBe(JSON.stringify({ ...DEFAULT_ENABLED_SPORTS, running: false }));
  });
});
