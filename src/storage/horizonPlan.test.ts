import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, seedIfEmpty, syncProgramHorizon, PlannedSessionsRepo, TrainingGoalsRepo, SettingsRepo } from './database';
import { applyHorizonPlanNow, computeHorizonPlan, type HorizonChangeInput } from './horizonPlan';
import { previewProposal } from '../engine/proposalPreview';
import type { TrainingGoal } from '../models/goals';
import { SessionTemplatesRepo } from './database';

// Warden Logica punten 1 en 2: een andere doeldatum en "De lange zondag" worden
// een voorstel met wat er verdwijnt of omgaat, niets verandert voor Akkoord, en
// na Akkoord krijg je precies wat het voorstel liet zien.

const TODAY = '2026-10-21';
const lock = { by: 'user' as const, at: '2026-10-21T08:00:00.000Z' };
const base = { why: 'Test.', explanation: 'Test.', trigger: 'goal_changed' as const };

async function goal(date: string): Promise<TrainingGoal> {
  const g0 = (await TrainingGoalsRepo.getAll())[0];
  const g = { ...g0, status: 'active', targetDate: date } as TrainingGoal;
  await TrainingGoalsRepo.put(g);
  return g;
}

describe('doel of planningsinstelling als voorstel met Akkoord', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    await wipeAllData();
    await seedIfEmpty();
    await runBootMigrations({ build: 'test-horizon-plan' });
  });
  afterEach(() => vi.useRealTimers());

  it('een vroegere doeldatum: het voorstel noemt wat vervalt en wat jij vastzette, er verandert niets voor Akkoord', async () => {
    const g = await goal('2027-08-01');
    await syncProgramHorizon();
    const mine = (await PlannedSessionsRepo.getAll()).find((s) => s.scheduledDate > '2027-03-01' && s.status !== 'skipped')!;
    await PlannedSessionsRepo.put({ ...mine, lock });
    const before = JSON.stringify(await PlannedSessionsRepo.getAll());

    const input: HorizonChangeInput = { ...base, title: 'Doeldatum', goals: [{ ...g, targetDate: '2027-01-15' }] };
    const plan = await computeHorizonPlan(input);
    expect(plan.counts.removed).toBeGreaterThan(20);
    expect(plan.proposal.changes.some((i) => i.plannedSessionId === mine.id)).toBe(false);
    expect(plan.notes.some((n) => n.includes('zette je zelf vast'))).toBe(true);
    expect(plan.proposal.consequences).toContain('vervallen');
    expect(JSON.stringify(await PlannedSessionsRepo.getAll())).toBe(before);
    expect((await TrainingGoalsRepo.getAll()).find((x) => x.id === g.id)?.targetDate).toBe('2027-08-01');
    expect(plan.restore.goals[0].targetDate).toBe('2027-08-01');

    // The preview shows the same as the run after Akkoord.
    const templates = await SessionTemplatesRepo.getAll();
    const shown = previewProposal(plan.proposal.changes, JSON.parse(before), templates, (s) => s);
    const result = await applyHorizonPlanNow(plan);
    expect(result.status).toBe('applied');
    const after = await PlannedSessionsRepo.getAll();
    expect(after.find((s) => s.id === mine.id)).toBeTruthy();
    expect(after.filter((s) => s.scheduledDate >= '2027-01-15' && !s.lock)).toEqual([]);
    expect(shown.moves.filter((m) => m.action === 'remove').length).toBe(plan.counts.removed);
    // A second run finds nothing left to do.
    const again = await syncProgramHorizon();
    expect([again.added, again.swapped, again.removed]).toEqual([0, 0, 0]);
    if (result.status !== 'stale') expect(result.before.length).toBeGreaterThan(20);
  });

  it('De lange zondag op Duurloop: bergtochten worden lange duurlopen, behalve de vastgezette, en pas na Akkoord', async () => {
    await goal('2027-08-01');
    await syncProgramHorizon();
    const hikes = (await PlannedSessionsRepo.getAll()).filter((s) => s.templateId === 'tpl_mountain_hike' && s.scheduledDate >= TODAY);
    await PlannedSessionsRepo.put({ ...hikes[0], lock });
    const plan = await computeHorizonPlan({ ...base, trigger: 'availability_changed', title: 'De lange zondag', settings: { longSundaySession: 'run' } });
    expect(plan.counts.changed).toBeGreaterThanOrEqual(hikes.length - 1);
    expect(plan.proposal.changes.some((i) => i.plannedSessionId === hikes[0].id)).toBe(false);
    expect((await SettingsRepo.get()).longSundaySession).toBeUndefined();
    expect(plan.restore.settings).toEqual({ longSundaySession: undefined });
    await applyHorizonPlanNow(plan);
    expect((await SettingsRepo.get()).longSundaySession).toBe('run');
    const all = await PlannedSessionsRepo.getAll();
    expect(all.find((s) => s.id === hikes[0].id)?.templateId).toBe('tpl_mountain_hike');
    expect(all.filter((s) => s.templateId === 'tpl_mountain_hike' && s.scheduledDate >= TODAY).length).toBe(1);
  });

  it('is de planning intussen veranderd, dan gebeurt er niets', async () => {
    await goal('2027-08-01');
    await syncProgramHorizon();
    const plan = await computeHorizonPlan({ ...base, title: 'De lange zondag', settings: { longSundaySession: 'run' } });
    const hike = (await PlannedSessionsRepo.getAll()).find((s) => s.templateId === 'tpl_mountain_hike')!;
    await PlannedSessionsRepo.put({ ...hike, lock });
    expect((await applyHorizonPlanNow(plan)).status).toBe('stale');
    expect((await SettingsRepo.get()).longSundaySession).toBeUndefined();
  });
});
