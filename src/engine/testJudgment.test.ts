import { describe, expect, it } from 'vitest';
import type { SessionLog } from '../models/training';
import type { TestJudgment } from '../models/testJudgment';
import { racePaces } from './racePaces';
import { countedTests, predictRace, testResults } from './racePrediction';
import {
  judgmentOptions,
  mergeTestJudgments,
  pacesFromLogs,
  paceChangeRows,
  previewVerdict,
  removeTestJudgment,
  testBasisLine,
  testState,
  upsertTestJudgment,
} from './testJudgment';

// Invented data: a 5 km test log, optionally with a best effort read from the series.
function test(id: string, date: string, km: number, minutes: number, bestEffort?: { km: number; minutes: number }): SessionLog {
  return {
    id,
    templateId: 'tpl_test_run',
    completedDate: date,
    type: 'cardio',
    durationMinutes: minutes,
    cardioData: { distanceKm: km, durationMinutes: minutes },
    ...(bestEffort ? { bestEffort } : {}),
    source: 'manual',
  } as unknown as SessionLog;
}

const NORMAL = test('a', '2027-01-10', 5, 28);
const SLOWER = test('b', '2027-02-10', 5, 32); // 14% slower
const FASTER = test('c', '2027-03-10', 5, 27);

describe('the best 5 km of a test log', () => {
  it('counts the stretch when the log carries one, and the whole log when not', () => {
    const [a] = testResults([test('x', '2027-01-10', 6.03, 36, { km: 5, minutes: 27.67 })]);
    expect(a.basis).toBe('effort');
    expect(a.km).toBe(5);
    expect(a.minutes).toBeCloseTo(27.67);
    expect(a.wholeKm).toBe(6.03);
    const [b] = testResults([test('y', '2027-01-10', 6.03, 36)]);
    expect(b.basis).toBe('whole');
    expect(b.km).toBe(6.03);
    expect(b.minutes).toBe(36);
  });

  it('ignores a damaged best effort and one longer than the run', () => {
    expect(testResults([test('x', '2027-01-10', 5, 30, { km: 5, minutes: 0 })])[0].basis).toBe('whole');
    expect(testResults([test('x', '2027-01-10', 4, 30, { km: 5, minutes: 25 })])[0].basis).toBe('whole');
  });

  it('says which of the two was used', () => {
    expect(testBasisLine(testResults([test('x', '2027-01-10', 6.03, 36, { km: 5, minutes: 27.67 })])[0])).toBe('Beste 5 km uit je run: 27:40');
    expect(testBasisLine(testResults([test('y', '2027-01-10', 6.03, 36)])[0])).toBe('Hele run: 6,03 km in 36:00');
  });
});

describe('a doubtful test', () => {
  const logs = [NORMAL, SLOWER];

  it('keeps the paces of the previous test while it waits for an answer', () => {
    const c = countedTests(logs, { ask: true });
    expect(c.tests.map((t) => t.logId)).toEqual(['a']);
    expect(c.pending?.logId).toBe('b');
    expect(pacesFromLogs(logs, { ask: true }).paces).toEqual(racePaces(testResults([NORMAL])));
  });

  it('takes the new paces in on "Telt mee"', () => {
    const judgments: TestJudgment[] = [{ logId: 'b', verdict: 'counts', date: '2027-02-11' }];
    const c = countedTests(logs, { ask: true, judgments });
    expect(c.tests.map((t) => t.logId)).toEqual(['a', 'b']);
    expect(c.pending).toBeUndefined();
    expect(pacesFromLogs(logs, { ask: true, judgments }).paces?.test.logId).toBe('b');
  });

  it('keeps the previous paces on "Telt niet mee", and the test out of the prediction', () => {
    const judgments: TestJudgment[] = [{ logId: 'b', verdict: 'ignore', date: '2027-02-11' }];
    const c = countedTests(logs, { ask: true, judgments });
    expect(c.pending).toBeUndefined();
    expect(c.ignored.map((t) => t.logId)).toEqual(['b']);
    expect(pacesFromLogs(logs, { ask: true, judgments }).paces?.test.logId).toBe('a');
    expect(predictRace(logs, 10, { ask: true, judgments })!.latest.logId).toBe('a');
  });

  it('asks nothing when the setting is off: the latest test counts as before', () => {
    expect(pacesFromLogs(logs, { ask: false }).paces?.test.logId).toBe('b');
    expect(countedTests(logs, { ask: false }).pending).toBeUndefined();
  });

  it('still lets you leave a test out when the setting is off', () => {
    const judgments: TestJudgment[] = [{ logId: 'b', verdict: 'ignore', date: '2027-02-11' }];
    expect(pacesFromLogs(logs, { ask: false, judgments }).paces?.test.logId).toBe('a');
  });

  it('works as before for a test that is not slower', () => {
    const c = countedTests([NORMAL, FASTER], { ask: true });
    expect(c.tests.map((t) => t.logId)).toEqual(['a', 'c']);
    expect(c.pending).toBeUndefined();
    const same = countedTests([NORMAL, test('d', '2027-02-10', 5, 28.5)], { ask: true });
    expect(same.tests).toHaveLength(2);
  });

  it('compares a later test with the last one that counts', () => {
    // b waits; a later faster test is compared with a, not with b.
    const c = countedTests([NORMAL, SLOWER, FASTER], { ask: true });
    expect(c.tests.map((t) => t.logId)).toEqual(['a', 'c']);
    expect(c.pending).toBeUndefined();
  });

  it('never asks about the first test', () => {
    expect(countedTests([SLOWER], { ask: true }).tests).toHaveLength(1);
  });

  it('uses the best 5 km, not the whole run, to judge whether a test was slower', () => {
    // 6 km in 36 minutes looks slow per km, but the best 5 km was as fast as before.
    const long = test('e', '2027-02-10', 6.03, 36, { km: 5, minutes: 28.2 });
    expect(countedTests([NORMAL, long], { ask: true }).pending).toBeUndefined();
  });
});

