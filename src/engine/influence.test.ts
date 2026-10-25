import { describe, it, expect } from 'vitest';
import type { InfluenceEntry } from '../models/influence';
import type { RecoveryMetric } from '../models/metrics';
import type { SessionLog } from '../models/training';
import { EARLIER_DATES, EASY, TEMPLATES, context, runLog } from './fixtures/runLogs';
import { aerobicTrend } from './aerobicTrend';
import { comparableLogs } from './runComparison';
import { runInsight } from './runInsight';
import { baselineValues, todayWellness } from './wellnessCheck';
import {
  affectedMorning,
  applyChange,
  blankEntry,
  chipsWithout,
  deviationSentence,
  entryForDay,
  entryForLog,
  excludedLogIds,
  excludedMornings,
  heartRateDeviation,
  isNoted,
  knownFacts,
  markSeen,
  reasonsText,
  setAmount,
  setExclude,
  setLabel,
  signState,
  toggleReason,
} from './influence';
import { REASON_CHIPS } from '../data/influenceReasons';
import { addDays } from '../utils/dates';

// Made-up logs and nights only. The subject run is on 2026-10-18, the earlier ones lie three days apart before it.
const SUBJECT_DATE = '2026-10-18';
const cool = { tempC: 12, feelsC: 11, windKmh: 10, gustKmh: 18, rainMm: 0, source: 'lookup' as const };
const earlier = () => EARLIER_DATES.map((date, i) => runLog({ id: `e${i}`, date, spec: { ...EASY, seed: 10 + i }, conditions: cool, strap: true }));
const subject = (hr: number, over: Partial<Parameters<typeof runLog>[0]> = {}) => runLog({ id: 's', date: SUBJECT_DATE, spec: { ...EASY, hr, seed: 99 }, conditions: cool, strap: true, ...over });
const ctxOf = (logs: SessionLog[], over = {}) => context(logs, over);

const note = (over: Partial<InfluenceEntry> = {}): InfluenceEntry => ({ id: 'n1', date: '2026-10-24', reasons: [], updatedAt: '2026-10-25T08:00:00.000Z', ...over });

describe('affectedMorning', () => {
  it('is the day itself for a training and the day after for a day', () => {
    expect(affectedMorning(note({ logId: 'l1', date: '2026-10-24' }))).toBe('2026-10-24');
    expect(affectedMorning(note({ date: '2026-10-24' }))).toBe('2026-10-25');
    expect(affectedMorning(note({ date: '2026-10-31' }))).toBe('2026-11-01');
  });
});

describe('what does not count', () => {
  const list = [
    note({ id: 'a', logId: 'l1', excludeHeartRate: true }),
    note({ id: 'b', logId: 'l2', reasons: [{ reason: 'stress' }] }),
    note({ id: 'c', date: '2026-10-20', excludeHeartRate: true }),
    note({ id: 'd', date: '2026-10-22', reasons: [{ reason: 'wiet' }] }),
  ];
  it('lists the trainings with the switch on', () => {
    expect([...excludedLogIds(list)]).toEqual(['l1']);
    expect(excludedLogIds(undefined).size).toBe(0);
  });
  it('lists the mornings after a day with the switch on, not those of a training', () => {
    expect([...excludedMornings(list)]).toEqual(['2026-10-21']);
  });
});

