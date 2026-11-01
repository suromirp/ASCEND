import { describe, it, expect } from 'vitest';
import type { SessionLog } from '../models/training';
import type { RunDetail, RunKm } from '../models/runDetail';
import type { TestResult } from './racePrediction';
import { CURVE_MIN, paceCurve, paceCurveLine, paceCurveWaitLine, trainingEffort } from './paceCurve';

// Nagemaakte loopjes: alleen de kilometers en de beste 5 km die de details zouden geven.
function kms(paces: number[]): RunKm[] {
  return paces.map((p, i) => ({ index: i + 1, startM: i * 1000, endM: (i + 1) * 1000, distanceM: 1000, sec: p, paceSecKm: p }));
}

function detail(paces: number[], bestFiveSec?: number): RunDetail {
  return {
    version: 1, wholeKm: paces.length, wholeMinutes: paces.reduce((a, b) => a + b, 0) / 60, builtAt: '2026-10-01T00:00:00.000Z',
    totalM: paces.length * 1000, movingSec: paces.reduce((a, b) => a + b, 0), pauseSec: 0, kms: kms(paces),
    line: { n: 0, distM: [], timeSec: [], paceSecKm: [], hr: [], altitudeM: [] },
    ...(bestFiveSec !== undefined ? { bestFive: { startM: 0, endM: 5000, startSec: 0, sec: bestFiveSec, kms: [] } } : {}),
  };
}

let n = 0;
function run(date: string, paces: number[], extra: { bestFiveSec?: number; templateId?: string; treadmill?: boolean; walk?: boolean } = {}): SessionLog {
  n++;
  return {
    id: `run_${n}`, templateId: extra.templateId ?? 'tpl_easy_run', type: extra.walk ? 'hiking' : 'cardio', sport: extra.walk ? 'hiking' : 'running',
    completedDate: date, completedAt: `${date}T18:00:00.000Z`, variant: 'full', durationMinutes: 40, source: 'garmin',
    cardioData: { durationMinutes: 40, distanceKm: paces.length, ...(extra.treadmill ? { environment: 'treadmill' } : {}) },
    runDetail: detail(paces, extra.bestFiveSec),
  } as SessionLog;
}

// Een test van 5 km in 25:00 (300 s per km).
const TEST: TestResult = { date: '2026-09-01', km: 5, minutes: 25, logId: 'test_1', basis: 'whole' };
const TODAY = '2026-10-15';

describe('trainingEffort: de snelste stukken van een gewone loop', () => {
  it('neemt de beste 5 km, en zonder die de snelste drie kilometers achter elkaar', () => {
    expect(trainingEffort(run('2026-09-10', [330, 320, 310, 320, 330, 340], { bestFiveSec: 1600 }))).toMatchObject({ km: 5, minutes: 1600 / 60 });
    const three = trainingEffort(run('2026-09-10', [340, 310, 300, 305, 350]));
    expect(three).toMatchObject({ km: 3, minutes: (310 + 300 + 305) / 60 });
  });

  it('laat de loopband, wandelingen, korte loopjes en de test zelf buiten', () => {
    expect(trainingEffort(run('2026-09-10', [300, 300, 300, 300, 300], { bestFiveSec: 1500, treadmill: true }))).toBeUndefined();
    expect(trainingEffort(run('2026-09-10', [600, 600, 600, 600, 600], { walk: true, bestFiveSec: 3000 }))).toBeUndefined();
    expect(trainingEffort(run('2026-09-10', [300, 300]))).toBeUndefined();
    expect(trainingEffort(run('2026-09-10', [300, 300, 300, 300, 300], { bestFiveSec: 1500, templateId: 'tpl_test_run' }))).toBeUndefined();
  });
});

