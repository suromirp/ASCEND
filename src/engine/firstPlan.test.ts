import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { buildFirstPlan, defaultAnswers, kindOfExistingGoals, startDateProblem, startSteps, GOAL_OPTIONS } from './firstPlan';
import { adviceDays } from './weekShape';

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

describe('de vijf keuzes van de eerste vraag (Zonder doel stap 8)', () => {
  it('heeft vier richtingen en een tocht of wedstrijd, in vaste volgorde', () => {
    expect(GOAL_OPTIONS.map((o) => o.label)).toEqual(['Fit blijven', 'Fitter worden', 'Sterker worden', 'Rustig aan', 'Een tocht of wedstrijd']);
    expect(GOAL_OPTIONS.map((o) => o.note).join(' ')).not.toMatch(/[\u2013\u2014!]/);
  });

  it('het advies voor dagen per richting', () => {
    expect([adviceDays('fit').days, adviceDays('improve').days, adviceDays('stronger').days, adviceDays('easy').days]).toEqual([3, 4, 4, 3]);
  });

  it('een richting: geen doel, wel de richting en de maandag waarop hij begint', () => {
    const plan = buildFirstPlan({ ...defaultAnswers('improve'), beginner: false }, templates, TODAY, NOW);
    expect(plan.goals).toEqual([]);
    expect(plan.settings).toMatchObject({ direction: 'improve', directionStart: TODAY, beginnerStart: 'nee' });
    expect(plan.lines).toContain('Richting: Fitter worden.');
    expect(plan.lines.some((l) => l.startsWith('Je week: '))).toBe(true);
    expect(plan.program.phases[0].id).toBe('phase_golf');
  });

  it('Fit blijven is de richting Fit blijven', () => {
    expect(buildFirstPlan(defaultAnswers('fit'), templates, TODAY, NOW).settings.direction).toBe('maintain');
  });

  it('Sterker worden plant het gekozen aantal keer kracht', () => {
    const three = buildFirstPlan(defaultAnswers('stronger'), templates, TODAY, NOW);
    expect(three.strategy?.sessionsPerWeek).toBe(3);
    const two = buildFirstPlan({ ...defaultAnswers('stronger'), strengthSessions: 2 }, templates, TODAY, NOW);
    expect(two.strategy?.sessionsPerWeek).toBe(2);
  });

  it('Rustig aan: drie dagen en een keer kracht', () => {
    const plan = buildFirstPlan(defaultAnswers('easy'), templates, TODAY, NOW);
    expect(plan.count).toBe(3);
    expect(plan.strategy?.sessionsPerWeek).toBe(1);
  });

  it('een beginner begint met hoogstens vier dagen, en het voorstel zegt het', () => {
    const plan = buildFirstPlan({ ...defaultAnswers('fit'), daysPerWeek: 6, beginner: true }, templates, TODAY, NOW);
    expect(plan.count).toBe(4);
    expect(plan.settings.beginnerStart).toBe('ja');
    expect(plan.lines).toContain('Je begint met hoogstens 4 dagen per week.');
    expect(plan.lines.join(' ')).toMatch(/Je begint rustig/);
  });

  it('een tocht of wedstrijd zet geen richting', () => {
    expect(buildFirstPlan({ ...defaultAnswers('race'), goalDate: '2027-04-11' }, templates, TODAY, NOW).settings.direction).toBeUndefined();
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
    expect(startSteps('fit')).toEqual(['goal', 'days', 'which', 'strength', 'beginner']);
    expect(startSteps('fit', false, true)).toEqual(['goal', 'days', 'which', 'strength']);
    expect(startSteps('trek')).toEqual(['goal', 'target', 'date', 'days', 'which', 'strength']);
    expect(startSteps('race')).toEqual(['goal', 'target', 'race', 'date', 'days', 'which', 'strength']);
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
