// I-14 Eén plan, stap naspelen (docs/visie/Ontwerp Eén plan.md, symptoom A en invariant 1): wat het eerste voorstel
// noemt, staat daarna in Week. De stap naspelen zette wat niet klopte als it.fails; stap 4 (claude/een-plan-eerste-voorstel)
// maakt de zinnen uit het voorbeeld zelf en zet ze om naar it. Daaronder invariant 1 en 2 voor elke richting en een doel,
// met 2 tot 6 dagen. Testdata is nagemaakt en de datum staat vast.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, syncProgramHorizon, PlannedSessionsRepo, SessionTemplatesRepo } from './database';
import { applyHorizonPlanNow, computeHorizonPlan, type HorizonPlan } from './horizonPlan';
import { runWeeklyPrescriptionStep } from './weeklyPrescriptionStep';
import { primePlanningRegisters } from '../state/planningSync';
import { buildFirstPlan, defaultAnswers, type StartAnswers } from '../engine/firstPlan';
import { previewProposal } from '../engine/proposalPreview';
import { REST_DAY_COPY } from '../data/restDayCopy';
import { addDays, isoWeekday } from '../utils/dates';
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

// Eén start met deze antwoorden: het voorstel, Akkoord en één opening, zoals hierboven.
async function startWith(answers: StartAnswers) {
  await wipeAllData();
  await runBootMigrations({ build: 'test-een-plan' });
  const tpls = await SessionTemplatesRepo.getAll();
  const setup = buildFirstPlan(answers, tpls, TODAY);
  const { marathonRaceType, marathonTargetDate, ...settings } = setup.settings;
  const p = await computeHorizonPlan({
    title: setup.title, why: 'Volgt je antwoorden.', explanation: 'Test.', trigger: 'goal_created', notes: setup.lines, program: setup.program, goals: setup.goals,
    settings: { ...settings, ...(marathonRaceType ? { marathonRaceType, marathonTargetDate } : {}) },
    firstPlan: { milestones: setup.milestones, strategy: setup.strategy, allowedDays: setup.allowedDays, restDay: setup.settings.restDay, text: setup.text },
  });
  // Het voorbeeld: op een lege app is elke rij nieuw.
  const shown = p.proposal.changes.filter((c) => c.newSessionDraft).map((c) => `${c.newSessionDraft!.scheduledDate} ${c.newSessionDraft!.templateId}`);
  expect((await applyHorizonPlanNow(p)).status).toBe('applied');
  await runBootMigrations({ build: 'test-een-plan-1' });
  await primePlanningRegisters();
  await syncProgramHorizon();
  await runWeeklyPrescriptionStep(TODAY);
  const all = (await PlannedSessionsRepo.getAll()).filter((s) => s.status !== 'skipped');
  return { plan: p, tpls, shown, all };
}

describe('invariant 1 en 2: het eerste voorstel noemt wat daarna in Week staat', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  const cases: [StartAnswers['goal'], number][] = [];
  for (const goal of ['fit', 'improve', 'stronger', 'easy', 'trek'] as const) for (const days of [2, 3, 4, 5, 6]) cases.push([goal, days]);

  it.each(cases)('%s met %i dagen', async (goal, days) => {
    const answers: StartAnswers = { ...defaultAnswers(goal), daysPerWeek: days, ...(goal === 'trek' ? { goalDate: '2027-06-20' } : {}) };
    const { plan: p, tpls, shown, all } = await startWith(answers);
    const name = (id: string) => tpls.find((t) => t.id === id)?.name;
    const type = (id: string) => tpls.find((t) => t.id === id)?.type;
    const inWeek = all.filter((s) => s.weekStartDate === WEEK);
    // Invariant 1: elke training bij de dagen staat in Week, en het aantal keer kracht in de tekst is dat van Week.
    const line = p.notes.find((n) => /trainingen? per week \(/.test(n))!;
    // Een naam kan haakjes hebben ("Benen A (zwaar)"): de lijst staat tussen de eerste ( en de laatste ).
    const named = line.slice(line.indexOf('(') + 1, line.lastIndexOf(')')).split(', ').map((part) => part.slice(part.indexOf(': ') + 2));
    expect(named.filter((n) => !inWeek.some((s) => name(s.templateId) === n))).toEqual([]);
    expect(named).toHaveLength(inWeek.filter((s) => type(s.templateId) !== 'recovery').length);
    const said = p.notes.map((n) => /(\d+) keer kracht/.exec(n)?.[1]).find(Boolean);
    if (said !== undefined) expect(inWeek.filter((s) => type(s.templateId) === 'strength')).toHaveLength(Number(said));
    // Invariant 2: de eerste twee weken van het voorbeeld zijn wat er na Akkoord en een opening staat.
    const until = addDays(TODAY, 13);
    const after = all.filter((s) => s.scheduledDate <= until).map((s) => `${s.scheduledDate} ${s.templateId}`).sort();
    expect(shown.filter((r) => r.slice(0, 10) <= until).sort()).toEqual(after);
  }, 60_000);
});