describe('paceCurve: een controle naast de test', () => {
  const easy = [
    run('2026-09-08', [330, 330, 330, 330, 330], { bestFiveSec: 1650 }),
    run('2026-09-15', [325, 325, 325, 325, 325], { bestFiveSec: 1625 }),
    run('2026-09-22', [320, 320, 320, 320, 320], { bestFiveSec: 1600 }),
  ];

  it('zegt niets zonder test, en wacht een paar weken en een paar loopjes na de test', () => {
    expect(paceCurve(easy, undefined, TODAY)).toBeUndefined();
    expect(paceCurve(easy, TEST, '2026-09-20')).toMatchObject({ state: 'wait' });
    expect(paceCurve(easy.slice(0, 2), TEST, TODAY)).toMatchObject({ state: 'wait', runs: 2 });
    expect(CURVE_MIN).toEqual({ runs: 3, days: 21 });
  });

  it('past bij de test als je snelste stuk niet ver van je testtempo ligt', () => {
    const r = paceCurve(easy, TEST, TODAY);
    expect(r).toMatchObject({ state: 'ready', verdict: 'fits', runs: 3 });
    if (r?.state === 'ready') expect(r.best.date).toBe('2026-09-22');
  });

  it('wijst op sneller als een stuk in training duidelijk sneller was dan de test', () => {
    const fast = [...easy, run('2026-10-01', [285, 285, 285, 285, 285], { bestFiveSec: 1425 })];
    expect(paceCurve(fast, TEST, TODAY)).toMatchObject({ state: 'ready', verdict: 'faster' });
  });

  it('noemt een veel rustiger training gewoon, geen achteruitgang', () => {
    const slow = [
      run('2026-09-08', [380, 380, 380, 380, 380], { bestFiveSec: 1900 }),
      run('2026-09-15', [385, 385, 385, 385, 385], { bestFiveSec: 1925 }),
      run('2026-09-22', [390, 390, 390, 390, 390], { bestFiveSec: 1950 }),
    ];
    expect(paceCurve(slow, TEST, TODAY)).toMatchObject({ state: 'ready', verdict: 'easier' });
  });

  it('kijkt alleen naar loopjes na de laatste test die telt, tot en met vandaag', () => {
    const before = run('2026-08-20', [280, 280, 280, 280, 280], { bestFiveSec: 1400 });
    const tomorrow = run('2026-10-16', [280, 280, 280, 280, 280], { bestFiveSec: 1400 });
    expect(paceCurve([...easy, before, tomorrow], TEST, TODAY)).toMatchObject({ verdict: 'fits' });
  });
});

describe('paceCurveLine: de zin onder je testtempo', () => {
  it('zegt het droge feit eerst en dan wat het betekent', () => {
    const fits = paceCurve([
      run('2026-09-08', [330, 330, 330, 330, 330], { bestFiveSec: 1650 }),
      run('2026-09-15', [325, 325, 325, 325, 325], { bestFiveSec: 1625 }),
      run('2026-09-22', [320, 320, 320, 320, 320], { bestFiveSec: 1600 }),
    ], TEST, TODAY);
    if (fits?.state !== 'ready') throw new Error('klaar');
    expect(paceCurveLine(fits)).toBe('Je snelste 5 km in training sinds je test was 26:40, op 22 sep. Dat past bij je testtempo\'s.');
    expect(paceCurveLine({ ...fits, verdict: 'faster' })).toContain('Je trainingen wijzen op iets sneller dan je laatste test. Een nieuwe test over een paar weken zegt meer.');
    expect(paceCurveLine({ ...fits, verdict: 'easier' })).toContain('in training loop je zelden voluit');
  });

  it('zegt zolang het wacht vanaf wanneer en hoeveel loopjes er nog nodig zijn', () => {
    expect(paceCurveWaitLine({ state: 'wait', test: TEST, runs: 1, readyFrom: '2026-09-22' }, '2026-09-10')).toBe('Je snelste stukken in training legt ASCEND vanaf 22 sep en na nog 2 loopjes met details naast je test.');
    expect(paceCurveWaitLine({ state: 'wait', test: TEST, runs: 2, readyFrom: '2026-09-22' }, '2026-10-01')).toBe('Je snelste stukken in training legt ASCEND na nog 1 loop met details naast je test.');
  });
});
