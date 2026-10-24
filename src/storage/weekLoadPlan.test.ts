// Doortrainen, de rustweek terugzetten, deze week nog een keer en de herhaling
// terugzetten gaan via het voorstel met Akkoord, op nagemaakte gegevens
// (docs/beslissingen/2026-10-24-rustweek-via-voorstel.md).
//
// Voor Akkoord verandert er niets. Na Akkoord krijg je wat het voorstel liet
// zien, verandert een gedane of voorbije training niet, houdt wat je zelf
// vastzette zijn lengte en vindt de planningsronde erna niets meer te doen.
// Ongedaan maken zet ook het programma terug.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import {
  wipeAllData, seedIfEmpty, syncProgramHorizon, PlannedSessionsRepo, ProgramsRepo, SessionLogsRepo, SessionTemplatesRepo, TrainingGoalsRepo,
} from './database';
import { applyHorizonPlanNow, computeHorizonPlan, type HorizonApplyResult, type HorizonPlan } from './horizonPlan';
import { undoPlanChangeNow } from './undoPlanChange';
import { weekLoadInput } from './weekLoadPlan';
import { buildBackupEnvelope, normalizeBackupToCurrentModel } from './backup';
import { isRestWeekAt } from '../engine/weekLoadChange';
import { resolveVariantDuration } from '../engine/substitutions';
import { addDays, mondayOfWeek } from '../utils/dates';
import type { Program } from '../models/program';
import type { PlannedSession } from '../models/training';
import type { RecentPlanChange } from '../models/planChange';

const TODAY = '2026-10-21';

function noticeOf(plan: HorizonPlan, result: HorizonApplyResult): RecentPlanChange {
  if (!('before' in result)) throw new Error(`niet toegepast: ${result.status}`);
  return {
    id: plan.proposal.id, trigger: plan.proposal.trigger, title: plan.proposal.issue, lines: [], why: '',
    before: result.before, addedIds: result.addedIds, programBefore: result.restore.program, createdAt: new Date().toISOString(),
  };
}

async function minutesOf(sessions: PlannedSession[], program: Program): Promise<Map<string, number>> {
  const templates = new Map((await SessionTemplatesRepo.getAll()).map((t) => [t.id, t]));
  return new Map(sessions.map((s) => [s.id, s.plannedMinutes ?? resolveVariantDuration(templates.get(s.templateId)!, 'full', s.scheduledDate, program)]));
}

