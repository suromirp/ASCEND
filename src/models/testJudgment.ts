// ASCEND: your own verdict on one test run.
//
// 'ignore' ("Telt niet mee"): the test stays in the Logboek but is left out of your
// paces and the prediction. 'counts' ("Telt mee"): a test that came out slower than
// the one before it is taken in after all. Kept per log next to the logs
// (AppSettings.testJudgments), so the log itself is never changed.
// docs/beslissingen/2026-10-27-testloop-lezen.md

export type TestVerdict = 'counts' | 'ignore';

export interface TestJudgment {
  logId: string;
  verdict: TestVerdict;
  // The day you answered, ISO date.
  date: string;
}
