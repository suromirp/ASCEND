// Ongedaan maken uit de melding zet alleen terug wat nog precies is zoals de wijziging het schreef en niet gelogd
// is; anders verandert er niets, ook niet aan de instelling erachter. Testdata is nagemaakt.
import { describe, it, expect, beforeEach } from 'vitest';
import { wipeAllData, seedIfEmpty, PlannedSessionsRepo, SessionLogsRepo, SettingsRepo, PlanChangeProposalsRepo, TrainingGoalsRepo } from './database';
import { PLAN_UNDO_STALE, snapshotWritten, undoPlanChangeNow } from './undoPlanChange';
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
    const again = { ...moved, scheduledDate: '2026-11-01' };
    await PlannedSessionsRepo.put(again);
    await expect(undoPlanChangeNow(change)).rejects.toThrow(PLAN_UNDO_STALE);
    expect(await rowOf(run.id)).toEqual(again);
  });

  it('intussen weggehaald: niets terug', async () => {
    const change = await moveRun();
    await PlannedSessionsRepo.delete(run.id);
    await expect(undoPlanChangeNow(change)).rejects.toThrow(PLAN_UNDO_STALE);
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
