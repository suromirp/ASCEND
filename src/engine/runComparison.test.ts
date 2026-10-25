import { describe, it, expect } from 'vitest';
import { baselineOf, comparableLogs, conditionVerdict, median, type ComparisonContext } from './runComparison';
import { EARLIER_DATES, EASY, context, runLog } from './fixtures/runLogs';
import type { SessionLog } from '../models/training';
import type { RunSpec } from './fixtures/runStreams';

// Made-up logs and series only. The subject is an easy run on 2026-10-18; the
// earlier ones lie three days apart before it.
const SUBJECT_DATE = '2026-10-18';
const cool = { tempC: 12, feelsC: 11, windKmh: 10, gustKmh: 18, rainMm: 0, source: 'lookup' as const };

function earlier(count = 4, over: Partial<Parameters<typeof runLog>[0]> = {}, spec = EASY): SessionLog[] {
  return EARLIER_DATES.slice(0, count).map((date, i) => runLog({ id: `e${i}`, date, spec: { ...spec, seed: 10 + i }, conditions: cool, strap: true, ...over }));
}
const subjectLog = (over: Partial<Parameters<typeof runLog>[0]> = {}, spec = EASY) => runLog({ id: 's', date: SUBJECT_DATE, spec: { ...spec, seed: 99 }, conditions: cool, strap: true, ...over });
const compare = (subject: SessionLog, history: SessionLog[], topic: Parameters<typeof comparableLogs>[1] = 'efficiency', over: Partial<ComparisonContext> = {}) =>
  comparableLogs(subject, topic, context([...history, subject], over));

describe('the helpers', () => {
  it('takes the middle value, and a baseline only from three on, at most five', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(baselineOf([10, 11])).toBeUndefined();
    expect(baselineOf([10, 12, 11])).toEqual({ median: 11, n: 3 });
    expect(baselineOf([1, 2, 3, 4, 5, 100, 200])).toEqual({ median: 3, n: 5 });
    // One odd day does not move the middle.
    expect(baselineOf([360, 362, 358, 361, 520])!.median).toBe(361);
  });

  it('reads the weather: the same, able to explain, too different, wind and rain', () => {
    const base = [{ feelsC: 10, source: 'lookup' as const }, { feelsC: 12, source: 'lookup' as const }, { feelsC: 11, source: 'lookup' as const }];
    expect(conditionVerdict({ feelsC: 13, source: 'lookup' }, base)).toBe('same');
    expect(conditionVerdict({ feelsC: 16, source: 'lookup' }, base)).toBe('explains-worse');
    expect(conditionVerdict({ feelsC: 6, source: 'lookup' }, base)).toBe('explains-better');
    expect(conditionVerdict({ feelsC: 22, source: 'lookup' }, base)).toBe('too-different');
    expect(conditionVerdict({ feelsC: 11, windKmh: 27, source: 'lookup' }, base)).toBe('windy');
    expect(conditionVerdict({ feelsC: 11, gustKmh: 45, source: 'lookup' }, base)).toBe('windy');
    expect(conditionVerdict({ feelsC: 11, rainMm: 6, source: 'lookup' }, base)).toBe('rainy');
    expect(conditionVerdict(undefined, base)).toBe('unknown');
    expect(conditionVerdict({ feelsC: 11, source: 'lookup' }, [])).toBe('unknown');
    // Without a feels-like the temperature is used.
    expect(conditionVerdict({ tempC: 17, source: 'lookup' }, base)).toBe('explains-worse');
  });
});

