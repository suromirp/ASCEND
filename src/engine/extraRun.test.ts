import { describe, it, expect } from 'vitest';
import { planExtraRuns, extraRunEarned, EXTRA_RUN_TEMPLATE_ID, type ExtraRunInputs } from './extraRun';
import { layoutPhasesForGoal, PHASE_BASIS } from './programLayout';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { addDays } from '../utils/dates';
import type { PlannedSession, SessionLog } from '../models/training';
import type { Program } from '../models/program';

const { templates } = buildDefaultProgramData();
const START = '2026-09-28';
// Basis 4 weeks: Opbouw from Monday 26 Oct.
const program: Program = { id: 'p', name: 'P', startDate: START, phases: layoutPhasesForGoal(START, '2027-08-01', { [PHASE_BASIS]: 4 })! };

const DAYS: [string, number][] = [
  ['tpl_herstel', 0], ['tpl_upper_a', 1], ['tpl_lower_a', 2], ['tpl_easy_run', 3], ['tpl_upper_b', 4], ['tpl_hill_intervals', 5], ['tpl_long_run', 6],
];

function weeks(from: string, count: number): PlannedSession[] {
  const out: PlannedSession[] = [];
  for (let w = 0; w < count; w++) {
    const monday = addDays(from, w * 7);
    for (const [templateId, d] of DAYS) out.push({ id: `${monday}-${templateId}`, templateId, scheduledDate: addDays(monday, d), weekStartDate: monday, status: 'planned', order: d });
  }
  return out;
}

function logsFor(sessions: PlannedSession[], before: string, extra: (s: PlannedSession) => Partial<SessionLog> = () => ({})): SessionLog[] {
  return sessions
    .filter((s) => s.scheduledDate < before && s.templateId !== 'tpl_herstel')
    .map((s) => ({ id: `l-${s.id}`, plannedSessionId: s.id, templateId: s.templateId, type: templates.find((t) => t.id === s.templateId)!.type, completedDate: s.scheduledDate, completedAt: `${s.scheduledDate}T10:00:00Z`, variant: 'full', durationMinutes: 40, source: 'manual', ...extra(s) }));
}

const planned = weeks(START, 10);
let n = 0;
function inputs(today: string, over: Partial<ExtraRunInputs> = {}): ExtraRunInputs {
  return { today, program, plannedSessions: planned, logs: logsFor(planned, today), templates, planChangeLog: [], restDay: 1, newId: () => `new-${n++}`, ...over };
}

describe('the fourth run in Opbouw', () => {
  it('comes in this week and next when the weeks before went well, on the Tuesday', () => {
    // Monday 2 Nov: Opbouw week 2; next week is week 3 (heaviest).
    const added = planExtraRuns(inputs('2026-11-02'));
    expect(added.map((s) => s.scheduledDate)).toEqual(['2026-11-03', '2026-11-10']);
    expect(added.every((s) => s.templateId === EXTRA_RUN_TEMPLATE_ID)).toBe(true);
  });

  it('not in the basis, and not in the rest week of a wave', () => {
    // Monday 12 Oct: basis week 3, next week basis week 4.
    expect(planExtraRuns(inputs('2026-10-12'))).toEqual([]);
    // Monday 19 Oct: basis week 4, but next week is Opbouw week 1.
    expect(planExtraRuns(inputs('2026-10-19')).map((s) => s.scheduledDate)).toEqual(['2026-10-27']);
    // Monday 9 Nov: week 3; next week is week 4, the rest week.
    expect(planExtraRuns(inputs('2026-11-09')).map((s) => s.scheduledDate)).toEqual(['2026-11-10']);
  });

  it('never twice in a week', () => {
    const withExtra = [...planned, { id: 'x', templateId: EXTRA_RUN_TEMPLATE_ID, scheduledDate: '2026-11-03', weekStartDate: '2026-11-02', status: 'skipped' as const, order: 9 }];
    expect(planExtraRuns(inputs('2026-11-02', { plannedSessions: withExtra })).map((s) => s.scheduledDate)).toEqual(['2026-11-10']);
  });

  it('stays out after pain, on Rustig, when ill, or when trainings fell away', () => {
    const today = '2026-11-02';
    const pain = logsFor(planned, today, (s) => (s.scheduledDate === '2026-10-25' ? { painAreas: ['Knie'] } : {}));
    expect(planExtraRuns(inputs(today, { logs: pain }))).toEqual([]);
    expect(planExtraRuns(inputs(today, { ambition: 'rustig' }))).toEqual([]);
    expect(planExtraRuns(inputs(today, { illnessEpisodes: [{ id: 'i', kind: 'above_neck', startDate: '2026-11-01' }] }))).toEqual([]);
    // Every other week only half done.
    const half = logsFor(planned, today).filter((_, i) => i % 2 === 0);
    const verdict = extraRunEarned(inputs(today, { logs: half }), today);
    expect(verdict.earned).toBe(false);
    expect(verdict.reason).toContain('Bij 80%');
  });

  it('not in a race week, and not on or after the main goal', () => {
    expect(planExtraRuns(inputs('2026-11-02', { raceDates: ['2026-11-07'] })).map((s) => s.scheduledDate)).toEqual(['2026-11-10']);
    expect(planExtraRuns(inputs('2026-11-02', { anchor: '2026-11-03' })).map((s) => s.scheduledDate)).toEqual([]);
  });
});
