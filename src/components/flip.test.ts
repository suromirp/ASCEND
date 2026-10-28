import { describe, expect, it } from 'vitest';
import { applyOverride, flipDeltas, flipDuration, flipStyle, isArmed, FLIP_ARM_MS, FLIP_MAX_MS, FLIP_MIN_MS, type Rect } from './flip';
import flipSource from './flip.ts?raw';

const rect = (top: number, left = 0): Rect => ({ left, top, width: 358, height: 64 });
const map = (entries: [string, Rect][]) => new Map(entries);

describe('flipDeltas', () => {
  it('geeft een rij die een dag opschuift het verschil, oude plek min nieuwe plek', () => {
    const d = flipDeltas(map([['a', rect(300)]]), map([['a', rect(100)]]));
    expect(d.get('a')).toEqual({ dx: 0, dy: 200 });
  });

  it('geeft een rij die niet beweegt niets', () => {
    expect(flipDeltas(map([['a', rect(300)]]), map([['a', rect(300)]])).size).toBe(0);
  });

  it('geeft een nieuwe of verdwenen rij niets', () => {
    const d = flipDeltas(map([['a', rect(0)], ['gone', rect(64)]]), map([['a', rect(0)], ['new', rect(128)]]));
    expect(d.size).toBe(0);
  });

  it('laat twee rijen die van plaats wisselen allebei bewegen', () => {
    const d = flipDeltas(map([['a', rect(0)], ['b', rect(64)]]), map([['a', rect(64)], ['b', rect(0)]]));
    expect(d.get('a')).toEqual({ dx: 0, dy: -64 });
    expect(d.get('b')).toEqual({ dx: 0, dy: 64 });
  });

  it('telt pas vanaf 4 px', () => {
    expect(flipDeltas(map([['a', rect(100)]]), map([['a', rect(103)]])).size).toBe(0);
    expect(flipDeltas(map([['a', rect(100)]]), map([['a', rect(104)]])).size).toBe(1);
    expect(flipDeltas(map([['a', rect(100)]]), map([['a', rect(102)]]), 2).size).toBe(1);
  });

  it('telt de scrol van de pagina niet mee: dezelfde rechthoek in paginaruimte is geen verschuiving', () => {
    // De rij staat op paginahoogte 800, ook als de pagina 300 verder gescrold is.
    const viewportBefore = 800 - 0;
    const viewportAfter = 800 - 300;
    const before = map([['a', rect(viewportBefore + 0)]]);
    const after = map([['a', rect(viewportAfter + 300)]]);
    expect(flipDeltas(before, after).size).toBe(0);
  });
});

describe('flipDuration', () => {
  it('begint bij 220 ms en stopt bij 400 ms', () => {
    expect(flipDuration(0)).toBe(FLIP_MIN_MS);
    expect(flipDuration(1)).toBeGreaterThanOrEqual(FLIP_MIN_MS);
    expect(flipDuration(5000)).toBe(FLIP_MAX_MS);
    expect(flipDuration(Number.NaN)).toBe(FLIP_MIN_MS);
  });

  it('stijgt alleen', () => {
    let last = 0;
    for (let d = 0; d <= 1000; d += 25) {
      const ms = flipDuration(d);
      expect(ms).toBeGreaterThanOrEqual(last);
      last = ms;
    }
  });

  it('telt een afstand omhoog en omlaag gelijk', () => {
    expect(flipDuration(-300)).toBe(flipDuration(300));
  });
});

describe('applyOverride', () => {
  it('zet het beginpunt van een id op de plek van de zwevende rij', () => {
    const before = map([['a', rect(300)], ['b', rect(364)]]);
    const next = applyOverride(before, 'a', 520);
    expect(next.get('a')?.top).toBe(520);
    expect(next.get('b')?.top).toBe(364);
    expect(before.get('a')?.top).toBe(300);
  });

  it('laat de kaart ongemoeid bij een onbekend id', () => {
    const before = map([['a', rect(300)]]);
    expect(applyOverride(before, 'x', 10)).toBe(before);
  });

  it('geeft met de override het verschil vanaf de vinger', () => {
    const before = applyOverride(map([['a', rect(300)]]), 'a', 520);
    expect(flipDeltas(before, map([['a', rect(100)]])).get('a')).toEqual({ dx: 0, dy: 420 });
  });
});

describe('flipStyle', () => {
  it('schuift in Normaal, vervaagt in Rustig en doet niets in Uit', () => {
    expect(flipStyle('full')).toBe('slide');
    expect(flipStyle('calm')).toBe('fade');
    expect(flipStyle('off')).toBe('none');
  });
});

describe('isArmed', () => {
  it('geldt een seconde en niet langer', () => {
    expect(isArmed(null, 100)).toBe(false);
    expect(isArmed(1000, 1000 + FLIP_ARM_MS)).toBe(true);
    expect(isArmed(1000, 1000 + FLIP_ARM_MS + 1)).toBe(false);
  });
});

describe('teksten', () => {
  it('bevatten geen gedachtestreepjes', () => {
    expect(flipSource).not.toMatch(/[–—]/);
  });
});