describe('heartRateDeviation', () => {
  it('says nothing for a heart rate like the earlier runs', () => {
    const s = subject(143);
    expect(heartRateDeviation(s, ctxOf([...earlier(), s]))).toBeUndefined();
  });

  it('gives the difference in beats, the pace and the dots for a clearly higher heart rate', () => {
    const s = subject(150);
    const d = heartRateDeviation(s, ctxOf([...earlier(), s]))!;
    expect(d).toBeDefined();
    expect(d.deltaBpm).toBeGreaterThanOrEqual(6);
    expect(d.deltaBpm).toBeLessThanOrEqual(9);
    expect(d.strength).toBeLessThanOrEqual(-1.5);
    expect(d.paceSec).toBeGreaterThan(340);
    expect(d.paceSec).toBeLessThan(380);
    expect(d.points).toHaveLength(5);
    expect(d.points.filter((p) => p.current)).toHaveLength(1);
    expect(d.points.at(-1)!.value).toBeGreaterThan(d.band.high);
    d.points.slice(0, -1).forEach((p) => {
      expect(p.value).toBeGreaterThan(d.band.low);
      expect(p.value).toBeLessThan(d.band.high);
    });
    expect(d.basisText).toBe('Vergeleken met je vier rustige loopjes op ongeveer dit tempo.');
    expect(deviationSentence(d)).toMatch(/^Hartslag \d+ slagen hoger dan normaal bij dit tempo$/);
  });

  it('uses the same earlier runs as the loopinzicht and the same limit of 1,5 times the noise', () => {
    const s = subject(150);
    const logs = [...earlier(), s];
    const d = heartRateDeviation(s, ctxOf(logs))!;
    expect(d.basisLogIds).toEqual(comparableLogs(s, 'efficiency', ctxOf(logs)).logs.map((l) => l.id));
    // A higher heart rate at the same pace is a slower pace at the same heart rate: the insight sees it too.
    const insight = runInsight({ log: s, logs, templates: TEMPLATES, program: null, hr: ctxOf(logs).hr, legs: ctxOf(logs).legs, settings: undefined, detailsOn: true, today: '2026-10-19' });
    expect(insight.watch?.topic).toBe('efficiency');
    expect(Math.abs(insight.watch!.strength)).toBeCloseTo(Math.abs(d.strength), 5);
  });

  it('says lower for a lower heart rate', () => {
    const s = subject(134);
    const d = heartRateDeviation(s, ctxOf([...earlier(), s]));
    // Below zone 2 by more than 15 beats is not comparable; 134 is inside the 15 under it.
    expect(d?.deltaBpm ?? -1).toBeLessThan(0);
    expect(deviationSentence(d!)).toMatch(/lager dan normaal/);
  });

  it('gives nothing with too few earlier runs, on a treadmill, or for strength', () => {
    const s = subject(150);
    expect(heartRateDeviation(s, ctxOf([...earlier().slice(0, 2), s]))).toBeUndefined();
    const belt = subject(150, { treadmill: true });
    expect(heartRateDeviation(belt, ctxOf([...earlier(), belt]))).toBeUndefined();
    const strength: SessionLog = { id: 'k', templateId: 'tpl_upper_a', type: 'strength', completedDate: SUBJECT_DATE, completedAt: `${SUBJECT_DATE}T18:00:00.000Z`, variant: 'full', durationMinutes: 50, source: 'manual' };
    expect(heartRateDeviation(strength, ctxOf([...earlier(), strength]))).toBeUndefined();
  });

  it('does not use a training that is set to not count as a comparison', () => {
    const s = subject(150);
    const logs = [...earlier(), s];
    const withAll = comparableLogs(s, 'efficiency', ctxOf(logs));
    expect(withAll.enough).toBe(true);
    const without = comparableLogs(s, 'efficiency', ctxOf(logs, { excludedLogIds: new Set(['e0']) }));
    expect(without.logs.map((l) => l.id)).toEqual(['e1', 'e2', 'e3']);
    // With two left it cannot be compared any more.
    expect(heartRateDeviation(s, ctxOf(logs, { excludedLogIds: new Set(['e0', 'e1']) }))).toBeUndefined();
    // The leg index still sees the excluded run: the ctx.logs are the same.
    expect(ctxOf(logs, { excludedLogIds: new Set(['e0']) }).legs.logs).toHaveLength(5);
  });

  it('keeps the rest the same when an excluded run was not in the comparison anyway', () => {
    const s = subject(150);
    const logs = [...earlier(), s];
    const a = heartRateDeviation(s, ctxOf(logs))!;
    const b = heartRateDeviation(s, ctxOf(logs, { excludedLogIds: new Set(['unrelated']) }))!;
    expect(b.deltaBpm).toBe(a.deltaBpm);
    expect(b.basisLogIds).toEqual(a.basisLogIds);
  });
});

