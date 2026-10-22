import { describe, it, expect } from 'vitest';
import { proposeExtraSession, extraRunEarned, chooseExtraSession, rankFocusGaps, type ExtraAdviceInputs, type FocusGap } from './extraRun';
import type { GoalOverview } from './goalOverview';
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
function inputs(today: string, over: Partial<ExtraAdviceInputs> = {}): ExtraAdviceInputs {
  return { today, program, plannedSessions: planned, logs: logsFor(planned, today), templates, planChangeLog: [], restDay: 1, gaps: [], respondedIds: new Set(), ...over };
}
const dates = (today: string, over: Partial<ExtraAdviceInputs> = {}) => proposeExtraSession(inputs(today, over))?.date;

describe('the extra training in Opbouw: when', () => {
  it('is proposed for this week when the weeks before went well, on the Tuesday', () => {
    // Monday 2 Nov: Opbouw week 2.
    const p = proposeExtraSession(inputs('2026-11-02'))!;
    expect(p.date).toBe('2026-11-03');
    expect(p.id).toBe('extra:2026-11-02');
    expect(p.choice.templateId).toBe('tpl_strides_run');
  });

  it('a "liever niet" holds for that week; then next week is proposed', () => {
    expect(dates('2026-11-02', { respondedIds: new Set(['extra:2026-11-02']) })).toBe('2026-11-10');
  });

  it('not in the basis, and not in the rest week of a wave', () => {
    // Monday 12 Oct: basis week 3, next week basis week 4.
    expect(dates('2026-10-12')).toBeUndefined();
    // Monday 19 Oct: basis week 4, but next week is Opbouw week 1.
    expect(dates('2026-10-19')).toBe('2026-10-27');
    // Monday 16 Nov: week 4 of the wave (rest), next week a new wave.
    expect(dates('2026-11-16')).toBe('2026-11-24');
  });

  it('never twice in a week, also when it was skipped', () => {
    const withExtra = [...planned, { id: 'x', templateId: 'tpl_fartlek', scheduledDate: '2026-11-03', weekStartDate: '2026-11-02', status: 'skipped' as const, order: 9 }];
    expect(dates('2026-11-02', { plannedSessions: withExtra })).toBe('2026-11-10');
  });

  it('a quiet Saturday run of the race block is not the extra one: the fourth run can still be proposed', () => {
    const quiet = { id: 'q', templateId: 'tpl_strides_run', scheduledDate: '2026-11-07', weekStartDate: '2026-11-02', status: 'planned' as const, order: 9, blockQuiet: true as const };
    expect(dates('2026-11-02', { plannedSessions: [...planned, quiet] })).toBe('2026-11-03');
    // The same session without the marker is an extra run you already have.
    expect(dates('2026-11-02', { plannedSessions: [...planned, { ...quiet, blockQuiet: undefined }] })).toBe('2026-11-10');
  });

  it('stays out after pain, on Rustig, when ill, or when trainings fell away', () => {
    const today = '2026-11-02';
    const pain = logsFor(planned, today, (s) => (s.scheduledDate === '2026-10-25' ? { painAreas: ['Knie'] } : {}));
    expect(dates(today, { logs: pain })).toBeUndefined();
    expect(dates(today, { ambition: 'rustig' })).toBeUndefined();
    expect(dates(today, { illnessEpisodes: [{ id: 'i', kind: 'above_neck', startDate: '2026-11-01' }] })).toBeUndefined();
    const half = logsFor(planned, today).filter((_, i) => i % 2 === 0);
    const verdict = extraRunEarned(inputs(today, { logs: half }), today);
    expect(verdict.earned).toBe(false);
    expect(verdict.reason).toContain('Bij 80%');
  });

  it('not in a race week, and not on or after the main goal', () => {
    expect(dates('2026-11-02', { races: [{ blockStart: '2026-09-12', raceDate: '2026-11-07' }] })).toBe('2026-11-10');
    expect(dates('2026-11-02', { anchor: '2026-11-03' })).toBeUndefined();
  });
});

describe('the extra training: which one contributes most', () => {
  const gap = (dimension: FocusGap['dimension'], goalName = 'GR5'): FocusGap => ({ dimension, goalName, score: 1 });
  const base = { phaseId: 'phase_2', wave: 1, inRaceBlock: false, afterRace: false };

  it('ranks gaps by how far off, how critical and how much the goal weighs now', () => {
    const overview = (name: string, pct: number, gaps: [string, string, string][]) => ({
      goal: { name }, focus: { normalizedPct: pct },
      gaps: gaps.map(([dimension, status, criticality]) => ({ key: { dimension }, status, criticality })),
    }) as unknown as GoalOverview;
    const ranked = rankFocusGaps([
      overview('Hardloopwedstrijd', 30, [['sustainable_output', 'unknown', 'critical']]),
      overview('GR5', 70, [['endurance_duration', 'major_gap', 'critical'], ['ascent_capacity', 'gap', 'critical'], ['strength', 'major_gap', 'critical'], ['load_carriage', 'meets', 'critical']]),
    ]);
    expect(ranked.map((g) => g.dimension)).toEqual(['endurance_duration', 'ascent_capacity', 'sustainable_output']);
  });

  it('Opbouw: tempo gets a fartlek (a progressive run in the heaviest week), climbing an uphill walk, the rest an easy run', () => {
    expect(chooseExtraSession({ ...base, gaps: [gap('sustainable_output', '10 km')] }).templateId).toBe('tpl_fartlek');
    expect(chooseExtraSession({ ...base, wave: 3, gaps: [gap('sustainable_output')] }).templateId).toBe('tpl_progression_run');
    expect(chooseExtraSession({ ...base, gaps: [gap('ascent_capacity')] }).templateId).toBe('tpl_bergconditie');
    const easy = chooseExtraSession({ ...base, gaps: [gap('endurance_duration')] });
    expect(easy.templateId).toBe('tpl_strides_run');
    expect(easy.reason).toContain('Je grootste tekort is nu lang onderweg zijn voor GR5.');
  });

  it('around a race: easy with strides before it, a recovery run after it', () => {
    expect(chooseExtraSession({ ...base, inRaceBlock: true, gaps: [gap('sustainable_output')] }).templateId).toBe('tpl_strides_run');
    expect(chooseExtraSession({ ...base, afterRace: true, gaps: [] }).templateId).toBe('tpl_recovery_run');
  });

  it('Bergcapaciteit: low-impact hiking work', () => {
    expect(chooseExtraSession({ ...base, phaseId: 'phase_3', gaps: [gap('load_carriage')] }).templateId).toBe('tpl_ruck_walk');
    expect(chooseExtraSession({ ...base, phaseId: 'phase_3', gaps: [gap('descent_tolerance')] }).templateId).toBe('tpl_bergconditie');
  });
});
