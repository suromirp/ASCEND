import { describe, it, expect, beforeEach } from 'vitest';
import { GoalMilestonesRepo, TrainingGoalsRepo, wipeAllData } from './database';
import { RoutePlanRepo } from './routePlan';
import { migrateGoalKinds } from './goalMigration';
import { normalizeBackupToCurrentModel } from './backup';
import { migrateTrainingGoal, migrateTrainingGoals, priorityFromPlanRole, readGoalDetails, readGoalKind, readGoalPriority, routePlanUsesTent } from './migrations';
import type { GoalMilestone, GoalRequirement, TrainingGoal } from '../models/goals';
import { computeGr5Readiness } from '../engine/gr5Readiness';
import { computeGoalReadiness } from '../engine/goalReadiness';

// Nagemaakte doelen.
const req = (kind: GoalRequirement['kind'], amount: number, unit: string, scope: GoalRequirement['scope'], discipline?: string): GoalRequirement => ({
  id: `${kind}-${scope}`, kind, scope, target: { amount, unit } as GoalRequirement['target'], ...(discipline ? { discipline } : {}),
});
const NOW = '2026-09-01T00:00:00.000Z';
const trekGoal: TrainingGoal = {
  id: 'goal_trek', name: 'Tocht door de bergen', status: 'active', targetDate: '2027-07-01', createdAt: NOW, updatedAt: NOW,
  execution: 'stages',
  requirements: [
    req('distance', 600, 'km', 'TOTAL_EVENT', 'hiking'), req('elevationGain', 30000, 'm', 'TOTAL_EVENT'), req('elevationLoss', 28000, 'm', 'TOTAL_EVENT'),
    req('eventDays', 30, 'days', 'TOTAL_EVENT', 'hiking'), req('packWeight', 14, 'kg', 'SINGLE_EVENT'), req('consecutiveDays', 6, 'days', 'CONSECUTIVE_DAYS'),
  ],
};
const raceGoal = (id: string, planRole?: TrainingGoal['planRole']): TrainingGoal => ({
  id, name: 'Wedstrijd', status: 'active', targetDate: '2027-03-14', createdAt: NOW, updatedAt: NOW,
  requirements: [req('distance', 21.1, 'km', 'SINGLE_EVENT', 'running'), req('targetTime', 110, 'min', 'SINGLE_EVENT', 'running')],
  ...(planRole ? { planRole } : {}),
});
const followGoal: TrainingGoal = { id: 'goal_follow', name: 'Eigen doel', status: 'active', targetDate: '2027-05-01', createdAt: NOW, updatedAt: NOW, requirements: [], planRole: 'track' };

