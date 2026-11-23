// I-14 Eén plan, stap naspelen (docs/visie/Ontwerp Eén plan.md, symptoom A en invariant 1): wat het eerste voorstel
// noemt, staat daarna in Week. Wat nu niet klopt staat als it.fails met het symptoom in de naam; een latere stap
// (claude/een-plan-eerste-voorstel) zet die om naar it. Testdata is nagemaakt en de datum staat vast.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, syncProgramHorizon, PlannedSessionsRepo, SessionTemplatesRepo } from './database';
import { applyHorizonPlanNow, computeHorizonPlan, type HorizonPlan } from './horizonPlan';
import { runWeeklyPrescriptionStep } from './weeklyPrescriptionStep';
import { primePlanningRegisters } from '../state/planningSync';
import { buildFirstPlan, defaultAnswers } from '../engine/firstPlan';
import { previewProposal } from '../engine/proposalPreview';
import { REST_DAY_COPY } from '../data/restDayCopy';
import { isoWeekday } from '../utils/dates';
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
      firstPlan: { milestones: setup.milestones, strategy: setup.strategy, allowedDays: setup.allowedDays, restDay: setup.settings.restDay },
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

  it.fails('symptoom A: de lijst van het voorstel noemt de herstelwandeling met hetzelfde woord als Week', () => {
    // De lijst met wijzigingen in het voorstel (engine/proposalPreview.ts, MoveLine) noemt de rij met de naam van het
    // sjabloon, Herstelwandeling; de dagkaarten van hetzelfde voorstel en Week zeggen Rustdag.
    const moves = previewProposal(plan.proposal.changes, [], templates).moves.filter((m) => m.to?.startsWith('2026-11-09'));
    expect(moves.map((m) => m.name)).toEqual([REST_DAY_COPY.rest.title]);
  });

  it.fails('symptoom A: het aantal keer kracht in de tekst is het aantal krachtdagen in Week', () => {
    // De tekst zegt "Je week: 150 minuten en 2 keer kracht." (het weekbudget van de richting), de week heeft er één.
    const said = plan.notes.map((n) => /(\d+) keer kracht/.exec(n)?.[1]).find(Boolean);
    expect(said).toBeDefined();
    expect(week.filter((s) => typeOf(s) === 'strength')).toHaveLength(Number(said));
  });

  it.fails('symptoom A (invariant 1): elke training die de tekst bij de dagen noemt, staat in Week', () => {
    // "3 trainingen per week (dinsdag: Bovenlichaam A, donderdag: Rustige duurloop, zondag: Lange duurloop)", terwijl
    // de beginnersstart op die plekken Wandelen en dribbelen zet; de zin erna legt dat uit, de dagregel niet.
    const line = plan.notes.find((n) => /trainingen per week \(/.test(n))!;
    const named = [...line.matchAll(/(?:maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag): ([^,)]+)/g)].map((m) => m[1]);
    const inWeek = new Set(week.map((s) => templates.find((t) => t.id === s.templateId)?.name));
    expect(named.length).toBeGreaterThan(0);
    expect(named.filter((n) => !inWeek.has(n))).toEqual([]);
  });
});
