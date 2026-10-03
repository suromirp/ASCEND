import { describe, it, expect } from 'vitest';
import { planIllnessStart, planIllnessEnd, recoveryRamp, isIllnessDay, activeIllness, rampDays } from './illness';
import { computeReadiness } from './readiness';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { IllnessEpisode } from '../models/illness';

const { templates } = buildDefaultProgramData();
const MON = '2026-10-05';
const s = (id: string, templateId: string, date: string): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: MON, status: 'planned', order: 0 });
const week = [
  s('herstel', 'tpl_herstel', '2026-10-05'),
  s('upperA', 'tpl_upper_a', '2026-10-06'),
  s('lowerA', 'tpl_lower_a', '2026-10-07'),
  s('easy', 'tpl_easy_run', '2026-10-08'),
  s('upperB', 'tpl_upper_b', '2026-10-09'),
  s('hills', 'tpl_hill_intervals', '2026-10-10'),
  s('long', 'tpl_long_run', '2026-10-11'),
];
const removed = (ids: (string | undefined)[]) => ids.filter(Boolean).sort();

describe('planIllnessStart', () => {
  it('fever or below the neck: rest, today and tomorrow come off', () => {
    const p = planIllnessStart('below_neck', week, templates, [], '2026-10-07');
    expect(removed(p.changes.map((c) => c.plannedSessionId))).toEqual(['easy', 'lowerA']);
    expect(p.changes.every((c) => c.action === 'remove')).toBe(true);
  });

  it('a cold above the neck: only the heavy sessions come off, easy ones stay', () => {
    const p = planIllnessStart('above_neck', week, templates, [], '2026-10-07');
    expect(removed(p.changes.map((c) => c.plannedSessionId))).toEqual(['lowerA']);
  });

  it('never touches what is already logged', () => {
    const logs: SessionLog[] = [{ id: 'l', plannedSessionId: 'lowerA', templateId: 'tpl_lower_a', type: 'strength', completedDate: '2026-10-07', completedAt: '2026-10-07T08:00:00.000Z', variant: 'full', durationMinutes: 70, source: 'manual' }];
    expect(planIllnessStart('below_neck', week, templates, logs, '2026-10-07').changes.map((c) => c.plannedSessionId)).toEqual(['easy']);
  });
});

describe('weer beter', () => {
  const episode: IllnessEpisode = { id: 'i', kind: 'below_neck', startDate: '2026-10-05' };

  it('clears what was missed while ill and keeps the heavy sessions out for the first half of building back', () => {
    // Ill Mon-Wed (3 days), better on Thu: build back for 5 days (1.5 per day ill).
    expect(rampDays(episode, '2026-10-08')).toBe(5);
    const { proposal, ramp } = planIllnessEnd(episode, '2026-10-08', week, templates, []);
    expect(ramp.until).toBe('2026-10-13');
    expect(ramp.heavyFrom).toBe('2026-10-12');
    // Missed Mon-Wed off; Upper B (Fri), hills (Sat), long run (Sun) are heavy, inside the first half.
    expect(removed(proposal.changes.map((c) => c.plannedSessionId))).toEqual(['herstel', 'hills', 'long', 'lowerA', 'upperA', 'upperB']);
  });

  it('a cold above the neck only gets a short build-back', () => {
    expect(rampDays({ ...episode, kind: 'above_neck' }, '2026-10-12')).toBe(2);
  });

  it('shows the build-back card until it is over', () => {
    const ended = [{ ...episode, endDate: '2026-10-08' }];
    expect(recoveryRamp(ended, '2026-10-10')?.daysLeft).toBe(4);
    expect(recoveryRamp(ended, '2026-10-14')).toBeUndefined();
    expect(activeIllness(ended)).toBeUndefined();
  });
});

describe('ill days never count as missed', () => {
  it('consistency leaves out sessions planned while ill', () => {
    const episodes: IllnessEpisode[] = [{ id: 'i', kind: 'below_neck', startDate: '2026-10-06' }];
    const logs: SessionLog[] = [{ id: 'l', plannedSessionId: 'herstel', templateId: 'tpl_herstel', type: 'recovery', completedDate: MON, completedAt: `${MON}T08:00:00.000Z`, variant: 'full', durationMinutes: 45, source: 'manual' }];
    const asOf = '2026-10-08';
    expect(isIllnessDay('2026-10-07', episodes, asOf)).toBe(true);
    const r = computeReadiness(logs, week, 28, asOf, MON, (d) => isIllnessDay(d, episodes, asOf));
    expect(r.consistency).toBe(100);
    expect(computeReadiness(logs, week, 28, asOf, MON).consistency).toBe(33);
  });
});

describe('no catching up while ill', () => {
  it('the coach proposes no catch-up while ill or building back', async () => {
    const { computeAdvice } = await import('./adviceEngine');
    const base = { logs: [], plannedSessions: week, templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic' as const, respondedIds: new Set<string>(), asOf: '2026-10-09' };
    expect(computeAdvice(base).some((a) => a.ruleId === 'MISSED-CATCH-UP')).toBe(true);
    const ill = computeAdvice({ ...base, illnessEpisodes: [{ id: 'i', kind: 'above_neck', startDate: '2026-10-09' }] });
    expect(ill.some((a) => a.ruleId === 'MISSED-CATCH-UP')).toBe(false);
  });
});
