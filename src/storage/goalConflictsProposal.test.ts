import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, seedIfEmpty, syncProgramHorizon, TrainingGoalsRepo } from './database';
import { applyHorizonPlanNow, computeHorizonPlan, withAcceptedConflicts, withResolvedConflicts, type HorizonChangeInput } from './horizonPlan';
import type { TrainingGoal } from '../models/goals';

// Ronde 2b: een doel dat te dicht op een ander komt, staat in het voorstel met Akkoord, in gewone
// woorden. "Toch allebei" wordt bewaard op het doel en de melding komt dan niet terug.
// Testdata is nagemaakt.

const TODAY = '2026-10-21';
const base = { why: 'Test.', explanation: 'Test.', trigger: 'goal_created' as const };

function marathon(date: string, over: Partial<TrainingGoal> = {}): TrainingGoal {
  return {
    id: 'goal-test-marathon', name: 'Marathon', status: 'active', targetDate: date, createdAt: TODAY, updatedAt: TODAY,
    requirements: [{ id: 'req-m', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 42.2, unit: 'km' }, discipline: 'running' }],
    kind: 'run_race', details: { variant: 'marathon', distanceKm: 42.2 }, priority: 'top',
    ...over,
  } as TrainingGoal;
}

describe('botsende doelen in het voorstel', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    await wipeAllData();
    await seedIfEmpty();
    await runBootMigrations({ build: 'test-goal-conflicts', stepLimitMs: 120_000 });
    const main = (await TrainingGoalsRepo.getAll())[0];
    await TrainingGoalsRepo.put({ ...main, status: 'active', targetDate: '2027-08-01' } as TrainingGoal);
    await syncProgramHorizon();
  });
  afterEach(() => vi.useRealTimers());

  it('een Top-doel vlak voor de tocht: het voorstel zegt het in gewone woorden, en er verandert niets voor Akkoord', async () => {
    const input: HorizonChangeInput = { ...base, title: 'Marathon erbij', goals: [marathon('2027-07-04')] };
    const plan = await computeHorizonPlan(input);
    expect(plan.conflicts).toHaveLength(1);
    expect(plan.conflicts![0]).toMatchObject({ rule: 'TOP-TOP', gapDays: 28 });
    expect(plan.notes).toContain(plan.conflicts![0].message);
    expect(plan.notes).toContain(plan.conflicts![0].suggestion);
    expect(plan.conflicts![0].message).toContain('28 dagen ertussen');
    expect((await TrainingGoalsRepo.getAll()).some((g) => g.id === 'goal-test-marathon')).toBe(false);
  });

  it('een doel dat ruim genoeg ervoor of erna staat geeft geen melding', async () => {
    const plan = await computeHorizonPlan({ ...base, title: 'Marathon erbij', goals: [marathon('2027-03-14')] });
    expect(plan.conflicts).toBeUndefined();
  });

  it('"Toch allebei" wordt na Akkoord bewaard als datum van het andere doel, en dan komt de melding niet terug', async () => {
    const input: HorizonChangeInput = { ...base, title: 'Marathon erbij', goals: [marathon('2027-07-04')] };
    const first = await computeHorizonPlan(input);
    const accepted = await withAcceptedConflicts(input, first.conflicts!);
    const plan = await computeHorizonPlan(accepted);
    expect(plan.conflicts).toBeUndefined();
    expect((await applyHorizonPlanNow(plan)).status).toMatch(/applied|unchanged/);

    const stored = await TrainingGoalsRepo.getAll();
    const loser = stored.find((g) => g.id === first.conflicts![0].goalId)!;
    const other = stored.find((g) => g.id === first.conflicts![0].otherGoalId)!;
    expect(loser.conflictAccepted).toEqual([[loser.targetDate, other.targetDate].sort().join('|')]);

    // Dezelfde situatie nog eens voorstellen (een datum die gelijk blijft): geen nieuwe melding.
    const again = await computeHorizonPlan({ ...base, title: 'Nog eens', goals: [{ ...stored.find((g) => g.id === 'goal-test-marathon')!, name: 'Marathon in de zomer' }] });
    expect(again.conflicts).toBeUndefined();
  });

  it('het voorstel van ASCEND zelf (een label lager) is dezelfde wijziging met dat label, ook pas na Akkoord', async () => {
    const input: HorizonChangeInput = { ...base, title: 'Marathon erbij', goals: [marathon('2027-07-04')] };
    const first = await computeHorizonPlan(input);
    const resolved = await withResolvedConflicts(input, first.conflicts!);
    const changed = resolved.goals!.find((g) => g.id === first.conflicts![0].goalId)!;
    expect(changed.priority).toBe('voortop');
    const plan = await computeHorizonPlan(resolved);
    expect(plan.conflicts).toBeUndefined();
  });
});
