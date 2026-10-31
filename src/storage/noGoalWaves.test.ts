import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, seedIfEmpty, syncProgramHorizon, PlannedSessionsRepo, ProgramsRepo, SettingsRepo, TrainingGoalsRepo } from './database';
import { applyHorizonPlanNow, computeHorizonPlan, type HorizonChangeInput } from './horizonPlan';
import { NO_GOAL_WAVES_TITLE, noGoalWavesAdvice, noGoalWavesLines, wavesConsentPatch } from '../engine/noGoalWaves';
import { planDirection } from '../engine/direction';
import type { TrainingGoal } from '../models/goals';

// Een bestaande gebruiker zonder doel houdt zijn plan tot hij Akkoord geeft op neutrale golven.
// Nagemaakte gebruiker: het volledige programma, alle doelen buiten de app om gearchiveerd.

const TODAY = '2026-10-26';
const HIKES = /tpl_mountain_hike|tpl_hike_day_one|tpl_ruck_walk/;

const proposal: HorizonChangeInput = {
  title: NO_GOAL_WAVES_TITLE, why: 'Test.', explanation: 'Test.', trigger: 'direction_changed',
  settings: wavesConsentPatch, notes: noGoalWavesLines(),
};

async function open() {
  return (await PlannedSessionsRepo.getAll()).filter((s) => s.scheduledDate >= TODAY && s.status !== 'skipped');
}

async function snapshot() {
  const sessions = (await PlannedSessionsRepo.getAll()).sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify([sessions, (await ProgramsRepo.getAll())[0].phases]);
}

async function offered() {
  const [settings, goals, program] = await Promise.all([SettingsRepo.get(), TrainingGoalsRepo.getAll(), ProgramsRepo.getAll()]);
  return noGoalWavesAdvice(planDirection(settings, goals, new Set(), TODAY, undefined, program[0]));
}

describe('bestaande gebruiker zonder doel: golven pas na Akkoord', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    await wipeAllData();
    await seedIfEmpty();
    await runBootMigrations({ build: 'test-nogoal-waves', seedProgram: true });
    await SettingsRepo.set({ restDay: 1 });
    await syncProgramHorizon();
  });
  afterEach(() => vi.useRealTimers());

  async function archiveAllQuietly() {
    for (const g of await TrainingGoalsRepo.getAll()) await TrainingGoalsRepo.put({ ...g, status: 'archived' } as TrainingGoal);
  }

  it('zonder Akkoord: de planningsronde laat het plan ongewijzigd', async () => {
    const before = await snapshot();
    await archiveAllQuietly();
    await syncProgramHorizon();
    await syncProgramHorizon();
    expect(await snapshot()).toBe(before);
    expect((await open()).some((s) => HIKES.test(s.templateId))).toBe(true);
    expect((await offered()).map((a) => a.title)).toEqual([NO_GOAL_WAVES_TITLE]);
  });

  it('het voorstel verandert niets tot Akkoord, en zegt wat er verandert', async () => {
    await archiveAllQuietly();
    await syncProgramHorizon();
    const before = await snapshot();
    const plan = await computeHorizonPlan(proposal);
    expect(plan.notes.join(' ')).toMatch(/bergtochten worden weer de lange loop/);
    expect(plan.counts.changed).toBeGreaterThan(0);
    expect(plan.proposal.changes.some((c) => /bergtocht.* wordt /i.test(c.reason ?? ''))).toBe(true);
    expect(await snapshot()).toBe(before);
    expect((await SettingsRepo.get()).noGoalWaves).toBeUndefined();
  });

  it('na Akkoord: neutrale golven, geen bergtocht en geen rugzak, en het voorstel is weg', async () => {
    await archiveAllQuietly();
    await syncProgramHorizon();
    expect((await applyHorizonPlanNow(await computeHorizonPlan(proposal))).status).toBe('applied');
    expect((await SettingsRepo.get()).noGoalWaves).toBe('agreed');
    expect((await ProgramsRepo.getAll())[0].phases.every((p) => p.id === 'phase_golf' || p.id === 'phase_golf_start')).toBe(true);
    expect((await open()).filter((s) => HIKES.test(s.templateId) && !s.lock)).toEqual([]);
    expect(await offered()).toEqual([]);
    await syncProgramHorizon();
    expect((await open()).filter((s) => HIKES.test(s.templateId) && !s.lock)).toEqual([]);
  });

  it('Liever niet: alles blijft, ook na nieuwe planningsrondes', async () => {
    await archiveAllQuietly();
    await syncProgramHorizon();
    const before = await snapshot();
    await computeHorizonPlan(proposal);
    // Liever niet slaat niets op behalve het antwoord bij de adviezen.
    await syncProgramHorizon();
    vi.setSystemTime(new Date(`2026-10-27T08:00:00`));
    await syncProgramHorizon();
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    expect(await snapshot()).toBe(before);
    expect((await SettingsRepo.get()).noGoalWaves).toBeUndefined();
  });

  it('vastgezet blijft staan, ook na Akkoord', async () => {
    await archiveAllQuietly();
    await syncProgramHorizon();
    const hike = (await open()).find((s) => s.templateId === 'tpl_mountain_hike')!;
    expect(hike).toBeDefined();
    await PlannedSessionsRepo.put({ ...hike, lock: { by: 'user', at: `${TODAY}T08:00:00.000Z` } });
    expect((await applyHorizonPlanNow(await computeHorizonPlan(proposal))).status).toBe('applied');
    const after = (await PlannedSessionsRepo.getAll()).find((s) => s.id === hike.id)!;
    expect(after.templateId).toBe('tpl_mountain_hike');
    expect(after.scheduledDate).toBe(hike.scheduledDate);
  });

  it('een doel archiveren via het voorstel laat de golven vooraf zien en neemt het Akkoord mee', async () => {
    const goals = (await TrainingGoalsRepo.getAll()).map((g) => ({ ...g, status: 'archived', targetDate: undefined }) as TrainingGoal);
    const plan = await computeHorizonPlan({ title: 'Archiveren', why: 'Test.', explanation: 'Test.', trigger: 'goal_removed', goals });
    expect(plan.input.settings).toEqual(wavesConsentPatch);
    expect((await applyHorizonPlanNow(plan)).status).toBe('applied');
    expect((await ProgramsRepo.getAll())[0].phases.every((p) => p.id === 'phase_golf' || p.id === 'phase_golf_start')).toBe(true);
    expect((await open()).filter((s) => HIKES.test(s.templateId) && !s.lock)).toEqual([]);
  });

  it('een voorstel dat bij een doel blijft, neemt geen Akkoord op golven mee', async () => {
    const [goal] = await TrainingGoalsRepo.getAll();
    const plan = await computeHorizonPlan({ title: 'Datum', why: 'Test.', explanation: 'Test.', trigger: 'goal_changed', goals: [{ ...goal, status: 'active', targetDate: '2027-07-25' } as TrainingGoal] });
    expect(plan.input.settings).toBeUndefined();
  });
});