describe('een rustweek of herhaalde week als voorstel met Akkoord', () => {
  let rest: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    await wipeAllData();
    await seedIfEmpty();
    await runBootMigrations({ build: 'test-week-load' });
    const gr5 = (await TrainingGoalsRepo.getAll()).find((g) => g.id === 'obj_gr5');
    await TrainingGoalsRepo.put({ ...gr5!, status: 'active', targetDate: '2027-08-01' });
    await syncProgramHorizon();
    const [program] = await ProgramsRepo.getAll();
    rest = Array.from({ length: 12 }, (_, i) => addDays(mondayOfWeek(TODAY), 7 * (i + 1))).find((m) => isRestWeekAt(program, m))!;
    expect(rest).toBeDefined();
    // Thursday of the rest week, after the training of Tuesday.
    vi.setSystemTime(new Date(`${addDays(rest, 3)}T08:00:00`));
    await syncProgramHorizon();
  });
  afterEach(() => vi.useRealTimers());

  it('doortrainen midden in de week: eerst het voorstel, dan precies dat, en de dagen ervoor blijven', async () => {
    const tuesday = (await PlannedSessionsRepo.getAll()).find((s) => s.scheduledDate === addDays(rest, 1) && s.status !== 'skipped')!;
    await SessionLogsRepo.put({ id: 'log_test', plannedSessionId: tuesday.id, templateId: tuesday.templateId, type: 'strength', completedDate: tuesday.scheduledDate, completedAt: `${tuesday.scheduledDate}T18:00:00`, variant: 'full', durationMinutes: 50, source: 'manual' });
    const [programBefore] = await ProgramsRepo.getAll();
    const rowsBefore = await PlannedSessionsRepo.getAll();

    const plan = await computeHorizonPlan(await weekLoadInput('rest', rest, true));
    // Nothing stored before Akkoord (Liever niet keeps it like this).
    expect(await ProgramsRepo.getAll()).toEqual([programBefore]);
    expect(await PlannedSessionsRepo.getAll()).toEqual(rowsBefore);
    expect(plan.notes[0]).toMatch(/^Maakt de .* deze week zwaarder\.$/);
    expect(plan.lengths.length).toBeGreaterThan(0);

    const result = await applyHorizonPlanNow(plan);
    expect(['applied', 'unchanged']).toContain(result.status);
    const [programAfter] = await ProgramsRepo.getAll();
    expect(programAfter.skippedRestWeeks).toEqual([rest]);
    expect(programAfter.heldWeekDays).toEqual([{ week: rest, until: addDays(rest, 3) }]);

    // Done or past: the same length. Still open: what the proposal named.
    const rowsAfter = await PlannedSessionsRepo.getAll();
    const was = await minutesOf(rowsBefore, programBefore);
    const now = await minutesOf(rowsAfter, programAfter);
    const week = rowsAfter.filter((s) => s.scheduledDate >= rest && s.scheduledDate <= addDays(rest, 6));
    for (const s of week.filter((x) => x.scheduledDate < addDays(rest, 3))) expect(now.get(s.id)).toBe(was.get(s.id));
    const changed = week.filter((s) => s.scheduledDate >= addDays(rest, 3) && was.get(s.id) !== now.get(s.id));
    expect(changed.length).toBe(plan.lengths.filter((l) => l.includes('minuten')).length);

    // The planning run after it finds nothing left to do.
    const again = await syncProgramHorizon();
    expect([again.added, again.swapped, again.removed]).toEqual([0, 0, 0]);
    expect(result.status === 'applied' || result.status === 'unchanged' ? result.restore.program : undefined).toEqual(programBefore);

    // Undo puts the program back as well.
    await undoPlanChangeNow(noticeOf(plan, result));
    expect(await ProgramsRepo.getAll()).toEqual([programBefore]);
  });

  it('wat je zelf vastzette houdt zijn lengte, en ongedaan maken geeft de rij terug', async () => {
    const lock = { by: 'user' as const, at: '2026-10-21T08:00:00.000Z' };
    const [program] = await ProgramsRepo.getAll();
    const templates = new Map((await SessionTemplatesRepo.getAll()).map((t) => [t.id, t]));
    const longRun = (await PlannedSessionsRepo.getAll()).find((s) => s.scheduledDate >= addDays(rest, 3) && s.scheduledDate <= addDays(rest, 6) && s.status !== 'skipped' && templates.get(s.templateId)!.type !== 'recovery' && templates.get(s.templateId)!.weeklyProgression)!;
    const mine = { ...longRun, lock };
    await PlannedSessionsRepo.put(mine);
    const minutes = resolveVariantDuration(templates.get(mine.templateId)!, 'full', mine.scheduledDate, program);

    const input = await weekLoadInput('rest', rest, true);
    expect(input.pinMinutes).toEqual([{ id: mine.id, minutes }]);
    const plan = await computeHorizonPlan(input);
    expect(plan.proposal.changes.some((i) => i.plannedSessionId === mine.id)).toBe(false);
    expect(plan.notes.some((n) => n.includes('zette je zelf vast'))).toBe(true);
    const result = await applyHorizonPlanNow(plan);
    const after = (await PlannedSessionsRepo.getAll()).find((s) => s.id === mine.id)!;
    expect(after).toEqual({ ...mine, plannedMinutes: minutes });
    await undoPlanChangeNow(noticeOf(plan, result));
    expect((await PlannedSessionsRepo.getAll()).find((s) => s.id === mine.id)).toEqual(mine);
  });

  it('een programma dat intussen veranderde: er gebeurt niets', async () => {
    const plan = await computeHorizonPlan(await weekLoadInput('rest', rest, true));
    const [program] = await ProgramsRepo.getAll();
    await ProgramsRepo.put({ ...program, repeatedWeeks: ['2020-01-06'] });
    expect((await applyHorizonPlanNow(plan)).status).toBe('stale');
    expect((await ProgramsRepo.getAll())[0].skippedRestWeeks).toBeUndefined();
  });

  it('een voorbije week: geen voorstel maar de zin', async () => {
    vi.setSystemTime(new Date(`${addDays(rest, 8)}T08:00:00`));
    await expect(weekLoadInput('rest', rest, true)).rejects.toThrow();
  });

  it('de vastgehouden dagen reizen mee in de back-up; een oude back-up zonder het veld blijft gewoon', async () => {
    const plan = await computeHorizonPlan(await weekLoadInput('rest', rest, true));
    await applyHorizonPlanNow(plan);
    const envelope = await buildBackupEnvelope();
    const back = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(envelope)));
    expect(back.program?.heldWeekDays).toEqual([{ week: rest, until: addDays(rest, 3) }]);
    const old = JSON.parse(JSON.stringify(envelope));
    delete old.payload.program.heldWeekDays;
    delete old.payload.program.skippedRestWeeks;
    expect(normalizeBackupToCurrentModel(old).program?.heldWeekDays).toBeUndefined();
  });
});
