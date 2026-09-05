import { describe, it, expect } from 'vitest';
import { proposeMountainAdventurePrescription } from './mountainAdventure';
import type { ProgressionDecision } from '../../models/progression';
import type { CapabilityKey } from '../../models/capability';

function decision(key: CapabilityKey, overrides: Partial<ProgressionDecision> = {}): ProgressionDecision {
  return {
    key,
    state: 'progress',
    reason: 'test reason',
    ruleId: 'HEURISTIC-PROGRESSION-CONFIDENCE-GATE',
    poorResponsePattern: false,
    accumulationReviewDue: false,
    ...overrides,
  };
}

describe('proposeMountainAdventurePrescription', () => {
  it('bumps eccentricLoad to heavy when progressing descent_tolerance specifically, independent of ascent', () => {
    const descent = proposeMountainAdventurePrescription({ decision: decision({ dimension: 'descent_tolerance' }), plannedSessionId: 'ps1' });
    expect(descent.stressProfileOverride).toEqual(expect.objectContaining({ eccentricLoad: 'heavy' }));

    const ascent = proposeMountainAdventurePrescription({ decision: decision({ dimension: 'ascent_capacity' }), plannedSessionId: 'ps1' });
    expect(ascent.stressProfileOverride?.eccentricLoad).not.toBe('heavy');
  });

  it('bumps lowerBodyLoad to heavy when progressing load_carriage', () => {
    const candidate = proposeMountainAdventurePrescription({ decision: decision({ dimension: 'load_carriage' }), plannedSessionId: 'ps1' });
    expect(candidate.stressProfileOverride).toEqual(expect.objectContaining({ lowerBodyLoad: 'heavy' }));
  });

  it('produces no stressProfileOverride at all when nothing genuinely differs from the template base', () => {
    const candidate = proposeMountainAdventurePrescription({ decision: decision({ dimension: 'multi_day_durability' }), plannedSessionId: 'ps1' });
    expect(candidate.stressProfileOverride).toBeUndefined();
  });

  it('never sets elevation/pack targets the caller did not supply', () => {
    const candidate = proposeMountainAdventurePrescription({ decision: decision({ dimension: 'ascent_capacity' }), plannedSessionId: 'ps1' });
    expect(candidate.elevationGain).toBeUndefined();
    expect(candidate.elevationLoss).toBeUndefined();
    expect(candidate.packWeight).toBeUndefined();
  });

  it('passes supplied elevation/pack targets through as MeasuredValue', () => {
    const candidate = proposeMountainAdventurePrescription({
      decision: decision({ dimension: 'ascent_capacity' }), plannedSessionId: 'ps1',
      candidateElevationGainM: 900, candidateElevationLossM: 700, candidatePackWeightKg: 10,
    });
    expect(candidate.elevationGain).toEqual({ amount: 900, unit: 'm_elevation_gain' });
    expect(candidate.elevationLoss).toEqual({ amount: 700, unit: 'm_elevation_loss' });
    expect(candidate.packWeight).toEqual({ amount: 10, unit: 'kg' });
  });

  it('caps intensity to low on recover regardless of dimension', () => {
    const candidate = proposeMountainAdventurePrescription({ decision: decision({ dimension: 'multi_day_durability' }, { state: 'recover' }), plannedSessionId: 'ps1' });
    expect(candidate.stressProfileOverride).toEqual({ intensity: 'low' });
    expect(candidate.role).toBe('recovery');
  });
});
