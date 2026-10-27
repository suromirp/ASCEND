import { describe, it, expect } from 'vitest';
import { insightRows, pacingKindOf, runInsight, mainReason, reasonText, topicsFor, type RunInsightInput, type ShownInsight } from './runInsight';
import { EARLIER_DATES, EASY, TEMPLATES, context, runLog } from './fixtures/runLogs';
import type { RunSpec } from './fixtures/runStreams';
import type { SessionLog } from '../models/training';
import { buildRunDetail } from './runDetail';
import { fastStartTest, segmentRun } from './fixtures/testRun';

// Made-up logs and series only. The subject is a run on 2026-10-18.
const DATE = '2026-10-18';
const TODAY = '2026-10-19';
const cool = { tempC: 12, feelsC: 11, windKmh: 10, gustKmh: 18, rainMm: 0, source: 'lookup' as const };

type RunOpts = Parameters<typeof runLog>[0];
const earlierLogs = (spec: RunSpec, over: Partial<RunOpts> = {}, dates = EARLIER_DATES): SessionLog[] =>
  dates.map((date, i) => runLog({ id: `e${i}`, date, spec: { ...spec, seed: 10 + i }, conditions: cool, strap: true, ...over }));
const subjectOf = (spec: RunSpec, over: Partial<RunOpts> = {}) => runLog({ id: 's', date: DATE, spec: { ...spec, seed: 99 }, conditions: cool, strap: true, ...over });

function insight(subject: SessionLog, history: SessionLog[], over: Partial<RunInsightInput> = {}) {
  const logs = [...history, subject];
  const ctx = context(logs);
  return runInsight({
    log: subject, logs, templates: TEMPLATES, program: null, hr: ctx.hr, legs: ctx.legs,
    settings: undefined, detailsOn: true, today: TODAY, ...over,
  });
}

describe('an easy run: efficiency', () => {
  it('says Beter, in plain words, when the pace at the same heart rate was clearly faster', () => {
    const r = insight(subjectOf({ ...EASY, pace: 338 }), earlierLogs(EASY));
    expect(r.better).toBeDefined();
    expect(r.better!.topic).toBe('efficiency');
    expect(r.better!.word).toBe('Beter');
    expect(r.better!.text).toMatch(/^Bij dezelfde hartslag liep je \d+ seconden per km sneller dan je laatste vier rustige loopjes\.$/);
    const seconds = Number(/liep je (\d+) seconden/.exec(r.better!.text)![1]);
    expect(seconds).toBeGreaterThanOrEqual(20);
    expect(seconds).toBeLessThanOrEqual(24);
    expect(r.better!.strength).toBeGreaterThan(1.5);
    expect(r.watch).toBeUndefined();
    expect(r.note).toBeUndefined();
    // No "fitter": that word is for the trend over weeks.
    expect(r.better!.text.toLowerCase()).not.toContain('fitter');
    expect(r.better!.meaning.toLowerCase()).toContain('geen fitheid');
  });

  it('gives the sheet what it needs: the figures, the dots, the basis and the strength in words', () => {
    const r = insight(subjectOf({ ...EASY, pace: 338 }), earlierLogs(EASY));
    const l = r.better!;
    expect(l.figures.today).toMatch(/^5:\d\d per km$/);
    expect(l.figures.middle).toBe('5:52 per km');
    expect(l.figures.difference).toMatch(/^\d+ s per km sneller$/);
    expect(l.series).toHaveLength(5);
    expect(l.series.filter((p) => p.current)).toHaveLength(1);
    expect(l.series.at(-1)!.current).toBe(true);
    expect(l.basis.logIds).toHaveLength(4);
    expect(l.basis.criteria[0]).toBe('4 rustige loopjes in de laatste 6 weken');
    expect(l.basis.criteria).toContain('vlak en rustig');
    expect(l.basis.criteria).toContain('hartslag rond 142');
    expect(l.basis.criteria).toContain('rond 12 graden');
    expect(l.strengthText).toMatch(/schommelt zelf zo'n 3 tot 4 procent/);
    expect(l.strengthText).toMatch(/ruim anderhalf keer zo groot|ruim twee keer zo groot|meer dan drie keer zo groot/);
  });

  it('says Let op with one small thing to do when it was clearly slower', () => {
    const r = insight(subjectOf({ ...EASY, pace: 382 }), earlierLogs(EASY));
    expect(r.watch!.topic).toBe('efficiency');
    expect(r.watch!.word).toBe('Let op');
    expect(r.watch!.text).toContain('trager');
    expect(r.watch!.text).toContain('kijk of je benen moe waren');
    expect(r.better).toBeUndefined();
  });

  it('says nothing about a small difference, only that it is equal to the last ones', () => {
    const r = insight(subjectOf({ ...EASY, pace: 355 }), earlierLogs(EASY));
    expect(r.better).toBeUndefined();
    expect(r.watch).toBeUndefined();
    expect(r.note).toBe('Gelijk aan je laatste loopjes.');
  });

  it('is not moved by noise inside the spread of the measure: no false verdict', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const subject = runLog({ id: 's', date: DATE, spec: { ...EASY, hrNoise: 2.5, baroNoise: 1.2, seed }, conditions: cool, strap: true });
      const history = earlierLogs({ ...EASY, hrNoise: 2.5, baroNoise: 1.2 });
      const r = insight(subject, history);
      expect(r.better).toBeUndefined();
      expect(r.watch).toBeUndefined();
    }
  });

  it('says why it cannot compare when there are too few earlier runs', () => {
    const r = insight(subjectOf(EASY), earlierLogs(EASY, {}, EARLIER_DATES.slice(0, 2)));
    expect(r.better).toBeUndefined();
    expect(r.note).toBe('Niet te vergelijken met je laatste loopjes: er zijn nog te weinig vergelijkbare loopjes.');
    const none = insight(subjectOf(EASY), []);
    expect(none.note).toBe('Niet te vergelijken met je laatste loopjes: er zijn nog geen vergelijkbare loopjes.');
  });
});

