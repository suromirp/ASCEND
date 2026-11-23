import { describe, expect, it } from 'vitest';
import { pendingSportLogs } from './sportAsk';
import { withCountingSports } from './sportTemplate';
import { sportLogDays } from './sportDays';
import type { SessionLog } from '../models/training';

const today = '2026-11-20';
const log = (id: string, date: string, extra: Partial<SessionLog> = {}): SessionLog => ({
  id, templateId: 'sport_padel', type: 'cardio', countedSport: 'padel', completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: 60, source: 'manual', ...extra,
});

describe('pendingSportLogs: een log dat je zelf invulde, van een sport zonder rol', () => {
  it('geeft één vraag per sport, met het nieuwste log en hoeveel er zijn', () => {
    const q = pendingSportLogs([log('a', '2026-11-18'), log('b', '2026-11-19')], {}, today);
    expect(q).toHaveLength(1);
    expect(q[0].sport).toBe('padel');
    expect(q[0].log.id).toBe('b');
    expect(q[0].count).toBe(2);
  });
  it('leest ook een oud log dat de sport alleen in het templateId noemt', () => {
    expect(pendingSportLogs([log('a', '2026-11-19', { countedSport: undefined })], {}, today)).toHaveLength(1);
  });
  it('geen vraag zodra de sport een rol heeft, ook Negeren', () => {
    expect(pendingSportLogs([log('a', '2026-11-19')], { sportHandling: { padel: { role: 'count' } } }, today)).toEqual([]);
    expect(pendingSportLogs([log('a', '2026-11-19')], { sportHandling: { padel: { role: 'off' } } }, today)).toEqual([]);
  });
  it('geen vraag voor een log van het horloge, een oud log, een log in de toekomst of een andere training', () => {
    expect(pendingSportLogs([log('a', '2026-11-19', { externalId: 'x1' })], {}, today)).toEqual([]);
    expect(pendingSportLogs([log('a', '2026-10-01')], {}, today)).toEqual([]);
    expect(pendingSportLogs([log('a', '2026-11-25')], {}, today)).toEqual([]);
    expect(pendingSportLogs([log('a', '2026-11-19', { templateId: 'tpl_easy_run', countedSport: undefined })], {}, today)).toEqual([]);
  });
});

describe('een log zonder rol telt nergens mee', () => {
  it('zonder rol geen sportdag in de weekcheck, met rol wel', () => {
    const l = [log('a', '2026-11-19', { rpe: 7 })];
    const without = new Map(withCountingSports([], {}).map((t) => [t.id, t]));
    expect(sportLogDays(l, without, today).sessions).toEqual([]);
    const withRole = new Map(withCountingSports([], { sportHandling: { padel: { role: 'count' } } }).map((t) => [t.id, t]));
    expect(sportLogDays(l, withRole, today).sessions).toHaveLength(1);
  });
});
