import { describe, it, expect } from 'vitest';
import type { GoalRequirement } from '../models/goals';
import { typicalDayValue, isMultiDayGoal, normalizeRouteRequirements, estimatedHikingMinutes, routeGoalComplete } from './goalRoute';

const trip = (days?: number): GoalRequirement[] => [
  { id: 'd', kind: 'distance', scope: 'TOTAL_EVENT', target: { amount: 600, unit: 'km' }, discipline: 'hiking' },
  { id: 'g', kind: 'elevationGain', scope: 'TOTAL_EVENT', target: { amount: 30000, unit: 'm_elevation_gain' } },
  { id: 'l', kind: 'elevationLoss', scope: 'TOTAL_EVENT', target: { amount: 30000, unit: 'm_elevation_loss' } },
  { id: 'e', kind: 'eventDays', scope: 'TOTAL_EVENT', discipline: 'hiking', target: days === undefined ? undefined : { amount: days, unit: 'days' } },
];

describe('typicalDayValue', () => {
  it('turns route totals into a typical day (600 km / 30.000 m over 35 days)', () => {
    expect(typicalDayValue(trip(35), 'distance')).toEqual({ value: { amount: 17.1, unit: 'km' }, source: 'derived' });
    expect(typicalDayValue(trip(35), 'elevationGain')).toEqual({ value: { amount: 860, unit: 'm_elevation_gain' }, source: 'derived' });
  });

  it('never falls back to the route total when the day count is still empty', () => {
    expect(typicalDayValue(trip(), 'elevationGain')).toBeUndefined();
  });

  it('a per-day override wins over the derived value', () => {
    const reqs: GoalRequirement[] = [...trip(35), { id: 'o', kind: 'elevationGain', scope: 'PER_DAY', target: { amount: 1100, unit: 'm_elevation_gain' } }];
    expect(typicalDayValue(reqs, 'elevationGain')).toEqual({ value: { amount: 1100, unit: 'm_elevation_gain' }, source: 'override' });
  });

  it('a single-day goal (no day count) uses its value as-is', () => {
    const race: GoalRequirement[] = [{ id: 'd', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 42.2, unit: 'km' }, discipline: 'running' }];
    expect(typicalDayValue(race, 'distance')?.source).toBe('single_day');
    expect(isMultiDayGoal(race)).toBe(false);
  });
});

describe('normalizeRouteRequirements', () => {
  it('a continuous trip keeps its longest stretch equal to the whole trip', () => {
    const normalized = normalizeRouteRequirements(trip(12), 'continuous');
    expect(normalized.find((r) => r.kind === 'consecutiveDays')?.target?.amount).toBe(12);
  });

  it('a trip in stages keeps the longest stage the user entered', () => {
    const reqs: GoalRequirement[] = [...trip(35), { id: 'c', kind: 'consecutiveDays', scope: 'CONSECUTIVE_DAYS', target: { amount: 7, unit: 'days' } }];
    expect(normalizeRouteRequirements(reqs, 'stages')).toBe(reqs);
  });
});

describe('routeGoalComplete', () => {
  it('requires day count, distance and, for stages, a longest stage that fits', () => {
    expect(routeGoalComplete({ execution: 'stages', requirements: trip() })).toBe(false);
    expect(routeGoalComplete({ execution: 'continuous', requirements: trip(35) })).toBe(true);
    const tooLong: GoalRequirement[] = [...trip(5), { id: 'c', kind: 'consecutiveDays', scope: 'CONSECUTIVE_DAYS', target: { amount: 7, unit: 'days' } }];
    expect(routeGoalComplete({ execution: 'stages', requirements: tooLong })).toBe(false);
  });
});

describe('estimatedHikingMinutes (DIN 33466)', () => {
  it('uses the larger of horizontal/vertical time plus half the smaller', () => {
    // 17 km -> 4,25 h; 860/300 + 860/500 = 4,59 h -> 4,59 + 2,125 = 6,72 h ≈ 405 min
    expect(estimatedHikingMinutes(17, 860, 860)).toBe(405);
    expect(estimatedHikingMinutes(20)).toBe(300);
  });
});
