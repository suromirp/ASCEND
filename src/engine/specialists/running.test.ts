import { describe, it, expect } from 'vitest';
import { proposeRunningPrescription } from './running';
import type { ProgressionDecision } from '../../models/progression';

function decision(overrides: Partial<ProgressionDecision> = {}): ProgressionDecision {
  return {
    key: { dimension: 'sustainable_output', discipline: 'running' },
    state: 'progress',
    reason: 'test reason',
    ruleId: 'HEURISTIC-PROGRESSION-CONFIDENCE-GATE',
    poorResponsePattern: false,
    accumulationReviewDue: false,
    ...overrides,
  };
}

describe('proposeRunningPrescription', () => {
  it('maps progress to the key role with no stress override', () => {
    const candidate = proposeRunningPrescription({ decision: decision(), plannedSessionId: 'ps1' });
    expect(candidate.role).toBe('key');
    expect(candidate.stressProfileOverride).toBeUndefined();
  });

  it('maps recover to the recovery role with a low-intensity override', () => {
    const candidate = proposeRunningPrescription({ decision: decision({ state: 'recover' }), plannedSessionId: 'ps1' });
    expect(candidate.role).toBe('recovery');
    expect(candidate.stressProfileOverride).toEqual({ intensity: 'low' });
  });

  it('never sets a target distance the caller did not supply', () => {
    const candidate = proposeRunningPrescription({ decision: decision(), plannedSessionId: 'ps1' });
    expect(candidate.targetDistance).toBeUndefined();
  });

  it('passes a distance through untouched when there is no spike', () => {
    const candidate = proposeRunningPrescription({ decision: decision(), plannedSessionId: 'ps1', recentLongestSessionKm: 20, candidateDistanceKm: 21 });
    expect(candidate.targetDistance).toEqual({ amount: 21, unit: 'km' });
    expect(candidate.role).toBe('key');
  });

  it('flags a >=10% single-session distance spike (RULE-RUN-SPIKE-001) as a risk signal, not a hard block, and downgrades progress to consolidate', () => {
    const candidate = proposeRunningPrescription({ decision: decision(), plannedSessionId: 'ps1', recentLongestSessionKm: 20, candidateDistanceKm: 24 });
    expect(candidate.role).toBe('support'); // consolidate, not key
    expect(candidate.targetDistance).toEqual({ amount: 22, unit: 'km' }); // capped to +10%
    expect(candidate.evidenceRefs).toContain('E-RUN-PROG-001');
    expect(candidate.generatedBy).toContain('RULE-RUN-SPIKE-001');
  });

  it('does not downgrade a non-progress state on a spike — there is nothing to protect it from', () => {
    const candidate = proposeRunningPrescription({
      decision: decision({ state: 'consolidate' }), plannedSessionId: 'ps1', recentLongestSessionKm: 20, candidateDistanceKm: 24,
    });
    expect(candidate.role).toBe('support');
  });
});
