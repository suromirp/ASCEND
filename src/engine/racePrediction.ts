// ASCEND — what a 5 km test says about your race.
//
// Riegel's formula, T2 = T1 x (D2 / D1)^1.06: in 2,303 recreational runners
// it was well calibrated from 5 km up to the half marathon, and only went
// wrong for the marathon (Vickers & Vertosick 2016, BMC Sports Sci Med
// Rehabil). A 5 km test itself varies about 3 to 4% from one time to the
// next in recreational runners (Brazilian track study, n = 31), so two
// tests closer than that are "the same". Both in docs/onderzoek,
// Tussendoel hardloopwedstrijd.
//
// Pure: no React, no IndexedDB.

import type { BestEffort, SessionLog } from '../models/training';
import type { TestJudgment } from '../models/testJudgment';
import { isStaleEffort, isUsableBestEffort } from './bestEffort';
import { TEST_TEMPLATE_ID } from './raceBlock';

export const RIEGEL_EXPONENT = 1.06;
// Beyond this, Riegel underestimates the time (the marathon).
export const RIEGEL_MAX_KM = 21.1;
export const TEST_NOISE = 0.035;
// The distance of the test (tpl_test_run).
export const TEST_DISTANCE_KM = 5;
// The prediction as a range, not one time: a test itself varies 1 to 3.5%
// and Riegel adds its own error (docs/onderzoek, Trainingsvormen en
// varianten: about 2 to 3% either way).
export const PREDICTION_SPREAD = 0.025;

export function predictionRange(minutes: number): [number, number] {
  return [minutes * (1 - PREDICTION_SPREAD), minutes * (1 + PREDICTION_SPREAD)];
}

export function riegel(minutes: number, fromKm: number, toKm: number): number {
  return minutes * Math.pow(toKm / fromKm, RIEGEL_EXPONENT);
}

export interface TestResult {
  date: string;
  km: number;
  minutes: number;
  // The log this result comes from: what a debrief or a proposal after the
  // test hangs on.
  logId?: string;
  // What the result is made of: the fastest unbroken stretch of the test distance
  // read from the watch's series ('effort'), or the whole log ('whole', also when
  // absent). The totals of the log are kept in wholeKm and wholeMinutes.
  basis?: 'effort' | 'whole';
  wholeKm?: number;
  wholeMinutes?: number;
}

// The totals of a test log: distance and time as the log has them now.
export function testTotals(l: SessionLog): { km: number; minutes: number } {
  const d = l.cardioData ?? l.outdoorData;
  return { km: d?.distanceKm ?? 0, minutes: d?.durationMinutes || l.durationMinutes };
}

// The best effort of a log as it may count: usable, accepted (see BestEffort.accepted), read for
// the totals the log has now, and the log not cut. Undefined otherwise: the whole log counts.
export function countingEffort(l: SessionLog): BestEffort | undefined {
  const { km, minutes } = testTotals(l);
  const b = l.bestEffort;
  if (l.trim || !isUsableBestEffort(b) || b.accepted !== true || b.km > km + 0.05 || isStaleEffort(b, km, minutes)) return undefined;
  return b;
}

// One result per test log. A log whose best effort has been accepted (engine/bestEffort.ts) counts
// with that stretch; without one, or when the log was cut or corrected afterwards, the whole log counts.
export function testResults(logs: SessionLog[]): TestResult[] {
  return logs
    .filter((l) => l.templateId === TEST_TEMPLATE_ID)
    .flatMap((l): TestResult[] => {
      const { km, minutes } = testTotals(l);
      if (!(km >= 3 && minutes > 0)) return [];
      const effort = countingEffort(l);
      return [
        effort
          ? { date: l.completedDate, km: effort.km, minutes: effort.minutes, logId: l.id, basis: 'effort', wholeKm: km, wholeMinutes: minutes }
          : { date: l.completedDate, km, minutes, logId: l.id, basis: 'whole', wholeKm: km, wholeMinutes: minutes },
      ];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Minutes per km over 5 km, the way two tests are compared.
export function testPacePerKm(t: TestResult): number {
  return riegel(t.minutes, t.km, 5) / 5;
}

// Two tests are compared on the same basis: when one counts with its best stretch and the other
// with the whole run, both are read as the whole run, so a different basis never makes a doubt.
export function comparablePaces(a: TestResult, b: TestResult): [number, number] {
  if (a.basis === b.basis || !a.wholeKm || !a.wholeMinutes || !b.wholeKm || !b.wholeMinutes) return [testPacePerKm(a), testPacePerKm(b)];
  return [riegel(a.wholeMinutes, a.wholeKm, 5) / 5, riegel(b.wholeMinutes, b.wholeKm, 5) / 5];
}

// A test clearly slower than the one before it (more than the normal spread).
export function isSlowerTest(t: TestResult, previous: TestResult | undefined): boolean {
  if (!previous) return false;
  const [now, before] = comparablePaces(t, previous);
  return now / before - 1 > TEST_NOISE;
}

export interface TestJudgmentOptions {
  judgments?: TestJudgment[];
  // "Twijfeltest eerst vragen" (AppSettings.askDoubtTest, default on): a test that came out
  // slower than the one before it waits for your answer. Off: the latest test counts, as it
  // did before. A test you marked "Telt niet mee" is left out in both cases.
  ask?: boolean;
}

export interface CountedTests {
  // The tests that count for paces and prediction, oldest first.
  tests: TestResult[];
  // The newest slower test that waits for an answer (its paces are not in yet).
  pending?: TestResult;
  // Every test that was held back for an answer, oldest first: also one an even newer test
  // waits behind, or one a later test has passed.
  waiting: TestResult[];
  // The tests you marked "Telt niet mee".
  ignored: TestResult[];
}

export function countedTests(logs: SessionLog[], options: TestJudgmentOptions = {}): CountedTests {
  const verdict = new Map((options.judgments ?? []).map((j) => [j.logId, j.verdict]));
  const ask = options.ask !== false;
  const tests: TestResult[] = [];
  const ignored: TestResult[] = [];
  const waiting: TestResult[] = [];
  let pending: TestResult | undefined;
  for (const t of testResults(logs)) {
    const v = t.logId ? verdict.get(t.logId) : undefined;
    if (v === 'ignore') {
      ignored.push(t);
      continue;
    }
    if (ask && v !== 'counts' && isSlowerTest(t, tests.at(-1))) {
      pending = t;
      waiting.push(t);
      continue;
    }
    pending = undefined;
    tests.push(t);
  }
  return { tests, pending, waiting, ignored };
}

export interface RacePrediction {
  latest: TestResult;
  predictedMinutes?: number; // undefined beyond RIEGEL_MAX_KM
  // Against the test before, as a share: negative = faster. Undefined
  // with one test; |change| < TEST_NOISE is within the normal spread.
  change?: number;
}

export function predictRace(logs: SessionLog[], raceKm: number, options?: TestJudgmentOptions): RacePrediction | undefined {
  const tests = options ? countedTests(logs, options).tests : testResults(logs);
  const latest = tests.at(-1);
  if (!latest) return undefined;
  const prev = tests.at(-2);
  return {
    latest,
    predictedMinutes: raceKm <= RIEGEL_MAX_KM ? riegel(latest.minutes, latest.km, raceKm) : undefined,
    change: prev ? (([a, b]) => a / b - 1)(comparablePaces(latest, prev)) : undefined,
  };
}

export function formatRaceTime(minutes: number): string {
  const total = Math.round(minutes * 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}
