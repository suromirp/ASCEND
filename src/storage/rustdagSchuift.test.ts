// De rustdag schuift mee (I-162), in de opslag: jouw sleep blijft staan, Liever niet schrijft niets, Akkoord zet alleen
// de rustdag op de vrijgekomen dag, en Ongedaan maken zet hem terug zonder je sleep aan te raken. De rijen worden
// geschreven door de echte `applyProposal` van state/moveActions.ts (useCallback geeft hier de functie zelf terug,
// zodat hij zonder scherm draait). Testdata is nagemaakt.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react', async (orig) => ({ ...(await orig<typeof import('react')>()), useCallback: <T,>(fn: T) => fn }));
vi.mock('../utils/flipDom', () => ({ armFlip: () => undefined, disarmFlip: () => undefined }));

import { wipeAllData, seedIfEmpty, PlannedSessionsRepo, SessionTemplatesRepo } from './database';
import { undoPlanChangeNow } from './undoPlanChange';
import { useMoveActions } from '../state/moveActions';
import { restDayFollowAfterMove, withRestDayFollow } from '../engine/restDayFollows';
import type { ScheduleProposal } from '../engine/scheduler';
import type { PlannedSession } from '../models/training';
import type { RecentPlanChange } from '../models/planChange';
import type { GoalEngineConfig } from '../models/goalEngineConfig';
import type { AppSettings } from './database';

const MON = '2026-11-23';
const TUE = '2026-11-24';
const THU = '2026-11-26';
const row = (id: string, templateId: string, scheduledDate: string): PlannedSession => ({ id, templateId, scheduledDate, weekStartDate: MON, status: 'planned', order: 0 });

// De echte applyProposal; de melding voor Ongedaan maken komt uit setRecentChange.
// Zonder scherm: een hook die alleen useCallback gebruikt, en dat geeft hier de functie zelf terug.
const moveActionsOf: typeof useMoveActions = useMoveActions;
async function apply(p: ScheduleProposal): Promise<RecentPlanChange> {
  let change: RecentPlanChange | null = null;
  const actions = moveActionsOf({
    program: null, plannedSessions: [], sessionLogs: [], trainingGoals: [], goalMilestones: [],
    goalEngineConfig: {} as GoalEngineConfig, settings: {} as AppSettings, templates: [],
    setRecentChange: (v) => { change = typeof v === 'function' ? v(change) : v; },
    refresh: async () => undefined, sessionsForWeek: () => [],
  });
  await actions.applyProposal(p);
  if (!change) throw new Error('applyProposal schreef geen melding');
  return change;
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

  it('één blad: sleep en rustdag samen in één Akkoord, en Ongedaan maken zet allebei terug (I-163)', async () => {
    const templateById = new Map((await SessionTemplatesRepo.getAll()).map((t) => [t.id, t]));
    const sessions = await PlannedSessionsRepo.getAll();
    const follow = restDayFollowAfterMove(sleep, { sessions, templateById, logs: [], today: MON, restTitle: 'Rustdag' })!;
    const merged = withRestDayFollow(sleep, follow);
    expect(merged.changes.map((c) => c.sessionId)).toEqual(['easy', 'rest']);
    expect(merged.reason).toContain('Rustige duurloop staat nu op je rustdag.');
    // Liever niet schrijft niets: er is geen eerste stap die al staat.
    expect(await rows()).toEqual({ upper: MON, rest: TUE, easy: THU });
    const change = await apply(merged);
    expect(await rows()).toEqual({ upper: MON, rest: THU, easy: TUE });
    // Eén melding met Ongedaan maken voor jouw sleep en de rustdag.
    await undoPlanChangeNow(change);
    expect(await rows()).toEqual({ upper: MON, rest: TUE, easy: THU });
  });
});
