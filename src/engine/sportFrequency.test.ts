import { describe, it, expect } from 'vitest';
import { computeSportFrequencyPlan, lightestTemplateOf } from './sportFrequency';
import type { PlannedSession, SessionTemplate, SessionLog } from '../models/training';

const asOf = '2026-10-12'; // Monday
const week = '2026-10-12';
const stress = (lowerBodyLoad: 'none' | 'light' | 'moderate' | 'heavy') => ({ lowerBodyLoad, impact: 'none', eccentricLoad: 'none', intensity: 'low' }) as const;
const templates: SessionTemplate[] = [
  { id: 'easy', name: 'Easy Run', type: 'cardio', durationVariants: { full: 30 }, baseStressProfile: stress('light') },
  { id: 'hill', name: 'Heuvelintervallen', type: 'cardio', durationVariants: { full: 35 }, baseStressProfile: stress('heavy') },
  { id: 'bike', name: 'Fietstocht', type: 'cardio', sport: 'cycling', durationVariants: { full: 90 }, baseStressProfile: stress('moderate') },
  { id: 'upper', name: 'Upper A', type: 'strength', durationVariants: { full: 60 }, baseStressProfile: stress('none') },
];
const ps = (id: string, templateId: string, date: string): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: week, status: 'planned', order: 0 });
const base = { templates, sessionLogs: [] as SessionLog[], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic' as const, asOf };

describe('computeSportFrequencyPlan', () => {
  it('adds the sport’s lightest session on free days until the week has the number', () => {
    const planned = [ps('u', 'upper', '2026-10-13')];
    const { proposal, shortWeeks } = computeSportFrequencyPlan({ ...base, sport: 'cycling', perWeek: 2, plannedSessions: planned });
    const adds = proposal.changes.filter((c) => c.action === 'add');
    expect(adds).toHaveLength(2);
    expect(adds.every((c) => c.newSessionDraft?.templateId === 'bike')).toBe(true);
    expect(new Set(adds.map((c) => c.newSessionDraft?.scheduledDate)).size).toBe(2);
    expect(adds.some((c) => c.newSessionDraft?.scheduledDate === '2026-10-13')).toBe(false); // that day already had a session
    expect(shortWeeks).toBe(0);
  });

  it('removes the lightest first and never a logged session', () => {
    const planned = [ps('e', 'easy', '2026-10-13'), ps('h', 'hill', '2026-10-17'), ps('e2', 'easy', '2026-10-15')];
    const logs: SessionLog[] = [{ id: 'l', plannedSessionId: 'e', templateId: 'easy', type: 'cardio', completedDate: '2026-10-13', completedAt: '2026-10-13T08:00:00Z', variant: 'full', durationMinutes: 30, source: 'manual' }];
    const { proposal } = computeSportFrequencyPlan({ ...base, sport: 'running', perWeek: 2, plannedSessions: planned, sessionLogs: logs });
    expect(proposal.changes).toEqual([expect.objectContaining({ plannedSessionId: 'e2', action: 'remove' })]);
  });

  it('says plainly when it doesn’t fit instead of forcing a second session on a full day', () => {
    const full = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'].map((d, i) => ps(`u${i}`, 'upper', d));
    const { proposal, shortWeeks } = computeSportFrequencyPlan({ ...base, sport: 'cycling', perWeek: 1, plannedSessions: full });
    expect(proposal.changes).toEqual([]);
    expect(shortWeeks).toBe(1);
    expect(proposal.consequences).toContain('Past eigenlijk niet');
  });

  it('picks the lightest template of a sport to add', () => {
    expect(lightestTemplateOf('running', templates)?.id).toBe('easy');
  });
});
