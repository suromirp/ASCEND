import { describe, it, expect } from 'vitest';
import { computeCapacity } from './capacity';
import type { SessionLog } from '../models/training';

const ASOF = '2026-09-28';

function log(overrides: Partial<SessionLog> = {}): SessionLog {
  return {
    id: `l-${Math.random()}`,
    templateId: 'tpl_x',
    type: 'strength',
    completedDate: ASOF,
    completedAt: `${ASOF}T10:00:00.000Z`,
    variant: 'full',
    durationMinutes: 60,
    source: 'manual',
    ...overrides,
  };
}

describe('computeCapacity', () => {
  it('returns all zeros for no logs at all', () => {
    const result = computeCapacity([], 28, ASOF);
    expect(result).toEqual({ strength: 0, cardio: 0, climbing: 0, endurance: 0, packCapability: 0, overall: 0 });
  });

  it('reaches 100% strength at 3 sessions/week over a 28-day window', () => {
    const logs = Array.from({ length: 12 }, () => log({ type: 'strength' }));
    expect(computeCapacity(logs, 28, ASOF).strength).toBe(100);
  });

  it('reaches 100% cardio at 2 sessions/week over a 28-day window', () => {
    const logs = Array.from({ length: 8 }, () => log({ type: 'cardio' }));
    expect(computeCapacity(logs, 28, ASOF).cardio).toBe(100);
  });

  it('reaches 100% climbing at 1000m D+ over a 28-day window', () => {
    const logs = [log({ type: 'hiking', outdoorData: { durationMinutes: 120, elevationGainM: 1000, source: 'manual' } })];
    expect(computeCapacity(logs, 28, ASOF).climbing).toBe(100);
  });

  it('reaches 100% endurance at 40km distance over a 28-day window', () => {
    const logs = [log({ type: 'cardio', cardioData: { durationMinutes: 200, distanceKm: 40, source: 'manual' } })];
    expect(computeCapacity(logs, 28, ASOF).endurance).toBe(100);
  });

  it('reaches 100% packCapability at a logged 15kg backpack when no event-specific target is supplied', () => {
    const logs = [log({ type: 'hiking', outdoorData: { durationMinutes: 120, backpackWeightKg: 15, source: 'manual' } })];
    expect(computeCapacity(logs, 28, ASOF).packCapability).toBe(100);
  });

  // Fase 6 (sports-science review, item D2): the active goal's own target
  // pack weight is authoritative, not a universal hard-coded reference.
  it('targets the supplied event-specific pack weight instead of the generic 15kg default', () => {
    const logs = [log({ type: 'hiking', outdoorData: { durationMinutes: 120, backpackWeightKg: 8, source: 'manual' } })];
    expect(computeCapacity(logs, 28, ASOF, 8).packCapability).toBe(100); // a lighter goal target (e.g. 8kg) is fully met at 8kg
    expect(computeCapacity(logs, 28, ASOF, 15).packCapability).toBe(53); // the same log against the heavier default target
  });

  it('ignores logs outside the window', () => {
    const oldLog = log({ type: 'strength', completedDate: '2026-01-01' });
    expect(computeCapacity([oldLog], 28, ASOF).strength).toBe(0);
  });

  it('overall is the unweighted mean of the 5 sub-scores', () => {
    const logs = Array.from({ length: 12 }, () => log({ type: 'strength' })); // strength=100, rest=0
    const result = computeCapacity(logs, 28, ASOF);
    expect(result.overall).toBe(Math.round((100 + 0 + 0 + 0 + 0) / 5));
  });

  it('clamps above-target values at 100, never overshoots', () => {
    const logs = Array.from({ length: 30 }, () => log({ type: 'strength' }));
    expect(computeCapacity(logs, 28, ASOF).strength).toBe(100);
  });
});
