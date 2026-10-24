// Een rustweek terugzetten of doortrainen, of een week herhalen, raakt alleen
// wat nog open is (docs/beslissingen/2026-10-24-rustweek-via-voorstel.md).
// Nagemaakte gegevens: het standaardprogramma met een basis van vier weken.
import { describe, it, expect } from 'vitest';
import { restWeekChange, withRestWeekSkipped } from './restWeek';
import { repeatWeekChange, withWeekRepeated } from './repeatWeek';
import { PHASE_BASIS, PHASE_BERG, layoutPhasesForGoal } from './programLayout';
import { resolveVariantDuration } from './substitutions';
import { changeStart, doneSentence, type WeekLoadContext } from './weekLoadChange';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { addDays, resolveProgramWeek } from '../utils/dates';
import type { Program } from '../models/program';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';

const { templates } = buildDefaultProgramData();
const START = '2026-09-28';
// Basis 4 weeks: the rest week is 19 Oct; the Opbouw starts 26 Oct, its rest week is 16 Nov.
const program: Program = { id: 'p', name: 'P', startDate: START, phases: layoutPhasesForGoal(START, '2027-08-01', { [PHASE_BASIS]: 4 })! };
const REST = '2026-10-19';
const W2 = '2026-11-02';

// A plain week: a rest day, upper body, an easy run, hill intervals and the long run.
const DAYS: [string, number][] = [['tpl_herstel', 0], ['tpl_upper_a', 1], ['tpl_easy_run', 3], ['tpl_hill_intervals', 5], ['tpl_long_run', 6]];
const weekOf = (monday: string): PlannedSession[] => DAYS.map(([templateId, d], i) => ({
  id: `${monday}-${templateId}`, templateId, scheduledDate: addDays(monday, d), weekStartDate: monday, status: 'planned' as const, order: i,
}));
const sessions = ['2026-10-12', REST, '2026-10-26', W2, '2026-11-09'].flatMap(weekOf);
const logOf = (s: PlannedSession): SessionLog => ({
  id: `log-${s.id}`, plannedSessionId: s.id, templateId: s.templateId, type: 'cardio', completedDate: s.scheduledDate,
  completedAt: `${s.scheduledDate}T18:00:00Z`, variant: 'full', durationMinutes: 40, source: 'manual',
});
// The minutes as the screens read them, without the duration registers.
const minutesOf = (s: PlannedSession, t: SessionTemplate, p: Program) => resolveVariantDuration(t, 'full', s.scheduledDate, p);
const ctx = (over: Partial<WeekLoadContext> = {}): WeekLoadContext => ({ sessions, logs: [], templates, today: REST, minutesOf, ...over });
const byId = (id: string) => sessions.find((s) => s.id === id)!;
const minutesAt = (p: Program, id: string) => minutesOf(byId(id), templates.find((t) => t.id === byId(id).templateId)!, p);

describe('wanneer een wijziging van de week ingaat', () => {
  it('niet voor vandaag, en pas na de laatste training van de week die je deed', () => {
    expect(changeStart(REST, '2026-10-18', sessions, [])).toBe(REST);
    expect(changeStart(REST, '2026-10-22', sessions, [])).toBe('2026-10-22');
    // Saturday: the hill intervals of today are done, so it starts on Sunday.
    expect(changeStart(REST, '2026-10-24', sessions, [logOf(byId(`${REST}-tpl_hill_intervals`))])).toBe('2026-10-25');
  });
});

