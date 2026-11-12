// Naspeeltest (melding van 12 november): op één dag kwam twaalf keer een aangenomen voorstel van het weekvoorschrift
// binnen dat "Wandeldag 1 van 2" toevoegt op een zaterdag zestien weken vooruit, terwijl er daarna op die dag geen
// wandeldag stond. Het voorstel landde niet en kwam bij elke opening terug.
//
// Hier nagebootst met alleen nagemaakte gegevens (het demoprogramma, een wedstrijd eind maart 2027, de GR5 in
// augustus 2027): het voorschrift wil bij elke opening dezelfde training op dezelfde dag, en na elke opening is die
// rij weer van de planning (wie hem weghaalt maakt niet uit: de ronde, een periode of jij).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// De grenzen hieronder zijn die van de eigenaar: middernacht in Nederland, ook als de omgeving in UTC draait.
vi.stubEnv('TZ', 'Europe/Amsterdam');
import { runBootMigrations } from './bootMigrations';
import { runWeeklyPrescriptionStep } from './weeklyPrescriptionStep';
import { wipeAllData, syncProgramHorizon, SettingsRepo, TrainingGoalsRepo, PlannedSessionsRepo, PlanChangeProposalsRepo, GoalEngineConfigRepo } from './database';
import { primePlanningRegisters } from '../state/planningSync';
import { mondayOfWeek } from '../utils/dates';
import type { PlannedSession } from '../models/training';
import type { TrainingGoal } from '../models/goals';
import type { PlanChangeItem } from '../models/planChange';
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

