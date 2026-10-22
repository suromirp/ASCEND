// Naspeeltest: de opstartvolgorde twee keer achter elkaar op nagemaakte
// gegevens. De eerste keer mag de app dingen zetten (de planning loopt
// bij); de tweede keer is er niets veranderd en mag er dus NIETS geschreven
// worden en geen "bijgewerkt"-regel in het wijzigingslogboek komen.
//
// Dit is de test die de herschrijffout uit docs/visie/Techniek en kwaliteit.md
// 2.3 bewijst: de weekprescriptie schreef bij elke opening dezelfde
// voorschriften opnieuw (met nieuwe id's), toonde "Weekplanning bijgewerkt" en
// zette een regel in planChangeProposals, ook als er niets veranderde.
//
// Alleen nagemaakte gegevens: het demoprogramma plus een paar verzonnen logs.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { runWeeklyPrescriptionStep } from './weeklyPrescriptionStep';
import {
  wipeAllData,
  syncProgramHorizon,
  SettingsRepo,
  TrainingGoalsRepo,
  SessionLogsRepo,
  PlannedSessionsRepo,
  PlanChangeProposalsRepo,
  WeeklyPrescriptionsRepo,
  TrainingPrescriptionsRepo,
  SessionTemplatesRepo,
  GoalEngineConfigRepo,
} from './database';
import { addDays, mondayOfWeek } from '../utils/dates';
import { computeForecastReplan } from '../engine/adaptiveReplanner';
import type { SessionLog } from '../models/training';

// Een woensdag, ruim voor de 10 km van 20 maart 2027 en de GR5 van 1 augustus 2027.
const NOW = '2026-10-21T08:00:00';
const TODAY = '2026-10-21';

// Telt elke schrijfactie op een store (put, add, delete, clear) tijdens fn.
async function countWrites<T>(fn: () => Promise<T>): Promise<{ result: T; writes: string[] }> {
  const writes: string[] = [];
  const spies = (['put', 'add', 'delete', 'clear'] as const).map((method) => {
    const original = IDBObjectStore.prototype[method] as (...args: unknown[]) => unknown;
    return vi.spyOn(IDBObjectStore.prototype, method).mockImplementation(function (this: IDBObjectStore, ...args: unknown[]) {
      writes.push(`${method} ${this.name}`);
      return original.apply(this, args);
    } as never);
  });
  try {
    return { result: await fn(), writes };
  } finally {
    spies.forEach((s) => s.mockRestore());
  }
}

// Wat de app bij een koude start doet, in dezelfde volgorde (state/AppDataContext.tsx):
// opstartstappen, de planningssync, daarna de achtergrondstappen.
async function boot() {
  await runBootMigrations();
  await syncProgramHorizon();
  const forecast = computeForecastReplan({
    plannedSessions: await PlannedSessionsRepo.getAll(),
    templates: await SessionTemplatesRepo.getAll(),
    availability: (await GoalEngineConfigRepo.get()).availability,
    asOf: TODAY,
  });
  const weekly = await runWeeklyPrescriptionStep(TODAY);
  return { forecast, weekly };
}

function fakeLog(i: number, daysAgo: number, templateId: string, type: SessionLog['type'], minutes: number, distanceKm?: number, elevationGainM?: number): SessionLog {
  const date = addDays(TODAY, -daysAgo);
  const data = { durationMinutes: minutes, distanceKm, elevationGainM, environment: 'outdoor' as const, source: 'manual' as const };
  return {
    id: `fake_log_${i}`, templateId, type, completedDate: date, completedAt: `${date}T18:00:00`, variant: 'full', durationMinutes: minutes, rpe: 6, source: 'manual',
    ...(type === 'hiking' ? { outdoorData: data } : { cardioData: data }),
  };
}

