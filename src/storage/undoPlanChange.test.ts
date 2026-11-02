// Ongedaan maken uit de melding zet alleen terug wat nog precies is zoals de wijziging het schreef en niet gelogd
// is; anders verandert er niets, ook niet aan de instelling erachter. Testdata is nagemaakt.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { wipeAllData, seedIfEmpty, syncProgramHorizon, PlannedSessionsRepo, SessionLogsRepo, SessionTemplatesRepo, SettingsRepo, PlanChangeProposalsRepo, TrainingGoalsRepo } from './database';
import { runBootMigrations } from './bootMigrations';
import { applyHorizonPlanNow, computeHorizonPlan, type HorizonChangeInput } from './horizonPlan';
import { buildFirstPlan, defaultAnswers } from '../engine/firstPlan';
import { refreshWritten } from '../engine/undoGuard';
import { PLAN_UNDO_PLANNED, PLAN_UNDO_STALE, snapshotWritten, undoPlanChangeNow } from './undoPlanChange';
import { writeCatchUp } from './catchUpApply';
import type { PlannedSession, SessionLog } from '../models/training';
import type { RecentPlanChange } from '../models/planChange';
import type { TrainingGoal } from '../models/goals';

const lock = { by: 'user' as const, at: '2026-10-29T08:00:00.000Z' };
const run: PlannedSession = { id: 'p-run', templateId: 'tpl_easy_run', scheduledDate: '2026-10-30', weekStartDate: '2026-10-26', status: 'planned', order: 1 };
const moved: PlannedSession = { ...run, scheduledDate: '2026-10-31', status: 'moved', movedFromDate: '2026-10-30', lock };

const logOf = (plannedSessionId: string, id = 'log-1'): SessionLog => ({
  id, plannedSessionId, templateId: 'tpl_easy_run', type: 'run', variant: 'full', completedDate: '2026-10-31', completedAt: '2026-10-31T08:00:00.000Z', source: 'manual', durationMinutes: 40,
} as unknown as SessionLog);

const notice = (over: Partial<RecentPlanChange>): RecentPlanChange => ({
  id: 'usermove-1', trigger: 'session_moved', title: 'Duurloop verplaatst', lines: ['Duurloop: vr 30 → za 31'], why: '', before: [run], addedIds: [], createdAt: '2026-10-29T08:00:00.000Z', ...over,
});

async function moveRun(): Promise<RecentPlanChange> {
  await PlannedSessionsRepo.put(moved);
  return notice({ written: await snapshotWritten([run], []) });
}

const rowOf = async (id: string) => (await PlannedSessionsRepo.getAll()).find((s) => s.id === id);
const undoLogged = async () => (await PlanChangeProposalsRepo.getAll()).filter((p) => p.revertsProposalId).length;

