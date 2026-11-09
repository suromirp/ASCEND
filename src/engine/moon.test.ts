import { describe, it, expect } from 'vitest';
import { moonAge, moonIllumination, moonNote, eveningMoonNote } from './moon';

// Bekende maanstanden (UTC, uit de astronomische almanak): volle maan 7 oktober 2025 en
// 5 november 2025, nieuwe maan 21 oktober 2025 en 20 november 2025.
describe('moonIllumination', () => {
  it('is bijna 1 bij volle maan en bijna 0 bij nieuwe maan', () => {
    expect(moonIllumination('2025-10-07')).toBeGreaterThan(0.97);
    expect(moonIllumination('2025-11-05')).toBeGreaterThan(0.97);
    expect(moonIllumination('2025-10-21')).toBeLessThan(0.03);
    expect(moonIllumination('2025-11-20')).toBeLessThan(0.03);
  });
  it('zit halverwege bij een kwartier', () => {
    // Laatste kwartier rond 13 oktober 2025.
    const v = moonIllumination('2025-10-13');
    expect(v).toBeGreaterThan(0.3);
    expect(v).toBeLessThan(0.7);
  });
  it('de leeftijd blijft tussen 0 en 29,6 dagen, ook ver terug', () => {
    for (const d of ['1990-01-01', '2000-01-06', '2025-12-31', '2040-06-15']) {
      const a = moonAge(d);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(29.6);
    }
  });
});

describe('moonNote', () => {
  it('zegt iets bij volle en bij nieuwe maan', () => {
    expect(moonNote('2025-10-07')).toMatchObject({ phase: 'full', text: 'Volle maan, je ziet het pad meestal zonder lamp.' });
    expect(moonNote('2025-10-21')).toMatchObject({ phase: 'new', text: 'Nieuwe maan, het wordt echt donker; neem een goede lamp mee.' });
  });
  it('zwijgt bij elke andere stand', () => {
    expect(moonNote('2025-10-13')).toBeUndefined();
    expect(moonNote('2025-10-28')).toBeUndefined();
  });
  it('een datum die geen datum is geeft niets', () => {
    expect(moonNote('morgen')).toBeUndefined();
  });
});

describe('eveningMoonNote', () => {
  it('alleen bij een avondtocht of een nacht buiten', () => {
    expect(eveningMoonNote('2025-10-07', { endsAfterSunset: false, overnight: false })).toBeUndefined();
    expect(eveningMoonNote('2025-10-07', { endsAfterSunset: true, overnight: false })?.phase).toBe('full');
    expect(eveningMoonNote('2025-10-07', { endsAfterSunset: false, overnight: true })?.phase).toBe('full');
    expect(eveningMoonNote('2025-10-13', { endsAfterSunset: true, overnight: true })).toBeUndefined();
  });
});