describe('weather', () => {
  const faster = { ...EASY, pace: 338 };
  const slower = { ...EASY, pace: 382 };

  it('says how much warmer it was when that took the earlier runs out', () => {
    const hot = { tempC: 23, feelsC: 22, windKmh: 8, source: 'lookup' as const };
    const r = insight(subjectOf(EASY, { conditions: hot }), earlierLogs(EASY));
    expect(r.note).toBe('Niet te vergelijken met je laatste loopjes: het was 11 graden warmer.');
  });

  it('gives no Let op when the warmth can explain a slower run, only the sentence about it', () => {
    const warm = { tempC: 18, feelsC: 18, windKmh: 8, source: 'lookup' as const };
    const r = insight(subjectOf(slower, { conditions: warm }), earlierLogs(EASY));
    expect(r.watch).toBeUndefined();
    expect(r.note).toBe('Het was 7 graden warmer dan bij je laatste loopjes. Dat kan het verschil verklaren.');
  });

  it('keeps a Beter when it was faster in spite of the warmth, and a Let op when slower in the cold', () => {
    const warm = { tempC: 18, feelsC: 18, windKmh: 8, source: 'lookup' as const };
    expect(insight(subjectOf(faster, { conditions: warm }), earlierLogs(EASY)).better).toBeDefined();
    const cold = { tempC: 5, feelsC: 4, windKmh: 8, source: 'lookup' as const };
    expect(insight(subjectOf(slower, { conditions: cold }), earlierLogs(EASY)).watch).toBeDefined();
  });

  it('gives no verdict about pace on a windy day', () => {
    const r = insight(subjectOf(slower, { conditions: { ...cool, windKmh: 31 } }), earlierLogs(EASY));
    expect(r.watch).toBeUndefined();
    expect(r.note).toBe('Niet te vergelijken met je laatste loopjes: het woei veel.');
  });
});

