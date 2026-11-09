// Naspeeltest (melding van 9 november): de kaart "Weekplanning bijgewerkt" kwam bij elke opening terug.
//
// Het voorschrift zette een training in een week (een Wandeldag, hier Heuvelsprints en afdalen naast de
// zaterdagtraining), de planningsronde zette hem om (de fase-regel) of haalde hem weg (de weekcontrole: "stond
// dubbel"), en bij de volgende opening zette het voorschrift hem er weer in. Elke opening meldde dus "Planning
// bijgewerkt" en "Weekplanning bijgewerkt" voor een planning die netto niet veranderde.
//
// Alleen nagemaakte gegevens: het demoprogramma, een wedstrijd eind maart 2027, de GR5 in augustus 2027, een paar
// verzonnen trainingen en ruimte op zaterdag voor twee trainingen op een dag.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { runWeeklyPrescriptionStep, keptByPlanningRound } from './weeklyPrescriptionStep';
import {
  wipeAllData,
  syncProgramHorizon,
  SettingsRepo,
  TrainingGoalsRepo,
  SessionLogsRepo,
  PlannedSessionsRepo,
  PlanChangeProposalsRepo,
  GoalEngineConfigRepo,
} from './database';
import { primePlanningRegisters } from '../state/planningSync';
import { addDays } from '../utils/dates';
import type { PlannedSession, SessionLog } from '../models/training';
import type { TrainingGoal } from '../models/goals';
import type { PlanChangeItem } from '../models/planChange';

const NOW = '2026-11-09T08:00:00';
const TODAY = '2026-11-09';

function fakeLog(i: number, daysAgo: number, templateId: string, type: SessionLog['type'], minutes: number, distanceKm?: number, elevationGainM?: number): SessionLog {
  const date = addDays(TODAY, -daysAgo);
  const data = { durationMinutes: minutes, distanceKm, elevationGainM, environment: 'outdoor' as const, source: 'manual' as const };
  return {
    id: `fake_log_${i}`, templateId, type, completedDate: date, completedAt: `${date}T18:00:00`, variant: 'full', durationMinutes: minutes, rpe: 6, source: 'manual',
    ...(type === 'hiking' ? { outdoorData: data } : { cardioData: data }),
  };
}

const req = (id: string, kind: string, amount: number, unit: string, scope: string, discipline?: string) =>
  ({ id, kind, scope, target: { amount, unit }, ...(discipline ? { discipline } : {}) });

// Een opening van de app zoals de skill naspelen hem doet: opstartstappen, de registers, de ronde, het voorschrift.
async function open(build: string) {
  await runBootMigrations({ build });
  await primePlanningRegisters();
  const sync = await syncProgramHorizon();
  const weekly = await runWeeklyPrescriptionStep();
  return { sync, weekly };
}

const rows = async () => (await PlannedSessionsRepo.getAll()).map((s) => JSON.stringify(s)).sort();

