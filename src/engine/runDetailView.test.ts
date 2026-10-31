import { describe, expect, it } from 'vitest';
import { fastStartTest, segmentRun, type Seg } from './fixtures/testRun';
import { buildRunDetail } from './runDetail';
import { context, runLog } from './fixtures/runLogs';
import { similarRuns } from './runComparison';
import {
  clock,
  compareWithSimilar,
  distanceLabel,
  formFactLine,
  formKeysOf,
  formSeries,
  halvesOf,
  headlineStats,
  heartNote,
  heartOf,
  hrZoneOf,
  kmBetween,
  kmChips,
  movingSecBetween,
  paceBars,
  recurringFastStart,
  runAdvice,
  runDetailRowLine,
  runTotalsOf,
  runKindOf,
  runPatterns,
  runVerdict,
  testHalvesLine,
  testLayout,
  type FormKey,
} from './runDetailView';
import type { RunDetail, RunKm } from '../models/runDetail';
import type { SessionLog, SessionTemplate } from '../models/training';

// Made-up runs only (engine/fixtures/testRun.ts and hand-written kilometres).

const OPTS = { logKm: 6.6, logMinutes: 38, builtAt: '2026-10-27T10:00:00.000Z' };
const build = (segs: Seg[], extra: Parameters<typeof segmentRun>[1] = {}) => buildRunDetail(segmentRun(segs, extra), OPTS) as RunDetail;
const even = (km: number, pace = 330, hr?: number) => build(Array.from({ length: km }, () => ({ m: 1000, pace, ...(hr ? { hr } : {}) })));

function kmsOf(paces: number[], extra: Partial<RunKm>[] = []): RunKm[] {
  return paces.map((p, i) => ({ index: i + 1, startM: i * 1000, endM: (i + 1) * 1000, distanceM: 1000, sec: p, paceSecKm: p, gainM: 0, lossM: 0, ...extra[i] }));
}
function detailOf(kms: RunKm[], over: Partial<RunDetail> = {}): RunDetail {
  const totalM = kms[kms.length - 1].endM;
  const movingSec = kms.reduce((n, k) => n + k.sec, 0);
  return {
    version: 1,
    wholeKm: totalM / 1000,
    wholeMinutes: movingSec / 60,
    builtAt: OPTS.builtAt,
    totalM,
    movingSec,
    pauseSec: 0,
    kms,
    line: { n: 2, distM: [0, totalM], timeSec: [0, movingSec], paceSecKm: [kms[0].paceSecKm, kms[kms.length - 1].paceSecKm], hr: [null, null], altitudeM: [null, null] },
    ...over,
  };
}

const TEMPLATES: SessionTemplate[] = [
  { id: 'tpl_test', name: 'Testloop 5 km', type: 'cardio', roles: ['test'] },
  { id: 'tpl_race', name: 'Wedstrijd', type: 'cardio', roles: ['race'] },
  { id: 'tpl_tempo', name: 'Tempoloop', type: 'cardio', roles: ['blocks'] },
  { id: 'tpl_long', name: 'Lange loop', type: 'cardio', roles: ['long'] },
  { id: 'tpl_easy', name: 'Rustige loop', type: 'cardio', roles: ['easy_pace'] },
] as unknown as SessionTemplate[];

describe('small words and numbers', () => {
  it('writes a clock and a distance in Dutch', () => {
    expect(clock(1660)).toBe('27:40');
    expect(clock(3850)).toBe('1:04:10');
    expect(distanceLabel(6030)).toBe('6,03 km');
    expect(distanceLabel(804)).toBe('800 m');
  });

  it('reads the kind of run from the role of its template', () => {
    expect(runKindOf({ templateId: 'tpl_test' }, TEMPLATES)).toBe('test');
    expect(runKindOf({ templateId: 'tpl_race' }, TEMPLATES)).toBe('race');
    expect(runKindOf({ templateId: 'tpl_tempo' }, TEMPLATES)).toBe('blocks');
    expect(runKindOf({ templateId: 'tpl_long' }, TEMPLATES)).toBe('long');
    expect(runKindOf({ templateId: 'tpl_easy' }, TEMPLATES)).toBe('easy');
    expect(runKindOf({ templateId: 'iets anders' }, TEMPLATES)).toBe('other');
  });
});

