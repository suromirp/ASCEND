import { describe, it, expect } from 'vitest';
import { applyRaceBlocks, goalPlanRole, raceBlocks, revivePrescriptionRemovedTests, saturdayTemplate, templateForRaceBlock } from './raceBlock';
import type { PlanChangeProposal } from '../models/planChange';
import { layoutPhasesForGoal, PHASE_BASIS } from './programLayout';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { TrainingGoal } from '../models/goals';
import type { PlannedSession } from '../models/training';
import { lockLevel } from './weekValidator';
import { addDays, mondayOfWeek } from '../utils/dates';

const { templates } = buildDefaultProgramData();
// Production feedback: a 10 km race on Saturday 20 March 2027, the GR5 as main goal.
const race: TrainingGoal = {
  id: 'race', name: 'Hardloopwedstrijd', status: 'active', targetDate: '2027-03-20', createdAt: '', updatedAt: '',
  requirements: [
    { id: 'r1', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 10, unit: 'km' }, discipline: 'running' },
    { id: 'r2', kind: 'targetTime', scope: 'SINGLE_EVENT', target: { amount: 45, unit: 'min' }, discipline: 'running' },
  ],
} as TrainingGoal;
const blocks = raceBlocks([race], 'gr5', '2027-08-01', '2026-10-12');

let n = 0;
const newId = () => `new${++n}`;
// A plain pattern week, Monday to Sunday.
const week = (monday: string): PlannedSession[] => ['tpl_herstel', 'tpl_upper_a', 'tpl_lower_a', 'tpl_easy_run', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_long_run']
  .map((templateId, i) => ({ id: `${monday}-${templateId}`, templateId, scheduledDate: addDays(monday, i), weekStartDate: monday, status: 'planned', order: i }));

describe('race block', () => {
  it('a running race is a tussendoel by default, the main goal stays main', () => {
    expect(goalPlanRole(race, 'gr5')).toBe('secondary');
    expect(goalPlanRole({ ...race, planRole: 'track' }, 'gr5')).toBe('track');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ raceDate: '2027-03-20', raceWeek: '2027-03-15', blockStart: '2027-01-18', targetMinutes: 45 });
    // Het oude "alleen volgen" blijft zoals het was: geen blok en geen wedstrijd op zijn dag.
    expect(raceBlocks([{ ...race, planRole: 'track' }], 'gr5', '2027-08-01', '2026-10-12')).toEqual([]);
    // Kies je zelf Verkenning, dan staat de wedstrijd wel op zijn dag (zonder blok).
    expect(raceBlocks([{ ...race, planRole: 'track', priority: 'verkenning', priorityChosen: true }], 'gr5', '2027-08-01', '2026-10-12').map((b) => b.priority)).toEqual(['verkenning']);
    // Het hoofddoel zelf heeft nooit een wedstrijdblok.
    expect(raceBlocks([race], 'race', '2027-08-01', '2026-10-12')).toEqual([]);
  });

  it('turns the easy run into a tempo run in the 8 weeks before, not in race week, and back outside', () => {
    expect(templateForRaceBlock('tpl_easy_run', '2027-01-21', blocks)).toBe('tpl_tempo_run');
    expect(templateForRaceBlock('tpl_easy_run', '2027-03-18', blocks)).toBe('tpl_easy_run');
    expect(templateForRaceBlock('tpl_tempo_run', '2027-04-01', blocks)).toBe('tpl_easy_run');
    expect(templateForRaceBlock('tpl_easy_run', '2026-12-10', blocks)).toBe('tpl_easy_run');
  });

  it('asks for a 5 km test just before the block and four weeks before the race', () => {
    expect(templateForRaceBlock('tpl_easy_run', '2027-01-14', blocks)).toBe('tpl_test_run');
    expect(templateForRaceBlock('tpl_easy_run', '2027-02-18', blocks)).toBe('tpl_test_run');
    expect(templateForRaceBlock('tpl_tempo_run', '2027-02-18', blocks)).toBe('tpl_test_run');
    // Gone again when the goal goes.
    expect(templateForRaceBlock('tpl_test_run', '2027-01-14', [])).toBe('tpl_easy_run');
    // Other sessions are never touched.
    expect(templateForRaceBlock('tpl_long_run', '2027-01-14', blocks)).toBe('tpl_long_run');
  });

  it('puts the race in the plan and keeps the days around it light', () => {
    const open = [...week('2027-03-15'), ...week('2027-03-22')];
    const c = applyRaceBlocks(open, blocks, templates, newId);
    expect(c.add).toEqual([expect.objectContaining({ templateId: 'tpl_race', scheduledDate: '2027-03-20', plannedMinutes: 45 })]);
    // Race day: the hill intervals are out. Lower A on Wednesday (3 days before) stays.
    expect(c.remove.map((s) => s.templateId)).toEqual(['tpl_hill_intervals']);
    // Race week before the race: a taper, the short versions.
    expect(c.update).toContainEqual(expect.objectContaining({ templateId: 'tpl_upper_a', scheduledDate: '2027-03-16', plannedMinutes: 45 }));
    expect(c.update).toContainEqual(expect.objectContaining({ templateId: 'tpl_easy_run', scheduledDate: '2027-03-18', plannedMinutes: 20 }));
    // The day after: the long run short.
    expect(c.update).toContainEqual(expect.objectContaining({ templateId: 'tpl_long_run', scheduledDate: '2027-03-21', plannedMinutes: 45 }));
    // Idempotent: with the race there and the changes applied, nothing more.
    const after = [...open.filter((s) => !c.remove.includes(s)).map((s) => c.update.find((u) => u.id === s.id) ?? s), ...c.add];
    expect(applyRaceBlocks(after, blocks, templates, newId)).toEqual({ update: [], add: [], remove: [] });
  });

  it('a race you skipped (or already logged) does not come back', () => {
    const open = [...week('2027-03-15'), ...week('2027-03-22')];
    const skipped = { id: 'r', templateId: 'tpl_race', scheduledDate: '2027-03-20', weekStartDate: mondayOfWeek('2027-03-20'), status: 'skipped' as const, order: 0, lock: { by: 'user' as const, at: '' } };
    expect(applyRaceBlocks(open, blocks, templates, newId, null, [...open, skipped]).add).toEqual([]);
    // Without the skipped one in view it would be added, so the lookup is what keeps it away.
    expect(applyRaceBlocks(open, blocks, templates, newId).add).toHaveLength(1);
  });

  it('takes the race out again when the goal goes', () => {
    const planned = { id: 'r', templateId: 'tpl_race', scheduledDate: '2027-03-20', weekStartDate: mondayOfWeek('2027-03-20'), status: 'planned' as const, order: 0 };
    expect(applyRaceBlocks([planned], [], templates, newId).remove).toEqual([planned]);
  });
});

