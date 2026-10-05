import { describe, it, expect, afterEach } from 'vitest';
import {
  layoutPhasesForGoal,
  layoutPhasesWithoutGoal,
  progressionTarget,
  patternForWeek,
  activeSwaps,
  templateForPhase,
  programAnchorDate,
  PHASE_TAPER,
  PHASE_BERG,
  PHASE_EXPEDITIE,
  PHASE_BASIS,
} from './programLayout';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { resolveEffectiveFullDuration, setRecentSessionMaxima, recentSessionMaxima } from './substitutions';
import { addDays, resolveProgramWeek } from '../utils/dates';
import type { Program } from '../models/program';
import type { TrainingGoal, GoalMilestone } from '../models/goals';

const START = '2026-09-14';
const GR5 = '2027-08-02';

function programToGoal(): Program {
  return { id: 'p', name: 'P', startDate: START, phases: layoutPhasesForGoal(START, GR5)! };
}

const { templates } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;

describe('layoutPhasesForGoal', () => {
  it('counts back from the GR5: taper right before departure, no week after it', () => {
    const phases = layoutPhasesForGoal(START, GR5)!;
    expect(phases.map((p) => [p.id, p.weekCount])).toEqual([
      ['phase_1', 20],
      ['phase_2', 12],
      ['phase_3', 8],
      ['phase_4', 4],
      ['phase_taper', 2],
    ]);
    const program = programToGoal();
    expect(resolveProgramWeek(program, addDays(GR5, -1))?.phase.id).toBe(PHASE_TAPER);
    expect(resolveProgramWeek(program, addDays(GR5, -14))?.phase.id).toBe(PHASE_TAPER);
    expect(resolveProgramWeek(program, addDays(GR5, -15))?.phase.id).toBe(PHASE_EXPEDITIE);
    expect(resolveProgramWeek(program, GR5)).toBeNull();
    // Week 3 of the program (today in the audit) is still the basis.
    expect(resolveProgramWeek(program, '2026-10-01')?.phase.id).toBe(PHASE_BASIS);
  });

  it('a near goal still gets a taper and Expeditieklaar first', () => {
    const phases = layoutPhasesForGoal(START, addDays(START, 10 * 7))!;
    expect(phases.map((p) => [p.id, p.weekCount])).toEqual([
      ['phase_3', 4],
      ['phase_4', 4],
      ['phase_taper', 2],
    ]);
    expect(phases[phases.length - 1]).toMatchObject({ id: 'phase_taper', weekCount: 2 });
    expect(phases.reduce((n, p) => n + p.weekCount, 0)).toBe(10);
  });

  it('returns null for a goal in the past', () => {
    expect(layoutPhasesForGoal(START, '2026-09-01')).toBeNull();
  });
});

describe('layoutPhasesWithoutGoal', () => {
  it('keeps the four blocks and adds Onderhoud so the planning never runs out', () => {
    expect(layoutPhasesWithoutGoal(START, START).map((p) => p.weekCount)).toEqual([4, 4, 4, 4]);
    const later = layoutPhasesWithoutGoal(START, '2027-01-04');
    const total = later.reduce((n, p) => n + p.weekCount, 0);
    expect(later[later.length - 1].id).toBe('phase_onderhoud');
    expect(addDays(START, total * 7) >= addDays('2027-01-04', 12 * 7)).toBe(true);
  });
});