describe('what gives nothing at all', () => {
  const history = earlierLogs(EASY);
  it('a tempo run, a treadmill run and a run without profile', () => {
    expect(insight(subjectOf(EASY, { templateId: 'tpl_tempo_run' }), history)).toEqual({});
    expect(insight(subjectOf(EASY, { treadmill: true }), history)).toEqual({});
    expect(insight(subjectOf(EASY, { noDetail: true }), history)).toEqual({});
  });

  it('the switches: all off, a topic off, the details switch off', () => {
    const subject = subjectOf({ ...EASY, pace: 338 });
    expect(insight(subject, history, { settings: { enabled: false } })).toEqual({});
    expect(insight(subject, history, { detailsOn: false })).toEqual({});
    expect(insight(subject, history, { settings: { topics: { efficiency: false, form: false } } })).toEqual({});
    expect(insight(subject, history, { settings: { topics: { form: false } } }).better).toBeDefined();
  });

  it('chooses the topics by the kind of training', () => {
    const ctx = context([]);
    expect(topicsFor(subjectOf(EASY), ctx)).toEqual(['efficiency', 'form']);
    expect(topicsFor(subjectOf({ ...EASY, minutes: 80 }, { templateId: 'tpl_long_run' }), ctx)).toEqual(['drift', 'efficiency', 'form']);
    expect(topicsFor(subjectOf(EASY, { templateId: 'tpl_intervals' }), ctx)).toEqual([]);
  });
});

describe('Let op is quiet when something is already said', () => {
  it('after Slechter for the feeling or a pain report', () => {
    const slow = subjectOf({ ...EASY, pace: 382 });
    const history = earlierLogs(EASY);
    expect(insight({ ...slow, subjectiveFeel: 'worse' }, history).watch).toBeUndefined();
    expect(insight({ ...slow, painAreas: ['Knie'] }, history).watch).toBeUndefined();
    expect(insight({ ...slow, subjectiveFeel: 'better' }, history).watch).toBeDefined();
  });
});

describe('the brake against repeating', () => {
  const subject = subjectOf({ ...EASY, pace: 338 });
  const history = earlierLogs(EASY);
  const shown = (over: Partial<ShownInsight> = {}): ShownInsight => ({ logId: 'other', topic: 'efficiency', tone: 'better', date: '2026-10-12', strength: 1.6, ...over });

  it('holds the same topic with the same tone for 14 days unless it is half a unit further', () => {
    expect(insight(subject, history, { shown: [shown()] }).better).toBeUndefined();
    expect(insight(subject, history, { shown: [shown({ date: '2026-09-30' })] }).better).toBeDefined();
    expect(insight(subject, history, { shown: [shown({ strength: 0.4 })] }).better).toBeDefined();
    expect(insight(subject, history, { shown: [shown({ tone: 'watch' })] }).better).toBeDefined();
    // The line of this very training is never held back by its own record.
    expect(insight(subject, history, { shown: [shown({ logId: 's' })] }).better).toBeDefined();
  });
});

describe('a long run: drift', () => {
  const long = { ...EASY, minutes: 85 };
  const steady = (m: number) => (m < 45 ? 140 : 141);
  const drifting = (m: number) => (m < 45 ? 140 : 148);
  const longLogs = (hr: (m: number) => number) =>
    ['2026-10-02', '2026-10-06', '2026-10-10', '2026-10-14'].map((date, i) => runLog({ id: `l${i}`, date, spec: { ...long, hr, seed: i + 3 }, templateId: 'tpl_long_run', conditions: cool, strap: true }));
  const subjectLong = (hr: (m: number) => number) => runLog({ id: 's', date: DATE, spec: { ...long, hr, seed: 99 }, templateId: 'tpl_long_run', conditions: cool, strap: true });

  it('says Beter when the drift was clearly lower than in the last long runs', () => {
    const r = insight(subjectLong(steady), longLogs(drifting));
    expect(r.better?.topic).toBe('drift');
    expect(r.better!.text).toMatch(/^Je tempo per hartslag zakte in de tweede helft [\d,]+ procent, tegen [\d,]+ procent bij je laatste vier lange loopjes\.$/);
    expect(r.better!.figures.difference).toMatch(/procentpunt lager$/);
  });

  it('says Let op, with something to do, when it is over 8 percent and well above the last ones', () => {
    const r = insight(subjectLong((m) => (m < 45 ? 140 : 158)), longLogs(steady));
    expect(r.watch?.topic).toBe('drift');
    expect(r.watch!.text).toContain('Eet en drink bij een lange loop eerder');
  });

  it('says nothing about a small difference', () => {
    const r = insight(subjectLong((m) => (m < 45 ? 140 : 143)), longLogs(steady));
    expect(r.better?.topic).not.toBe('drift');
    expect(r.watch?.topic).not.toBe('drift');
  });

  it('gives at most one line per topic and at most two lines', () => {
    // Faster at the same heart rate (Beter) and a drift well above the others (Let op).
    const subject = runLog({ id: 's', date: DATE, spec: { ...long, pace: 335, hr: (m) => (m < 45 ? 140 : 158), seed: 99 }, templateId: 'tpl_long_run', conditions: cool, strap: true });
    const r = insight(subject, longLogs(steady));
    const lines = [r.better, r.watch, r.fact].filter(Boolean);
    expect(lines.length).toBeLessThanOrEqual(2);
    expect(new Set(lines.map((l) => l!.topic)).size).toBe(lines.length);
  });
});

