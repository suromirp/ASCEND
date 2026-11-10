import { describe, expect, it } from 'vitest';
import { chooseStart, resolveRouteStart, roundExact, startFailureLine, validStartPoint } from './routeStart';

// Nagemaakt punt, geen echte plek.
const fake = { lat: 52.123456, lon: 5.654321 };

describe('routeStart', () => {
  it('Ongeveer is de standaard, ook bij een onbekende waarde', () => {
    expect(resolveRouteStart(undefined)).toBe('approx');
    expect(resolveRouteStart('iets')).toBe('approx');
    expect(resolveRouteStart('exact')).toBe('exact');
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

  it('elke reden heeft één rustige regel die zegt wat er dan geldt', () => {
    for (const r of ['denied', 'unavailable', 'timeout', 'unsupported', 'coarse'] as const) {
      expect(startFailureLine(r)).toContain('afgerond op ongeveer een kilometer');
    }
  });
});
