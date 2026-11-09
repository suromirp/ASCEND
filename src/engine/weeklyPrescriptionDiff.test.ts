import { describe, it, expect } from 'vitest';
import { diffWeeklyPrescriptionPlan, realPlanChanges, changesTheRoundKeeps, changesOnAllowedDays } from './weeklyPrescriptionDiff';
import type { PlannedSession } from '../models/training';
import type { WeeklyPrescription } from '../models/weeklyPrescription';
import type { TrainingPrescription } from '../models/prescription';
import type { PlanChangeItem } from '../models/planChange';

function week(id: string, over: Partial<WeeklyPrescription> = {}): WeeklyPrescription {
  return {
    id,
    weekStartDate: '2026-11-02',
    lines: [
      {
        id: `${id}_line`, slotId: 'endurance:running', primaryKey: { dimension: 'endurance_duration', discipline: 'running' }, goalIds: ['g1'], targetSessionCount: 3,
        candidateTemplateIds: ['tpl_easy_run'], decision: 'progress', reason: 'Meer duur', ruleId: 'R', sourceProgressionState: 'progress', specificityWeight: 1,
      },
    ],
    skeletonSignature: 'a', consecutiveKeepWeeks: 0, reviewDue: false, specificityRampBand: 'base',
    goalSnapshot: [{ goalId: 'g1', daysToGoal: 100 }], generatedBy: ['x'], computedAt: '2026-10-21T08:00:00.000Z',
    ...over,
  };
}

function training(id: string, plannedSessionId: string, over: Partial<TrainingPrescription> = {}): TrainingPrescription {
  return { id, plannedSessionId, role: 'support', targetDistance: { amount: 8, unit: 'km' }, generatedBy: ['x'], reason: 'Een stapje meer', createdAt: '2026-10-21T08:00:00.000Z', ...over };
}

const replace = (plannedSessionId: string, newPrescriptionId: string): PlanChangeItem => ({ plannedSessionId, action: 'replace', newPrescriptionId, reason: 'r' });

describe('diffWeeklyPrescriptionPlan', () => {
  it('schrijft niets als alleen id, tijdstempel en dagen-tot-doel anders zijn', () => {
    const stored = week('w_old');
    const fresh = week('w_new', {
      computedAt: '2026-10-22T08:00:00.000Z',
      goalSnapshot: [{ goalId: 'g1', daysToGoal: 99 }],
      lines: stored.lines.map((l) => ({ ...l, id: 'other_line_id' })),
    });
    const storedTraining = training('p_old', 's1');
    const freshTraining = training('p_new', 's1', { createdAt: '2026-10-22T08:00:00.000Z' });

    const delta = diffWeeklyPrescriptionPlan(
      { prescriptions: [fresh], newTrainingPrescriptions: [freshTraining], changes: [replace('s1', 'p_new')] },
      { weekly: [stored], training: [storedTraining] },
    );

    expect(delta.weeklyToWrite).toEqual([]);
    expect(delta.trainingToWrite).toEqual([]);
    expect(delta.changes).toEqual([]);
  });

  it('ziet een echt andere inhoud wel', () => {
    const stored = week('w_old');
    const fresh = week('w_new', { lines: stored.lines.map((l) => ({ ...l, targetSessionCount: 4 })) });
    const storedTraining = training('p_old', 's1');
    const freshTraining = training('p_new', 's1', { targetDistance: { amount: 9, unit: 'km' } });

    const delta = diffWeeklyPrescriptionPlan(
      { prescriptions: [fresh], newTrainingPrescriptions: [freshTraining], changes: [replace('s1', 'p_new')] },
      { weekly: [stored], training: [storedTraining] },
    );

    expect(delta.weeklyToWrite).toEqual([fresh]);
    expect(delta.trainingToWrite).toEqual([freshTraining]);
    expect(delta.changes).toEqual([replace('s1', 'p_new')]);
  });

  it('een training zonder voorschrift tot nu toe is een echte wijziging', () => {
    const freshTraining = training('p_new', 's1');
    const delta = diffWeeklyPrescriptionPlan(
      { prescriptions: [], newTrainingPrescriptions: [freshTraining], changes: [replace('s1', 'p_new')] },
      { weekly: [], training: [] },
    );
    expect(delta.trainingToWrite).toEqual([freshTraining]);
    expect(delta.changes).toHaveLength(1);
  });

  it('laat andere wijzigingen (verplaatsen, toevoegen) altijd staan', () => {
    const move: PlanChangeItem = { plannedSessionId: 's2', action: 'move', fromDate: '2026-11-03', toDate: '2026-11-04' };
    const delta = diffWeeklyPrescriptionPlan({ prescriptions: [], newTrainingPrescriptions: [], changes: [move] }, { weekly: [], training: [] });
    expect(delta.changes).toEqual([move]);
  });
});