describe('efficiency: which runs are comparable', () => {
  it('takes four similar earlier easy runs, newest first', () => {
    const c = compare(subjectLog(), earlier());
    expect(c.enough).toBe(true);
    expect(c.logs.map((l) => l.id)).toEqual(['e0', 'e1', 'e2', 'e3']);
    expect(c.reasons).toEqual([]);
    expect(c.verdict).toBe('same');
    expect(c.referenceHr).toBe(145);
  });

  it('takes at most five, the newest', () => {
    const many = ['2026-10-16', '2026-10-14', '2026-10-12', '2026-10-10', '2026-10-08', '2026-10-06'].map((date, i) => runLog({ id: `m${i}`, date, spec: { ...EASY, seed: i + 3 }, conditions: cool, strap: true }));
    const c = compare(subjectLog(), many);
    expect(c.logs.map((l) => l.id)).toEqual(['m0', 'm1', 'm2', 'm3', 'm4']);
  });

  it('says too few when there are fewer than three, and keeps what it found', () => {
    const c = compare(subjectLog(), earlier(2));
    expect(c.enough).toBe(false);
    expect(c.logs).toHaveLength(2);
    expect(c.reasons.at(-1)).toEqual({ code: 'tooFew', count: 2 });
  });

  it('looks no further back than six weeks, and not at a later training', () => {
    const old = runLog({ id: 'old', date: '2026-08-20', spec: EASY, conditions: cool, strap: true });
    const later = runLog({ id: 'later', date: '2026-10-19', spec: EASY, conditions: cool, strap: true });
    const c = compare(subjectLog(), [...earlier(3), old, later]);
    expect(c.logs.map((l) => l.id)).toEqual(['e0', 'e1', 'e2']);
  });

  it('leaves out a treadmill run, a run without a profile and a tempo run', () => {
    const history = [
      ...earlier(3),
      runLog({ id: 'band', date: '2026-10-16', spec: EASY, treadmill: true, strap: true }),
      runLog({ id: 'bare', date: '2026-10-14', spec: EASY, noDetail: true, strap: true }),
      runLog({ id: 'tempo', date: '2026-10-13', spec: EASY, templateId: 'tpl_tempo_run', conditions: cool, strap: true }),
    ];
    const c = compare(subjectLog(), history);
    expect(c.logs.map((l) => l.id)).toEqual(['e0', 'e1', 'e2']);
  });

  it('is not comparable at all for a treadmill run, a run without profile or a hilly run', () => {
    expect(compare(subjectLog({ treadmill: true }), earlier()).reasons).toEqual([{ code: 'treadmill' }]);
    expect(compare(subjectLog({ noDetail: true }), earlier()).reasons).toEqual([{ code: 'noDetail' }]);
    const hilly = compare(subjectLog({}, { ...EASY, grade: (m) => 0.06 * Math.sin(m / 3) }), earlier());
    expect(hilly.logs).toEqual([]);
    expect(hilly.reasons[0]).toMatchObject({ code: 'unavailableMetric', metric: 'noSteadyBlock' });
  });

  it('leaves out a run outside the heart rate zone, and a run far from it in pace is fine', () => {
    const hard = runLog({ id: 'hard', date: '2026-10-16', spec: { ...EASY, hr: 168, pace: 320 }, conditions: cool, strap: true });
    const slow = runLog({ id: 'slow', date: '2026-10-14', spec: { ...EASY, pace: 420 }, conditions: cool, strap: true });
    const c = compare(subjectLog(), [...earlier(3), hard, slow]);
    expect(c.logs.map((l) => l.id)).not.toContain('hard');
    expect(c.logs.map((l) => l.id)).toContain('slow');
  });

  it('without zones of its own it takes the runs within 10 beats of this one', () => {
    const away = runLog({ id: 'away', date: '2026-10-16', spec: { ...EASY, hr: 128 }, conditions: cool, strap: true });
    const c = compare(subjectLog(), [...earlier(3), away], 'efficiency', { hr: undefined });
    expect(c.logs.map((l) => l.id)).toEqual(['e0', 'e1', 'e2']);
    expect(c.referenceHr).toBe(142);
  });
});

