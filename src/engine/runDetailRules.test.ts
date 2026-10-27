import { describe, expect, it } from 'vitest';
import { fastStartTest, segmentRun, type Seg } from './fixtures/testRun';
import { buildRunDetail, windAgainstFn } from './runDetail';
import {
  ADVICE_MIN_SEC,
  blockFade,
  blockFadeSentence,
  cadenceRange,
  driftFromKms,
  explainedSentence,
  formFacts,
  nextTimeAdvice,
  pacingLine,
  pacingOf,
  pacingSentence,
  recoveryFacts,
  testConditions,
} from './runDetailRules';
import { isUnavailable } from './runMetrics';
import type { RunKm } from '../models/runDetail';
import type { StoredLap } from '../models/activityStreams';

const OPTS = { logKm: 6.6, logMinutes: 38, builtAt: '2026-10-27T10:00:00.000Z' };

// Kilometres written by hand: only what the rules read.
function kmsOf(paces: number[], extra: Partial<RunKm>[] = []): RunKm[] {
  return paces.map((p, i) => ({
    index: i + 1,
    startM: i * 1000,
    endM: (i + 1) * 1000,
    distanceM: 1000,
    sec: p,
    paceSecKm: p,
    gainM: 0,
    lossM: 0,
    ...extra[i],
  }));
}

describe('the spread of the pace in one word (RD-4)', () => {
  it('the made-up test with a fast start is "te snel begonnen", with the numbers behind it', () => {
    const rd = buildRunDetail(fastStartTest(), OPTS)!;
    const p = pacingOf(rd.bestFive!.kms)!;
    expect(p.word).toBe('te snel begonnen');
    expect(p.n).toBe(5);
    expect(p.meanPace).toBeCloseTo(345, 0);
    expect(p.firstFastPct).toBeCloseTo(6.7, 0);
    expect(p.halfSlowPct).toBeGreaterThan(5);
    expect(pacingSentence(p)).toBe('Je eerste kilometer was 23 seconden per km sneller dan je gemiddelde en de tweede helft ging 7 procent trager dan de eerste.');
  });

  it('an even run is "gelijkmatig"', () => {
    expect(pacingOf(kmsOf([340, 342, 339, 341, 340]))?.word).toBe('gelijkmatig');
  });

  it('a first kilometre only 3 percent faster stays quiet about a fast start', () => {
    const p = pacingOf(kmsOf([333, 342, 343, 343, 343]))!;
    expect(p.word).not.toBe('te snel begonnen');
  });

  it('sagging from the third kilometre on is "ingezakt", and names the kilometre', () => {
    const p = pacingOf(kmsOf([340, 340, 372, 372, 340]))!;
    expect(p.word).toBe('ingezakt');
    expect(p.sag?.km).toBe(3);
    expect(pacingSentence(p)).toContain('Vanaf km 3');
  });

  it('a slow kilometre the headwind explains is not called sagging, and the wind is named', () => {
    const p = pacingOf(kmsOf([340, 340, 372, 372, 340], [{}, {}, { headwindKmh: 19 }, { headwindKmh: 19 }, {}]))!;
    expect(p.word).toBeUndefined();
    expect(p.sag).toBeUndefined();
    expect(p.explained).toEqual({ kms: [3, 4], by: 'wind' });
    expect(explainedSentence(p)).toBe('De tegenwind op km 3 en 4 kan het tragere tempo daar verklaren.');
    expect(nextTimeAdvice(p)).toBeUndefined();
  });

  it('a climb explains a slow kilometre too', () => {
    const p = pacingOf(kmsOf([340, 340, 372, 340, 340], [{}, {}, { gainM: 25 }, {}, {}]))!;
    expect(p.explained).toEqual({ kms: [3], by: 'helling' });
    expect(explainedSentence(p)).toBe('De klim op km 3 kan het tragere tempo daar verklaren.');
  });

  it('a stronger finish needs the second half 2 percent faster', () => {
    expect(pacingOf(kmsOf([350, 350, 345, 335, 330]))?.word).toBe('sterker geëindigd');
  });

  it('under the noise it says no word: a swing of 3 percent on the GPS alone is nothing', () => {
    // 3 percent either way on single kilometres, halves equal.
    const p = pacingOf(kmsOf([340, 350, 330, 350, 340]))!;
    expect(p.word).toBe('gelijkmatig');
    expect(pacingOf(kmsOf([340, 350]))).toBeUndefined();
  });

  it('a result between the words is left without one, with only the numbers', () => {
    // The second half 3 percent slower, no fast start and no sag: none of the four.
    const p = pacingOf(kmsOf([340, 340, 345, 350, 352]))!;
    expect(p.word).toBeUndefined();
    expect(p.halfSlowPct).toBeGreaterThan(2);
  });
});

