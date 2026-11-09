import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import { EXTRA_FRACTION, shareSource } from '../data/bodyweightShares';
import type { WeightEntry } from '../models/metrics';
import { bodyLoadView, carriesBodyweight } from './bodyLoad';
import { loadBodyKg, loadWeight } from './weightTrend';

// Nagemaakte wegingen.
const hc = (date: string, kg: number): WeightEntry => ({ date, kg, source: 'health-connect', basis: 'scale' });
const week = [hc('2026-11-01', 84), hc('2026-11-03', 84.4), hc('2026-11-05', 84.6), hc('2026-11-06', 85.4)];

describe('gewicht bij eigen gewicht', () => {
  it('rekent met de trend, en met de laatste weging als je dat kiest', () => {
    const trend = loadBodyKg({ weightEntries: week });
    expect(trend).toBeGreaterThan(84.4);
    expect(trend).toBeLessThan(85.4);
    expect(loadBodyKg({ weightEntries: week, weightForLoad: 'trend' })).toBe(trend);
    expect(loadBodyKg({ weightEntries: week, weightForLoad: 'latest' })).toBe(85.4);
  });

  it('valt met te weinig wegingen terug op de laatste weging', () => {
    const two = [hc('2026-11-05', 84.6), hc('2026-11-06', 85.4)];
    expect(loadWeight({ weightEntries: two })).toMatchObject({ kg: 85.4, isTrend: false });
    expect(loadBodyKg({ weightEntries: [] })).toBeUndefined();
  });

  it('met één weging is de trend die weging (de golden scenario\'s bewegen niet)', () => {
    expect(loadBodyKg({ weightEntries: [hc('2026-11-06', 80)] })).toBe(80);
  });
});

describe('bodyLoadView', () => {
  it('toont gewicht en aandeel in het bolletje', () => {
    const v = bodyLoadView(exerciseById('hanging-leg-raise'), loadWeight({ weightEntries: week, weightForLoad: 'latest' }), 'latest');
    expect(v?.chip).toBe('85,4 kg · 50%');
    expect(v?.shareLine).toBe('50%, 42,7 kg');
    expect(v?.source).toContain('Schatting');
  });

  it('zegt het als de trend telt en als er geen gewicht is', () => {
    const t = bodyLoadView(exerciseById('push-up'), loadWeight({ weightEntries: week }), 'trend');
    expect(t?.weightLabel).toContain('Je trend');
    const none = bodyLoadView(exerciseById('push-up'), undefined, 'trend');
    expect(none?.chip).toBe('Gewicht invullen · 65%');
  });

  it('geeft niets bij een oefening zonder eigen gewicht of zonder aandeel', () => {
    expect(bodyLoadView(exerciseById('bulgarian-split-squat'), loadWeight({ weightEntries: week }), 'trend')).toBeUndefined();
    expect(bodyLoadView(exerciseById('barbell-row'), loadWeight({ weightEntries: week }), 'trend')).toBeUndefined();
    expect(bodyLoadView(exerciseById('plank'), loadWeight({ weightEntries: week }), 'trend')).toBeUndefined();
  });

  it('elke oefening met eigen gewicht en een aandeel heeft een bron, en de aanvullingen staan in de lijst', () => {
    for (const [id, f] of EXTRA_FRACTION) {
      const e = exerciseById(id);
      expect(e?.bodyweightFraction, id).toBe(f);
      expect(carriesBodyweight(e), id).toBe(true);
      expect(shareSource(id).length).toBeGreaterThan(10);
    }
  });
});
