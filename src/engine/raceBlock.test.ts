import { describe, it, expect } from 'vitest';
import { applyRaceBlocks, goalPlanRole, raceBlocks, templateForRaceBlock } from './raceBlock';
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