describe('a tocht: climbing and descending', () => {
  const grade = (m: number) => (m < 15 ? 0 : m < 45 ? 0.12 : m < 60 ? 0 : m < 85 ? -0.1 : 0);
  const hike = (pace: number, over: { hr?: number; descentSlow?: boolean } = {}): RunSpec => ({
    minutes: 90,
    pace: (m) => (m >= 15 && m < 45 ? pace : m >= 60 && m < 85 && over.descentSlow ? 500 + (m - 60) * 14 : 560),
    grade,
    hr: (m) => (m >= 15 && m < 45 ? (over.hr ?? 150) : 115),
    cadence: (m) => (m >= 60 && m < 85 && over.descentSlow ? 112 - (m - 60) * 0.7 : 100),
    baroNoise: 0.8,
  });
  const hikes = (spec: RunSpec) => ['2026-10-02', '2026-10-06', '2026-10-10', '2026-10-14'].map((date, i) => runLog({ id: `h${i}`, date, spec: { ...spec, seed: i + 3 }, templateId: 'tpl_mountain_hike', packKg: 8, conditions: cool }));
  const subjectHike = (spec: RunSpec, packKg = 8) => runLog({ id: 's', date: DATE, spec: { ...spec, seed: 99 }, templateId: 'tpl_mountain_hike', packKg, conditions: cool });

  it('says Beter when the climb was clearly faster at the same heart rate', () => {
    const r = insight(subjectHike(hike(690)), hikes(hike(780)));
    expect(r.better?.topic).toBe('climb');
    expect(r.better!.text).toMatch(/^Je klom \d+ procent sneller, \d+ meter per uur tegen \d+, bij dezelfde hartslag\.$/);
    expect(r.better!.basis.criteria).toContain('rugzak binnen 2 kg');
  });

  it('says Beter at the same speed with a clearly lower heart rate', () => {
    const r = insight(subjectHike(hike(780, { hr: 141 })), hikes(hike(780)));
    expect(r.better?.topic).toBe('climb');
    expect(r.better!.text).toContain('met een hartslag die');
    expect(r.better!.text).toContain('slagen lager lag');
  });

  it('says Let op when the climb was clearly slower with a higher heart rate, and nothing for a mere difference', () => {
    const r = insight(subjectHike(hike(880, { hr: 156 })), hikes(hike(780)));
    expect(r.watch?.topic).toBe('climb');
    expect(r.watch!.text).toContain('trager');
    const same = insight(subjectHike(hike(775)), hikes(hike(780)));
    expect(same.better).toBeUndefined();
    expect(same.note).toBe('Gelijk aan je laatste tochten.');
  });

  it('does not compare with a climb under a much heavier pack', () => {
    const r = insight(subjectHike(hike(690), 15), hikes(hike(780)));
    expect(r.better).toBeUndefined();
    expect(r.note).toContain('Niet te vergelijken met je laatste tochten');
  });

  it('gives a descent as a fact, without a verdict, when the last third slowed with no rise in heart rate', () => {
    const r = insight(subjectHike(hike(780, { descentSlow: true })), hikes(hike(780)));
    expect(r.fact?.topic).toBe('descent');
    expect(r.fact!.tone).toBe('fact');
    expect(r.fact!.word).toBe('Bergaf');
    expect(r.fact!.text).toMatch(/^Bergaf ging je laatste derde \d+ procent trager zonder dat je hartslag steeg\. Dat past bij moe worden in de benen\.$/);
    expect(r.watch).toBeUndefined();
    expect(r.better).toBeUndefined();
  });
});

