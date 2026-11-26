// De rustdag schuift mee (I-162), in de opslag: jouw sleep blijft staan, Liever niet schrijft niets, Akkoord zet alleen
// de rustdag op de vrijgekomen dag, en Ongedaan maken zet hem terug zonder je sleep aan te raken. De rijen worden
// geschreven zoals state/moveActions.ts#applyProposal een gewone verplaatsing schrijft. Testdata is nagemaakt.
import { beforeEach, describe, expect, it } from 'vitest';
import { wipeAllData, seedIfEmpty, PlannedSessionsRepo, SessionTemplatesRepo } from './database';
import { snapshotWritten, undoPlanChangeNow } from './undoPlanChange';
import { restDayFollowAfterMove } from '../engine/restDayFollows';
import type { ScheduleProposal } from '../engine/scheduler';
import type { PlannedSession } from '../models/training';
import type { RecentPlanChange } from '../models/planChange';

const MON = '2026-11-23';
const TUE = '2026-11-24';
const THU = '2026-11-26';
const lock = { by: 'user' as const, at: '2026-11-23T08:00:00.000Z' };
const row = (id: string, templateId: string, scheduledDate: string): PlannedSession => ({ id, templateId, scheduledDate, weekStartDate: MON, status: 'planned', order: 0 });

// Zoals applyProposal een verplaatsing naar een nieuwe dag schrijft, met de melding voor Ongedaan maken.
async function apply(p: ScheduleProposal): Promise<RecentPlanChange> {
  const stored = await PlannedSessionsRepo.getAll();
  const before: PlannedSession[] = [];
  for (const c of p.changes) {
    const s = stored.find((x) => x.id === c.sessionId)!;
    before.push(s);
    await PlannedSessionsRepo.put({ ...s, scheduledDate: c.toDate, status: 'moved', movedFromDate: s.movedFromDate ?? c.fromDate, lock });
  }
  return { id: 'usermove-1', trigger: 'session_moved', title: 'Verplaatst', lines: [], why: '', before, addedIds: [], written: await snapshotWritten(before, []), createdAt: lock.at };
}

const rows = async () => Object.fromEntries((await PlannedSessionsRepo.getAll()).filter((s) => ['rest', 'easy', 'upper'].includes(s.id)).map((s) => [s.id, s.scheduledDate]));

describe('rustdag schuift mee in de opslag', () => {
  const sleep: ScheduleProposal = { changes: [{ sessionId: 'easy', templateId: 'tpl_easy_run', templateName: 'Rustige duurloop', fromDate: THU, toDate: TUE }], reason: '', resolved: true };

  beforeEach(async () => {
    await wipeAllData();
    await seedIfEmpty({ withProgram: false });
    for (const s of [row('upper', 'tpl_upper_a', MON), row('rest', 'tpl_herstel', TUE), row('easy', 'tpl_easy_run', THU)]) await PlannedSessionsRepo.put(s);
  });

  async function followAfterSleep(): Promise<ScheduleProposal> {
    const templateById = new Map((await SessionTemplatesRepo.getAll()).map((t) => [t.id, t]));
    const sessions = await PlannedSessionsRepo.getAll();
    await apply(sleep);
    return restDayFollowAfterMove(sleep, { sessions, templateById, logs: [], today: MON, restTitle: 'Rustdag' })!;
  }

  it('Liever niet: alles blijft zoals jij sleepte', async () => {
    const follow = await followAfterSleep();
    expect(follow.changes).toHaveLength(1);
    // Liever niet schrijft niets.
    expect(await rows()).toEqual({ upper: MON, rest: TUE, easy: TUE });
  });

  it('Akkoord zet de rustdag op do, Ongedaan maken zet hem terug op di; je sleep blijft staan', async () => {
    const follow = await followAfterSleep();
    const change = await apply(follow);
    expect(await rows()).toEqual({ upper: MON, rest: THU, easy: TUE });
    await undoPlanChangeNow(change);
    expect(await rows()).toEqual({ upper: MON, rest: TUE, easy: TUE });
    const rest = (await PlannedSessionsRepo.getAll()).find((s) => s.id === 'rest');
    expect(rest).toEqual(row('rest', 'tpl_herstel', TUE));
  });
});
