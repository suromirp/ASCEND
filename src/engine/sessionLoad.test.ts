import { describe, it, expect } from 'vitest';
import { sessionLoad } from './sessionLoad';

// Nagemaakt: een gekoppelde test van 45 minuten op RPE 10, waarvan 25 minuten de snelste 5 km.
describe('sessionLoad with a split test (docs/onderzoek/RPE bij een testloop.md, voorstel 4)', () => {
  const log = { durationMinutes: 45, rpe: 10 };

  it('the 5 km at its RPE, the rest at 3: 25 x 10 + 20 x 3 = 310 instead of 450', () => {
    expect(sessionLoad(log, 'high').load).toBe(450);
    expect(sessionLoad(log, 'high', { hardMinutes: 25, easyMinutes: 20 })).toEqual({ load: 310, rpe: 10, assumed: false });
  });

  it('the rest never counts heavier than the RPE you gave', () => {
    expect(sessionLoad({ durationMinutes: 45, rpe: 2 }, 'high', { hardMinutes: 25, easyMinutes: 20 }).load).toBe(90);
  });

  it('an assumed RPE stays careful on the hard part', () => {
    expect(sessionLoad({ durationMinutes: 45 }, 'high', { hardMinutes: 25, easyMinutes: 20 })).toEqual({ load: 25 * 9 + 20 * 3, rpe: 9, assumed: true });
  });
});
