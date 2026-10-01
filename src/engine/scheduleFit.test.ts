import { describe, it, expect } from 'vitest';
import { computeScheduleFit } from './scheduleFit';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { DailyTimeBudget, Weekday } from '../models/goalEngineConfig';

// Production feedback: Thursday was set to 10 minutes, so Upper A landed
// on Friday. Raising Thursday to 100 minutes changed nothing: "waarom
// schuift hij dan niet gelijk of geeft hij daar een optie voor?"
describe('computeScheduleFit — room freed up', () => {
  const { templates, program } = buildDefaultProgramData();
  const MON = '2026-09-28';
  const THU = '2026-10-01';
  const s = (id: string, templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession =>
    ({ id, templateId, scheduledDate: date, weekStartDate: MON, status: 'planned', order: 0, ...extra });
  const week = [
    s('herstel', 'tpl_herstel', MON),
    s('lowerA', 'tpl_lower_a', '2026-09-30'),
    s('easy', 'tpl_easy_run', THU),
    s('upperA', 'tpl_upper_a', '2026-10-02'),
    s('hills', 'tpl_hill_intervals', '2026-10-03'),
    s('long', 'tpl_long_run', '2026-10-04'),
    s('upperB', 'tpl_upper_b', '2026-10-04', { status: 'moved', movedFromDate: '2026-10-02' }),
  ];
  const logs = ['herstel', 'lowerA'].map((id): SessionLog => ({ id: `log-${id}`, plannedSessionId: id, templateId: 'x', type: 'strength', completedDate: MON, completedAt: `${MON}T10:00:00.000Z`, variant: 'full', durationMinutes: 60, source: 'manual' }));
  const budget = (thu: number): Partial<Record<Weekday, DailyTimeBudget>> => {
    const day = (m: number): DailyTimeBudget => ({ preferredMinutes: m, softFlexMinutes: Math.max(15, Math.round(m * 0.15)) });
    return { mon: day(75), tue: day(90), wed: day(75), thu: day(thu), fri: day(120), sat: day(200), sun: day(200) };
  };
  const fit = (thu: number) => computeScheduleFit({
    plannedSessions: week, templates, sessionLogs: logs, program, dailyTimeBudget: budget(thu), sameDayPairingPreference: 'automatic', asOf: THU, settingLabel: 'Trainingstijd per dag',
  });

  it('offers Upper A back to today once Thursday has room for it', () => {
    const { proposal } = fit(100);
    const upperA = proposal.changes.find((c) => c.plannedSessionId === 'upperA');
    expect(upperA).toMatchObject({ action: 'move', fromDate: '2026-10-02', toDate: THU });
    expect(proposal.consequences).toMatch(/eerder in de week/);
    // Never a day in the past, never two heavy upper days within 48 hours.
    const final = new Map(week.map((x) => [x.id, proposal.changes.find((c) => c.plannedSessionId === x.id)?.toDate ?? x.scheduledDate]));
    expect([...final.values()].every((d) => d >= MON)).toBe(true);
    const a = final.get('upperA')!;
    const b = final.get('upperB')!;
    expect(a < b).toBe(true);
    expect((new Date(b).getTime() - new Date(a).getTime()) / 86400000).toBeGreaterThanOrEqual(2);
  });

  it('proposes nothing while Thursday has no room', () => {
    expect(fit(10).proposal.changes).toEqual([]);
  });
});
