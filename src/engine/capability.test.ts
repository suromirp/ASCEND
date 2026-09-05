import { describe, it, expect } from 'vitest';
import { extractEvidenceFromLog, extractEvidenceFromLogs, computeCapabilityEstimate, recencyBand } from './capability';
import type { SessionLog } from '../models/training';

function log(overrides: Partial<SessionLog> = {}): SessionLog {
  return {
    id: 'l1',
    templateId: 'tpl_x',
    type: 'hiking',
    completedDate: '2026-09-01',
    completedAt: '2026-09-01T10:00:00.000Z',
    variant: 'full',
    durationMinutes: 60,
    source: 'manual',
    ...overrides,
  };
}

describe('extractEvidenceFromLog', () => {
  it('produces aerobic_engine evidence for any non-recovery session', () => {
    const evidence = extractEvidenceFromLog(log({ type: 'cardio', durationMinutes: 45 }));
    expect(evidence).toContainEqual(expect.objectContaining({ key: { dimension: 'aerobic_engine' }, measured: { amount: 45, unit: 'min' }, evidenceType: 'direct' }));
  });

  it('produces no evidence at all for a recovery session', () => {
    const evidence = extractEvidenceFromLog(log({ type: 'recovery', durationMinutes: 20 }));
    expect(evidence).toEqual([]);
  });

  it('produces discipline-specific endurance_duration and mechanical_tolerance for hiking', () => {
    const evidence = extractEvidenceFromLog(log({ type: 'hiking', durationMinutes: 120 }));
    expect(evidence).toContainEqual(expect.objectContaining({ key: { dimension: 'endurance_duration', discipline: 'hiking' }, measured: { amount: 120, unit: 'min' } }));
    expect(evidence).toContainEqual(expect.objectContaining({ key: { dimension: 'mechanical_tolerance', discipline: 'hiking' }, measured: { amount: 120, unit: 'min' } }));
  });

  it('produces DIRECT ascent_capacity from real outdoor elevation gain, PROXY from an estimated/treadmill one', () => {
    const real = extractEvidenceFromLog(log({ outdoorData: { durationMinutes: 60, elevationGainM: 500, source: 'manual' } }));
    expect(real).toContainEqual(expect.objectContaining({ key: { dimension: 'ascent_capacity' }, evidenceType: 'direct' }));

    const estimated = extractEvidenceFromLog(log({ outdoorData: { durationMinutes: 60, elevationGainM: 500, estimatedElevation: true, source: 'manual' } }));
    expect(estimated).toContainEqual(expect.objectContaining({ key: { dimension: 'ascent_capacity' }, evidenceType: 'proxy' }));
  });

  it('keeps descent_tolerance independent of ascent — no D- evidence without an actual elevationLossM', () => {
    const evidence = extractEvidenceFromLog(log({ outdoorData: { durationMinutes: 60, elevationGainM: 500, source: 'manual' } }));
    expect(evidence.some((e) => e.key.dimension === 'descent_tolerance')).toBe(false);
  });

  it('produces load_carriage evidence from backpack weight', () => {
    const evidence = extractEvidenceFromLog(log({ outdoorData: { durationMinutes: 60, backpackWeightKg: 10, source: 'manual' } }));
    expect(evidence).toContainEqual(expect.objectContaining({ key: { dimension: 'load_carriage' }, measured: { amount: 10, unit: 'kg' } }));
  });

  it('derives running pace (sustainable_output) only for cardio/running, never implied for hiking', () => {
    const running = extractEvidenceFromLog(log({ type: 'cardio', durationMinutes: 30, outdoorData: { durationMinutes: 30, distanceKm: 5, source: 'manual' } }));
    expect(running).toContainEqual(expect.objectContaining({ key: { dimension: 'sustainable_output', discipline: 'running' }, measured: { amount: 6, unit: 'min_per_km' } }));

    const hiking = extractEvidenceFromLog(log({ type: 'hiking', durationMinutes: 60, outdoorData: { durationMinutes: 60, distanceKm: 5, source: 'manual' } }));
    expect(hiking.some((e) => e.key.dimension === 'sustainable_output')).toBe(false);
  });

  it('produces strength evidence only when real set/weight data exists — never fabricated when tracked externally', () => {
    const withWeights = extractEvidenceFromLog(log({
      type: 'strength',
      durationMinutes: 45,
      strengthData: [{ exerciseId: 'e1', exerciseName: 'Squat', sets: [{ reps: 5, weightKg: 80 }, { reps: 5, weightKg: 85 }] }],
    }));
    expect(withWeights).toContainEqual(expect.objectContaining({ key: { dimension: 'strength' }, measured: { amount: 85, unit: 'kg' } }));

    // externally tracked (MacroFactor) — quick-complete, no strengthData at all.
    const externallyTracked = extractEvidenceFromLog(log({ type: 'strength', durationMinutes: 45 }));
    expect(externallyTracked.some((e) => e.key.dimension === 'strength')).toBe(false);
  });

  it('extractEvidenceFromLogs flattens across multiple logs', () => {
    const logs = [log({ id: 'l1', type: 'cardio' }), log({ id: 'l2', type: 'hiking' })];
    const evidence = extractEvidenceFromLogs(logs);
    expect(evidence.some((e) => e.sourceId === 'l1')).toBe(true);
    expect(evidence.some((e) => e.sourceId === 'l2')).toBe(true);
  });
});

