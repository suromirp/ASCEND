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
import { effortFingerprint, isStaleEffort, isUsableBestEffort } from './bestEffort';
import { countedTests, formatRaceTime, TEST_DISTANCE_KM, testTotals, type CountedTests, type TestJudgmentOptions, type TestResult } from './racePrediction';
import { TEST_TEMPLATE_ID } from './raceBlock';

export const MAX_TEST_JUDGMENTS = 60;

export interface TestJudgmentSettings {
  testJudgments?: TestJudgment[];
  askDoubtTest?: boolean;
}

// The options the paces, the prediction and the watch read, from the settings.
export function judgmentOptions(settings: TestJudgmentSettings | undefined): TestJudgmentOptions {
  return { judgments: settings?.testJudgments, ask: settings?.askDoubtTest !== false };
}

// Keeps the list to its limit, oldest first, and lets a "Telt niet mee" fall off last: that is a
// choice of yours, while a "Telt mee" only lifts a doubt and loses little when it goes.
export function capTestJudgments(list: TestJudgment[]): TestJudgment[] {
  const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
  let over = sorted.length - MAX_TEST_JUDGMENTS;
  if (over <= 0) return sorted;
  const drop = new Set<TestJudgment>();
  for (const j of sorted) {
    if (over > 0 && j.verdict === 'counts') {
      drop.add(j);
      over--;
    }
  }
  for (const j of sorted) {
    if (over > 0 && !drop.has(j)) {
      drop.add(j);
      over--;
    }
  }
  return sorted.filter((j) => !drop.has(j));
}

export function upsertTestJudgment(list: TestJudgment[] | undefined, judgment: TestJudgment): TestJudgment[] {
  return capTestJudgments([...(list ?? []).filter((j) => j.logId !== judgment.logId), judgment]);
}

export function removeTestJudgment(list: TestJudgment[] | undefined, logId: string): TestJudgment[] {
  return (list ?? []).filter((j) => j.logId !== logId);
}

// A restore: the union per log, the device's own verdict wins.
export function mergeTestJudgments(incoming: TestJudgment[] | undefined, current: TestJudgment[] | undefined): TestJudgment[] {
  const byLog = new Map((incoming ?? []).map((j) => [j.logId, j]));
  for (const j of current ?? []) byLog.set(j.logId, j);
  return capTestJudgments([...byLog.values()]);
}

// --- what a test is, for the person looking at it --------------------------------

// "Beste 5 km uit je run: 27:40" or "Hele run: 6,03 km in 36:00".
export function testBasisLine(t: TestResult): string {
  if (t.basis === 'effort') return `Beste ${String(TEST_DISTANCE_KM).replace('.', ',')} km uit je run: ${formatRaceTime(t.minutes)}`;
  return `Hele run: ${String(Math.round(t.km * 100) / 100).replace('.', ',')} km in ${formatRaceTime(t.minutes)}`;
}

// 'held': a slower test that a newer test has passed (the newer one counts), so nothing waits on it.
export type TestStanding = 'counts' | 'pending' | 'held' | 'ignored';

export interface TestState {
  result: TestResult;
  standing: TestStanding;
  // A newer test also waits for an answer, so this one is not the last word on your paces.
  newerWaits?: boolean;
}

// Where one test log stands: it counts, it waits for your answer, it was passed by a newer test, or
// you left it out. Undefined for a log that is not a usable test.
export function testState(logs: SessionLog[], options: TestJudgmentOptions, logId: string): TestState | undefined {
  const counted = countedTests(logs, options);
  const inList = counted.tests.find((t) => t.logId === logId);
  if (inList) return { result: inList, standing: 'counts' };
  const held = counted.waiting.find((t) => t.logId === logId);
  if (held) {
    const newestCounted = counted.tests.at(-1);
    if (newestCounted && newestCounted.date > held.date) return { result: held, standing: 'held' };
    return { result: held, standing: 'pending', newerWaits: counted.waiting.indexOf(held) < counted.waiting.length - 1 };
  }
  const out = counted.ignored.find((t) => t.logId === logId);
  return out ? { result: out, standing: 'ignored' } : undefined;
}

// --- the best stretch of a test: when it may count ---------------------------------

// The best effort a log carries but that does not count yet (not accepted), read for the totals
// the log has now. Undefined when there is none, or when it is stale or the log was cut.
export function effortOffer(log: SessionLog): { km: number; minutes: number } | undefined {
  const b = log.bestEffort;
  if (log.templateId !== TEST_TEMPLATE_ID || log.trim || !isUsableBestEffort(b) || b.accepted === true) return undefined;
  const { km, minutes } = testTotals(log);
  if (b.km > km + 0.05 || isStaleEffort(b, km, minutes)) return undefined;
  return { km: b.km, minutes: b.minutes };
}

// Does this test log still want its best stretch read from the series? Not when it has a usable
// one read for the totals it has now, nor when the series was already tried for these totals and
// gave none (a treadmill, holes, a distance that does not match), nor when it was cut.
export function wantsBestEffort(log: SessionLog): boolean {
  if (log.templateId !== TEST_TEMPLATE_ID || log.trim) return false;
  const { km, minutes } = testTotals(log);
  if (!(km >= 3 && minutes > 0)) return false;
  if (isUsableBestEffort(log.bestEffort) && !isStaleEffort(log.bestEffort, km, minutes)) return false;
  return log.bestEffortTried !== effortFingerprint(km, minutes);
}

// The logs as they would be once this log's best effort counts.
export function withEffortAccepted(logs: SessionLog[], logId: string): SessionLog[] {
  return logs.map((l) => (l.id === logId && l.bestEffort ? { ...l, bestEffort: { ...l.bestEffort, accepted: true } } : l));
}

// Which paces change when this best stretch starts to count: the same rows as for a verdict.
export function previewEffort(logs: SessionLog[], settings: TestJudgmentSettings | undefined, logId: string): PaceChangeRow[] {
  const options = judgmentOptions(settings);
  return paceChangeRows(pacesFromLogs(logs, options).paces, pacesFromLogs(withEffortAccepted(logs, logId), options).paces);
}

// A best effort that has just been read: may it count at once? Yes for a test that has just come
// in, and for any test when counting it changes none of the paces. Otherwise it waits for Akkoord.
// `logs` holds the log with the new best effort in it, not yet accepted.
export function mayAcceptAtOnce(logs: SessionLog[], settings: TestJudgmentSettings | undefined, logId: string, fresh: boolean): boolean {
  return fresh || previewEffort(logs, settings, logId).length === 0;
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

// --- the quiet line on Vandaag ----------------------------------------------------------

export const PENDING_TEST_LINE = "Je laatste test wacht op je antwoord: telt hij mee voor je tempo's?";

// The test that waits for an answer, for the line on Vandaag. Nothing when no test waits (also when
// "Twijfeltest eerst vragen" is off, since then nothing is held back).
export function pendingTestLine(logs: SessionLog[], settings: TestJudgmentSettings | undefined): { logId: string; text: string } | undefined {
  const pending = countedTests(logs, judgmentOptions(settings)).pending;
  return pending?.logId ? { logId: pending.logId, text: PENDING_TEST_LINE } : undefined;
}