describe('soort, gegevens en belangrijkheid van een doel', () => {
  it('het hoofddoel met mijlpalen wordt een tocht met hutten, met de huidige getallen en priority top', () => {
    const next = migrateTrainingGoal(trekGoal, { isMain: true, tent: false });
    expect(next.kind).toBe('trek_hut');
    expect(next.priority).toBe('top');
    expect(next.details).toEqual({ shelter: 'hut', distanceKm: 600, gainM: 30000, lossM: 28000, days: 30, packKg: 14, homeDaysInRow: 2 });
    // Niets anders is aangeraakt.
    expect(next.requirements).toBe(trekGoal.requirements);
    expect(next.targetDate).toBe('2027-07-01');
    expect(next.updatedAt).toBe(NOW);
  });

  it('met een gekozen nacht in tent of bivak wordt het een tocht met tent', () => {
    expect(migrateTrainingGoal(trekGoal, { isMain: true, tent: true }).kind).toBe('trek_tent');
    expect(routePlanUsesTent({ choices: { a: { sleep: 'gite' }, b: { sleep: 'bivak' } } })).toBe(true);
    expect(routePlanUsesTent({ choices: { a: { sleep: 'tent' } } })).toBe(true);
    expect(routePlanUsesTent({ choices: { a: { sleep: 'gite' }, b: {} } })).toBe(false);
    expect(routePlanUsesTent({ choices: {} })).toBe(false);
    expect(routePlanUsesTent(null)).toBe(false);
    expect(routePlanUsesTent({ choices: null as never })).toBe(false);
  });

  it('een hardloopdoel wordt run_race, met de belangrijkheid uit planRole', () => {
    const main = migrateTrainingGoal(raceGoal('a', 'main'), { isMain: false, tent: false });
    expect(main).toMatchObject({ kind: 'run_race', priority: 'top', planRole: 'main' });
    expect(main.details).toEqual({ variant: 'half', distanceKm: 21.1, targetMinutes: 110 });
    expect(migrateTrainingGoal(raceGoal('b', 'secondary'), { isMain: false, tent: false }).priority).toBe('voortop');
    expect(migrateTrainingGoal(raceGoal('c', 'track'), { isMain: false, tent: false }).priority).toBe('verkenning');
    // Zonder rol las de planning een andere wedstrijd al als tussendoel.
    expect(migrateTrainingGoal(raceGoal('d'), { isMain: false, tent: false }).priority).toBe('voortop');
  });

  it('"alleen volgen" bestaat niet meer: het wordt verkenning, zonder soort', () => {
    const next = migrateTrainingGoal(followGoal, { isMain: false, tent: false });
    expect(next.priority).toBe('verkenning');
    expect(next.kind).toBeUndefined();
    expect(next.planRole).toBe('track');
  });

  it('is idempotent en houdt de volgorde van de velden, zodat opstarten niets herschrijft', () => {
    const once = migrateTrainingGoal(trekGoal, { isMain: true, tent: false });
    const twice = migrateTrainingGoal(once, { isMain: true, tent: false });
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
    const again = migrateTrainingGoal(once, { isMain: true, tent: true });
    expect(again.kind).toBe('trek_hut'); // een bestaande soort wordt niet omgezet
  });

  it('leest oude en kapotte velden defensief', () => {
    expect(readGoalKind('trail')).toBe('trail');
    expect(readGoalKind('onzin')).toBeUndefined();
    expect(readGoalKind(5)).toBeUndefined();
    expect(readGoalPriority('voortop')).toBe('voortop');
    expect(readGoalPriority('main')).toBeUndefined();
    expect(priorityFromPlanRole('main')).toBe('top');
    expect(priorityFromPlanRole('rommel')).toBeUndefined();
    expect(readGoalDetails(null)).toBeUndefined();
    expect(readGoalDetails([1, 2])).toBeUndefined();
    expect(readGoalDetails({ distanceKm: -3, gainM: 'veel', packKg: 12, shelter: 'kasteel', variant: 'half', extra: 1 })).toEqual({ variant: 'half', packKg: 12 });
    // De velden voor een tijdslimiet en een cutoff: een back-up zonder ze leest als voorheen, een onzin-waarde valt weg.
    expect(readGoalDetails({ distanceKm: 20, timeLimitMinutes: 420, cutoffMinutes: 660 })).toEqual({ distanceKm: 20, timeLimitMinutes: 420, cutoffMinutes: 660 });
    expect(readGoalDetails({ distanceKm: 20 })).toEqual({ distanceKm: 20 });
    expect(readGoalDetails({ timeLimitMinutes: -5, cutoffMinutes: 'laat' })).toBeUndefined();
    // Een cutoff hoort bij een ultra: bij een korte trail valt hij weg.
    expect(readGoalDetails({ variant: 'kort', distanceKm: 20, cutoffMinutes: 300 })).toEqual({ variant: 'kort', distanceKm: 20 });
    expect(readGoalDetails({ variant: 'ultra', distanceKm: 50, cutoffMinutes: 660 })).toEqual({ variant: 'ultra', distanceKm: 50, cutoffMinutes: 660 });
    expect(readGoalDetails({ strengthTargets: [{ exercise: 'Squat', kg: 100, reps: 5 }, { exercise: 7 }, null] })).toEqual({ strengthTargets: [{ exercise: 'Squat', kg: 100, reps: 5 }] });
    const broken = migrateTrainingGoal({ ...trekGoal, kind: 'kapot' as never, details: 'x' as never, priority: 'nu' as never }, { isMain: true, tent: false });
    // Een onbekende soort of belangrijkheid kan uit een nieuwere versie komen: die blijft staan.
    expect(broken.kind).toBe('kapot');
    expect(broken.priority).toBe('nu');
    expect(broken.details).toBeUndefined();
  });

  it('een lijst: alleen het doel met mijlpalen is het hoofddoel', () => {
    const list = migrateTrainingGoals([trekGoal, raceGoal('r', 'secondary'), followGoal], new Set(['goal_trek']), { choices: {} });
    expect(list.map((g) => [g.kind, g.priority])).toEqual([['trek_hut', 'top'], ['run_race', 'voortop'], [undefined, 'verkenning']]);
  });

  it('het getal Klaar voor je doel blijft gelijk na het overzetten (details met twee dagen)', () => {
    const logs = [{
      id: 'l1', templateId: 't', type: 'hiking', completedDate: '2026-10-10', completedAt: '2026-10-10T10:00:00Z', variant: 'full', durationMinutes: 300, source: 'manual',
      outdoorData: { durationMinutes: 300, elevationGainM: 800, elevationLossM: 800, backpackWeightKg: 9, source: 'manual' },
    }] as never;
    const migrated = migrateTrainingGoal(trekGoal, { isMain: true, tent: true });
    const before = computeGr5Readiness(trekGoal.requirements, logs, '2026-10-21');
    const after = computeGoalReadiness({ kind: migrated.kind!, details: migrated.details, requirements: migrated.requirements }, logs, '2026-10-21', { naming: { the: 'de GR5', your: 'je GR5' } });
    expect(after.percent).toBe(before!.percent);
    expect(after.sentence).toBe(before!.sentence);
  });
});

