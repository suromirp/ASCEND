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

  // Een nacht die je "Niet goed gemeten" noemde (docs/beslissingen/2026-11-20-niet-goed-gemeten-rest.md).
  describe('een nacht die niet goed gemeten is', () => {
    it('de dag zelf: de HRV van vandaag telt niet, dus er zijn geen twee signalen', () => {
      expect(illnessSign({ today, metrics: weeks([bad, bad]), ignoredNights: new Set([today]) })).toBeUndefined();
    });

    it('een eerdere ochtend van de reeks: de reeks houdt daar op', () => {
      expect(illnessSign({ today, metrics: weeks([bad, bad]), ignoredNights: new Set(['2026-10-30']) })).toBeUndefined();
      const three = illnessSign({ today, metrics: weeks([bad, bad, bad, bad]), ignoredNights: new Set(['2026-10-28']) });
      expect(three?.mornings).toBe(3);
      expect(three?.from).toBe('2026-10-29');
    });

    it('zijn HRV blijft uit je gemiddelde, zijn rusthartslag niet', () => {
      // Tien nachten met een heel lage HRV en een hoge rusthartslag.
      const odd = Array.from({ length: 10 }, (_, n) => addDays(today, -(5 + n)));
      const metrics = weeks([{ rhr: 62, hrv: 48 }, { rhr: 62, hrv: 48 }]).map((m) => (odd.includes(m.date) ? { ...m, hrv: 20, restingHeartRate: 60 } : m));
      // Met die nachten in het gemiddelde ligt de HRV van vandaag binnen je bereik: geen vraag.
      expect(illnessSign({ today, metrics })).toBeUndefined();
      // Als uitgelegde ochtenden vallen ze uit beide gemiddelden.
      const explained = illnessSign({ today, metrics, explained: new Set(odd) });
      expect(explained?.rhrRise).toBe(11);
      // Niet goed gemeten: uit de HRV, maar de rusthartslag telt nog mee, dus een kleinere stijging.
      const sign = illnessSign({ today, metrics, ignoredNights: new Set(odd) });
      expect(sign?.mornings).toBe(2);
      expect(sign?.rhrRise).toBeLessThan(11);
    });

    it('een lege lijst verandert niets', () => {
      expect(illnessSign({ today, metrics: weeks([bad, bad]), ignoredNights: new Set() })).toEqual(illnessSign({ today, metrics: weeks([bad, bad]) }));
    });
  });
});
