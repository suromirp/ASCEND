import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { DailyTimeBudget, Weekday } from '../models/goalEngineConfig';
import { dayVerdicts, type DragContext } from './weekDrag';
import type { CheckInput } from './weekValidator';
import { checkSwap, decideSwap, legsCloseAfterSwap, swapOptions, swapRows, SWAP_LEGS, SWAP_TEST, withSwapVerdicts } from './weekSwap';

// Nagemaakte week van maandag 28 september 2026; vandaag is dinsdag 29 september.
const { templates, program } = buildDefaultProgramData();
const MON = '2026-09-28';
const ASOF = '2026-09-29';
const s = (id: string, templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: MON, status: 'planned', order: 0, ...extra });
const day = (m: number): DailyTimeBudget => ({ preferredMinutes: m, softFlexMinutes: 15 });
const roomy: Partial<Record<Weekday, DailyTimeBudget>> = { mon: day(300), tue: day(300), wed: day(300), thu: day(300), fri: day(300), sat: day(300), sun: day(300) };
const ctx = (sessions: PlannedSession[], over: Partial<DragContext> = {}): DragContext => ({ sessions, templates, logs: [], program, dailyTimeBudget: roomy, sameDayPairingPreference: 'automatic', asOf: ASOF, move: {}, ...over });
const lock = { by: 'user' as const, at: '2026-09-29T10:00:00.000Z' };

// Benen A woensdag, makkelijke loop donderdag, bovenlichaam zaterdag, lange duurloop zondag.
const week = () => [
  s('lowerA', 'tpl_lower_a', '2026-09-30'),
  s('easy', 'tpl_easy_run', '2026-10-01'),
  s('upperA', 'tpl_upper_a', '2026-10-03'),
  s('long', 'tpl_long_run', '2026-10-04'),
];

