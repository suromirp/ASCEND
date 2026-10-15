import { describe, it, expect } from 'vitest';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { addDays } from '../utils/dates';
import type { PlannedSession } from '../models/training';

const { templates } = buildDefaultProgramData();
const DAYS = ['tpl_herstel', 'tpl_upper_a', 'tpl_lower_a', 'tpl_test_run', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_long_run'];
const weekOf = (monday: string, test = 'tpl_easy_run'): PlannedSession[] => DAYS.map((t, d) => ({
  id: `${monday}-${d}`, templateId: t === 'tpl_test_run' ? test : t, scheduledDate: addDays(monday, d), weekStartDate: monday, status: 'planned' as const, order: d,
}));
const THURSDAY = '2026-10-29';
const planned = [...weekOf('2026-10-26', 'tpl_test_run'), ...weekOf('2026-11-02'), ...weekOf('2026-11-09')];
const inputs = (over: Partial<AdviceInputs> = {}): AdviceInputs => ({
  logs: [], plannedSessions: planned, templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: THURSDAY, ...over,
});
const skipTest = (list: PlannedSession[]) => list.map((s) => (s.templateId === 'tpl_test_run' ? { ...s, status: 'skipped' as const } : s));
const roomAdvice = (over: Partial<AdviceInputs> = {}) => computeAdvice(inputs(over)).find((a) => a.ruleId === 'TEST-MAKE-ROOM');

describe('TEST-MAKE-ROOM: the test run is missed or skipped', () => {
  it('proposes taking out the least important training on a day where the test fits, when there is no free day', () => {
    const advice = roomAdvice({ plannedSessions: skipTest(planned) })!;
    expect(advice.title).toContain('overgeslagen');
    expect(advice.effect).toContain('Er is geen vrije dag');
    const changes = advice.proposal!.changes;
    // Tuesday 3 Nov: Upper A goes (legs on Wednesday 28 Oct are far enough, Lower A on Wednesday 4 Nov comes after).
    expect(changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ plannedSessionId: '2026-11-02-1', action: 'remove' }),
      expect.objectContaining({ plannedSessionId: '2026-10-26-3', action: 'move', toDate: '2026-11-03' }),
    ]));
    // Never the long run, the leg strength or a race.
    expect(changes.filter((c) => c.action === 'remove').every((c) => !/-(2|6)$/.test(c.plannedSessionId!))).toBe(true);
  });

  it('prefers a free day when there is one', () => {
    const noFriday = skipTest(planned).filter((s) => s.id !== '2026-11-02-1'); // Tuesday 3 Nov is free
    const advice = roomAdvice({ plannedSessions: noFriday })!;
    expect(advice.proposal!.changes).toHaveLength(1);
    expect(advice.proposal!.changes[0]).toMatchObject({ action: 'move', toDate: '2026-11-03' });
    expect(advice.effect).toContain('Doe hem');
  });

  it('also when the test was simply missed, and the old "gemist" advice does not drop it', () => {
    const missedAdvices = computeAdvice(inputs({ asOf: '2026-10-30' }));
    expect(missedAdvices.find((a) => a.ruleId === 'TEST-MAKE-ROOM')?.title).toContain('gemist');
    expect(missedAdvices.find((a) => a.ruleId === 'MISSED-CATCH-UP')?.proposal?.changes.some((c) => c.plannedSessionId === '2026-10-26-3')).toBeFalsy();
  });

  it('stays quiet when another test is already waiting, in the taper, when ill, or after you said no', () => {
    const withAnother = [...skipTest(planned), { id: 'again', templateId: 'tpl_test_run', scheduledDate: '2026-11-05', weekStartDate: '2026-11-02', status: 'planned' as const, order: 0 }];
    expect(roomAdvice({ plannedSessions: withAnother })).toBeUndefined();
    const race = [...skipTest(planned), { id: 'race', templateId: 'tpl_race', scheduledDate: '2026-11-07', weekStartDate: '2026-11-02', status: 'planned' as const, order: 0 }];
    expect(roomAdvice({ plannedSessions: race })).toBeUndefined();
    expect(roomAdvice({ plannedSessions: skipTest(planned), illnessEpisodes: [{ id: 'i', kind: 'above_neck', startDate: '2026-10-28' }] })).toBeUndefined();
    expect(roomAdvice({ plannedSessions: skipTest(planned), respondedIds: new Set(['testroom:2026-10-26-3']) })).toBeUndefined();
  });
});
