import { describe, expect, it } from 'vitest';
import { HC_WEIGHT_KEEP_DAYS, mergeHealthWeights, weightEntryFromBody } from './healthConnectWeight';
import { addWeightEntry, currentBodyKg, freshLinkedWeight, weightDue, weightsInUse } from './bodyWeight';
import { applyWeightImport, planWeightImport } from './macrofactorWeight';
import type { BodyMetric, WeightEntry } from '../models/metrics';

// Nagemaakte wegingen, geen echte persoon.
const body = (date: string, weightKg?: number, bodyFatPct?: number): BodyMetric => ({
  id: `health-connect:${date}`,
  date,
  source: 'health-connect',
  ...(weightKg !== undefined ? { weightKg } : {}),
  ...(bodyFatPct !== undefined ? { bodyFatPct } : {}),
});
const hc = (date: string, kg: number, fatPct?: number): WeightEntry => ({ date, kg, source: 'health-connect', basis: 'scale', ...(fatPct !== undefined ? { fatPct } : {}) });
const own = (date: string, kg: number): WeightEntry => ({ date, kg, source: 'manual' });
const mf = (date: string, kg: number): WeightEntry => ({ date, kg, source: 'macrofactor', basis: 'trend' });

describe('een weging uit Health Connect als gewicht', () => {
  it('wordt een weging met de bron health-connect en het vetpercentage erbij', () => {
    expect(weightEntryFromBody(body('2026-11-03', 82.46, 18.24))).toEqual({ date: '2026-11-03', kg: 82.5, source: 'health-connect', basis: 'scale', fatPct: 18.2 });
  });

  it('laat een gewicht buiten 30 tot 250 kg weg, en een vetpercentage buiten 3 tot 60', () => {
    expect(weightEntryFromBody(body('2026-11-03', 29.9))).toBeUndefined();
    expect(weightEntryFromBody(body('2026-11-03', 250.1))).toBeUndefined();
    expect(weightEntryFromBody(body('2026-11-03', 30))?.kg).toBe(30);
    expect(weightEntryFromBody(body('2026-11-03', 250))?.kg).toBe(250);
    expect(weightEntryFromBody(body('2026-11-03', 80, 2.5))).toEqual(hc('2026-11-03', 80));
    expect(weightEntryFromBody(body('2026-11-03', 80, 61))).toEqual(hc('2026-11-03', 80));
    // Alleen een vetpercentage, zonder weging: geen gewicht.
    expect(weightEntryFromBody(body('2026-11-03', undefined, 18))).toBeUndefined();
    // Een andere bron hoort hier niet.
    expect(weightEntryFromBody({ ...body('2026-11-03', 80), source: 'garmin' })).toBeUndefined();
  });
});

describe('samenvoegen met wat er al staat', () => {
  it('voegt nieuwe dagen toe, ververst een dag uit Health Connect en telt wat veranderde', () => {
    const before = [own('2026-10-20', 84), hc('2026-11-01', 83)];
    const r = mergeHealthWeights(before, [hc('2026-11-01', 82.8), hc('2026-11-03', 82.5)], '2026-11-04');
    expect(r.changed).toBe(2);
    expect(r.entries).toEqual([own('2026-10-20', 84), hc('2026-11-01', 82.8), hc('2026-11-03', 82.5)]);
  });

  it('laat een eigen of MacroFactor-gewicht van dezelfde dag staan', () => {
    const before = [own('2026-11-03', 84), mf('2026-11-02', 83.4)];
    const r = mergeHealthWeights(before, [hc('2026-11-02', 82.9), hc('2026-11-03', 82.5)], '2026-11-04');
    expect(r.entries).toEqual([mf('2026-11-02', 83.4), hc('2026-11-02', 82.9), own('2026-11-03', 84), hc('2026-11-03', 82.5)]);
  });

  it('niets nieuw: niets veranderd', () => {
    const before = [hc('2026-11-03', 82.5, 18.2)];
    const r = mergeHealthWeights(before, [hc('2026-11-03', 82.5, 18.2)], '2026-11-04');
    expect(r.changed).toBe(0);
    expect(r.entries).toBe(before);
  });

  it('haalt nooit een dag weg die Health Connect niet meer geeft, behalve na een jaar', () => {
    const kept = hc('2026-10-01', 84);
    const r = mergeHealthWeights([hc('2025-10-01', 85), kept, own('2024-01-01', 90)], [], '2026-11-04');
    expect(HC_WEIGHT_KEEP_DAYS).toBe(365);
    expect(r.entries).toEqual([own('2024-01-01', 90), kept]);
    expect(r.changed).toBe(1);
  });
});

