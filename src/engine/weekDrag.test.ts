import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import type { DailyTimeBudget, Weekday } from '../models/goalEngineConfig';
import { proposeMove } from './scheduler';
import { dayAtY, decideMove, dayVerdicts, dragEligibility, nextDroppable, TEST_ASK_REASON, newConcernLines, type DragContext } from './weekDrag';

const { templates, program } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const MON = '2026-09-28';
const ASOF = '2026-09-29'; // dinsdag
const s = (id: string, templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: MON, status: 'planned', order: 0, ...extra });
const day = (m: number): DailyTimeBudget => ({ preferredMinutes: m, softFlexMinutes: 15 });
const roomy: Partial<Record<Weekday, DailyTimeBudget>> = { mon: day(300), tue: day(300), wed: day(300), thu: day(300), fri: day(300), sat: day(300), sun: day(300) };
const ctx = (sessions: PlannedSession[], over: Partial<DragContext> = {}): DragContext => ({ sessions, templates, logs: [], program, dailyTimeBudget: roomy, sameDayPairingPreference: 'automatic', asOf: ASOF, move: {}, ...over });
const kinds = (c: DragContext, id: string) => Object.fromEntries(dayVerdicts(c, id, MON).map((v) => [v.date, v.kind]));
const lock = { by: 'user' as const, at: '2026-09-20T10:00:00.000Z' };

describe('dragEligibility', () => {
  const t = (id: string) => byId.get(id)!;
  const today = '2026-09-29';
  it('een gewone training van morgen mag', () => {
    expect(dragEligibility(s('a', 'tpl_easy_run', '2026-09-30'), t('tpl_easy_run'), { logged: false, today })).toEqual({ ok: true, askAlways: false });
  });
  it('een training van vandaag die nog niet gelogd is mag, een gelogde niet', () => {
    expect(dragEligibility(s('a', 'tpl_easy_run', today), t('tpl_easy_run'), { logged: false, today }).ok).toBe(true);
    expect(dragEligibility(s('a', 'tpl_easy_run', today), t('tpl_easy_run'), { logged: true, today })).toEqual({ ok: false, reason: 'history' });
  });
  it('gisteren is geschiedenis', () => {
    expect(dragEligibility(s('a', 'tpl_easy_run', '2026-09-28'), t('tpl_easy_run'), { logged: false, today })).toEqual({ ok: false, reason: 'history' });
  });
  it('een overgeslagen training niet', () => {
    expect(dragEligibility(s('a', 'tpl_easy_run', '2026-09-30', { status: 'skipped' }), t('tpl_easy_run'), { logged: false, today })).toEqual({ ok: false, reason: 'skipped' });
  });
  it('een herstelwandeling niet', () => {
    expect(dragEligibility(s('a', 'tpl_herstel', '2026-09-30'), t('tpl_herstel'), { logged: false, today })).toEqual({ ok: false, reason: 'rest' });
  });
  it('een wedstrijd niet', () => {
    expect(dragEligibility(s('a', 'tpl_race', '2026-10-03'), t('tpl_race'), { logged: false, today })).toEqual({ ok: false, reason: 'race' });
  });
  it('een test mag, maar vraagt altijd om Akkoord', () => {
    expect(dragEligibility(s('a', 'tpl_test_run', '2026-10-01'), t('tpl_test_run'), { logged: false, today })).toEqual({ ok: true, askAlways: true });
  });
  it('een training die een vakantie of tocht neerzette niet', () => {
    const placed = s('a', 'tpl_mountain_hike', '2026-10-01', { leave: { periodId: 'p', role: 'placed' } });
    expect(dragEligibility(placed, t('tpl_mountain_hike'), { logged: false, today })).toEqual({ ok: false, reason: 'leave' });
  });
  it('een eigen verplaatste training mag opnieuw', () => {
    const own = s('a', 'tpl_easy_run', '2026-10-01', { status: 'moved', movedFromDate: '2026-09-30', lock });
    expect(dragEligibility(own, t('tpl_easy_run'), { logged: false, today })).toEqual({ ok: true, askAlways: false });
  });
});

