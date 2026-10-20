import { describe, it, expect, afterEach } from 'vitest';
import { freshnessAt, setFreshnessContext } from './scheduler';
import { legFatigueOn } from './legFatigue';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import { addDays, mondayOfWeek } from '../utils/dates';

// docs/onderzoek/Planning op een lijn.md, conflict 5: the planner and the
// Benen card used to give a test 11.5 and 7.8 for the same week.
const { templates } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const TODAY = '2026-11-02';
const pattern = ['tpl_upper_a', 'tpl_lower_a', 'tpl_easy_run', 'tpl_herstel', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_long_run'];
const sessions: PlannedSession[] = Array.from({ length: 6 }, (_, w) => addDays(TODAY, 7 * w)).flatMap((monday) =>
  pattern.map((templateId, i) => ({ id: `${monday}-${templateId}`, templateId, scheduledDate: addDays(monday, i), weekStartDate: mondayOfWeek(monday), status: 'planned' as const, order: i })),
);
// Planned lengths that differ from the template: learned, progression.
const minutesOf = (s: PlannedSession) => (s.templateId === 'tpl_long_run' ? 95 : s.templateId === 'tpl_lower_a' ? 60 : byId.get(s.templateId)!.durationVariants.full);

afterEach(() => setFreshnessContext(undefined));

describe('one leg index for planner and card', () => {
  it('gives the same number on a test day five weeks ahead', () => {
    const test = addDays(TODAY, 7 * 5 + 2);
    setFreshnessContext({ today: TODAY, bodyKg: 86, minutesOf });
    const planner = freshnessAt(test, sessions, byId, []).index;
    const card = legFatigueOn(test, { logs: [], plannedSessions: sessions, templates, today: TODAY, bodyKg: 86, minutesOf }).index;
    expect(planner).toBe(card);
    expect(planner).toBeGreaterThan(0);
  });

  it('without the context the planner still works on the template lengths', () => {
    const test = addDays(TODAY, 9);
    expect(freshnessAt(test, sessions, byId, []).index).toBeGreaterThan(0);
  });
});
