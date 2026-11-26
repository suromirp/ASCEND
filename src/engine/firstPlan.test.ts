import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { buildFirstPlan, defaultAnswers, firstPlanLines, kindOfExistingGoals, startDateProblem, startSteps, stepCounter, tapTooSoon, GOAL_OPTIONS, STEP_TAP_GUARD_MS } from './firstPlan';
import { adviceDays } from './weekShape';
import { isBeginnerStart, WALK_JOG_LINE } from './beginnerStart';
import type { SessionLog } from '../models/training';
import { addDays } from '../utils/dates';

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

  it('zonder antwoord kiest Automatisch met je logs, en het voorstel noemt wat de planning dan doet (Warden, 15 november)', () => {
    // Nagemaakt: iemand die terugkomt na een pauze, één loop in de acht weken ervoor. De wizard vraagt dan niets.
    const log = (id: string, date: string): SessionLog => ({ id, templateId: 'tpl_easy_run', type: 'cardio', completedDate: date, completedAt: `${date}T10:00:00.000Z`, variant: 'full', durationMinutes: 30, source: 'manual' });
    const back = buildFirstPlan(defaultAnswers('fit'), templates, TODAY, NOW, undefined, { logs: [log('l1', '2026-10-10')] });
    expect(back.lines).toContain(WALK_JOG_LINE);
    expect(back.lines.join(' ')).toMatch(/Je begint rustig/);
    // Wie de acht weken ervoor twee keer per week trainde: geen beginnersstart, dus ook geen zin erover.
    const fit = Array.from({ length: 16 }, (_, i) => log(`f${i}`, addDays(TODAY, -3 - i * 3)));
    const trained = buildFirstPlan(defaultAnswers('fit'), templates, TODAY, NOW, undefined, { logs: fit });
    expect(trained.lines).not.toContain(WALK_JOG_LINE);
    expect(trained.lines.join(' ')).not.toMatch(/Je begint rustig/);
    // Een antwoord gaat voor: Nee noemt het niet, ook met weinig logs.
    expect(buildFirstPlan({ ...defaultAnswers('fit'), beginner: false }, templates, TODAY, NOW, undefined, { logs: [log('l1', '2026-10-10')] }).lines).not.toContain(WALK_JOG_LINE);
    // Een bewaarde keuze geldt zonder antwoord, zoals in de planning (Warden ronde 3, moet 2).
    expect(buildFirstPlan(defaultAnswers('fit'), templates, TODAY, NOW, undefined, { logs: fit, beginnerStart: 'ja' }).lines).toContain(WALK_JOG_LINE);
    expect(buildFirstPlan(defaultAnswers('fit'), templates, TODAY, NOW, undefined, { logs: [log('l1', '2026-10-10')], beginnerStart: 'nee' }).lines).not.toContain(WALK_JOG_LINE);
    // Dezelfde toets als de planning.
    expect(isBeginnerStart('auto', [log('l1', '2026-10-10')], TODAY)).toBe(true);
    expect(isBeginnerStart('auto', fit, TODAY)).toBe(false);
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
    expect(startSteps('trek')).toEqual(['goal', 'target', 'shelter', 'date', 'days', 'which', 'strength']);
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

describe('punt J: het vraagnummer verspringt niet en een dubbele tik slaat niets over', () => {
  it('het totaal staat er pas als het vaststaat, en verandert dan niet meer', () => {
    for (const goal of ['fit', 'trek', 'race'] as const) {
      const steps = startSteps(goal, false, false);
      const shown = steps.map((_, i) => stepCounter(steps, i));
      const totals = new Set(shown.map((t) => / van (\d+)$/.exec(t)?.[1]).filter(Boolean));
      expect(totals.size).toBe(1);
      expect(shown[0]).toBe('Vraag 1');
      expect(shown.at(-1)).toBe(`Vraag ${steps.length} van ${steps.length}`);
    }
  });
  it('een bestaand doel: het totaal staat er meteen', () => {
    const steps = startSteps('fit', true, false);
    expect(stepCounter(steps, 0)).toBe(`Vraag 1 van ${steps.length}`);
  });
  it('een tweede tik vlak na een nieuwe vraag telt niet', () => {
    expect(tapTooSoon(1000, 1000 + STEP_TAP_GUARD_MS - 1)).toBe(true);
    expect(tapTooSoon(1000, 1000 + STEP_TAP_GUARD_MS)).toBe(false);
  });
});

// Backlogpunt G: de start vraagt hutten, tent of beide; het doel volgt dat antwoord, nooit stil hutten.
describe('waar je slaapt op een tocht', () => {
  const { templates } = buildDefaultProgramData();

  it('een tocht vraagt het na tocht of wedstrijd, een wedstrijd en een richting niet', () => {
    expect(startSteps('trek')).toEqual(['goal', 'target', 'shelter', 'date', 'days', 'which', 'strength']);
    expect(startSteps('race')).not.toContain('shelter');
    expect(startSteps('fit')).not.toContain('shelter');
  });

  it('zonder antwoord het advies: een tocht met tent', () => {
    const plan = buildFirstPlan({ ...defaultAnswers('trek'), goalDate: '2027-03-15' }, templates, '2026-11-16', '2026-11-16T07:30:00Z');
    expect(plan.goals[0].kind).toBe('trek_tent');
    expect(plan.goals[0].details?.shelter).toBe('tent');
    expect(plan.lines[0]).toBe('Doel: een meerdaagse tocht met rugzak op 15 maart 2027, met tent.');
  });

  it('hutten en beide komen op het doel', () => {
    const hut = buildFirstPlan({ ...defaultAnswers('trek'), shelter: 'hut', goalDate: '2027-03-15' }, templates, '2026-11-16', '2026-11-16T07:30:00Z');
    expect(hut.goals[0].kind).toBe('trek_hut');
    expect(hut.goals[0].details?.shelter).toBe('hut');
    const both = buildFirstPlan({ ...defaultAnswers('trek'), shelter: 'both', goalDate: '2027-03-15' }, templates, '2026-11-16', '2026-11-16T07:30:00Z');
    expect(both.goals[0].kind).toBe('trek_tent');
    expect(both.goals[0].details?.shelter).toBe('both');
    expect(both.lines[0]).toContain('in hutten en met tent');
  });
});

// I-14 stap 4 (docs/visie/Ontwerp Eén plan.md, vraag 2 en 3, en de punten van de Warden van 23 november).
describe('firstPlanLines: de tekst volgt de week van het plan', () => {
  const row = (weekday: number, name: string, strength = false, rest = false) => ({ weekday, name, strength, rest });

  it('Fit blijven met drie dagen: 1 keer kracht, het budget apart, en met een vierde dag past het', () => {
    const plan = buildFirstPlan({ ...defaultAnswers('fit'), beginner: false }, templates, TODAY, NOW);
    expect(plan.lines).toContain('Je week: 150 minuten en 1 keer kracht; je richting vraagt 2, met een vierde dag past het. Met 1 keer kracht zit je onder de richtlijn, en dat mag een keuze zijn.');
  });

  it('Fitter worden met vier dagen: plan en budget gelijk, dan de gewone zin', () => {
    const plan = buildFirstPlan({ ...defaultAnswers('improve'), beginner: false }, templates, TODAY, NOW);
    expect(plan.lines).toContain('Je week: 120 minuten en 2 keer kracht. Dat is onder de richtlijn, en dat mag een keuze zijn.');
  });

  it('Sterker worden met zelf gekozen 2 keer kracht: geen dag die het laat passen', () => {
    const plan = buildFirstPlan({ ...defaultAnswers('stronger'), strengthSessions: 2, beginner: false }, templates, TODAY, NOW);
    const line = plan.lines.find((l) => l.startsWith('Je week: '))!;
    expect(line).toContain('2 keer kracht; je richting vraagt 3');
    expect(line).not.toMatch(/past het/);
  });

  it('het woord voor de rustdag volgt Op je rustdag, in beide standen', () => {
    const text = { head: [], tail: [] };
    const rows = [row(2, 'Bovenlichaam A', true), row(1, 'Herstelwandeling', false, true)];
    expect(firstPlanLines(text, rows, false, 'rest')).toContain('Rustdag: maandag.');
    expect(firstPlanLines(text, rows, false, 'active')).toContain('Hersteldag: maandag.');
    expect(firstPlanLines(text, rows)).toContain('Rustdag: maandag.');
  });

  it('de rustdag alleen als de week een herstelrij heeft, op de dag van die rij', () => {
    const text = { head: [], tail: [] };
    expect(firstPlanLines(text, [row(2, 'Bovenlichaam A', true), row(7, 'Lange duurloop')]).some((l) => l.startsWith('Rustdag'))).toBe(false);
    expect(firstPlanLines(text, [row(2, 'Bovenlichaam A', true), row(3, 'Herstelwandeling', false, true)])).toContain('Rustdag: woensdag.');
  });

  it('niet elke week is zo: de zin noemt de eerste volle week', () => {
    expect(firstPlanLines({ head: [], tail: [] }, [row(2, 'Bovenlichaam A', true)], true)).toContain('Je eerste volle week: 1 training (dinsdag: Bovenlichaam A).');
  });
});