describe('the advice for the next test (RD-5)', () => {
  it('names the pace from the best 5 km, rounded up to 5 seconds, and the seconds against the first kilometre', () => {
    const rd = buildRunDetail(fastStartTest(), OPTS)!;
    const advice = nextTimeAdvice(pacingOf(rd.bestFive!.kms))!;
    expect(advice.kind).toBe('fast-start');
    expect(advice.text).toBe('Begin de volgende test op 5:45 per km, dat is 23 seconden per km rustiger dan je eerste kilometer vandaag. Gelijkmatig lopen is meestal het snelst.');
  });

  it('rounds the pace up, never down', () => {
    // Mean 346: the advice is 5:50.
    const p = pacingOf(kmsOf([320, 340, 360, 360, 350]))!;
    expect(p.meanPace).toBeCloseTo(346, 5);
    expect(nextTimeAdvice(p)!.text).toContain('5:50 per km');
  });

  it('stays quiet under 10 seconds of difference with the first kilometre', () => {
    expect(ADVICE_MIN_SEC).toBe(10);
    // At a pace of 3:55 per km a fast start of 4 percent is under 10 seconds: that is the GPS.
    const p = pacingOf(kmsOf([225.5, 232, 238, 240, 239.5]))!;
    expect(p.word).toBe('te snel begonnen');
    expect(p.meanPace - p.firstPace).toBeLessThan(ADVICE_MIN_SEC);
    expect(nextTimeAdvice(p)).toBeUndefined();
  });

  it('after sagging it says 5 seconds rustiger from that kilometre, with no more promise than that', () => {
    const advice = nextTimeAdvice(pacingOf(kmsOf([340, 340, 372, 372, 340])))!;
    expect(advice).toEqual({ kind: 'sagged', text: 'Je zakte vanaf km 3 in. Begin de volgende keer 5 seconden per km rustiger.' });
  });

  it('after a stronger finish it allows a quicker start only if the last kilometre was 4 percent faster', () => {
    expect(nextTimeAdvice(pacingOf(kmsOf([352, 352, 346, 335, 322])))!.text).toBe('Je had nog over. Je mag de volgende keer 5 seconden per km sneller beginnen.');
    expect(nextTimeAdvice(pacingOf(kmsOf([350, 350, 345, 338, 338])))).toBeUndefined();
  });

  it('an even run gets one sentence and no advice', () => {
    expect(nextTimeAdvice(pacingOf(kmsOf([340, 342, 339, 341, 340])))).toEqual({ kind: 'even', text: 'Gelijkmatig gelopen.' });
  });

  it('never promises a time or a faster result', () => {
    const texts = [
      nextTimeAdvice(pacingOf(kmsOf([320, 340, 360, 360, 350])))!.text,
      nextTimeAdvice(pacingOf(kmsOf([340, 340, 372, 372, 340])))!.text,
      nextTimeAdvice(pacingOf(kmsOf([352, 352, 346, 335, 322])))!.text,
    ];
    for (const t of texts) {
      expect(t).not.toMatch(/dan loop je sneller|dan haal je|doeltijd|je wordt fitter|!|[\u2013\u2014]/);
    }
  });
});