describe('een oude back-up', () => {
  it('een back-up van voor deze ronde (schema 5) krijgt soort en belangrijkheid bij het inlezen', () => {
    const milestone: GoalMilestone = { id: 'gm1', goalId: 'goal_trek', order: 1, title: 'Eerste', requirement: { kind: 'duration', activityType: 'cardio', minMinutes: 40 } as never };
    const backup = normalizeBackupToCurrentModel({
      backupSchemaVersion: 5,
      createdAt: NOW,
      payload: {
        version: 5, program: null, templates: [], plannedSessions: [], sessionLogs: [], injuryNotes: [], settings: {},
        trainingGoals: [trekGoal, raceGoal('r', 'secondary'), followGoal],
        goalMilestones: [milestone], goalMilestoneProgress: [],
        routePlan: { choices: { t1e1: { sleep: 'tent' } }, updatedAt: NOW },
      },
    });
    expect(backup.trainingGoals.map((g) => [g.id, g.kind, g.priority])).toEqual([
      ['goal_trek', 'trek_tent', 'top'], ['r', 'run_race', 'voortop'], ['goal_follow', undefined, 'verkenning'],
    ]);
    // Wat al in het bestand stond blijft zoals het was.
    expect(backup.trainingGoals[0].requirements).toEqual(trekGoal.requirements);
    expect(backup.trainingGoals[1].planRole).toBe('secondary');
  });

  it('een back-up van een nieuwere ronde met kind, details en priority blijft zoals hij is', () => {
    const goal = { ...trekGoal, kind: 'trek_tent', details: { shelter: 'tent', days: 8, packKg: 15 }, priority: 'voortop' } as TrainingGoal;
    const backup = normalizeBackupToCurrentModel({
      backupSchemaVersion: 5, createdAt: NOW,
      payload: { version: 5, program: null, templates: [], plannedSessions: [], sessionLogs: [], injuryNotes: [], settings: {}, trainingGoals: [goal], goalMilestones: [], goalMilestoneProgress: [] },
    });
    expect(backup.trainingGoals[0]).toMatchObject({ kind: 'trek_tent', priority: 'voortop', details: { shelter: 'tent', days: 8, packKg: 15 } });
  });

  it('een heel oude back-up (schema 1, met objectives) komt als hoofddoel met soort binnen', () => {
    const backup = normalizeBackupToCurrentModel({
      backupSchemaVersion: 1,
      createdAt: NOW,
      payload: {
        version: 1, program: null, templates: [], plannedSessions: [], sessionLogs: [],
        objectives: [{
          id: 'obj_gr5', name: 'GR5 / ALPINE READINESS', targetDate: '2027-06-01', targetDistanceKm: 600,
          milestones: [{ id: 'obj_gr5_m1', objectiveId: 'obj_gr5', order: 1, title: 'First', requirement: { kind: 'duration', activityType: 'cardio', minMinutes: 40 } }],
        }],
        milestoneProgress: [], injuryNotes: [], settings: {},
      },
    });
    expect(backup.trainingGoals).toEqual([expect.objectContaining({ id: 'obj_gr5', kind: 'trek_hut', priority: 'top' })]);
  });

  it('een back-up zonder doelen blijft zonder doelen', () => {
    const backup = normalizeBackupToCurrentModel({ backupSchemaVersion: 3, createdAt: NOW, payload: { version: 3 } });
    expect(backup.trainingGoals).toEqual([]);
    expect(backup.present.objectives_and_milestones).toBe(false);
  });
});

