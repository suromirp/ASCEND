import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { LeavePeriod } from '../models/leave';
import { addDays, daysBetween } from '../utils/dates';
import { planPass, type PlanPassContext } from './planPass';
import { withCountingSports } from './sportTemplate';
import { fixedInLeave, fixedLeaveNote, fixedSessionsForWeek, reconcileFixedSessions } from './fixedSports';
import { isLegHeavyTemplate } from './scheduler';
import { lockLevel, validateWeeks, hardDayLimit } from './weekValidator';
import { raceBlocks } from './raceBlock';
import { recentAdherence } from './onCourse';
import { planLeaveChange } from './leaveProposal';
import { autoTickMatch } from './autoTick';
import type { TrainingGoal } from '../models/goals';
import type { SportHandlingMap } from './sportRole';

// Sporten die meetellen, stap 7: de vaste dag. Nagemaakte weken.
const { templates: base } = buildDefaultProgramData();
const TODAY = '2026-11-02';
const football: SportHandlingMap = { football: { role: 'fixed', fixed: [{ day: 2, minutes: 60, intensity: 'moderate' }, { day: 6, minutes: 90, intensity: 'high' }] } };
const templates = withCountingSports(base, { sportHandling: football });
// Vijf trainingsdagen van ASCEND (wo tot en met zo), rust op maandag, en voetbal op di en za.
const DAYS: [number, string][] = [[2, 'tpl_lower_a'], [3, 'tpl_upper_a'], [4, 'tpl_easy_run'], [5, 'tpl_hill_intervals'], [6, 'tpl_long_run']];
const week = (monday: string): PlannedSession[] => DAYS.map(([d, templateId], i) => ({ id: `${monday}-${i}`, templateId, scheduledDate: addDays(monday, d), weekStartDate: monday, status: 'planned', order: i }));
const sessions = [...week('2026-11-02'), ...week('2026-11-09'), ...week('2026-11-16')];
let n = 0;
const ctx = (over: Partial<PlanPassContext> = {}): PlanPassContext => ({
  today: TODAY, logs: [], templates, program: null, blocks: [], restDay: 1, until: '2026-11-22', newId: () => `new${++n}`, fixedSports: football, ...over,
});
const byId = new Map(templates.map((t) => [t.id, t]));

describe('de vaste rijen', () => {
  it('een week met voetbal op dinsdag en zaterdag', () => {
    expect(fixedSessionsForWeek(TODAY, football).map((r) => [r.date, r.slot.intensity])).toEqual([['2026-11-03', 'moderate'], ['2026-11-07', 'high']]);
  });

  it('komen erbij met een slot van jou, en een tweede keer verandert er niets', () => {
    const first = reconcileFixedSessions(sessions, football, { today: TODAY, until: '2026-11-22', logs: [], newId: () => `f${++n}` });
    expect(first.added).toHaveLength(6);
    const row = first.sessions.find((s) => s.fixed && s.scheduledDate === '2026-11-07')!;
    expect(row).toMatchObject({ templateId: 'sport_football', plannedMinutes: 90, fixed: { sport: 'football', day: 6, intensity: 'high' } });
    expect(lockLevel(row, new Set(), TODAY)).toBe(1);
    const second = reconcileFixedSessions(first.sessions, football, { today: TODAY, until: '2026-11-22', logs: [], newId: () => `f${++n}` });
    expect(second.added.length + second.removed.length + second.changed.length).toBe(0);
  });

  it('een andere rol haalt alleen de open rijen weg; wat voorbij of gelogd is blijft', () => {
    const first = reconcileFixedSessions(sessions, football, { today: '2026-11-01', until: '2026-11-22', logs: [], newId: () => `f${++n}` }).sessions;
    const tuesday = first.find((s) => s.fixed && s.scheduledDate === '2026-11-03')!;
    const log: SessionLog = { id: 'l1', plannedSessionId: tuesday.id, templateId: 'sport_football', type: 'cardio', countedSport: 'football', completedDate: '2026-11-03', completedAt: '2026-11-03T21:00:00Z', variant: 'custom', durationMinutes: 60, source: 'garmin' };
    const off = reconcileFixedSessions(first, { football: { role: 'count' } }, { today: '2026-11-05', until: '2026-11-22', logs: [log], newId: () => `f${++n}` });
    expect(off.sessions.some((s) => s.id === tuesday.id)).toBe(true);
    expect(off.sessions.filter((s) => s.fixed && s.scheduledDate >= '2026-11-05')).toEqual([]);
  });

  it('je eigen verplaatsing vervangt de vaste dag voor die week', () => {
    const first = reconcileFixedSessions(sessions, football, { today: TODAY, until: '2026-11-22', logs: [], newId: () => `f${++n}` }).sessions;
    const moved = first.map((s) => (s.fixed && s.scheduledDate === '2026-11-10' ? { ...s, scheduledDate: '2026-11-11', status: 'moved' as const } : s));
    const again = reconcileFixedSessions(moved, football, { today: TODAY, until: '2026-11-22', logs: [], newId: () => `f${++n}` });
    expect(again.added).toEqual([]);
    expect(again.sessions.some((s) => s.fixed && s.scheduledDate === '2026-11-11')).toBe(true);
  });
});