describe('halves of the pace and of the heart rate', () => {
  it('splits on half the distance, also inside a kilometre', () => {
    const h = halvesOf(kmsOf([300, 300, 330, 330]))!;
    expect(h.firstPace).toBeCloseTo(300, 5);
    expect(h.secondPace).toBeCloseTo(330, 5);
    expect(h.diffSec).toBeCloseTo(30, 5);
    const odd = halvesOf(kmsOf([300, 300, 360]))!;
    // The middle kilometre is cut in two: 1.5 km at 300, then 0.5 at 300 and 1 at 360.
    expect(odd.firstPace).toBeCloseTo(300, 5);
    expect(odd.secondPace).toBeCloseTo(340, 5);
    expect(halvesOf(kmsOf([300]))).toBeUndefined();
  });

  it('weighs the heart rate by time and stays quiet with too little of it', () => {
    const h = heartOf(kmsOf([300, 300, 300, 300], [{ hrAvg: 150 }, { hrAvg: 150 }, { hrAvg: 160 }, { hrAvg: 160 }]))!;
    expect(h.mean).toBeCloseTo(155, 5);
    expect(h.diff).toBeCloseTo(10, 5);
    expect(heartOf(kmsOf([300, 300, 300], [{ hrAvg: 150 }]))).toBeUndefined();
  });

  it('adds up moving seconds over any stretch', () => {
    expect(movingSecBetween(kmsOf([300, 360]), 500, 1500)).toBeCloseTo(330, 5);
  });
});

describe('the verdict (4.2, 5.2)', () => {
  it('calls an even run even', () => {
    const v = runVerdict(even(6), 'other');
    expect(v.word).toBe('Gelijkmatig');
    expect(v.sentence).toMatch(/2 procent/);
  });

  it('names a fast start of a test on its best 5 km, with the numbers', () => {
    const v = runVerdict(buildRunDetail(fastStartTest(), OPTS)!, 'test');
    expect(v.tone).toBe('fast-start');
    expect(v.word).toBe('Te snel begonnen');
    expect(v.sentence).toMatch(/^Je begon \d+ seconden per kilometer sneller/);
  });

  it('says it cannot have been measured right before anything else', () => {
    const v = runVerdict(detailOf(kmsOf([330, 330, 150, 330, 330])), 'other');
    expect(v.word).toBe('Niet goed gemeten');
    expect(v.sentence).toContain('Km 3');
  });

  it('is too short under three full kilometres', () => {
    expect(runVerdict(detailOf(kmsOf([330, 330])), 'other').tone).toBe('short');
  });

  it('puts the heart rate before even on an easy run, and never on a test', () => {
    // 70 minutes at an even pace with a heart rate that climbs from 140 to 160.
    const hr = (i: number) => 140 + Math.round((20 * i) / 11);
    const rd = build(Array.from({ length: 12 }, (_, i) => ({ m: 1000, pace: 350, hr: hr(i) })));
    expect(runVerdict(rd, 'easy').tone).toBe('heart');
    expect(runVerdict(rd, 'other').tone).toBe('even');
  });

  it('calls a run without a line and without an explanation mixed', () => {
    expect(runVerdict(detailOf(kmsOf([330, 350, 315, 345, 320, 340])), 'easy').tone).toBe('mixed');
  });

  it('reads blocks from the laps of a tempo run', () => {
    const laps = [
      { index: 1, startSec: 0, endSec: 400, startM: 0, endM: 1500, distanceM: 1500, sec: 400, kind: 'work' as const, paceSecKm: 300 },
      { index: 2, startSec: 400, endSec: 520, startM: 1500, endM: 1800, distanceM: 300, sec: 120, kind: 'recovery' as const, paceSecKm: 400 },
      { index: 3, startSec: 520, endSec: 930, startM: 1800, endM: 3300, distanceM: 1500, sec: 410, kind: 'work' as const, paceSecKm: 330 },
    ];
    const rd = detailOf(kmsOf([300, 330, 330]), { laps });
    expect(runVerdict(rd, 'blocks').tone).toBe('blocks-fade');
    const flat = detailOf(kmsOf([300, 330, 330]), { laps: laps.map((l) => (l.kind === 'work' ? { ...l, paceSecKm: 300 } : l)) });
    expect(runVerdict(flat, 'blocks').word).toBe('Blokken gelijk');
  });
});