describe('form inside one run', () => {
  const base: RunSpec = { ...EASY, minutes: 60, stanceTimeMs: 240, stepLengthM: 1.1 };
  it('gives a Let op when two signs agree, bij gelijk tempo', () => {
    const subject = subjectOf({ ...base, stanceTimeMs: (m) => 238 + m * 0.4, stepLengthM: (m) => 1.12 - m * 0.0012 });
    const r = insight(subject, earlierLogs(base));
    expect(r.watch?.topic).toBe('form');
    expect(r.watch!.text).toMatch(/^Aan het eind stond je \d+ ms langer op de grond en werd je pas \d+ cm korter bij gelijk tempo\./);
  });

  it('is silent when the form holds', () => {
    const r = insight(subjectOf(base), earlierLogs(base));
    expect(r.watch).toBeUndefined();
  });

  it('needs more than twice the threshold when only one sign shows', () => {
    const one = insight(subjectOf({ ...base, stanceTimeMs: (m) => 240 + m * 0.25 }), earlierLogs(base));
    expect(one.watch).toBeUndefined();
    const big = insight(subjectOf({ ...base, stanceTimeMs: (m) => 240 + m * 0.8 }), earlierLogs(base));
    expect(big.watch?.topic).toBe('form');
  });
});

describe('the reasons in words', () => {
  it('picks the reason that took most runs out, and too few when there just were not many', () => {
    expect(mainReason([{ code: 'temperature', count: 4, diffC: 11 }, { code: 'tooFew', count: 0 }])).toMatchObject({ code: 'temperature' });
    expect(mainReason([{ code: 'noDetail', count: 1 }, { code: 'tooFew', count: 2 }])).toMatchObject({ code: 'tooFew' });
    expect(mainReason([])).toBeUndefined();
  });

  it('are plain sentences without dashes', () => {
    const all = [
      reasonText({ code: 'temperature', diffC: -9 }, 'loopjes'), reasonText({ code: 'legsTired' }, 'loopjes'), reasonText({ code: 'heartRateSource' }, 'loopjes'),
      reasonText({ code: 'unavailableMetric', metric: 'noSteadyBlock' }, 'loopjes'), reasonText({ code: 'noMatch' }, 'tochten'),
    ];
    expect(all[0]).toBe('het was 9 graden kouder');
    for (const t of all) expect(t).not.toMatch(/[–—]/);
  });
});