describe('realPlanChanges: wat telt als wijziging van de planning', () => {
  const session = (id: string, over: Partial<PlannedSession> = {}): PlannedSession =>
    ({ id, templateId: 'tpl_easy_run', scheduledDate: '2026-11-03', weekStartDate: '2026-11-02', status: 'planned', ...over }) as PlannedSession;
  const reduce: PlanChangeItem = { plannedSessionId: 's1', action: 'reduce', newPrescriptionId: 'p1', reason: 'r' };

  it('bij de eerste opbouw telt een replace of reduce niet als de rij gelijk blijft', () => {
    const before = [session('s1')];
    expect(realPlanChanges([replace('s1', 'p1'), reduce], { initialBuild: true, before, after: [session('s1')] })).toEqual([]);
  });

  it('bij de eerste opbouw telt een replace of reduce wel als de rij anders wordt', () => {
    const before = [session('s1')];
    const after = [session('s1', { plannedMinutes: 30 })];
    expect(realPlanChanges([reduce], { initialBuild: true, before, after })).toEqual([reduce]);
  });

  it('bij de eerste opbouw telt een replace voor een rij die verdwijnt of niet bestond wel', () => {
    expect(realPlanChanges([reduce], { initialBuild: true, before: [session('s1')], after: [] })).toEqual([reduce]);
    expect(realPlanChanges([reduce], { initialBuild: true, before: [], after: [] })).toEqual([reduce]);
  });

  it('buiten de eerste opbouw telt elke replace of reduce, en keep nooit', () => {
    const before = [session('s1')];
    const keep: PlanChangeItem = { plannedSessionId: 's1', action: 'keep', reason: 'r' };
    expect(realPlanChanges([keep, reduce], { initialBuild: false, before, after: before })).toEqual([reduce]);
  });
});

// Melding van 9 november: het voorschrift zette een Wandeldag, de planningsronde zette hem om of haalde hem weg, en
// bij de volgende opening kwam hij weer. Wat de ronde niet laat staan, houdt het voorschrift niet.
describe('changesTheRoundKeeps', () => {
  const row = (id: string, templateId: string, scheduledDate: string, over: Partial<PlannedSession> = {}): PlannedSession =>
    ({ id, templateId, scheduledDate, weekStartDate: '2027-03-01', status: 'planned', order: 0, ...over });
  const add = (templateId: string, scheduledDate: string): PlanChangeItem =>
    ({ action: 'add', newSessionDraft: { templateId, scheduledDate, weekStartDate: '2027-03-01' }, reason: 'r' });
  const before = [row('sat', 'tpl_hill_intervals', '2027-03-06'), row('sun', 'tpl_long_run', '2027-03-07')];

  it('laat een toevoeging vallen die de ronde omzet naar een andere training', () => {
    const after = [...before, row('new', 'tpl_hill_intervals', '2027-03-06')];
    expect(changesTheRoundKeeps([add('tpl_hike_day_one', '2027-03-06')], before, after)).toEqual([]);
  });

  it('laat een toevoeging vallen die de ronde weghaalt of overslaat', () => {
    expect(changesTheRoundKeeps([add('tpl_hike_day_one', '2027-03-06')], before, before)).toEqual([]);
    const skipped = [...before, row('new', 'tpl_hike_day_one', '2027-03-06', { status: 'skipped' })];
    expect(changesTheRoundKeeps([add('tpl_hike_day_one', '2027-03-06')], before, skipped)).toEqual([]);
  });

  it('houdt een toevoeging die blijft staan, en twee van dezelfde alleen als er twee blijven', () => {
    const one = add('tpl_recovery_run', '2027-03-04');
    const after = [...before, row('n1', 'tpl_recovery_run', '2027-03-04')];
    expect(changesTheRoundKeeps([one], before, after)).toEqual([one]);
    expect(changesTheRoundKeeps([one, { ...one }], before, after)).toEqual([one]);
  });

  it('laat een verplaatsing vallen die de ronde terugzet, en houdt een die blijft', () => {
    const move: PlanChangeItem = { plannedSessionId: 'sun', action: 'move', fromDate: '2027-03-07', toDate: '2027-03-05', reason: 'r' };
    expect(changesTheRoundKeeps([move], before, before)).toEqual([]);
    expect(changesTheRoundKeeps([move], before, [before[0], { ...before[1], scheduledDate: '2027-03-05' }])).toEqual([move]);
  });

  it('laat een ruil helemaal vallen als de ronde een helft terugzet', () => {
    const a: PlanChangeItem = { plannedSessionId: 'sat', action: 'swap', fromDate: '2027-03-06', toDate: '2027-03-07', pairedWithSessionId: 'sun', reason: 'r' };
    const b: PlanChangeItem = { plannedSessionId: 'sun', action: 'swap', fromDate: '2027-03-07', toDate: '2027-03-06', pairedWithSessionId: 'sat', reason: 'r' };
    const halfBack = [{ ...before[0], scheduledDate: '2027-03-07' }, before[1]];
    expect(changesTheRoundKeeps([a, b], before, halfBack)).toEqual([]);
    const both = [{ ...before[0], scheduledDate: '2027-03-07' }, { ...before[1], scheduledDate: '2027-03-06' }];
    expect(changesTheRoundKeeps([a, b], before, both)).toEqual([a, b]);
  });

  it('raakt een nieuw voorschrift of een weghaling niet aan', () => {
    const r = replace('sat', 'tp1');
    const remove: PlanChangeItem = { plannedSessionId: 'sun', action: 'remove', fromDate: '2027-03-07', toDate: '2027-03-07', reason: 'r' };
    expect(changesTheRoundKeeps([r, remove], before, [before[0]])).toEqual([r, remove]);
  });
});