describe('recencyBand', () => {
  it('buckets by age in days', () => {
    expect(recencyBand('2026-08-20', '2026-09-01')).toBe('current'); // 12 days
    expect(recencyBand('2026-07-15', '2026-09-01')).toBe('supporting'); // 48 days
    expect(recencyBand('2026-06-01', '2026-09-01')).toBe('historical'); // 92 days
    expect(recencyBand('2026-01-01', '2026-09-01')).toBe('older');
  });
});

describe('computeCapabilityEstimate', () => {
  const key = { dimension: 'ascent_capacity' as const };
  const asOf = '2026-09-01';

  it('returns confidence unknown with no computed zero when there is no evidence at all', () => {
    const estimate = computeCapabilityEstimate(key, [], asOf);
    expect(estimate).toEqual({ key, confidence: 'unknown', unconfirmedPeak: false, evidenceRefs: [], asOf });
  });

  it('never lets missing strength evidence read as a demonstrated zero (Strength Program Strategy Addendum v0.1)', () => {
    // No CapabilityEvidence at all for 'strength' — e.g. every session was
    // logged via quick-complete because it's tracked in MacroFactor.
    const estimate = computeCapabilityEstimate({ dimension: 'strength' }, [], asOf);
    expect(estimate.confidence).toBe('unknown');
    expect(estimate.peakExposure).toBeUndefined();
    expect(estimate.repeatableAnchor).toBeUndefined();
  });

  it('distinguishes peak exposure from a corroborated repeatable anchor', () => {
    const evidence = [
      { id: 'e1', key, measured: { amount: 1200, unit: 'm_elevation_gain' as const }, date: '2026-06-20', evidenceType: 'direct' as const, source: 'sessionLog' as const }, // old, one-off peak
      { id: 'e2', key, measured: { amount: 800, unit: 'm_elevation_gain' as const }, date: '2026-08-25', evidenceType: 'direct' as const, source: 'sessionLog' as const },
      { id: 'e3', key, measured: { amount: 850, unit: 'm_elevation_gain' as const }, date: '2026-08-28', evidenceType: 'direct' as const, source: 'sessionLog' as const },
    ];
    const estimate = computeCapabilityEstimate(key, evidence, asOf);
    expect(estimate.peakExposure).toEqual({ amount: 1200, unit: 'm_elevation_gain' });
    expect(estimate.repeatableAnchor).toEqual({ amount: 800, unit: 'm_elevation_gain' }); // second-best of the 2 recent points
    expect(estimate.unconfirmedPeak).toBe(true); // peak (1200) != anchor (800)
    expect(estimate.confidence).toBe('high'); // 2+ recent direct points
  });

  it('is low confidence when only historical/older evidence exists', () => {
    const evidence = [
      { id: 'e1', key, measured: { amount: 900, unit: 'm_elevation_gain' as const }, date: '2026-01-01', evidenceType: 'direct' as const, source: 'sessionLog' as const },
    ];
    const estimate = computeCapabilityEstimate(key, evidence, asOf);
    expect(estimate.confidence).toBe('low');
    expect(estimate.repeatableAnchor).toBeUndefined();
    expect(estimate.peakExposure).toEqual({ amount: 900, unit: 'm_elevation_gain' });
  });

  it('picks the correct "peak" for a lower_is_more unit (pace) — the fastest, not the largest number', () => {
    const paceKey = { dimension: 'sustainable_output' as const, discipline: 'running' };
    const evidence = [
      { id: 'e1', key: paceKey, measured: { amount: 6.0, unit: 'min_per_km' as const }, date: '2026-08-28', evidenceType: 'derived' as const, source: 'sessionLog' as const },
      { id: 'e2', key: paceKey, measured: { amount: 5.5, unit: 'min_per_km' as const }, date: '2026-08-29', evidenceType: 'derived' as const, source: 'sessionLog' as const },
    ];
    const estimate = computeCapabilityEstimate(paceKey, evidence, asOf);
    expect(estimate.peakExposure).toEqual({ amount: 5.5, unit: 'min_per_km' }); // faster = better
  });
});
