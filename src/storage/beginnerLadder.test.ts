import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, seedIfEmpty, syncProgramHorizon, PlannedSessionsRepo, ProgramsRepo, SessionTemplatesRepo, SettingsRepo, TrainingGoalsRepo, type AppSettings } from './database';
import { applyHorizonPlanNow, computeHorizonPlan } from './horizonPlan';
import { primePlanningRegisters } from '../state/planningSync';
import { resolveVariantDuration, setFixedSessionMinutes, setStartBuild } from '../engine/substitutions';
import { directionChangeLines } from '../engine/directionChange';
import { ladderConsentPatch, beginnerLadderLinesOn } from '../engine/beginnerLadderOffer';
import { startBudgetsFor, yourWeek } from '../engine/yourWeek';
import { BEGINNER_LADDER } from '../data/beginnerLadder';
import type { DirectionId } from '../data/directions';
import type { TrainingGoal } from '../models/goals';
import type { PlannedSession } from '../models/training';

// Stap 3 en 4 van docs/visie/Ontwerp beginner rest.md, met de opslag: de ladder wordt de planning, alleen met
// Akkoord. Nagemaakte gebruiker: het volledige programma, alle doelen gearchiveerd, een beginnersstart op Ja.

const TODAY = '2026-10-26';
const rungs = BEGINNER_LADDER.map((w) => ({ strength: w.strengthMinutes.value, short: w.shortMinutes.value, long: w.longMinutes.value }));

async function setUp() {
  await seedIfEmpty();
  await runBootMigrations({ build: 'test-ladder', seedProgram: true });
  for (const g of await TrainingGoalsRepo.getAll()) await TrainingGoalsRepo.put({ ...g, status: 'archived' } as TrainingGoal);
  await SettingsRepo.set({ restDay: 1, beginnerStart: 'ja' });
  await syncProgramHorizon();
}

const input = (id: DirectionId, extra: Partial<AppSettings> = {}) => ({
  title: 'Richting', why: 'Test.', explanation: 'Test.', trigger: 'direction_changed' as const,
  settings: { direction: id, directionStart: TODAY, ...extra }, notes: directionChangeLines(id, {}),
});

const ladderChange = () => ({
  title: 'Je start wordt lichter', why: 'Test.', explanation: 'Test.', trigger: 'availability_changed' as const,
  settings: ladderConsentPatch, notes: beginnerLadderLinesOn({}, null, TODAY),
});

async function open() {
  return (await PlannedSessionsRepo.getAll()).filter((s) => s.scheduledDate >= TODAY && s.status !== 'skipped');
}
const sorted = async () => JSON.stringify((await PlannedSessionsRepo.getAll()).sort((a, b) => a.id.localeCompare(b.id)));

// De lengte zoals de app hem toont: met de registers uit de opslag.
async function lengths() {
  await primePlanningRegisters();
  const program = (await ProgramsRepo.getAll())[0];
  const byId = new Map((await SessionTemplatesRepo.getAll()).map((t) => [t.id, t]));
  return (await open()).map((s) => ({ s, t: byId.get(s.templateId)!, minutes: s.plannedMinutes ?? resolveVariantDuration(byId.get(s.templateId)!, 'full', s.scheduledDate, program) }));
}
const weekOf = (s: PlannedSession) => Math.floor((Date.parse(s.scheduledDate) - Date.parse(TODAY)) / (7 * 86400000)) + 1;