describe('the Saturday, heavy legs before a hard run, and the first test', () => {
  // The user's program: basis 4 weeks from 28 Sep 2026, then Opbouw.
  const program = { id: 'p', name: 'P', startDate: '2026-09-28', phases: layoutPhasesForGoal('2026-09-28', '2027-08-01', { [PHASE_BASIS]: 4 })! };

  it('intervals in the block, hills with descending in block week 3, outside it every second week of the wave', () => {
    expect(saturdayTemplate('2027-01-23', blocks, program)).toBe('tpl_intervals'); // block week 1
    expect(saturdayTemplate('2027-02-06', blocks, program)).toBe('tpl_hills_descent'); // block week 3
    expect(saturdayTemplate('2027-03-13', blocks, program)).toBe('tpl_intervals'); // block week 8
    // Opbouw from 26 Oct: week 1 hills, week 2 op en af, week 3 hills, week 4 op en af.
    expect(['2026-10-31', '2026-11-07', '2026-11-14', '2026-11-21'].map((d) => saturdayTemplate(d, [], program)))
      .toEqual(['tpl_hill_intervals', 'tpl_hills_descent', 'tpl_hill_intervals', 'tpl_hills_descent']);
    // Bergcapaciteit: the Sunday hike does the descending.
    expect(saturdayTemplate('2027-05-01', [], program)).toBe('tpl_hill_intervals');
  });

  it('a first test 20 weeks out', () => {
    expect(templateForRaceBlock('tpl_easy_run', '2026-10-29', blocks)).toBe('tpl_test_run');
    expect(templateForRaceBlock('tpl_easy_run', '2026-11-26', blocks)).toBe('tpl_easy_run');
  });

  it('the leg day swaps with the upper body day before a tempo run, and is short before a test', () => {
    const block = applyRaceBlocks(week('2027-01-25'), blocks, templates, newId, program);
    const day = (id: string) => block.update.find((u) => u.id === `2027-01-25-${id}`);
    expect(day('tpl_easy_run')?.templateId).toBe('tpl_tempo_run'); // Thursday
    expect(day('tpl_lower_a')?.scheduledDate).toBe('2027-01-26'); // to Tuesday: 48 hours before
    expect(day('tpl_upper_a')?.scheduledDate).toBe('2027-01-27');
    expect(day('tpl_lower_a')?.plannedMinutes).toBeUndefined();
    // Idempotent: run again on the result, nothing changes.
    const after = week('2027-01-25').map((s) => block.update.find((u) => u.id === s.id) ?? s);
    expect(applyRaceBlocks(after, blocks, templates, newId, program).update).toEqual([]);

    const test = applyRaceBlocks(week('2027-02-15'), blocks, templates, newId, program); // 4 weeks before: test
    const legs = test.update.find((u) => u.id === '2027-02-15-tpl_lower_a');
    expect(legs?.scheduledDate).toBe('2027-02-16');
    expect(legs?.plannedMinutes).toBe(templates.find((t) => t.id === 'tpl_lower_a')!.durationVariants.short);
  });
});

