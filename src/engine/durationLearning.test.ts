import { describe, it, expect } from 'vitest';
import { predictDuration, learnedStrengthDurations } from './durationLearning';
import type { SessionLog, SessionTemplate } from '../models/training';

const upper: SessionTemplate = { id: 'tpl_upper_a', name: 'Bovenlichaam A', type: 'strength', durationVariants: { full: 75, short: 45 } };
const log = (date: string, minutes: number, variant: SessionLog['variant'] = 'full'): SessionLog => ({
  id: `l-${date}-${minutes}`, templateId: 'tpl_upper_a', type: 'strength', completedDate: date, completedAt: `${date}T10:00:00Z`, variant, durationMinutes: minutes, source: 'manual',
});

describe('predictDuration', () => {
  it('uses the template default, then your own estimate', () => {
    expect(predictDuration(upper, [], undefined)).toEqual({ minutes: 75, source: 'default', basedOn: 0 });
    expect(predictDuration(upper, [log('2026-10-01', 60)], 55)).toEqual({ minutes: 55, source: 'estimate', basedOn: 0 });
  });

  it('learns the usual duration from three or more full trainings, rounded to 5', () => {
    const logs = [log('2026-09-28', 58), log('2026-10-01', 62), log('2026-10-04', 66)];
    expect(predictDuration(upper, logs, 80)).toEqual({ minutes: 60, source: 'learned', basedOn: 3 });
  });

  it('ignores short versions, forgotten timers and old trainings beyond the last six', () => {
    const logs = [
      log('2026-09-01', 120), log('2026-09-02', 120), log('2026-09-03', 120),
      ...['2026-09-20', '2026-09-22', '2026-09-24', '2026-09-26', '2026-09-28', '2026-09-30'].map((d) => log(d, 50)),
      log('2026-10-01', 20, 'short'), log('2026-10-02', 400),
    ];
    expect(predictDuration(upper, logs, undefined).minutes).toBe(50);
  });

  it('only covers strength trainings without a week-by-week target', () => {
    const run: SessionTemplate = { id: 'run', name: 'Run', type: 'cardio', durationVariants: { full: 35 } };
    expect(learnedStrengthDurations([upper, run], [], { tpl_upper_a: 65 })).toEqual({ tpl_upper_a: 65 });
  });
});