describe('opstart twee keer naspelen', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(NOW));
    await wipeAllData();
    // Het doel van de gebruiker, nagemaakt: een wedstrijd op 20 maart en de GR5 op 1 augustus.
    await SettingsRepo.set({ marathonRaceType: 'half', marathonTargetDate: '2027-03-20' });
    await runBootMigrations();
    const gr5 = (await TrainingGoalsRepo.getAll()).find((g) => g.id === 'obj_gr5');
    expect(gr5).toBeDefined();
    await TrainingGoalsRepo.put({ ...gr5!, status: 'active', targetDate: '2027-08-01' });
    // Een paar verzonnen trainingen uit de afgelopen weken.
    const logs = [
      fakeLog(1, 2, 'tpl_easy_run', 'cardio', 40, 6),
      fakeLog(2, 4, 'tpl_long_run', 'cardio', 75, 11),
      fakeLog(3, 9, 'tpl_easy_run', 'cardio', 35, 5.5),
      fakeLog(4, 12, 'tpl_bergconditie', 'hiking', 90, 9, 450),
      fakeLog(5, 16, 'tpl_easy_run', 'cardio', 45, 7),
      fakeLog(6, 19, 'tpl_long_run', 'cardio', 80, 12),
      fakeLog(7, 23, 'tpl_bergconditie', 'hiking', 100, 10, 520),
      fakeLog(8, 26, 'tpl_easy_run', 'cardio', 40, 6.5),
    ];
    for (const l of logs) await SessionLogsRepo.put(l);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('de tweede opstart schrijft niets en zet geen regel in het wijzigingslogboek', async () => {
    // De eerste opstart zet de weekprescriptie voor het eerst; dat mag schrijven en loggen.
    const first = await boot();
    expect(first.weekly.kind).toBe('applied');
    expect((await TrainingPrescriptionsRepo.getAll()).length).toBeGreaterThan(0);
    expect((await PlanChangeProposalsRepo.getAll()).length).toBe(1);

    const planningBefore = await PlannedSessionsRepo.getAll();
    const logbookBefore = await PlanChangeProposalsRepo.getAll();
    const weeklyBefore = await WeeklyPrescriptionsRepo.getAll();
    const trainingBefore = await TrainingPrescriptionsRepo.getAll();
    expect(weeklyBefore.length).toBeGreaterThan(0); // de weekprescriptie draait echt

    const { result, writes } = await countWrites(boot);

    expect(writes).toEqual([]);
    expect(result.weekly).toEqual({ kind: 'unchanged', wrote: false });
    expect(result.forecast.proposal.changes).toEqual([]);
    expect(await PlanChangeProposalsRepo.getAll()).toEqual(logbookBefore);
    expect(await PlannedSessionsRepo.getAll()).toEqual(planningBefore);
    expect(await WeeklyPrescriptionsRepo.getAll()).toEqual(weeklyBefore);
    expect(await TrainingPrescriptionsRepo.getAll()).toEqual(trainingBefore);
  });

  it('vijf keer openen laat precies de regel van de eerste keer in het logboek staan', async () => {
    for (let i = 0; i < 5; i++) await boot();
    const logbook = await PlanChangeProposalsRepo.getAll();
    expect(logbook.map((p) => p.issue)).toEqual(['Weekprescriptie bijgewerkt']);
  });

  it('een echte verandering wordt wel gezien en vastgelegd', async () => {
    await boot();
    await boot();
    const weeklyBefore = await WeeklyPrescriptionsRepo.getAll();
    // De gebruiker haalt zijn eerste doel naar voren: de weekplanning moet dat volgen.
    const goals = await TrainingGoalsRepo.getAll();
    const race = goals.find((g) => g.name === 'Marathon')!;
    await TrainingGoalsRepo.put({ ...race, targetDate: addDays(mondayOfWeek(TODAY), 7 * 6) });
    await boot();
    await boot();
    const weeklyAfter = await WeeklyPrescriptionsRepo.getAll();
    expect(weeklyAfter.length).toBeGreaterThan(0);
    expect(JSON.stringify(weeklyAfter.map((w) => [w.weekStartDate, w.specificityRampBand]))).not.toEqual(
      JSON.stringify(weeklyBefore.map((w) => [w.weekStartDate, w.specificityRampBand])),
    );
  });
});
