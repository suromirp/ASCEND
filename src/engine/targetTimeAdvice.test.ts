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
    expect(a.id).toBe('goaltime:race:45');
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

  it('is never asked again after Liever niet (or Akkoord) for the same goal time', () => {
    expect(targetTime(inputs({ logs, respondedIds: new Set(['goaltime:race:45']) }))).toEqual([]);
  });

  it('a newer test does not ask again after Liever niet: the goal stays the goal', () => {
    const later = [...logs, test('t2', '2027-01-14', 28.5)];
    expect(targetTime(inputs({ logs: later, asOf: '2027-01-15', respondedIds: new Set(['goaltime:race:45']) }))).toEqual([]);
  });

  it('a changed goal time is new: it may ask once more', () => {
    const [a] = targetTime(inputs({ logs, raceGoals: [race(46)], respondedIds: new Set(['goaltime:race:45']) }));
    expect(a.id).toBe('goaltime:race:46');
  });

  it('says nothing when "Doeltijd aanpassen voorstellen" is off', () => {
    expect(targetTime(inputs({ logs, proposeTargetTime: false }))).toEqual([]);
  });

  it('does not act on a test that came out clearly slower than the one before it', () => {
    const bad = [...logs, test('t2', '2027-01-14', 31.5)];
    // Counted as before (the setting off), a doubtful latest test is no ground for advice.
    expect(targetTime(inputs({ logs: bad, asOf: '2027-01-15', askDoubtTest: false }))).toEqual([]);
    // After "Telt mee" it is counted and still doubtful, so still no advice.
    expect(targetTime(inputs({ logs: bad, asOf: '2027-01-15', testJudgments: [{ logId: 't2', verdict: 'counts', date: '2027-01-15' }] }))).toEqual([]);
  });

  it('keeps reading the previous test while the slower one waits for an answer', () => {
    const bad = [...logs, test('t2', '2027-01-14', 31.5)];
    expect(targetTime(inputs({ logs: bad, asOf: '2027-01-15' })).map((a) => a.id)).toEqual(['goaltime:race:45']);
  });

  it('leaves a test you marked "Telt niet mee" out', () => {
    const slow = [test('t0', '2026-10-01', 31.5), ...logs];
    const judgments = [{ logId: 't1', verdict: 'ignore' as const, date: '2026-10-30' }];
    // Only the slower test is left, so that one speaks.
    expect(targetTime(inputs({ logs: slow, testJudgments: judgments })).map((a) => a.id)).toEqual(['goaltime:race:45']);
  });

  it('a goal far slower than the test is offered a sharper time', () => {
    const [a] = targetTime(inputs({ logs, raceGoals: [race(80)] }));
    expect(a.title).toContain('ruim langzamer');
    expect(a.goalTargetTime!.minutes).toBeLessThan(80);
  });
});

describe('TARGET-TIME says what it counts on', () => {
  const withEffort = (accepted?: boolean): SessionLog => ({
    ...test('t1', '2026-10-29', 36),
    cardioData: { durationMinutes: 36, distanceKm: 6, source: 'manual' },
    bestEffort: { km: 5, minutes: 27.67, wholeKm: 6, wholeMinutes: 36, ...(accepted ? { accepted } : {}) },
  } as SessionLog);

  it('names the whole run when the best 5 km does not count', () => {
    const plain: SessionLog = { ...test('t1', '2026-10-29', 36), cardioData: { durationMinutes: 36, distanceKm: 6, source: 'manual' } };
    const [a] = targetTime(inputs({ logs: [plain] }));
    expect(a.effect).toContain('(hele run: 6 km in 36:00)');
  });

  it('names the best 5 km when that counts', () => {
    const [a] = targetTime(inputs({ logs: [withEffort(true)], raceGoals: [race(40)] }));
    expect(a.effect).toContain('(snelste 5 km in 27:40)');
  });

  it('gives no advice on a test whose best 5 km waits for Akkoord', () => {
    expect(targetTime(inputs({ logs: [withEffort(false)] }))).toEqual([]);
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
