import { describe, it, expect } from 'vitest';
import { diffWeeklyPrescriptionPlan } from './weeklyPrescriptionDiff';
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
