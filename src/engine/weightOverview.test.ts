import { describe, expect, it } from 'vitest';
import type { WeightEntry } from '../models/metrics';
import { weightCardData } from './weightCard';
import { isWeightRange, signedKg, weighingRowSource, weightChangeLines, weightChartSummary, weightOverview } from './weightOverview';
import { realWeighings, weightLineAt, weightTrend } from './weightTrend';
import { addDays } from '../utils/dates';

// Nagemaakte wegingen.
const w = (date: string, kg: number, source: WeightEntry['source'] = 'health-connect'): WeightEntry => ({ date, kg, source });
const mf = (date: string, trendKg: number, scaleKg?: number): WeightEntry => ({ date, kg: trendKg, source: 'macrofactor', basis: 'trend', ...(scaleKg === undefined ? {} : { scaleKg }) });
const TODAY = '2026-11-09';

describe('realWeighings', () => {
  it('telt een trendgewicht uit MacroFactor nooit als weging, de weging van die dag wel', () => {
    expect(realWeighings([mf('2026-11-01', 84), mf('2026-11-02', 84.1, 85.3), w('2026-11-03', 84.8)])).toEqual([
      { date: '2026-11-02', kg: 85.3 },
      { date: '2026-11-03', kg: 84.8 },
    ]);
  });
});

describe('weightLineAt', () => {
  it('is het gewogen gemiddelde van de echte wegingen, ook met één of twee', () => {
    expect(weightLineAt([w('2026-11-05', 85)], '2026-11-05', undefined)).toEqual({ kg: 85, own: true });
    const two = weightLineAt([w('2026-11-05', 85), w('2026-11-06', 86)], '2026-11-06', undefined)!;
    expect(two.kg).toBeGreaterThan(85);
    expect(two.kg).toBeLessThan(86);
  });
  it('is op de dag van de laatste weging gelijk aan de trend zodra die er is', () => {
    const entries = [w('2026-11-02', 84), w('2026-11-05', 85), w('2026-11-09', 86)];
    expect(Math.round(weightLineAt(entries, TODAY, undefined)!.kg * 10) / 10).toBe(weightTrend(entries)?.kg);
  });
  it('rekent een trendgewicht niet mee naast echte wegingen', () => {
    const entries = [mf('2026-11-04', 80), w('2026-11-05', 85), w('2026-11-06', 85)];
    expect(weightLineAt(entries, '2026-11-06', undefined)).toEqual({ kg: 85, own: true });
  });
  it('zet het trendgewicht zelf op de lijn als er geen echte weging in de twee weken is', () => {
    expect(weightLineAt([mf('2026-11-04', 84.2)], '2026-11-05', undefined)).toEqual({ kg: 84.2, own: false });
    expect(weightLineAt([mf('2026-10-01', 84.2)], '2026-11-05', undefined)).toBeUndefined();
  });
  it('is met Gewichtstrend uit de laatste weging van de twee weken', () => {
    expect(weightLineAt([w('2026-11-02', 84), w('2026-11-05', 85), w('2026-11-09', 86)], '2026-11-08', false)).toEqual({ kg: 85, own: true });
  });
  it('houdt een uitschieter buiten de lijn', () => {
    const entries = [w('2026-11-05', 85), w('2026-11-06', 85), w('2026-11-07', 85), w('2026-11-08', 95)];
    expect(weightLineAt(entries, '2026-11-08', undefined)?.kg).toBe(85);
  });
});

describe('de lijn op de kaart', () => {
  it('maakt geen V van een trend uit MacroFactor gevolgd door losse wegingen', () => {
    // Tot 30 oktober het trendgewicht van MacroFactor met de weging erbij, daarna losse wegingen.
    const entries: WeightEntry[] = [];
    for (let i = 0; i < 30; i++) {
      const date = addDays('2026-10-01', i);
      entries.push(mf(date, 84, i % 2 === 0 ? 84.8 : 83.2));
    }
    for (let i = 0; i < 10; i++) entries.push(w(addDays('2026-10-31', i), i % 2 === 0 ? 84.9 : 83.1));
    const values = weightCardData(entries, undefined, TODAY)!.points.map((p) => p.value);
    expect(values.length).toBeGreaterThanOrEqual(5);
    // Elk weekpunt blijft dicht bij 84: geen sprong tussen de bron en de eigen wegingen.
    for (const v of values) expect(Math.abs(v - 84)).toBeLessThan(0.5);
  });
});