describe('the one line after a test, a tempo run or an interval training', () => {
  const OPTS = { logKm: 6.6, logMinutes: 38, builtAt: '2026-10-27T10:00:00.000Z' };
  const withDetail = (templateId: string, runDetail: SessionLog['runDetail'], over: Partial<SessionLog> = {}): SessionLog => ({
    ...runLog({ id: 'h', date: DATE, spec: { minutes: 38, pace: 345, hr: 165 }, templateId, strap: true }),
    cardioData: { durationMinutes: 38, distanceKm: 6.6, source: 'garmin' },
    durationMinutes: 38,
    runDetail,
    ...over,
  });

  it('a test gets the advice about its start, and no Beter or Let op', () => {
    const r = insight(withDetail('tpl_test_run', buildRunDetail(fastStartTest(), OPTS)), []);
    expect(r.pacing).toBe('Begin de volgende test op 5:45 per km, dat is 23 seconden per km rustiger dan je eerste kilometer vandaag. Gelijkmatig lopen is meestal het snelst.');
    expect(r.better).toBeUndefined();
    expect(r.watch).toBeUndefined();
    expect(r.pacing).not.toMatch(/[\u2013\u2014!]/);
  });

  it('a tempo run gets one line only when the last block faded by 4 percent or more', () => {
    const laps = [
      { startSec: 0, endSec: 450, kind: 'work' as const },
      { startSec: 450, endSec: 915, kind: 'work' as const },
    ];
    const run = (paces: number[]) => buildRunDetail(segmentRun(paces.map((pace) => ({ m: 1500, pace }))), { ...OPTS, laps: laps.slice(0, paces.length).map((l, i) => ({ ...l, startSec: i * 450, endSec: i * 450 + (1500 * paces[i]) / 1000 })), bestKm: null });
    expect(insight(withDetail('tpl_tempo_run', run([300, 318])), []).pacing).toBe('Het laatste blok was 18 seconden per km trager dan het eerste.');
    expect(insight(withDetail('tpl_tempo_run', run([300, 304])), []).pacing).toBeUndefined();
  });

  it('an easy run gets none, a stale or missing one gets none, and the switch off gives nothing', () => {
    const rd = buildRunDetail(fastStartTest(), OPTS);
    expect(insight(withDetail('tpl_easy_run', rd), []).pacing).toBeUndefined();
    expect(insight(withDetail('tpl_test_run', rd, { cardioData: { durationMinutes: 38, distanceKm: 6.7, source: 'garmin' } }), []).pacing).toBeUndefined();
    expect(insight(withDetail('tpl_test_run', undefined), []).pacing).toBeUndefined();
    expect(insight(withDetail('tpl_test_run', rd), [], { detailsOn: false })).toEqual({});
    expect(insight(withDetail('tpl_test_run', rd), [], { settings: { enabled: false } })).toEqual({});
  });

  it('a test without a profile of 48 pieces still has its line', () => {
    const rd = buildRunDetail(fastStartTest(), OPTS);
    const noProfile = withDetail('tpl_test_run', rd, { detail: undefined });
    expect(insight(noProfile, []).pacing).toContain('Begin de volgende test');
  });
});

describe('the rows of the card', () => {
  const line = (topic: 'efficiency' | 'drift', tone: 'better' | 'watch' | 'fact') => ({ topic, tone }) as unknown as NonNullable<ReturnType<typeof runInsight>['better']>;
  it('puts the pace line in the place of Let op, after Beter, at most two', () => {
    const rows = insightRows({ better: line('efficiency', 'better'), watch: line('drift', 'watch'), pacing: 'Het laatste blok was 18 seconden per km trager dan het eerste.' });
    expect(rows).toHaveLength(2);
    expect(rows[0].kind).toBe('line');
    expect(rows[1]).toEqual({ kind: 'pacing', word: 'Verdeling', text: 'Het laatste blok was 18 seconden per km trager dan het eerste.' });
  });
  it('shows a log with only the pace line', () => {
    expect(insightRows({ pacing: 'Gelijkmatig.' })).toEqual([{ kind: 'pacing', word: 'Verdeling', text: 'Gelijkmatig.' }]);
  });
  it('without the pace line it is Beter and Let op as before', () => {
    expect(insightRows({ better: line('efficiency', 'better'), watch: line('drift', 'watch'), fact: line('drift', 'fact') })).toHaveLength(2);
    expect(insightRows({})).toEqual([]);
  });
});

describe('which trainings have blocks', () => {
  it('reads the role on the template, not a list of ids', () => {
    const own = [{ ...TEMPLATES.find((t) => t.id === 'tpl_easy_run')!, id: 'tpl_eigen', roles: ['blocks' as const] }];
    expect(pacingKindOf({ templateId: 'tpl_eigen' } as SessionLog, own)).toBe('blocks');
    expect(pacingKindOf({ templateId: 'tpl_tempo_run' } as SessionLog, TEMPLATES)).toBe('blocks');
    expect(pacingKindOf({ templateId: 'tpl_easy_run' } as SessionLog, TEMPLATES)).toBeUndefined();
  });
});