describe('a swap for a run that moved is swapped back', () => {
  const program = { id: 'p', name: 'P', startDate: '2026-09-28', phases: layoutPhasesForGoal('2026-09-28', '2027-08-01', { [PHASE_BASIS]: 4 })! };

  it('puts leg strength back on its day, full length, when the test is no longer in that week (also for swaps from before the marker)', () => {
    // Week of 23 Nov, as in the user's data: leg strength short on Tuesday, upper body on Wednesday, no test any more.
    const w = week('2026-11-23').map((s) => (s.templateId === 'tpl_lower_a' ? { ...s, scheduledDate: '2026-11-24', plannedMinutes: 45 } : s.templateId === 'tpl_upper_a' ? { ...s, scheduledDate: '2026-11-25' } : s));
    const c = applyRaceBlocks(w, blocks, templates, newId, program);
    expect(c.update).toContainEqual(expect.objectContaining({ templateId: 'tpl_lower_a', scheduledDate: '2026-11-25' }));
    expect(c.update.find((u) => u.templateId === 'tpl_lower_a')?.plannedMinutes).toBeUndefined();
    expect(c.update).toContainEqual(expect.objectContaining({ templateId: 'tpl_upper_a', scheduledDate: '2026-11-24' }));
  });

  it('a leg day a holiday moved takes part in the cleanup, one a tocht shortened does not', () => {
    const swapped = (leave: PlannedSession['leave']) => week('2026-11-23').map((s) => (s.templateId === 'tpl_lower_a' ? { ...s, scheduledDate: '2026-11-24', plannedMinutes: 45, leave } : s.templateId === 'tpl_upper_a' ? { ...s, scheduledDate: '2026-11-25' } : s));
    const byHoliday = applyRaceBlocks(swapped({ periodId: 'vakantie', role: 'moved', from: '2026-11-24' }), blocks, templates, newId, program);
    expect(byHoliday.update).toContainEqual(expect.objectContaining({ templateId: 'tpl_lower_a', scheduledDate: '2026-11-25' }));
    const byTrek = applyRaceBlocks(swapped({ periodId: 'tocht', role: 'moved', from: '2026-11-24', shortened: true }), blocks, templates, newId, program);
    expect(byTrek.update.find((u) => u.templateId === 'tpl_lower_a')).toBeUndefined();
  });

  it('a marked swap goes back when the test moves away, and stays while it is there', () => {
    const w = week('2026-10-26').map((s) => (s.templateId === 'tpl_easy_run' ? { ...s, templateId: 'tpl_test_run' } : s));
    const first = applyRaceBlocks(w, blocks, templates, newId, program);
    const after = w.map((s) => first.update.find((u) => u.id === s.id) ?? s);
    const legs = after.find((s) => s.templateId === 'tpl_lower_a')!;
    expect(legs).toMatchObject({ scheduledDate: '2026-10-27', plannedMinutes: 45, raceBlock: { from: '2026-10-28', to: '2026-10-27', short: true } });
    // Stable while the test stays.
    expect(applyRaceBlocks(after, blocks, templates, newId, program).update).toEqual([]);
    // The test goes to an easy run: swapped back.
    // The test moves to a week that is no test week (so it turns into an easy run there).
    const moved = after.map((s) => (s.templateId === 'tpl_test_run' ? { ...s, scheduledDate: '2026-11-05', weekStartDate: '2026-11-02' } : s));
    const back = applyRaceBlocks(moved, blocks, templates, newId, program);
    const restored = back.update.find((u) => u.templateId === 'tpl_lower_a')!;
    expect(restored).toMatchObject({ scheduledDate: '2026-10-28' });
    expect(restored.plannedMinutes).toBeUndefined();
    expect(restored.raceBlock).toBeUndefined();
    expect(back.update.find((u) => u.templateId === 'tpl_upper_a')).toMatchObject({ scheduledDate: '2026-10-27' });
  });
});

