(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';

import { describe, expect, it } from 'vitest';
import type { PlannedSession, SessionLog } from '../models/training';
import type { StreamSet } from '../models/activityDetail';
import type { RacePaces } from './racePaces';
import {
  findShortTest, seriesPaceOf, shortTestBaseline, shortTestBrief, shortTestFits, shortTestLogIds, shortTestOf, shortTestOffer,
  shortTestBriefing, shortTestSessionIds, shortTestWay, nextShortTestRun, watchShortTest, shortTestVerdict, shortTestView, type ShortTestResult,
} from './shortTest';

// Nagemaakte rustige lopen van 40 minuten, één punt per seconde: rustig op 6:30 per km, op `start` 4 minuten
// op `testPace`, dan een minuut stil (of door), dan weer rustig. Hartslag rustig 140, in de test oplopend
// naar `hrEnd` in de laatste minuut, in de minuut stilstaan zakkend met `drop`.
const PACE = 320;
interface RunOpts {
  start?: number;
  testPace?: number;
  hrEnd?: number;
  drop?: number;
  stand?: boolean;
  strap?: boolean;
  noTest?: boolean;
  gapAt?: [number, number];
  stopAt?: number;
  step?: number;
}

function run(o: RunOpts = {}): StreamSet {
  const start = o.start ?? 600;
  const testPace = o.testPace ?? PACE;
  const hrEnd = o.hrEnd ?? 165;
  const drop = o.drop ?? 30;
  const stand = o.stand ?? true;
  const step = o.step ?? 1;
  const end = start + 240;
  const timeSec: number[] = [];
  for (let t = 0; t <= 2400; t += step) timeSec.push(t);
  const speed = (t: number): number => {
    if (o.noTest) return 1000 / 390;
    if (o.stopAt !== undefined && t >= o.stopAt && t < o.stopAt + 12) return 0;
    if (t >= start && t < end) return 1000 / testPace;
    if (stand && t >= end && t < end + 60) return 0;
    return 1000 / 390;
  };
  let d = 0;
  const distanceM = timeSec.map((t, i) => {
    if (i > 0) for (let s = timeSec[i - 1]; s < t; s++) d += speed(s);
    return d;
  });
  const heartRate = timeSec.map((t) => {
    if (o.gapAt && t >= o.gapAt[0] && t < o.gapAt[1]) return null;
    if (o.noTest || t < start) return 140;
    if (t < end - 60) return 150 + ((t - start) / 180) * (hrEnd - 150);
    if (t < end) return hrEnd;
    if (t < end + 60) return hrEnd - (drop * (t - end)) / 60;
    return 140;
  });
  return { timeSec, distanceM, heartRate, stanceBalanceLeftPct: timeSec.map(() => (o.strap === false ? null : 50)) };
}

function log(id: string, date: string, extra: Partial<SessionLog> = {}): SessionLog {
  return {
    id, templateId: 'tpl_easy_run', type: 'cardio', completedDate: date, completedAt: `${date}T08:45:00`, variant: 'full', durationMinutes: 40,
    cardioData: { distanceKm: 6, durationMinutes: 40 }, rpe: 4, ...extra,
  } as unknown as SessionLog;
}

const paces = (fast: number, slow: number): RacePaces => ({ threshold: { fast, slow } } as unknown as RacePaces);

describe('het teststuk in de reeks', () => {
  it('vindt 4 minuten op testtempo, de hartslag van de laatste minuut en de daling', () => {
    const f = findShortTest(run(), PACE)!;
    expect(f.startSec).toBe(600);
    expect(f.endSec).toBe(840);
    expect(f.paceSecKm).toBeCloseTo(320, 0);
    expect(f.hrEnd).toBe(165);
    expect(f.stood).toBe(true);
    expect(f.dropBpm).toBeGreaterThanOrEqual(26);
    expect(f.dropBpm).toBeLessThanOrEqual(31);
    expect(f.strapSeen).toBe(true);
    expect(f.stopped).toBe(false);
  });

  it('een gewone rustige loop heeft geen test', () => {
    expect(findShortTest(run({ noTest: true }), PACE)).toBeUndefined();
  });

  it('niet stilgestaan: geen daling, wel de rest', () => {
    const f = findShortTest(run({ stand: false }), PACE)!;
    expect(f.stood).toBe(false);
    expect(f.dropBpm).toBeUndefined();
    expect(f.hrEnd).toBe(165);
  });

  it('een reeks die binnen de minuut na de test stopt: de daling is niet te lezen', () => {
    const set = run();
    const n = set.timeSec.findIndex((t) => t > 870);
    const cut = { timeSec: set.timeSec.slice(0, n), distanceM: set.distanceM!.slice(0, n), heartRate: set.heartRate!.slice(0, n), stanceBalanceLeftPct: set.stanceBalanceLeftPct!.slice(0, n) };
    const f = findShortTest(cut, PACE)!;
    expect([f.standRead, f.stood, f.dropBpm]).toEqual([false, false, undefined]);
    const v = shortTestView({ logId: 'c', logs: [log('c', '2026-11-02')], streams: new Map([['c', cut]]), series: { answer: 'accepted', date: '2026-10-01', paceSecKm: PACE } })!;
    expect(v.facts[2]).toBe('De daling na de test is niet te lezen.');
  });

  it('opslag op Smart, om de paar seconden een punt, gaat ook', () => {
    const f = findShortTest(run({ step: 4 }), PACE)!;
    expect(f.hrEnd).toBeGreaterThanOrEqual(164);
    expect(f.hrEnd).toBeLessThanOrEqual(165);
    expect(f.dropBpm).toBeDefined();
  });

  it('een gat in de hartslag in de laatste minuut', () => {
    const f = findShortTest(run({ gapAt: [790, 820] }), PACE)!;
    expect(f.hrGap).toBe(true);
    expect(f.hrEnd).toBeUndefined();
  });
});

describe('één test: geldig of niet', () => {
  const ctx = { paceSecKm: PACE };
  it('geldig met band', () => {
    const r = shortTestOf(log('a', '2026-11-02'), run(), ctx)!;
    expect([r.valid, r.strap, r.dayPart, r.rpe]).toEqual([true, 'seen', 'morning', 4]);
  });

  it('3 procent te snel telt niet', () => {
    expect(shortTestOf(log('a', '2026-11-02'), run({ testPace: PACE * 0.97 }), ctx)!.reason).toBe('pace');
  });

  it('te laat begonnen telt niet', () => {
    expect(shortTestOf(log('a', '2026-11-02'), run({ start: 17 * 60 }), ctx)!.reason).toBe('start');
  });

  it('een stop in het teststuk telt niet', () => {
    expect(shortTestOf(log('a', '2026-11-02'), run({ stopAt: 700 }), ctx)?.reason).toBe('stopped');
  });

  it('zonder band: feiten zonder oordeel, tenzij je zei dat je hem om had of Telt met ruime marge koos', () => {
    const set = run({ strap: false });
    expect(shortTestOf(log('a', '2026-11-02'), set, ctx)!.reason).toBe('noStrap');
    expect(shortTestOf(log('a', '2026-11-02'), set, { ...ctx, strapSaid: true })!.strap).toBe('said');
    expect(shortTestOf(log('a', '2026-11-02'), set, { ...ctx, noStrap: 'margin' })!.strap).toBe('wrist');
  });

  it('een aangenomen zwaarte telt niet als zwaarte', () => {
    expect(shortTestOf(log('a', '2026-11-02', { rpeAssumed: true }), run(), ctx)!.rpe).toBeUndefined();
  });

  it('een ingekorte loop leest niets', () => {
    expect(shortTestOf(log('a', '2026-11-02', { trim: { startSec: 0, endSec: 100 } } as Partial<SessionLog>), run(), ctx)).toBeUndefined();
  });
});

function result(date: string, hr: number, rpe?: number, extra: Partial<ShortTestResult> = {}): ShortTestResult {
  return {
    logId: `l${date}`, date, at: `${date}T08:45:00`, dayPart: 'morning', valid: true, strap: 'seen', ...(rpe !== undefined ? { rpe } : {}),
    facts: { startSec: 600, endSec: 840, paceSecKm: PACE, hrEnd: hr, hrGap: false, noHr: false, stood: true, standRead: true, stopped: false, strapSeen: true },
    ...extra,
  };
}

describe('je eigen midden en het oordeel', () => {
  const four = [result('2026-11-02', 166, 4), result('2026-11-09', 164, 4), result('2026-11-16', 165, 5), result('2026-11-23', 167, 4)];

  it('na drie tests nog geen oordeel; de vijfde test krijgt er een', () => {
    const fourth = four[3];
    expect(shortTestBaseline(four, fourth)).toBeUndefined();
    expect(shortTestVerdict(fourth, undefined, 3).line).toBe('Nog 1 test tot een eerste oordeel.');
    const fifth = result('2026-11-30', 165, 4);
    expect(shortTestBaseline([...four, fifth], fifth)).toEqual({ hr: 165.5, rpe: 4, count: 4 });
    expect(shortTestVerdict(fifth, shortTestBaseline([...four, fifth], fifth)).word).toBe('Normaal');
  });

  it('lager en niet zwaarder is Beter; lager en zwaarder is Let op', () => {
    const better = result('2026-11-30', 159, 4);
    expect(shortTestVerdict(better, shortTestBaseline([...four, better], better))).toEqual({ word: 'Beter', line: 'Je hartslag lag 6 slagen onder je gewone en het voelde niet zwaarder. Dat past bij fitter worden.' });
    const tired = result('2026-11-30', 160, 6);
    expect(shortTestVerdict(tired, shortTestBaseline([...four, tired], tired)).word).toBe('Let op');
  });

  it('hoger: Let op, eerst de omstandigheden', () => {
    const high = result('2026-11-30', 171, 4);
    expect(shortTestVerdict(high, shortTestBaseline([...four, high], high)).line).toContain('Denk eerst aan warmte');
  });

  it('zonder zwaarte bij een duidelijk verschil: geen woord', () => {
    const quiet = result('2026-11-30', 160);
    expect(shortTestVerdict(quiet, shortTestBaseline([...four, quiet], quiet)).word).toBeUndefined();
  });

  it('aan de pols een ruimere grens', () => {
    const wrist = result('2026-11-30', 160, 4, { strap: 'wrist' });
    expect(shortTestVerdict(wrist, shortTestBaseline([...four, wrist], wrist)).word).toBe('Normaal');
  });

  it('ongeldige tests, een ander dagdeel en een tweede test op één dag tellen niet mee', () => {
    const bad = result('2026-11-25', 150, 4, { valid: false, reason: 'pace' });
    const evening = result('2026-11-26', 150, 4, { dayPart: 'later' });
    const twice = { ...result('2026-11-23', 150, 4), logId: 'lz' };
    const now = result('2026-11-30', 165, 4);
    expect(shortTestBaseline([...four, bad, evening, twice, now], now)!.hr).toBe(165.5);
  });

  it('twee tests op één dag: de eerste op tijd telt, niet die met het laagste log-id', () => {
    const early = { ...result('2026-11-28', 150, 4), logId: 'zz', at: '2026-11-28T07:00:00' };
    const late = { ...result('2026-11-28', 180, 4), logId: 'aa', at: '2026-11-28T09:00:00' };
    const now = result('2026-11-30', 165, 4);
    const base = shortTestBaseline([...four.slice(1), early, late, now], now)!;
    expect(base.hr).toBe(164.5);
  });

  it('de volgorde van binnenkomen verandert niets', () => {
    const now = result('2026-11-30', 165, 4);
    expect(shortTestBaseline([now, ...[...four].reverse()], now)).toEqual(shortTestBaseline([...four, now], now));
  });
});

describe('het voorstel en de dag', () => {
  it('het testtempo: het midden van je drempeltempo op 5 seconden', () => {
    expect(seriesPaceOf(paces(311, 327))).toBe(320);
    expect(seriesPaceOf(undefined)).toBeUndefined();
  });

  it('een voorstel alleen met de instelling aan, zonder antwoord en met een testloop', () => {
    expect(shortTestOffer({ on: true, series: undefined, paces: paces(311, 327) })?.paceSecKm).toBe(320);
    expect(shortTestOffer({ on: false, series: undefined, paces: paces(311, 327) })).toBeUndefined();
    expect(shortTestOffer({ on: true, series: { answer: 'declined', date: '2026-11-01' }, paces: paces(311, 327) })).toBeUndefined();
    expect(shortTestOffer({ on: true, series: undefined, paces: undefined })).toBeUndefined();
  });

  const s = (id: string, date: string, templateId = 'tpl_easy_run', status: PlannedSession['status'] = 'planned', order = 0): PlannedSession =>
    ({ id, templateId, scheduledDate: date, weekStartDate: date, status, order } as PlannedSession);
  const sessions = [
    s('e1', '2026-11-17'), s('e2', '2026-11-19'), s('t1', '2026-11-16', 'tpl_intervals'),
    s('e3', '2026-11-23', 'tpl_easy_run', 'skipped'), s('e4', '2026-11-25'), s('e5', '2026-11-27'),
    s('e0', '2026-11-10'),
  ];
  const accepted = { answer: 'accepted' as const, date: '2026-11-15', paceSecKm: 320 };

  it('per week de eerste rustige loop die niet is overgeslagen, vanaf de dag van Akkoord', () => {
    expect([...shortTestSessionIds(sessions, accepted, true)].sort()).toEqual(['e1', 'e4']);
  });

  it('zonder Akkoord, na Liever niet of met de instelling uit: geen test', () => {
    expect(shortTestSessionIds(sessions, undefined, true).size).toBe(0);
    expect(shortTestSessionIds(sessions, { answer: 'declined', date: '2026-11-15' }, true).size).toBe(0);
    expect(shortTestSessionIds(sessions, accepted, false).size).toBe(0);
  });

  it('een korte rustige loop heeft er geen ruimte voor', () => {
    expect(shortTestFits(24)).toBe(false);
    expect(shortTestFits(25)).toBe(true);
    expect(shortTestFits(undefined)).toBe(false);
  });

  it('de Briefing: het voorstel zonder antwoord, het blok op de testdag, anders niets', () => {
    const base = { minutes: 40, sessions, on: true, paces: paces(311, 327), today: '2026-11-16', logged: new Set<string>() };
    expect(shortTestBriefing({ ...base, session: sessions[0], series: undefined })?.kind).toBe('offer');
    expect(shortTestBriefing({ ...base, session: sessions[0], series: accepted })?.kind).toBe('brief');
    expect(shortTestBriefing({ ...base, session: sessions[1], series: accepted })).toBeUndefined();
    expect(shortTestBriefing({ ...base, session: sessions[0], series: { answer: 'declined', date: '2026-11-15' } })).toBeUndefined();
    expect(shortTestBriefing({ ...base, session: sessions[6], series: undefined })).toBeUndefined();
    expect(shortTestBriefing({ ...base, session: sessions[2], series: undefined })).toBeUndefined();
    expect(shortTestBriefing({ ...base, session: sessions[0], series: accepted, minutes: 20 })).toBeUndefined();
    expect(shortTestBriefing({ ...base, session: sessions[0], series: accepted, on: false })).toBeUndefined();
  });

  it('het voorstel staat alleen op de loop die na Akkoord van vandaag als eerste de test krijgt', () => {
    const base = { minutes: 40, sessions, on: true, paces: paces(311, 327), series: undefined, logged: new Set<string>() };
    // Vandaag 16 november: e1 (17 november) krijgt hem, niet e2 later die week of e4 de week erna.
    expect(shortTestBriefing({ ...base, today: '2026-11-16', session: sessions[0] })?.kind).toBe('offer');
    expect(shortTestBriefing({ ...base, today: '2026-11-16', session: sessions[1] })).toBeUndefined();
    expect(shortTestBriefing({ ...base, today: '2026-11-16', session: sessions[4] })).toBeUndefined();
    // Vandaag 18 november: e1 ligt achter je, e2 is de eerste vanaf vandaag.
    expect(shortTestBriefing({ ...base, today: '2026-11-18', session: sessions[1] })?.kind).toBe('offer');
    expect(nextShortTestRun(sessions, 320, { today: '2026-11-18', logged: new Set() })?.id).toBe('e2');
    // Vandaag 20 november: e2 is voorbij, de volgende is e4 (e3 is overgeslagen).
    expect(shortTestBriefing({ ...base, today: '2026-11-20', session: sessions[4] })?.kind).toBe('offer');
    expect(shortTestBriefing({ ...base, today: '2026-11-20', session: sessions[5] })).toBeUndefined();
  });

  it('Akkoord op het voorstel geeft de test aan dezelfde loop', () => {
    const today = '2026-11-18';
    const next = nextShortTestRun(sessions, 320, { today, logged: new Set() })!;
    const ids = shortTestSessionIds(sessions, { answer: 'accepted', date: today, paceSecKm: 320 }, true, { today, logged: new Set() });
    expect(ids.has(next.id)).toBe(true);
    const base = { minutes: 40, sessions, on: true, paces: paces(311, 327), today, logged: new Set<string>(), session: next };
    expect(shortTestBriefing({ ...base, series: undefined })?.kind).toBe('offer');
    expect(shortTestBriefing({ ...base, series: { answer: 'accepted', date: today, paceSecKm: 320 } })?.kind).toBe('brief');
  });

  it('de Briefing: alleen bij hardlopen, niet op de StairMaster', () => {
    const base = { minutes: 40, sessions, on: true, paces: paces(311, 327), today: '2026-11-16', logged: new Set<string>(), series: accepted, session: sessions[0] };
    expect(shortTestBriefing({ ...base, place: 'stairmaster' })).toBeUndefined();
    expect(shortTestBriefing(base)?.kind).toBe('brief');
    expect(shortTestWay('stairmaster')).toBe(false);
    expect(shortTestWay(undefined)).toBe(true);
  });

  it('een gemiste eerste rustige loop: de volgende van die week krijgt de test', () => {
    const today = '2026-11-18';
    expect([...shortTestSessionIds(sessions, accepted, true, { today, logged: new Set() })].sort()).toEqual(['e2', 'e4']);
    expect([...shortTestSessionIds(sessions, accepted, true, { today, logged: new Set(['e1']) })].sort()).toEqual(['e1', 'e4']);
  });

  it('naar het horloge: dezelfde regel, niets zonder Akkoord of met de workout uit', () => {
    const done = { today: '2026-11-16', logged: new Set<string>() };
    expect(watchShortTest({ shortTestSeries: accepted }, sessions, done)).toEqual({ ids: new Set(['e1', 'e4']), paceSecKm: 320 });
    expect(watchShortTest({ shortTestSeries: accepted, shortTestWatch: false }, sessions, done)).toBeUndefined();
    expect(watchShortTest({}, sessions, done)).toBeUndefined();
  });

  it('het blok in de Briefing noemt het tempo', () => {
    expect(shortTestBrief(320).steps[1]).toBe('4 minuten op 5:20 per km, zo gelijk mogelijk.');
  });
});

describe('het logblad', () => {
  const series = { answer: 'accepted' as const, date: '2026-10-01', paceSecKm: PACE };
  const dates = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02'];
  const logs = dates.map((d, i) => log(`r${i}`, d));
  const streams = new Map(logs.map((l, i) => [l.id, run({ hrEnd: i === 4 ? 158 : 165 })]));

  it('de vijfde test: feiten, woord en zin', () => {
    const v = shortTestView({ logId: 'r4', logs, streams, series })!;
    expect(v.word).toBe('Beter');
    expect(v.facts[0]).toBe('Je liep 5:20 per km; je testtempo is 5:20.');
    expect(v.facts[1]).toBe('Je hartslag in de laatste minuut: 158.');
    expect(v.facts[2]).toMatch(/^Na een minuut stilstaan \d+ slagen lager\.$/);
  });

  it('de tweede test: nog geen oordeel', () => {
    expect(shortTestView({ logId: 'r1', logs, streams, series })).toMatchObject({ line: 'Nog 3 tests tot een eerste oordeel.', askStrap: false });
  });

  it('zonder band: de vraag of je hem om had', () => {
    const v = shortTestView({ logId: 'r4', logs, streams: new Map([...streams, ['r4', run({ strap: false })]]), series })!;
    expect([v.word, v.askStrap]).toEqual([undefined, true]);
  });

  it('een loop zonder test, of zonder reeks: niets', () => {
    expect(shortTestView({ logId: 'r4', logs, streams: new Map([...streams, ['r4', run({ noTest: true })]]), series })).toBeUndefined();
    expect(shortTestView({ logId: 'r4', logs, streams: new Map(), series })).toBeUndefined();
    expect(shortTestView({ logId: 'r4', logs, streams, series: undefined })).toBeUndefined();
  });

  it('alleen rustige lopen vanaf de reeks', () => {
    const other = log('x', '2026-10-20', { templateId: 'tpl_intervals' } as Partial<SessionLog>);
    const before = log('y', '2026-09-20');
    expect(shortTestLogIds([...logs, other, before], series)).toEqual(['r0', 'r1', 'r2', 'r3', 'r4']);
  });
});