describe('the three numbers', () => {
  it('are always three: pace, spread and heart rate for a run', () => {
    const s = headlineStats(even(6, 330, 150), 'other');
    expect(s.map((x) => x.key)).toEqual(['pace', 'split', 'heart']);
    expect(s[0]).toMatchObject({ value: '5:30', unit: '/km' });
    expect(s[1].value).toBe('0');
    expect(s[2]).toMatchObject({ value: '150', unit: 'bpm' });
  });

  it('start with the best 5 km for a test', () => {
    const s = headlineStats(buildRunDetail(fastStartTest(), OPTS)!, 'test');
    expect(s.map((x) => x.key)).toEqual(['best', 'split', 'heart']);
    expect(s[0].value).toBe(clock(322 + 338 + 358 + 362 + 345));
    expect(s[1].value.startsWith('+')).toBe(true);
    expect(s[1].note).toContain('van je 5 km');
  });

  it('fill the place of a missing heart rate with the climb or the distance', () => {
    const noHr = buildRunDetail(fastStartTest({ noHr: true }), OPTS)!;
    const s = headlineStats(noHr, 'other');
    expect(s).toHaveLength(3);
    expect(s.map((x) => x.key)).toEqual(['pace', 'split', 'climb']);
    const short = headlineStats(detailOf(kmsOf([330])), 'other');
    expect(short).toHaveLength(3);
    expect(new Set(short.map((x) => x.key)).size).toBe(3);
  });
});

describe('the bars per kilometre (4.4)', () => {
  it('make a faster kilometre higher, start under the slowest and mark the outliers', () => {
    const b = paceBars(detailOf(kmsOf([300, 330, 330, 360])), 'other')!;
    expect(b.by).toBe('km');
    expect(b.bars[0].height).toBe(1);
    expect(b.bars[3].height).toBeLessThan(b.bars[1].height);
    expect(b.bars[3].height).toBeGreaterThan(0);
    expect(b.basePace).toBeGreaterThan(360);
    expect(b.basePace % 15).toBe(0);
    expect(b.bars[0].off).toBe('fast');
    expect(b.bars[3].off).toBe('slow');
    expect(b.bars[1].off).toBeUndefined();
  });

  it('dim what is not the best 5 km of a test and narrow the last short piece', () => {
    const b = paceBars(buildRunDetail(fastStartTest(), OPTS)!, 'test')!;
    expect(b.bars[0].counts).toBe(false);
    expect(b.bars.slice(1, 6).every((x) => x.counts)).toBe(true);
    expect(b.bars[6]).toMatchObject({ counts: false, partial: true });
    expect(b.bars[6].width).toBeCloseTo(0.6, 1);
  });

  it('go per lap for a training with blocks', () => {
    const laps = [
      { index: 1, startSec: 0, endSec: 400, startM: 0, endM: 1500, distanceM: 1500, sec: 400, kind: 'work' as const, paceSecKm: 300 },
      { index: 2, startSec: 400, endSec: 520, startM: 1500, endM: 1800, distanceM: 300, sec: 120, kind: 'recovery' as const, paceSecKm: 400 },
    ];
    const b = paceBars(detailOf(kmsOf([300, 330]), { laps }), 'blocks')!;
    expect(b.by).toBe('lap');
    expect(b.bars.map((x) => x.counts)).toEqual([true, false]);
  });
});

