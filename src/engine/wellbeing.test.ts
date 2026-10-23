import { describe, it, expect } from 'vitest';
import { checkInEffect, morningSignals, recentPainSpot, shouldAskCheckIn, tiredStreak } from './wellbeing';
import { hasSignificantPain, isStopPain, painReports } from './pain';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';

const { templates } = buildDefaultProgramData();
const log = (date: string, extra: Partial<SessionLog> = {}): SessionLog => ({ id: `l-${date}`, templateId: 'tpl_easy_run', type: 'cardio', completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: 40, source: 'manual', ...extra });
const ps = (id: string, templateId: string, date: string): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: '2026-11-02', status: 'planned', order: 0 });

describe('pain on a spot', () => {
  it('1 or 2 holds nothing back, 3 or more does; older logs without a score count as 4', () => {
    expect(hasSignificantPain(log('2026-11-01', { painReports: [{ area: 'Knie', score: 2 }] }))).toBe(false);
    expect(hasSignificantPain(log('2026-11-01', { painReports: [{ area: 'Knie', score: 3 }] }))).toBe(true);
    expect(painReports(log('2026-11-01', { painAreas: ['Kuit'] }))).toEqual([{ area: 'Kuit', score: 4 }]);
    // Worse while going on, or on a bone: never acceptable pain.
    expect(hasSignificantPain(log('2026-11-01', { painReports: [{ area: 'Scheen', score: 2, onBone: true }] }))).toBe(true);
    expect(isStopPain({ area: 'Knie', score: 6 })).toBe(true);
    expect(isStopPain({ area: 'Knie', score: 4 })).toBe(false);
  });
});

describe('the morning check-in', () => {
  it('is asked on a training day and the day after heavy legs or pain, once a day', () => {
    expect(shouldAskCheckIn('2026-11-03', [], [], [ps('a', 'tpl_easy_run', '2026-11-03')], templates)).toBe(true);
    expect(shouldAskCheckIn('2026-11-03', [], [], [], templates)).toBe(false);
    expect(shouldAskCheckIn('2026-11-03', [], [log('2026-11-02', { templateId: 'tpl_lower_a', type: 'strength' })], [], templates)).toBe(true);
    expect(shouldAskCheckIn('2026-11-03', [{ date: '2026-11-03', allNormal: true }], [], [ps('a', 'tpl_easy_run', '2026-11-03')], templates)).toBe(false);
  });

  it('reads soreness, fatigue and a worse pain spot apart', () => {
    expect(morningSignals({ date: 'd', legs: 'spierpijn', energy: 'gewoon', sleep: 'goed' }, [])).toMatchObject({ sore: 'spierpijn', negatives: 0, rest: false });
    expect(morningSignals({ date: 'd', legs: 'fris', energy: 'moe', sleep: 'slecht' }, []).rest).toBe(true);
    expect(morningSignals({ date: 'd', legs: 'fris', energy: 'op', sleep: 'goed' }, []).rest).toBe(true);
    const logs = [log('2026-11-02', { painReports: [{ area: 'Knie', score: 3 }] })];
    expect(recentPainSpot('2026-11-03', logs)).toMatchObject({ area: 'Knie', lastScore: 3 });
    expect(morningSignals({ date: '2026-11-03', legs: 'fris', energy: 'fit', sleep: 'goed', spot: { area: 'Knie', score: 5 } }, logs).spotWorse).toMatchObject({ score: 5, lastScore: 3 });
    expect(morningSignals({ date: '2026-11-03', legs: 'fris', energy: 'fit', sleep: 'goed', spot: { area: 'Knie', score: 3 } }, logs).spotWorse).toBeUndefined();
  });

  it('counts tired mornings in a row', () => {
    const c = (date: string, energy: 'moe' | 'fit') => ({ date, legs: 'fris' as const, energy, sleep: 'goed' as const });
    expect(tiredStreak('2026-11-05', [c('2026-11-03', 'moe'), c('2026-11-04', 'moe'), c('2026-11-05', 'moe')])).toBe(3);
    expect(tiredStreak('2026-11-05', [c('2026-11-03', 'moe'), c('2026-11-04', 'fit'), c('2026-11-05', 'moe')])).toBe(1);
  });
});

