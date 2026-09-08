import { describe, it, expect } from 'vitest';
import { computeSpecificityRampBand, computeSpecificityWeight } from './specificityRamp';

describe('computeSpecificityRampBand', () => {
  it('band boundaries are exact at 21/42/84 days', () => {
    expect(computeSpecificityRampBand(21)).toBe('taper');
    expect(computeSpecificityRampBand(22)).toBe('specific');
    expect(computeSpecificityRampBand(42)).toBe('specific');
    expect(computeSpecificityRampBand(43)).toBe('build');
    expect(computeSpecificityRampBand(84)).toBe('build');
    expect(computeSpecificityRampBand(85)).toBe('base');
  });

  it('a goal date already passed still reads as taper, never a new band', () => {
    expect(computeSpecificityRampBand(-5)).toBe('taper');
  });
});

describe('computeSpecificityWeight', () => {
  it('stays at the flat 1.0 floor for a key this goal never demanded (criticality undefined) — never singled out by name', () => {
    // aerobic_engine never gets a CapabilityDemand from computeDemand, so a
    // caller always passes criticality: undefined for it — this test
    // proves the function treats that identically to any other
    // non-demanded key, with no special case for a particular dimension.
    expect(computeSpecificityWeight({ criticality: undefined, gapStatus: undefined, band: 'specific' })).toBe(1.0);
    expect(computeSpecificityWeight({ criticality: undefined, gapStatus: 'major_gap', band: 'taper' })).toBe(1.0);
  });

  it('non-critical criticality also stays at 1.0 regardless of band', () => {
    expect(computeSpecificityWeight({ criticality: 'supporting', gapStatus: 'gap', band: 'specific' })).toBe(1.0);
  });

  it('climbs with band for a critical key: base < build < specific', () => {
    const base = computeSpecificityWeight({ criticality: 'critical', gapStatus: undefined, band: 'base' });
    const build = computeSpecificityWeight({ criticality: 'critical', gapStatus: undefined, band: 'build' });
    const specific = computeSpecificityWeight({ criticality: 'critical', gapStatus: undefined, band: 'specific' });
    expect(base).toBe(1.0);
    expect(build).toBeGreaterThan(base);
    expect(specific).toBeGreaterThan(build);
  });

  it('Test SPECIFICITY-FREEZE — weight is identical at specific and taper (the load-bearing assertion for the composition-freeze rule)', () => {
    const specific = computeSpecificityWeight({ criticality: 'critical', gapStatus: undefined, band: 'specific' });
    const taper = computeSpecificityWeight({ criticality: 'critical', gapStatus: undefined, band: 'taper' });
    expect(taper).toBe(specific);
  });

  it('major_gap/gap adds +0.1, meets/exceeds does not', () => {
    const clean = computeSpecificityWeight({ criticality: 'critical', gapStatus: 'meets', band: 'build' });
    const withGap = computeSpecificityWeight({ criticality: 'critical', gapStatus: 'gap', band: 'build' });
    const withMajorGap = computeSpecificityWeight({ criticality: 'critical', gapStatus: 'major_gap', band: 'build' });
    const withExceeds = computeSpecificityWeight({ criticality: 'critical', gapStatus: 'exceeds', band: 'build' });
    expect(withGap).toBeCloseTo(clean + 0.1, 5);
    expect(withMajorGap).toBeCloseTo(clean + 0.1, 5);
    expect(withExceeds).toBe(clean);
  });

  it('Test MULTI-GOAL-CONFLICT — this function never reads a second, implicit goal; single-goal input in, single-goal output out', () => {
    // There is structurally no second-goal parameter on SpecificityWeightInputs
    // — this test documents that cross-goal combination is the caller's
    // job (engine/weeklyPrescriptionBuilder.ts#resolveWeeklyCapabilityDemand),
    // never something this pure function does implicitly.
    const a = computeSpecificityWeight({ criticality: 'critical', gapStatus: 'gap', band: 'specific' });
    const b = computeSpecificityWeight({ criticality: 'critical', gapStatus: 'gap', band: 'specific' });
    expect(a).toBe(b); // deterministic, no hidden cross-call state
  });
});
