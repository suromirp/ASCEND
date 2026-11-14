import { describe, expect, it } from 'vitest';
import { ALTITUDE_FROM_M, UV_FROM, altitudePhrase, outdoorSunParts, outdoorSunSentence, uvPhrase, uvShort } from './outdoorSun';

describe('UV vanaf 3, op hele getallen', () => {
  it('onder 3 niets, ook 2,4; 2,5 rondt naar 3', () => {
    expect(UV_FROM).toBe(3);
    expect(uvPhrase(undefined)).toBeUndefined();
    expect(uvPhrase(0)).toBeUndefined();
    expect(uvPhrase(2.4)).toBeUndefined();
    expect(uvPhrase(2.5)).toBe('UV 3, smeer je in');
  });
  it('vanaf 6 ook pet en zonnebril, alleen op de pagina Weer (full)', () => {
    expect(uvPhrase(5.4, { full: true })).toBe('UV 5, smeer je in');
    expect(uvPhrase(6.2, { full: true })).toBe('UV 6, smeer je in en zet pet en zonnebril op');
    expect(uvPhrase(8)).toBe('UV 8, smeer je in');
  });
  it('noemt het kledingadvies de zonnebrand al, dan alleen het getal', () => {
    expect(uvPhrase(4, { sunscreenSaid: true })).toBe('UV 4');
    expect(uvPhrase(7, { sunscreenSaid: true, full: true })).toBe('UV 7');
  });
  it('korter dan 45 minuten alleen het getal, zoals het kledingadvies; vanaf 45 met wat je doet', () => {
    expect(uvPhrase(4, { minutes: 30 })).toBe('UV 4');
    expect(uvPhrase(4, { minutes: 44 })).toBe('UV 4');
    expect(uvPhrase(4, { minutes: 45 })).toBe('UV 4, smeer je in');
    expect(uvPhrase(7, { minutes: 30, full: true })).toBe('UV 7');
  });
  it('een kapotte waarde zegt niets', () => {
    expect(uvPhrase(Number.NaN)).toBeUndefined();
  });
});

describe('hoogte vanaf 1000 m, op 10 m', () => {
  it('lager of zonder hoogte niets', () => {
    expect(ALTITUDE_FROM_M).toBe(1000);
    expect(altitudePhrase(undefined)).toBeUndefined();
    expect(altitudePhrase(4)).toBeUndefined();
    expect(altitudePhrase(994)).toBeUndefined();
  });
  it('afgerond op 10 m, met een punt voor de duizendtallen', () => {
    expect(altitudePhrase(995)).toBe('je plek ligt op 1.000 m');
    expect(altitudePhrase(1243)).toBe('je plek ligt op 1.240 m');
    expect(altitudePhrase(2457)).toBe('je plek ligt op 2.460 m');
  });
});

describe('alleen buiten en met de instelling aan', () => {
  const base = { on: true, outdoor: true, uvIndex: 4, elevationM: 1243 };
  it('buiten: UV, dan hoogte', () => {
    expect(outdoorSunParts(base)).toEqual(['UV 4, smeer je in', 'je plek ligt op 1.240 m']);
    expect(outdoorSunSentence(base)).toBe('UV 4, smeer je in. Je plek ligt op 1.240 m.');
  });
  it('binnen niets', () => {
    expect(outdoorSunParts({ ...base, outdoor: false })).toEqual([]);
    expect(outdoorSunSentence({ ...base, outdoor: false })).toBeUndefined();
  });
  it('instelling uit: niets', () => {
    expect(outdoorSunParts({ ...base, on: false })).toEqual([]);
  });
  it('nacht (UV 0) op een plek zonder hoogte: niets', () => {
    expect(outdoorSunSentence({ ...base, uvIndex: 0, elevationM: undefined })).toBeUndefined();
  });
});

describe('uvShort, voor de rij Weer in de Briefing', () => {
  it('alleen het getal met een vaste spatie, vanaf 3', () => {
    expect(uvShort(8.2)).toBe('UV\u00A08');
    expect(uvShort(2.4)).toBeUndefined();
    expect(uvShort(0)).toBeUndefined();
    expect(uvShort(undefined)).toBeUndefined();
  });
});