describe('checkSwap', () => {
  it('twee trainingen die zonder botsing van dag ruilen zijn schoon', () => {
    const c = checkSwap(ctx(week()), 'easy', 'upperA');
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.asks).toEqual([]);
    expect(c.proposal.swap).toBe(true);
    expect(c.proposal.resolved).toBe(true);
    expect(c.proposal.changes.map((x) => [x.sessionId, x.fromDate, x.toDate])).toEqual([
      ['easy', '2026-10-01', '2026-10-03'],
      ['upperA', '2026-10-03', '2026-10-01'],
    ]);
    expect(decideSwap(c).action).toBe('apply');
  });

  it('beenkracht de dag voor de lange duurloop vraagt Akkoord, met het droge feit', () => {
    const c = checkSwap(ctx(week()), 'lowerA', 'upperA');
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.asks.length).toBeGreaterThan(0);
    expect(c.asks[0]).toMatch(/op zaterdag 3 oktober valt dicht op Lange duurloop/);
    expect(c.asks[0]).toContain('Liefst 48 uur ertussen.');
    const d = decideSwap(c);
    expect(d.action).toBe('ask');
    expect(d.proposal.resolved).toBe(false);
    expect(d.proposal.reason).toBe(c.asks.join(' '));
  });

  it('je rustdag vraagt Akkoord', () => {
    const c = checkSwap(ctx(week(), { move: { restDay: 6 } }), 'easy', 'upperA');
    expect(c.ok && c.asks).toEqual(['Zaterdag 3 oktober is je rustdag.']);
  });

  it('een dag waar de tijd niet past vraagt Akkoord', () => {
    const c = checkSwap(ctx(week(), { dailyTimeBudget: { ...roomy, thu: day(20) } }), 'easy', 'upperA');
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.asks).toHaveLength(1);
    expect(c.asks[0]).toMatch(/^Bovenlichaam .* duurt \d+ min, meer dan je op donderdag 1 oktober wilt trainen\.$/);
  });

  it('een test ruil je alleen met Akkoord', () => {
    const sessions = [...week(), s('test', 'tpl_test_run', '2026-10-02')];
    const c = checkSwap(ctx(sessions), 'test', 'easy');
    expect(c.ok && c.asks).toContain(SWAP_TEST);
  });

  it('niet: dezelfde dag, een andere week, gelogd, voorbij, een rustwandeling, een wedstrijd', () => {
    const logs: SessionLog[] = [{ id: 'l', plannedSessionId: 'easy', templateId: 'tpl_easy_run', type: 'run', variant: 'full', completedDate: '2026-10-01', completedAt: '2026-10-01T08:00:00.000Z', source: 'manual', durationMinutes: 40 } as unknown as SessionLog];
    const sessions = [
      ...week(),
      s('upperB', 'tpl_upper_b', '2026-10-01'),
      s('next', 'tpl_easy_run', '2026-10-06', { weekStartDate: '2026-10-05' }),
      s('past', 'tpl_upper_b', '2026-09-28'),
      s('walk', 'tpl_herstel', '2026-10-02'),
      s('race', 'tpl_race', '2026-10-02'),
    ];
    expect(checkSwap(ctx(sessions), 'easy', 'upperB').ok).toBe(false);
    expect(checkSwap(ctx(sessions), 'upperA', 'next').ok).toBe(false);
    expect(checkSwap(ctx(sessions, { logs }), 'easy', 'upperA').ok).toBe(false);
    expect(checkSwap(ctx(sessions), 'past', 'upperA').ok).toBe(false);
    expect(checkSwap(ctx(sessions), 'walk', 'upperA').ok).toBe(false);
    expect(checkSwap(ctx(sessions), 'race', 'upperA').ok).toBe(false);
  });

  it('niet naar een vakantiedag', () => {
    const c = checkSwap(ctx(week(), { move: { leave: [{ id: 'v', kind: 'no_training', startDate: '2026-10-03', endDate: '2026-10-03' }] } }), 'easy', 'upperA');
    expect(c.ok).toBe(false);
  });

  it('twee zware beendagen achter elkaar die de regels niet als botsing zien, vragen ook', () => {
    const c = checkSwap(ctx(week()), 'easy', 'upperA');
    if (!c.ok) throw new Error('verwacht ok');
    const d = decideSwap(c, { legsClose: true });
    expect(d.action).toBe('ask');
    expect(d.proposal.reason).toContain(SWAP_LEGS);
  });

  it('zegt een botsing van de 48 uur het al, dan niet nog een keer', () => {
    const c = checkSwap(ctx(week()), 'lowerA', 'upperA');
    if (!c.ok) throw new Error('verwacht ok');
    expect(decideSwap(c, { legsClose: true }).proposal.reason).not.toContain(SWAP_LEGS);
  });

  it('geen gedachtestreepjes in de zinnen', () => {
    const c = checkSwap(ctx(week(), { move: { restDay: 6 } }), 'lowerA', 'upperA');
    if (!c.ok) throw new Error('verwacht ok');
    expect(c.asks.join(' ') + c.proposal.reason).not.toMatch(/[\u2013\u2014]/);
  });
});

describe('swapOptions', () => {
  it('alleen trainingen van dezelfde week die mogen bewegen, op een andere dag', () => {
    const sessions = [
      ...week(),
      s('walk', 'tpl_herstel', '2026-10-02'),
      s('past', 'tpl_upper_b', '2026-09-28'),
      s('skipped', 'tpl_upper_b', '2026-10-02', { status: 'skipped' }),
      s('next', 'tpl_easy_run', '2026-10-06', { weekStartDate: '2026-10-05' }),
    ];
    const options = swapOptions(ctx(sessions), 'easy');
    expect(options.map((o) => o.session.id)).toEqual(['lowerA', 'upperA', 'long']);
    expect(options.find((o) => o.session.id === 'upperA')?.tone).toBe('ok');
  });

  it('niets voor een training die zelf niet mag bewegen', () => {
    expect(swapOptions(ctx([...week(), s('walk', 'tpl_herstel', '2026-10-02')]), 'walk')).toEqual([]);
  });
});

