import { describe, it, expect } from 'vitest';
import { looseLogsOfWeek, weekDoneMinutes, weekLogsOf, weekOpenMinutes, weekTime } from './weekLogs';
import { buildWeekReview } from './weekReview';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { Program } from '../models/program';

const { templates } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const program: Program = { id: 'p', name: 'P', startDate: '2026-09-28', phases: [{ id: 'phase_1', name: 'BASISFASE', order: 1, weekCount: 4 }, { id: 'phase_2', name: 'OPBOUW', order: 2, weekCount: 4 }] };
const W = '2026-10-05'; // maandag
const ps = (id: string, templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: W, status: 'planned', order: 0, ...extra });
let n = 0;
const log = (templateId: string, date: string, minutes: number, extra: Partial<SessionLog> = {}): SessionLog => ({
  id: `l${n++}`, templateId, type: byId.get(templateId)!.type, completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: minutes, source: 'manual', ...extra,
});
const minutesOf = (_s: PlannedSession, t: { durationVariants: { full: number } }) => t.durationVariants.full;

const week = [
  ps('rest', 'tpl_herstel', '2026-10-05'), ps('ua', 'tpl_upper_a', '2026-10-06'), ps('er', 'tpl_easy_run', '2026-10-08'), ps('lr', 'tpl_long_run', '2026-10-11'),
];

describe('weekLogsOf: wat in een week gedaan is', () => {
  it('telt op de dag van doen, met of zonder plan, en geen rustdag', () => {
    const logs = [
      log('tpl_upper_a', '2026-10-06', 50, { plannedSessionId: 'ua' }),
      log('tpl_easy_run', '2026-10-07', 40), // los
      log('tpl_herstel', '2026-10-05', 30), // een rustdag telt niet
      log('tpl_easy_run', '2026-10-04', 20), // de week ervoor
      log('tpl_easy_run', '2026-10-12', 20), // de week erna
    ];
    expect(weekLogsOf(logs, byId, W).map((l) => l.completedDate)).toEqual(['2026-10-06', '2026-10-07']);
    expect(weekDoneMinutes(logs, byId, W)).toBe(90);
  });
});

describe('looseLogsOfWeek: logs zonder geplande training op Week', () => {
  it('neemt een log zonder plannedSessionId, en een met een planning die er niet meer is', () => {
    const own = log('tpl_upper_a', '2026-10-06', 50, { plannedSessionId: 'ua' });
    const loose = log('tpl_easy_run', '2026-10-09', 45);
    const orphan = log('tpl_easy_run', '2026-10-07', 30, { plannedSessionId: 'weg' });
    expect(looseLogsOfWeek([own, loose, orphan], week, W)).toEqual([orphan, loose]);
  });

  it('alleen die van deze week, op volgorde van dag en tijd', () => {
    const a = log('tpl_easy_run', '2026-10-08', 30, { completedAt: '2026-10-08T18:00:00Z' });
    const b = log('tpl_easy_run', '2026-10-08', 30, { completedAt: '2026-10-08T07:00:00Z' });
    const other = log('tpl_easy_run', '2026-10-13', 30);
    expect(looseLogsOfWeek([a, other, b], week, W)).toEqual([b, a]);
  });

  it('een gedane geplande training in een andere week is niet los', () => {
    const next = ps('volgende', 'tpl_upper_b', '2026-10-12', { weekStartDate: '2026-10-12' });
    const doneEarly = log('tpl_upper_b', '2026-10-11', 40, { plannedSessionId: 'volgende' });
    expect(looseLogsOfWeek([doneEarly], [...week, next], W)).toEqual([]);
  });

  it('een rustdag zonder plan staat er ook bij: het is gedaan, ook als het niet meetelt', () => {
    const walk = log('tpl_herstel', '2026-10-10', 35);
    expect(looseLogsOfWeek([walk], week, W)).toEqual([walk]);
    expect(weekDoneMinutes([walk], byId, W)).toBe(0);
  });
});

describe('weekTime: de tijd bovenaan Week', () => {
  it('telt een overgeslagen training en een rustdag niet, een gedane met de echte duur', () => {
    const run = ps('r', 'tpl_easy_run', '2026-10-05');
    const skipped = ps('s', 'tpl_upper_b', '2026-10-09', { status: 'skipped' });
    const open = ps('o', 'tpl_long_run', '2026-10-11');
    const rest = ps('x', 'tpl_herstel', '2026-10-08');
    const done = log('tpl_easy_run', '2026-10-05', 33, { plannedSessionId: 'r' });
    const open1 = tpl('tpl_long_run');
    expect(weekOpenMinutes([run, skipped, open, rest], [done], byId, minutesOf)).toBe(open1);
    expect(weekTime([run, skipped, open, rest], [done], byId, W, minutesOf)).toEqual({ doneMinutes: 33, totalMinutes: 33 + open1 });
  });

  it('een losse training telt mee in gedaan en in het totaal', () => {
    const open = ps('o', 'tpl_long_run', '2026-10-11');
    const loose = log('tpl_easy_run', '2026-10-07', 45);
    const t = weekTime([open], [loose], byId, W, minutesOf);
    expect(t.doneMinutes).toBe(45);
    expect(t.totalMinutes).toBe(45 + tpl('tpl_long_run'));
    expect(t.doneMinutes).toBeLessThanOrEqual(t.totalMinutes);
  });

  it('de gedane tijd is dezelfde als in de weekterugblik, ook met een losse training', () => {
    const logs = [
      log('tpl_upper_a', '2026-10-06', 52, { plannedSessionId: 'ua' }),
      log('tpl_easy_run', '2026-10-08', 31, { plannedSessionId: 'er' }),
      log('tpl_easy_run', '2026-10-09', 47), // los, bijvoorbeeld een Garmin-activiteit
      log('tpl_herstel', '2026-10-05', 25), // een rustdag telt niet
    ];
    const review = buildWeekReview({ weekStart: W, plannedSessions: week, logs, templates, program, planChangeLog: [], asOf: '2026-10-12' })!;
    const t = weekTime(week.filter((s) => s.scheduledDate >= W), logs, byId, W, minutesOf);
    expect(review.minutes).toBe(52 + 31 + 47);
    expect(t.doneMinutes).toBe(review.minutes);
  });
});

function tpl(id: string): number {
  return byId.get(id)!.durationVariants.full;
}