describe('an accepted proposal survives the next sync (production feedback: Benen A went back)', () => {
  const program = { id: 'p', name: 'P', startDate: '2026-09-28', phases: layoutPhasesForGoal('2026-09-28', '2027-08-01', { [PHASE_BASIS]: 4 })! };
  const lock = { by: 'proposal' as const, proposalId: 'testroom', at: '2026-10-20T08:00:00Z' };
  // As after Akkoord on "Testloop di 27 oktober, Benen A erna": the test moved
  // to Tuesday, Benen A short on Tuesday (kept, so locked), Upper A on Wednesday.
  const accepted = (withLock: boolean) => week('2026-10-26').map((s): PlannedSession => {
    if (s.templateId === 'tpl_easy_run') return { ...s, templateId: 'tpl_test_run', scheduledDate: '2026-10-27', status: 'moved', movedFromDate: '2026-10-29', lock };
    if (s.templateId === 'tpl_lower_a') return { ...s, scheduledDate: '2026-10-27', plannedMinutes: 45, raceBlock: { pair: s.id, from: '2026-10-28', to: '2026-10-27', short: true }, ...(withLock ? { lock } : {}) };
    if (s.templateId === 'tpl_upper_a') return { ...s, scheduledDate: '2026-10-28', raceBlock: { pair: '2026-10-26-tpl_lower_a', from: '2026-10-27', to: '2026-10-28' } };
    return s;
  });

  it('with the lock nothing moves back, and the markers go', () => {
    const c = applyRaceBlocks(accepted(true), blocks, templates, newId, program);
    const legs = c.update.find((u) => u.templateId === 'tpl_lower_a');
    const upper = c.update.find((u) => u.templateId === 'tpl_upper_a');
    expect(legs).toMatchObject({ scheduledDate: '2026-10-27', plannedMinutes: 45 });
    expect(legs?.raceBlock).toBeUndefined();
    expect(upper).toMatchObject({ scheduledDate: '2026-10-28' });
    expect(upper?.raceBlock).toBeUndefined();
    // And the run after that changes nothing more.
    const after = accepted(true).map((s) => c.update.find((u) => u.id === s.id) ?? s);
    expect(applyRaceBlocks(after, blocks, templates, newId, program).update).toEqual([]);
  });

  it('a test you moved still counts as a run the legs keep their distance from', () => {
    // A free leg day the day before the moved test is swapped away or shortened.
    const w = week('2026-10-26').map((s): PlannedSession => (s.templateId === 'tpl_easy_run' ? { ...s, templateId: 'tpl_test_run', scheduledDate: '2026-10-28', status: 'moved', movedFromDate: '2026-10-29', lock } : s));
    const c = applyRaceBlocks(w, blocks, templates, newId, program);
    expect(c.update.find((u) => u.templateId === 'tpl_lower_a')).toBeDefined();
  });
});

describe('a test the weekly prescription took out comes back', () => {
  const sess = (id: string, templateId: string, date: string, status: PlannedSession['status'] = 'skipped'): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: mondayOfWeek(date), status, order: 0 });
  const removal = (id: string, source: string): PlanChangeProposal => ({
    id: 'p', trigger: 'weekly_prescription_computed', issue: '', alternatives: [], consequences: '', explanation: '', createdAt: '', resolution: 'accepted',
    changes: [{ plannedSessionId: id, action: 'remove', reason: '', generatedBy: [source] }],
  } as unknown as PlanChangeProposal);
  const prescription = 'engine/weeklyPrescriptionEngine.ts#computeWeeklyPrescriptionPlan';

  it('only a test that the prescription itself removed, still ahead and not logged', () => {
    const sessions = [sess('t1', 'tpl_test_run', '2026-10-29'), sess('t2', 'tpl_test_run', '2026-11-05'), sess('t3', 'tpl_test_run', '2026-10-10'), sess('t4', 'tpl_test_run', '2026-11-12'), sess('r1', 'tpl_race', '2027-03-20'), sess('e1', 'tpl_easy_run', '2026-10-29')];
    const proposals = [removal('t1', prescription), removal('t3', prescription), removal('t4', prescription), removal('r1', prescription), removal('e1', prescription), removal('t2', 'engine/adviceEngine.ts')];
    const back = revivePrescriptionRemovedTests(sessions, proposals, new Set(['t4']), '2026-10-20');
    expect(back.map((s) => s.id)).toEqual(['t1']); // t2 you skipped yourself, t3 is past, t4 is logged, the race is re-added by the block
    expect(back[0].status).toBe('planned');
  });

  it('once: a revived test you skip yourself stays skipped', () => {
    const skipped = { ...sess('t1', 'tpl_test_run', '2026-10-29'), lock: { by: 'user' as const, at: '2026-10-20T09:00:00Z' } };
    expect(revivePrescriptionRemovedTests([skipped], [removal('t1', prescription)], new Set(), '2026-10-21')).toEqual([]);
  });
});

