import { describe, it, expect } from 'vitest';
import { resolveEffectiveStressProfile, deriveObservedStressFromLog, legacyIsLegHeavyToStressProfile } from './stressProfile';
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

describe('legacyIsLegHeavyToStressProfile', () => {
  it('maps a known leg-heavy template id to a heavy lowerBodyLoad profile', () => {
    expect(legacyIsLegHeavyToStressProfile('tpl_lower_a')).toEqual(
      expect.objectContaining({ lowerBodyLoad: 'heavy' }),
    );
  });

  it('maps an unknown template id to a light default, never heavy', () => {
    expect(legacyIsLegHeavyToStressProfile('tpl_upper_a').lowerBodyLoad).not.toBe('heavy');
  });
});

describe('resolveEffectiveStressProfile', () => {
  it('uses the template baseStressProfile when present', () => {
    const template = { id: 'tpl_x', baseStressProfile: { lowerBodyLoad: 'moderate' as const, impact: 'light' as const, eccentricLoad: 'none' as const, intensity: 'moderate' as const } };
    expect(resolveEffectiveStressProfile(template)).toEqual(template.baseStressProfile);
  });

  it('falls back to the legacy adapter when the template has no baseStressProfile', () => {
    const result = resolveEffectiveStressProfile({ id: 'tpl_lower_a' });
    expect(result.lowerBodyLoad).toBe('heavy');
  });

  it('layers a prescription stressProfileOverride on top, never a second full copy', () => {
    const template = { id: 'tpl_x', baseStressProfile: { lowerBodyLoad: 'light' as const, impact: 'light' as const, eccentricLoad: 'none' as const, intensity: 'low' as const } };
    const prescription = { stressProfileOverride: { intensity: 'high' as const } };
    const result = resolveEffectiveStressProfile(template, prescription);
    expect(result).toEqual({ lowerBodyLoad: 'light', impact: 'light', eccentricLoad: 'none', intensity: 'high' });
  });
});

describe('deriveObservedStressFromLog', () => {
  it('derives no eccentric load from a log with no real elevation loss', () => {
    const observed = deriveObservedStressFromLog(log({ outdoorData: { durationMinutes: 60, source: 'manual' } }));
    expect(observed.eccentricLoad).toBeUndefined();
  });

  it('derives heavy eccentric load from a real, large elevation loss', () => {
    const observed = deriveObservedStressFromLog(log({ outdoorData: { durationMinutes: 90, elevationLossM: 600, source: 'manual' } }));
    expect(observed.eccentricLoad).toBe('heavy');
  });

  it('derives heavy lowerBodyLoad from a heavy real backpack, regardless of template assumptions', () => {
    const observed = deriveObservedStressFromLog(log({ outdoorData: { durationMinutes: 90, backpackWeightKg: 14, source: 'manual' } }));
    expect(observed.lowerBodyLoad).toBe('heavy');
  });

  it('derives intensity from a logged RPE', () => {
    expect(deriveObservedStressFromLog(log({ rpe: 9 })).intensity).toBe('high');
    expect(deriveObservedStressFromLog(log({ rpe: 3 })).intensity).toBe('low');
    expect(deriveObservedStressFromLog(log({ rpe: 6 })).intensity).toBe('moderate');
  });

  it('never sets a field it has no real data for', () => {
    const observed = deriveObservedStressFromLog(log({ outdoorData: undefined, cardioData: undefined, rpe: undefined }));
    expect(observed).toEqual({});
  });
});
