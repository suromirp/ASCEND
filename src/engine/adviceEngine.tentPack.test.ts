import { describe, it, expect } from 'vitest';
import { computeAdvice, type AdviceInputs } from './adviceEngine';

function inputs(overrides: Partial<AdviceInputs>): AdviceInputs {
  return { logs: [], plannedSessions: [], templates: [], injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: '2026-10-21', ...overrides };
}

describe('GR5-PACK-TENT', () => {
  const tentPack = { id: 'gr5-pack-tent:g1', goalId: 'g1', fromKg: 12, toKg: 14 };

  it('offers 12 to 14 kg as a goal change on Akkoord, not as a session change', () => {
    const advice = computeAdvice(inputs({ tentPack })).find((a) => a.ruleId === 'GR5-PACK-TENT')!;
    expect(advice.goalChange).toEqual({ goalId: 'g1', packWeightKg: 14 });
    expect(advice.proposal).toBeUndefined();
    expect(advice.effect).toContain('12,5 tot 14,5 kg');
    expect(advice.effect + advice.why).not.toMatch(/[–—]/);
  });

  it('is gone once you answered it, and absent without a proposal', () => {
    expect(computeAdvice(inputs({ tentPack, respondedIds: new Set([tentPack.id]) })).some((a) => a.ruleId === 'GR5-PACK-TENT')).toBe(false);
    expect(computeAdvice(inputs({})).some((a) => a.ruleId === 'GR5-PACK-TENT')).toBe(false);
  });
});