describe('dayVerdicts', () => {
  const base = [s('lowerA', 'tpl_lower_a', '2026-09-30'), s('easy', 'tpl_easy_run', '2026-10-01'), s('long', 'tpl_long_run', '2026-10-04')];

  it('zeven dagen: voorbij, vrij, samen en waar hij nu staat', () => {
    const k = kinds(ctx(base), 'easy');
    expect(k).toEqual({ '2026-09-28': 'blocked', '2026-09-29': 'free', '2026-09-30': 'shared', '2026-10-01': 'origin', '2026-10-02': 'free', '2026-10-03': 'free', '2026-10-04': 'shared' });
    const v = dayVerdicts(ctx(base), 'easy', MON);
    expect(v[0]).toMatchObject({ droppable: false, tone: 'none', chip: 'Dag is voorbij', line: 'Maandag 28 september is al voorbij.' });
    expect(v[1]).toMatchObject({ droppable: true, tone: 'ok', ask: false, chip: 'Vrije dag', line: 'Dinsdag 29 september. Vrije dag.' });
    expect(v[2].line).toMatch(/^Woensdag 30 september\. Samen met .*, samen \d+ min\./);
    expect(v[3]).toMatchObject({ droppable: true, chip: 'Hier staat hij nu' });
  });

  it('een derde training op een dag kan nooit', () => {
    const full = [...base, s('upperA', 'tpl_upper_a', '2026-10-03'), s('tempo', 'tpl_tempo_run', '2026-10-03')];
    const v = dayVerdicts(ctx(full), 'easy', MON).find((x) => x.date === '2026-10-03')!;
    expect(v).toMatchObject({ kind: 'blocked', droppable: false, tone: 'none', chip: 'Vol', line: 'Zaterdag 3 oktober zit vol.' });
  });

  it('twee zware beendagen binnen 48 uur is amber en vraagt een voorstel', () => {
    const legs = [s('lowerA', 'tpl_lower_a', '2026-09-30'), s('lowerB', 'tpl_lower_b', '2026-10-03')];
    const v = dayVerdicts(ctx(legs), 'lowerA', MON).find((x) => x.date === '2026-10-02')!;
    expect(v).toMatchObject({ kind: 'clash', droppable: true, tone: 'warn', ask: true });
    expect(v.chip.length).toBeLessThanOrEqual(28);
    expect(v.line).toContain('Dicht op');
    expect(v.line).toContain('ook zwaar voor benen');
    expect(v.line).toContain('Liefst 48 uur ertussen');
    expect(v.line).toContain('krijg je een voorstel');
  });

  it('je rustdag is amber en vraagt eerst of je dat echt wilt', () => {
    const v = dayVerdicts(ctx(base, { move: { restDay: 5 } }), 'easy', MON).find((x) => x.date === '2026-10-02')!;
    expect(v).toMatchObject({ kind: 'rest', droppable: true, tone: 'warn', ask: true, chip: 'Je rustdag' });
    expect(v.askReason).toBe('Dit is je rustdag. Een rustdag is er om te herstellen.');
  });

  it('een dag waar de tijd niet past is amber', () => {
    const v = dayVerdicts(ctx(base, { dailyTimeBudget: { wed: day(30) } }), 'easy', MON).find((x) => x.date === '2026-09-30')!;
    expect(v).toMatchObject({ kind: 'tight', tone: 'warn', ask: true });
    expect(v.askReason).toMatch(/^Samen \d+ min, meer dan je die dag wilt trainen\.$/);
  });

  it('vakantie, tocht, de dagen na je doel en ziekte kunnen niet', () => {
    const c = ctx(base, {
      move: {
        leave: [{ id: 'v', kind: 'no_training', startDate: '2026-10-02', endDate: '2026-10-02' }, { id: 't', kind: 'trek', startDate: '2026-10-03', endDate: '2026-10-03' }],
        goalDay: '2026-10-04',
      },
    });
    const v = Object.fromEntries(dayVerdicts(c, 'easy', MON).map((x) => [x.date, x]));
    expect(v['2026-10-02']).toMatchObject({ droppable: false, tone: 'none', chip: 'Vakantie', line: 'Vrijdag 2 oktober is een vakantiedag.' });
    expect(v['2026-10-03']).toMatchObject({ droppable: false, chip: 'Tochtdag' });
    expect(v['2026-10-04']).toMatchObject({ droppable: false, chip: 'Na je doel' });
    const ill = dayVerdicts(ctx(base, { move: { illness: [{ id: 'i', kind: 'below_neck', startDate: '2026-09-28' }] } }), 'easy', MON);
    expect(ill.find((x) => x.date === '2026-09-30')).toMatchObject({ droppable: false, chip: 'Je bent ziek' });
  });

  it('een zware training kan niet op de lichte dag bij een tocht', () => {
    const c = ctx([s('lowerA', 'tpl_lower_a', '2026-10-01')], { move: { leave: [{ id: 't', kind: 'trek', startDate: '2026-10-05', endDate: '2026-10-05' }] } });
    const v = dayVerdicts(c, 'lowerA', MON).find((x) => x.date === '2026-10-04')!;
    expect(v).toMatchObject({ kind: 'blocked', droppable: false });
  });

  it('nergens een gedachtestreepje in een zin of label', () => {
    const c = ctx([...base, s('lowerB', 'tpl_lower_b', '2026-10-03')], { move: { restDay: 5, goalDay: '2026-10-04', leave: [{ id: 'v', kind: 'no_training', startDate: '2026-09-29', endDate: '2026-09-29' }] } });
    for (const id of ['easy', 'lowerA', 'long']) {
      for (const v of dayVerdicts(c, id, MON)) {
        expect(`${v.chip}${v.line}${v.askReason ?? ''}`).not.toMatch(/[–—]/);
        expect(v.chip.length).toBeLessThanOrEqual(28);
      }
    }
  });
});

