import { describe, expect, it } from 'vitest';
import type { SetTarget } from '../models/training';
import { programLine } from './programLine';

const set = (over: Partial<SetTarget> = {}): SetTarget => ({ repsLow: 8, repsHigh: 10, rir: 2, ...over });
const fail = set({ repsLow: 9, repsHigh: 9, rir: 0, failure: true });

describe('de voorschriftregel boven de sets', () => {
  it('voegt gelijke sets met een bereik en reserve samen', () => {
    expect(programLine([set(), set(), set(), set()])).toBe('4 sets van 8 tot 10 met 2 over');
  });

  it('noemt een enkel aantal herhalingen zonder bereik', () => {
    const five = set({ repsLow: 5, repsHigh: 5, rir: 1 });
    expect(programLine([five, five])).toBe('2 sets van 5 met 1 over');
    expect(programLine([five])).toBe('1 set van 5 met 1 over');
  });

  it('voegt gelijke sets tot falen samen', () => {
    expect(programLine([fail, fail, fail, fail])).toBe('4 sets van 9+ herhalingen tot falen');
  });

  it('zet verschillende sets kort na elkaar', () => {
    expect(programLine([set(), set(), fail])).toBe('2 sets van 8 tot 10 met 2 over, dan 1 set van 9+ tot falen');
  });

  it('zegt de reserve per set als alleen die verschilt', () => {
    const base = { repsLow: 4, repsHigh: 6 };
    expect(programLine([set({ ...base, rir: 1 }), set({ ...base, rir: 2 }), set({ ...base, rir: 3 })])).toBe('3 sets van 4 tot 6 met 1, 2 en 3 over');
  });

  it('noemt een open set zonder spotter met haar reserve', () => {
    expect(programLine([set({ repsLow: 7, repsHigh: 7, rir: 1, open: true }), set({ repsLow: 7, repsHigh: 9, rir: 2 })])).toBe('1 set van 7+ met 1 over, dan 1 set van 7 tot 9 met 2 over');
  });
});