describe('doortrainen of de rustweek terugzetten', () => {
  it('voor de week begint: alle trainingen die een andere lengte krijgen tellen mee', () => {
    const c = restWeekChange(program, REST, true, ctx({ today: '2026-10-18' }));
    expect(c.state).toBe('open');
    expect(c.open.length).toBeGreaterThan(0);
    expect(c.heavier).toBe(true);
    expect(c.program.skippedRestWeeks).toEqual([REST]);
    expect(c.program.heldWeekDays).toBeUndefined();
    expect(c.sentence).toMatch(/^Maakt de (\d+ trainingen die nog komen|training die nog komt) deze week zwaarder\.$/);
    expect(c.lines).toHaveLength(c.open.length);
    expect(c.lines.some((l) => /^Lange duurloop op zo 25 oktober: \d+ naar \d+ minuten/.test(l))).toBe(true);
  });

  it('midden in de week: een gedane of voorbije training verandert nooit', () => {
    const skipped = withRestWeekSkipped(program, REST, true);
    const tuesday = `${REST}-tpl_upper_a`;
    const thursday = `${REST}-tpl_easy_run`;
    const sunday = `${REST}-tpl_long_run`;
    // Thursday evening: the easy run is done.
    const c = restWeekChange(skipped, REST, false, ctx({ today: '2026-10-22', logs: [logOf(byId(thursday))] }));
    expect(c.state).toBe('open');
    expect(c.heavier).toBe(false);
    expect(c.open.map((s) => s.id)).not.toContain(thursday);
    expect(c.open.map((s) => s.id)).toContain(sunday);
    expect(c.sentence).toContain('lichter');
    // What was done or past keeps its length; what is still open changes.
    for (const id of [tuesday, thursday]) expect(minutesAt(c.program, id)).toBe(minutesAt(skipped, id));
    expect(minutesAt(c.program, sunday)).toBe(minutesAt(program, sunday));
    expect(minutesAt(c.program, sunday)).toBeLessThan(minutesAt(skipped, sunday));
  });

  it('wat je zelf vastzette houdt zijn lengte', () => {
    const lock = { by: 'user' as const, at: '2026-10-18T08:00:00Z' };
    const sunday = `${REST}-tpl_long_run`;
    const mine = sessions.map((s) => (s.id === sunday ? { ...s, lock } : s));
    const c = restWeekChange(program, REST, true, ctx({ sessions: mine, today: '2026-10-18' }));
    expect(c.open.map((s) => s.id)).not.toContain(sunday);
    expect(c.kept).toEqual([{ session: mine.find((s) => s.id === sunday), minutes: minutesAt(program, sunday) }]);
    expect(c.keptLines[0]).toContain('zette je zelf vast');
  });

  it('wat je zelf vastzette noemt ook de hoogtemeters en de rugzak die meegaan', () => {
    // The second week of the mountain phase again: the week after it gets the
    // load of this one, also a mountain hike of yours on its Sunday.
    const second = Array.from({ length: 60 }, (_, k) => addDays(START, 7 * k))
      .find((m) => resolveProgramWeek(program, m)?.phase.id === PHASE_BERG && resolveProgramWeek(program, m)?.weekInPhase === 2)!;
    const next = addDays(second, 7);
    const hike: PlannedSession = {
      id: 'hike', templateId: 'tpl_mountain_hike', scheduledDate: addDays(next, 6), weekStartDate: next, status: 'planned', order: 0,
      plannedMinutes: 165, lock: { by: 'user', at: `${second}T08:00:00Z` },
    };
    const c = repeatWeekChange(program, second, true, ctx({ sessions: [hike], today: second }));
    expect(c.kept).toEqual([]);
    expect(c.keptLines).toEqual([expect.stringMatching(/^Bergtocht op zo .+ zette je zelf vast; die houdt zijn lengte, maar gaat van 9 naar 7 kg rugzak\.$/)]);
  });

  it('zaterdagavond na de laatste training: niets meer open, dus geen knop maar een zin', () => {
    const skipped = withRestWeekSkipped(program, REST, true);
    const week = sessions.filter((s) => s.weekStartDate === REST && s.templateId !== 'tpl_long_run');
    const logs = week.filter((s) => s.scheduledDate <= '2026-10-24').map(logOf);
    // Sunday is a rest day in this week.
    const c = restWeekChange(skipped, REST, false, ctx({ sessions: sessions.filter((s) => s.id !== `${REST}-tpl_long_run`), logs, today: '2026-10-24' }));
    expect(c.state).toBe('done');
    expect(c.open).toEqual([]);
    expect(c.sentence).toBe('Deze week is al zo goed als klaar; de volgende rustweek komt over 4 weken.');
  });

  it('een voorbije week verandert niet meer', () => {
    const c = restWeekChange(withRestWeekSkipped(program, REST, true), REST, false, ctx({ today: '2026-10-27' }));
    expect(c.state).toBe('past');
    expect(c.open).toEqual([]);
  });
});

describe('deze week nog een keer, of de herhaling terugzetten', () => {
  it('maakt wat nog komt lichter, ook in de week erna van dezelfde golf', () => {
    const c = repeatWeekChange(program, W2, true, ctx({ today: W2 }));
    expect(c.state).toBe('open');
    expect(c.heavier).toBe(false);
    expect(c.open.some((s) => s.weekStartDate === '2026-11-09')).toBe(true);
    expect(c.sentence).toContain('lichter');
  });

  it('midden in de week terugzetten raakt de gedane dagen niet', () => {
    const repeated = withWeekRepeated(program, W2, true);
    const tuesday = `${W2}-tpl_upper_a`;
    const thursday = `${W2}-tpl_easy_run`;
    const c = repeatWeekChange(repeated, W2, false, ctx({ today: '2026-11-06', logs: [logOf(byId(thursday))] }));
    expect(c.heavier).toBe(true);
    for (const id of [tuesday, thursday]) expect(minutesAt(c.program, id)).toBe(minutesAt(repeated, id));
    expect(minutesAt(c.program, `${W2}-tpl_long_run`)).toBe(minutesAt(program, `${W2}-tpl_long_run`));
  });

  it('een voorbije week niet meer', () => {
    const c = repeatWeekChange(withWeekRepeated(program, W2, true), W2, false, ctx({ today: '2026-11-17' }));
    expect(c.state).toBe('past');
  });
});

describe('de zin als de week klaar is', () => {
  it('noemt de volgende rustweek', () => {
    expect(doneSentence(program, '2026-11-09')).toBe('Deze week is al zo goed als klaar; de volgende rustweek komt volgende week.');
    expect(doneSentence(program, W2)).toBe('Deze week is al zo goed als klaar; de volgende rustweek komt over 2 weken.');
  });
});