describe('efficiency: weather', () => {
  it('leaves out runs more than 8 degrees apart and says how much warmer it was', () => {
    const hotSubject = subjectLog({ conditions: { tempC: 24, feelsC: 25, windKmh: 8, source: 'lookup' } });
    const c = compare(hotSubject, earlier());
    expect(c.logs).toEqual([]);
    expect(c.reasons[0]).toMatchObject({ code: 'temperature', count: 4, diffC: 14 });
    expect(c.reasons.at(-1)).toEqual({ code: 'tooFew', count: 0 });
  });

  it('keeps 4 to 8 degrees and says the weather could explain a difference', () => {
    const warm = subjectLog({ conditions: { tempC: 17, feelsC: 17, windKmh: 8, source: 'lookup' } });
    const c = compare(warm, earlier());
    expect(c.enough).toBe(true);
    expect(c.verdict).toBe('explains-worse');
  });

  it('gives no judgement on a windy day or in heavy rain', () => {
    expect(compare(subjectLog({ conditions: { ...cool, windKmh: 30 } }), earlier()).reasons).toEqual([{ code: 'windy' }]);
    expect(compare(subjectLog({ conditions: { ...cool, rainMm: 8 } }), earlier()).reasons).toEqual([{ code: 'rainy' }]);
  });

  it('compares without weather when it is not known, on either side', () => {
    const c = compare(subjectLog({ conditions: undefined }), earlier());
    expect(c.enough).toBe(true);
    expect(c.verdict).toBe('unknown');
    const d = compare(subjectLog(), earlier(4, { conditions: undefined }));
    expect(d.enough).toBe(true);
  });
});

describe('efficiency: legs and the source of the heart rate', () => {
  it('does not compare when the legs were tired: a hard leg day the day before', () => {
    const legDay: SessionLog = {
      id: 'legs', templateId: 'tpl_lower_a', type: 'strength', completedDate: '2026-10-17', completedAt: '2026-10-17T18:00:00.000Z',
      variant: 'full', durationMinutes: 60, rpe: 8, source: 'manual',
    };
    const c = compare(subjectLog(), [...earlier(), legDay]);
    expect(c.logs).toEqual([]);
    expect(c.reasons).toEqual([{ code: 'legsTired' }]);
  });

  it('leaves out an earlier run that followed a long run or a leg day', () => {
    const longRun = runLog({ id: 'long', date: '2026-10-14', spec: { ...EASY, minutes: 75 }, conditions: cool, strap: true });
    const after = runLog({ id: 'after', date: '2026-10-15', spec: EASY, conditions: cool, strap: true });
    const c = compare(subjectLog(), [...earlier(3).filter((l) => l.id !== 'e0'), longRun, after, runLog({ id: 'e0b', date: '2026-10-10', spec: EASY, conditions: cool, strap: true })]);
    expect(c.logs.map((l) => l.id)).not.toContain('after');
  });

  it('with the strap switch on, every run counts as measured by the strap', () => {
    const mixed = [...earlier(3), runLog({ id: 'wrist', date: '2026-10-16', spec: EASY, conditions: cool, strap: false })];
    expect(compare(subjectLog(), mixed).logs.map((l) => l.id)).toContain('wrist');
  });

  it('with the strap switch off, only runs with the same sign of a strap are compared', () => {
    const mixed = [...earlier(3), runLog({ id: 'wrist', date: '2026-10-16', spec: EASY, conditions: cool, strap: false })];
    const withStrap = compare(subjectLog(), mixed, 'efficiency', { chestStrap: false });
    expect(withStrap.logs.map((l) => l.id)).toEqual(['e0', 'e1', 'e2']);
    const wristOnly = compare(subjectLog({ strap: false }), earlier(4, { strap: false }), 'efficiency', { chestStrap: false });
    expect(wristOnly.enough).toBe(true);
    const crossed = compare(subjectLog({ strap: false }), earlier(4), 'efficiency', { chestStrap: false });
    expect(crossed.enough).toBe(false);
    expect(crossed.reasons[0]).toMatchObject({ code: 'heartRateSource', count: 4 });
  });
});