describe('opening na opening: geen pingpong tussen voorschrift en planningsronde', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(NOW));
    await wipeAllData();
    // Een halve marathon op zaterdag 27 maart 2027 als tussendoel, de GR5 op 1 augustus 2027 als hoofddoel.
    await SettingsRepo.set({ marathonRaceType: 'half', marathonTargetDate: '2027-03-27' });
    await runBootMigrations({ seedProgram: true });
    const gr5 = (await TrainingGoalsRepo.getAll()).find((g) => g.id === 'obj_gr5')!;
    await TrainingGoalsRepo.put({
      ...gr5, status: 'active', targetDate: '2027-08-01', execution: 'stages',
      requirements: [
        req('q1', 'distance', 600, 'km', 'TOTAL_EVENT', 'hiking'), req('q2', 'elevationGain', 30000, 'm', 'TOTAL_EVENT'),
        req('q3', 'eventDays', 30, 'days', 'TOTAL_EVENT', 'hiking'), req('q4', 'packWeight', 12, 'kg', 'SINGLE_EVENT'),
        req('q5', 'consecutiveDays', 6, 'days', 'CONSECUTIVE_DAYS'),
      ] as TrainingGoal['requirements'],
    });
    // Op zaterdag past een tweede training (een dagbudget), zodat het voorschrift er een naast zet.
    const config = await GoalEngineConfigRepo.get();
    await GoalEngineConfigRepo.set({ ...config, availability: { ...config.availability, dailyTimeBudget: { sat: { preferredMinutes: 240, softFlexMinutes: 30 } } } });
    for (const l of [
      fakeLog(1, 2, 'tpl_easy_run', 'cardio', 40, 6), fakeLog(2, 4, 'tpl_long_run', 'cardio', 75, 11), fakeLog(3, 9, 'tpl_easy_run', 'cardio', 35, 5.5),
      fakeLog(4, 12, 'tpl_bergconditie', 'hiking', 90, 9, 450), fakeLog(5, 16, 'tpl_easy_run', 'cardio', 45, 7), fakeLog(6, 19, 'tpl_long_run', 'cardio', 80, 12),
      fakeLog(7, 23, 'tpl_bergconditie', 'hiking', 100, 10, 520), fakeLog(8, 26, 'tpl_easy_run', 'cardio', 40, 6.5),
    ]) await SessionLogsRepo.put(l);
    // De stand zoals de app hem liet: de eerste opening na het zetten van de doelen mag de planning bijwerken.
    await open('stand');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('drie openingen achter elkaar: geen melding, geen kaart en dezelfde planning', async () => {
    const logbook = (await PlanChangeProposalsRepo.getAll()).length;
    const first = await open('opening-1');
    const afterFirst = await rows();
    const second = await open('opening-2');
    const afterSecond = await rows();
    const third = await open('opening-3');
    const afterThird = await rows();
    for (const o of [first, second, third]) {
      expect(o.sync.repairs?.lines ?? []).toEqual([]);
      expect(o.weekly.kind).toBe('unchanged');
    }
    expect(afterSecond).toEqual(afterFirst);
    expect(afterThird).toEqual(afterFirst);
    expect((await PlanChangeProposalsRepo.getAll()).length).toBe(logbook);
  });

  it('het voorschrift houdt geen training die de fase-regel daarna omzet: een Wandeldag in een week zonder wandeldag', async () => {
    const planned = await PlannedSessionsRepo.getAll();
    // Zaterdag 6 maart 2027: een week van de opbouw, ver voor de expeditiefase van de GR5.
    const saturday = planned.find((s) => s.scheduledDate === '2027-03-06' && s.status !== 'skipped');
    expect(saturday).toBeDefined();
    const wandeldag: PlanChangeItem = { action: 'add', newSessionDraft: { templateId: 'tpl_hike_day_one', scheduledDate: '2027-03-06', weekStartDate: '2027-03-01' }, reason: 'nagemaakt' };
    const replace: PlanChangeItem = { action: 'replace', plannedSessionId: saturday!.id, newPrescriptionId: 'tp_nagemaakt', reason: 'nagemaakt' };
    expect(await keptByPlanningRound([wandeldag, replace], planned)).toEqual([replace]);
  });

  it('de ronde meldt alleen wat netto verandert: een Wandeldag die omgezet en weggehaald wordt is één regel, daarna niets', async () => {
    const planned = await PlannedSessionsRepo.getAll();
    const saturday = planned.find((s) => s.scheduledDate === '2027-03-06' && s.status !== 'skipped')!;
    // Een oudere versie liet een Wandeldag naast de zaterdagtraining staan.
    await PlannedSessionsRepo.put({ id: 'planned_wandeldag', templateId: 'tpl_hike_day_one', scheduledDate: '2027-03-06', weekStartDate: '2027-03-01', status: 'planned', order: 99 });
    await PlannedSessionsRepo.put({ ...saturday, templateId: 'tpl_hill_intervals' });
    await primePlanningRegisters();
    const first = await syncProgramHorizon();
    const lines = first.repairs?.lines ?? [];
    expect(lines.filter((l) => l.startsWith('Wandeldag 1 van 2'))).toHaveLength(1);
    expect(lines.some((l) => l.includes('wordt Heuvelintervallen'))).toBe(false);
    expect((await PlannedSessionsRepo.getAll()).some((s) => s.id === 'planned_wandeldag')).toBe(false);
    const second = await syncProgramHorizon();
    expect(second.repairs).toBeUndefined();
  });

  it('een training die de ronde laat staan blijft in het voorschrift', async () => {
    const planned = await PlannedSessionsRepo.getAll();
    const free = freeDay(planned, '2027-03-01');
    const add: PlanChangeItem = { action: 'add', newSessionDraft: { templateId: 'tpl_recovery_run', scheduledDate: free ?? '2027-03-06', weekStartDate: '2027-03-01' }, reason: 'nagemaakt' };
    const kept = await keptByPlanningRound([add], planned);
    // Op een vrije dag of naast de zaterdag: een herstelloop zet de ronde niet om.
    expect(kept).toEqual([add]);
  });
});

function freeDay(planned: PlannedSession[], monday: string): string | undefined {
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    if (!planned.some((s) => s.scheduledDate === d && s.status !== 'skipped')) return d;
  }
  return undefined;
}
