import { describe, it, expect } from 'vitest';
import { weightDue, addWeightEntry, packSharePct, latestWeight } from './bodyWeight';

describe('body weight', () => {
  const e = (date: string, kg: number) => ({ date, kg, source: 'manual' as const });

  it('asks for a weight when there is none, or the last one is two weeks old', () => {
    expect(weightDue([], undefined, '2026-10-03')).toBe(true);
    expect(weightDue([e('2026-09-25', 80)], undefined, '2026-10-03')).toBe(false);
    expect(weightDue([e('2026-09-19', 80)], undefined, '2026-10-03')).toBe(true);
  });

  it('follows the reminder setting, and 0 never reminds', () => {
    expect(weightDue([e('2026-09-25', 80)], undefined, '2026-10-03', 7)).toBe(true);
    expect(weightDue([], undefined, '2026-10-03', 0)).toBe(false);
  });

  it('"later" snoozes the reminder for three days', () => {
    expect(weightDue([], '2026-10-02', '2026-10-03')).toBe(false);
    expect(weightDue([], '2026-09-30', '2026-10-03')).toBe(true);
  });

  it('keeps one entry per day and reads the latest', () => {
    const entries = addWeightEntry(addWeightEntry([e('2026-09-01', 81)], e('2026-10-03', 80)), e('2026-10-03', 79.5));
    expect(entries).toHaveLength(2);
    expect(latestWeight(entries)?.kg).toBe(79.5);
  });

  it('pack weight as a share of body weight', () => {
    expect(packSharePct(12, [e('2026-10-03', 80)])).toBe(15);
    expect(packSharePct(12, [])).toBeUndefined();
  });
});
