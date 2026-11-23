import { describe, expect, it } from 'vitest';
import { sportDidLine } from './sportDidLine';

describe('sportDidLine', () => {
  it('vandaag staat voor de sport, zonder "op"', () => {
    expect(sportDidLine('padel', '2026-11-23', '2026-11-23', '1 uur')).toBe('Je deed vandaag padel, 1 uur.');
    expect(sportDidLine('iets nieuws', '2026-11-23', '2026-11-23', '45 min')).toBe('Je deed vandaag iets nieuws, 45 min.');
  });
  it('een andere dag noemt de dag erachter', () => {
    const line = sportDidLine('padel', '2026-11-21', '2026-11-23', '1 uur');
    expect(line).toMatch(/^Je deed padel op zaterdag .*, 1 uur\.$/);
    expect(line).not.toContain('op vandaag');
  });
  it('zonder duur geen komma', () => {
    expect(sportDidLine('padel', '2026-11-23', '2026-11-23', '')).toBe('Je deed vandaag padel.');
  });
});
