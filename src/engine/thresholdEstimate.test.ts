import { describe, expect, it } from 'vitest';
import type { SessionLog } from '../models/training';
import type { RunDetail, RunKm } from '../models/runDetail';
import type { StreamSet } from '../models/activityDetail';
import type { TestResult } from './racePrediction';
import { TEST_TEMPLATE_ID } from './raceBlock';
import {
  basisLine, combinedLthr, lthrFromEffort, notForThresholdLine, strapDuring, strapExpected, testsLine,
  type EffortEstimate, type EffortRejected,
} from './thresholdEstimate';

// Nagemaakte testlopen. Een reeks van één punt per seconde: 10 minuten inlopen, dan het teststuk
// (de snelste 5 km), dan 5 minuten uitlopen.
const WARM = 600;

function km(index: number, hr: number | undefined, sec = 300): RunKm {
  return { index, startM: (index - 1) * 1000, endM: index * 1000, distanceM: 1000, sec, paceSecKm: sec, ...(hr ? { hrAvg: hr } : {}) };
}

function runDetail(totalMin: number, effortSec: number, hrs: (number | undefined)[]): RunDetail {
  const kms = hrs.map((hr, i) => km(i + 1, hr, effortSec / 5));
  return {
    version: 1, wholeKm: 7, wholeMinutes: totalMin, builtAt: '2026-10-20T10:00:00.000Z', totalM: 7000, movingSec: totalMin * 60, pauseSec: 0, kms,
    line: { n: 2, distM: [0, 7000], timeSec: [0, totalMin * 60], paceSecKm: [300, 300], hr: [150, 170], altitudeM: [0, 0] },
    bestFive: { startM: 1000, endM: 6000, startSec: WARM, sec: effortSec, kms },
  };
}

function testLog(id: string, date: string, effortSec: number, opts: { hrs?: (number | undefined)[]; strap?: boolean } = {}): SessionLog {
  const totalMin = (WARM + effortSec + 300) / 60;
  return {
    id, templateId: TEST_TEMPLATE_ID, type: 'cardio', completedDate: date, completedAt: `${date}T09:00:00.000Z`, variant: 'full', durationMinutes: totalMin,
    cardioData: { distanceKm: 7, durationMinutes: totalMin },
    runDetail: runDetail(totalMin, effortSec, opts.hrs ?? [165, 172, 174, 176, 178]),
    ...(opts.strap === false ? {} : { detail: { quality: { chestStrapSeen: true } } }),
  } as unknown as SessionLog;
}

const result = (log: SessionLog, effortSec: number): TestResult => ({ date: log.completedDate, km: 5, minutes: effortSec / 60, logId: log.id, basis: 'effort' });

// Hartslag `hr(t)` en balans `bal(t)` per seconde over de hele loop.
function streams(effortSec: number, hr: (t: number) => number | null, bal: (t: number) => number | null = () => 50): StreamSet {
  const n = WARM + effortSec + 300;
  const timeSec = Array.from({ length: n }, (_, i) => i);
  return { timeSec, heartRate: timeSec.map(hr), stanceBalanceLeftPct: timeSec.map(bal) };
}

// De laatste 20 minuten op 180, het begin van het teststuk lager: het venster telt alleen het eind.
const rising = (effortSec: number) => (t: number) => (t >= WARM + effortSec - 1200 ? 180 : 160);

