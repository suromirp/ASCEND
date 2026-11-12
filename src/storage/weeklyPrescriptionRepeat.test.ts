// Naspeeltest (melding van 12 november): op één dag kwam twaalf keer een aangenomen voorstel van het weekvoorschrift
// binnen dat "Wandeldag 1 van 2" toevoegt op een zaterdag zestien weken vooruit, terwijl er daarna op die dag geen
// wandeldag stond. Het voorstel landde niet en kwam bij elke opening terug.
//
// De oorzaak was de planningsronde die de toevoeging weghaalde; het voorschrift houdt sinds 11 november alleen wat de
// ronde laat staan. Hier het geval uit de melding met alleen nagemaakte gegevens en verschoven datums (het
// demoprogramma, een wedstrijd eind maart 2027, de GR5 in augustus 2027), en de randen eromheen.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// De grenzen hieronder zijn die van de eigenaar: middernacht in Nederland, ook als de omgeving in UTC draait.
vi.stubEnv('TZ', 'Europe/Amsterdam');
import { runBootMigrations } from './bootMigrations';
import { runWeeklyPrescriptionStep, keptByPlanningRound } from './weeklyPrescriptionStep';
import { wipeAllData, syncProgramHorizon, SettingsRepo, TrainingGoalsRepo, PlannedSessionsRepo, PlanChangeProposalsRepo, GoalEngineConfigRepo } from './database';
import { primePlanningRegisters } from '../state/planningSync';
import { mondayOfWeek } from '../utils/dates';
import type { PlannedSession } from '../models/training';
import type { TrainingGoal } from '../models/goals';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import * as engine from '../engine/weeklyPrescriptionEngine';

// Wat het voorschrift bij elke opening wil; de rest van de stap (dagen die niet mogen, het logboek, de ronde) is echt.
const wanted = vi.hoisted(() => ({ changes: [] as unknown[] }));
vi.mock('../engine/weeklyPrescriptionEngine', async (original) => {
  const real = await original<typeof engine>();
  return {
    ...real,
    computeWeeklyPrescriptionPlan: (...args: Parameters<typeof real.computeWeeklyPrescriptionPlan>) => {
      const out = real.computeWeeklyPrescriptionPlan(...args);
      return { ...out, proposal: { ...out.proposal, changes: wanted.changes as PlanChangeItem[] } };
    },
  };
});

const req = (id: string, kind: string, amount: number, unit: string, scope: string, discipline?: string) =>
  ({ id, kind, scope, target: { amount, unit }, ...(discipline ? { discipline } : {}) });

async function open(build: string) {
  await runBootMigrations({ build });
  await primePlanningRegisters();
  const sync = await syncProgramHorizon();
  const weekly = await runWeeklyPrescriptionStep();
  // De app leest na een wijziging opnieuw en draait de ronde over het resultaat.
  if (weekly.wrote) { await primePlanningRegisters(); await syncProgramHorizon(); }
  return { sync, weekly };
}

const live = (planned: PlannedSession[], date: string) => planned.filter((s) => s.scheduledDate === date && s.status !== 'skipped');
// Zaterdag 6 maart 2027, zestien weken vooruit: met ruimte voor een tweede training laat de ronde daar een herstelloop staan.
const SATURDAY = '2027-03-06';
const add = (date: string, extra: Partial<PlanChangeItem> = {}): PlanChangeItem => ({
  action: 'add', newSessionDraft: { templateId: 'tpl_recovery_run', scheduledDate: date, weekStartDate: mondayOfWeek(date) }, reason: 'nagemaakt', generatedBy: ['engine/weeklyPrescriptionEngine.ts'], ...extra,
});
const weeklyLog = async () => (await PlanChangeProposalsRepo.getAll()).filter((p) => p.trigger === 'weekly_prescription_computed');

