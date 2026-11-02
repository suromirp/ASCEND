import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, syncProgramHorizon, PlannedSessionsRepo, SessionTemplatesRepo, SettingsRepo } from './database';
import { applyHorizonPlanNow, computeHorizonPlan, type HorizonChangeInput } from './horizonPlan';
import { buildFirstPlan, defaultAnswers, type StartAnswers } from '../engine/firstPlan';
import { isHeavyBeforeTest, isTestOnly, tooCloseBeforeTest } from '../engine/scheduler';
import { validateWeeks } from '../engine/weekValidator';
import { addDays, mondayOfWeek } from '../utils/dates';

// Rust voor een test (docs/beslissingen/2026-11-02-rust-voor-een-test.md): een eerste wedstrijdplan zet zelf nooit
// een zware loop- of beendag binnen 72 uur voor een testloop als er na de test een dag voor is, en Week meldt er
// nooit TEST-REST over: dat doet Week alleen als de zware dag of de test van jou of een voorstel is.
// Nagemaakte startantwoorden; de klok staat op maandag 26 oktober 2026.
const TODAY = '2026-10-26';

async function firstPlan(answers: StartAnswers): Promise<void> {
  const setup = buildFirstPlan(answers, await SessionTemplatesRepo.getAll(), TODAY, `${TODAY}T08:00:00.000Z`);
  const { marathonRaceType, marathonTargetDate, ...rest } = setup.settings;
  const input: HorizonChangeInput = {
    title: setup.title, why: 'Rust.', explanation: 'Rust.', trigger: 'goal_created',
    program: setup.program, goals: setup.goals,
    settings: { ...rest, ...(marathonRaceType ? { marathonRaceType, marathonTargetDate } : {}) },
    firstPlan: { milestones: setup.milestones, strategy: setup.strategy, allowedDays: setup.allowedDays, restDay: setup.settings.restDay },
  };
  expect((await applyHorizonPlanNow(await computeHorizonPlan(input))).status).toBe('applied');
}

describe('een eerste wedstrijdplan houdt 72 uur rust voor elke testloop', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    await wipeAllData();
  });
  afterEach(() => vi.useRealTimers());

  for (const race of ['5k', '10k', 'half'] as const) {
    for (const daysPerWeek of [3, 4, 5, 6]) {
      it(`${race}, ${daysPerWeek} dagen: geen zware dag te dicht voor een test, geen TEST-REST`, async () => {
        await runBootMigrations({ build: 'test-rust' });
        await firstPlan({ ...defaultAnswers('race'), race, goalDate: '2027-03-13', daysPerWeek });
        await syncProgramHorizon();
        const templates = await SessionTemplatesRepo.getAll();
        const byId = new Map(templates.map((t) => [t.id, t]));
        const open = (await PlannedSessionsRepo.getAll()).filter((s) => s.status !== 'skipped' && s.scheduledDate >= TODAY);
        const tests = open.filter((s) => { const t = byId.get(s.templateId); return !!t && isTestOnly(t); });
        const close = tests.flatMap((test) => open
          .filter((o) => { const t = byId.get(o.templateId); return !!t && isHeavyBeforeTest(t) && tooCloseBeforeTest(o.scheduledDate, test.scheduledDate); }));
        // Alleen waar na de test geen dag past (een volle week met een bergweekend) blijft de beendag dichtbij, in
        // zijn korte versie, zoals het wedstrijdblok dat al deed. Nooit iets anders dan die beendag.
        for (const o of close) {
          expect(o.templateId).toBe('tpl_lower_a');
          expect(o.raceBlock?.short).toBe(true);
          expect(daysPerWeek).toBeGreaterThanOrEqual(5);
        }
        if (daysPerWeek <= 4) expect(close).toEqual([]);
        const settings = await SettingsRepo.get();
        const weeks = new Set(tests.flatMap((t) => [mondayOfWeek(t.scheduledDate), mondayOfWeek(addDays(t.scheduledDate, -7))]));
        const findings = validateWeeks({ sessions: open, logs: [], templates, today: TODAY, restDay: settings.restDay, reportYours: true }, weeks).filter((f) => f.rule === 'TEST-REST');
        expect(findings).toEqual([]);
      }, 30000);
    }
  }
});
