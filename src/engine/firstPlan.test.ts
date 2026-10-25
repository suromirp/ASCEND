import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { buildFirstPlan, defaultAnswers, kindOfExistingGoals, startDateProblem, startSteps } from './firstPlan';

const templates = buildDefaultProgramData().templates;
const TODAY = '2026-11-02';
const NOW = '2026-11-02T09:00:00.000Z';

describe('buildFirstPlan', () => {
  it('fit: no goal and no ladder, but a program that starts this week', () => {
    const plan = buildFirstPlan(defaultAnswers('fit'), templates, TODAY, NOW);
    expect(plan.goals).toEqual([]);
    expect(plan.milestones).toEqual([]);
    expect(plan.program.startDate).toBe(TODAY);
    expect(plan.program.phases.length).toBeGreaterThan(0);
    expect(plan.count).toBe(3);
    expect(plan.strategy?.sessionsPerWeek).toBeGreaterThan(0);
  });

  it('trek with a date: the goal with the ladder, the program laid out toward it', () => {
    const plan = buildFirstPlan({ ...defaultAnswers('trek'), goalDate: '2027-07-10' }, templates, TODAY, NOW);
    expect(plan.goals).toHaveLength(1);
    expect(plan.goals[0].status).toBe('active');
    expect(plan.goals[0].targetDate).toBe('2027-07-10');
    expect(plan.milestones.length).toBeGreaterThan(5);
    expect(plan.milestones.every((m) => m.goalId === plan.goals[0].id)).toBe(true);
    const weeks = plan.program.phases.reduce((n, p) => n + p.weekCount, 0);
    expect(weeks).toBe(36);
  });

  it('trek without a date: the goal waits (paused), the ladder is there', () => {
    const plan = buildFirstPlan(defaultAnswers('trek'), templates, TODAY, NOW);
    expect(plan.goals[0].status).toBe('paused');
    expect(plan.milestones.length).toBeGreaterThan(5);
  });

  it('half marathon: the Marathon goal and its settings', () => {
    const plan = buildFirstPlan({ ...defaultAnswers('race'), race: 'half', goalDate: '2027-04-11' }, templates, TODAY, NOW);
    expect(plan.goals[0].name).toBe('Marathon');
    expect(plan.settings.marathonRaceType).toBe('half');
    expect(plan.settings.marathonTargetDate).toBe('2027-04-11');
    expect(plan.milestones).toEqual([]);
  });

  it('10 km: a running distance goal', () => {
    const plan = buildFirstPlan({ ...defaultAnswers('race'), race: '10k', goalDate: '2027-04-11' }, templates, TODAY, NOW);
    expect(plan.goals[0].requirements[0]).toMatchObject({ kind: 'distance', discipline: 'running', target: { amount: 10 } });
    expect(plan.settings.marathonRaceType).toBeUndefined();
  });

  it('without strength there is no strength block', () => {
    const plan = buildFirstPlan({ ...defaultAnswers('fit'), strength: false }, templates, TODAY, NOW);
    expect(plan.strategy).toBeNull();
    expect(plan.lines.join(' ')).toContain('Zonder krachttraining');
  });

  it('the strength block lists exactly the strength trainings of the week', () => {
    const plan = buildFirstPlan({ ...defaultAnswers('trek'), daysPerWeek: 5 }, templates, TODAY, NOW);
    const inWeek = Object.keys(plan.settings.weekShape.days).filter((id) => ['tpl_upper_a', 'tpl_lower_a', 'tpl_upper_b'].includes(id));
    expect([...plan.strategy!.sessionTemplateIds].sort()).toEqual([...inWeek].sort());
    expect(plan.strategy!.sessionsPerWeek).toBe(inWeek.length);
  });

  it('stores the days you can as weekday keys', () => {
    const plan = buildFirstPlan({ ...defaultAnswers('fit'), allowedDays: [2, 4, 6] }, templates, TODAY, NOW);
    expect(plan.allowedDays).toEqual(['tue', 'thu', 'sat']);
  });

  it('is plain Dutch without dashes', () => {
    const plan = buildFirstPlan({ ...defaultAnswers('trek'), goalDate: '2027-07-10' }, templates, TODAY, NOW);
    expect(plan.lines.join(' ')).not.toMatch(/[\u2013\u2014]/);
    expect(plan.title).toBe('Zo ziet je eerste week eruit');
  });
});

describe('startDateProblem', () => {
  it('accepts no date and a date ahead, refuses a past date, ignores fit', () => {
    expect(startDateProblem({ goal: 'trek', goalDate: undefined }, TODAY)).toBeUndefined();
    expect(startDateProblem({ goal: 'trek', goalDate: '2027-07-10' }, TODAY)).toBeUndefined();
    expect(startDateProblem({ goal: 'trek', goalDate: '2026-01-01' }, TODAY)).toBeTruthy();
    expect(startDateProblem({ goal: 'fit', goalDate: '2026-01-01' }, TODAY)).toBeUndefined();
  });
});

describe('goals that are already there', () => {
  it('makes no goal and asks only about the week', () => {
    expect(startSteps('trek', true)).toEqual(['days', 'which', 'strength']);
    expect(startSteps('fit')).toEqual(['goal', 'days', 'which', 'strength']);
    expect(startSteps('trek')).toEqual(['goal', 'date', 'days', 'which', 'strength']);
    expect(startSteps('race')).toEqual(['goal', 'race', 'date', 'days', 'which', 'strength']);
    const plan = buildFirstPlan(defaultAnswers('trek'), templates, TODAY, NOW, { kind: 'trek' });
    expect(plan.goals).toEqual([]);
    expect(plan.milestones).toEqual([]);
    expect(plan.lines[0]).toBe('Je doel blijft zoals het is.');
    expect(plan.count).toBe(5);
  });

  it('reads the kind of week from the goals', () => {
    const trek = buildFirstPlan({ ...defaultAnswers('trek'), goalDate: '2027-07-10' }, templates, TODAY, NOW);
    expect(kindOfExistingGoals(trek.goals, trek.milestones)).toBe('trek');
    const race = buildFirstPlan({ ...defaultAnswers('race'), goalDate: '2027-04-11' }, templates, TODAY, NOW);
    expect(kindOfExistingGoals(race.goals, race.milestones)).toBe('race');
    expect(kindOfExistingGoals([], [])).toBe('fit');
    expect(kindOfExistingGoals([{ ...race.goals[0], status: 'archived' }], [])).toBe('fit');
  });
});