async function stand(now: string) {
  vi.setSystemTime(new Date(now));
  wanted.changes = [];
  await wipeAllData();
  await SettingsRepo.set({ marathonRaceType: 'half', marathonTargetDate: '2027-03-27' });
  await runBootMigrations({ seedProgram: true });
  const gr5 = (await TrainingGoalsRepo.getAll()).find((g) => g.id === 'obj_gr5')!;
  await TrainingGoalsRepo.put({
    ...gr5, status: 'active', targetDate: '2027-08-01', execution: 'stages',
    requirements: [req('q1', 'distance', 600, 'km', 'TOTAL_EVENT', 'hiking'), req('q2', 'elevationGain', 30000, 'm', 'TOTAL_EVENT'), req('q4', 'packWeight', 12, 'kg', 'SINGLE_EVENT')] as TrainingGoal['requirements'],
  });
  // Op zaterdag past een tweede training (een dagbudget).
  const config = await GoalEngineConfigRepo.get();
  await GoalEngineConfigRepo.set({ ...config, availability: { ...config.availability, dailyTimeBudget: { sat: { preferredMinutes: 240, softFlexMinutes: 30 } } } });
  await open('stand');
  await open('stand-2');
}

// De Wandeldag uit de melding: naast de training die al op zaterdag staat.
async function wandeldagNextToSaturday(): Promise<PlanChangeItem> {
  const now = live(await PlannedSessionsRepo.getAll(), SATURDAY);
  return {
    action: 'add', newSessionDraft: { templateId: 'tpl_hike_day_one', scheduledDate: SATURDAY, weekStartDate: mondayOfWeek(SATURDAY) },
    reason: 'Weekprescriptie: Wandeldag 1 van 2 toegevoegd volgens de berekende weekprescriptie.', generatedBy: ['engine/weeklyPrescriptionEngine.ts#computeWeeklyPrescriptionPlan'], coPlacedWithSessionIds: now.map((s) => s.id),
  };
}
async function nothingForThreeOpenings(prefix: string) {
  for (const build of [1, 2, 3]) expect((await open(`${prefix}-${build}`)).weekly.kind).toBe('unchanged');
  expect(live(await PlannedSessionsRepo.getAll(), SATURDAY).some((s) => s.templateId === 'tpl_hike_day_one')).toBe(false);
  expect(await weeklyLog()).toHaveLength(0);
}

