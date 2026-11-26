// I-14 Eén plan, stap naspelen (docs/visie/Ontwerp Eén plan.md, symptoom A en invariant 1): wat het eerste voorstel
// noemt, staat daarna in Week. De stap naspelen zette wat niet klopte als it.fails; stap 4 (claude/een-plan-eerste-voorstel)
// maakt de zinnen uit het voorbeeld zelf en zet ze om naar it. Daaronder invariant 1 en 2 voor elke richting en een doel,
// met 2 tot 6 dagen. Testdata is nagemaakt en de datum staat vast.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, syncProgramHorizon, GoalEngineConfigRepo, PlannedSessionsRepo, SessionTemplatesRepo, TrainingGoalsRepo } from './database';
import { runAvailabilityStep } from './availabilityStep';
import { computeForecastReplan } from '../engine/adaptiveReplanner';
import { activeGoalDemandKeys } from '../engine/progressionDecisions';
import { applyHorizonPlanNow, computeHorizonPlan, type HorizonPlan } from './horizonPlan';
import { runWeeklyPrescriptionStep } from './weeklyPrescriptionStep';
import { primePlanningRegisters } from '../state/planningSync';
import { buildFirstPlan, defaultAnswers, FOLLOW_WEEKS_LINE, WEEKDAY_NAMES, type StartAnswers } from '../engine/firstPlan';
import { previewProposal } from '../engine/proposalPreview';
import { REST_DAY_COPY } from '../data/restDayCopy';
import { addDays, isoWeekday, mondayOfWeek } from '../utils/dates';
import type { PlannedSession, SessionTemplate } from '../models/training';

const TODAY = '2026-11-02';
// De eerste volle week na Akkoord.
const WEEK = '2026-11-09';

// De standaardkeuze van de start: Fit blijven, het advies van drie dagen, met kracht, alle dagen mogelijk.
let plan: HorizonPlan;
let templates: SessionTemplate[];
let restDay: number;
let week: PlannedSession[];

describe('symptoom A: het eerste voorstel tegen Week (Fit blijven, drie dagen, met kracht)', () => {
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    await wipeAllData();
    await runBootMigrations({ build: 'test-een-plan' });
    templates = await SessionTemplatesRepo.getAll();
    const setup = buildFirstPlan(defaultAnswers('fit'), templates, TODAY);
    restDay = setup.settings.restDay;
    const { marathonRaceType, marathonTargetDate, ...settings } = setup.settings;
    plan = await computeHorizonPlan({
      title: setup.title, why: 'Volgt je antwoorden.', explanation: 'Test.', trigger: 'goal_created', notes: setup.lines, program: setup.program, goals: setup.goals,
      settings: { ...settings, ...(marathonRaceType ? { marathonRaceType, marathonTargetDate } : {}) },
      firstPlan: { milestones: setup.milestones, strategy: setup.strategy, allowedDays: setup.allowedDays, restDay: setup.settings.restDay, text: setup.text },
    });
    expect((await applyHorizonPlanNow(plan)).status).toBe('applied');
    // Eén opening van de app: opstartstappen, de registers, de planningsronde en het weekvoorschrift.
    await runBootMigrations({ build: 'test-een-plan-1' });
    await primePlanningRegisters();
    await syncProgramHorizon();
    await runWeeklyPrescriptionStep(TODAY);
    week = (await PlannedSessionsRepo.getAll()).filter((s) => s.weekStartDate === WEEK && s.status !== 'skipped');
  }, 120_000);
  afterAll(() => {
    vi.useRealTimers();
  });

  const typeOf = (s: PlannedSession) => templates.find((t) => t.id === s.templateId)?.type;

  it('de herstelwandeling verdwijnt niet: hij staat na Akkoord en een opening op de rustdag, en de tekst zegt "Rustdag"', () => {
    const rest = week.filter((s) => typeOf(s) === 'recovery');
    expect(rest.map((s) => s.templateId)).toEqual(['tpl_herstel']);
    expect(isoWeekday(rest[0].scheduledDate)).toBe(restDay);
    expect(plan.notes).toContain('Rustdag: maandag.');
    // Week noemt een recovery-rij met het woord van de rustdag (components/WeekPlanner.tsx).
    expect(REST_DAY_COPY.rest.title).toBe('Rustdag');
  });

  it('symptoom A: de lijst van het voorstel noemt de herstelwandeling met hetzelfde woord als Week', () => {
    // De lijst met wijzigingen in het voorstel (engine/proposalPreview.ts, MoveLine) noemt de rij met de naam van het
    // sjabloon, Herstelwandeling; de dagkaarten van hetzelfde voorstel en Week zeggen Rustdag.
    const moves = previewProposal(plan.proposal.changes, [], templates).moves.filter((m) => m.to?.startsWith('2026-11-09'));
    expect(moves.map((m) => m.name)).toEqual([REST_DAY_COPY.rest.title]);
  });

  it('symptoom A: het aantal keer kracht in de tekst is het aantal krachtdagen in Week', () => {
    // De tekst zegt "Je week: 150 minuten en 2 keer kracht." (het weekbudget van de richting), de week heeft er één.
    const said = plan.notes.map((n) => /(\d+) keer kracht/.exec(n)?.[1]).find(Boolean);
    expect(said).toBeDefined();
    expect(week.filter((s) => typeOf(s) === 'strength')).toHaveLength(Number(said));
  });

  it('symptoom A (invariant 1): elke training die de tekst bij de dagen noemt, staat in Week', () => {
    // "3 trainingen per week (dinsdag: Bovenlichaam A, donderdag: Rustige duurloop, zondag: Lange duurloop)", terwijl
    // de beginnersstart op die plekken Wandelen en dribbelen zet; de zin erna legt dat uit, de dagregel niet.
    const line = plan.notes.find((n) => /trainingen per week \(/.test(n))!;
    const named = [...line.matchAll(/(?:maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag): ([^,)]+)/g)].map((m) => m[1]);
    const inWeek = new Set(week.map((s) => templates.find((t) => t.id === s.templateId)?.name));
    expect(named.length).toBeGreaterThan(0);
    expect(named.filter((n) => !inWeek.has(n))).toEqual([]);
  });
});