describe('de ladder van heel licht in de planning', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    await wipeAllData();
    await setUp();
  });
  afterEach(() => {
    vi.useRealTimers();
    setStartBuild('gewoon');
    setFixedSessionMinutes([]);
  });

  const cases = (['maintain', 'improve', 'stronger'] as const).flatMap((id) => ([3, 4, 6] as const).map((length) => [id, length] as const));
  it.each(cases)('%s met golven van %i weken: de start volgt de ladder, daarna de gewone opbouw', async (id, length) => {
    const waves = length === 4 ? {} : { waves: { length } };
    expect(['applied', 'unchanged']).toContain((await applyHorizonPlanNow(await computeHorizonPlan(input(id, { ...waves, ...ladderConsentPatch })))).status);
    expect((await SettingsRepo.get()).beginnerLadder).toBe('agreed');
    const startWeeks = Math.ceil(4 / length) * length;
    const rows = await lengths();
    const inStart = rows.filter((r) => weekOf(r.s) <= startWeeks);
    expect(inStart.some((r) => r.t.id === 'tpl_walk_jog_long'), id).toBe(true);
    for (const r of inStart) {
      const rung = rungs[Math.min(weekOf(r.s), rungs.length) - 1];
      const label = `${id} ${length} ${r.s.scheduledDate} ${r.t.id}`;
      if (r.t.id === 'tpl_walk_jog') expect(r.minutes, label).toBe(rung.short);
      if (r.t.id === 'tpl_walk_jog_long') expect(r.minutes, label).toBe(rung.long);
      if (r.t.type === 'strength' && weekOf(r.s) <= rungs.length) expect(r.minutes, label).toBeLessThanOrEqual(rung.strength);
      if (r.t.id === 'tpl_herstel') expect(r.minutes, label).toBeLessThanOrEqual(rung.short);
    }
    // Na de start de gewone lopen, en geen wandelen en dribbelen meer.
    expect(rows.filter((r) => weekOf(r.s) > startWeeks && r.t.id.startsWith('tpl_walk_jog'))).toEqual([]);
    // Het weekbudget in de start is wat er gepland staat.
    const program = (await ProgramsRepo.getAll())[0];
    const settings = await SettingsRepo.get();
    const plannedSessions = await PlannedSessionsRepo.getAll();
    const templates = await SessionTemplatesRepo.getAll();
    const budgets = startBudgetsFor({ plannedSessions, templates, program, settings, today: TODAY })!;
    expect(Object.keys(budgets).length, id).toBe(startWeeks);
    expect(budgets[TODAY], id).toBeGreaterThan(0);
    const week = yourWeek({ settings, goals: [], milestones: new Set(), logs: [], templates, plannedSessions, today: TODAY, startBudgets: budgets });
    expect(week?.budget.minutes, id).toBe(budgets[TODAY]);
  });

  it('twee rondes achter elkaar geven hetzelfde, en drie openingen ook', async () => {
    expect((await applyHorizonPlanNow(await computeHorizonPlan(input('maintain', ladderConsentPatch)))).status).toBe('applied');
    await primePlanningRegisters();
    await syncProgramHorizon();
    const once = await sorted();
    for (let i = 0; i < 3; i++) {
      await runBootMigrations({ build: `opening-${i}` });
      await primePlanningRegisters();
      const sync = await syncProgramHorizon();
      expect(sync.repairs?.lines ?? []).toEqual([]);
      expect(await sorted()).toBe(once);
    }
  });

  it('een lopende start zonder Akkoord op de ladder blijft zoals hij was, ook na openingen', async () => {
    // Een start op heel licht van voor de ladder: wandelen en dribbelen 20 en 30, kracht zoals gepland.
    expect((await applyHorizonPlanNow(await computeHorizonPlan(input('maintain', { beginnerBuild: 'licht' })))).status).toBe('applied');
    expect((await SettingsRepo.get()).beginnerLadder).toBeUndefined();
    const before = await sorted();
    const minutesBefore = (await lengths()).map((r) => `${r.s.id}:${r.minutes}`);
    expect((await lengths()).filter((r) => r.t.id === 'tpl_walk_jog_long').every((r) => r.minutes === 30)).toBe(true);
    for (let i = 0; i < 2; i++) {
      await primePlanningRegisters();
      await syncProgramHorizon();
    }
    // Het voorstel zelf verandert niets.
    const plan = await computeHorizonPlan(ladderChange());
    expect(plan.notes?.join(' ')).toMatch(/kracht 35 minuten/);
    expect(await sorted()).toBe(before);
    expect((await lengths()).map((r) => `${r.s.id}:${r.minutes}`)).toEqual(minutesBefore);
    expect((await SettingsRepo.get()).beginnerLadder).toBeUndefined();
    // Akkoord: de ladder.
    expect(['applied', 'unchanged']).toContain((await applyHorizonPlanNow(await computeHorizonPlan(ladderChange()))).status);
    expect((await SettingsRepo.get()).beginnerLadder).toBe('agreed');
    const firstWeek = (await lengths()).filter((r) => weekOf(r.s) === 1);
    expect(firstWeek.filter((r) => r.t.id === 'tpl_walk_jog_long').map((r) => r.minutes)).toEqual([rungs[0].long]);
    for (const r of firstWeek.filter((x) => x.t.type === 'strength')) expect(r.minutes).toBeLessThanOrEqual(rungs[0].strength);
  });

  it('een training die je zelf een lengte gaf, houdt die', async () => {
    expect((await applyHorizonPlanNow(await computeHorizonPlan(input('maintain', ladderConsentPatch)))).status).toBe('applied');
    const strength = (await lengths()).find((r) => r.t.type === 'strength' && weekOf(r.s) === 1)!;
    await PlannedSessionsRepo.put({ ...strength.s, plannedMinutes: 70 });
    for (let i = 0; i < 2; i++) {
      await primePlanningRegisters();
      await syncProgramHorizon();
    }
    const after = (await lengths()).find((r) => r.s.id === strength.s.id)!;
    expect(after.s.scheduledDate).toBe(strength.s.scheduledDate);
    expect(after.minutes).toBe(70);
  });

  it('bij Gewoon verandert er niets', async () => {
    expect(['applied', 'unchanged']).toContain((await applyHorizonPlanNow(await computeHorizonPlan(input('maintain', { beginnerBuild: 'gewoon', beginnerLadder: 'agreed' })))).status);
    const rows = await lengths();
    expect(rows.filter((r) => r.t.id.startsWith('tpl_walk_jog'))).toEqual([]);
    const program = (await ProgramsRepo.getAll())[0];
    for (const r of rows.filter((x) => x.t.type === 'strength' && weekOf(x.s) === 1)) {
      setStartBuild('gewoon');
      expect(r.minutes).toBe(resolveVariantDuration(r.t, 'full', r.s.scheduledDate, program));
    }
  });
});
