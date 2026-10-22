import { describe, it, expect } from 'vitest';
import { planEndDay, programAnchorDate } from './programLayout';
import type { GoalMilestone, TrainingGoal } from '../models/goals';

// Doorloop, punt 10: tijdens en na de GR5 plande ASCEND gewone weken, omdat
// het doel na zijn datum niet meer als einde van het plan telde.

const gr5: TrainingGoal = {
  id: 'g', name: 'GR5', createdAt: '', updatedAt: '', status: 'active', targetDate: '2027-08-01',
  requirements: [{ id: 'e', kind: 'eventDays', scope: 'TOTAL_EVENT', target: { amount: 30, unit: 'days' } }],
};
const ladder = [{ id: 'm', goalId: 'g', order: 1, title: 'x', requirement: { kind: 'manual' } }] as unknown as GoalMilestone[];

describe('planEndDay: het plan eindigt op de dag van je hoofddoel', () => {
  it('voor het doel is het de doeldatum, net als het aftellen', () => {
    expect(planEndDay([gr5], ladder, '2027-03-01')).toBe('2027-08-01');
    expect(programAnchorDate([gr5], ladder, '2027-03-01')).toBe('2027-08-01');
  });
  it('tijdens en na de tocht blijft het de doeldatum (advies: niets meer plannen)', () => {
    expect(planEndDay([gr5], ladder, '2027-08-02')).toBe('2027-08-01');
    expect(planEndDay([gr5], ladder, '2027-09-15')).toBe('2027-08-01');
  });
  it('met onderhoudsweken: tijdens de tocht niets, daarna weer plannen zonder doel', () => {
    expect(planEndDay([gr5], ladder, '2027-08-30', 'maintain')).toBe('2027-08-01');
    expect(planEndDay([gr5], ladder, '2027-09-15', 'maintain')).toBeUndefined();
  });
  it('een doel dat je op behaald zette is geen einde meer', () => {
    expect(planEndDay([{ ...gr5, status: 'completed' }], ladder, '2027-09-15')).toBeUndefined();
  });
});