// Eén start met deze antwoorden op `today`: het voorstel, Akkoord en één opening met de opstartstappen die het plan
// raken (de planningsronde, beschikbaarheid, het weekvoorschrift). `beforeOpening`: wat de beschikbaarheid direct na
// Akkoord nog zou doen (het voorbeeld rekende dat al mee).
async function startWith(answers: StartAnswers, today = TODAY) {
  vi.setSystemTime(new Date(`${today}T08:00:00`));
  await wipeAllData();
  await runBootMigrations({ build: 'test-een-plan' });
  const tpls = await SessionTemplatesRepo.getAll();
  const setup = buildFirstPlan(answers, tpls, today);
  const { marathonRaceType, marathonTargetDate, ...settings } = setup.settings;
  const p = await computeHorizonPlan({
    title: setup.title, why: 'Volgt je antwoorden.', explanation: 'Test.', trigger: 'goal_created', notes: setup.lines, program: setup.program, goals: setup.goals,
    settings: { ...settings, ...(marathonRaceType ? { marathonRaceType, marathonTargetDate } : {}) },
    firstPlan: { milestones: setup.milestones, strategy: setup.strategy, allowedDays: setup.allowedDays, restDay: setup.settings.restDay, text: setup.text },
  });
  // Het voorbeeld: op een lege app is elke rij nieuw.
  const shown = p.proposal.changes.filter((c) => c.newSessionDraft).map((c) => `${c.newSessionDraft!.scheduledDate} ${c.newSessionDraft!.templateId}`);
  expect((await applyHorizonPlanNow(p)).status).toBe('applied');
  const [goals, stored, config] = await Promise.all([TrainingGoalsRepo.getAll(), PlannedSessionsRepo.getAll(), GoalEngineConfigRepo.get()]);
  const beforeOpening = activeGoalDemandKeys(goals).length === 0 ? [] : computeForecastReplan({ plannedSessions: stored, templates: tpls, availability: config.availability, asOf: today }).proposal.changes;
  await runBootMigrations({ build: 'test-een-plan-1' });
  await primePlanningRegisters();
  await syncProgramHorizon();
  await runAvailabilityStep(today);
  await runWeeklyPrescriptionStep(today);
  const all = (await PlannedSessionsRepo.getAll()).filter((s) => s.status !== 'skipped');
  return { plan: p, tpls, shown, all, stored, beforeOpening };
}

