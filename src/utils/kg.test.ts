import { describe, expect, it } from 'vitest';
import { kgLabel } from './kg';

describe('kgLabel', () => {
  it('gebruikt een komma en laat ,0 weg', () => {
    expect(kgLabel(12.5)).toBe('12,5 kg');
    expect(kgLabel(20)).toBe('20 kg');
    expect(kgLabel(20.04)).toBe('20 kg');
  });
  it('rond af op het gevraagde aantal decimalen', () => {
    expect(kgLabel(2.25, 2)).toBe('2,25 kg');
    expect(kgLabel(2.25)).toBe('2,3 kg');
    expect(kgLabel(1234.5, 0)).toBe('1.235 kg');
  });
  it('houdt een min vooraan', () => {
    expect(kgLabel(-1.5)).toBe('-1,5 kg');
  });
});