// Review van Melding bij elke opening (9 november): in een week zonder vrije dag haalt de weekindeling een training
// weg en zet de nieuwe op die dag (engine/weekReconciliation.ts). Valt de toevoeging weg, dan valt de weghaling mee;
// anders verliest de week een training zonder vervanging. Alleen nagemaakte rijen.
describe('een weghaling valt mee met haar toevoeging', () => {
  const WEEK = '2027-03-01';
  const days = ['2027-03-01', '2027-03-02', '2027-03-03', '2027-03-04', '2027-03-05', '2027-03-06', '2027-03-07'];
  const row = (id: string, templateId: string, scheduledDate: string, weekStartDate = WEEK): PlannedSession =>
    ({ id, templateId, scheduledDate, weekStartDate, status: 'planned', order: 0 });
  // Een volle week: op elke dag een training.
  const fullWeek = days.map((d, i) => row(`d${i}`, i === 2 ? 'tpl_bergconditie' : 'tpl_easy_run', d));
  const remove = (id: string, day: string): PlanChangeItem => ({ plannedSessionId: id, action: 'remove', fromDate: day, toDate: day, reason: 'r' });
  const addFor = (templateId: string, day: string, replaces: string | undefined, weekStartDate = WEEK): PlanChangeItem =>
    ({ action: 'add', newSessionDraft: { templateId, scheduledDate: day, weekStartDate }, reason: 'r', ...(replaces ? { replacesSessionId: replaces } : {}) });
  // De ronde zoals hij na de wijzigingen uitkomt: de weggehaalde rij overgeslagen, plus de nieuwe rijen die blijven.
  const roundAfter = (before: PlannedSession[], skipped: string[], fresh: PlannedSession[]) =>
    [...before.map((s) => (skipped.includes(s.id) ? { ...s, status: 'skipped' as const } : s)), ...fresh];

  it('volle week: de ronde laat de nieuwe training niet staan, dus de weggehaalde blijft ook', () => {
    const changes = [remove('d2', '2027-03-03'), addFor('tpl_hike_day_one', '2027-03-03', 'd2')];
    expect(changesTheRoundKeeps(changes, fullWeek, roundAfter(fullWeek, ['d2'], []))).toEqual([]);
    // Ook als de ronde de nieuwe rij omzet naar een andere training.
    const turned = roundAfter(fullWeek, ['d2'], [row('n1', 'tpl_hill_intervals', '2027-03-03')]);
    expect(changesTheRoundKeeps(changes, fullWeek, turned)).toEqual([]);
  });

  it('een toevoeging die blijft houdt haar weghaling', () => {
    const changes = [remove('d2', '2027-03-03'), addFor('tpl_hike_day_one', '2027-03-03', 'd2')];
    const after = roundAfter(fullWeek, ['d2'], [row('n1', 'tpl_hike_day_one', '2027-03-03')]);
    expect(changesTheRoundKeeps(changes, fullWeek, after)).toEqual(changes);
  });

  it('twee weghalingen op één dag: alleen die van de weggevallen toevoeging valt mee', () => {
    const before = [...fullWeek, row('d2b', 'tpl_easy_run', '2027-03-03')];
    const changes = [
      remove('d2', '2027-03-03'), addFor('tpl_hike_day_one', '2027-03-03', 'd2'),
      remove('d2b', '2027-03-03'), addFor('tpl_tempo_run', '2027-03-03', 'd2b'),
    ];
    const after = roundAfter(before, ['d2', 'd2b'], [row('n2', 'tpl_tempo_run', '2027-03-03')]);
    expect(changesTheRoundKeeps(changes, before, after)).toEqual([changes[2], changes[3]]);
  });

  it('een weghaling zonder koppeling blijft, ook als op die dag een toevoeging wegvalt', () => {
    const before = [...fullWeek, row('d2b', 'tpl_easy_run', '2027-03-03')];
    const offTarget = remove('d2b', '2027-03-03');
    const changes = [offTarget, remove('d2', '2027-03-03'), addFor('tpl_hike_day_one', '2027-03-03', 'd2')];
    expect(changesTheRoundKeeps(changes, before, roundAfter(before, ['d2', 'd2b'], []))).toEqual([offTarget]);
  });

  it('over de week- en maandgrens en de nacht van de zomertijd: elk paar volgt alleen zijn eigen toevoeging', () => {
    // Zondag 28 maart 2027 gaat in Europe/Amsterdam de klok om 02:00 een uur vooruit; donderdag 1 april ligt in de
    // volgende week en de volgende maand.
    const before = [row('zo', 'tpl_easy_run', '2027-03-28', '2027-03-22'), row('do', 'tpl_easy_run', '2027-04-01', '2027-03-29')];
    const changes = [
      remove('zo', '2027-03-28'), addFor('tpl_tempo_run', '2027-03-28', 'zo', '2027-03-22'),
      remove('do', '2027-04-01'), addFor('tpl_tempo_run', '2027-04-01', 'do', '2027-03-29'),
    ];
    const after = roundAfter(before, ['zo', 'do'], [row('n', 'tpl_tempo_run', '2027-03-28', '2027-03-22')]);
    expect(changesTheRoundKeeps(changes, before, after)).toEqual([changes[0], changes[1]]);
  });
});

