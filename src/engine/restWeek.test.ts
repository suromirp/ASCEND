import { describe, it, expect } from 'vitest';
import { proposeRestWeekSkip, restWeekState, withRestWeekSkipped } from './restWeek';
import type { PlannedSession } from '../models/training';
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

describe('ASCEND proposes it itself after a light start', () => {
  const DAYS: [string, number][] = [['tpl_upper_a', 1], ['tpl_easy_run', 3], ['tpl_hill_intervals', 5], ['tpl_long_run', 6]];
  const planned: PlannedSession[] = [0, 1, 2, 3].flatMap((w) => DAYS.map(([templateId, d]) => {
    const monday = `2026-${w === 0 ? '09-28' : w === 1 ? '10-05' : w === 2 ? '10-12' : '10-19'}`;
    const date = new Date(`${monday}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + d);
    return { id: `${monday}-${templateId}`, templateId, scheduledDate: date.toISOString().slice(0, 10), weekStartDate: monday, status: 'planned' as const, order: d };
  }));
  const run = (date: string, min: number, extra: Partial<SessionLog> = {}): SessionLog => ({ id: date + min, templateId: 'tpl_long_run', type: 'hiking', sport: 'running', completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: min, source: 'manual', ...extra });
  const inputs = (logs: SessionLog[], over = {}) => ({ program, plannedSessions: planned, logs, templates, today: TODAY, respondedIds: new Set<string>(), ...over });

  it('proposes it when you ran clearly less than planned', () => {
    const p = proposeRestWeekSkip(inputs([run('2026-10-04', 68), run('2026-10-12', 70), run('2026-10-15', 55)]))!;
    expect(p.weekStart).toBe('2026-10-19');
    expect(p.doneMinutes).toBe(193);
    expect(p.doneMinutes).toBeLessThan(p.plannedMinutes * 0.75);
  });

  it('not when you did (nearly) everything, after a "liever niet", or when you are ill', () => {
    const all = planned.filter((s) => s.scheduledDate <= TODAY && s.templateId !== 'tpl_upper_a').map((s) => run(s.scheduledDate, 80));
    expect(proposeRestWeekSkip(inputs(all))).toBeUndefined();
    const light = [run('2026-10-04', 68)];
    expect(proposeRestWeekSkip(inputs(light, { respondedIds: new Set(['rest-week-skip:2026-10-19']) }))).toBeUndefined();
    expect(proposeRestWeekSkip(inputs(light, { illnessEpisodes: [{ id: 'i', kind: 'above_neck', startDate: '2026-10-10' }] }))).toBeUndefined();
    expect(proposeRestWeekSkip(inputs(light, { today: '2026-10-14' }))).toBeUndefined(); // too early in the week before
  });

  it('only in the basis: from the Opbouw on the rest week stays', () => {
    // 16 Nov is the rest week of the first Opbouw wave.
    expect(proposeRestWeekSkip(inputs([], { today: '2026-11-15' }))).toBeUndefined();
  });
});