describe('een voorstel van het weekvoorschrift dat niet kan landen komt niet, ook niet bij elke opening', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    await stand('2026-11-12T08:00:00');
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // Wat de back-up van de eigenaar liet zien (nagemaakt, datums verschoven): een Wandeldag naast een al geplande
  // Duurloop met versnellingen op zaterdag, in een week waar elke dag een training staat. De ronde laat hem niet
  // staan (de fase van die week wil geen wandeldag), dus het voorschrift stelt hem niet voor: geen melding, geen regel.
  it('een Wandeldag naast de Duurloop met versnellingen op zaterdag: drie openingen, geen voorstel en geen regel', async () => {
    const saturday = live(await PlannedSessionsRepo.getAll(), SATURDAY)[0];
    await PlannedSessionsRepo.put({ ...saturday, templateId: 'tpl_strides_run' });
    await open('stand-3');
    wanted.changes = [await wandeldagNextToSaturday()];
    await nothingForThreeOpenings('opening');
  });

  it('met Altijd eerst vragen wordt hij ook niet gevraagd', async () => {
    await SettingsRepo.set({ changeApplyMode: 'always_ask' });
    wanted.changes = [await wandeldagNextToSaturday()];
    await nothingForThreeOpenings('vragen');
  });

  it('een rij die je zelf vastzette op die zaterdag blijft van jou', async () => {
    const saturday = live(await PlannedSessionsRepo.getAll(), SATURDAY)[0];
    await PlannedSessionsRepo.put({ ...saturday, lock: { by: 'user', at: '2026-11-12T08:00:00.000Z' } });
    await open('stand-3');
    wanted.changes = [await wandeldagNextToSaturday()];
    await nothingForThreeOpenings('slot');
    const after = (await PlannedSessionsRepo.getAll()).find((s) => s.id === saturday.id)!;
    expect(after).toMatchObject({ templateId: saturday.templateId, scheduledDate: SATURDAY, lock: { by: 'user' } });
  });

  it('een training die de ronde wel laat staan komt één keer, met een regel in het logboek', async () => {
    wanted.changes = [add(SATURDAY)];
    expect((await open('opening-1')).weekly.kind).toBe('applied');
    expect(live(await PlannedSessionsRepo.getAll(), SATURDAY).map((s) => s.templateId)).toContain('tpl_recovery_run');
    // Het echte voorschrift mist hem daarna niet meer en stelt niets voor.
    wanted.changes = [];
    expect((await open('opening-2')).weekly.kind).toBe('unchanged');
    expect(await weeklyLog()).toHaveLength(1);
  });

  it('een vakantie of tocht op die dag: het voorstel komt niet', async () => {
    for (const kind of ['no_training', 'trek'] as const) {
      await SettingsRepo.set({ leavePeriods: [{ id: 'lv_nagemaakt', kind, startDate: SATURDAY, endDate: SATURDAY }] });
      wanted.changes = [add(SATURDAY)];
      expect((await open(`opening-${kind}`)).weekly.kind).toBe('unchanged');
    }
    expect(await weeklyLog()).toHaveLength(0);
  });

  // De echte ronde leest het logboek: een testloop die het voorschrift weghaalde komt terug
  // (engine/raceBlock.ts#revivePrescriptionRemovedTests). De proefronde rekent daarom met het voorstel er al in.
  it('een testloop die het voorschrift zou weghalen komt terug: de weghaling en haar vervanger vallen weg', async () => {
    // Een testloop die de planning zelf neerzette, ver genoeg vooruit.
    const planned = await PlannedSessionsRepo.getAll();
    const test = planned.filter((s) => s.templateId === 'tpl_test_run' && s.status === 'planned' && !s.lock && s.scheduledDate >= '2026-11-26').sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
    expect(test).toBeDefined();
    const source = ['engine/weeklyPrescriptionEngine.ts#computeWeeklyPrescriptionPlan'];
    const remove: PlanChangeItem = { action: 'remove', plannedSessionId: test.id, fromDate: test.scheduledDate, toDate: test.scheduledDate, reason: 'nagemaakt', generatedBy: source };
    const swapIn = add(test.scheduledDate, { replacesSessionId: test.id, generatedBy: source });
    const proposal: PlanChangeProposal = { id: 'p_nagemaakt', trigger: 'weekly_prescription_computed', issue: 'Weekplan bijgewerkt', changes: [remove, swapIn], alternatives: [], consequences: '', explanation: '', createdAt: '2026-11-12T08:00:00.000Z' };
    // Zonder het voorstel in het logboek ziet de proefronde de test niet terugkomen.
    expect(await keptByPlanningRound([remove, swapIn], planned)).toContainEqual(remove);
    // Met het voorstel erin wel: de test staat er weer, dus geen weghaling en geen training in haar plaats.
    expect(await keptByPlanningRound([remove, swapIn], planned, proposal)).toEqual([]);
  });
});

describe('grenzen in Europe/Amsterdam', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('middernacht op een week- en maandgrens: ook de opening na twaalven stelt niets voor', async () => {
    // Zondag 29 november 2026, vlak voor middernacht; daarna maandag 30 november en dinsdag 1 december.
    await stand('2026-11-29T23:50:00');
    wanted.changes = [await wandeldagNextToSaturday()];
    expect((await open('voor-middernacht')).weekly.kind).toBe('unchanged');
    vi.setSystemTime(new Date('2026-11-30T00:10:00'));
    expect((await open('na-middernacht')).weekly.kind).toBe('unchanged');
    vi.setSystemTime(new Date('2026-12-01T00:10:00'));
    expect((await open('nieuwe-maand')).weekly.kind).toBe('unchanged');
    expect(await weeklyLog()).toHaveLength(0);
  });

  it('de dag zelf: een toevoeging op vandaag of in deze week komt niet vanzelf, die wordt eerst gevraagd', async () => {
    await stand('2026-11-12T08:00:00');
    wanted.changes = [add('2026-11-12')];
    const today = (await open('vandaag')).weekly;
    expect(today.kind).toBe('ask');
    expect(await weeklyLog()).toHaveLength(0);
    expect(live(await PlannedSessionsRepo.getAll(), '2026-11-12').some((s) => s.templateId === 'tpl_recovery_run')).toBe(false);
  });
});