describe('an excluded run in Tempo bij zone 2', () => {
  const hr = { lthr: 170, restingHr: 50 };
  const logs = [
    runLog({ id: 'a', date: '2026-10-05', spec: { ...EASY, pace: 360 } }),
    runLog({ id: 'b', date: '2026-10-12', spec: { ...EASY, pace: 330 } }),
    runLog({ id: 'c', date: '2026-10-15', spec: { ...EASY, pace: 340 } }),
  ];
  it('counts one run less, and leaves the other runs as they were', () => {
    const all = aerobicTrend(logs, TEMPLATES, null, hr, '2026-10-19');
    const less = aerobicTrend(logs, TEMPLATES, null, hr, '2026-10-19', new Set(['b']));
    expect(all.runs).toBe(3);
    expect(less.runs).toBe(2);
    expect(less.points.reduce((n, p) => n + p.runs, 0)).toBe(2);
    expect(aerobicTrend(logs, TEMPLATES, null, hr, '2026-10-19', new Set())).toEqual(all);
    expect(aerobicTrend(logs, TEMPLATES, null, hr, '2026-10-19', new Set(['unknown']))).toEqual(all);
  });
});

describe('an excluded night in your own average', () => {
  const TODAY = '2026-10-22';
  const night = (offset: number, extra: Partial<RecoveryMetric>): RecoveryMetric => {
    const date = addDays(TODAY, offset);
    return { id: `t:${date}`, date, source: 'import', ...extra };
  };
  // Ten ordinary days (resting heart rate 50, HRV 50) and one night of 20 days ago with 70 and 20.
  const metrics = [...Array.from({ length: 10 }, (_, i) => night(-(i + 1), { restingHeartRate: 50, hrv: 50 })), night(-20, { restingHeartRate: 70, hrv: 20 })];
  const today = night(0, { restingHeartRate: 56, hrv: 50, sleepMinutes: 420 });

  it('takes the night out of both averages through the skip set', () => {
    const skip = excludedMornings([note({ date: addDays(TODAY, -21), excludeHeartRate: true })]);
    expect([...skip]).toEqual([addDays(TODAY, -20)]);
    const rhr = (s?: ReadonlySet<string>) => baselineValues(TODAY, metrics, (m) => m.restingHeartRate, s);
    expect(rhr()).toHaveLength(11);
    expect(rhr(skip)).toHaveLength(10);
    expect(Math.round(rhr(skip).reduce((a, b) => a + b, 0) / 10)).toBe(50);
  });

  it('changes the line of today and leaves the nights that stay as they are', () => {
    const lineOf = (excluded?: ReadonlySet<string>) => todayWellness(TODAY, [...metrics, today], { excludedMornings: excluded })!.lines.find((l) => l.key === 'restingHeartRate')!;
    const before = lineOf();
    const after = lineOf(excludedMornings([note({ date: addDays(TODAY, -21), excludeHeartRate: true })]));
    expect(before.note).toContain('hoger dan jouw gemiddelde van 52');
    expect(after.note).toContain('hoger dan jouw gemiddelde van 50');
    // Another date than the one in the data changes nothing.
    expect(lineOf(excludedMornings([note({ date: '2026-01-01', excludeHeartRate: true })])).note).toBe(before.note);
    const hrv = (excluded?: ReadonlySet<string>) => todayWellness(TODAY, [...metrics, today], { excludedMornings: excluded })!.lines.find((l) => l.key === 'hrv')!.note;
    expect(hrv()).toContain('gemiddeld 47');
    expect(hrv(new Set([addDays(TODAY, -20)]))).toContain('gemiddeld 50');
  });
});

