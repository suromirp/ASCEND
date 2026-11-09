import { describe, expect, it } from 'vitest';
import type { WeightEntry } from '../models/metrics';
import { weightsInUse } from './bodyWeight';
import { TREND_MIN_WEIGHINGS, weightShown, weightTrend } from './weightTrend';

// Nagemaakte wegingen.
const hc = (date: string, kg: number): WeightEntry => ({ date, kg, source: 'health-connect', basis: 'scale' });

describe('weightTrend', () => {
  it('geeft niets zonder wegingen', () => {
    expect(weightTrend(undefined)).toBeUndefined();
    expect(weightTrend([])).toBeUndefined();
  });

  it('geeft niets bij één weging, en het getal dat telt is dan de weging zelf', () => {
    expect(weightTrend([hc('2026-11-03', 79.1)])).toBeUndefined();
    expect(weightShown([hc('2026-11-03', 79.1)], true)).toEqual({ kg: 79.1, latest: hc('2026-11-03', 79.1) });
  });

  it(`vraagt minstens ${TREND_MIN_WEIGHINGS} wegingen in de laatste twee weken`, () => {
    expect(weightTrend([hc('2026-11-02', 79), hc('2026-11-03', 79.4)])).toBeUndefined();
    expect(weightTrend([hc('2026-11-01', 79), hc('2026-11-02', 79.2), hc('2026-11-03', 79.4)])).toMatchObject({ readings: 3, asOf: '2026-11-03', latestKg: 79.4 });
  });

  it('weegt recente wegingen zwaarder en rondt af op een decimaal', () => {
    // 80 kg vandaag en gisteren, 78 kg een week eerder (de helft zo zwaar), binnen 3 % van elkaar.
    const t = weightTrend([hc('2026-10-28', 78), hc('2026-11-03', 80), hc('2026-11-04', 80)]);
    // (80 + 80 * 0,906 + 78 * 0,5) / (1 + 0,906 + 0,5) = 79,58
    expect(t?.kg).toBe(79.6);
    expect(t?.outliers).toBe(0);
  });

  it('is rustiger dan de dagelijkse schommeling', () => {
    const days = ['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03'];
    const kgs = [78.2, 79.0, 78.0, 78.9, 78.1, 78.8, 78.3, 79.1, 78.2, 79.1];
    const t = weightTrend(days.map((d, i) => hc(d, kgs[i])));
    expect(t?.kg).toBeGreaterThan(78.4);
    expect(t?.kg).toBeLessThan(78.8);
    expect(t?.latestKg).toBe(79.1);
    expect(t?.readings).toBe(10);
  });

  it('kijkt alleen naar de laatste 14 dagen; na een gat valt hij terug op de nieuwste weging', () => {
    const old = [hc('2026-10-01', 82), hc('2026-10-02', 82), hc('2026-10-03', 82)];
    expect(weightTrend([...old, hc('2026-11-03', 79)])).toBeUndefined();
    expect(weightShown([...old, hc('2026-11-03', 79)], true)?.kg).toBe(79);
    // Een gat binnen het venster mag: drie wegingen verspreid over twee weken.
    expect(weightTrend([hc('2026-10-21', 79), hc('2026-10-28', 79), hc('2026-11-03', 79)])).toMatchObject({ kg: 79, readings: 3, from: '2026-10-21' });
    // 14 dagen voor de nieuwste valt er net buiten.
    expect(weightTrend([hc('2026-10-20', 79), hc('2026-10-28', 79), hc('2026-11-03', 79)])).toBeUndefined();
  });

  it('laat een uitschieter weg en telt hem', () => {
    const t = weightTrend([hc('2026-10-30', 79), hc('2026-10-31', 79.2), hc('2026-11-01', 88), hc('2026-11-02', 79.1), hc('2026-11-03', 79)]);
    expect(t).toMatchObject({ readings: 4, outliers: 1 });
    expect(t?.kg).toBeCloseTo(79.1, 1);
  });

  it('een uitschieter als nieuwste weging telt niet mee, maar blijft de laatste weging', () => {
    const t = weightTrend([hc('2026-10-31', 79), hc('2026-11-01', 79.2), hc('2026-11-02', 79.1), hc('2026-11-03', 70)]);
    expect(t).toMatchObject({ latestKg: 70, outliers: 1, readings: 3 });
    expect(t?.kg).toBeCloseTo(79.1, 1);
  });

  it('rekent het trendgewicht van MacroFactor niet nog eens af', () => {
    const mf: WeightEntry[] = [
      { date: '2026-11-01', kg: 79, source: 'macrofactor', basis: 'trend', scaleKg: 79.5 },
      { date: '2026-11-02', kg: 79, source: 'macrofactor', basis: 'trend', scaleKg: 78.7 },
      { date: '2026-11-03', kg: 79, source: 'macrofactor', basis: 'trend', scaleKg: 79.3 },
    ];
    expect(weightTrend(mf)).toBeUndefined();
    expect(weightShown(mf, true)?.kg).toBe(79);
    // Is de nieuwste een weging, dan telt van een trenddag de weging van die dag.
    const t = weightTrend([...mf, hc('2026-11-04', 79.1)]);
    expect(t?.readings).toBe(4);
    expect(t?.kg).toBeGreaterThan(78.9);
    expect(t?.kg).toBeLessThan(79.4);
  });

  it('wegingen uit meerdere bronnen op een dag tellen als één, via weightsInUse', () => {
    const stored: WeightEntry[] = [
      hc('2026-11-01', 79),
      hc('2026-11-02', 79.2),
      hc('2026-11-03', 90),
      { date: '2026-11-03', kg: 79.1, source: 'manual' },
    ];
    const inUse = weightsInUse(stored, undefined, undefined);
    expect(inUse).toHaveLength(3);
    const t = weightTrend(inUse);
    expect(t).toMatchObject({ readings: 3, outliers: 0, latestKg: 79.1 });
    // Health Connect uit: dan zijn er te weinig wegingen.
    expect(weightTrend(weightsInUse(stored, undefined, false))).toBeUndefined();
  });

  it('negeert een kapot getal', () => {
    expect(weightTrend([hc('2026-11-01', 79), hc('2026-11-02', Number.NaN), hc('2026-11-03', 79)])).toBeUndefined();
  });
});

describe('weightShown', () => {
  const week = [hc('2026-10-30', 78.5), hc('2026-10-31', 78.3), hc('2026-11-01', 78.4), hc('2026-11-02', 78.2), hc('2026-11-03', 79.1)];

  it('geeft de trend als die aan staat en er genoeg wegingen zijn', () => {
    const s = weightShown(week, true);
    expect(s?.trend).toBeDefined();
    expect(s?.kg).toBe(s?.trend?.kg);
    expect(s?.latest.kg).toBe(79.1);
    // Afwezig is aan, het advies.
    expect(weightShown(week, undefined)?.trend).toBeDefined();
  });

  it('geeft de laatste weging als de trend uit staat', () => {
    expect(weightShown(week, false)).toEqual({ kg: 79.1, latest: hc('2026-11-03', 79.1) });
  });

  it('geeft niets zonder gewicht', () => {
    expect(weightShown([], true)).toBeUndefined();
  });
});
