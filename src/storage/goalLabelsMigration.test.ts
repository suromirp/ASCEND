import { describe, it, expect } from 'vitest';
import { migrateTrainingGoal, readAcceptedConflicts } from './migrations';
import type { TrainingGoal } from '../models/goals';

// Ronde 2b: twee optionele velden op een doel, een eigen kortere afbouw en de aanvaarde botsingen.
// Een oud bestand zonder de velden blijft zoals het was; wat niet klopt gaat weg.
const NOW = '2026-10-26T00:00:00.000Z';
const goal = (over: Record<string, unknown> = {}): TrainingGoal => ({
  id: 'g', name: 'Wedstrijd', status: 'active', targetDate: '2027-03-14', createdAt: NOW, updatedAt: NOW,
  requirements: [{ id: 'r', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 10, unit: 'km' }, discipline: 'running' }],
  ...over,
}) as TrainingGoal;
const ctx = { isMain: false, tent: false };

describe('taperDays en conflictAccepted op een doel', () => {
  it('een doel zonder de velden krijgt ze niet', () => {
    const next = migrateTrainingGoal(goal(), ctx);
    expect('taperDays' in next).toBe(false);
    expect('conflictAccepted' in next).toBe(false);
  });

  it('geldige waarden blijven, en een tweede keer lezen verandert niets', () => {
    const once = migrateTrainingGoal(goal({ taperDays: 3, conflictAccepted: ['2027-07-25', '2027-07-25', '2027-05-01'] }), ctx);
    expect(once.taperDays).toBe(3);
    expect(once.conflictAccepted).toEqual(['2027-07-25', '2027-05-01']);
    expect(migrateTrainingGoal(once, ctx)).toEqual(once);
  });

  it('wat niet klopt gaat weg: geen negatief of tekstgetal, geen datum die geen datum is', () => {
    const next = migrateTrainingGoal(goal({ taperDays: -2, conflictAccepted: ['morgen', 5, null] }), ctx);
    expect('taperDays' in next).toBe(false);
    expect('conflictAccepted' in next).toBe(false);
    expect('taperDays' in migrateTrainingGoal(goal({ taperDays: 'drie' }), ctx)).toBe(false);
    expect(readAcceptedConflicts('2027-07-25')).toBeUndefined();
    expect(readAcceptedConflicts([])).toBeUndefined();
  });
});
