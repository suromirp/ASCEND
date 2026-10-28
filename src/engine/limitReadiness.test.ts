import { describe, it, expect } from 'vitest';
import { computeLimitReadiness, readLimit, stretchTime, hoursMinutes, NEED_HIKES_LINE, NEED_LONG_RUN_LINE } from './limitReadiness';
import { computeGoalReadiness, readinessInputOf } from './goalReadiness';
import { estimatedHikingMinutes } from './goalRoute';
import type { GoalDetails, TrainingGoal } from '../models/goals';
import type { SessionLog } from '../models/training';

// Nagemaakte gegevens.
const TODAY = '2026-10-28';
const naming = { the: 'je dag', your: 'je dag' };
const goal = (kind: 'day_hike' | 'trail', details: GoalDetails): TrainingGoal => ({
  id: 'g', name: 'Doel', status: 'active', targetDate: '2027-06-01', createdAt: '2026-01-01T10:00:00Z', updatedAt: '2026-01-01T10:00:00Z',
  kind, details, requirements: [],
} as TrainingGoal);

let n = 0;
const base = (date: string, minutes: number): SessionLog => ({
  id: `l${n++}`, templateId: 't', type: 'hiking', completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: minutes, source: 'manual',
});
const hike = (date: string, minutes: number, km: number, upDown: number): SessionLog => ({
  ...base(date, minutes), outdoorData: { durationMinutes: minutes, distanceKm: km, elevationGainM: upDown, elevationLossM: upDown, source: 'manual' },
} as SessionLog);
const run = (date: string, minutes: number, km: number, gain: number): SessionLog => ({
  ...base(date, minutes), type: 'cardio', sport: 'running', templateId: 'tpl_easy_run',
  cardioData: { modality: 'run', durationMinutes: minutes, distanceKm: km, elevationGainM: gain, source: 'manual' },
} as SessionLog);

// Drie wandelingen op 1,15 keer de DIN-tijd.
const DIN_SMALL = estimatedHikingMinutes(10, 500, 500);
const MINUTES = Math.round(DIN_SMALL * 1.15);
const hikes = [hike('2026-10-20', MINUTES, 10, 500), hike('2026-10-13', MINUTES, 10, 500), hike('2026-10-06', MINUTES, 10, 500)];
// Een dag van 6 uur DIN: 16 km, 1200 m omhoog.
const day = (limit?: number) => goal('day_hike', { distanceKm: 16, gainM: 1200, timeLimitMinutes: limit });

describe('tijdslimiet bij een dagtocht', () => {
  it('rekent de DIN-tijd keer jouw factor: verwacht ongeveer 6:54, limiet 7:00, grens 6:18, tempo 36%', () => {
    expect(estimatedHikingMinutes(16, 1200, 0)).toBe(360);
    const r = computeLimitReadiness(day(420), hikes, TODAY, { naming })!;
    const m = r.meters.find((x) => x.key === 'tempo')!;
    expect(Math.round(m.share * 100)).toBe(36);
    expect(m.text).toBe('6:54 uur verwacht, tijdslimiet 7:00 uur');
    expect(r.derivedNote).toContain('grens op 6:18 uur');
    expect(r.derivedNote).toContain('ongeveer 6:54 uur; de tijdslimiet is 7:00 uur');
    expect(r.derivedNote).toContain('minder zeker dan een testloop');
  });

  it('is vol als je verwachte tijd binnen de grens blijft', () => {
    const r = computeLimitReadiness(day(600), hikes, TODAY, { naming })!;
    expect(r.meters.find((x) => x.key === 'tempo')!.share).toBe(1);
  });

  it('weegt zo zwaar als de andere meters', () => {
    const r = computeLimitReadiness(day(420), hikes, TODAY, { naming })!;
    const mean = r.meters.reduce((s, m) => s + m.share, 0) / r.meters.length;
    expect(r.percent).toBe(Math.min(99, Math.round(mean * 100)));
  });

  it('minder dan drie wandelingen: geen meter, wel de regel', () => {
    const r = computeLimitReadiness(day(420), hikes.slice(0, 2), TODAY, { naming })!;
    expect(r.meters.some((m) => m.key === 'tempo')).toBe(false);
    expect(r.missing.some((m) => m.key === 'tempo')).toBe(true);
    expect(r.derivedNote).toContain(NEED_HIKES_LINE);
  });

  it('kortere wandelingen dan anderhalf uur tellen niet mee voor de factor', () => {
    const short = [hike('2026-10-20', 80, 4, 200), hike('2026-10-13', 80, 4, 200), hike('2026-10-06', 80, 4, 200)];
    expect(readLimit(day(420), short, TODAY)).toEqual({ need: NEED_HIKES_LINE });
  });

  it('zonder tijdslimiet blijft alles zoals het was, ook het getal', () => {
    const g = day(undefined);
    const plain = computeGoalReadiness(readinessInputOf(g)!, hikes, TODAY, { naming });
    const r = computeLimitReadiness(g, hikes, TODAY, { naming })!;
    expect(r.percent).toBe(plain.percent);
    expect(r.meters.map((m) => m.key)).toEqual(plain.meters.map((m) => m.key));
    expect(r.meters.some((m) => m.key === 'tempo')).toBe(false);
  });
});