describe('progressionTarget', () => {
  const program = programToGoal();

  it('keeps building through a long basis instead of resetting', () => {
    const week1 = progressionTarget(tpl('tpl_long_run'), program, START)!.minutes;
    const week9 = progressionTarget(tpl('tpl_long_run'), program, addDays(START, 8 * 7))!.minutes;
    expect(week1).toBe(50);
    expect(week9).toBeGreaterThan(week1);
  });

  it('tapers: about 70% and then 50% of a build week', () => {
    const taper1 = progressionTarget(tpl('tpl_easy_run'), program, addDays(GR5, -10))!;
    const taper2 = progressionTarget(tpl('tpl_easy_run'), program, addDays(GR5, -3))!;
    expect(taper2.minutes).toBeLessThan(taper1.minutes);
    expect(taper2.minutes).toBeLessThanOrEqual(Math.round(35 * 1.3 * 0.5 / 5) * 5);
  });

  it('the mountain hike follows its own D+ and backpack ladder per phase', () => {
    const bergStart = addDays(GR5, -14 * 7);
    const pos = resolveProgramWeek(program, bergStart)!;
    expect(pos.phase.id).toBe(PHASE_BERG);
    const t = progressionTarget(tpl('tpl_mountain_hike'), program, bergStart)!;
    expect(t.step.backpackKg).toBe(4);
    expect(t.step.elevationGainM).toBe(400);
    const rehearsal = progressionTarget(tpl('tpl_mountain_hike'), program, addDays(GR5, -15 - 7))!;
    expect(rehearsal.step.backpackKg).toBe(12);
    expect(rehearsal.step.elevationGainM).toBe(1000);
  });

  it('never steps the backpack and the D+ up in the same week', () => {
    const steps = tpl('tpl_mountain_hike').weeklyProgression!.filter((s) => s.phaseId === PHASE_BERG);
    for (let i = 1; i < steps.length; i++) {
      const packUp = (steps[i].backpackKg ?? 0) > (steps[i - 1].backpackKg ?? 0);
      const dUp = (steps[i].elevationGainM ?? 0) > (steps[i - 1].elevationGainM ?? 0);
      expect(packUp && dUp && steps[i - 1].note !== 'Rustweek').toBe(false);
    }
  });
});

describe('weekly pattern per phase', () => {
  const program = programToGoal();
  const pattern = templates.filter((t) => t.defaultDayOfWeek);

  it('the long Sunday becomes a mountain hike from Bergcapaciteit on, and Saturday a first hiking day in Expeditieklaar', () => {
    const swaps = activeSwaps(templates, {}, () => true);
    const ids = (date: string) => patternForWeek(pattern, templates, swaps, resolveProgramWeek(program, date)?.phase.id).map((s) => s.template.id);
    expect(ids(START)).toContain('tpl_long_run');
    expect(ids(addDays(GR5, -14 * 7))).toContain('tpl_mountain_hike');
    expect(ids(addDays(GR5, -14 * 7))).toContain('tpl_hill_intervals');
    expect(ids(addDays(GR5, -21))).toEqual(expect.arrayContaining(['tpl_mountain_hike', 'tpl_hike_day_one']));
    expect(ids(addDays(GR5, -21))).not.toContain('tpl_hill_intervals');
  });

  it('keeps the long run when the user chose that, or when hiking is off', () => {
    expect(activeSwaps(templates, { longSundaySession: 'run' }, () => true)).toEqual([]);
    expect(activeSwaps(templates, {}, (t) => t.sport !== 'hiking')).toEqual([]);
    // A hike already planned goes back to the long run.
    expect(templateForPhase('tpl_mountain_hike', [], PHASE_BERG)).toBe('tpl_long_run');
  });
});

describe('programAnchorDate', () => {
  const goal = (over: Partial<TrainingGoal>): TrainingGoal => ({ id: 'g', name: 'GR5', requirements: [], createdAt: '', updatedAt: '', status: 'active', targetDate: GR5, ...over } as TrainingGoal);
  const ms: GoalMilestone[] = [{ id: 'm', goalId: 'g', order: 1, title: 'x', requirement: { kind: 'manual' } as GoalMilestone['requirement'] }];
  it('is the active main goal, only while it lies ahead', () => {
    expect(programAnchorDate([goal({})], ms, '2026-10-04')).toBe(GR5);
    expect(programAnchorDate([goal({})], [], '2026-10-04')).toBeUndefined();
    expect(programAnchorDate([goal({ status: 'paused' })], ms, '2026-10-04')).toBeUndefined();
    expect(programAnchorDate([goal({})], ms, GR5)).toBeUndefined();
  });
});

