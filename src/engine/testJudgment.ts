// ASCEND: your own verdict on a test run, and what it does to your paces.
//
// Until now the latest test set every training pace, however the day went: a ride
// before it, wind or sore legs made one slow test change all of them, and the watch
// with them. Now a test that came out clearly slower than the one before it asks
// first ("Telt mee" or "Telt niet mee"), and a test can always be left out afterwards.
// The log stays as it is; the verdict is a list next to the logs
// (AppSettings.testJudgments), the same pattern as the verdicts on short nights.
// docs/beslissingen/2026-10-27-testloop-lezen.md
//
// Pure: no React, no IndexedDB.

import type { SessionLog } from '../models/training';
import type { TestJudgment, TestVerdict } from '../models/testJudgment';
import { formatPaceRange, racePaces, type RacePaces } from './racePaces';
import { countedTests, formatRaceTime, TEST_DISTANCE_KM, type CountedTests, type TestJudgmentOptions, type TestResult } from './racePrediction';

export const MAX_TEST_JUDGMENTS = 60;

export interface TestJudgmentSettings {
  testJudgments?: TestJudgment[];
  askDoubtTest?: boolean;
}

// The options the paces, the prediction and the watch read, from the settings.
export function judgmentOptions(settings: TestJudgmentSettings | undefined): TestJudgmentOptions {
  return { judgments: settings?.testJudgments, ask: settings?.askDoubtTest !== false };
}

export function upsertTestJudgment(list: TestJudgment[] | undefined, judgment: TestJudgment): TestJudgment[] {
  return [...(list ?? []).filter((j) => j.logId !== judgment.logId), judgment].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_TEST_JUDGMENTS);
}

export function removeTestJudgment(list: TestJudgment[] | undefined, logId: string): TestJudgment[] {
  return (list ?? []).filter((j) => j.logId !== logId);
}

// A restore: the union per log, the device's own verdict wins.
export function mergeTestJudgments(incoming: TestJudgment[] | undefined, current: TestJudgment[] | undefined): TestJudgment[] {
  const byLog = new Map((incoming ?? []).map((j) => [j.logId, j]));
  for (const j of current ?? []) byLog.set(j.logId, j);
  return [...byLog.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_TEST_JUDGMENTS);
}

// --- what a test is, for the person looking at it --------------------------------

// "Beste 5 km uit je run: 27:40" or "Hele run: 6,03 km in 36:00".
export function testBasisLine(t: TestResult): string {
  if (t.basis === 'effort') return `Beste ${String(TEST_DISTANCE_KM).replace('.', ',')} km uit je run: ${formatRaceTime(t.minutes)}`;
  return `Hele run: ${String(Math.round(t.km * 100) / 100).replace('.', ',')} km in ${formatRaceTime(t.minutes)}`;
}

export type TestStanding = 'counts' | 'pending' | 'ignored';

export interface TestState {
  result: TestResult;
  standing: TestStanding;
}

// Where one test log stands: it counts, it waits for your answer, or you left it out.
// Undefined for a log that is not a usable test.
export function testState(logs: SessionLog[], options: TestJudgmentOptions, logId: string): TestState | undefined {
  const counted = countedTests(logs, options);
  const inList = counted.tests.find((t) => t.logId === logId);
  if (inList) return { result: inList, standing: 'counts' };
  if (counted.pending?.logId === logId) return { result: counted.pending, standing: 'pending' };
  const out = counted.ignored.find((t) => t.logId === logId);
  return out ? { result: out, standing: 'ignored' } : undefined;
}

// --- the paces, with the verdicts applied -----------------------------------------

export function pacesFromLogs(logs: SessionLog[], options: TestJudgmentOptions, raceKm = 10): { paces: RacePaces | undefined; counted: CountedTests } {
  const counted = countedTests(logs, options);
  return { paces: racePaces(counted.tests, raceKm), counted };
}

export interface PaceChangeRow {
  label: string;
  from: string;
  to: string;
}

// Which paces change when this verdict is given: old to new, in the words of the debrief.
// Empty when nothing the training or the watch reads would change.
export function paceChangeRows(before: RacePaces | undefined, after: RacePaces | undefined): PaceChangeRow[] {
  if (!after && !before) return [];
  const rows: [string, (p: RacePaces) => string][] = [
    ['Rustige loop', (p) => formatPaceRange(p.easy)],
    ['Tempoloop', (p) => formatPaceRange(p.threshold)],
    ['Intervallen', (p) => formatPaceRange(p.interval)],
  ];
  const out: PaceChangeRow[] = [];
  for (const [label, text] of rows) {
    const to = after ? text(after) : 'geen test meer';
    const from = before ? text(before) : 'nog geen';
    if (from !== to) out.push({ label, from, to });
  }
  return out;
}

// What a verdict would do to the paces of today, without giving it.
export function previewVerdict(logs: SessionLog[], settings: TestJudgmentSettings | undefined, logId: string, verdict: TestVerdict, today: string): PaceChangeRow[] {
  const options = judgmentOptions(settings);
  const before = pacesFromLogs(logs, options).paces;
  const after = pacesFromLogs(logs, { ...options, judgments: upsertTestJudgment(options.judgments, { logId, verdict, date: today }) }).paces;
  return paceChangeRows(before, after);
}
