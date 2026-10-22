import { describe, expect, it } from 'vitest';
import { GOAL_DATE_PAST_MESSAGE, goalDateProblem } from './goalDate';

describe('goalDateProblem', () => {
  it('weigert een datum in het verleden', () => {
    expect(goalDateProblem('2025-01-01', '2026-10-22')).toBe(GOAL_DATE_PAST_MESSAGE);
    expect(goalDateProblem('2026-10-21', '2026-10-22')).toBe(GOAL_DATE_PAST_MESSAGE);
  });
  it('laat vandaag en later toe', () => {
    expect(goalDateProblem('2026-10-22', '2026-10-22')).toBeUndefined();
    expect(goalDateProblem('2027-08-01', '2026-10-22')).toBeUndefined();
  });
  it('laat geen datum toe (gepauzeerd doel)', () => {
    expect(goalDateProblem(undefined, '2026-10-22')).toBeUndefined();
  });
  it('laat de datum die het doel al had met rust', () => {
    expect(goalDateProblem('2025-01-01', '2026-10-22', '2025-01-01')).toBeUndefined();
    expect(goalDateProblem('2025-02-01', '2026-10-22', '2025-01-01')).toBe(GOAL_DATE_PAST_MESSAGE);
  });
});
