import { describe, expect, it } from 'vitest';
import { climbLimitFor, counterMark, gainDisagreement, gainSidesFor, ownGainOf } from './elevation';
import { ALTITUDE_DISTRUST, altitudeTrusted } from './runMetrics';
import { WATCH_CLIMB_DISTRUST, watchClimbTrusted } from './runClimb';
import { HILLY_M_PER_KM } from './runDetailRules';
import type { ActivityDetail } from '../models/activityDetail';

// I-136: altitudeTrusted en HILLY_M_PER_KM lezen het merk van de teller, zoals de andere drempels
// (climbLimitFor). Het gedrag verandert niet: elke uitkomst is gelijk aan die van voor deze stap.
// Alles nagemaakt.

const COUNTERS: unknown[] = [undefined, 1, 2, 3, 'x'];
const AGREEMENTS = [undefined, 0, 20, 59, 60, 100, 140, 141, 300];
const OWN = [0, 10, 40, 120, 400];

function detail(agreementPct: number | undefined, ownGainM: number, counter: unknown): ActivityDetail {
  return {
    ...(counter !== undefined ? { counter } : {}),
    slices: [{ gainM: ownGainM }],
    quality: { ...(agreementPct !== undefined ? { gainAgreementPct: agreementPct } : {}) },
  } as unknown as ActivityDetail;
}

// De regels zoals ze waren, letterlijk.
const altitudeBefore = (d: ActivityDetail) => gainDisagreement(d.quality.gainAgreementPct, ownGainOf(d)) === undefined;
function watchBefore(d: ActivityDetail | undefined, reported: number | undefined): boolean {
  if (reported === undefined || !Number.isFinite(reported) || reported <= 0) return false;
  if (!d) return true;
  const apart = gainDisagreement(d.quality.gainAgreementPct, ownGainOf(d), reported);
  if (apart === 'high') return false;
  return apart === undefined || counterMark(d.counter) === undefined;
}

describe('het merk van de teller bij hoogte (I-136)', () => {
  it('gainSidesFor: oud, het merk van nu, en een nieuwer merk krijgt beide kanten', () => {
    const sides = { old: ['high'] as const, counted: ['low'] as const };
    expect(gainSidesFor(undefined, sides)).toEqual(['high']);
    expect(gainSidesFor(2, sides)).toEqual(['low']);
    expect([...gainSidesFor(3, sides)].sort()).toEqual(['high', 'low']);
  });

  it('altitudeTrusted geeft voor elk merk hetzelfde als voorheen', () => {
    expect(ALTITUDE_DISTRUST).toEqual({ old: ['low', 'high'], counted: ['low', 'high'] });
    for (const counter of COUNTERS) for (const pct of AGREEMENTS) for (const own of OWN) {
      const d = detail(pct, own, counter);
      expect(altitudeTrusted(d), `${String(counter)} ${pct} ${own}`).toBe(altitudeBefore(d));
    }
  });

  it('watchClimbTrusted in hetzelfde patroon geeft hetzelfde als voorheen', () => {
    expect(WATCH_CLIMB_DISTRUST).toEqual({ old: ['high'], counted: ['low', 'high'] });
    for (const counter of COUNTERS) for (const pct of AGREEMENTS) for (const own of OWN) for (const reported of [undefined, 0, 15, 60, 400]) {
      const d = detail(pct, own, counter);
      expect(watchClimbTrusted({ detail: d }, reported), `${String(counter)} ${pct} ${own} ${reported}`).toBe(watchBefore(d, reported));
    }
    expect(watchClimbTrusted({}, 40)).toBe(true);
  });

  it('HILLY_M_PER_KM: 10 m per km voor elk merk, zoals voorheen', () => {
    for (const counter of COUNTERS) expect(climbLimitFor(counter, HILLY_M_PER_KM)).toBe(10);
  });
});
