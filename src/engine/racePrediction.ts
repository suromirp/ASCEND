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

import type { SessionLog } from '../models/training';
import { TEST_TEMPLATE_ID } from './raceBlock';

export const RIEGEL_EXPONENT = 1.06;
// Beyond this, Riegel underestimates the time (the marathon).
export const RIEGEL_MAX_KM = 21.1;
export const TEST_NOISE = 0.035;
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
}

export function testResults(logs: SessionLog[]): TestResult[] {
  return logs
    .filter((l) => l.templateId === TEST_TEMPLATE_ID)
    .flatMap((l) => {
      const d = l.cardioData ?? l.outdoorData;
      const km = d?.distanceKm ?? 0;
      const minutes = d?.durationMinutes || l.durationMinutes;
      return km >= 3 && minutes > 0 ? [{ date: l.completedDate, km, minutes, logId: l.id }] : [];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface RacePrediction {
  latest: TestResult;
  predictedMinutes?: number; // undefined beyond RIEGEL_MAX_KM
  // Against the test before, as a share: negative = faster. Undefined
  // with one test; |change| < TEST_NOISE is within the normal spread.
  change?: number;
}

export function predictRace(logs: SessionLog[], raceKm: number): RacePrediction | undefined {
  const tests = testResults(logs);
  const latest = tests.at(-1);
  if (!latest) return undefined;
  const prev = tests.at(-2);
  const perKm = (t: TestResult) => riegel(t.minutes, t.km, 5) / 5;
  return {
    latest,
    predictedMinutes: raceKm <= RIEGEL_MAX_KM ? riegel(latest.minutes, latest.km, raceKm) : undefined,
    change: prev ? perKm(latest) / perKm(prev) - 1 : undefined,
  };
}

export function formatRaceTime(minutes: number): string {
  const total = Math.round(minutes * 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}
