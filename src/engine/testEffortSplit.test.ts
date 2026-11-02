import { describe, it, expect } from 'vitest';
import { EASY_PART_RPE, testEffortSplit } from './testEffortSplit';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { BestEffort, SessionLog } from '../models/training';

// Nagemaakte gegevens: een testloop van het horloge, inlopen, 5 km en uitlopen in één activiteit.
const { templates } = buildDefaultProgramData();
const test = templates.find((t) => t.id === 'tpl_test_run')!;
const race = templates.find((t) => t.id === 'tpl_race')!;
const easy = templates.find((t) => t.id === 'tpl_easy_run')!;
const effort = (over: Partial<BestEffort> = {}): BestEffort => ({ km: 5, minutes: 25, wholeKm: 8.2, wholeMinutes: 45, accepted: true, v: 2, ...over });
const watchTest = (over: Partial<SessionLog> = {}): SessionLog => ({
  id: 'l1', templateId: 'tpl_test_run', type: 'cardio', completedDate: '2026-11-12', completedAt: '2026-11-12T10:00:00Z', variant: 'full',
  durationMinutes: 45, rpe: 10, source: 'garmin', externalId: 'intervals.icu:i1',
  cardioData: { durationMinutes: 45, distanceKm: 8.2, source: 'garmin' }, bestEffort: effort(), ...over,
});

describe('testEffortSplit: a linked test with warm-up and cool-down', () => {
  it('the 5 km from the best effort is the hard part, the rest is easy', () => {
    expect(testEffortSplit(watchTest(), test)).toEqual({ hardMinutes: 25, easyMinutes: 20 });
    expect(EASY_PART_RPE).toBe(3);
  });

  it('counts also while the best effort waits for Akkoord: the minutes were run either way', () => {
    expect(testEffortSplit(watchTest({ bestEffort: effort({ accepted: undefined }) }), test)).toEqual({ hardMinutes: 25, easyMinutes: 20 });
  });

  it('a race is recognised by its role too', () => {
    expect(testEffortSplit(watchTest({ templateId: 'tpl_race' }), race)).toEqual({ hardMinutes: 25, easyMinutes: 20 });
  });

  it('without detail it stays as it is', () => {
    // Logged by hand, only the 5 km: no best effort.
    expect(testEffortSplit(watchTest({ bestEffort: undefined, durationMinutes: 25, cardioData: { durationMinutes: 25, distanceKm: 5, source: 'manual' } }), test)).toBeUndefined();
    // Not a test or race.
    expect(testEffortSplit(watchTest({ templateId: 'tpl_easy_run' }), easy)).toBeUndefined();
    expect(testEffortSplit(watchTest(), undefined)).toBeUndefined();
  });

  it('a best effort for other totals (a correction at the source), a cut log or a broken one: no split', () => {
    expect(testEffortSplit(watchTest({ bestEffort: effort({ wholeMinutes: 50 }) }), test)).toBeUndefined();
    expect(testEffortSplit(watchTest({ trim: { at: '2026-11-12T12:00:00Z', startSec: 300, endSec: 2400 } as unknown as SessionLog['trim'] }), test)).toBeUndefined();
    expect(testEffortSplit(watchTest({ bestEffort: { km: 5 } as BestEffort }), test)).toBeUndefined();
    expect(testEffortSplit(watchTest({ bestEffort: effort({ km: 9 }) }), test)).toBeUndefined();
  });

  it('a log that is only the test (no minute left over) is not split', () => {
    const only = watchTest({ durationMinutes: 25.4, cardioData: { durationMinutes: 25.4, distanceKm: 5.05, source: 'garmin' }, bestEffort: effort({ wholeKm: 5.05, wholeMinutes: 25.4 }) });
    expect(testEffortSplit(only, test)).toBeUndefined();
  });

  it('never changes the log', () => {
    const log = watchTest();
    const before = JSON.stringify(log);
    testEffortSplit(log, test);
    expect(JSON.stringify(log)).toBe(before);
  });
});
