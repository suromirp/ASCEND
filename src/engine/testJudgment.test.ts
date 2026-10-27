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
  capTestJudgments,
  effortOffer,
  previewEffort,
  mayAcceptAtOnce,
  MAX_TEST_JUDGMENTS,
  pendingTestLine,
  PENDING_TEST_LINE,
  effortOfferLine,
  EFFORT_OFFER_LINE,
  awaitsEffort,
} from './testJudgment';

// Invented data: a 5 km test log, optionally with a best effort read from the series.
function test(id: string, date: string, km: number, minutes: number, bestEffort?: { km: number; minutes: number; accepted?: boolean; wholeKm?: number; wholeMinutes?: number }): SessionLog {
  return {
    id,
    templateId: 'tpl_test_run',
    completedDate: date,
    type: 'cardio',
    durationMinutes: minutes,
    cardioData: { distanceKm: km, durationMinutes: minutes },
    ...(bestEffort ? { bestEffort: { accepted: true, wholeKm: km, wholeMinutes: minutes, ...bestEffort } } : {}),
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
    const before = test('a2', '2027-01-10', 6, 34, { km: 5, minutes: 28 });
    expect(countedTests([before, long], { ask: true }).pending).toBeUndefined();
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

describe('a doubtful test between two slow ones', () => {
  // a normal, b slower than a, c slower than a as well: both b and c wait.
  const C2 = test('c2', '2027-03-10', 5, 33);
  const logs = [NORMAL, SLOWER, C2];

  it('keeps the question on the older one and says a newer test waits as well', () => {
    const c = countedTests(logs, { ask: true });
    expect(c.pending?.logId).toBe('c2');
    expect(c.waiting.map((t) => t.logId)).toEqual(['b', 'c2']);
    const b = testState(logs, { ask: true }, 'b')!;
    expect(b.standing).toBe('pending');
    expect(b.newerWaits).toBe(true);
    const c2 = testState(logs, { ask: true }, 'c2')!;
    expect(c2.standing).toBe('pending');
    expect(c2.newerWaits).toBe(false);
  });

  it('lets you answer the older one, and compares the newer with it after', () => {
    const judgments: TestJudgment[] = [{ logId: 'b', verdict: 'counts', date: '2027-03-11' }];
    const c = countedTests(logs, { ask: true, judgments });
    expect(c.tests.map((t) => t.logId)).toEqual(['a', 'b', 'c2']);
    expect(c.pending).toBeUndefined();
  });

  it('marks a slower test that a faster, newer one has passed as held', () => {
    expect(testState([NORMAL, SLOWER, FASTER], { ask: true }, 'b')?.standing).toBe('held');
  });
});

describe('the best stretch only counts after it is accepted', () => {
  const unaccepted = test('x', '2027-02-10', 6.03, 36, { km: 5, minutes: 25, accepted: false });
  const PREV = test('p0', '2027-01-10', 6, 34, { km: 5, minutes: 28 });
  const accepted = test('x', '2027-02-10', 6.03, 36, { km: 5, minutes: 25 });

  it('counts the whole run while the best stretch has not been accepted', () => {
    expect(testResults([unaccepted])[0].basis).toBe('whole');
    expect(testResults([accepted])[0].basis).toBe('effort');
    expect(effortOffer(unaccepted)).toEqual({ km: 5, minutes: 25 });
    expect(effortOffer(accepted)).toBeUndefined();
  });

  it('shows the paces from now to later when the test already sets them', () => {
    const rows = previewEffort([PREV, unaccepted], {}, 'x');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].from).not.toBe(rows[0].to);
  });

  it('lets it count at once for a test that has just come in, or when no pace changes', () => {
    expect(mayAcceptAtOnce([PREV, unaccepted], {}, 'x', true)).toBe(true);
    expect(mayAcceptAtOnce([PREV, unaccepted], {}, 'x', false)).toBe(false);
    // A waiting slower test stays slower on its best stretch: the paces do not move.
    const slowWhole = test('w', '2027-02-10', 6.03, 40, { km: 5, minutes: 32, accepted: false });
    expect(mayAcceptAtOnce([PREV, slowWhole], { askDoubtTest: true }, 'w', false)).toBe(true);
  });

  it('ignores a best effort read for other totals than the log has now', () => {
    const corrected = test('x', '2027-02-10', 6.03, 36, { km: 5, minutes: 27.67, wholeKm: 6.5, wholeMinutes: 39 });
    expect(testResults([corrected])[0].basis).toBe('whole');
    expect(effortOffer(corrected)).toBeUndefined();
    // Read before the fingerprint existed: not trusted.
    const legacy = test('x', '2027-02-10', 6.03, 36, { km: 5, minutes: 27.67 });
    delete (legacy.bestEffort as { wholeKm?: number }).wholeKm;
    expect(testResults([legacy])[0].basis).toBe('whole');
  });

  it('never compares a best stretch with a whole run: both are read as the whole run', () => {
    // previous: whole run 5 km in 28:00; new: best stretch 27:00 of a 6 km run in 34 minutes (slower whole).
    const previous = test('p', '2027-01-10', 5, 28);
    const next = test('q', '2027-02-10', 6, 36, { km: 5, minutes: 27 });
    // On the best stretch it is faster (no doubt); on the whole run it is 34/6 vs 28/5, slower per km.
    const c = countedTests([previous, next], { ask: true });
    const whole = (t: { wholeMinutes?: number; wholeKm?: number }) => t.wholeMinutes! / t.wholeKm!;
    expect(whole(testResults([next])[0])).toBeGreaterThan(whole(testResults([previous])[0]));
    expect(c.pending?.logId).toBe('q');
  });
});

