import { describe, it, expect } from 'vitest';
import { freshnessAt } from './scheduler';
import { FATIGUE_THRESHOLDS, fatigueStatus } from './legFatigue';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { SessionLog, SessionTemplate } from '../models/training';
import { addDays } from '../utils/dates';

// docs/beslissingen/2026-11-02-rpe-bij-een-testloop.md: what the planner reads after a logged test.
// freshnessAt (TEST-FRESH, TEST-MAKE-ROOM, TEST-RETRY and the week check read it) gets a lower number after a
// logged test at RPE 10, never a higher one; the thresholds stay. Nagemaakte gegevens.
const { templates } = buildDefaultProgramData();
const test = templates.find((t) => t.id === 'tpl_test_run')!;
// The same test as the code counted it before: no role, so planned at 8 and never split.
const asBefore: SessionTemplate = { ...test, id: 'tpl_as_before', roles: [] };
const map = (extra: SessionTemplate[] = []) => new Map([...templates, ...extra].map((t) => [t.id, t]));
const D = '2026-11-12';
const logged = (templateId: string, withSplit: boolean): SessionLog => ({
  id: `l-${templateId}-${withSplit}`, templateId, type: 'cardio', completedDate: D, completedAt: `${D}T10:00:00Z`, variant: 'full',
  durationMinutes: 45, rpe: 10, source: 'garmin',
  cardioData: { durationMinutes: 45, distanceKm: 8.2, elevationGainM: 0, source: 'garmin' },
  outdoorData: { durationMinutes: 45, distanceKm: 8.2, elevationGainM: 0, elevationLossM: 0, source: 'garmin' },
  ...(withSplit ? { bestEffort: { km: 5, minutes: 25, wholeKm: 8.2, wholeMinutes: 45, accepted: true, v: 2 } } : {}),
});

describe('freshnessAt on a test day 3 to 7 days after a logged test at RPE 10', () => {
  for (const days of [3, 4, 5, 6, 7]) {
    it(`${days} days later: lower than before, never higher, and fresh for a test`, () => {
      const day = addDays(D, days);
      for (const withSplit of [false, true]) {
        const now = freshnessAt(day, [], map(), [logged('tpl_test_run', withSplit)]).index;
        const before = freshnessAt(day, [], map([asBefore]), [logged('tpl_as_before', withSplit)]).index;
        expect(now).toBeLessThanOrEqual(before);
        expect(now).toBeLessThanOrEqual(FATIGUE_THRESHOLDS.test.fresh);
        expect(fatigueStatus({ index: now, painRecent: false }, 'test')).toBe('fris');
      }
    });
  }

  it('the thresholds stay as they were', () => {
    expect(FATIGUE_THRESHOLDS).toEqual({ test: { fresh: 8, doubt: 10 }, race: { fresh: 3, doubt: 5 }, hard: { fresh: 12, doubt: 12 } });
  });

  it('the day after, the drop is visible: 6.6 for the whole test at 10 before, 3.3 now with the split', () => {
    const day = addDays(D, 1);
    const now = freshnessAt(day, [], map(), [logged('tpl_test_run', true)]).index;
    const before = freshnessAt(day, [], map([asBefore]), [logged('tpl_as_before', false)]).index;
    expect(before).toBeCloseTo(6.6, 5);
    expect(now).toBeCloseTo(3.3, 5);
  });
});