describe('nextDroppable en dayAtY', () => {
  const v = dayVerdicts(ctx([s('easy', 'tpl_easy_run', '2026-10-01')], { move: { leave: [{ id: 'v', kind: 'no_training', startDate: '2026-10-02', endDate: '2026-10-02' }] } }), 'easy', MON);
  it('slaat dagen die niet kunnen over', () => {
    expect(nextDroppable(v, '2026-10-01', 1)?.date).toBe('2026-10-03');
    expect(nextDroppable(v, '2026-10-01', -1)?.date).toBe('2026-09-30');
    expect(nextDroppable(v, '2026-10-04', 1)).toBeUndefined();
    expect(nextDroppable(v, '2026-09-29', -1)).toBeUndefined();
  });
  const rects = [{ date: 'a', top: 100, bottom: 200 }, { date: 'b', top: 210, bottom: 300 }, { date: 'c', top: 310, bottom: 400 }];
  it('de dag onder de vinger, of de dichtstbijzijnde', () => {
    expect(dayAtY(rects, 150)).toBe('a');
    expect(dayAtY(rects, 204)).toBe('a');
    expect(dayAtY(rects, 207)).toBe('b');
    expect(dayAtY(rects, 60)).toBe('a');
    expect(dayAtY(rects, 430)).toBe('c');
  });
  it('te ver erbuiten is annuleren', () => {
    expect(dayAtY(rects, 40)).toBeUndefined();
    expect(dayAtY(rects, 460)).toBeUndefined();
    expect(dayAtY([], 100)).toBeUndefined();
  });
});

describe('decideMove', () => {
  const week = [s('lowerA', 'tpl_lower_a', '2026-09-30'), s('easy', 'tpl_easy_run', '2026-10-01'), s('lowerB', 'tpl_lower_b', '2026-10-03')];
  const move = (id: string, to: string) => proposeMove(week, templates, id, to, [], program, roomy, 'automatic', ASOF);

  it('dezelfde dag is niets', () => {
    expect(decideMove(move('easy', '2026-10-01')).action).toBe('none');
  });
  it('een gewone verplaatsing gaat meteen', () => {
    const d = decideMove(move('easy', '2026-10-02'));
    expect(d.action).toBe('apply');
    expect(d.proposal.changes).toHaveLength(1);
  });
  it('een cascade vraagt het blad en houdt zijn eigen reden', () => {
    const p = move('lowerA', '2026-10-02');
    const d = decideMove(p);
    expect(p.changes.length).toBeGreaterThan(1);
    expect(d).toEqual({ action: 'ask', proposal: p });
  });
  it('een botsing die niet op te lossen is vraagt het blad', () => {
    const p = { changes: [{ sessionId: 'x', templateId: 't', templateName: 'T', fromDate: '2026-10-01', toDate: '2026-10-02' }], reason: 'Let op.', resolved: false };
    expect(decideMove(p).action).toBe('ask');
  });
  it('een rustdag of een volle dag is een vraag met zijn eigen reden', () => {
    const verdict = dayVerdicts(ctx(week, { move: { restDay: 5 } }), 'easy', MON).find((x) => x.date === '2026-10-02')!;
    const d = decideMove(move('easy', '2026-10-02'), { verdict });
    expect(d.action).toBe('ask');
    expect(d.proposal.resolved).toBe(false);
    expect(d.proposal.reason).toBe('Dit is je rustdag. Een rustdag is er om te herstellen.');
  });
  it('een test vraagt altijd, ook als alles schoon is, met Akkoord naast Liever niet', () => {
    const d = decideMove(move('easy', '2026-10-02'), { askAlways: true });
    expect(d.action).toBe('ask');
    expect(d.proposal.resolved).toBe(true);
    expect(d.proposal.reason).toBe(TEST_ASK_REASON);
  });
  it('het actieblad geeft niets mee en gedraagt zich zoals voorheen', () => {
    const p = move('easy', '2026-10-02');
    expect(decideMove(p, {})).toEqual({ action: 'apply', proposal: p });
  });
});

describe('newConcernLines', () => {
  it('meldt alleen wat er door de verplaatsing bij komt', () => {
    const sess = [s('a', 'tpl_tempo_run', '2026-10-01', { lock }), s('b', 'tpl_intervals', '2026-10-02', { lock })];
    const input = { sessions: sess, logs: [], templates, today: ASOF, restDay: 7, goalDay: '2027-08-01' };
    expect(newConcernLines(input, MON, 'b', '2026-10-03')).toEqual([]);
    const lines = newConcernLines(input, MON, 'b', '2026-10-01');
    expect(lines.length).toBeGreaterThan(0);
    expect(newConcernLines(input, MON, 'b', '2026-10-01', ['TWO-HARD-RUNS'])).toEqual([]);
  });
});

describe('decideMove: de eigen training blijft op zijn dag', () => {
  it('doet niets, ook als er verder iets in het voorstel staat', () => {
    const proposal = { resolved: true, reason: '', changes: [
      { plannedSessionId: 'a', fromDate: '2026-11-02', toDate: '2026-11-02' },
      { plannedSessionId: 'b', fromDate: '2026-11-03', toDate: '2026-11-04' },
    ] } as unknown as Parameters<typeof decideMove>[0];
    expect(decideMove(proposal).action).toBe('none');
  });
});
