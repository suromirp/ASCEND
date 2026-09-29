import { describe, it, expect } from 'vitest';
import { computeDemand, targetPackWeightKg } from './demand';
import type { GoalRequirement } from '../models/goals';

function requirement(overrides: Partial<GoalRequirement>): GoalRequirement {
  return { id: 'r1', kind: 'manual', scope: 'SINGLE_EVENT', ...overrides };
}

describe('targetPackWeightKg', () => {
  it('reads the target amount off a packWeight requirement', () => {
    const reqs = [requirement({ kind: 'packWeight', target: { amount: 12, unit: 'kg' } })];
    expect(targetPackWeightKg(reqs)).toBe(12);
  });

  it('is undefined when the goal has no packWeight requirement', () => {
    expect(targetPackWeightKg([requirement({ kind: 'distance', target: { amount: 20, unit: 'km' } })])).toBeUndefined();
  });
});

describe('computeDemand', () => {
  it('a bare distance requirement demands endurance_duration and mechanical_tolerance', () => {
    const demand = computeDemand([requirement({ kind: 'distance', target: { amount: 20, unit: 'km' }, discipline: 'running' })]);
    expect(demand).toContainEqual({ key: { dimension: 'endurance_duration', discipline: 'running' }, demand: { amount: 20, unit: 'km' }, criticality: 'critical' });
    expect(demand).toContainEqual({ key: { dimension: 'mechanical_tolerance', discipline: 'running' }, demand: { amount: 20, unit: 'km' }, criticality: 'critical' });
  });

  it('a hiking day is expressed as time on foot (DIN 33466), the unit hiking evidence is recorded in', () => {
    const demand = computeDemand([requirement({ kind: 'distance', target: { amount: 20, unit: 'km' }, discipline: 'hiking' })]);
    expect(demand).toContainEqual({ key: { dimension: 'endurance_duration', discipline: 'hiking' }, demand: { amount: 300, unit: 'min' }, criticality: 'critical' });
  });

  // Production report: a 30.000 m D+ route total was set against a single
  // training session. Route totals are compared as a typical day.
  it('a multi-day route demands a typical day, never the route total', () => {
    const demand = computeDemand([
      requirement({ scope: 'TOTAL_EVENT', id: 'd', kind: 'distance', target: { amount: 600, unit: 'km' }, discipline: 'hiking' }),
      requirement({ scope: 'TOTAL_EVENT', id: 'g', kind: 'elevationGain', target: { amount: 30000, unit: 'm_elevation_gain' } }),
      requirement({ scope: 'TOTAL_EVENT', id: 'e', kind: 'eventDays', target: { amount: 35, unit: 'days' }, discipline: 'hiking' }),
      requirement({ id: 'c', kind: 'consecutiveDays', scope: 'CONSECUTIVE_DAYS', target: { amount: 7, unit: 'days' } }),
    ]);
    expect(demand).toContainEqual({ key: { dimension: 'ascent_capacity' }, demand: { amount: 860, unit: 'm_elevation_gain' }, criticality: 'critical' });
    expect(demand).toContainEqual({ key: { dimension: 'multi_day_durability' }, demand: { amount: 7, unit: 'days' }, criticality: 'critical' });
  });

  it('a multi-day route with its day count still empty demands nothing per day for route values', () => {
    const demand = computeDemand([
      requirement({ scope: 'TOTAL_EVENT', id: 'g', kind: 'elevationGain', target: { amount: 30000, unit: 'm_elevation_gain' } }),
      requirement({ scope: 'TOTAL_EVENT', id: 'e', kind: 'eventDays', target: undefined, discipline: 'hiking' }),
    ]);
    expect(demand.find((d) => d.key.dimension === 'ascent_capacity')).toBeUndefined();
  });

  it('distance + targetTime for running derives a sustainable_output pace demand', () => {
    const demand = computeDemand([
      requirement({ kind: 'distance', target: { amount: 42.2, unit: 'km' }, discipline: 'running' }),
      requirement({ kind: 'targetTime', target: { amount: 240, unit: 'min' }, discipline: 'running' }),
    ]);
    expect(demand).toContainEqual({ key: { dimension: 'sustainable_output', discipline: 'running' }, demand: { amount: 240 / 42.2, unit: 'min_per_km' }, criticality: 'critical' });
  });

  it('never derives a pace demand for cycling — v0.2 §18.2 explicitly warns a target speed without context is unreliable', () => {
    const demand = computeDemand([
      requirement({ kind: 'distance', target: { amount: 100, unit: 'km' }, discipline: 'cycling' }),
      requirement({ kind: 'targetTime', target: { amount: 180, unit: 'min' }, discipline: 'cycling' }),
    ]);
    expect(demand.some((d) => d.key.dimension === 'sustainable_output')).toBe(false);
  });

  it('elevationGain and elevationLoss demand ascent/descent independently', () => {
    const demand = computeDemand([
      requirement({ kind: 'elevationGain', target: { amount: 1000, unit: 'm_elevation_gain' } }),
      requirement({ kind: 'elevationLoss', target: { amount: 800, unit: 'm_elevation_loss' } }),
    ]);
    expect(demand).toContainEqual({ key: { dimension: 'ascent_capacity' }, demand: { amount: 1000, unit: 'm_elevation_gain' }, criticality: 'critical' });
    expect(demand).toContainEqual({ key: { dimension: 'descent_tolerance' }, demand: { amount: 800, unit: 'm_elevation_loss' }, criticality: 'critical' });
  });

  it('never infers descent demand from elevationGain alone', () => {
    const demand = computeDemand([requirement({ kind: 'elevationGain', target: { amount: 1000, unit: 'm_elevation_gain' } })]);
    expect(demand.some((d) => d.key.dimension === 'descent_tolerance')).toBe(false);
  });

  it('packWeight demands load_carriage', () => {
    const demand = computeDemand([requirement({ kind: 'packWeight', target: { amount: 12, unit: 'kg' } })]);
    expect(demand).toContainEqual({ key: { dimension: 'load_carriage' }, demand: { amount: 12, unit: 'kg' }, criticality: 'critical' });
  });

  it('consecutiveDays only demands multi_day_durability when actually asking for more than one day', () => {
    const oneDay = computeDemand([requirement({ kind: 'consecutiveDays', target: { amount: 1, unit: 'days' } })]);
    expect(oneDay.some((d) => d.key.dimension === 'multi_day_durability')).toBe(false);

    const fourDays = computeDemand([requirement({ kind: 'consecutiveDays', target: { amount: 4, unit: 'days' } })]);
    expect(fourDays).toContainEqual({ key: { dimension: 'multi_day_durability' }, demand: { amount: 4, unit: 'days' }, criticality: 'critical' });
  });

  it('a manual requirement produces no demand at all — nothing to derive numerically', () => {
    expect(computeDemand([requirement({ kind: 'manual' })])).toEqual([]);
  });

  it('never fabricates a demand for aerobic_engine/strength — no principled numeric target exists for them', () => {
    const demand = computeDemand([requirement({ kind: 'distance', target: { amount: 20, unit: 'km' } })]);
    expect(demand.some((d) => d.key.dimension === 'aerobic_engine')).toBe(false);
    expect(demand.some((d) => d.key.dimension === 'strength')).toBe(false);
  });
});