describe('ongedaan maken uit de melding', () => {
  beforeEach(async () => {
    await wipeAllData();
    await seedIfEmpty({ withProgram: false });
    await PlannedSessionsRepo.put(run);
  });

  it('verplaatst en meteen terug: de training staat weer op zijn dag, en het ongedaan maken staat in het wijzigingslog', async () => {
    await undoPlanChangeNow(await moveRun());
    expect(await rowOf(run.id)).toEqual(run);
    expect(await undoLogged()).toBe(1);
  });

  it('intussen gelogd: niets terug, en een melding dat het niet meer kan', async () => {
    const change = await moveRun();
    await SessionLogsRepo.put(logOf(run.id));
    await expect(undoPlanChangeNow(change)).rejects.toThrow(PLAN_UNDO_STALE);
    expect(PLAN_UNDO_STALE).toContain('Ongedaan maken kan niet meer');
    expect(await rowOf(run.id)).toEqual(moved);
    expect(await undoLogged()).toBe(0);
  });

  it('intussen opnieuw verplaatst: niets terug', async () => {
    const change = await moveRun();
    const again = { ...moved, scheduledDate: '2026-11-01', lock: { by: 'user' as const, at: '2026-10-30T08:00:00.000Z' } };
    await PlannedSessionsRepo.put(again);
    await expect(undoPlanChangeNow(change)).rejects.toThrow(PLAN_UNDO_STALE);
    expect(await rowOf(run.id)).toEqual(again);
  });

  it('intussen weggehaald door de planning: niets terug, met de zin dat de planning verder ging', async () => {
    const change = await moveRun();
    await PlannedSessionsRepo.delete(run.id);
    await expect(undoPlanChangeNow(change)).rejects.toThrow(PLAN_UNDO_PLANNED);
    expect(await rowOf(run.id)).toBeUndefined();
  });

  it('overgeslagen (Niet gedaan?) en daarna toch gelogd: blijft overgeslagen', async () => {
    const skipped: PlannedSession = { ...run, status: 'skipped', lock };
    await PlannedSessionsRepo.put(skipped);
    const change = notice({ trigger: 'session_skipped', title: 'Duurloop overgeslagen', written: await snapshotWritten([run], []) });
    await SessionLogsRepo.put(logOf(run.id));
    await expect(undoPlanChangeNow(change)).rejects.toThrow(PLAN_UNDO_STALE);
    expect(await rowOf(run.id)).toEqual(skipped);
  });

  it('inhalen: de nieuwe rij intussen gelogd, dan blijven beide staan', async () => {
    const added = await writeCatchUp(run, '2026-11-02', lock, 'p-ingehaald');
    const oldNow = await rowOf(run.id);
    const change = notice({ title: 'Duurloop ingehaald', addedIds: [added.id], written: await snapshotWritten([run], [added.id]) });
    await SessionLogsRepo.put(logOf(added.id));
    await expect(undoPlanChangeNow(change)).rejects.toThrow(PLAN_UNDO_STALE);
    expect(await rowOf(run.id)).toEqual(oldNow);
    expect(await rowOf(added.id)).toBeDefined();
  });

  it('inhalen en meteen terug: de oude rij terug, de nieuwe weg', async () => {
    const added = await writeCatchUp(run, '2026-11-02', lock, 'p-ingehaald');
    await undoPlanChangeNow(notice({ addedIds: [added.id], written: await snapshotWritten([run], [added.id]) }));
    expect(await rowOf(run.id)).toEqual(run);
    expect(await rowOf(added.id)).toBeUndefined();
  });

  it('een voorstel met een instelling en een doel: lukt het niet, dan blijven ook de instelling en het doel zoals ze zijn', async () => {
    await SettingsRepo.set({ restDay: 3 });
    const goal = { id: 'goal-x', name: 'Nagemaakt doel', status: 'active', targetDate: '2027-06-01' } as unknown as TrainingGoal;
    await TrainingGoalsRepo.put({ ...goal, targetDate: '2027-07-01' });
    const change = await moveRun();
    await SessionLogsRepo.put(logOf(run.id));
    await expect(undoPlanChangeNow({ ...change, trigger: 'goal_changed', settingsBefore: { restDay: 1 }, goalsBefore: [goal] } as RecentPlanChange)).rejects.toThrow(PLAN_UNDO_STALE);
    expect((await SettingsRepo.get()).restDay).toBe(3);
    expect((await TrainingGoalsRepo.getAll()).find((g) => g.id === goal.id)?.targetDate).toBe('2027-07-01');
  });

  it('een voorstel met een instelling en een doel: lukt het wel, dan gaat alles samen terug', async () => {
    await SettingsRepo.set({ restDay: 3 });
    const goal = { id: 'goal-x', name: 'Nagemaakt doel', status: 'active', targetDate: '2027-06-01' } as unknown as TrainingGoal;
    await TrainingGoalsRepo.put({ ...goal, targetDate: '2027-07-01' });
    const change = await moveRun();
    const out = await undoPlanChangeNow({ ...change, trigger: 'goal_changed', settingsBefore: { restDay: 1 }, goalsBefore: [goal] } as RecentPlanChange);
    expect(out.settings?.restDay).toBe(1);
    expect((await SettingsRepo.get()).restDay).toBe(1);
    expect((await TrainingGoalsRepo.getAll()).find((g) => g.id === goal.id)?.targetDate).toBe('2027-06-01');
    expect(await rowOf(run.id)).toEqual(run);
  });

  it('een log die de wijziging zelf koppelde houdt het ongedaan maken niet tegen', async () => {
    const change = await moveRun();
    await SessionLogsRepo.put(logOf(run.id, 'log-gekoppeld'));
    await undoPlanChangeNow({ ...change, linkedLogIds: ['log-gekoppeld'] });
    expect(await rowOf(run.id)).toEqual(run);
  });

  it('alleen een instelling (geen rijen): gaat altijd terug', async () => {
    await SettingsRepo.set({ restDay: 4 });
    const out = await undoPlanChangeNow(notice({ before: [], addedIds: [], written: [], settingsBefore: { restDay: 2 } }));
    expect(out.settings?.restDay).toBe(2);
  });
});