describe('drift: only long runs', () => {
  const long = { ...EASY, minutes: 80 };
  it('compares a long run with earlier long runs and leaves out short ones', () => {
    const history = [
      ...[0, 1, 2].map((i) => runLog({ id: `l${i}`, date: ['2026-10-04', '2026-10-08', '2026-10-12'][i], spec: { ...long, seed: i + 3 }, conditions: cool, strap: true, templateId: 'tpl_long_run' })),
      runLog({ id: 'short', date: '2026-10-15', spec: EASY, conditions: cool, strap: true }),
    ];
    const c = compare(subjectLog({ templateId: 'tpl_long_run' }, long), history, 'drift');
    expect(c.logs.map((l) => l.id).sort()).toEqual(['l0', 'l1', 'l2']);
    expect(c.logs.map((l) => l.id)).not.toContain('short');
    expect(compare(subjectLog(), history, 'drift').reasons[0]).toMatchObject({ code: 'unavailableMetric', metric: 'tooShort' });
  });
});

describe('form: runs of about the same pace', () => {
  const spec = { ...EASY, minutes: 50, stanceTimeMs: 240, stepLengthM: 1.1 };
  it('takes the runs within 6 percent of the pace of this one', () => {
    const history = [
      ...[0, 1, 2].map((i) => runLog({ id: `f${i}`, date: EARLIER_DATES[i], spec: { ...spec, seed: i + 5 }, conditions: cool, strap: true })),
      runLog({ id: 'quick', date: '2026-10-16', spec: { ...spec, pace: 300 }, conditions: cool, strap: true }),
    ];
    const c = compare(subjectLog({}, spec), history, 'form');
    expect(c.logs.map((l) => l.id)).not.toContain('quick');
    expect(c.enough).toBe(true);
  });
});

describe('climb and descent: the same terrain and the same pack', () => {
  const hikeSpec: RunSpec = {
    minutes: 90, pace: (m: number) => (m >= 15 && m < 45 ? 780 : 560), grade: (m: number) => (m < 15 ? 0 : m < 45 ? 0.12 : 0),
    hr: (m: number) => (m >= 15 && m < 45 ? 150 : 115), baroNoise: 0.8,
  };
  const hike = (id: string, date: string, packKg: number, spec = hikeSpec) => runLog({ id, date, spec: { ...spec, seed: id.length + 7 }, templateId: 'tpl_mountain_hike', packKg, conditions: cool });

  it('takes earlier climbs in the same gradient class with a pack within 2 kg', () => {
    const history = [hike('h0', '2026-10-04', 8), hike('h1', '2026-10-08', 9), hike('h2', '2026-10-12', 8.5), hike('heavy', '2026-10-14', 14)];
    const c = compare(hike('hs', SUBJECT_DATE, 8), history, 'climb');
    expect(c.logs.map((l) => l.id)).not.toContain('heavy');
    expect(c.logs).toHaveLength(3);
    expect(c.enough).toBe(true);
  });

  it('leaves out a climb of another gradient class', () => {
    const gentle: RunSpec = { ...hikeSpec, grade: (m: number) => (m < 15 ? 0 : m < 45 ? 0.05 : 0), pace: (m: number) => (m >= 15 && m < 45 ? 600 : 560) };
    const history = [hike('g0', '2026-10-04', 8, gentle), hike('g1', '2026-10-08', 8, gentle), hike('g2', '2026-10-12', 8, gentle)];
    const c = compare(hike('hs', SUBJECT_DATE, 8), history, 'climb');
    expect(c.logs).toEqual([]);
    expect(c.reasons[0]).toMatchObject({ code: 'noMatch', count: 3 });
  });

  it('is not comparable on a hike without a climb', () => {
    const flat = runLog({ id: 'flat', date: SUBJECT_DATE, spec: { ...EASY, minutes: 60 }, templateId: 'tpl_mountain_hike', conditions: cool });
    expect(compare(flat, [], 'climb').reasons[0]).toMatchObject({ code: 'unavailableMetric', metric: 'noStretch' });
  });
});
