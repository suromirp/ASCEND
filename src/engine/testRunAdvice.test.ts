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
  it('with no day with fresh legs: the test on Friday, and the hills of that Saturday go (the test is the quality session of that week)', () => {
    const advice = roomAdvice({ plannedSessions: skipTest(planned) })!;
    expect(advice.title).toContain('overgeslagen');
    expect(advice.effect).toContain('frisse benen');
    const changes = advice.proposal!.changes;
    expect(changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ plannedSessionId: '2026-10-26-5', action: 'remove' }), // Heuvelintervallen za 31 okt
      expect.objectContaining({ plannedSessionId: '2026-10-26-3', action: 'move', toDate: '2026-10-30' }),
    ]));
    // Never the long run, the leg strength or a race.
    expect(changes.filter((c) => c.action === 'remove').every((c) => !/-(2|6)$/.test(c.plannedSessionId!))).toBe(true);
  });

  it('prefers a free day when there is one, with no hard run in the 2 days before and none the day after', () => {
    const free = skipTest(planned).filter((s) => s.id !== '2026-10-26-4' && s.id !== '2026-10-26-5'); // Friday free, no hills on Saturday
    const advice = roomAdvice({ plannedSessions: free })!;
    expect(advice.proposal!.changes).toHaveLength(1);
    expect(advice.proposal!.changes[0]).toMatchObject({ action: 'move', toDate: '2026-10-30' });
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

describe('TEST-MAKE-ROOM: the test sits on your rest day', () => {
  // The rest day moved to Thursday, on top of the test: Monday and Tuesday are the other free days of that week.
  const onRest = [
    ...weekOf('2026-10-26', 'tpl_test_run').filter((s) => s.templateId !== 'tpl_herstel'),
    { id: 'rest', templateId: 'tpl_herstel', scheduledDate: THURSDAY, weekStartDate: '2026-10-26', status: 'planned' as const, order: 9 },
    ...weekOf('2026-11-02'),
  ];
  const advice = (over: Partial<AdviceInputs> = {}) => roomAdvice({ plannedSessions: onRest, asOf: '2026-10-21', ...over });

  it('proposes another day for the test, nearest to its own date and never a rest day', () => {
    const a = advice()!;
    expect(a.title).toContain('staat op je rustdag');
    const move = a.proposal!.changes.find((c) => c.action === 'move' && c.plannedSessionId === '2026-10-26-3')!;
    expect(move).toBeDefined();
    // Nothing is dropped: strength is moved out of the way instead.
    expect(a.proposal!.changes.some((c) => c.action === 'remove')).toBe(false);
    expect(move.toDate).not.toBe(THURSDAY);
    expect(Math.abs((new Date(move.toDate! + 'T12:00:00Z').getTime() - new Date(THURSDAY + 'T12:00:00Z').getTime()) / 86400000)).toBeLessThanOrEqual(5);
  });

  it('is quiet when the test is not on a rest day, or after you said no', () => {
    expect(advice({ plannedSessions: [...planned] })).toBeUndefined();
    expect(advice({ respondedIds: new Set(['testroom:2026-10-26-3']) })).toBeUndefined();
  });
});

describe('TEST-MAKE-ROOM: move strength before dropping anything', () => {
  // A week with room: Thursday and Friday free, but Lower A on Wednesday makes Thursday too heavy.
  const sparse: PlannedSession[] = [
    { id: 'rest', templateId: 'tpl_herstel', scheduledDate: '2026-11-02', weekStartDate: '2026-11-02', status: 'planned', order: 0 },
    { id: 'upA', templateId: 'tpl_upper_a', scheduledDate: '2026-11-03', weekStartDate: '2026-11-02', status: 'planned', order: 1 },
    { id: 'lowA', templateId: 'tpl_lower_a', scheduledDate: '2026-11-04', weekStartDate: '2026-11-02', status: 'planned', order: 2 },
    { id: 'hills', templateId: 'tpl_hill_intervals', scheduledDate: '2026-11-07', weekStartDate: '2026-11-02', status: 'planned', order: 5 },
    { id: 'long', templateId: 'tpl_long_run', scheduledDate: '2026-11-08', weekStartDate: '2026-11-02', status: 'planned', order: 6 },
    { id: 'test', templateId: 'tpl_test_run', scheduledDate: '2026-11-02', weekStartDate: '2026-11-02', status: 'skipped', order: 9 },
  ];
  it('proposes moving a strength session, and drops nothing', () => {
    const a = roomAdvice({ plannedSessions: sparse, asOf: '2026-11-02' })!;
    const changes = a.proposal!.changes;
    expect(changes.some((c) => c.action === 'remove')).toBe(false);
    expect(changes.find((c) => c.plannedSessionId === 'test')).toMatchObject({ action: 'move' });
    expect(changes.filter((c) => c.action === 'move' && c.plannedSessionId !== 'test').length).toBeGreaterThan(0);
  });
});
