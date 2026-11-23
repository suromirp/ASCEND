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

  it('één ochtend zonder bekende nacht is niet genoeg', () => {
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
    const high = { rhr: 57, hrv: 60 };

    it('afwijkend, niet goed gemeten met een hoge rusthartslag, afwijkend: de vraag, met twee ochtenden', () => {
      const sign = illnessSign({ today, metrics: weeks([bad, bad, bad]), ignoredNights: new Set(['2026-10-30']) });
      expect(sign?.mornings).toBe(2);
      expect(sign?.from).toBe('2026-10-29');
      expect(sign?.text).toBe('Je rusthartslag ligt al drie dagen boven je gewone, vandaag 7 slagen, en je HRV lag op twee ochtenden eronder. Voel je je goed?');
      // De HRV van de overgeslagen nacht doet er niet toe.
      expect(illnessSign({ today, metrics: weeks([bad, high, bad]), ignoredNights: new Set(['2026-10-30']) })?.mornings).toBe(2);
    });

    it('dezelfde rij met een gewone rusthartslag in het midden: niets', () => {
      expect(illnessSign({ today, metrics: weeks([bad, { rhr: 50, hrv: 48 }, bad]), ignoredNights: new Set(['2026-10-30']) })).toBeUndefined();
    });

    it('één afwijkende ochtend plus een niet goed gemeten ochtend: niets', () => {
      expect(illnessSign({ today, metrics: weeks([fine, bad, bad]), ignoredNights: new Set(['2026-10-30']) })).toBeUndefined();
      expect(illnessSign({ today, metrics: weeks([fine, bad, bad]), ignoredNights: new Set([today]) })).toBeUndefined();
    });

    it('vandaag niet goed gemeten met een hoge rusthartslag na twee afwijkende ochtenden: de vraag blijft, met dezelfde from', () => {
      const before = illnessSign({ today: '2026-10-30', metrics: weeks([bad, bad, bad]).filter((m) => m.date < today) });
      const sign = illnessSign({ today, metrics: weeks([bad, bad, bad]), ignoredNights: new Set([today]) });
      expect(before?.from).toBe('2026-10-29');
      expect(sign?.from).toBe('2026-10-29');
      expect(sign?.mornings).toBe(2);
      expect(sign?.rhrRise).toBe(7);
    });

    it('vandaag niet goed gemeten met een gewone rusthartslag: niets', () => {
      expect(illnessSign({ today, metrics: weeks([bad, bad, { rhr: 50, hrv: 48 }]), ignoredNights: new Set([today]) })).toBeUndefined();
    });

    it('een uitgelegde ochtend breekt de reeks, ook als hij niet goed gemeten is', () => {
      expect(illnessSign({ today, metrics: weeks([bad, bad, bad]), explained: new Set(['2026-10-30']), ignoredNights: new Set(['2026-10-30']) })).toBeUndefined();
    });

    it('twee niet goed gemeten ochtenden achter elkaar met een hoge rusthartslag: overgeslagen, de zin telt dagen', () => {
      const sign = illnessSign({ today, metrics: weeks([bad, high, high, bad]), ignoredNights: new Set(['2026-10-29', '2026-10-30']) });
      expect(sign?.mornings).toBe(2);
      expect(sign?.from).toBe('2026-10-28');
      expect(sign?.text).toBe('Je rusthartslag ligt al vier dagen boven je gewone, vandaag 6 slagen, en je HRV lag op twee ochtenden eronder. Voel je je goed?');
    });

    it('twee gaten achter elkaar, waarvan één met een gewone rusthartslag: niets', () => {
      const mid = { rhr: 50, hrv: 48 };
      expect(illnessSign({ today, metrics: weeks([bad, bad, high, mid, bad]), ignoredNights: new Set(['2026-10-29', '2026-10-30']) })).toBeUndefined();
    });

    it('een gat zonder rusthartslag breekt de reeks, met of zonder meting van die dag', () => {
      const ignoredNights = new Set(['2026-10-30']);
      const noRhr = weeks([bad, bad, bad]).map((m) => (m.date === '2026-10-30' ? { ...m, restingHeartRate: undefined } : m));
      const noDay = weeks([bad, bad, bad]).filter((m) => m.date !== '2026-10-30');
      expect(illnessSign({ today, metrics: noRhr, ignoredNights })).toBeUndefined();
      expect(illnessSign({ today, metrics: noDay, ignoredNights })).toBeUndefined();
    });

    it('zonder gat blijft de zin zoals hij was', () => {
      const sign = illnessSign({ today, metrics: weeks([bad, bad, bad, bad]), ignoredNights: new Set(['2026-10-28']) });
      expect(sign?.mornings).toBe(3);
      expect(sign?.from).toBe('2026-10-29');
      expect(sign?.text).toContain('drie ochtenden achter elkaar');
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

  // Scherper (I-78, docs/beslissingen/2026-11-23-hoogte-en-ziek-signalen.md).
  describe('een ochtend zonder nacht', () => {
    // Het horloge zag geen nacht: geen slaap, geen HRV, alleen een rusthartslag van overdag.
    const noNight = (metrics: RecoveryMetric[], dates: string[], rhr = 56) =>
      metrics.map((m) => (dates.includes(m.date) ? { ...m, restingHeartRate: rhr, hrv: undefined, sleepMinutes: undefined } : m));

    it('wordt overgeslagen: hij breekt de reeks niet en telt niet mee', () => {
      const sign = illnessSign({ today, metrics: noNight(weeks([bad, bad, bad]), ['2026-10-30']) });
      expect(sign?.mornings).toBe(2);
      expect(sign?.from).toBe('2026-10-29');
      expect(sign?.text).toBe('Je rusthartslag ligt twee ochtenden achter elkaar 7 slagen boven je gewone, en je HRV eronder. Voel je je goed?');
    });

    it('ook met een gewone rusthartslag van overdag', () => {
      expect(illnessSign({ today, metrics: noNight(weeks([bad, bad, bad]), ['2026-10-30'], 50) })?.mornings).toBe(2);
    });

    it('vandaag zonder nacht: geen vraag, want vandaag is niet gemeten', () => {
      expect(illnessSign({ today, metrics: noNight(weeks([bad, bad, bad]), [today]) })).toBeUndefined();
    });

    it('zijn rusthartslag blijft uit je gemiddelde', () => {
      // Tien dagen zonder nacht met een rusthartslag van overdag die hoger ligt.
      const days = Array.from({ length: 10 }, (_, n) => addDays(today, -(5 + n)));
      const metrics = noNight(weeks([{ rhr: 56, hrv: 48 }, { rhr: 56, hrv: 48 }]), days, 60);
      expect(illnessSign({ today, metrics })?.rhrRise).toBe(6);
    });
  });

  describe('één duidelijke ochtend', () => {
    const night = (metrics: RecoveryMetric[], minutes: number) => metrics.map((m) => (m.date === today ? { ...m, sleepMinutes: minutes } : m));

    it('na een gewone nacht: de vraag, met één ochtend', () => {
      const sign = illnessSign({ today, metrics: night(weeks([fine, bad]), 420) });
      expect(sign?.mornings).toBe(1);
      expect(sign?.from).toBe(today);
      expect(sign?.text).toBe('Je rusthartslag ligt vanochtend 7 slagen boven je gewone en je HRV eronder, na een gewone nacht. Voel je je goed?');
    });

    it('na een korte nacht niet: die verklaart het al', () => {
      expect(illnessSign({ today, metrics: night(weeks([fine, bad]), 300) })).toBeUndefined();
    });

    it('niet als je hem uitzet', () => {
      expect(illnessSign({ today, metrics: night(weeks([fine, bad]), 420), oneMorning: false })).toBeUndefined();
    });

    it('niet bij een nacht die niet goed gemeten is, een uitgelegde ochtend of als je al ziek bent', () => {
      const metrics = night(weeks([fine, bad]), 420);
      expect(illnessSign({ today, metrics, ignoredNights: new Set([today]) })).toBeUndefined();
      expect(illnessSign({ today, metrics, explained: new Set([today]) })).toBeUndefined();
      expect(illnessSign({ today, metrics, ill: true })).toBeUndefined();
    });

    it('alleen een hoge rusthartslag, of alleen een lage HRV, blijft niet genoeg', () => {
      expect(illnessSign({ today, metrics: night(weeks([fine, { rhr: 57, hrv: 60 }]), 420) })).toBeUndefined();
      expect(illnessSign({ today, metrics: night(weeks([fine, { rhr: 50, hrv: 45 }]), 420) })).toBeUndefined();
    });

    it('twee ochtenden houden hun eigen zin', () => {
      const sign = illnessSign({ today, metrics: night(weeks([bad, bad]), 420) });
      expect(sign?.mornings).toBe(2);
      expect(sign?.text).toContain('twee ochtenden achter elkaar');
    });
  });
});
