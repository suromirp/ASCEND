import { describe, expect, it } from 'vitest';
import { traitsToStressProfile } from './traitsProfile';

describe('traitsToStressProfile', () => {
  it('zet kenmerken om naar belastingsniveaus', () => {
    const p = traitsToStressProfile({ impact: 3, eccentric: 2, stopStart: 0, upperBody: 0, technique: 1 }, 'low');
    expect(p).toEqual({
      lowerBodyLoad: 'heavy', impact: 'heavy', eccentricLoad: 'moderate', intensity: 'low', upperBodyLoad: 'none', cardioLoad: 'light',
    });
  });

  it('stop-en-start telt mee voor de benen', () => {
    const p = traitsToStressProfile({ impact: 1, eccentric: 1, stopStart: 3, upperBody: 2, technique: 3 }, 'moderate');
    expect(p.lowerBodyLoad).toBe('heavy');
    expect(p.impact).toBe('light');
    expect(p.upperBodyLoad).toBe('moderate');
    expect(p.cardioLoad).toBe('moderate');
  });

  it('de benen zijn nooit lager dan licht', () => {
    const p = traitsToStressProfile({ impact: 0, eccentric: 0, stopStart: 0, upperBody: 3, technique: 3 }, 'high');
    expect(p.lowerBodyLoad).toBe('light');
    expect(p.impact).toBe('none');
    expect(p.cardioLoad).toBe('heavy');
  });
});
