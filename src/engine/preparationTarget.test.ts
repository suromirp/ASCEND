import { describe, it, expect } from 'vitest';
import { computePreparationTargets } from './preparationTarget';
import type { CapabilityDemand } from '../models/capability';

describe('computePreparationTargets', () => {
  it('never requires literal event-distance replication — the target range sits below the raw demand for a higher_is_more unit', () => {
    const demand: CapabilityDemand[] = [{ key: { dimension: 'ascent_capacity' }, demand: { amount: 1000, unit: 'm_elevation_gain' }, criticality: 'critical' }];
    const [target] = computePreparationTargets(demand);
    expect(target.targetRange.min.amount).toBeLessThan(target.targetRange.max.amount);
    expect(target.targetRange.max.amount).toBeLessThan(1000); // never asks for the full 1000m+ in training
    expect(target.targetRange.min.amount).toBeGreaterThan(0);
  });

  it('is direction-aware for a lower_is_more unit (pace) — the range sits above (slower than) the raw demand pace', () => {
    const demand: CapabilityDemand[] = [{ key: { dimension: 'sustainable_output', discipline: 'running' }, demand: { amount: 5.5, unit: 'min_per_km' }, criticality: 'critical' }];
    const [target] = computePreparationTargets(demand);
    expect(target.targetRange.min.amount).toBeLessThan(target.targetRange.max.amount);
    expect(target.targetRange.min.amount).toBeGreaterThan(5.5); // never demands training FASTER than the actual target pace
  });

  it('carries criticality through unchanged and marks itself an honest ascend_heuristic, low confidence', () => {
    const demand: CapabilityDemand[] = [{ key: { dimension: 'load_carriage' }, demand: { amount: 12, unit: 'kg' }, criticality: 'important' }];
    const [target] = computePreparationTargets(demand);
    expect(target.criticality).toBe('important');
    expect(target.ruleClass).toBe('ascend_heuristic');
    expect(target.confidence).toBe('low');
  });
});