describe('the cap on verdicts', () => {
  it('lets a "Telt niet mee" fall off last', () => {
    const list: TestJudgment[] = [{ logId: 'keep', verdict: 'ignore', date: '2020-01-01' }];
    for (let i = 0; i < MAX_TEST_JUDGMENTS + 5; i++) list.push({ logId: `c${i}`, verdict: 'counts', date: `2027-01-${String((i % 28) + 1).padStart(2, '0')}` });
    const capped = capTestJudgments(list);
    expect(capped).toHaveLength(MAX_TEST_JUDGMENTS);
    expect(capped.some((j) => j.logId === 'keep')).toBe(true);
  });
});

describe('the quiet line on Vandaag', () => {
  it('shows while a slower test waits, and names that test', () => {
    expect(pendingTestLine([NORMAL, SLOWER], {})).toEqual({ logId: 'b', text: PENDING_TEST_LINE });
  });

  it('is gone once you answered, when nothing was slower, or when asking is off', () => {
    expect(pendingTestLine([NORMAL, SLOWER], { testJudgments: [{ logId: 'b', verdict: 'ignore', date: '2027-02-11' }] })).toBeUndefined();
    expect(pendingTestLine([NORMAL, FASTER], {})).toBeUndefined();
    expect(pendingTestLine([NORMAL, SLOWER], { askDoubtTest: false })).toBeUndefined();
    expect(pendingTestLine([], {})).toBeUndefined();
  });

  it('points at the newest waiting test when two wait', () => {
    expect(pendingTestLine([NORMAL, SLOWER, test('c2', '2027-03-10', 5, 33)], {})?.logId).toBe('c2');
  });
});

describe('the quiet line for a best 5 km that waits for Akkoord', () => {
  // A slow whole run of 6 km in 36:00 after a quicker test; its best 5 km has not been accepted yet.
  const OFFERED = test('d', '2027-04-10', 6, 30, { km: 5, minutes: 25, accepted: false });
  const ACCEPTED = test('d', '2027-04-10', 6, 30, { km: 5, minutes: 25 });

  it('shows when counting the stretch would change a pace, and points at that test', () => {
    expect(effortOfferLine([NORMAL, OFFERED], {})).toEqual({ logId: 'd', text: EFFORT_OFFER_LINE });
    expect(awaitsEffort([NORMAL, OFFERED], 'd')).toBe(true);
  });

  it('is quiet when it counts already, when nothing waits or when you left the test out', () => {
    expect(effortOfferLine([NORMAL, ACCEPTED], {})).toBeUndefined();
    expect(effortOfferLine([NORMAL], {})).toBeUndefined();
    expect(awaitsEffort([NORMAL, ACCEPTED], 'd')).toBe(false);
    expect(effortOfferLine([NORMAL, OFFERED], { testJudgments: [{ logId: 'd', verdict: 'ignore', date: '2027-04-11' }] })).toBeUndefined();
  });

  it('never shows next to the line of a doubt test', () => {
    const slow = test('e', '2027-05-10', 5, 33);
    const both = [NORMAL, OFFERED, slow];
    expect(pendingTestLine(both, {})?.logId).toBe('e');
    expect(effortOfferLine(both, {})).toBeUndefined();
  });
});