describe('the one line after a hard training', () => {
  it('a test gets the advice', () => {
    const rd = buildRunDetail(fastStartTest(), OPTS)!;
    expect(pacingLine(rd, 'test')).toContain('Begin de volgende test op 5:45 per km');
    expect(pacingLine(undefined, 'test')).toBeUndefined();
  });

  it('a test without a best 5 km is read on the whole run, and a short one says nothing', () => {
    const rd = buildRunDetail(segmentRun([{ m: 2000, pace: 360 }]), OPTS)!;
    expect(pacingLine(rd, 'test')).toBeUndefined();
  });

  it('tempo blocks: the last block 4 percent slower than the first is one line, under that nothing', () => {
    const blocks = (paces: number[]) => {
      const segs: Seg[] = [];
      const laps: StoredLap[] = [];
      let t = 0;
      for (const p of paces) {
        segs.push({ m: 1500, pace: p });
        laps.push({ startSec: t, endSec: t + (1500 * p) / 1000, kind: 'work' });
        t += (1500 * p) / 1000;
      }
      return buildRunDetail(segmentRun(segs), { ...OPTS, laps, bestKm: null })!;
    };
    const slow = blocks([300, 305, 318]);
    expect(blockFade(slow.laps)!.slowerSec).toBeCloseTo(18, 0);
    expect(pacingLine(slow, 'blocks')).toBe('Het laatste blok was 18 seconden per km trager dan het eerste.');
    expect(pacingLine(blocks([300, 303, 308]), 'blocks')).toBeUndefined();
    expect(blockFadeSentence(undefined)).toBeUndefined();
  });

  it('repeats under 400 metres have no pace worth a line', () => {
    const laps: StoredLap[] = [
      { startSec: 0, endSec: 60, kind: 'work' },
      { startSec: 60, endSec: 120, kind: 'recovery' },
      { startSec: 120, endSec: 180, kind: 'work' },
    ];
    const rd = buildRunDetail(segmentRun([{ m: 200, pace: 300 }, { m: 100, pace: 600 }, { m: 220, pace: 270 }, { m: 1200, pace: 360 }]), { ...OPTS, laps, bestKm: null })!;
    expect(rd.laps).toBeDefined();
    expect(blockFade(rd.laps)).toBeUndefined();
  });

  it('the heart rate recovery between repeats is a fact per recovery', () => {
    expect(recoveryFacts([{ index: 2, kind: 'recovery', hrDropFirstMinute: 22 } as never, { index: 3, kind: 'work' } as never])).toEqual([{ lap: 2, dropBpm: 22 }]);
  });
});

describe('what played a part (RD-6)', () => {
  const wind = [
    { atSec: -1800, speedKmh: 30, fromDeg: 270 },
    { atSec: 1800, speedKmh: 30, fromDeg: 270 },
  ];
  const route = fastStartTest({ position: true });
  const rd = buildRunDetail(route, { ...OPTS, wind: windAgainstFn(route, wind) })!;

  it('says only what is known: the headwind on its kilometres, legs, soreness, warmth', () => {
    const facts = testConditions(rd, { legs: 'zwaar', soreness: true, conditions: { feelsC: 23, source: 'lookup' } });
    const kinds = facts.map((f) => f.kind);
    // The made-up warm-up is a kilometre of 6:35: under 8 minutes, and the series shows it.
    expect(kinds).toEqual(['wind', 'legs', 'soreness', 'warmth', 'warmup']);
    expect(facts[0].text).toBe('Tegenwind op km 3, 4 en 5.');
    expect(facts[3].text).toBe('Het voelde als 23 graden.');
  });

  it('a whole warm-up of 8 minutes and normal legs add nothing', () => {
    const calm = buildRunDetail(
      segmentRun([{ m: 2000, pace: 400, hr: 128 }, ...[345, 345, 345, 345, 345].map((pace): Seg => ({ m: 1000, pace }))]),
      OPTS,
    )!;
    expect(calm.bestFive!.startSec).toBeGreaterThan(8 * 60);
    expect(testConditions(calm, { legs: 'fris' })).toEqual([]);
    expect(testConditions(undefined)).toEqual([]);
  });

  it('shows no warm-up when there was none in the series, and a pause in the stretch', () => {
    const noWarm = buildRunDetail(segmentRun([{ m: 5000, pace: 345 }], { pauses: [{ atM: 2000, seconds: 30 }] }), OPTS)!;
    const kinds = testConditions(noWarm).map((f) => f.kind);
    expect(kinds).toContain('warmup');
    expect(kinds).toContain('pause');
  });

  it('a hilly route and a hard wind in the conditions without a track', () => {
    const hilly = buildRunDetail(segmentRun([{ m: 3000, pace: 360, climb: 90 }]), OPTS)!;
    expect(testConditions(hilly).map((f) => f.kind)).toContain('route');
    expect(testConditions(rd, { conditions: { windKmh: 30, source: 'lookup' } }).some((f) => f.kind === 'wind')).toBe(true);
    expect(testConditions(buildRunDetail(fastStartTest(), OPTS)!, { conditions: { windKmh: 30, source: 'lookup' } })[0].text).toBe('Het waaide hard: 30 km/u gemiddeld.');
    expect(testConditions(buildRunDetail(fastStartTest(), OPTS)!, { ill: true }).map((f) => f.kind)).toEqual(['illness', 'warmup']);
  });
});