describe('a test left out afterwards', () => {
  it('takes a normal test out of the paces and the prediction, and the paces fall back', () => {
    const judgments: TestJudgment[] = [{ logId: 'c', verdict: 'ignore', date: '2027-03-11' }];
    const logs = [NORMAL, FASTER];
    expect(pacesFromLogs(logs, { ask: true, judgments }).paces?.test.logId).toBe('a');
    expect(testState(logs, { ask: true, judgments }, 'c')?.standing).toBe('ignored');
    expect(testState(logs, { ask: true, judgments }, 'a')?.standing).toBe('counts');
    expect(testState([NORMAL, SLOWER], { ask: true }, 'b')?.standing).toBe('pending');
  });

  it('has no paces when the only test is left out', () => {
    const judgments: TestJudgment[] = [{ logId: 'a', verdict: 'ignore', date: '2027-01-11' }];
    expect(pacesFromLogs([NORMAL], { ask: true, judgments }).paces).toBeUndefined();
  });
});

describe('what changes', () => {
  it('shows old to new for every pace that moves', () => {
    const rows = previewVerdict([NORMAL, SLOWER], {}, 'b', 'counts', '2027-02-11');
    expect(rows.map((r) => r.label)).toEqual(['Rustige loop', 'Tempoloop', 'Intervallen']);
    expect(rows[0].from).not.toBe(rows[0].to);
    expect(rows[0].from).toMatch(/per km$/);
  });

  it('shows nothing when the verdict changes no pace', () => {
    expect(previewVerdict([NORMAL, SLOWER], {}, 'b', 'ignore', '2027-02-11')).toEqual([]);
  });

  it('says there are no paces left when the only test goes', () => {
    const rows = previewVerdict([NORMAL], {}, 'a', 'ignore', '2027-01-11');
    expect(rows[0].to).toBe('geen test meer');
    expect(paceChangeRows(undefined, undefined)).toEqual([]);
  });

  it('reads the setting as on unless it is false', () => {
    expect(judgmentOptions({}).ask).toBe(true);
    expect(judgmentOptions({ askDoubtTest: false }).ask).toBe(false);
  });
});

describe('the list of verdicts', () => {
  it('keeps one verdict per log, the last one', () => {
    let list = upsertTestJudgment(undefined, { logId: 'a', verdict: 'ignore', date: '2027-01-01' });
    list = upsertTestJudgment(list, { logId: 'a', verdict: 'counts', date: '2027-01-02' });
    expect(list).toEqual([{ logId: 'a', verdict: 'counts', date: '2027-01-02' }]);
    expect(removeTestJudgment(list, 'a')).toEqual([]);
  });

  it('merges on a restore with the device winning', () => {
    const merged = mergeTestJudgments(
      [{ logId: 'a', verdict: 'ignore', date: '2027-01-01' }, { logId: 'b', verdict: 'counts', date: '2027-02-01' }],
      [{ logId: 'a', verdict: 'counts', date: '2027-01-05' }],
    );
    expect(merged).toEqual([
      { logId: 'a', verdict: 'counts', date: '2027-01-05' },
      { logId: 'b', verdict: 'counts', date: '2027-02-01' },
    ]);
  });
});