describe('een aangenomen voorstel van het weekvoorschrift komt niet bij elke opening terug', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    await stand('2026-11-12T08:00:00');
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // Drie openingen; na elke opening is de toegevoegde rij weer weg, zoals bij de melding.
  async function threeOpenings(day: string) {
    const kinds: string[] = [];
    for (const build of ['opening-1', 'opening-2', 'opening-3']) {
      kinds.push((await open(build)).weekly.kind);
      for (const s of live(await PlannedSessionsRepo.getAll(), day).filter((x) => x.templateId === 'tpl_recovery_run')) await PlannedSessionsRepo.delete(s.id);
    }
    return kinds;
  }

  it('landt het niet, dan komt het één keer en daarna niet meer: één regel in het logboek, niet drie', async () => {
    const day = SATURDAY;
    wanted.changes = [add(day)];
    expect(await threeOpenings(day)).toEqual(['applied', 'unchanged', 'unchanged']);
    expect(await weeklyLog()).toHaveLength(1);
  });

  it('opnieuw openen na Akkoord (altijd eerst vragen): het aangenomen voorstel wordt geen tweede keer gevraagd', async () => {
    await SettingsRepo.set({ changeApplyMode: 'always_ask' });
    const day = SATURDAY;
    wanted.changes = [add(day)];
    const first = (await open('opening-1')).weekly;
    expect(first.kind).toBe('ask');
    if (first.kind !== 'ask') return;
    // Akkoord: het voorstel komt aangenomen in het logboek; de rij verdwijnt daarna weer.
    await PlanChangeProposalsRepo.put({ ...first.proposal, resolvedAt: new Date().toISOString(), resolution: 'accepted' });
    expect((await open('opening-2')).weekly.kind).toBe('unchanged');
    expect((await open('opening-3')).weekly.kind).toBe('unchanged');
  });

  it('blijft de training staan, dan is er na de eerste opening niets meer te melden', async () => {
    const day = SATURDAY;
    wanted.changes = [add(day)];
    expect((await open('opening-1')).weekly.kind).toBe('applied');
    expect(live(await PlannedSessionsRepo.getAll(), day).map((s) => s.templateId)).toContain('tpl_recovery_run');
    // Het voorschrift wil hem bij de volgende opening nog steeds, en hij staat er: geen tweede rij, geen tweede regel.
    expect((await open('opening-2')).weekly.kind).toBe('unchanged');
    expect(live(await PlannedSessionsRepo.getAll(), day).filter((s) => s.templateId === 'tpl_recovery_run')).toHaveLength(1);
    expect(await weeklyLog()).toHaveLength(1);
  });

  it('na Ongedaan maken zet de volgende opening niet terug wat je net weghaalde', async () => {
    const day = SATURDAY;
    wanted.changes = [add(day)];
    const first = (await open('opening-1')).weekly;
    expect(first.kind).toBe('applied');
    if (first.kind !== 'applied') return;
    // Ongedaan maken: de rij gaat weg en het logboek krijgt een regel die naar het voorstel verwijst.
    for (const s of live(await PlannedSessionsRepo.getAll(), day).filter((x) => x.templateId === 'tpl_recovery_run')) await PlannedSessionsRepo.delete(s.id);
    await PlanChangeProposalsRepo.put({ id: 'undo_nagemaakt', trigger: 'session_moved', issue: 'Ongedaan gemaakt', changes: [], alternatives: [], consequences: '', explanation: '', createdAt: new Date().toISOString(), resolvedAt: new Date().toISOString(), resolution: 'accepted', revertsProposalId: first.proposal.id });
    expect((await open('opening-2')).weekly.kind).toBe('unchanged');
    expect(live(await PlannedSessionsRepo.getAll(), day).some((s) => s.templateId === 'tpl_recovery_run')).toBe(false);
  });

  it('na vier weken mag het voorschrift het een keer opnieuw proberen, met de gewone melding', async () => {
    const day = SATURDAY;
    wanted.changes = [add(day)];
    expect(await threeOpenings(day)).toEqual(['applied', 'unchanged', 'unchanged']);
    vi.setSystemTime(new Date('2026-12-11T08:00:00'));
    expect(await threeOpenings(day)).toEqual(['applied', 'unchanged', 'unchanged']);
    expect(await weeklyLog()).toHaveLength(2);
  });

  it('een vakantie of tocht op die dag: het voorstel komt niet, ook niet één keer', async () => {
    const day = SATURDAY;
    for (const kind of ['no_training', 'trek'] as const) {
      await SettingsRepo.set({ leavePeriods: [{ id: 'lv_nagemaakt', kind, startDate: day, endDate: day }] });
      wanted.changes = [add(day)];
      expect((await open(`opening-${kind}`)).weekly.kind).toBe('unchanged');
    }
    expect(await weeklyLog()).toHaveLength(0);
  });

  it('een rij die je zelf vastzette en die het voorschrift zou vervangen: valt de toevoeging weg, dan blijft jouw rij', async () => {
    const planned = await PlannedSessionsRepo.getAll();
    const saturday = live(planned, '2027-03-06')[0];
    await PlannedSessionsRepo.put({ ...saturday, lock: { by: 'user', at: '2026-11-12T08:00:00.000Z' } });
    const remove: PlanChangeItem = { action: 'remove', plannedSessionId: saturday.id, fromDate: '2027-03-06', toDate: '2027-03-06', reason: 'nagemaakt', generatedBy: ['engine/weeklyPrescriptionEngine.ts'] };
    // Een eerder aangenomen voorstel met dezelfde toevoeging staat al in het logboek.
    const swapIn = add('2027-03-06', { replacesSessionId: saturday.id });
    await PlanChangeProposalsRepo.put({ id: 'p_nagemaakt', trigger: 'weekly_prescription_computed', issue: 'Weekplan bijgewerkt', changes: [remove, swapIn], alternatives: [], consequences: '', explanation: '', createdAt: '2026-11-11T08:00:00.000Z', resolvedAt: '2026-11-11T08:00:00.000Z', resolution: 'accepted' });
    wanted.changes = [remove, swapIn];
    expect((await open('opening-1')).weekly.kind).toBe('unchanged');
    const after = (await PlannedSessionsRepo.getAll()).find((s) => s.id === saturday.id)!;
    expect(after.status).not.toBe('skipped');
    expect(after.lock?.by).toBe('user');
  });
});

describe('grenzen in Europe/Amsterdam', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('middernacht op een week- en maandgrens: de opening na twaalven vraagt niet opnieuw wat ervoor is aangenomen', async () => {
    // Zondag 29 november 2026, vlak voor middernacht; daarna maandag 30 november en dinsdag 1 december.
    await stand('2026-11-29T23:50:00');
    const day = SATURDAY;
    wanted.changes = [add(day)];
    expect((await open('voor-middernacht')).weekly.kind).toBe('applied');
    for (const s of live(await PlannedSessionsRepo.getAll(), day).filter((x) => x.templateId === 'tpl_recovery_run')) await PlannedSessionsRepo.delete(s.id);
    vi.setSystemTime(new Date('2026-11-30T00:10:00'));
    expect((await open('na-middernacht')).weekly.kind).toBe('unchanged');
    vi.setSystemTime(new Date('2026-12-01T00:10:00'));
    expect((await open('nieuwe-maand')).weekly.kind).toBe('unchanged');
    expect(await weeklyLog()).toHaveLength(1);
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
