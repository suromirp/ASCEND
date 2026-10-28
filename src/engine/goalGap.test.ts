import { describe, it, expect } from 'vitest';
import { weeksOfWork, fillFromWeeks, weightedGapWeakest } from './goalGap';
import { GOAL_GROWTH } from '../data/goalGrowth';

const g = GOAL_GROWTH.run.weekly;
const time = (now: number, need: number) => weeksOfWork({ now, need, lowerIsBetter: true, weeklyGain: g });

describe('weeksOfWork en fillFromWeeks', () => {
  it('55:40 tegen 45:00: ongeveer 39 weken, vulling 21%', () => {
    const w = time(55 + 40 / 60, 45);
    expect(w).toBeCloseTo(38.6, 1);
    expect(fillFromWeeks(w)).toBeCloseTo(0.21, 2);
  });

  it('een doel 2% sneller: 3,7 weken, 73%', () => {
    const w = time(50, 49);
    expect(w).toBeCloseTo(3.7, 1);
    expect(fillFromWeeks(w)).toBeCloseTo(0.73, 2);
  });

  it('een doel 5% sneller: 9,3 weken, 52%', () => {
    const w = time(50, 47.5);
    expect(w).toBeCloseTo(9.3, 1);
    expect(fillFromWeeks(w)).toBeCloseTo(0.52, 2);
  });

  it('verwacht 64:17 tegen 45:00: 64,7 weken, 13%', () => {
    const w = time(64 + 17 / 60, 45);
    expect(w).toBeCloseTo(64.7, 0);
    expect(fillFromWeeks(w)).toBeCloseTo(0.13, 2);
  });

  it('een doel gelijk aan of trager dan verwacht is 0 weken en vol', () => {
    for (const need of [50, 55]) {
      expect(time(50, need)).toBe(0);
      expect(fillFromWeeks(time(50, need))).toBe(1);
    }
  });

  it('kracht: e1RM 105 naar 117, beginner en gevorderd', () => {
    const up = (weeklyGain: number) => weeksOfWork({ now: 105, need: 117, lowerIsBetter: false, weeklyGain });
    expect(up(0.01)).toBeCloseTo(10.9, 1);
    expect(fillFromWeeks(up(0.01))).toBeCloseTo(0.48, 2);
    expect(up(0.0025)).toBeCloseTo(43.3, 0);
    expect(fillFromWeeks(up(0.0025))).toBeCloseTo(0.19, 1);
    expect(weeksOfWork({ now: 120, need: 117, lowerIsBetter: false, weeklyGain: 0.01 })).toBe(0);
  });

  it('is 50% bij tien weken en geeft nooit 0', () => {
    expect(fillFromWeeks(10)).toBe(0.5);
    expect(fillFromWeeks(1000)).toBeGreaterThan(0);
  });

  it('rekent ongeldige invoer niet door', () => {
    expect(weeksOfWork({ now: 0, need: 45, lowerIsBetter: true, weeklyGain: g })).toBe(0);
    expect(weeksOfWork({ now: 50, need: 45, lowerIsBetter: true, weeklyGain: 0 })).toBe(0);
  });
});

describe('weightedGapWeakest', () => {
  it('geeft bij gelijke gewichten altijd de laagste meter', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 200; i++) {
      const meters = Array.from({ length: 2 + Math.floor(rnd() * 4) }, (_, k) => ({ key: `m${k}`, share: Math.min(0.99, rnd()) }));
      const lowest = meters.reduce((a, b) => (b.share < a.share ? b : a));
      expect(weightedGapWeakest(meters)?.key).toBe(lowest.key);
    }
  });

  it('kiest het grootste gewogen gat, niet de laagste breuk', () => {
    const w: Record<string, number> = { snelheid: 0.6, langste: 0.2, volume: 0.2 };
    const meters = [{ key: 'snelheid', share: 0.21 }, { key: 'langste', share: 0.86 }, { key: 'volume', share: 0.56 }];
    expect(weightedGapWeakest(meters, (m) => w[m.key])?.key).toBe('snelheid');
    const other = [{ key: 'snelheid', share: 0.8 }, { key: 'volume', share: 0.56 }];
    expect(weightedGapWeakest(other, (m) => w[m.key])?.key).toBe('snelheid');
  });

  it('slaat volle meters en meters zonder gewicht over', () => {
    expect(weightedGapWeakest([{ key: 'a', share: 1 }, { key: 'b', share: 0.1 }], (m) => (m.key === 'b' ? 0 : 1))).toBeUndefined();
    expect(weightedGapWeakest([{ key: 'a', share: 1 }])).toBeUndefined();
  });
});