describe('changesOnAllowedDays', () => {
  const remove = (id: string, day: string): PlanChangeItem => ({ plannedSessionId: id, action: 'remove', fromDate: day, toDate: day, reason: 'r' });
  const addFor = (templateId: string, day: string, replaces?: string): PlanChangeItem =>
    ({ action: 'add', newSessionDraft: { templateId, scheduledDate: day, weekStartDate: '2027-05-03' }, reason: 'r', ...(replaces ? { replacesSessionId: replaces } : {}) });

  it('een vakantie of tocht in de week: de toevoeging op die dag gaat eruit en haar weghaling ook', () => {
    const holiday = new Set(['2027-05-05', '2027-05-06']);
    const changes = [
      remove('wo', '2027-05-05'), addFor('tpl_tempo_run', '2027-05-05', 'wo'),
      remove('vr', '2027-05-07'), addFor('tpl_tempo_run', '2027-05-07', 'vr'),
      remove('do', '2027-05-06'),
    ];
    // Een weghaling zonder toevoeging (een training die niet meer bij de week hoort) blijft, ook op een vakantiedag.
    expect(changesOnAllowedDays(changes, (d) => holiday.has(d))).toEqual([changes[2], changes[3], changes[4]]);
  });

  it('een wedstrijddag of de dag van het hoofddoel: hetzelfde', () => {
    const changes = [remove('za', '2027-05-08'), addFor('tpl_tempo_run', '2027-05-08', 'za')];
    expect(changesOnAllowedDays(changes, (d) => d === '2027-05-08')).toEqual([]);
    expect(changesOnAllowedDays(changes, (d) => d >= '2027-05-09')).toEqual(changes);
  });
});
