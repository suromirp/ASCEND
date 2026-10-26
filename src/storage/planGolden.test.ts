import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import {
  wipeAllData, seedIfEmpty, syncProgramHorizon, MetaRepo, ProgramsRepo, PlannedSessionsRepo, SessionLogsRepo, SessionTemplatesRepo, TrainingGoalsRepo, SettingsRepo,
} from './database';
import { applyHorizonPlanNow, computeHorizonPlan, type HorizonChangeInput } from './horizonPlan';
import { buildFirstPlan, defaultAnswers, type StartAnswers } from '../engine/firstPlan';
import { progressionTarget } from '../engine/programLayout';
import { resolveEffectiveFullDuration } from '../engine/substitutions';
import { addDays, mondayOfWeek } from '../utils/dates';
import type { SessionLog } from '../models/training';
import type { TrainingGoal } from '../models/goals';

// GOLDEN: bewaakt dat de planning (52 weken: datum, sessie, status, slot, minuten,
// rugzak, plus de fasen) voor drie vaste situaties precies gelijk blijft. Een bewuste
// wijziging van de planning mag de snapshot (__snapshots__/planGolden.test.ts.snap) pas
// bijwerken met uitleg in de commit waarom de planning anders is. Testdata is nagemaakt.

const TODAY = '2026-10-26';
const WEEKS = 52;

// Een stabiele lijst: id's zijn willekeurig, dus de sleutel is datum + sessie.
async function capture(): Promise<string> {
  const program = (await ProgramsRepo.getAll())[0];
  const templates = new Map((await SessionTemplatesRepo.getAll()).map((t) => [t.id, t]));
  const from = mondayOfWeek(TODAY);
  const until = addDays(from, WEEKS * 7 - 1);
  const rows = (await PlannedSessionsRepo.getAll())
    .filter((s) => s.scheduledDate >= from && s.scheduledDate <= until)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.order - b.order || a.templateId.localeCompare(b.templateId));
  const lines = rows.map((s) => {
    const t = templates.get(s.templateId);
    const live = s.status !== 'skipped' && t;
    const eff = live ? resolveEffectiveFullDuration(t, s.scheduledDate, program) : '-';
    const kg = live ? progressionTarget(t, program, s.scheduledDate)?.step.backpackKg ?? '-' : '-';
    return [s.scheduledDate, s.templateId, s.status, s.lock?.by ?? '-', s.plannedMinutes ?? '-', `eff=${eff}`, `kg=${kg}`, s.raceBlock ? 'race' : '', s.leave ? 'leave' : ''].join(' ').trim();
  });
  const phases = program ? program.phases.map((p) => `${p.order} ${p.id} ${p.name} weken=${p.weekCount}`) : ['geen programma'];
  return [`programma start=${program?.startDate} packTargetKg=${program?.packTargetKg ?? '-'}`, ...phases, `sessies=${rows.length}`, ...lines].join('\n');
}

async function firstPlan(answers: StartAnswers): Promise<void> {
  const setup = buildFirstPlan(answers, await SessionTemplatesRepo.getAll(), TODAY, `${TODAY}T08:00:00.000Z`);
  const { marathonRaceType, marathonTargetDate, ...rest } = setup.settings;
  const input: HorizonChangeInput = {
    title: setup.title, why: 'Golden.', explanation: 'Golden.', trigger: 'goal_created',
    program: setup.program, goals: setup.goals,
    settings: { ...rest, ...(marathonRaceType ? { marathonRaceType, marathonTargetDate } : {}) },
    firstPlan: { milestones: setup.milestones, strategy: setup.strategy, allowedDays: setup.allowedDays, restDay: setup.settings.restDay },
  };
  expect((await applyHorizonPlanNow(await computeHorizonPlan(input))).status).toBe('applied');
}

function log(id: string, daysAgo: number, over: Partial<SessionLog>): SessionLog {
  const d = addDays(TODAY, -daysAgo);
  return { id, templateId: 'tpl_easy_run', type: 'cardio', completedDate: d, completedAt: `${d}T10:00:00.000Z`, variant: 'full', durationMinutes: 40, source: 'manual', ...over };
}

describe('golden: de planning van vaste situaties', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    await wipeAllData();
  });
  afterEach(() => vi.useRealTimers());

  it('A: bestaande gebruiker, meerdaagse tocht met tussendoel 10 km en rustdag', async () => {
    await seedIfEmpty();
    await runBootMigrations({ build: 'test-golden', seedProgram: true });
    const main = (await TrainingGoalsRepo.getAll())[0];
    await TrainingGoalsRepo.put({ ...main, status: 'active', targetDate: '2027-07-25' } as TrainingGoal);
    const race = buildFirstPlan({ ...defaultAnswers('race'), race: '10k', goalDate: '2027-03-13' }, await SessionTemplatesRepo.getAll(), TODAY, `${TODAY}T08:00:00.000Z`).goals[0];
    await TrainingGoalsRepo.put({ ...race, id: 'goal-golden-10k' });
    await SettingsRepo.set({ restDay: 1 });
    await SessionLogsRepo.put(log('golden-strength', 3, { templateId: 'tpl_upper_a', type: 'strength', durationMinutes: 55 }));
    await SessionLogsRepo.put(log('golden-longrun', 9, { templateId: 'tpl_long_run', type: 'hiking', sport: 'running', durationMinutes: 80, outdoorData: { source: 'manual' as const, durationMinutes: 80, distanceKm: 12, elevationGainM: 250 } }));
    await SessionLogsRepo.put(log('golden-hike', 16, { templateId: 'tpl_mountain_hike', type: 'hiking', sport: 'hiking', durationMinutes: 150, outdoorData: { source: 'manual' as const, durationMinutes: 150, distanceKm: 11, elevationGainM: 600, elevationLossM: 600 } }));
    await syncProgramHorizon();
    await syncProgramHorizon();
    expect(await MetaRepo.get('seeded')).toBe(true);
    expect(await capture()).toMatchSnapshot();
  });

  it('B: nieuwe gebruiker, fit zonder doel, 4 dagen, kracht aan', async () => {
    await runBootMigrations({ build: 'test-golden' });
    await firstPlan({ ...defaultAnswers('fit'), daysPerWeek: 4 });
    await syncProgramHorizon();
    const out = await capture();
    expect(out).toMatchSnapshot();
    // Vastgelegd uit het onderzoek: wat levert fit nu op aan bergtochten.
    expect(out.split('\n').filter((l) => /tpl_mountain_hike|tpl_hike_day_one|tpl_ruck_walk/.test(l))).toMatchSnapshot('B: bergtochten en rugzak');
  });

  it('C: nieuwe gebruiker, hardloopwedstrijd 10 km, 4 dagen, kracht aan', async () => {
    await runBootMigrations({ build: 'test-golden' });
    await firstPlan({ ...defaultAnswers('race'), race: '10k', goalDate: '2027-03-13', daysPerWeek: 4 });
    await syncProgramHorizon();
    expect(await capture()).toMatchSnapshot();
  });
});
