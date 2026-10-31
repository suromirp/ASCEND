import { describe, expect, it } from 'vitest';
import { illnessSign } from './illnessSigns';
import type { RecoveryMetric } from '../models/metrics';
import { addDays } from '../utils/dates';

// Nagemaakte ochtenden: vier weken rond 50 slagen en HRV rond 60, daarna de laatste ochtenden.
const today = '2026-10-31';
function weeks(last: { rhr: number; hrv: number }[]): RecoveryMetric[] {
  const out: RecoveryMetric[] = [];
  for (let i = 30; i >= last.length; i--) {
    const date = addDays(today, -i);
    out.push({ id: `intervals.icu:${date}`, date, source: 'import', restingHeartRate: 50 + (i % 3) - 1, hrv: 60 + (i % 5) - 2 });
  }
  last.forEach((v, idx) => {
    const date = addDays(today, -(last.length - 1 - idx));
    out.push({ id: `intervals.icu:${date}`, date, source: 'import', restingHeartRate: v.rhr, hrv: v.hrv });
  });
  return out;
}
const bad = { rhr: 57, hrv: 48 };
const fine = { rhr: 50, hrv: 60 };

describe('vroeg ziek zien', () => {
  it('vraagt na twee afwijkende ochtenden op rij of je je goed voelt', () => {
    const sign = illnessSign({ today, metrics: weeks([bad, bad]) });
    expect(sign?.mornings).toBe(2);
    expect(sign?.from).toBe('2026-10-30');
    expect(sign?.text).toBe('Je rusthartslag ligt twee ochtenden achter elkaar 7 slagen boven je gewone, en je HRV eronder. Voel je je goed?');
  });

  it('één ochtend is niet genoeg', () => {
    expect(illnessSign({ today, metrics: weeks([fine, bad]) })).toBeUndefined();
  });

  it('alleen een hoge rusthartslag, of alleen een lage HRV, is niet genoeg', () => {
    expect(illnessSign({ today, metrics: weeks([{ rhr: 57, hrv: 60 }, { rhr: 57, hrv: 60 }]) })).toBeUndefined();
    expect(illnessSign({ today, metrics: weeks([{ rhr: 50, hrv: 45 }, { rhr: 50, hrv: 45 }]) })).toBeUndefined();
  });

  it('telt de hele reeks terug', () => {
    expect(illnessSign({ today, metrics: weeks([fine, bad, bad, bad]) })?.mornings).toBe(3);
  });

  it('zwijgt als je zelf iets vastlegde voor een van die ochtenden, of al ziek gemeld bent', () => {
    expect(illnessSign({ today, metrics: weeks([bad, bad]), explained: new Set(['2026-10-30']) })).toBeUndefined();
    expect(illnessSign({ today, metrics: weeks([bad, bad]), ill: true })).toBeUndefined();
  });

  it('zwijgt zonder een week eigen ochtenden om mee te vergelijken', () => {
    const few: RecoveryMetric[] = [0, 1, 2].map((n) => ({ id: `x${n}`, date: addDays(today, -n), source: 'import', restingHeartRate: 60, hrv: 40 }));
    expect(illnessSign({ today, metrics: few })).toBeUndefined();
  });
});
