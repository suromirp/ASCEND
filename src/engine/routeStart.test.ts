import { describe, expect, it } from 'vitest';
import { chooseStart, resolveRouteStart, roundExact, roundHere, startFailureReason, validStartPoint } from './routeStart';

// Nagemaakt punt, geen echte plek.
const fake = { lat: 52.123456, lon: 5.654321 };

describe('routeStart', () => {
  it('Waar je nu bent is de standaard, ook bij een onbekende waarde; een eigen keuze blijft', () => {
    expect(resolveRouteStart(undefined)).toBe('here');
    expect(resolveRouteStart('iets')).toBe('here');
    expect(resolveRouteStart('exact')).toBe('exact');
    expect(resolveRouteStart('approx')).toBe('approx');
    expect(resolveRouteStart('here')).toBe('here');
  });

  it('Waar je nu bent vraagt eerst de plek, ook als er een vast punt is', () => {
    expect(chooseStart('here', fake)).toEqual({ kind: 'here' });
    expect(chooseStart('here', undefined)).toEqual({ kind: 'here' });
  });

  it('Ongeveer gebruikt nooit het bewaarde punt', () => {
    expect(chooseStart('approx', fake)).toEqual({ kind: 'approx' });
  });

  it('Precies met een punt gebruikt dat punt', () => {
    expect(chooseStart('exact', fake)).toEqual({ kind: 'exact', point: fake });
  });

  it('Precies zonder bewaard punt vraagt om een punt', () => {
    expect(chooseStart('exact', undefined)).toEqual({ kind: 'needs-point' });
    expect(chooseStart('exact', null)).toEqual({ kind: 'needs-point' });
  });

  it('een kapot punt telt als geen punt', () => {
    for (const bad of [{ lat: 'x', lon: 1 }, { lat: NaN, lon: 1 }, { lat: 91, lon: 0 }, { lat: 0, lon: 181 }, 'tekst', 5, { lat: 1 }]) {
      expect(validStartPoint(bad)).toBeUndefined();
      expect(chooseStart('exact', bad)).toEqual({ kind: 'needs-point' });
    }
  });

  it('rondt een bewaard punt af op vijf decimalen', () => {
    expect(roundExact({ lat: 52.1234567, lon: 5.6543219 })).toEqual({ lat: 52.12346, lon: 5.65432 });
  });

  it('elke reden heeft één korte regel, zonder te zeggen dat de lus ergens anders begint', () => {
    for (const r of ['denied', 'unavailable', 'timeout', 'unsupported', 'coarse'] as const) {
      expect(startFailureReason(r)).not.toMatch(/Thuis|afgerond/);
    }
  });
});

describe('Waar je nu bent', () => {
  it('de heuvels rond je plek op drie decimalen', () => {
    expect(roundHere({ lat: 52.123456, lon: 5.654321 })).toEqual({ lat: 52.123, lon: 5.654 });
  });
});