describe('een melding zonder rijen waar de weekcontrole iets bij zette', () => {
  beforeEach(async () => {
    await wipeAllData();
    await seedIfEmpty({ withProgram: false });
    await PlannedSessionsRepo.put(run);
  });

  it('jij verandert die rij daarna: niet blind terug', async () => {
    // Koppelen of een notitie: een melding zonder rijen (written: []). De weekcontrole schuift daarna de duurloop
    // en dat komt bij dezelfde melding.
    const checked: PlannedSession = { ...run, scheduledDate: '2026-10-31' };
    await PlannedSessionsRepo.put(checked);
    const written = refreshWritten([], [run.id], new Map([[run.id, checked]]));
    const change = notice({ before: [run], written });
    // Daarna verplaats jij hem zelf.
    const yours: PlannedSession = { ...checked, scheduledDate: '2026-11-01', status: 'moved', movedFromDate: '2026-10-31', lock: { by: 'user', at: '2026-10-30T08:00:00.000Z' } };
    await PlannedSessionsRepo.put(yours);
    await expect(undoPlanChangeNow(change)).rejects.toThrow(PLAN_UNDO_STALE);
    expect(await rowOf(run.id)).toEqual(yours);
  });

  it('een log die de melding koppelde gaat in dezelfde transactie los', async () => {
    await SessionLogsRepo.put({ ...logOf(run.id, 'log-later'), linkedLater: { at: '2026-10-30T08:00:00.000Z' } });
    await undoPlanChangeNow(notice({ before: [], addedIds: [], written: [], linkedLogIds: ['log-later'] }));
    const log = (await SessionLogsRepo.getAll()).find((l) => l.id === 'log-later');
    expect(log?.plannedSessionId).toBeUndefined();
    expect(log?.linkedLater).toBeUndefined();
  });
});

describe('de planning gaat verder na je wijziging (wedstrijdblok)', () => {
  const TODAY = '2026-10-26';
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    await wipeAllData();
    await runBootMigrations({ build: 'test-ongedaan' });
    // Nagemaakte startantwoorden: een 10 km in maart, vijf dagen per week.
    const setup = buildFirstPlan({ ...defaultAnswers('race'), race: '10k', goalDate: '2027-03-13', daysPerWeek: 5 }, await SessionTemplatesRepo.getAll(), TODAY, `${TODAY}T08:00:00.000Z`);
    const { marathonRaceType, marathonTargetDate, ...rest } = setup.settings;
    const input: HorizonChangeInput = {
      title: setup.title, why: 'Plan.', explanation: 'Plan.', trigger: 'goal_created', program: setup.program, goals: setup.goals,
      settings: { ...rest, ...(marathonRaceType ? { marathonRaceType, marathonTargetDate } : {}) },
      firstPlan: { milestones: setup.milestones, strategy: setup.strategy, allowedDays: setup.allowedDays, restDay: setup.settings.restDay },
    };
    expect((await applyHorizonPlanNow(await computeHorizonPlan(input))).status).toBe('applied');
    await syncProgramHorizon();
  });
  afterEach(() => vi.useRealTimers());

  it('de sync zegt welke rijen hij schreef; met die rijen opnieuw gelezen gaat een terechte undo gewoon door', async () => {
    // Een beendag die het wedstrijdblok verschoof (op datum gekozen), en zijn week: daar zet het blok ook de rustige
    // loop met versnellingen.
    const all = await PlannedSessionsRepo.getAll();
    const lead = all.filter((s) => s.raceBlock?.pair === s.id).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
    if (!lead) throw new Error('verwacht een beendag van het wedstrijdblok');
    const pair = all.filter((s) => s.weekStartDate === lead.weekStartDate);
    // Een wijziging schrijft de beendag zonder het merkteken van het wedstrijdblok.
    const { raceBlock: _gone, ...bare } = lead;
    void _gone;
    await PlannedSessionsRepo.put(bare as PlannedSession);
    const change = notice({ before: pair, written: await snapshotWritten(pair, []) });
    // De planning loopt erna en schrijft in die week opnieuw.
    const sync = await syncProgramHorizon();
    const ids = pair.map((s) => s.id).filter((id) => sync.touchedIds?.includes(id));
    expect(ids.length).toBeGreaterThan(0);
    // Zonder opnieuw lezen: geweigerd, met de zin dat de planning verder ging (niet dat jij iets deed).
    await expect(undoPlanChangeNow(change)).rejects.toThrow(PLAN_UNDO_PLANNED);
    // Opnieuw gelezen zoals AppDataProvider na elke sync doet: gaat door, en de week staat zoals hij was.
    const fresh = { ...change, written: refreshWritten(change.written, ids, new Map((await snapshotWritten([], ids)).map((s) => [s.id, s]))) };
    await undoPlanChangeNow(fresh);
    for (const s of pair) expect(await rowOf(s.id)).toEqual(s);
  }, 60000);
});
