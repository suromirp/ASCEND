import { describe, it, expect } from 'vitest';
import { afterMainGoalChange, planEndDay, programAnchorDate } from './programLayout';
import type { PlannedSession, SessionLog } from '../models/training';
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

describe('"Na je hoofddoel" wijzigen: een voorstel als het doel al voorbij is', () => {
  const session = (id: string, date: string, status: PlannedSession['status'] = 'planned'): PlannedSession => ({ id, templateId: 'tpl_easy_run', scheduledDate: date, weekStartDate: date, status, order: 0 });
  const planned = [session('a', '2027-09-10'), session('b', '2027-09-20'), session('c', '2027-09-21'), session('d', '2027-09-22', 'skipped')];
  const logs = [{ id: 'l', plannedSessionId: 'c' }] as unknown as SessionLog[];

  it('voor en tijdens het doel: direct, er verandert nu niets aan de planning', () => {
    expect(afterMainGoalChange([gr5], ladder, '2027-03-01', planned, logs, 'stop', 'maintain').proposal).toBe(false);
    expect(afterMainGoalChange([gr5], ladder, '2027-08-15', planned, logs, 'maintain', 'stop').proposal).toBe(false);
  });

  it('voorbij, naar onderhoudsweken: een voorstel', () => {
    const r = afterMainGoalChange([gr5], ladder, '2027-09-15', planned, logs, 'stop', 'maintain');
    expect(r.proposal).toBe(true);
    expect(r.lines.join(' ')).toContain('onderhoudsweken');
  });

  it('voorbij, naar niets meer plannen: een voorstel dat telt wat er weggaat (open, vanaf vandaag)', () => {
    const r = afterMainGoalChange([gr5], ladder, '2027-09-15', planned, logs, 'maintain', 'stop');
    expect(r.proposal).toBe(true);
    expect(r.lines.join(' ')).toContain('1 geplande training');
  });

  it('voorbij, maar er staat niets meer open: direct', () => {
    expect(afterMainGoalChange([gr5], ladder, '2027-09-25', planned, logs, 'maintain', 'stop').proposal).toBe(false);
  });

  it('dezelfde keuze: niets', () => {
    expect(afterMainGoalChange([gr5], ladder, '2027-09-15', planned, logs, 'stop', 'stop').proposal).toBe(false);
  });
});