describe('de opstartstap migrateGoalKinds', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('zet soort en belangrijkheid op het toestel, leest het etappeplan en schrijft niets twee keer', async () => {
    await TrainingGoalsRepo.put(trekGoal);
    await TrainingGoalsRepo.put(raceGoal('r', 'track'));
    await GoalMilestonesRepo.put({ id: 'gm1', goalId: 'goal_trek', order: 1, title: 'Eerste', requirement: { kind: 'duration', activityType: 'cardio', minMinutes: 40 } as never });
    await RoutePlanRepo.set({ choices: { t1e1: { sleep: 'bivak' } }, updatedAt: NOW });
    await migrateGoalKinds();
    const goals = Object.fromEntries((await TrainingGoalsRepo.getAll()).map((g) => [g.id, g]));
    expect(goals.goal_trek).toMatchObject({ kind: 'trek_tent', priority: 'top' });
    expect(goals.r).toMatchObject({ kind: 'run_race', priority: 'verkenning' });
    const stored = JSON.stringify(await TrainingGoalsRepo.getAll());
    await migrateGoalKinds();
    expect(JSON.stringify(await TrainingGoalsRepo.getAll())).toBe(stored);
  });
});

describe('reviewpunten van ronde 2a', () => {
  const ms = (goalId: string): GoalMilestone => ({ id: `m_${goalId}`, goalId, order: 1, title: 'Eerste', requirement: { kind: 'duration', activityType: 'cardio', minMinutes: 40 } as never });

  it('een gearchiveerd doel met mijlpalen wordt geen tocht met top', () => {
    const old: TrainingGoal = { ...trekGoal, id: 'goal_old', status: 'archived', planRole: 'secondary' };
    const list = migrateTrainingGoals([old, trekGoal], new Set(['goal_old', 'goal_trek']), { choices: {} });
    expect(list[0].kind).toBeUndefined();
    expect(list[0].priority).toBe('voortop');
    expect(list[1]).toMatchObject({ kind: 'trek_hut', priority: 'top' });
  });

  it('bij twee doelen met mijlpalen is alleen het eerste actieve het hoofddoel', () => {
    const second: TrainingGoal = { ...trekGoal, id: 'goal_second', planRole: 'track' };
    const list = migrateTrainingGoals([trekGoal, second], new Set(['goal_trek', 'goal_second']), { choices: {} });
    expect(list[0]).toMatchObject({ kind: 'trek_hut', priority: 'top' });
    expect(list[1].kind).toBeUndefined();
    expect(list[1].priority).toBe('verkenning');
  });

  it('een back-up met doelen maar zonder mijlpalen maakt het hoofddoel niet verkenning', () => {
    const backup = normalizeBackupToCurrentModel({
      backupSchemaVersion: 5, createdAt: NOW,
      payload: { version: 5, program: null, templates: [], plannedSessions: [], sessionLogs: [], injuryNotes: [], settings: {}, trainingGoals: [trekGoal, followGoal] },
    });
    expect(backup.trainingGoals[0].priority).toBeUndefined();
    expect(backup.trainingGoals[0].kind).toBeUndefined();
    // Met een rol op het doel blijft die gelden.
    expect(backup.trainingGoals[1].priority).toBe('verkenning');
    // De opstartstap zet het daarna goed, zodra de mijlpalen er zijn.
    const later = migrateTrainingGoals(backup.trainingGoals, new Set(['goal_trek']), { choices: {} });
    expect(later[0]).toMatchObject({ kind: 'trek_hut', priority: 'top' });
  });

  it('een onbekende soort, belangrijkheid of veld uit een nieuwere versie blijft staan', () => {
    const future = { ...trekGoal, kind: 'kitesurf', priority: 'urgent', details: { days: 5, nieuwVeld: { a: 1 }, kapot: 'x' } } as unknown as TrainingGoal;
    const next = migrateTrainingGoal(future, { isMain: true, tent: false }) as unknown as Record<string, unknown>;
    expect(next.kind).toBe('kitesurf');
    expect(next.priority).toBe('urgent');
    expect(next.details).toEqual({ days: 5, nieuwVeld: { a: 1 }, kapot: 'x' });
    const again = migrateTrainingGoal(next as unknown as TrainingGoal, { isMain: true, tent: false });
    expect(JSON.stringify(again)).toBe(JSON.stringify(next));
  });

  it('een eis per dag wordt niet het totaal van de tocht', () => {
    const perDay: TrainingGoal = { ...trekGoal, requirements: [req('distance', 20, 'km', 'PER_DAY', 'hiking'), req('consecutiveDays', 6, 'days', 'CONSECUTIVE_DAYS')] };
    const next = migrateTrainingGoal(perDay, { isMain: true, tent: false });
    expect(next.details?.distanceKm).toBeUndefined();
    expect(next.details?.days).toBe(6);
  });

  it('de opstartstap overschrijft geen bewerking die tussen lezen en schrijven kwam', async () => {
    await wipeAllData();
    await TrainingGoalsRepo.put(raceGoal('r', 'secondary'));
    const realGetAll = TrainingGoalsRepo.getAll;
    let calls = 0;
    TrainingGoalsRepo.getAll = async () => {
      const list = await realGetAll();
      calls++;
      // Na de eerste lezing bewerkt de gebruiker het doel.
      if (calls === 1) await TrainingGoalsRepo.put({ ...raceGoal('r', 'secondary'), name: 'Eigen naam', updatedAt: '2026-10-02T00:00:00.000Z' });
      return list;
    };
    try {
      await migrateGoalKinds();
    } finally {
      TrainingGoalsRepo.getAll = realGetAll;
    }
    const stored = (await realGetAll())[0];
    expect(stored.name).toBe('Eigen naam');
    expect(stored.kind).toBeUndefined();
    await migrateGoalKinds();
    expect((await realGetAll())[0]).toMatchObject({ name: 'Eigen naam', kind: 'run_race' });
    void ms;
  });
});

describe('de plek in de lijst (TrainingGoal.order, ronde 2c)', () => {
  it('een heel getal vanaf nul blijft staan, afgerond', () => {
    expect(migrateTrainingGoal({ ...followGoal, order: 2 }, { isMain: false, tent: false }).order).toBe(2);
    expect(migrateTrainingGoal({ ...followGoal, order: 1.6 }, { isMain: false, tent: false }).order).toBe(2);
  });

  it('een kapotte waarde gaat weg en een doel zonder volgorde krijgt er geen', () => {
    for (const bad of [-1, Number.NaN, '3', null]) {
      expect('order' in migrateTrainingGoal({ ...followGoal, order: bad as never }, { isMain: false, tent: false })).toBe(false);
    }
    expect('order' in migrateTrainingGoal(followGoal, { isMain: false, tent: false })).toBe(false);
  });
});