describe('MORNING-CHECK: how the planning reacts', () => {
  const planned = [ps('legs', 'tpl_lower_a', '2026-11-04'), ps('easy', 'tpl_easy_run', '2026-11-05'), ps('upper', 'tpl_upper_b', '2026-11-06')];
  const inputs = (over: Partial<AdviceInputs>): AdviceInputs => ({ logs: [], plannedSessions: planned, templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: '2026-11-03', ...over });
  const morning = (over: Partial<AdviceInputs>) => computeAdvice(inputs(over)).filter((a) => a.ruleId === 'MORNING-CHECK');

  it('soreness moves the heavy legs of tomorrow on, as a proposal', () => {
    const [a] = morning({ checkIns: [{ date: '2026-11-03', legs: 'spierpijn', energy: 'gewoon', sleep: 'goed' }] });
    expect(a.title).toContain('Benen A');
    expect(a.proposal!.changes[0]).toMatchObject({ plannedSessionId: 'legs', action: 'move' });
  });

  it('more than one good day: options to choose from, the nearest first', () => {
    const roomy = [ps('legs', 'tpl_lower_a', '2026-11-04'), ps('upper', 'tpl_upper_b', '2026-11-06')];
    const [a] = morning({ plannedSessions: roomy, checkIns: [{ date: '2026-11-03', legs: 'spierpijn', energy: 'gewoon', sleep: 'goed' }] });
    expect(a.options!.length).toBeGreaterThan(1);
    expect(a.options![0].proposal).toBe(a.proposal);
    const dates = a.options!.map((o) => o.proposal.changes[0].toDate!);
    expect([...dates].sort()).toEqual(dates);
    expect(a.options!.every((o) => o.label.startsWith('Benen A'))).toBe(true);
  });

  it('all normal, or one tired signal without a hard session today: nothing', () => {
    expect(morning({ checkIns: [{ date: '2026-11-03', allNormal: true }] })).toEqual([]);
    expect(morning({ checkIns: [{ date: '2026-11-03', legs: 'fris', energy: 'moe', sleep: 'goed' }] })).toEqual([]);
  });

  it('a calm day with an easy run on the card says why the run stays', () => {
    const today = [ps('easy', 'tpl_easy_run', '2026-11-03')];
    const [a] = morning({ plannedSessions: today, checkIns: [{ date: '2026-11-03', legs: 'flink', energy: 'op', sleep: 'slecht' }] });
    expect(a.title).toBe('Een rustige dag');
    expect(a.effect).toContain('blijft op je kaart staan');
    expect(a.effect).not.toMatch(/^Er staat vandaag niets zwaars\. Houd het zo/);
    // Without a session today the plain advice stays.
    const [b] = morning({ plannedSessions: [], checkIns: [{ date: '2026-11-03', legs: 'flink', energy: 'op', sleep: 'slecht' }] });
    expect(b.effect).toContain('een wandeling of rustig fietsen is genoeg');
  });

  it('a pain spot worse this morning: two to three days without running on it', () => {
    const logs = [log('2026-11-02', { painReports: [{ area: 'Achillespees', score: 2 }] })];
    const [a] = morning({ logs, checkIns: [{ date: '2026-11-03', legs: 'fris', energy: 'fit', sleep: 'goed', spot: { area: 'Achillespees', score: 4 } }] });
    expect(a.title).toContain('Achillespees vanochtend 4');
    expect(a.effect).toContain('2 tot 3 dagen');
  });
});

describe('wat je antwoord doet', () => {
  it('zegt vooraf wat ASCEND ermee doet, in dezelfde regels als het advies', () => {
    expect(checkInEffect({ legs: 'fris', energy: 'gewoon', sleep: 'goed' })).toBe('Je planning blijft zoals hij is.');
    expect(checkInEffect({ legs: 'fris', energy: 'moe', sleep: 'goed' })).toContain('blijft zoals hij is');
    expect(checkInEffect({ legs: 'spierpijn', energy: 'gewoon', sleep: 'goed' })).toContain('beendag een dag op te schuiven');
    expect(checkInEffect({ legs: 'fris', energy: 'op', sleep: 'goed' })).toContain('rustige dag');
    expect(checkInEffect({ legs: 'fris', energy: 'moe', sleep: 'slecht' })).toContain('rustige dag');
  });
});
