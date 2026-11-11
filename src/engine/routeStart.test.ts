import { describe, expect, it } from 'vitest';
import { chooseStart, hereStart, hereStartLine, resolveRouteStart, roundExact, roundHere, START_LINE_EXACT, START_LINE_HERE, startFailureLine, startFailureReason, validStartPoint } from './routeStart';

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

  it('elke reden heeft één rustige regel die zegt wat er dan geldt', () => {
    for (const r of ['denied', 'unavailable', 'timeout', 'unsupported', 'coarse'] as const) {
      expect(startFailureLine(r)).toContain('afgerond op ongeveer een kilometer');
    }
  });
});

describe('Waar je nu bent: terugval', () => {
  const here = { lat: 52.11111, lon: 5.11111 };

  it('een goede plek: de lus begint daar', () => {
    const start = hereStart({ ok: true, point: here }, fake);
    expect(start).toEqual({ kind: 'here', point: here });
    expect(hereStartLine(start)).toBe(START_LINE_HERE);
  });

  it('locatie geweigerd met een vast punt: terug op het vaste punt, met de reden', () => {
    const start = hereStart({ ok: false, reason: 'denied' }, fake);
    expect(start).toEqual({ kind: 'fixed', point: fake, reason: 'denied' });
    expect(hereStartLine(start)).toBe(`${startFailureReason('denied')} ${START_LINE_EXACT}`);
  });

  it('een te grove plek zonder vast punt: Ongeveer, met de reden', () => {
    const start = hereStart({ ok: false, reason: 'coarse' }, undefined);
    expect(start).toEqual({ kind: 'approx', reason: 'coarse' });
    expect(hereStartLine(start)).toBe(startFailureLine('coarse'));
  });

  it('een kapot vast punt telt niet: Ongeveer', () => {
    expect(hereStart({ ok: false, reason: 'timeout' }, { lat: 'x' }).kind).toBe('approx');
  });

  it('de heuvels rond je plek op drie decimalen', () => {
    expect(roundHere({ lat: 52.123456, lon: 5.654321 })).toEqual({ lat: 52.123, lon: 5.654 });
  });
});