// Invariant 1 en 2 voor een start op `today`.
function expectSameAsWeek(r: Awaited<ReturnType<typeof startWith>>, today: string) {
  const { plan: p, tpls, shown, all } = r;
  const name = (id: string) => tpls.find((t) => t.id === id)?.name;
  const type = (id: string) => tpls.find((t) => t.id === id)?.type;
  const week = addDays(mondayOfWeek(today), 7);
  const inWeek = all.filter((s) => s.weekStartDate === week);
  // Invariant 1: elke training bij de dagen staat in Week, en het aantal keer kracht in de tekst is dat van Week.
  const line = p.notes.find((n) => /trainingen? per week \(/.test(n))!;
  // Een naam kan haakjes hebben ("Benen A (zwaar)"): de lijst staat tussen de eerste ( en de laatste ).
  const named = line.slice(line.indexOf('(') + 1, line.lastIndexOf(')')).split(', ').map((part) => part.slice(part.indexOf(': ') + 2));
  expect(named.filter((n) => !inWeek.some((s) => name(s.templateId) === n))).toEqual([]);
  expect(named).toHaveLength(inWeek.filter((s) => type(s.templateId) !== 'recovery').length);
  const said = p.notes.map((n) => /(\d+) keer kracht/.exec(n)?.[1]).find(Boolean);
  if (said !== undefined) expect(inWeek.filter((s) => type(s.templateId) === 'strength')).toHaveLength(Number(said));
  // De rustdag alleen als Week er een heeft, op die dag.
  const rest = inWeek.filter((s) => type(s.templateId) === 'recovery');
  const restLine = p.notes.find((n) => n.startsWith('Rustdag: '));
  if (rest.length === 0) expect(restLine).toBeUndefined();
  else expect(restLine).toBe(`Rustdag: ${WEEKDAY_NAMES[isoWeekday(rest[0].scheduledDate) - 1]}.`);
  // Invariant 2: de eerste twee weken van het voorbeeld zijn wat er na Akkoord en een opening staat.
  const until = addDays(today, 13);
  const after = all.filter((s) => s.scheduledDate >= today && s.scheduledDate <= until).map((s) => `${s.scheduledDate} ${s.templateId}`).sort();
  expect(shown.filter((x) => x.slice(0, 10) >= today && x.slice(0, 10) <= until).sort()).toEqual(after);
}

describe('invariant 1 en 2: het eerste voorstel noemt wat daarna in Week staat', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  const cases: [StartAnswers['goal'], number][] = [];
  for (const goal of ['fit', 'improve', 'stronger', 'easy', 'trek'] as const) for (const days of [2, 3, 4, 5, 6]) cases.push([goal, days]);

  it.each(cases)('%s met %i dagen', async (goal, days) => {
    const answers: StartAnswers = { ...defaultAnswers(goal), daysPerWeek: days, ...(goal === 'trek' ? { goalDate: '2027-06-20' } : {}) };
    expectSameAsWeek(await startWith(answers), TODAY);
  }, 60_000);

  // Een start midden in de week en op zondag (Warden, 23 november).
  it.each([['2026-11-04', 'woensdag'], ['2026-11-08', 'zondag']])('een start op %s (%s), Fit blijven en een halve marathon', async (today) => {
    expectSameAsWeek(await startWith({ ...defaultAnswers('fit') }, today), today);
    expectSameAsWeek(await startWith({ ...defaultAnswers('race'), goalDate: '2027-06-20' }, today), today);
  }, 60_000);
});