describe('knownFacts', () => {
  const warm = { tempC: 22, feelsC: 22, windKmh: 10, gustKmh: 18, rainMm: 0, source: 'lookup' as const };
  const hot = () => runLog({ id: 'w', date: SUBJECT_DATE, spec: { ...EASY, seed: 99 }, conditions: warm, strap: true });
  const legDay = (date: string): SessionLog => ({ id: 'leg', templateId: 'tpl_lower_a', type: 'strength', completedDate: date, completedAt: `${date}T18:00:00.000Z`, variant: 'full', durationMinutes: 60, source: 'manual' });
  const base = { templates: TEMPLATES, recovery: [] as RecoveryMetric[], illness: undefined, cause: 'patroon' as const };

  it('names warmth with its source for a training and never for a night', () => {
    const w = hot();
    const facts = knownFacts({ ...base, target: { kind: 'log', log: w }, logs: [...earlier(), w] });
    expect(facts).toEqual([{ reason: 'warm', title: 'Warm', source: '22 graden bij de start, uit het weer' }]);
    expect(knownFacts({ ...base, target: { kind: 'day', date: SUBJECT_DATE }, logs: [...earlier(), w] })).toEqual([]);
    const s = subject(143);
    expect(knownFacts({ ...base, target: { kind: 'log', log: s }, logs: [...earlier(), s] })).toEqual([]);
  });

  it('names a heavy leg day the day before, and that day itself for a day note', () => {
    const s = subject(143);
    const leg = legDay('2026-10-17');
    const facts = knownFacts({ ...base, target: { kind: 'log', log: s }, logs: [...earlier(), s, leg] });
    expect(facts.map((f) => f.reason)).toEqual(['zware_beendag']);
    expect(facts[0].title).toBe('Zware beendag gisteren');
    expect(facts[0].source).toMatch(/uit je logboek$/);
    expect(knownFacts({ ...base, target: { kind: 'log', log: s }, logs: [...earlier(), s, legDay('2026-10-15')] })).toEqual([]);
    expect(knownFacts({ ...base, target: { kind: 'day', date: '2026-10-17' }, logs: [leg] }).map((f) => f.reason)).toEqual(['zware_beendag']);
  });

  it('names a short night of the watch the morning of the training, or the morning after a day', () => {
    const s = subject(143);
    const rec: RecoveryMetric[] = [{ id: 'r1', date: SUBJECT_DATE, sleepMinutes: 335, source: 'import' }, { id: 'r2', date: '2026-10-25', sleepMinutes: 480, source: 'import' }, { id: 'r3', date: '2026-10-21', sleepMinutes: 300, source: 'import' }];
    const forLog = knownFacts({ ...base, recovery: rec, target: { kind: 'log', log: s }, logs: [s] });
    expect(forLog).toEqual([{ reason: 'kort_geslapen', title: 'Kort geslapen', source: '5 uur 35 slaap, van je horloge' }]);
    expect(knownFacts({ ...base, recovery: rec, target: { kind: 'day', date: '2026-10-20' }, logs: [] }).map((f) => f.reason)).toEqual(['kort_geslapen']);
    expect(knownFacts({ ...base, recovery: rec, target: { kind: 'day', date: '2026-10-24' }, logs: [] })).toEqual([]);
  });

  it('names an illness that covers the day, open or closed', () => {
    const open = [{ id: 'i1', kind: 'above_neck' as const, startDate: '2026-10-16' }];
    expect(knownFacts({ ...base, illness: open, target: { kind: 'day', date: '2026-10-20' }, logs: [] }).map((f) => f.reason)).toEqual(['ziek']);
    const closed = [{ id: 'i1', kind: 'above_neck' as const, startDate: '2026-10-16', endDate: '2026-10-18' }];
    expect(knownFacts({ ...base, illness: closed, target: { kind: 'day', date: '2026-10-19' }, logs: [] })).toEqual([]);
    expect(knownFacts({ ...base, illness: closed, target: { kind: 'day', date: '2026-10-18' }, logs: [] })).toHaveLength(1);
  });

  it('gives no suggestions when the cause is off, and keeps a suggestion off the chips', () => {
    const open = [{ id: 'i1', kind: 'above_neck' as const, startDate: '2026-10-16' }];
    expect(knownFacts({ ...base, cause: 'uit', illness: open, target: { kind: 'day', date: '2026-10-20' }, logs: [] })).toEqual([]);
    const facts = knownFacts({ ...base, illness: open, target: { kind: 'day', date: '2026-10-20' }, logs: [] });
    const chips = chipsWithout(REASON_CHIPS, facts);
    expect(chips).not.toContain('ziek');
    expect(chips).toContain('alcohol');
    expect(chips).toHaveLength(REASON_CHIPS.length - 1);
  });
});