describe('withSwapVerdicts', () => {
  it('een dag met precies één training die mag bewegen wordt Ruilen', () => {
    const c = ctx(week());
    const v = withSwapVerdicts(c, 'easy', dayVerdicts(c, 'easy', MON));
    const sat = v.find((x) => x.date === '2026-10-03')!;
    expect(sat).toMatchObject({ kind: 'swap', droppable: true, tone: 'ok', swapWithId: 'upperA' });
    expect(sat.chip.length).toBeLessThanOrEqual(28);
    expect(sat.line).toMatch(/^Zaterdag 3 oktober\. Ruilen met /);
    // Een vrije dag blijft een vrije dag.
    expect(v.find((x) => x.date === '2026-10-02')?.kind).toBe('free');
  });

  it('een ruil die botst is amber', () => {
    const c = ctx(week());
    const sat = withSwapVerdicts(c, 'lowerA', dayVerdicts(c, 'lowerA', MON)).find((x) => x.date === '2026-10-03')!;
    expect(sat).toMatchObject({ kind: 'swap', tone: 'warn', ask: true });
    expect(sat.line).toContain('Als je loslaat, vraagt ASCEND eerst of je dat echt wilt.');
  });

  it('twee trainingen op de dag: gewoon verplaatsen zoals eerst', () => {
    const sessions = [...week(), s('tempo', 'tpl_tempo_run', '2026-10-03')];
    const c = ctx(sessions);
    const before = dayVerdicts(c, 'easy', MON);
    const sat = (v: typeof before) => v.find((x) => x.date === '2026-10-03');
    expect(sat(withSwapVerdicts(c, 'easy', before))).toEqual(sat(before));
  });

  it('een training die niet mag bewegen op de dag: gewoon verplaatsen', () => {
    const sessions = [...week(), s('walk', 'tpl_herstel', '2026-10-02')];
    const c = ctx(sessions);
    const fri = withSwapVerdicts(c, 'easy', dayVerdicts(c, 'easy', MON)).find((x) => x.date === '2026-10-02')!;
    expect(fri.kind).toBe('shared');
  });

  it('een gemiste training die je inhaalt ruilt nooit', () => {
    const sessions = [s('missed', 'tpl_easy_run', '2026-09-28'), s('upperA', 'tpl_upper_a', '2026-10-03')];
    const c = ctx(sessions);
    const before = dayVerdicts(c, 'missed', MON);
    expect(withSwapVerdicts(c, 'missed', before)).toEqual(before);
  });
});

describe('swapRows', () => {
  it('beide krijgen jouw slot en waar ze vandaan kwamen', () => {
    const [a, b] = swapRows(s('easy', 'tpl_easy_run', '2026-10-01'), s('upperA', 'tpl_upper_a', '2026-10-03'), lock);
    expect(a).toMatchObject({ id: 'easy', scheduledDate: '2026-10-03', status: 'moved', movedFromDate: '2026-10-01', lock });
    expect(b).toMatchObject({ id: 'upperA', scheduledDate: '2026-10-01', status: 'moved', movedFromDate: '2026-10-03', lock });
  });

  it('terug op de eigen dag is hij weer van het plan, zoals bij Verplaatsen', () => {
    const [a] = swapRows(s('easy', 'tpl_easy_run', '2026-10-03', { status: 'moved', movedFromDate: '2026-10-01', lock }), s('upperA', 'tpl_upper_a', '2026-10-01'), lock);
    expect(a).toMatchObject({ scheduledDate: '2026-10-01', status: 'planned', movedFromDate: undefined, lock: undefined });
  });

  it('de week volgt de dag', () => {
    const [a] = swapRows(s('a', 'tpl_easy_run', '2026-10-04'), s('b', 'tpl_upper_a', '2026-09-29'), lock);
    expect(a.weekStartDate).toBe(MON);
  });
});

describe('legsCloseAfterSwap', () => {
  // Nagemaakt: heuvelsprints maandag 5 en de lange duurloop zaterdag 10 oktober, allebei door jou zo gezet.
  const M = '2026-10-05';
  const row = (id: string, templateId: string, date: string, over: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: M, status: 'planned', order: 0, ...over });
  const input = (sessions: PlannedSession[]): CheckInput => ({ sessions, logs: [], templates, today: M, restDay: 7, goalDay: '2027-08-01' });
  it('een ruil die heuvels en de lange duurloop naast elkaar zet buiten hun eigen dagen, telt', () => {
    const sessions = [
      row('hills', 'tpl_hills_descent', '2026-10-05', { status: 'moved', movedFromDate: '2026-10-10', lock }),
      row('easy', 'tpl_easy_run', '2026-10-06'),
      row('long', 'tpl_long_run', '2026-10-09', { plannedMinutes: 45 }),
    ];
    expect(legsCloseAfterSwap(input(sessions), 'easy', 'long')).toBe(true);
    expect(legsCloseAfterSwap(input(sessions), 'hills', 'easy')).toBe(false);
  });
});