// Moet 1 van de Warden (23 november): een wedstrijd op een dag die niet in je dagen zit, viel stil uit het voorbeeld en bij
// de eerste opening uit het plan (de beschikbaarheidsstap). Hij blijft staan, in het voorbeeld en na de opening.
describe('een wedstrijd op een dag die niet in je dagen zit', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });
  afterAll(() => {
    vi.useRealTimers();
  });
  const RACE_DAY = '2027-06-20'; // een zondag

  it.each([['2026-11-02'], ['2026-11-04'], ['2026-11-08']])('halve marathon op zondag, drie dagen ma, wo, vr, start %s', async (today) => {
    const r = await startWith({ ...defaultAnswers('race'), daysPerWeek: 3, goalDate: RACE_DAY, allowedDays: [1, 3, 5] }, today);
    expect(r.shown).toContain(`${RACE_DAY} tpl_race`);
    expect(r.all.filter((s) => s.scheduledDate === RACE_DAY).map((s) => s.templateId)).toEqual(['tpl_race']);
    expectSameAsWeek(r, today);
  }, 60_000);

  // I-148: wat de opening meer zet dan het voorbeeld, is het weekvoorschrift in de vervolgweken (een rustige duurloop
  // in de week van de wedstrijd). Het ligt nooit in de eerste twee weken, en het voorstel zegt dat het zo gaat.
  it('wat de opening meer zet dan het voorbeeld, ligt vanaf over twee weken en het voorstel noemt dat', async () => {
    const r = await startWith({ ...defaultAnswers('race'), daysPerWeek: 3, goalDate: RACE_DAY, allowedDays: [1, 3, 5] });
    const shown = new Set(r.shown);
    const extra = r.all.map((s) => `${s.scheduledDate} ${s.templateId}`).filter((x) => !shown.has(x));
    const from = addDays(mondayOfWeek(TODAY), 14);
    expect(extra.filter((x) => x.slice(0, 10) < from)).toEqual([]);
    expect(r.plan.notes).toContain(FOLLOW_WEEKS_LINE);
  }, 60_000);

  it('het voorbeeld rekent de beschikbaarheid mee (alleen doordeweeks): wat de opening verschuift, liet het voorstel al zien', async () => {
    const r = await startWith({ ...defaultAnswers('race'), daysPerWeek: 3, goalDate: RACE_DAY, allowedDays: [1, 2, 3, 4, 5] });
    // Na Akkoord heeft de beschikbaarheid nog iets te doen: de planningsronde schrijft het patroon, de opening schuift.
    expect(r.beforeOpening.length).toBeGreaterThan(0);
    const tplOf = (id: string) => r.stored.find((s) => s.id === id)!.templateId;
    for (const c of r.beforeOpening) {
      const row = `${c.toDate} ${tplOf(c.plannedSessionId!)}`;
      if (c.action === 'move') expect(r.shown).toContain(row);
      expect(r.all.some((s) => `${s.scheduledDate} ${s.templateId}` === row)).toBe(c.action === 'move');
    }
    expect(r.all.filter((s) => s.scheduledDate === RACE_DAY).map((s) => s.templateId)).toEqual(['tpl_race']);
  }, 60_000);
});

// Mag 5 van de Warden: had de app al een eigen rij, dan zegt het voorstel "per week" over een week zonder die rij, of
// "Je eerste volle week" als er geen is.
describe('het eerste voorstel op een app met eigen rijen', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  async function planWith(ownWeeks: number) {
    await wipeAllData();
    await runBootMigrations({ build: 'test-een-plan' });
    for (let i = 0; i < ownWeeks; i++) {
      const monday = addDays(WEEK, i * 7);
      await PlannedSessionsRepo.put({ id: `own_${i}`, templateId: 'tpl_easy_run', scheduledDate: addDays(monday, 2), weekStartDate: monday, status: 'planned', order: 0, lock: { by: 'user', at: '2026-11-01T10:00:00.000Z' } });
    }
    const tpls = await SessionTemplatesRepo.getAll();
    const setup = buildFirstPlan(defaultAnswers('fit'), tpls, TODAY);
    const { marathonRaceType, marathonTargetDate, ...settings } = setup.settings;
    void marathonRaceType; void marathonTargetDate;
    return computeHorizonPlan({
      title: setup.title, why: 'Volgt je antwoorden.', explanation: 'Test.', trigger: 'goal_created', notes: setup.lines, program: setup.program, goals: setup.goals, settings,
      firstPlan: { milestones: setup.milestones, strategy: setup.strategy, allowedDays: setup.allowedDays, restDay: setup.settings.restDay, text: setup.text },
    });
  }

  it('een eigen rij in de eerste volle week: de zin noemt de week erna, zonder die rij', async () => {
    const p = await planWith(1);
    const line = p.notes.find((n) => /trainingen per week \(/.test(n))!;
    expect(line).not.toMatch(/Rustige duurloop/);
  }, 60_000);

  it('een eigen rij in elke week: de zin zegt dat het de eerste volle week is', async () => {
    const p = await planWith(12);
    expect(p.notes.some((n) => n.startsWith('Je eerste volle week: '))).toBe(true);
    expect(p.notes.some((n) => / per week \(/.test(n))).toBe(false);
  }, 60_000);
});
