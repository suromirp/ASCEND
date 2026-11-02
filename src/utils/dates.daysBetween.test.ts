import { describe, it, expect } from 'vitest';
import { addDays, daysBetween, isoWeekday, mondayOfWeek, parseISODate, toISODate } from './dates';

// De oude berekeningen, letterlijk: addDays, isoWeekday en daysBetween onthouden nu hun uitkomst per
// invoer, maar die uitkomst moet precies dezelfde blijven, ook voor rare invoer.
function referenceAddDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}
function referenceWeekday(iso: string): number {
  const jsDay = parseISODate(iso).getDay();
  return jsDay === 0 ? 7 : jsDay;
}
function reference(fromIso: string, toIso: string): number {
  const a = parseISODate(fromIso).getTime();
  const b = parseISODate(toIso).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

const dates: string[] = [];
for (let y = 2025; y <= 2027; y++) {
  for (let m = 1; m <= 12; m++) {
    for (const d of [1, 15, 28, 29, 30, 31]) dates.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
}
// Rond de zomer- en wintertijd, het jaar 0000 dat de planner als "altijd" gebruikt, en invoer die geen datum is.
const odd = ['2026-03-28', '2026-03-29', '2026-03-30', '2026-10-24', '2026-10-25', '2026-10-26', '0000-01-01', '2026-02-30', '2026-13-01', '', 'geen datum', '2026-10-10T10:00:00Z', '2026-10'];

describe('datums onthouden zonder andere uitkomst', () => {
  it('addDays en isoWeekday geven hetzelfde als de oude berekening, ook bij een tweede keer', () => {
    const all = [...dates, ...odd];
    for (let round = 0; round < 2; round++) {
      for (const iso of all) {
        for (const n of [0, -0, 1, -1, 6, -6, 7, 28, -52, 365, 0.5, Number.NaN]) expect(addDays(iso, n)).toBe(referenceAddDays(iso, n));
        expect(Object.is(isoWeekday(iso), referenceWeekday(iso))).toBe(true);
      }
    }
    expect(mondayOfWeek('2026-11-08')).toBe('2026-11-02');
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
  });

  it('geeft voor elk paar hetzelfde als de oude berekening, ook bij een tweede keer', () => {
    const all = [...dates, ...odd];
    for (let round = 0; round < 2; round++) {
      for (const a of all) {
        for (const b of odd.concat(dates.slice(0, 40))) {
          expect(Object.is(daysBetween(a, b), reference(a, b))).toBe(true);
          expect(Object.is(daysBetween(b, a), reference(b, a))).toBe(true);
        }
      }
    }
  });

  it('telt een gewone week, over de wintertijd heen', () => {
    expect(daysBetween('2026-10-19', '2026-10-26')).toBe(7);
    expect(daysBetween('2026-10-26', '2026-10-19')).toBe(-7);
    expect(daysBetween('2026-10-25', '2026-10-25')).toBe(0);
    expect(Number.isNaN(daysBetween('geen datum', '2026-10-25'))).toBe(true);
  });

  it('blijft kloppen als het geheugen vol raakt en opnieuw begint', () => {
    for (let i = 0; i < 25000; i++) {
      const iso = `${2000 + (i % 40)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`;
      daysBetween('2026-01-01', iso);
      addDays(iso, i % 97);
      isoWeekday(`${iso}x${i}`);
    }
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30);
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(isoWeekday('2026-11-02')).toBe(1);
  });
});
