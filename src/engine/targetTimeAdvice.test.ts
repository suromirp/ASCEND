import { describe, it, expect } from 'vitest';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { withTargetMinutes } from './goals';
import type { RaceBlock } from './raceBlock';
import type { SessionLog, SessionTemplate } from '../models/training';
import type { TrainingGoal } from '../models/goals';

const templates: SessionTemplate[] = [
  { id: 'tpl_test_run', name: 'Testloop', type: 'cardio', sport: 'running', durationVariants: { full: 45 } },
];
// Made-up test: 5 km in 29:05, 29 October 2026, 20 weeks before the race.
const test = (id: string, date: string, minutes: number): SessionLog => ({
  id, templateId: 'tpl_test_run', type: 'cardio', completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: minutes, rpe: 9, source: 'manual',
  cardioData: { durationMinutes: minutes, distanceKm: 5, source: 'manual' },
});
const race = (targetMinutes?: number): RaceBlock => ({ goalId: 'race', name: 'Hardloopwedstrijd', raceDate: '2027-03-20', blockStart: '2027-01-18', raceWeek: '2027-03-15', distanceKm: 10, targetMinutes });
const inputs = (overrides: Partial<AdviceInputs>): AdviceInputs => ({
  logs: [], plannedSessions: [], templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: '2026-10-30', raceGoals: [race(45)], ...overrides,
});
const targetTime = (i: AdviceInputs) => computeAdvice(i).filter((a) => a.ruleId === 'TARGET-TIME');

describe('TARGET-TIME', () => {
  const logs = [test('t1', '2026-10-29', 29 + 5 / 60)];

  it('proposes a goal time inside the band when 45 minutes is out of reach, tied to the test log', () => {
    const [a] = targetTime(inputs({ logs }));
    expect(a.id).toBe('goaltime:race:2026-10-29');
    expect(a.goalTargetTime?.goalId).toBe('race');
    expect(a.goalTargetTime!.minutes).toBeGreaterThanOrEqual(53);
    expect(a.goalTargetTime!.minutes).toBeLessThanOrEqual(55);
    expect(a.relatedLogId).toBe('t1');
    expect(a.proposal).toBeUndefined(); // no session changes: the goal only
    expect(a.title).toContain('45 minuten');
    expect(a.effect).toContain('Liever niet');
    expect(a.effect).toContain('in ongeveer 61 minuten');
    expect(a.effect).toMatch(/\d+ tot \d+ minuten realistisch/);
    // Plain words, no long dashes (the owner's rule for new copy).
    expect(`${a.title}${a.effect}${a.why}`).not.toMatch(/[–—]/);
  });

  it('says nothing without a test, with a goal time inside the band, or without a goal time', () => {
    expect(targetTime(inputs({ logs: [] }))).toEqual([]);
    expect(targetTime(inputs({ logs, raceGoals: [race(53)] }))).toEqual([]);
    expect(targetTime(inputs({ logs, raceGoals: [race(undefined)] }))).toEqual([]);
    expect(targetTime(inputs({ logs, raceGoals: [] }))).toEqual([]);
  });

  it('is never asked again after Liever niet (or Akkoord) for the same test', () => {
    expect(targetTime(inputs({ logs, respondedIds: new Set(['goaltime:race:2026-10-29']) }))).toEqual([]);
  });

  it('a newer test is new information: it may ask once more', () => {
    const later = [...logs, test('t2', '2027-01-14', 28.5)];
    const again = targetTime(inputs({ logs: later, asOf: '2027-01-15', respondedIds: new Set(['goaltime:race:2026-10-29']) }));
    expect(again.map((a) => a.id)).toEqual(['goaltime:race:2027-01-14']);
  });

  it('does not act on a test that came out clearly slower than the one before it', () => {
    const bad = [...logs, test('t2', '2027-01-14', 31.5)];
    expect(targetTime(inputs({ logs: bad, asOf: '2027-01-15' }))).toEqual([]);
  });

  it('a goal far slower than the test is offered a sharper time', () => {
    const [a] = targetTime(inputs({ logs, raceGoals: [race(80)] }));
    expect(a.title).toContain('ruim langzamer');
    expect(a.goalTargetTime!.minutes).toBeLessThan(80);
  });
});

describe('Akkoord sets the target time and nothing else', () => {
  const goal: TrainingGoal = {
    id: 'race', name: 'Hardloopwedstrijd', status: 'active', targetDate: '2027-03-20', createdAt: 'a', updatedAt: 'a',
    requirements: [
      { id: 'r1', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 10, unit: 'km' }, discipline: 'running' },
      { id: 'r2', kind: 'targetTime', scope: 'SINGLE_EVENT', target: { amount: 45, unit: 'min' }, discipline: 'running' },
    ],
  };
  it('changes the target time requirement only', () => {
    const next = withTargetMinutes(goal, 53, 'b');
    expect(next.requirements[1].target).toEqual({ amount: 53, unit: 'min' });
    expect(next.requirements[0]).toEqual(goal.requirements[0]);
    expect(next.targetDate).toBe('2027-03-20');
    expect(next.updatedAt).toBe('b');
    expect(goal.requirements[1].target?.amount).toBe(45); // the original is untouched
  });
});