describe('de planningsronde met voetbal op dinsdag en zaterdag, vijf dagen', () => {
  const result = planPass(sessions, ctx());
  const fixedRows = result.sessions.filter((s) => s.fixed);

  it('de vaste rijen staan vooraan en blijven op hun dag', () => {
    expect(fixedRows.map((s) => s.scheduledDate)).toEqual(['2026-11-03', '2026-11-07', '2026-11-10', '2026-11-14', '2026-11-17', '2026-11-21']);
    expect(result.repairs.filter((r) => r.rule === 'FIXED-SPORT' && r.added)).toHaveLength(6);
  });

  it('geen zware beenkracht van ASCEND binnen 48 uur na dinsdag of 72 uur na zaterdag', () => {
    for (const s of result.sessions) {
      const t = byId.get(s.templateId);
      if (!t || s.fixed || s.status === 'skipped' || t.type !== 'strength' || !isLegHeavyTemplate(t)) continue;
      for (const f of fixedRows) {
        const after = daysBetween(f.scheduledDate, s.scheduledDate);
        const rest = f.fixed!.intensity === 'high' ? 2 : 1;
        expect({ legs: s.scheduledDate, after: f.scheduledDate, ok: after < 0 || after > rest || (s.plannedMinutes !== undefined && s.plannedMinutes < t.durationVariants.full) }).toMatchObject({ ok: true });
      }
    }
  });

  it('niet meer harde dagen dan de grens: de harde loop naast de wedstrijd wordt rustig', () => {
    expect(hardDayLimit(5)).toBe(3);
    expect(validateWeeks({ sessions: result.sessions, logs: [], templates, today: TODAY, restDay: 1, until: '2026-11-22' }).filter((f) => f.rule === 'HARD-DAYS')).toEqual([]);
  });

  it('een tweede ronde verandert niets meer', () => {
    const again = planPass(result.sessions, ctx());
    expect(again.repairs).toEqual([]);
  });

  it('zonder vaste afspraak is de ronde zoals hij was', () => {
    const plain = planPass(sessions, { ...ctx(), templates: base, fixedSports: undefined });
    const none = planPass(sessions, { ...ctx(), templates: base, fixedSports: null });
    expect(JSON.stringify(none.sessions)).toBe(JSON.stringify(plain.sessions));
    expect(none.repairs).toEqual(plain.repairs);
  });
});

describe('HARD-DAYS', () => {
  const hardWeek: PlannedSession[] = [[1, 'tpl_tempo_run'], [3, 'tpl_intervals'], [4, 'tpl_hill_intervals']].map(([d, templateId], i) => ({
    id: `h${i}`, templateId: templateId as string, scheduledDate: addDays('2026-11-09', d as number), weekStartDate: '2026-11-09', status: 'planned', order: i,
  }));
  const onlySat: SportHandlingMap = { football: { role: 'fixed', fixed: [{ day: 6, minutes: 90, intensity: 'high' }] } };
  const tpls = withCountingSports(base, { sportHandling: onlySat });

  it('met een zware wedstrijd erbij wordt de laatste harde loop van ASCEND rustig, gemeld', () => {
    const result = planPass(hardWeek, ctx({ templates: tpls, fixedSports: onlySat }));
    const changed = result.repairs.filter((r) => r.rule === 'HARD-DAYS');
    expect(changed.length).toBeGreaterThan(0);
    expect(result.sessions.find((s) => s.id === changed[0].sessionId)?.templateId).toBe('tpl_easy_run');
    expect(changed[0].reason).toContain('voetbal');
  });

  it('zonder zware sport van jezelf doet de regel niets', () => {
    expect(validateWeeks({ sessions: hardWeek, logs: [], templates: base, today: TODAY, restDay: 1 }).filter((f) => f.rule === 'HARD-DAYS')).toEqual([]);
  });
});

