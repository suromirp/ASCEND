import { describe, it, expect } from 'vitest';
import { restWeekState, withRestWeekSkipped } from './restWeek';
import { layoutPhasesForGoal, PHASE_BASIS, progressionTarget, waveWeek } from './programLayout';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { resolveProgramWeek } from '../utils/dates';
import type { Program } from '../models/program';
import type { SessionLog } from '../models/training';

const { templates } = buildDefaultProgramData();
const longRun = templates.find((t) => t.id === 'tpl_long_run')!;
const START = '2026-09-28';
// Basis 4 weeks: the rest week is 19 Oct, the next one 16 Nov.
const program: Program = { id: 'p', name: 'P', startDate: START, phases: layoutPhasesForGoal(START, '2027-08-01', { [PHASE_BASIS]: 4 })! };
const TODAY = '2026-10-18';

describe('training through a rest week', () => {
  it('can skip the coming rest week; it then counts as a normal build week', () => {
    const state = restWeekState(program, '2026-10-19', [], TODAY);
    expect(state).toMatchObject({ isRestWeek: true, skipped: false, canSkip: true });
    const skipped = withRestWeekSkipped(program, '2026-10-19', true);
    expect(waveWeek(resolveProgramWeek(skipped, '2026-10-21')!)).toBe(2);
    const rest = progressionTarget(longRun, program, '2026-10-25')!.minutes;
    const through = progressionTarget(longRun, skipped, '2026-10-25')!.minutes;
    expect(through).toBeGreaterThan(rest);
    // Never a second heaviest week in a row.
    expect(through).toBeLessThan(progressionTarget(longRun, program, '2026-10-18')!.minutes);
    expect(restWeekState(skipped, '2026-10-19', [], TODAY).skipped).toBe(true);
  });

  it('restores, and is not offered for a normal week or a past one', () => {
    const back = withRestWeekSkipped(withRestWeekSkipped(program, '2026-10-19', true), '2026-10-19', false);
    expect(back.skippedRestWeeks).toBeUndefined();
    expect(restWeekState(program, '2026-10-12', [], TODAY).isRestWeek).toBe(false);
    expect(restWeekState(program, '2026-10-19', [], '2026-10-27').canSkip).toBe(false);
  });

  it('not two in a row, and not after pain', () => {
    const skipped = withRestWeekSkipped(program, '2026-10-19', true);
    const next = restWeekState(skipped, '2026-11-16', [], '2026-11-15');
    expect(next.canSkip).toBe(false);
    expect(next.reason).toContain('vorige rustweek');
    const pain = [{ completedDate: '2026-10-15', painAreas: ['Knie'] }] as SessionLog[];
    expect(restWeekState(program, '2026-10-19', pain, TODAY).canSkip).toBe(false);
  });
});