describe('session spike cap (110% of the 30-day longest)', () => {
  afterEach(() => setRecentSessionMaxima({ asOf: '', minutesByTemplate: {} }));
  const program = programToGoal();

  it('caps the next two weeks at 110% of the longest logged session, never below the Wennen step', () => {
    // Week 3 of a wave: the long run asks 70 minutes.
    const sunday = addDays(START, 20);
    expect(resolveEffectiveFullDuration(tpl('tpl_long_run'), sunday, program)).toBe(70);
    setRecentSessionMaxima(recentSessionMaxima([{ templateId: 'tpl_long_run', completedDate: addDays(sunday, -7), durationMinutes: 55 }], addDays(sunday, -3)));
    expect(resolveEffectiveFullDuration(tpl('tpl_long_run'), sunday, program)).toBe(60);
    setRecentSessionMaxima(recentSessionMaxima([{ templateId: 'tpl_long_run', completedDate: addDays(sunday, -7), durationMinutes: 20 }], addDays(sunday, -3)));
    expect(resolveEffectiveFullDuration(tpl('tpl_long_run'), sunday, program)).toBe(50);
    // Weeks further out keep their planned number.
    expect(resolveEffectiveFullDuration(tpl('tpl_long_run'), addDays(sunday, 28), program)).toBeGreaterThan(60);
  });
});

describe('the training screen for a mountain hike', () => {
  it('shows this week\'s D+ and backpack next to the minutes, and the steps add up', async () => {
    const { buildWorkoutPlan } = await import('./workoutPlan');
    const program = programToGoal();
    const sunday = addDays(GR5, -14 * 7 + 6);
    const plan = buildWorkoutPlan(tpl('tpl_mountain_hike'), sunday, program)!;
    expect(plan.totalMinutes).toBe(120);
    expect(plan.targets).toEqual(['400 m omhoog en omlaag', 'Rugzak 4 kg']);
    expect(plan.timeline.reduce((n, s) => n + s.seconds, 0)).toBe(120 * 60);
    expect(plan.weeks.find((w) => w.current)?.week).toBe(1);
    expect(plan.weeks).toHaveLength(8);
  });
});

describe('your own phase lengths', () => {
  it('follows the chosen lengths, the basis takes what is left, and a choice that does not fit is shortened', () => {
    const phases = layoutPhasesForGoal(START, GR5, { phase_2: 4, phase_3: 12, phase_taper: 3 })!;
    expect(phases.map((p) => [p.id, p.weekCount])).toEqual([
      ['phase_1', 23], ['phase_2', 4], ['phase_3', 12], ['phase_4', 4], ['phase_taper', 3],
    ]);
    // Rounded to whole waves of four, the taper to 1-3 weeks.
    expect(layoutPhasesForGoal(START, GR5, { phase_2: 5, phase_taper: 9 })!.find((p) => p.id === 'phase_taper')!.weekCount).toBe(3);
    expect(layoutPhasesForGoal(START, GR5, { phase_2: 5 })!.find((p) => p.id === 'phase_2')!.weekCount).toBe(4);
    const tight = layoutPhasesForGoal(START, addDays(START, 10 * 7), { phase_3: 16 })!;
    expect(tight.reduce((n, p) => n + p.weekCount, 0)).toBe(10);
  });

  it('a longer Bergcapaciteit repeats the last wave of the hike ladder instead of starting over', () => {
    const program: Program = { id: 'p', name: 'P', startDate: START, phases: layoutPhasesForGoal(START, GR5, { phase_3: 12 })! };
    const bergStart = addDays(GR5, -(2 + 4 + 12) * 7);
    const week9 = progressionTarget(tpl('tpl_mountain_hike'), program, addDays(bergStart, 8 * 7 + 6))!;
    expect(week9.step.weekInPhase).toBe(5);
    expect(week9.step.backpackKg).toBe(6);
  });
});
