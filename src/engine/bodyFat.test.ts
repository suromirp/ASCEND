import { describe, it, expect } from 'vitest';
import { bodyFatLines, bodyFatTrend, hasBodyFat, isPlausibleFatPct } from './bodyFat';
import type { WeightEntry } from '../models/metrics';

// Nagemaakte metingen, onafhankelijk van de datum van vandaag.
const e = (date: string, kg: number, fatPct?: number, scaleKg?: number): WeightEntry => ({
  date,
  kg,
  source: 'macrofactor',
  ...(fatPct !== undefined ? { fatPct } : {}),
  ...(scaleKg !== undefined ? { scaleKg } : {}),
});

// Dagelijks van 1 tot en met 31 augustus, vet zakt van 20 naar 18.
function month(): WeightEntry[] {
  const out: WeightEntry[] = [];
  for (let d = 1; d <= 31; d++) {
    out.push(e(`2026-08-${String(d).padStart(2, '0')}`, 80, 20 - ((d - 1) / 30) * 2));
  }
  return out;
}

describe('isPlausibleFatPct', () => {
  it('neemt alleen waarden van 3 tot en met 60', () => {
    expect([2.9, 3, 18.4, 60, 60.1, NaN, Infinity, '18'].map(isPlausibleFatPct)).toEqual([false, true, true, true, false, false, false, false]);
  });
});

describe('hasBodyFat', () => {
  it('ziet of er een meting met vetpercentage is', () => {
    expect(hasBodyFat(undefined)).toBe(false);
    expect(hasBodyFat([e('2026-08-01', 80)])).toBe(false);
    expect(hasBodyFat([e('2026-08-01', 80, 18)])).toBe(true);
  });
});

describe('bodyFatTrend', () => {
  it('geeft niets zonder metingen met vetpercentage', () => {
    expect(bodyFatTrend([e('2026-08-01', 80)])).toBeUndefined();
    expect(bodyFatTrend(undefined)).toBeUndefined();
  });

  it('middelt de laatste 7 metingen en zet ze tegenover een maand eerder', () => {
    const t = bodyFatTrend(month())!;
    expect(t.asOf).toBe('2026-08-31');
    // Laatste 7: 25 tot en met 31 augustus, gemiddeld 18,2.
    expect(t.pct).toBeCloseTo(18.2, 5);
    expect(t.readings).toBe(7);
    // Een maand eerder: de laatste 7 metingen van 3 tot 8 weken voor 31 augustus,
    // dus 4 tot en met 10 augustus, gemiddeld 19,6.
    expect(t.previousPct).toBeCloseTo(19.6, 1);
    expect(t.deltaPct).toBeCloseTo(-1.4, 1);
  });

  it('vergelijkt niet als er 4 weken eerder te weinig staat', () => {
    const t = bodyFatTrend([e('2026-08-31', 80, 18), e('2026-08-30', 80, 18.2), e('2026-08-03', 80, 19)])!;
    expect(t.pct).toBeCloseTo(18.1, 5);
    expect(t.previousPct).toBeUndefined();
    expect(t.deltaPct).toBeUndefined();
  });

  it('telt metingen ouder dan 4 weken niet mee in het huidige gemiddelde', () => {
    const t = bodyFatTrend([e('2026-07-01', 80, 25), e('2026-07-02', 80, 25), e('2026-08-30', 80, 20), e('2026-08-31', 80, 20)])!;
    expect(t.pct).toBe(20);
  });

  it('rekent de vetvrije massa uit de weging van die dag, anders uit het gewicht', () => {
    const t = bodyFatTrend([e('2026-08-01', 80, 20, 81), e('2026-08-02', 80, 20)])!;
    // 81 * 0,8 = 64,8 en 80 * 0,8 = 64
    expect(t.leanKg).toBeCloseTo(64.4, 5);
  });

  it('geeft de vetvrije massa 4 weken eerder en het verschil', () => {
    const list: WeightEntry[] = [];
    for (let d = 1; d <= 3; d++) list.push(e(`2026-08-0${d}`, 80, 20));
    for (let d = 28; d <= 31; d++) list.push(e(`2026-08-${d}`, 82, 20));
    const t = bodyFatTrend(list)!;
    expect(t.leanKg).toBeCloseTo(65.6, 5);
    expect(t.previousLeanKg).toBeCloseTo(64, 5);
    expect(t.leanDeltaKg).toBeCloseTo(1.6, 5);
  });

  it('negeert een onbruikbaar vetpercentage dat toch in de lijst staat', () => {
    expect(bodyFatTrend([e('2026-08-01', 80, 75)])).toBeUndefined();
  });
});

describe('bodyFatLines', () => {
  it('zegt het in gewoon Nederlands', () => {
    const lines = bodyFatLines(bodyFatTrend(month())!);
    expect(lines.fat).toBe('Vet 18,2%, 1,4 lager dan een maand eerder');
    expect(lines.lean).toBe('Vetvrije massa 65,4 kg, 1,1 kg hoger dan een maand eerder');
  });

  it('zegt hoger, lager en gelijk', () => {
    const base = { asOf: '2026-08-31', readings: 7, previousPct: 18 };
    expect(bodyFatLines({ ...base, pct: 18.6, deltaPct: 0.6 }).fat).toBe('Vet 18,6%, 0,6 hoger dan een maand eerder');
    expect(bodyFatLines({ ...base, pct: 18.02, deltaPct: 0.02 }).fat).toBe('Vet 18,0%, ongeveer gelijk aan een maand eerder');
    expect(bodyFatLines({ ...base, pct: 18, deltaPct: 0, leanKg: 70, leanDeltaKg: -0.4 }).lean).toBe('Vetvrije massa 70,0 kg, 0,4 kg lager dan een maand eerder');
  });

  it('zegt eerlijk dat er nog geen vergelijking is', () => {
    const lines = bodyFatLines({ asOf: '2026-08-31', readings: 2, pct: 18.4, leanKg: 69 });
    expect(lines.fat).toBe('Vet 18,4%, nog geen vergelijking met een maand eerder');
    expect(lines.lean).toBeUndefined();
  });
});

describe('bodyFatTrend met een weegschaal die niet elke dag gebruikt wordt', () => {
  it('vergelijkt met metingen van 3 tot 8 weken eerder', () => {
    const t = bodyFatTrend([e('2026-08-31', 80, 18), e('2026-08-20', 80, 18.4), e('2026-07-20', 80, 19), e('2026-07-14', 80, 19.2)])!;
    expect(t.previousPct).toBeCloseTo(19.1, 5);
    expect(t.deltaPct).toBeCloseTo(-0.9, 5);
  });
});
