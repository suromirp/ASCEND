import { describe, it, expect } from 'vitest';
import { effectivePriority, goalDetailsOf, goalKindOf, goalRecoveryDays, goalTaperDays } from './goalLabels';
import type { TrainingGoal } from '../models/goals';

const run = (km: number, over: Partial<TrainingGoal> = {}): TrainingGoal => ({
  id: 'race', name: 'Wedstrijd', status: 'active', targetDate: '2027-03-13', createdAt: '', updatedAt: '',
  requirements: [{ id: 'r', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: km, unit: 'km' }, discipline: 'running' }],
  ...over,
}) as TrainingGoal;

describe('het label dat de planning leest', () => {
  it('het hoofddoel is altijd top; een eigen label wint van de oude rol', () => {
    expect(effectivePriority(run(10), 'race')).toBe('top');
    expect(effectivePriority(run(10, { priority: 'verkenning', planRole: 'secondary' }), undefined)).toBe('verkenning');
    expect(effectivePriority(run(10, { priority: 'top' }), 'ander')).toBe('top');
  });

  it('zonder label valt het terug op de oude rol: een wedstrijd is voortop, alleen volgen is verkenning', () => {
    expect(effectivePriority(run(10), 'gr5')).toBe('voortop');
    expect(effectivePriority(run(10, { planRole: 'track' }), 'gr5')).toBe('verkenning');
    expect(effectivePriority(run(10, { planRole: 'secondary' }), 'gr5')).toBe('voortop');
  });

  it('een kapot label telt niet', () => {
    expect(effectivePriority(run(10, { priority: 'heel belangrijk' as never }), 'gr5')).toBe('voortop');
  });
});

describe('soort, afbouw en herstel van een doel', () => {
  it('een hardloopwedstrijd zonder soort is run_race, met de afstand uit de eisen', () => {
    expect(goalKindOf(run(10))).toBe('run_race');
    expect(goalDetailsOf(run(10))).toMatchObject({ distanceKm: 10, variant: '10k' });
    expect(goalDetailsOf(run(42.2)).variant).toBe('marathon');
  });

  it('de afbouw volgt de soort en het label, en de eigen kortere afbouw wint alleen als hij korter is', () => {
    expect(goalTaperDays(run(10), 'voortop')).toBe(4);
    expect(goalTaperDays(run(10), 'top')).toBe(8);
    expect(goalTaperDays(run(10), 'verkenning')).toBe(0);
    expect(goalTaperDays(run(10, { taperDays: 3 }), 'voortop')).toBe(3);
    expect(goalTaperDays(run(10, { taperDays: 9 }), 'voortop')).toBe(4);
  });

  it('het herstel volgt de afstand en nooit het label', () => {
    expect(goalRecoveryDays(run(10))).toBe(4);
    expect(goalRecoveryDays(run(42.2))).toBe(10);
    expect(goalRecoveryDays(run(42.2, { priority: 'verkenning' }))).toBe(10);
    expect(goalRecoveryDays({ ...run(10), requirements: [], kind: undefined } as TrainingGoal)).toBe(0);
  });
});