describe('the sign', () => {
  const d = { deltaBpm: 8 };
  it('is only there with a deviation and with the switch not off', () => {
    expect(signState(undefined, undefined, true)).toBeUndefined();
    expect(signState(d, undefined, false)).toBeUndefined();
    expect(signState(d, undefined, undefined)).toBe('open');
  });
  it('turns dim when the sheet was seen or something was chosen', () => {
    expect(signState(d, note({ seen: true }), true)).toBe('muted');
    expect(signState(d, note({ reasons: [{ reason: 'stress' }] }), true)).toBe('muted');
    expect(signState(d, note({ excludeHeartRate: true }), true)).toBe('muted');
    expect(signState(d, note(), true)).toBe('open');
  });
});

describe('changing a note', () => {
  const NOW = '2026-10-25T09:00:00.000Z';
  it('toggles a reason, sets an amount and a word, and every change stamps the time', () => {
    let list: InfluenceEntry[] = [];
    let e = blankEntry({ date: '2026-10-24' }, 'n1', NOW);
    list = applyChange(list, e, (x) => toggleReason(x, 'alcohol'), NOW);
    e = list[0];
    expect(e.reasons).toEqual([{ reason: 'alcohol' }]);
    list = applyChange(list, e, (x) => setAmount(x, 'matig'), '2026-10-25T09:01:00.000Z');
    expect(list[0].reasons).toEqual([{ reason: 'alcohol', amount: 'matig' }]);
    expect(list[0].updatedAt).toBe('2026-10-25T09:01:00.000Z');
    list = applyChange(list, list[0], (x) => toggleReason(x, 'anders'), NOW);
    list = applyChange(list, list[0], (x) => setLabel(x, 'x'.repeat(60)), NOW);
    expect(list[0].reasons[1].label).toHaveLength(40);
    expect(reasonsText(list[0])).toBe(`Alcohol (3 tot 5), ${'x'.repeat(40)}`);
    list = applyChange(list, list[0], (x) => setLabel(x, '  '), NOW);
    expect(list[0].reasons[1]).toEqual({ reason: 'anders' });
    expect(reasonsText(list[0])).toBe('Alcohol (3 tot 5), Iets anders');
  });

  it('removes a note that is left with nothing, but keeps one that was seen', () => {
    const e = note({ reasons: [{ reason: 'stress' }] });
    expect(applyChange([e], e, (x) => toggleReason(x, 'stress'), NOW)).toEqual([]);
    const seen = note({ reasons: [{ reason: 'stress' }], seen: true });
    const kept = applyChange([seen], seen, (x) => toggleReason(x, 'stress'), NOW);
    expect(kept).toHaveLength(1);
    expect(isNoted(kept[0])).toBe(false);
    const sw = applyChange([], blankEntry({ date: '2026-10-24', logId: 'l1' }, 'n2', NOW), (x) => setExclude(x, true), NOW);
    expect(sw[0].excludeHeartRate).toBe(true);
    expect(applyChange(sw, sw[0], (x) => setExclude(x, false), NOW)).toEqual([]);
    expect(markSeen(note()).seen).toBe(true);
  });

  it('finds the note of a training and of a day apart', () => {
    const list = [note({ id: 'a', logId: 'l1', date: '2026-10-24' }), note({ id: 'b', date: '2026-10-24' })];
    expect(entryForLog(list, 'l1')?.id).toBe('a');
    expect(entryForDay(list, '2026-10-24')?.id).toBe('b');
    expect(entryForDay(list, '2026-10-23')).toBeUndefined();
  });

  it('never writes a judgement into the words', () => {
    const all = REASON_CHIPS.map((r) => reasonsText({ reasons: [{ reason: r }] })).join(' ');
    expect(all).not.toMatch(/helaas|minder drinken|[\u2013\u2014]/i);
  });
});
