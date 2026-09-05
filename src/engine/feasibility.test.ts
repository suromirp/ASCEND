import { describe, it, expect } from 'vitest';
import { computeFeasibility } from './feasibility';
import type { CapabilityGap } from '../models/capability';
import type { TrainingAvailability, TrainingGuardrail } from '../models/goalEngineConfig';

function gap(overrides: Partial<CapabilityGap> = {}): CapabilityGap {
  return {
    key: { dimension: 'ascent_capacity' },
    demand: { amount: 1000, unit: 'm_elevation_gain' },
    currentEstimate: { amount: 900, unit: 'm_elevation_gain' },
    status: 'near',
    confidence: 'high',
    criticality: 'critical',
    explanation: 'test explanation',
    ...overrides,
  };
}

function availability(overrides: Partial<TrainingAvailability> = {}): TrainingAvailability {
  return { allowedDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], maxSessionDurationMin: {}, longSessionDays: ['sun'], temporaryExceptions: [], ...overrides };
}

describe('computeFeasibility', () => {
  it('reads no critical gaps at all as insufficient_data — no demand was ever defined to check, never a claimed on_track', () => {
    const result = computeFeasibility({ goalId: 'g1', gaps: [], weeksRemaining: 4, availability: availability(), guardrails: [] });
    expect(result.status).toBe('insufficient_data');
  });

  it('is insufficient_data when every critical gap is unknown — never read as a deficiency', () => {
    const result = computeFeasibility({
      goalId: 'g1', gaps: [gap({ status: 'unknown', confidence: 'unknown', currentEstimate: undefined })],
      weeksRemaining: 4, availability: availability(), guardrails: [],
    });
    expect(result.status).toBe('insufficient_data');
    expect(result.confidence).toBe('unknown');
  });

  it('is on_track when the worst critical gap only reads near/meets/exceeds', () => {
    const result = computeFeasibility({ goalId: 'g1', gaps: [gap({ status: 'meets' })], weeksRemaining: 4, availability: availability(), guardrails: [] });
    expect(result.status).toBe('on_track');
  });

  it('is unlikely for a real gap with a very tight runway', () => {
    const result = computeFeasibility({ goalId: 'g1', gaps: [gap({ status: 'gap' })], weeksRemaining: 2, availability: availability(), guardrails: [] });
    expect(result.status).toBe('unlikely');
  });

  it('is challenging (not unlikely) for a real gap with a generous, deadline-free runway', () => {
    const result = computeFeasibility({ goalId: 'g1', gaps: [gap({ status: 'gap' })], weeksRemaining: undefined, availability: availability(), guardrails: [] });
    expect(result.status).toBe('challenging');
  });

  it('a major_gap is unlikely even with decent runway when availability is insufficient', () => {
    const result = computeFeasibility({
      goalId: 'g1', gaps: [gap({ status: 'major_gap' })], weeksRemaining: 10,
      availability: availability({ allowedDays: ['mon', 'tue'], longSessionDays: [] }), guardrails: [],
    });
    expect(result.status).toBe('unlikely');
  });

  it('a major_gap can read as merely challenging with a generous runway AND sufficient availability', () => {
    const result = computeFeasibility({ goalId: 'g1', gaps: [gap({ status: 'major_gap' })], weeksRemaining: 10, availability: availability(), guardrails: [] });
    expect(result.status).toBe('challenging');
  });

  it('is bottleneck-aware: one major_gap is not averaged away by other strong supporting critical gaps', () => {
    const gaps = [gap({ key: { dimension: 'ascent_capacity' }, status: 'exceeds' }), gap({ key: { dimension: 'multi_day_durability' }, status: 'major_gap' })];
    const result = computeFeasibility({ goalId: 'g1', gaps, weeksRemaining: 2, availability: availability(), guardrails: [] });
    expect(result.status).toBe('unlikely');
    expect(result.bottleneck).toEqual({ dimension: 'multi_day_durability' });
  });

  it('never presents a numeric probability — explanation and bottleneck only', () => {
    const result = computeFeasibility({ goalId: 'g1', gaps: [gap({ status: 'gap' })], weeksRemaining: 6, availability: availability(), guardrails: [] });
    expect(result).not.toHaveProperty('probability');
    expect(typeof result.explanation).toBe('string');
  });

  it('mentions an outside-guardrail alternative only when unlikely and a block guardrail is set', () => {
    const guardrails: TrainingGuardrail[] = [{ id: 'g1', ruleId: 'HEURISTIC-ELEVATION-PROGRESSION-BANDS', mode: 'block' }];
    const result = computeFeasibility({ goalId: 'g1', gaps: [gap({ status: 'major_gap' })], weeksRemaining: 2, availability: availability(), guardrails });
    expect(result.status).toBe('unlikely');
    expect(result.bestPossiblePreparation).toMatch(/guardrail/);
  });
});