describe('cutoff bij een ultra', () => {
  // 50 km met 2.500 m omhoog is 75 inspanningskilometers. Je langste loop: 25 km met 1.000 m in 4:30.
  const ultra = (cutoff?: number) => goal('trail', { variant: 'ultra', distanceKm: 50, gainM: 2500, expectedMinutes: 660, cutoffMinutes: cutoff });
  const logs = [run('2026-10-15', 270, 25, 1000)];

  it('rekent in inspanningskilometers: ongeveer 10:49, cutoff 11:00, grens 9:54, tempo 39%', () => {
    const res = readLimit(ultra(660), logs, TODAY);
    expect(res && 'read' in res && hoursMinutes(res.read.expected)).toBe('10:49');
    expect(res && 'read' in res && hoursMinutes(res.read.edge)).toBe('9:54');
    const r = computeLimitReadiness(ultra(660), logs, TODAY, { naming })!;
    expect(Math.round(r.meters.find((m) => m.key === 'tempo')!.share * 100)).toBe(39);
    expect(r.derivedNote).toContain('Een schatting uit je eigen dagen');
  });

  it('zegt je lange lopen als de referentie een loop is, en je lange wandelingen als het een wandeling is', () => {
    const fromRun = computeLimitReadiness(ultra(660), logs, TODAY, { naming })!;
    expect(fromRun.derivedNote).toContain('Je lange lopen passen bij ongeveer 10:49 uur');
    const fromHike = computeLimitReadiness(ultra(660), [hike('2026-10-15', 360, 25, 1000)], TODAY, { naming })!;
    expect(fromHike.derivedNote).toContain('Je lange wandelingen passen bij');
    expect(fromHike.derivedNote).not.toContain('lange lopen');
  });

  it('de marge is een instelling: 5% en geen marge leggen de grens hoger', () => {
    const edge = (margin?: 'ten' | 'five' | 'none') => {
      const res = readLimit(ultra(660), logs, TODAY, { margin });
      return res && 'read' in res ? res.read : undefined;
    };
    expect(hoursMinutes(edge()!.edge)).toBe('9:54');
    expect(hoursMinutes(edge('ten')!.edge)).toBe('9:54');
    expect(hoursMinutes(edge('five')!.edge)).toBe('10:27');
    expect(hoursMinutes(edge('none')!.edge)).toBe('11:00');
    expect(edge('none')!.share).toBeGreaterThan(edge('five')!.share);
    expect(edge('five')!.share).toBeGreaterThan(edge('ten')!.share);
    const none = computeLimitReadiness(ultra(660), logs, TODAY, { naming, margin: 'none' })!;
    expect(none.derivedNote).toContain('zonder marge is de limiet zelf de grens');
    expect(none.derivedNote).not.toContain('10% marge');
  });

  it('voorzichtige groei vraagt meer weken en geeft een lagere meter', () => {
    const pick = (growth?: 'average' | 'careful') => {
      const res = readLimit(ultra(660), logs, TODAY, { growth });
      return res && 'read' in res ? res.read : undefined;
    };
    expect(pick('careful')!.weeks).toBeGreaterThan(pick('average')!.weeks);
    expect(pick('careful')!.share).toBeLessThan(pick('average')!.share);
  });

  it('een korte trail heeft geen cutoff, ook niet als er nog een in de gegevens staat', () => {
    const short = goal('trail', { variant: 'kort', distanceKm: 20, gainM: 800, expectedMinutes: 200, cutoffMinutes: 300 });
    expect(readLimit(short, logs, TODAY)).toBeUndefined();
    const none = goal('trail', { distanceKm: 20, gainM: 800, cutoffMinutes: 300 });
    expect(readLimit(none, logs, TODAY)).toBeUndefined();
  });

  it('zonder marge zou de meter vol zijn: de marge is een echte keuze', () => {
    const res = readLimit(ultra(660), logs, TODAY);
    expect(res && 'read' in res && res.read.expected < res.read.limit).toBe(true);
    expect(res && 'read' in res && res.read.share).toBeLessThan(1);
  });

  it('een ruime cutoff geeft 100%', () => {
    const r = computeLimitReadiness(ultra(900), logs, TODAY, { naming })!;
    expect(r.meters.find((m) => m.key === 'tempo')!.share).toBe(1);
  });

  it('zonder lange loop van anderhalf uur: de regel in plaats van een meter', () => {
    expect(readLimit(ultra(660), [run('2026-10-15', 60, 10, 200)], TODAY)).toEqual({ need: NEED_LONG_RUN_LINE });
  });

  it('een loop ouder dan acht weken telt niet', () => {
    expect(readLimit(ultra(660), [run('2026-07-01', 270, 25, 1000)], TODAY)).toEqual({ need: NEED_LONG_RUN_LINE });
  });

  it('zonder cutoff verandert er niets aan wat computeGoalReadiness gaf', () => {
    const g = ultra(undefined);
    const plain = computeGoalReadiness(readinessInputOf(g)!, logs, TODAY, { naming });
    expect(computeLimitReadiness(g, logs, TODAY, { naming })!.percent).toBe(plain.percent);
    expect(readLimit(g, logs, TODAY)).toBeUndefined();
  });

  it('de Riegel-exponent loopt op boven drie uur', () => {
    expect(stretchTime(60, 2)).toBeCloseTo(60 * Math.pow(2, 1.06), 6);
    expect(stretchTime(240, 2)).toBeCloseTo(240 * Math.pow(2, 1.15), 6);
    // Doorlopend over de drie uur heen.
    const join = Math.pow(1.5, 1 / 1.06);
    expect(stretchTime(120, join + 1e-6) - stretchTime(120, join - 1e-6)).toBeLessThan(0.01);
    expect(stretchTime(120, join)).toBeCloseTo(180, 6);
  });

  it('geen gedachtestreepjes in wat de gebruiker leest', () => {
    const r = computeLimitReadiness(ultra(660), logs, TODAY, { naming })!;
    expect(JSON.stringify(r)).not.toMatch(/[–—]/);
  });
});