describe('welk gewicht telt (vaste voorrang)', () => {
  it('op dezelfde dag gaat zelf ingevuld of MacroFactor voor Health Connect', () => {
    expect(currentBodyKg([hc('2026-11-03', 82.5), own('2026-11-03', 84)], undefined, undefined)).toBe(84);
    expect(currentBodyKg([mf('2026-11-03', 83.4), hc('2026-11-03', 82.5)], undefined, undefined)).toBe(83.4);
    expect(weightsInUse([hc('2026-11-03', 82.5), own('2026-11-03', 84)], undefined, undefined)).toHaveLength(1);
  });

  it('met MacroFactor uit telt Health Connect weer op die dag', () => {
    expect(currentBodyKg([mf('2026-11-03', 83.4), hc('2026-11-03', 82.5)], false, undefined)).toBe(82.5);
  });

  it('een vetpercentage uit Health Connect vult de weging van die dag aan', () => {
    expect(weightsInUse([own('2026-11-03', 84), hc('2026-11-03', 82.5, 18.2)], undefined, undefined)).toEqual([{ ...own('2026-11-03', 84), fatPct: 18.2 }]);
  });

  it('daarna wint de nieuwste dag, uit welke bron ook', () => {
    expect(currentBodyKg([own('2026-10-20', 84), hc('2026-11-03', 82.5)], undefined, undefined)).toBe(82.5);
  });

  it('de schakelaar Gewicht uit Health Connect: uit telt het niet, en wist het niet', () => {
    const entries = [own('2026-10-20', 84), hc('2026-11-03', 82.5)];
    expect(currentBodyKg(entries, undefined, false)).toBe(84);
    expect(weightsInUse(entries, undefined, false)).toEqual([own('2026-10-20', 84)]);
    expect(entries).toHaveLength(2);
  });

  it('een weging uit Health Connect van de laatste twee weken: de vraag op Vandaag blijft weg', () => {
    const entries = [own('2026-10-01', 84), hc('2026-11-03', 82.5)];
    expect(freshLinkedWeight(entries, undefined, undefined, '2026-11-04')).toEqual(hc('2026-11-03', 82.5));
    expect(freshLinkedWeight(entries, undefined, undefined, '2026-11-17')).toEqual(hc('2026-11-03', 82.5));
    expect(freshLinkedWeight(entries, undefined, undefined, '2026-11-18')).toBeUndefined();
    expect(freshLinkedWeight(entries, undefined, false, '2026-11-04')).toBeUndefined();
    // De herinnering zelf rekent ook met de weging uit Health Connect.
    expect(weightDue(weightsInUse(entries, undefined, undefined), undefined, '2026-11-04')).toBe(false);
  });

  it('zelf invullen laat de weging uit Health Connect van die dag staan, en vervangt je eigen', () => {
    const entries = addWeightEntry(addWeightEntry([hc('2026-11-03', 82.5)], own('2026-11-03', 84)), own('2026-11-03', 83.8));
    expect(entries).toEqual([hc('2026-11-03', 82.5), own('2026-11-03', 83.8)]);
  });

  it('een export van MacroFactor raakt de wegingen uit Health Connect niet', () => {
    const existing = [hc('2026-11-02', 82.9)];
    const plan = planWeightImport(existing, [{ date: '2026-11-02', trendKg: 83.4 }]);
    expect(plan.conflicts).toEqual([]);
    expect(applyWeightImport(existing, plan)).toEqual([hc('2026-11-02', 82.9), mf('2026-11-02', 83.4)]);
  });
});