// The owner's decision (docs/visie/Trainingswetenschap.md, knelpunt 9): in a
// week with three runs ONE quality session, the one that matters for that
// phase of the block; two only from four runs.
describe('one quality session in a week with three runs', () => {
  const program = { id: 'p', name: 'P', startDate: '2026-09-28', phases: layoutPhasesForGoal('2026-09-28', '2027-08-01', { [PHASE_BASIS]: 4 })! };
  // The block weeks (race 20 March 2027, block from 18 January).
  const BLOCK_WEEK = ['2027-01-18', '2027-01-25', '2027-02-01', '2027-02-08', '2027-02-15', '2027-02-22', '2027-03-01', '2027-03-08'];
  const plan = (open: PlannedSession[], all?: PlannedSession[]) => {
    const c = applyRaceBlocks(open, blocks, templates, newId, program, all);
    const result = open.filter((s) => !c.remove.includes(s)).map((s) => c.update.find((u) => u.id === s.id) ?? s);
    return { c, result };
  };
  // Thursday is the run slot (offset 3 from Monday), Saturday the Saturday slot (offset 5).
  const onDay = (rs: PlannedSession[], monday: string, offset: number) => rs.find((s) => s.scheduledDate === addDays(monday, offset) && !['tpl_upper_a', 'tpl_upper_b', 'tpl_lower_a', 'tpl_lower_b', 'tpl_herstel'].includes(s.templateId));
  const quality = ['tpl_tempo_run', 'tpl_test_run', 'tpl_intervals', 'tpl_hills_descent', 'tpl_hill_intervals'];
  const KEY = ['run', 'run', 'saturday', 'saturday', 'run', 'saturday', 'run', 'run'];

  it('the key session carries each block week: tempo run first and last, hills with descending in week 3, intervals in 4 and 6, the test in 5', () => {
    BLOCK_WEEK.forEach((monday, i) => {
      const { result } = plan(week(monday));
      const thu = onDay(result, monday, 3)!;
      const sat = onDay(result, monday, 5)!;
      const expectedRun = i === 4 ? 'tpl_test_run' : KEY[i] === 'run' ? 'tpl_tempo_run' : 'tpl_easy_run';
      const expectedSat = KEY[i] === 'saturday' ? (i === 2 ? 'tpl_hills_descent' : 'tpl_intervals') : 'tpl_strides_run';
      expect([monday, thu.templateId, sat.templateId]).toEqual([monday, expectedRun, expectedSat]);
      // Never two quality sessions in a three-run week, except a test week
      // where the test is the one.
      expect(result.filter((s) => quality.includes(s.templateId))).toHaveLength(1);
    });
  });

  it('marks the quiet Saturday run, and a second run changes nothing', () => {
    const { c, result } = plan(week('2027-01-25'));
    expect(onDay(result, '2027-01-25', 5)).toMatchObject({ templateId: 'tpl_strides_run', blockQuiet: true });
    const again = plan(result).c;
    expect(again.update).toEqual([]);
    expect(again.remove).toEqual([]);
    expect(c.add.map((a) => a.templateId)).toEqual(['tpl_race']); // only the race itself
  });

  it('with a fourth run in the week both quality sessions stay (the extra run you accepted counts)', () => {
    const extra: PlannedSession = { id: 'extra', templateId: 'tpl_strides_run', scheduledDate: '2027-01-27', weekStartDate: '2027-01-25', status: 'planned', order: 9, lock: { by: 'proposal', proposalId: 'extra:2027-01-25', at: '2027-01-20T08:00:00Z' } };
    const { result } = plan([...week('2027-01-25'), extra]);
    expect(onDay(result, '2027-01-25', 3)?.templateId).toBe('tpl_tempo_run');
    expect(onDay(result, '2027-01-25', 5)?.templateId).toBe('tpl_intervals');
    // Block week 3 (key: Saturday) too: the tempo run comes back on Thursday.
    const w3 = plan([...week('2027-02-01'), { ...extra, id: 'e3', scheduledDate: '2027-02-03', weekStartDate: '2027-02-01' }]).result;
    expect(onDay(w3, '2027-02-01', 3)?.templateId).toBe('tpl_tempo_run');
    expect(onDay(w3, '2027-02-01', 5)?.templateId).toBe('tpl_hills_descent');
  });

  it('a quiet Saturday becomes the quality session again when the fourth run joins, and quiet again when it goes', () => {
    const quiet = plan(week('2027-02-08')).result; // block week 4: key Saturday, Thursday easy
    const extra: PlannedSession = { id: 'extra', templateId: 'tpl_strides_run', scheduledDate: '2027-02-09', weekStartDate: '2027-02-08', status: 'planned', order: 9, lock: { by: 'proposal', at: '2027-02-01T08:00:00Z' } };
    const four = plan([...quiet, extra]).result;
    expect(onDay(four, '2027-02-08', 3)?.templateId).toBe('tpl_tempo_run');
    // The fourth run is skipped again: back to one.
    const three = plan(four.map((s) => (s.id === 'extra' ? { ...s, status: 'skipped' as const } : s))).result;
    expect(onDay(three, '2027-02-08', 3)?.templateId).toBe('tpl_easy_run');
  });

  it('leaves a quality session of yours alone and adds no second one next to it', () => {
    const mine = { by: 'user' as const, at: '2027-01-20T08:00:00Z' };
    // Block week 2 (key: Thursday). You locked the Saturday intervals: the free Thursday stays easy.
    const w = week('2027-01-25').map((s): PlannedSession => (s.templateId === 'tpl_hill_intervals' ? { ...s, templateId: 'tpl_intervals', lock: mine } : s));
    const { result } = plan(w);
    expect(onDay(result, '2027-01-25', 5)).toMatchObject({ templateId: 'tpl_intervals', lock: mine });
    expect(onDay(result, '2027-01-25', 3)?.templateId).toBe('tpl_easy_run');
    // Block week 3 (key: Saturday). You locked the Thursday tempo run: the free Saturday goes quiet.
    const w3 = week('2027-02-01').map((s): PlannedSession => (s.templateId === 'tpl_easy_run' ? { ...s, templateId: 'tpl_tempo_run', lock: mine } : s));
    const r3 = plan(w3).result;
    expect(onDay(r3, '2027-02-01', 3)).toMatchObject({ templateId: 'tpl_tempo_run', lock: mine });
    expect(onDay(r3, '2027-02-01', 5)?.templateId).toBe('tpl_strides_run');
  });

  it('never retemplates a quiet Saturday you fixed in place', () => {
    const mine = { by: 'user' as const, at: '2027-01-20T08:00:00Z' };
    const w = week('2027-02-08').map((s): PlannedSession => (s.templateId === 'tpl_hill_intervals' ? { ...s, templateId: 'tpl_strides_run', blockQuiet: true, lock: mine } : s));
    expect(plan(w).c.update.filter((u) => u.id.endsWith('hill_intervals'))).toEqual([]);
  });

  it('a quality session already done this week (logged or past) is the week\'s one: nothing is added after it', () => {
    // Block week 4 (key: Saturday), today is Friday; the Thursday tempo run was done. Only Friday on is open.
    const all = week('2027-02-08').map((s): PlannedSession => (s.templateId === 'tpl_easy_run' ? { ...s, templateId: 'tpl_tempo_run' } : s));
    const open = all.filter((s) => s.scheduledDate >= '2027-02-12');
    const { result } = plan(open, all);
    expect(onDay(result, '2027-02-08', 5)?.templateId).toBe('tpl_strides_run');
    // Without the past session known (only the open ones), the Saturday would be the key.
    expect(onDay(plan(open).result, '2027-02-08', 5)?.templateId).toBe('tpl_intervals');
  });

  it('counts the runs of the whole week, also the ones already behind you', () => {
    // Block week 2 (key: Thursday). Open: Thursday, Saturday, Sunday. An extra run happened on Tuesday (past, logged).
    const extra: PlannedSession = { id: 'x', templateId: 'tpl_strides_run', scheduledDate: '2027-01-26', weekStartDate: '2027-01-25', status: 'planned', order: 9 };
    const all = [...week('2027-01-25'), extra];
    const open = all.filter((s) => s.scheduledDate >= '2027-01-28');
    expect(onDay(plan(open, all).result, '2027-01-25', 5)?.templateId).toBe('tpl_intervals');
    expect(onDay(plan(open).result, '2027-01-25', 5)?.templateId).toBe('tpl_strides_run');
  });

  it('the quiet run goes back to the Saturday session when the goal goes, and a test week keeps its test', () => {
    const quiet = plan(week('2027-01-25')).result; // block week 2: Thursday is the key
    expect(onDay(quiet, '2027-01-25', 5)).toMatchObject({ templateId: 'tpl_strides_run', blockQuiet: true });
    const gone = applyRaceBlocks(quiet, [], templates, newId, program);
    const back = gone.update.find((u) => u.id.endsWith('hill_intervals'))!;
    // Outside the block: hills (or, in the second week of the wave, hills with descending).
    expect(['tpl_hill_intervals', 'tpl_hills_descent']).toContain(back.templateId);
    expect(back.blockQuiet).toBeUndefined();
    // Test week (block week 5): the test stays the test, Saturday is quiet.
    const t = plan(week('2027-02-15')).result;
    expect(onDay(t, '2027-02-15', 3)?.templateId).toBe('tpl_test_run');
    expect(onDay(t, '2027-02-15', 5)?.templateId).toBe('tpl_strides_run');
  });

  it('keeps the old behaviour without week information (the exported helpers)', () => {
    expect(templateForRaceBlock('tpl_easy_run', '2027-02-04', blocks)).toBe('tpl_tempo_run');
    expect(saturdayTemplate('2027-02-13', blocks, program)).toBe('tpl_intervals');
    expect(saturdayTemplate('2027-02-13', blocks, program, { runs: 3, fixed: false })).toBe('tpl_intervals'); // week 4: key
    expect(saturdayTemplate('2027-01-30', blocks, program, { runs: 3, fixed: false })).toBe('tpl_strides_run'); // week 2: not key
    expect(saturdayTemplate('2027-01-30', blocks, program, { runs: 4, fixed: false })).toBe('tpl_intervals');
    // Outside a block the week information does not matter.
    expect(saturdayTemplate('2026-10-31', [], program, { runs: 3, fixed: false })).toBe('tpl_hill_intervals');
  });

  it('without the strides template the old plan stays: both quality sessions', () => {
    const without = templates.filter((tp) => tp.id !== 'tpl_strides_run');
    const c = applyRaceBlocks(week('2027-01-25'), blocks, without, newId, program);
    expect(c.update.find((u) => u.id.endsWith('hill_intervals'))?.templateId).toBe('tpl_intervals');
    expect(c.update.find((u) => u.id.endsWith('easy_run'))?.templateId).toBe('tpl_tempo_run');
  });
});


