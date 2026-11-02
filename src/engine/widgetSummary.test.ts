import { describe, it, expect } from 'vitest';
import { widgetSummary, widgetShows } from './widgetSummary';
import { isHeavySession } from './illness';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';

const { templates } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const ps = (id: string, templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: '2026-11-02', status: 'planned', order: 0, ...extra });
const base = { logs: [] as SessionLog[], templateById: byId, program: null, leavePeriods: [], illnessEpisodes: [] };

describe('widgetSummary', () => {
  it('names the training of today with its minutes', () => {
    const s = widgetSummary({ ...base, today: '2026-11-04', sessions: [ps('a', 'tpl_easy_run', '2026-11-04')] });
    expect(s.date).toBe('2026-11-04');
    expect(s.title).toBe(byId.get('tpl_easy_run')!.name);
    expect(s.minutes).toBeGreaterThan(0);
  });
  it('says Rustdag without a training', () => {
    expect(widgetSummary({ ...base, today: '2026-11-04', sessions: [ps('a', 'tpl_easy_run', '2026-11-06')] })).toEqual({ date: '2026-11-04', title: 'Rustdag', kind: 'rest', tomorrowRest: true });
  });
  it('skips a skipped training and one that is done', () => {
    const skipped = widgetSummary({ ...base, today: '2026-11-04', sessions: [ps('a', 'tpl_easy_run', '2026-11-04', { status: 'skipped' })] });
    expect(skipped.title).toBe('Rustdag');
    const log = { id: 'l', plannedSessionId: 'a', templateId: 'tpl_easy_run' } as SessionLog;
    const done = widgetSummary({ ...base, logs: [log], today: '2026-11-04', sessions: [ps('a', 'tpl_easy_run', '2026-11-04')] });
    expect(done.title).toBe(byId.get('tpl_easy_run')!.name);
    expect(done.done).toBe(true);
  });
  it('says Vakantie on a holiday', () => {
    const s = widgetSummary({ ...base, today: '2026-11-04', sessions: [ps('a', 'tpl_easy_run', '2026-11-04')], leavePeriods: [{ id: 'p', kind: 'no_training', startDate: '2026-11-03', endDate: '2026-11-06' } as never] });
    expect(s).toEqual({ date: '2026-11-04', title: 'Vakantie', kind: 'rest', tomorrowRest: true });
  });
  it('says Rust vandaag (not Ziek) while ill with a fever', () => {
    const s = widgetSummary({ ...base, today: '2026-11-04', sessions: [ps('a', 'tpl_easy_run', '2026-11-04')], illnessEpisodes: [{ id: 'i', kind: 'below_neck', startDate: '2026-11-03' } as never] });
    expect(s).toEqual({ date: '2026-11-04', title: 'Rust vandaag', kind: 'rest' });
  });
  it('shows a light training while ill above the neck, like Vandaag', () => {
    const light = templates.find((t) => t.type !== 'recovery' && !isHeavySession(t))!;
    const s = widgetSummary({ ...base, today: '2026-11-04', sessions: [ps('a', light.id, '2026-11-04')], illnessEpisodes: [{ id: 'i', kind: 'above_neck', startDate: '2026-11-03' } as never] });
    expect(s.title).toBe(light.name);
  });
  it('a heavy training is not shown while ill above the neck', () => {
    const heavy = templates.find((t) => t.type !== 'recovery' && isHeavySession(t))!;
    const s = widgetSummary({ ...base, today: '2026-11-04', sessions: [ps('a', heavy.id, '2026-11-04')], illnessEpisodes: [{ id: 'i', kind: 'above_neck', startDate: '2026-11-03' } as never] });
    expect(s.title).toBe('Rust vandaag');
  });
  it('after midnight the stored summary no longer shows', () => {
    const s = widgetSummary({ ...base, today: '2026-11-04', sessions: [ps('a', 'tpl_easy_run', '2026-11-04')] });
    expect(widgetShows(s, '2026-11-04')).toBe(true);
    expect(widgetShows(s, '2026-11-05')).toBe(false);
  });
  it('gives the kind for the icon', () => {
    expect(widgetSummary({ ...base, today: '2026-11-04', sessions: [ps('a', 'tpl_easy_run', '2026-11-04')] }).kind).toBe('run');
    const strength = templates.find((t) => t.type === 'strength')!;
    expect(widgetSummary({ ...base, today: '2026-11-04', sessions: [ps('a', strength.id, '2026-11-04')] }).kind).toBe('strength');
    expect(widgetSummary({ ...base, today: '2026-11-04', sessions: [ps('a', 'tpl_mountain_hike', '2026-11-04')] }).kind).toBe('mountain');
  });
  it('names tomorrow, or says rest', () => {
    const s = widgetSummary({ ...base, today: '2026-11-04', sessions: [ps('a', 'tpl_easy_run', '2026-11-04'), ps('b', 'tpl_mountain_hike', '2026-11-05')] });
    expect(s.tomorrow).toBe(byId.get('tpl_mountain_hike')!.name);
    expect(s.tomorrowRest).toBeUndefined();
    const rest = widgetSummary({ ...base, today: '2026-11-04', sessions: [ps('a', 'tpl_easy_run', '2026-11-04')] });
    expect(rest.tomorrow).toBeUndefined();
    expect(rest.tomorrowRest).toBe(true);
  });
  it('ignores a skipped training tomorrow', () => {
    const s = widgetSummary({ ...base, today: '2026-11-04', sessions: [ps('b', 'tpl_easy_run', '2026-11-05', { status: 'skipped' })] });
    expect(s.tomorrowRest).toBe(true);
  });
  it('does not mention tomorrow while ill', () => {
    const s = widgetSummary({ ...base, today: '2026-11-04', sessions: [ps('a', 'tpl_easy_run', '2026-11-04'), ps('b', 'tpl_mountain_hike', '2026-11-05')], illnessEpisodes: [{ id: 'i', kind: 'below_neck', startDate: '2026-11-03' } as never] });
    expect(s.title).toBe('Rust vandaag');
    expect(s.tomorrow).toBeUndefined();
    expect(s.tomorrowRest).toBeUndefined();
  });
  it('on holiday, tomorrow is rest when the holiday goes on and a training when it ends', () => {
    const sessions = [ps('b', 'tpl_easy_run', '2026-11-05')];
    const leavePeriods = [{ id: 'p', kind: 'no_training', startDate: '2026-11-03', endDate: '2026-11-04' } as never];
    const ends = widgetSummary({ ...base, today: '2026-11-04', sessions, leavePeriods });
    expect(ends.tomorrow).toBe(byId.get('tpl_easy_run')!.name);
    const goes = widgetSummary({ ...base, today: '2026-11-04', sessions, leavePeriods: [{ id: 'p', kind: 'no_training', startDate: '2026-11-03', endDate: '2026-11-06' } as never] });
    expect(goes.tomorrowRest).toBe(true);
  });
  it('a done training keeps its name and minutes, with tomorrow below', () => {
    const log = { id: 'l', plannedSessionId: 'a', templateId: 'tpl_easy_run' } as SessionLog;
    const s = widgetSummary({ ...base, logs: [log], today: '2026-11-04', sessions: [ps('a', 'tpl_easy_run', '2026-11-04'), ps('b', 'tpl_mountain_hike', '2026-11-05')] });
    expect(s.done).toBe(true);
    expect(s.kind).toBe('run');
    expect(s.minutes).toBeGreaterThan(0);
    expect(s.tomorrow).toBe(byId.get('tpl_mountain_hike')!.name);
  });
  it('a done training while ill stays Rust vandaag', () => {
    const log = { id: 'l', plannedSessionId: 'a', templateId: 'tpl_easy_run' } as SessionLog;
    const s = widgetSummary({ ...base, logs: [log], today: '2026-11-04', sessions: [ps('a', 'tpl_easy_run', '2026-11-04')], illnessEpisodes: [{ id: 'i', kind: 'below_neck', startDate: '2026-11-03' } as never] });
    expect(s.title).toBe('Rust vandaag');
    expect(s.done).toBeUndefined();
  });
});