describe('a kilometre in words (4.6, 5.3)', () => {
  it('has short pieces for the second line', () => {
    expect(kmChips({ gainM: 14, lossM: 22.4, cadence: 171.6, pauseSec: 12, headwindKmh: 18 })).toEqual(['klim 14 m', 'daling 22 m', 'cadans 172', 'stilgestaan 0:12', 'wind tegen 18 km/u']);
    expect(kmChips({ gainM: 1, lossM: 0 })).toEqual([]);
  });

  it('tells what happened inside a kilometre', () => {
    const rd = build([{ m: 500, pace: 300 }, { m: 500, pace: 360, climb: 20 }, { m: 3000, pace: 330 }], { pauses: [{ atM: 700, seconds: 40 }] });
    const lines = kmBetween(rd, rd.kms[0]);
    expect(lines[0]).toMatch(/^Je klom \d+ m/);
    expect(lines.some((l) => l.startsWith('De eerste helft ging in'))).toBe(true);
    expect(lines.some((l) => l.startsWith('Je stond 0:40 stil'))).toBe(true);
    expect(lines.length).toBeLessThanOrEqual(3);
    expect(kmBetween(rd, rd.kms[2])).toEqual([]);
  });
});

describe('form (4.7)', () => {
  const all: Record<FormKey, boolean> = { cadence: true, stanceTimeMs: true, stepLengthM: true, oscillationMm: true, stanceBalanceLeftPct: true };

  it('shows only what was measured and switched on, balance off by default elsewhere', () => {
    const rd = even(6);
    expect(formKeysOf(rd, all)).toEqual(['cadence', 'stepLengthM']);
    expect(formKeysOf(rd, { ...all, cadence: false })).toEqual(['stepLengthM']);
    expect(formSeries(rd, 'stepLengthM')[0].value).toBeGreaterThan(90);
  });

  it('says one fact: a steady cadence, or a change past the noise', () => {
    expect(formFactLine(even(6), 'cadence')).toBe('Je cadans bleef vrijwel gelijk.');
    const kms = kmsOf([330, 330, 330, 330, 330, 330], [0, 1, 2, 3, 4, 5].map((i) => ({ stanceTimeMs: i < 2 ? 250 : i < 4 ? 255 : 265 })));
    expect(formFactLine(detailOf(kms), 'stanceTimeMs')).toBe('Je grondcontact werd in het laatste derde 15 ms langer dan in het eerste.');
    const tiny = kmsOf([330, 330, 330, 330, 330, 330], [0, 1, 2, 3, 4, 5].map((i) => ({ stanceTimeMs: i < 3 ? 250 : 252 })));
    expect(formFactLine(detailOf(tiny), 'stanceTimeMs')).toBe('Je grondcontact lag tussen 250 ms en 252 ms.');
  });
});

describe('patterns (4.8)', () => {
  it('lists the strongest first, at most three, and nothing for an even run', () => {
    expect(runPatterns(even(6, 330, 150), { kind: 'other' })).toEqual([]);
    const rd = buildRunDetail(fastStartTest(), OPTS)!;
    const p = runPatterns(rd, { kind: 'test', recurring: { count: 3, of: 5 }, played: { soreness: true } });
    expect(p.length).toBeLessThanOrEqual(3);
    expect(p[0].topic).toBe('Tempo');
    expect(p.map((x) => x.topic)).toContain('Gewoonte');
    for (let i = 1; i < p.length; i++) expect(p[i - 1].strength).toBeGreaterThanOrEqual(p[i].strength);
    // Never a cause: "kan" where it says what it means.
    expect(p.every((x) => !/komt door|door je/.test(x.text))).toBe(true);
  });

  it('names a climb that cost time, and leaves terrain out on a treadmill', () => {
    const rd = build([{ m: 1000, pace: 330 }, { m: 1000, pace: 330 }, { m: 1000, pace: 380, climb: 30 }, { m: 1000, pace: 330 }, { m: 1000, pace: 330 }]);
    expect(runPatterns(rd, { kind: 'other' }).some((x) => x.topic === 'Terrein' && x.text.startsWith('De klim op km 3'))).toBe(true);
    expect(runPatterns(rd, { kind: 'other', indoor: true }).some((x) => x.topic === 'Terrein')).toBe(false);
  });

  it('finds a fast start that comes back in three of the last five hard runs (RD-10)', () => {
    const fast = buildRunDetail(fastStartTest(), OPTS)!;
    const evenRd = even(6);
    const log = (id: string, day: number, rd: RunDetail, templateId = 'tpl_test') => ({ id, templateId, completedAt: `2026-10-${String(day).padStart(2, '0')}T08:00:00.000Z`, runDetail: rd }) as unknown as SessionLog;
    const logs = [log('a', 1, fast), log('b', 5, fast), log('c', 9, evenRd), log('d', 13, fast), log('e', 17, evenRd, 'tpl_easy')];
    expect(recurringFastStart(logs, TEMPLATES, logs[3])).toEqual({ count: 3, of: 4 });
    expect(recurringFastStart(logs, TEMPLATES, logs[1])).toBeUndefined();
  });
});

