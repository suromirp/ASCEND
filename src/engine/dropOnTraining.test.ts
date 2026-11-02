import { describe, it, expect } from 'vitest';
import { resolveDropOnTraining } from './dropOnTraining';

describe('Loslaten op een training', () => {
  it('afwezig of onbekend is het advies: Ruilen', () => {
    expect(resolveDropOnTraining(undefined)).toBe('swap');
    expect(resolveDropOnTraining({})).toBe('swap');
    expect(resolveDropOnTraining({ dropOnTraining: 'iets anders' as never })).toBe('swap');
  });
  it('Samen blijft Samen', () => {
    expect(resolveDropOnTraining({ dropOnTraining: 'together' })).toBe('together');
  });
});