describe('lthrFromEffort: de schatting uit één test', () => {
  it('neemt de laatste 20 minuten van het teststuk uit de reeks, keer 98 procent', () => {
    const log = testLog('t1', '2026-10-20', 1500);
    const e = lthrFromEffort(log, result(log, 1500), { streams: streams(1500, rising(1500)) }) as EffortEstimate;
    expect(e.ok).toBe(true);
    expect(e.lthr).toBe(Math.round(180 * 0.98));
    expect([e.low, e.high]).toEqual([e.lthr - 5, e.lthr + 5]);
    expect(e.window).toBe('stream');
    expect(e.strap).toBe('seen');
    expect(basisLine(e)).toBe('Gemeten met je borstband, over de laatste 20 minuten van je test.');
  });

  it('Zoals Friel: 100 procent', () => {
    const log = testLog('t1', '2026-10-20', 1500);
    const e = lthrFromEffort(log, result(log, 1500), { streams: streams(1500, rising(1500)), factor: 'friel' }) as EffortEstimate;
    expect(e.lthr).toBe(180);
  });

  it('zonder reeks: kilometer 2 tot en met 5, en dat staat erbij', () => {
    const log = testLog('t1', '2026-10-20', 1500);
    const e = lthrFromEffort(log, result(log, 1500)) as EffortEstimate;
    expect(e.lthr).toBe(Math.round(175 * 0.98));
    expect(e.window).toBe('km');
    expect(basisLine(e)).toContain('kilometer 2 tot en met 5');
    expect(basisLine(e)).toContain('reeks van het horloge ontbrak');
  });

  it('23:59 telt niet, 24:00 wel; 40:00 telt, 40:01 niet', () => {
    const at = (sec: number) => {
      const log = testLog('t', '2026-10-20', sec);
      return lthrFromEffort(log, result(log, sec), { streams: streams(sec, () => 175) });
    };
    expect(at(1439)).toMatchObject({ ok: false, reason: 'short' });
    expect(at(1440).ok).toBe(true);
    expect(at(2400).ok).toBe(true);
    expect(at(2401)).toMatchObject({ ok: false, reason: 'long' });
    expect(notForThresholdLine(at(1439) as EffortRejected, 176)).toBe("Je test duurde 23 minuten. Goed voor je tempo's, te kort voor je drempel.");
    expect(notForThresholdLine(at(2401) as EffortRejected, 176)).toBe("Je test duurde ruim 40 minuten. Goed voor je tempo's, te lang voor je drempel.");
  });

  it('band niet gezien: telt niet, met één zin; met Telt met ruime marge wel, met 10 slagen marge', () => {
    const log = testLog('t1', '2026-10-20', 1500, { strap: false });
    const set = streams(1500, () => 175, () => null);
    const r = lthrFromEffort(log, result(log, 1500), { streams: set }) as EffortRejected;
    expect(r).toMatchObject({ ok: false, reason: 'noStrap' });
    expect(notForThresholdLine(r, 176)).toBe("Bij deze test zag ASCEND geen borstband. Je tempo's tellen. Je drempel blijft 176.");
    const wide = lthrFromEffort(log, result(log, 1500), { streams: set, noStrap: 'margin' }) as EffortEstimate;
    expect(wide.strap).toBe('wrist');
    expect(wide.high - wide.lthr).toBe(10);
  });

  it('"Ik had hem wel om" laat de test meetellen', () => {
    const log = testLog('t1', '2026-10-20', 1500, { strap: false });
    const e = lthrFromEffort(log, result(log, 1500), { streams: streams(1500, () => 175, () => null), strapSaid: true }) as EffortEstimate;
    expect(e.strap).toBe('said');
    expect(basisLine(e)).toBe('Gemeten met de band die je om had, over de laatste 20 minuten van je test.');
  });

  it('band gezien in de loop maar niet tijdens het teststuk: telt niet', () => {
    const log = testLog('t1', '2026-10-20', 1500);
    // Balans alleen in het inlopen en de eerste 9 minuten van het teststuk: hij dekt 36 procent.
    const set = streams(1500, () => 175, (t) => (t < WARM + 540 ? 50 : null));
    expect(strapDuring(set, WARM, WARM + 1500)).toBe(false);
    const r = lthrFromEffort(log, result(log, 1500), { streams: set }) as EffortRejected;
    expect(r.reason).toBe('strapLost');
    expect(notForThresholdLine(r, undefined)).toBe("Je borstband viel weg tijdens je test. Je tempo's tellen. Je drempel verandert niet.");
  });

  it('een gat in de hartslag in het venster: telt niet', () => {
    const log = testLog('t1', '2026-10-20', 1500);
    const gap = (t: number) => (t >= WARM + 1000 && t < WARM + 1120 ? null : 175);
    expect(lthrFromEffort(log, result(log, 1500), { streams: streams(1500, gap) })).toMatchObject({ ok: false, reason: 'hrGap' });
    // Een gat van 20 seconden is geen gat.
    const small = (t: number) => (t >= WARM + 1000 && t < WARM + 1020 ? null : 175);
    expect(lthrFromEffort(log, result(log, 1500), { streams: streams(1500, small) }).ok).toBe(true);
  });

  it('een ingekort log en een verouderde kilometertabel geven stil niets', () => {
    const log = testLog('t1', '2026-10-20', 1500);
    const trimmed = { ...log, trim: { startSec: 0, endSec: 1000 } } as unknown as SessionLog;
    expect(lthrFromEffort(trimmed, result(log, 1500))).toMatchObject({ ok: false, reason: 'noData' });
    const stale = { ...log, cardioData: { distanceKm: 7.4, durationMinutes: 40 } } as SessionLog;
    const r = lthrFromEffort(stale, result(log, 1500), { streams: streams(1500, () => 175) }) as EffortRejected;
    expect(r.reason).toBe('stale');
    expect(notForThresholdLine(r, 176)).toBeUndefined();
  });

  it('zonder hartslag in de kilometers: stil niets', () => {
    const log = testLog('t1', '2026-10-20', 1500, { hrs: [160, 172, undefined, undefined, undefined] });
    expect(lthrFromEffort(log, result(log, 1500))).toMatchObject({ ok: false, reason: 'noHr' });
  });
});

