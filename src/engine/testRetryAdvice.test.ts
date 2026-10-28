import { describe, it, expect } from 'vitest';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { applyPlanChangeItems } from './proposalEngine';
import type { PlannedSession, SessionLog } from '../models/training';

const { templates } = buildDefaultProgramData();

// Made-up test: 5 km on Tuesday 27 October 2026, read with standing still.
const testLog = (over: Partial<NonNullable<SessionLog['bestEffort']>> = {}, date = '2026-10-27'): SessionLog => ({
  id: 'log-test', templateId: 'tpl_test_run', type: 'cardio', completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: 36, rpe: 9, source: 'manual',
  cardioData: { durationMinutes: 36, distanceKm: 6, source: 'manual' },
  bestEffort: { km: 5, minutes: 27.67, wholeKm: 6, wholeMinutes: 36, accepted: true, v: 2, stops: 5, stoppedSec: 136, ...over },
} as SessionLog);

const planned = (id: string, templateId: string, scheduledDate: string, weekStartDate: string): PlannedSession => ({ id, templateId, scheduledDate, weekStartDate, status: 'planned', order: 0 });
// Wednesday the 28th is today. Saturday the 31st has the hill intervals.
const plan = (): PlannedSession[] => [
  planned('hills', 'tpl_hill_intervals', '2026-10-31', '2026-10-26'),
  planned('upper', 'tpl_upper_b', '2026-10-30', '2026-10-26'),
  planned('tempo', 'tpl_tempo_run', '2026-11-04', '2026-11-02'),
];
const inputs = (over: Partial<AdviceInputs> = {}): AdviceInputs => ({
  logs: [testLog()], plannedSessions: plan(), templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: '2026-10-28', ...over,
});
const retry = (over: Partial<AdviceInputs> = {}) => computeAdvice(inputs(over)).find((a) => a.ruleId === 'TEST-RETRY');

describe('TEST-RETRY: a new attempt after a test with a lot of standing still', () => {
  it('turns the first hard run at least 3 days later into a 5 km test, with a dry sentence first', () => {
    const a = retry()!;
    expect(a.id).toBe('retest:2026-10-27');
    expect(a.title).toBe('Nieuwe testpoging op za 31 oktober');
    expect(a.effect).toContain('Je testloop van di 27 oktober had 2:16 stilstand, dus hij is iets te gunstig.');
    expect(a.effect).toContain('Met Akkoord wordt Heuvelintervallen op za 31 oktober een testloop van 5 km.');
    expect(a.effect).toContain('Kies een route zonder stoplichten en zet auto-pauze uit.');
    expect(a.effect).toContain('Liever niet');
    expect(`${a.title}${a.effect}${a.why}`).not.toMatch(/[\u2013\u2014]/);
    expect(a.proposal!.changes).toHaveLength(1);
    expect(a.proposal!.changes[0]).toMatchObject({ plannedSessionId: 'hills', action: 'move', fromDate: '2026-10-31', toDate: '2026-10-31', templateId: 'tpl_test_run' });
  });

  it('applies as a replacement on the same row and day, locked by the Akkoord', () => {
    const a = retry()!;
    const lock = { by: 'proposal' as const, at: 'x' };
    const { sessions } = applyPlanChangeItems(a.proposal!.changes, plan(), undefined, lock);
    expect(sessions.find((s) => s.id === 'hills')).toMatchObject({ templateId: 'tpl_test_run', scheduledDate: '2026-10-31' });
    expect(sessions).toHaveLength(plan().length);
  });

  it('says how many stops when the standing still is short but frequent', () => {
    const a = retry({ logs: [testLog({ stops: 4, stoppedSec: 40 })] })!;
    expect(a.effect).toContain('had 4 keer stilstand');
  });

  it('stays quiet without much standing still', () => {
    expect(retry({ logs: [testLog({ stops: 3, stoppedSec: 60 })] })).toBeUndefined();
    expect(retry({ logs: [testLog({ stops: undefined, stoppedSec: undefined })] })).toBeUndefined();
  });

  it('speaks for a doubtful test that waits for an answer', () => {
    const earlier = { ...testLog({ stops: undefined, stoppedSec: undefined }), id: 'log-old', completedDate: '2026-10-06', completedAt: '2026-10-06T10:00:00Z', cardioData: { durationMinutes: 27, distanceKm: 5, source: 'manual' as const }, bestEffort: undefined, durationMinutes: 27 } as SessionLog;
    const slow = { ...testLog(), bestEffort: undefined, durationMinutes: 33, cardioData: { durationMinutes: 33, distanceKm: 5, source: 'manual' as const } } as SessionLog;
    const a = retry({ logs: [earlier, slow] })!;
    expect(a.effect).toContain('wacht nog op je antwoord');
    expect(a.id).toBe('retest:2026-10-27');
    // After "Telt mee" nothing waits and it has no stops, so no advice.
    expect(retry({ logs: [earlier, slow], testJudgments: [{ logId: 'log-test', verdict: 'counts', date: '2026-10-28' }] })).toBeUndefined();
  });

  it('stays quiet when the last test is older than 21 days', () => {
    expect(retry({ asOf: '2026-11-18' })).toBeUndefined();
  });

  it('stays quiet when another test is already planned in the next 14 days', () => {
    expect(retry({ plannedSessions: [...plan(), planned('again', 'tpl_test_run', '2026-11-08', '2026-11-02')] })).toBeUndefined();
  });

  it('has no advice without a suitable day within 10 days or less than 3 days after the test', () => {
    expect(retry({ plannedSessions: plan().filter((s) => s.id !== 'hills' && s.id !== 'tempo') })).toBeUndefined();
    expect(retry({ plannedSessions: [planned('far', 'tpl_tempo_run', '2026-11-09', '2026-11-09')] })).toBeUndefined();
    expect(retry({ plannedSessions: [planned('close', 'tpl_tempo_run', '2026-10-29', '2026-10-26')] })).toBeUndefined();
  });

  it('skips a day when a long run follows the next day (the day after a test stays easy) and takes the next hard run', () => {
    const a = retry({ plannedSessions: [...plan(), planned('long', 'tpl_long_run', '2026-11-01', '2026-10-26')] })!;
    expect(a.proposal!.changes[0].plannedSessionId).toBe('tempo');
  });

  it('skips a day right after a heavy leg day and takes the next hard run', () => {
    const legs = planned('legs', 'tpl_lower_a', '2026-10-30', '2026-10-26');
    const a = retry({ plannedSessions: [...plan().filter((s) => s.id !== 'upper'), legs] })!;
    expect(a.proposal!.changes[0].plannedSessionId).toBe('tempo');
    expect(a.title).toContain('wo 4 november');
  });

  it('is not asked again after Liever niet for the same test, but a newer test may ask', () => {
    expect(retry({ respondedIds: new Set(['retest:2026-10-27']) })).toBeUndefined();
  });

  it('stays quiet when the setting is off, when ill, or in the taper of a race', () => {
    expect(retry({ newTestOnStops: false })).toBeUndefined();
    expect(retry({ illnessEpisodes: [{ id: 'i', kind: 'above_neck', startDate: '2026-10-27' }] })).toBeUndefined();
    expect(retry({ plannedSessions: [...plan(), planned('race', 'tpl_race', '2026-11-07', '2026-11-02')] })).toBeUndefined();
  });

  it('does not touch a session that is logged or skipped', () => {
    const skipped = plan().map((s) => (s.id === 'hills' ? { ...s, status: 'skipped' as const } : s));
    expect(retry({ plannedSessions: skipped })!.proposal!.changes[0].plannedSessionId).toBe('tempo');
  });
});