describe('advice (4.10, 6.5)', () => {
  it('gives a test its start pace and the warm-up, at most two lines', () => {
    const rd = buildRunDetail(fastStartTest(), OPTS)!;
    const a = runAdvice(rd, 'test')!;
    expect(a.title).toBe('Voor de volgende test');
    expect(a.lines[0]).toMatch(/^Begin de volgende test op/);
    expect(a.lines.length).toBeLessThanOrEqual(2);
    expect(a.lines.join(' ')).not.toMatch(/dan loop je|haal je/);
  });

  it('stays away after pain or a worse feeling, and when there is nothing to say', () => {
    const rd = buildRunDetail(fastStartTest(), OPTS)!;
    expect(runAdvice(rd, 'test', { pain: true })).toBeUndefined();
    expect(runAdvice(rd, 'test', { feltWorse: true })).toBeUndefined();
    expect(runAdvice(even(6), 'other')).toBeUndefined();
  });

  it('gives an easy run no pace advice: it goes on feel or heart rate', () => {
    const fast = detailOf(kmsOf([300, 340, 345, 350, 352, 355]));
    expect(runAdvice(fast, 'other')?.lines[0]).toMatch(/^Begin de eerste kilometer/);
    expect(runAdvice(fast, 'easy')).toBeUndefined();
  });
});

describe('the test as a special case (6.2)', () => {
  it('splits warm-up, the best 5 km and cooling down', () => {
    const rd = buildRunDetail(fastStartTest(), OPTS)!;
    const t = testLayout(rd)!;
    expect(t.warm.m).toBeCloseTo(1000, -1);
    expect(t.best.m).toBeCloseTo(5000, -1);
    expect(t.cool.m).toBeCloseTo(600, -1);
    expect(t.warmFrac + t.bestFrac + t.coolFrac).toBeCloseTo(1, 5);
    expect(t.warm.sec).toBeCloseTo(395, -1);
    expect(testHalvesLine(t.halves)).toMatch(/^Eerste 2,5 km in \d:\d\d per km, tweede helft in \d:\d\d, verschil \+\d+ s\.$/);
  });

  it('has nothing to split when the best 5 km is the whole run', () => {
    expect(testLayout(even(5))).toBeUndefined();
    expect(testLayout(detailOf(kmsOf([330, 330])))).toBeUndefined();
  });
});