const est = (logId: string, date: string, lthr: number, strap: EffortEstimate['strap'] = 'seen'): EffortEstimate => ({
  ok: true, logId, date, lthr, low: lthr - 5, high: lthr + 5, minutes: 25, window: 'stream', strap,
});

describe('combinedLthr: het midden van je laatste drie', () => {
  it('één uitschieter tussen twee gelijke tests weegt niet door', () => {
    const c = combinedLthr([est('a', '2026-06-01', 174), est('b', '2026-08-01', 188), est('c', '2026-10-01', 175)], '2026-11-17')!;
    expect(c.lthr).toBe(175);
    expect(testsLine(c)).toBe('Je laatste drie tests: 174, 188 en 175. Het midden is 175.');
  });

  it('alleen de laatste drie, en de volgorde van binnenkomen telt niet', () => {
    const list = [est('a', '2026-03-01', 160), est('b', '2026-06-01', 174), est('c', '2026-08-01', 177), est('d', '2026-10-01', 176)];
    const one = combinedLthr(list, '2026-11-17')!;
    const two = combinedLthr([...list].reverse(), '2026-11-17')!;
    expect(one.lthr).toBe(176);
    expect(two.used.map((e) => e.logId)).toEqual(['b', 'c', 'd']);
    expect(testsLine(one)).toBe('Je laatste drie tests: 174, 177 en 176. Het midden is 176.');
  });

  it('een test ouder dan 12 maanden valt weg', () => {
    const c = combinedLthr([est('a', '2025-11-16', 160), est('b', '2026-06-01', 174), est('c', '2026-10-01', 178)], '2026-11-17')!;
    expect(c.used.map((e) => e.logId)).toEqual(['b', 'c']);
    expect(c.lthr).toBe(176);
    expect(testsLine(c)).toBe('Je laatste twee tests: 174 en 178. Het gemiddelde is 176.');
    // Precies 12 maanden telt nog.
    expect(combinedLthr([est('a', '2025-11-17', 160)], '2026-11-17')?.lthr).toBe(160);
  });

  it('bij één test die ene, zonder regel over tests', () => {
    const c = combinedLthr([est('a', '2026-10-01', 176)], '2026-11-17')!;
    expect(c.lthr).toBe(176);
    expect(testsLine(c)).toBeUndefined();
  });

  it('aan de pols pas een uitkomst als twee tests het eens zijn', () => {
    expect(combinedLthr([est('a', '2026-10-01', 176, 'wrist')], '2026-11-17')).toBeUndefined();
    expect(combinedLthr([est('a', '2026-09-01', 168, 'wrist'), est('b', '2026-10-01', 180)], '2026-11-17')).toBeUndefined();
    const c = combinedLthr([est('a', '2026-09-01', 174, 'wrist'), est('b', '2026-10-01', 178)], '2026-11-17')!;
    expect(c.lthr).toBe(176);
    expect(c.high - c.lthr).toBe(10);
  });
});

describe('strapExpected: was de band er bij de meeste lopen', () => {
  const run = (id: string, day: number, seen: boolean) => ({
    id, type: 'cardio', completedDate: `2026-10-${String(day).padStart(2, '0')}`, cardioData: { distanceKm: 8, durationMinutes: 45 },
    detail: { quality: seen ? { chestStrapSeen: true } : {} },
  }) as unknown as SessionLog;

  it('zes van de laatste tien: ja; vijf: nee', () => {
    const six = Array.from({ length: 10 }, (_, i) => run(`r${i}`, i + 1, i < 6));
    expect(strapExpected(six)).toBe(true);
    const five = Array.from({ length: 10 }, (_, i) => run(`r${i}`, i + 1, i < 5));
    expect(strapExpected(five)).toBe(false);
  });

  it('de test zelf telt niet mee, en twee lopen zijn te weinig', () => {
    expect(strapExpected([run('a', 1, true), run('b', 2, true)])).toBe(false);
    const runs = [run('a', 1, true), run('b', 2, true), run('c', 3, true), run('t', 4, false)];
    expect(strapExpected(runs, 't')).toBe(true);
  });
});