// Ronde 2b: de planning leest het label (docs/beslissingen/2026-10-26-planning-met-labels.md).
describe('het label van het doel in het wedstrijdblok', () => {
  const at = (over: Partial<TrainingGoal>, date = '2027-03-20') => raceBlocks([{ ...race, ...over, ...(over.priority === 'verkenning' ? { priorityChosen: true } : {}), targetDate: date } as TrainingGoal], 'gr5', '2027-08-01', '2026-10-12');

  it('Voortop krijgt de korte afbouw van zijn soort, Top houdt de wedstrijdweek, Verkenning heeft geen afbouw', () => {
    // 10 km: afbouw 4 dagen, herstel 4 dagen.
    expect(at({ priority: 'voortop' })[0]).toMatchObject({ priority: 'voortop', taperStart: '2027-03-16', recoveryDays: 4 });
    expect(at({ priority: 'top' })[0]).toMatchObject({ priority: 'top', taperStart: '2027-03-15', recoveryDays: 4 });
    expect(at({ priority: 'verkenning' })[0]).toMatchObject({ priority: 'verkenning', taperStart: '2027-03-20', blockStart: '2027-03-15' });
    // Een marathon als Voortop: 7 dagen afbouw, dus ook de zondag voor de wedstrijdweek is al kort.
    const marathon = { requirements: [{ id: 'm', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 42.2, unit: 'km' }, discipline: 'running' }] } as Partial<TrainingGoal>;
    expect(at({ ...marathon, priority: 'voortop' })[0]).toMatchObject({ taperStart: '2027-03-13', recoveryDays: 10 });
    // Een eigen kortere afbouw (uit een botsing) telt.
    expect(at({ ...marathon, priority: 'voortop', taperDays: 3 })[0].taperStart).toBe('2027-03-17');
  });

  it('de afbouw van een Voortop begint op de dag die zijn soort zegt', () => {
    const open = week('2027-03-15');
    const c = applyRaceBlocks(open, at({ priority: 'voortop' }), templates, newId);
    // Dinsdag 16 maart is dag 4 voor de wedstrijd: kort. De zondag ervoor niet.
    expect(c.update).toContainEqual(expect.objectContaining({ templateId: 'tpl_upper_a', scheduledDate: '2027-03-16', plannedMinutes: 45 }));
    const marathon = { requirements: [{ id: 'm', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 42.2, unit: 'km' }, discipline: 'running' }] } as Partial<TrainingGoal>;
    const longBefore = [{ id: 'sun', templateId: 'tpl_long_run', scheduledDate: '2027-03-14', weekStartDate: '2027-03-08', status: 'planned' as const, order: 0 }];
    expect(applyRaceBlocks(longBefore, at({ ...marathon, priority: 'voortop' }), templates, newId).update).toContainEqual(expect.objectContaining({ id: 'sun', plannedMinutes: 45 }));
    expect(applyRaceBlocks(longBefore, at({ priority: 'voortop' }), templates, newId).update).toEqual([]);
  });

  it('Verkenning: de wedstrijd staat op zijn dag, als anker, zonder blok, zonder afbouw en zonder korte dag erna', () => {
    const exploring = at({ priority: 'verkenning' });
    // Geen tempoloop, geen testloop, geen blok in de weken ervoor.
    expect(templateForRaceBlock('tpl_easy_run', '2027-01-21', exploring)).toBe('tpl_easy_run');
    expect(templateForRaceBlock('tpl_easy_run', '2027-02-18', exploring)).toBe('tpl_easy_run');
    expect(saturdayTemplate('2027-01-23', exploring)).toBe('tpl_hill_intervals');

    const open = [...week('2027-03-15'), ...week('2027-03-22')];
    const c = applyRaceBlocks(open, exploring, templates, newId);
    expect(c.add).toEqual([expect.objectContaining({ templateId: 'tpl_race', scheduledDate: '2027-03-20', plannedMinutes: 45 })]);
    // Op de wedstrijddag niets anders (de heuvelintervallen), en de dag ervoor niets zwaars: vrijdag is Upper B, dat blijft.
    expect(c.remove.map((s) => s.templateId)).toEqual(['tpl_hill_intervals']);
    // Geen afbouw: niets wordt korter, ook de lange loop de dag erna niet.
    expect(c.update).toEqual([]);
    // De wedstrijd is een anker (niveau 2): alleen via een voorstel te verplaatsen.
    const race = c.add[0];
    expect(lockLevel(race, new Set(), '2026-10-12')).toBe(2);
  });

  it('Verkenning: de dag ervoor geen heuvelintervallen of zware beenkracht, maar twee dagen ervoor wel', () => {
    const exploring = at({ priority: 'verkenning' }, '2027-03-21');
    const sessions: PlannedSession[] = [
      { id: 'lower', templateId: 'tpl_lower_a', scheduledDate: '2027-03-19', weekStartDate: '2027-03-15', status: 'planned', order: 0 },
      { id: 'lower2', templateId: 'tpl_lower_b', scheduledDate: '2027-03-20', weekStartDate: '2027-03-15', status: 'planned', order: 1 },
    ];
    const c = applyRaceBlocks(sessions, exploring, templates, newId);
    expect(c.remove.map((s) => s.id)).toEqual(['lower2']);
  });

  it('een Verkenning wordt een Voortop: het blok komt erbij, zonder dubbele wedstrijd', () => {
    const open = week('2027-03-15');
    const first = applyRaceBlocks(open, at({ priority: 'verkenning' }), templates, newId);
    const planned = [...open.filter((s) => !first.remove.includes(s)), ...first.add];
    const second = applyRaceBlocks(planned, at({ priority: 'voortop' }), templates, newId);
    expect(second.add).toEqual([]);
    expect(second.update.length).toBeGreaterThan(0);
  });
});