describe('drift and decoupling on a long or easy run', () => {
  // 90 minutes at an even pace, the heart rate rising from 140 to 160.
  const long = (hrEnd: number) =>
    buildRunDetail(
      segmentRun(Array.from({ length: 15 }, (_, i) => ({ m: 1000, pace: 360, hr: Math.round(140 + ((hrEnd - 140) * i) / 14) }))),
      { ...OPTS, bestKm: null },
    )!;

  it('reads the fall of speed per heartbeat from the first to the second half', () => {
    const d = driftFromKms(long(160), { easyOrLong: true });
    expect(isUnavailable(d)).toBe(false);
    if (isUnavailable(d)) return;
    expect(d.percent).toBeGreaterThan(5);
    expect(d.beyondNoise).toBe(true);
    expect(d.secondHeartRate).toBeGreaterThan(d.firstHeartRate);
  });

  it('a flat heart rate is no drift, and within the noise of 3 points', () => {
    const d = driftFromKms(long(141), { easyOrLong: true });
    if (isUnavailable(d)) throw new Error('should be available');
    expect(d.beyondNoise).toBe(false);
  });

  it('never for a test or repeats, for a short run, a hilly run or one without heart rate', () => {
    expect(driftFromKms(long(160), { easyOrLong: false })).toEqual({ unavailable: 'noSteadyBlock' });
    expect(driftFromKms(buildRunDetail(fastStartTest(), OPTS)!, { easyOrLong: true })).toEqual({ unavailable: 'tooShort' });
    expect(driftFromKms(undefined, { easyOrLong: true })).toEqual({ unavailable: 'noDetail' });
    const hilly = buildRunDetail(segmentRun(Array.from({ length: 15 }, () => ({ m: 1000, pace: 360, climb: 30, hr: 150 }))), { ...OPTS, bestKm: null })!;
    expect(driftFromKms(hilly, { easyOrLong: true })).toEqual({ unavailable: 'hilly' });
    const noHr = buildRunDetail(segmentRun(Array.from({ length: 15 }, () => ({ m: 1000, pace: 360 })), { noHr: true }), { ...OPTS, bestKm: null })!;
    expect(driftFromKms(noHr, { easyOrLong: true })).toEqual({ unavailable: 'noHeartRate' });
  });
});

describe('form: facts per kilometre, no verdict', () => {
  const run = buildRunDetail(segmentRun(Array.from({ length: 9 }, () => ({ m: 1000, pace: 360 }))), { ...OPTS, bestKm: null })!;

  it('gives the change of each measured figure from the first to the last third', () => {
    const facts = formFacts(run);
    expect(facts.map((f) => f.metric)).toEqual(['cadence', 'stepLengthM', 'powerW']);
    expect(facts[0]).toMatchObject({ metric: 'cadence', first: 172, last: 172, change: 0 });
    expect(cadenceRange(run)).toBe(0);
  });

  it('stays out when the pace of the thirds differs more than 6 percent, or the run is short', () => {
    const fading = buildRunDetail(segmentRun(Array.from({ length: 9 }, (_, i) => ({ m: 1000, pace: 330 + i * 10 }))), { ...OPTS, bestKm: null })!;
    expect(formFacts(fading)).toEqual([]);
    expect(formFacts(buildRunDetail(segmentRun([{ m: 3000, pace: 360 }]), OPTS))).toEqual([]);
    expect(cadenceRange(undefined)).toBeUndefined();
  });
});
