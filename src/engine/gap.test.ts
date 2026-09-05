import { describe, it, expect } from 'vitest';
import { computeCapabilityGap, computeCapabilityGaps } from './gap';
import type { CapabilityDemand, CapabilityEstimate } from '../models/capability';

const key = { dimension: 'ascent_capacity' as const };

function estimate(overrides: Partial<CapabilityEstimate> = {}): CapabilityEstimate {
  return { key, confidence: 'high', unconfirmedPeak: false, evidenceRefs: [], asOf: '2026-09-01', ...overrides };
}

describe('computeCapabilityGap', () => {
  it('missing data is never interpreted as bad capability — status unknown, not a computed gap against zero (v0.2 §23)', () => {
    const demand: CapabilityDemand = { key, demand: { amount: 1000, unit: 'm_elevation_gain' }, criticality: 'critical' };
    const gap = computeCapabilityGap(demand, estimate({ confidence: 'unknown' }));
    expect(gap.status).toBe('unknown');
    expect(gap.currentEstimate).toBeUndefined();
    expect(gap.confidence).toBe('unknown');
  });

  it('prefers the repeatable anchor over peak exposure when both exist', () => {
    const demand: CapabilityDemand = { key, demand: { amount: 900, unit: 'm_elevation_gain' }, criticality: 'critical' };
    const gap = computeCapabilityGap(demand, estimate({
      peakExposure: { amount: 1500, unit: 'm_elevation_gain' },
      repeatableAnchor: { amount: 800, unit: 'm_elevation_gain' },
    }));
    expect(gap.currentEstimate).toEqual({ amount: 800, unit: 'm_elevation_gain' });
    expect(gap.status).toBe('near'); // 800/900 ≈ 0.89
  });

  it('classifies status by ratio, direction-aware', () => {
    const demand: CapabilityDemand = { key, demand: { amount: 1000, unit: 'm_elevation_gain' }, criticality: 'critical' };
    expect(computeCapabilityGap(demand, estimate({ repeatableAnchor: { amount: 1200, unit: 'm_elevation_gain' } })).status).toBe('exceeds');
    expect(computeCapabilityGap(demand, estimate({ repeatableAnchor: { amount: 1000, unit: 'm_elevation_gain' } })).status).toBe('meets');
    expect(computeCapabilityGap(demand, estimate({ repeatableAnchor: { amount: 900, unit: 'm_elevation_gain' } })).status).toBe('near');
    expect(computeCapabilityGap(demand, estimate({ repeatableAnchor: { amount: 700, unit: 'm_elevation_gain' } })).status).toBe('gap');
    expect(computeCapabilityGap(demand, estimate({ repeatableAnchor: { amount: 300, unit: 'm_elevation_gain' } })).status).toBe('major_gap');
  });

  it('is direction-aware for a lower_is_more unit (pace) — a faster current pace than demanded exceeds, not fails', () => {
    const paceKey = { dimension: 'sustainable_output' as const, discipline: 'running' };
    const demand: CapabilityDemand = { key: paceKey, demand: { amount: 5.5, unit: 'min_per_km' }, criticality: 'critical' };
    const gap = computeCapabilityGap(demand, { key: paceKey, confidence: 'high', unconfirmedPeak: false, evidenceRefs: [], asOf: '2026-09-01', repeatableAnchor: { amount: 5.0, unit: 'min_per_km' } });
    expect(gap.status).toBe('exceeds');
  });

  it('carries criticality through from the demand and confidence through from the estimate', () => {
    const demand: CapabilityDemand = { key, demand: { amount: 1000, unit: 'm_elevation_gain' }, criticality: 'important' };
    const gap = computeCapabilityGap(demand, estimate({ confidence: 'medium', repeatableAnchor: { amount: 1000, unit: 'm_elevation_gain' } }));
    expect(gap.criticality).toBe('important');
    expect(gap.confidence).toBe('medium');
  });
});

describe('computeCapabilityGaps', () => {
  it('treats a dimension with no matching estimate at all the same as an explicit unknown estimate', () => {
    const demands: CapabilityDemand[] = [{ key, demand: { amount: 1000, unit: 'm_elevation_gain' }, criticality: 'critical' }];
    const [gap] = computeCapabilityGaps(demands, []);
    expect(gap.status).toBe('unknown');
  });
});
