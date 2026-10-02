import { describe, it, expect } from 'vitest';
import { buildWorkoutPlan, garminLines } from './workoutPlan';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { WORKOUTS } from '../data/workoutStructure';
import { addDays } from '../utils/dates';

const { templates, program } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;
const weekStart = (n: number) => addDays(program.startDate, (n - 1) * 7);

describe('buildWorkoutPlan', () => {
  it('hill intervals: warm up, the repeats of this week, cool down, adding up to the planned minutes', () => {
    const plan = buildWorkoutPlan(tpl('tpl_hill_intervals'), addDays(weekStart(1), 5), program)!;
    expect(plan.repeats).toBe(5);
    expect(plan.summary).toBe('Rustig opwarmen, 5 keer kort en hard bergop, rustig uitlopen.');
    expect(plan.timeline.reduce((s, x) => s + x.seconds, 0)).toBe(plan.totalMinutes * 60);
    expect(plan.timeline.filter((s) => s.intensity === 4)).toHaveLength(5);
    expect(plan.weeks.find((w) => w.current)?.week).toBe(1);
  });

  it('follows the week in the phase: more repeats in the heaviest week, fewer in the deload', () => {
    expect(buildWorkoutPlan(tpl('tpl_hill_intervals'), addDays(weekStart(3), 5), program)!.repeats).toBe(8);
    expect(buildWorkoutPlan(tpl('tpl_hill_intervals'), addDays(weekStart(4), 5), program)!.repeats).toBe(4);
  });

  it('a continuous session fills its planned minutes in one block', () => {
    const plan = buildWorkoutPlan(tpl('tpl_long_run'), addDays(weekStart(1), 6), program)!;
    expect(plan.timeline).toHaveLength(1);
    expect(plan.timeline[0].seconds).toBe(plan.totalMinutes * 60);
  });

  it('shows what the session loads, from its stress profile', () => {
    const upper = buildWorkoutPlan(tpl('tpl_upper_a'), undefined, program)!;
    expect(upper.load).toEqual([{ label: 'Benen', level: 0 }, { label: 'Bovenlichaam', level: 3 }, { label: 'Conditie', level: 0 }]);
    expect(upper.garmin).toBeUndefined(); // strength lives in MacroFactor
  });

  it('writes Garmin workout steps in Garmin terms', () => {
    const plan = buildWorkoutPlan(tpl('tpl_hill_intervals'), addDays(weekStart(1), 5), program)!;
    expect(garminLines(plan.items)).toEqual([
      'Warming-up · 10:00 · doel: hartslag zone 2',
      'Herhaal 5×',
      '   Hardlopen · 1:00 · doel: inspanning hard (RPE 8-9)',
      '   Herstel · 2:00 · doel: hartslag zone 1',
      'Cooling-down · 10:00 · doel: hartslag zone 2',
    ]);
  });

  it('every training with a guide has a structure', async () => {
    const { TRAINING_GUIDES } = await import('../data/trainingGuide');
    expect(Object.keys(TRAINING_GUIDES).filter((id) => !WORKOUTS[id])).toEqual([]);
  });
});
