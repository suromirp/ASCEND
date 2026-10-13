import { describe, it, expect } from 'vitest';
import { applyRaceBlocks, goalPlanRole, raceBlocks, saturdayTemplate, templateForRaceBlock } from './raceBlock';
import { layoutPhasesForGoal, PHASE_BASIS } from './programLayout';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { TrainingGoal } from '../models/goals';
import type { PlannedSession } from '../models/training';
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
    expect(raceBlocks([{ ...race, planRole: 'track' }], 'gr5', '2027-08-01', '2026-10-12')).toEqual([]);
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

  it('a first test about 16 weeks out', () => {
    expect(templateForRaceBlock('tpl_easy_run', '2026-11-26', blocks)).toBe('tpl_test_run');
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