describe('weightOverview', () => {
  const entries = [w('2026-08-01', 88), w('2026-10-12', 86), w('2026-10-19', 85.6), w('2026-10-26', 85.2), w('2026-11-02', 84.8), w('2026-11-09', 84.4)];

  it('kent de drie periodes', () => {
    expect(['4w', '3m', '1y'].every(isWeightRange)).toBe(true);
    expect(isWeightRange('2w')).toBe(false);
  });
  it('toont alleen de wegingen van de periode, met de plek op de tijdas', () => {
    const o = weightOverview(entries, '4w', undefined, TODAY);
    expect(o.from).toBe('2026-10-13');
    expect(o.dots.map((d) => d.date)).toEqual(['2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09']);
    expect(o.dots[o.dots.length - 1].x).toBe(1);
    expect(o.dots[0].x).toBeCloseTo(0.25);
    expect(o.rows.map((r) => r.date)).toEqual(['2026-11-09', '2026-11-02', '2026-10-26', '2026-10-19']);
    expect(weightOverview(entries, '1y', undefined, TODAY).dots).toHaveLength(6);
  });
  it('laat de lijn ook de twee weken voor de periode lezen', () => {
    const o = weightOverview(entries, '4w', undefined, TODAY);
    // Het eerste punt (19 okt) is het gemiddelde van 12 en 19 okt, niet de losse weging.
    expect(o.line[0].kg).toBeGreaterThan(85.6);
  });
  it('geeft de verandering over de periode en per week', () => {
    const o = weightOverview(entries, '4w', undefined, TODAY);
    expect(o.change?.days).toBe(21);
    expect(o.change?.kg).toBeLessThan(0);
    const lines = weightChangeLines(o)!;
    expect(lines.perWeek).toMatch(/^−0,\d kg per week$/);
    expect(lines.total).toMatch(/^−1,\d kg in 3 weken$/);
  });
  it('noemt de gekozen periode als de lijn die vult', () => {
    const daily = Array.from({ length: 40 }, (_, i) => w(addDays(TODAY, -i), 85 - i * 0.05));
    expect(weightChangeLines(weightOverview(daily, '4w', undefined, TODAY))?.total).toMatch(/ in 4 weken$/);
  });
  it('geeft geen verandering met één punt of minder dan een week', () => {
    expect(weightOverview([w('2026-11-09', 84)], '4w', undefined, TODAY).change).toBeUndefined();
    expect(weightOverview([w('2026-11-06', 84), w('2026-11-09', 85)], '4w', undefined, TODAY).change).toBeUndefined();
    expect(weightChangeLines(weightOverview([], '4w', undefined, TODAY))).toBeUndefined();
  });
  it('zonder per week onder de twee weken', () => {
    const o = weightOverview([w('2026-10-31', 84), w('2026-11-09', 85)], '4w', undefined, TODAY);
    expect(weightChangeLines(o)).toEqual({ total: '+0,7 kg in 9 dagen' });
  });
  it('zet een trendgewicht zonder weging in de lijst, niet als stip', () => {
    const o = weightOverview([mf('2026-11-03', 84.2), mf('2026-11-04', 84.1, 84.9), w('2026-11-05', 84.6, 'manual')], '4w', undefined, TODAY);
    expect(o.dots.map((d) => d.date)).toEqual(['2026-11-04', '2026-11-05']);
    expect(o.rows.map((r) => [r.kg, weighingRowSource(r)])).toEqual([
      [84.6, 'Zelf ingevuld'],
      [84.9, 'MacroFactor'],
      [84.2, 'MacroFactor, trendgewicht'],
    ]);
  });
  it('kiest een as op ronde kilo\'s om alle punten', () => {
    const o = weightOverview(entries, '4w', undefined, TODAY);
    const all = [...o.dots, ...o.line].map((p) => p.kg);
    expect(o.minKg).toBeLessThanOrEqual(Math.min(...all));
    expect(o.maxKg).toBeGreaterThanOrEqual(Math.max(...all));
    expect(o.ticks.length).toBeGreaterThanOrEqual(2);
    expect(o.ticks.length).toBeLessThanOrEqual(5);
    const flat = weightOverview([w('2026-11-09', 84)], '4w', undefined, TODAY);
    expect(flat.maxKg).toBeGreaterThan(flat.minKg);
  });
  it('is leeg zonder wegingen', () => {
    const o = weightOverview(undefined, '3m', undefined, TODAY);
    expect(o).toMatchObject({ dots: [], line: [], rows: [], ticks: [] });
    expect(weightChartSummary(o)).toBe('Je gewicht, de laatste 3 maanden: nog geen wegingen.');
  });
  it('vat de grafiek samen in een zin', () => {
    expect(weightChartSummary(weightOverview(entries, '4w', undefined, TODAY))).toMatch(/^Je gewicht, de laatste 4 weken: 4 wegingen, −1,\d kg in 3 weken\.$/);
  });
});

describe('signedKg', () => {
  it('schrijft een minteken, een plus of niets', () => {
    expect(signedKg(-0.44)).toBe('−0,4 kg');
    expect(signedKg(0.31)).toBe('+0,3 kg');
    expect(signedKg(0.04)).toBe('0 kg');
  });
});
