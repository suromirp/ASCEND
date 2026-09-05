import { describe, it, expect } from 'vitest';
import { proposeCyclingPrescription } from './cycling';
import type { ProgressionDecision } from '../../models/progression';

function decision(overrides: Partial<ProgressionDecision> = {}): ProgressionDecision {
  return {
    key: { dimension: 'sustainable_output', discipline: 'cycling' },
    state: 'progress',
    reason: 'test reason',
    ruleId: 'HEURISTIC-PROGRESSION-CONFIDENCE-GATE',
    poorResponsePattern: false,
    accumulationReviewDue: false,
    ...overrides,
  };
}

describe('proposeCyclingPrescription', () => {
  it('always overrides impact and eccentricLoad to none — cycling is non-weight-bearing regardless of state', () => {
    const progressing = proposeCyclingPrescription({ decision: decision(), plannedSessionId: 'ps1' });
    expect(progressing.stressProfileOverride).toEqual(expect.objectContaining({ impact: 'none', eccentricLoad: 'none' }));

    const recovering = proposeCyclingPrescription({ decision: decision({ state: 'recover' }), plannedSessionId: 'ps1' });
    expect(recovering.stressProfileOverride).toEqual({ intensity: 'low', impact: 'none', eccentricLoad: 'none' });
  });

  it('never sets targetPaceRange — no reliable cycling pace estimate exists', () => {
    const candidate = proposeCyclingPrescription({ decision: decision(), plannedSessionId: 'ps1' });
    expect(candidate.targetPaceRange).toBeUndefined();
  });

  it('never sets a target duration the caller did not supply', () => {
    const candidate = proposeCyclingPrescription({ decision: decision(), plannedSessionId: 'ps1' });
    expect(candidate.targetDuration).toBeUndefined();
  });

  it('passes a supplied duration through', () => {
    const candidate = proposeCyclingPrescription({ decision: decision(), plannedSessionId: 'ps1', candidateDurationMinutes: 45 });
    expect(candidate.targetDuration).toEqual({ amount: 45, unit: 'min' });
  });

  it('maps progression states to the same role vocabulary as the other specialists', () => {
    expect(proposeCyclingPrescription({ decision: decision({ state: 'assess' }), plannedSessionId: 'ps1' }).role).toBe('assessment');
    expect(proposeCyclingPrescription({ decision: decision({ state: 'reduce' }), plannedSessionId: 'ps1' }).role).toBe('maintenance');
  });
});