describe('een tocht in dezelfde week', () => {
  const trek: LeavePeriod = { id: 'trek1', kind: 'trek', startDate: '2026-11-13', endDate: '2026-11-15' };

  it('de wedstrijd op een dag van de tocht vervalt, met een noot', () => {
    expect(fixedSessionsForWeek('2026-11-09', football, [trek]).map((r) => r.date)).toEqual(['2026-11-10']);
    const items = fixedInLeave(TODAY, '2026-11-22', football, [trek]);
    expect(items.map((i) => i.date)).toEqual(['2026-11-14']);
    expect(fixedLeaveNote(items[0])).toBe('Voetbal op zaterdag 14 november valt op je tocht en vervalt.');
    const result = planPass(sessions, ctx({ leave: [trek] }));
    expect(result.sessions.some((s) => s.fixed && s.scheduledDate === '2026-11-14')).toBe(false);
    expect(result.sessions.some((s) => s.fixed && s.scheduledDate === '2026-11-10')).toBe(true);
  });

  it('het voorstel voor de tocht zegt welke afspraak vervalt, en haalt hem pas met Akkoord weg', () => {
    const rows = planPass(sessions, ctx()).sessions;
    const plan = planLeaveChange({ mode: 'add', period: trek, existing: [], sessions: rows, logs: [], templates, today: TODAY, context: (periods) => ctx({ leave: periods }) });
    expect(plan.notes).toContain('Voetbal op zaterdag 14 november valt op je tocht en vervalt.');
    const sat = rows.find((s) => s.fixed && s.scheduledDate === '2026-11-14')!;
    expect(plan.proposal.changes.some((c) => c.plannedSessionId === sat.id && c.action === 'remove')).toBe(true);
    // Nog niets bewaard: de rij staat er nog.
    expect(rows.some((s) => s.id === sat.id)).toBe(true);
  });
});

describe('een Top-race over twee weken', () => {
  const race = { id: 'race', name: 'Wedstrijd', status: 'active', targetDate: '2026-11-15', createdAt: '', updatedAt: '', priority: 'top', priorityChosen: true,
    requirements: [{ id: 'r', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 10, unit: 'km' }, discipline: 'running' }] } as unknown as TrainingGoal;

  it('de vaste afspraken blijven staan: het raceblok raakt wat van jou is niet aan', () => {
    const result = planPass(sessions, ctx({ blocks: raceBlocks([race], 'gr5', '2027-08-01', TODAY) }));
    for (const d of ['2026-11-03', '2026-11-07', '2026-11-10', '2026-11-14']) expect(result.sessions.some((s) => s.fixed && s.scheduledDate === d && s.status !== 'skipped'), d).toBe(true);
  });
});

describe('afvinken en Volgehouden', () => {
  it('de gelogde voetbal van die dag vinkt de vaste rij af', () => {
    const rows = planPass(sessions, ctx()).sessions;
    const match = { externalId: 'test:fb', source: 'garmin' as const, start: '2026-11-07T15:00:00', kind: 'other' as const, durationSec: 95 * 60, treadmill: false, countedSport: 'football' as const };
    expect(autoTickMatch(match, rows, templates, [], '2026-11-08')?.session.fixed?.day).toBe(6);
  });

  it('een vaste afspraak telt niet mee in Volgehouden', () => {
    const past = planPass(sessions, ctx()).sessions;
    const a = recentAdherence({ today: '2026-11-23', program: null, plannedSessions: past, logs: [], templates, planChangeLog: [] });
    const b = recentAdherence({ today: '2026-11-23', program: null, plannedSessions: past.filter((s) => !s.fixed), logs: [], templates, planChangeLog: [] });
    expect(a.planned).toBe(b.planned);
  });
});
