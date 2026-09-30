import { describe, it, expect } from 'vitest';
import { orderRotation } from './rotationOrder';
import type { SessionTemplate } from '../models/training';

const upper = (id: string, name: string, defaultDayOfWeek?: number): SessionTemplate => ({
  id, name, type: 'strength', defaultDayOfWeek, durationVariants: { full: 75 },
  baseStressProfile: { lowerBodyLoad: 'none', impact: 'none', eccentricLoad: 'none', intensity: 'moderate', upperBodyLoad: 'heavy' },
});
const lower: SessionTemplate = { id: 'lower', name: 'Lower A', type: 'strength', durationVariants: { full: 75 }, baseStressProfile: { lowerBodyLoad: 'heavy', impact: 'light', eccentricLoad: 'moderate', intensity: 'high' } };

describe('orderRotation', () => {
  it('swaps the dates of interchangeable sessions so A comes before B', () => {
    const byKey = new Map([['a', upper('ua', 'Upper A', 2)], ['b', upper('ub', 'Upper B', 5)]]);
    const result = orderRotation([{ sessionOrDraft: 'b', date: '2026-10-02' }, { sessionOrDraft: 'a', date: '2026-10-04' }], (k) => byKey.get(k));
    expect(result).toEqual([{ sessionOrDraft: 'b', date: '2026-10-04' }, { sessionOrDraft: 'a', date: '2026-10-02' }]);
  });

  it('falls back to the name when there is no default weekday', () => {
    const byKey = new Map([['a', upper('ua', 'Upper A')], ['b', upper('ub', 'Upper B')]]);
    const result = orderRotation([{ sessionOrDraft: 'a', date: '2026-10-04' }, { sessionOrDraft: 'b', date: '2026-10-02' }], (k) => byKey.get(k));
    expect(result.find((p) => p.sessionOrDraft === 'a')!.date).toBe('2026-10-02');
  });

  it('never swaps sessions with a different load profile', () => {
    const byKey = new Map([['u', upper('ub', 'Upper B', 5)], ['l', lower]]);
    const input = [{ sessionOrDraft: 'l', date: '2026-10-04' }, { sessionOrDraft: 'u', date: '2026-10-02' }];
    expect(orderRotation(input, (k) => byKey.get(k))).toEqual(input);
  });
});