describe('against similar runs (4.9)', () => {
  it('compares with the middle of at least three earlier runs, in the fixed words', () => {
    const own = even(6, 335, 150);
    const others = [even(6, 340, 150), even(6, 342, 152), even(6, 338, 149)];
    const c = compareWithSimilar(own, others)!;
    expect(c.n).toBe(3);
    expect(c.rows[0]).toMatchObject({ label: 'Tempo', word: 'Normaal' });
    expect(c.rows.map((r) => r.label)).toEqual(['Tempo', 'Hartslag bij je tempo', 'Verdeling']);
    expect(c.medianPerKm[0]).toBeCloseTo(340, 0);
    const faster = compareWithSimilar(even(6, 300, 150), others)!;
    expect(faster.rows[0].word).toBe('Beter');
    expect(compareWithSimilar(own, others.slice(0, 2))).toBeUndefined();
  });

  it('the gate takes the same training of about the same length, and says why not', () => {
    const date = (d: number) => `2026-10-${String(d).padStart(2, '0')}`;
    const withRd = (l: SessionLog, rd: RunDetail): SessionLog => ({ ...l, templateId: 'tpl_easy_run', runDetail: rd });
    const spec = { minutes: 40, pace: 330, hr: 145, seed: 1 } as unknown as Parameters<typeof runLog>[0]['spec'];
    const mk = (id: string, d: number, rd: RunDetail) => withRd(runLog({ id, date: date(d), spec, strap: true }), rd);
    const subject = mk('s', 18, even(6));
    const history = [mk('a', 15, even(6)), mk('b', 12, even(6)), mk('c', 9, even(6)), mk('far', 6, even(10))];
    const c = similarRuns(subject, context([...history, subject]));
    expect(c.enough).toBe(true);
    expect(c.logs.map((l) => l.id)).toEqual(['a', 'b', 'c']);
    const few = similarRuns(subject, context([history[0], history[3], subject]));
    expect(few.enough).toBe(false);
    expect(few.reasons.map((r) => r.code)).toContain('otherDistance');
    expect(similarRuns({ ...subject, runDetail: undefined }, context([subject])).reasons).toEqual([{ code: 'noDetail' }]);
  });
});

describe('notes and lines', () => {
  it('says when there is no heart rate or too little', () => {
    expect(heartNote(buildRunDetail(fastStartTest({ noHr: true }), OPTS)!, undefined)).toBe('Geen hartslag gemeten bij deze run.');
    expect(heartNote(even(6, 330, 150), 62)).toMatch(/62 procent/);
    expect(heartNote(even(6, 330, 150), 98)).toBeUndefined();
  });

  it('writes the line of the row on the log sheet', () => {
    expect(runDetailRowLine(even(6))).toBe('6,00 km in 5:30 per km');
  });
});

describe('the totals of the log', () => {
  // The detail says 6,00 km in 33:00 moving; the log says 6,03 km in 36 minutes.
  const rd = even(6);
  const log = { id: 'l1', durationMinutes: 36, cardioData: { durationMinutes: 36, distanceKm: 6.03 } } as unknown as SessionLog;

  it('follow the log, not the moving time of the detail', () => {
    const t = runTotalsOf(log, rd);
    expect(t).toEqual({ km: 6.03, sec: 2160 });
    expect(t.sec / t.km).toBeCloseTo(358.2, 1);
  });

  it('give a pace that matches time over distance in the header', () => {
    const t = runTotalsOf(log, rd);
    const pace = headlineStats(rd, 'other', t)[0];
    expect(pace.value).toBe('5:58');
    expect(runDetailRowLine(rd, t)).toBe('6,03 km in 5:58 per km');
  });

  it('fall back to the detail when the log has no distance', () => {
    const bare = { id: 'l2', durationMinutes: 0 } as unknown as SessionLog;
    expect(runTotalsOf(bare, rd)).toEqual({ km: 6, sec: rd.movingSec });
  });
});

describe('heart rate zones for the strip', () => {
  it('follows the split on the threshold, with 5 above the top of 4', () => {
    const hr = { lthr: 170 };
    expect(hrZoneOf(100, hr)).toBe(1);
    expect(hrZoneOf(140, hr)).toBe(2);
    expect(hrZoneOf(155, hr)).toBe(3);
    expect(hrZoneOf(165, hr)).toBe(4);
    expect(hrZoneOf(175, hr)).toBe(5);
    expect(hrZoneOf(150, undefined)).toBeUndefined();
    expect(hrZoneOf(null, hr)).toBeUndefined();
  });
});
