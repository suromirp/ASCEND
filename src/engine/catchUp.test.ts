import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import { proposeMove } from './scheduler';
import { decideMove, dayVerdicts, type DragContext } from './weekDrag';
import { catchUpEligibility, catchUpNoteFor, caughtUpNoteFor, catchUpRows, qualifiesForCatchUp, caughtUpMap } from './catchUp';

const { templates } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const t = (id: string) => byId.get(id)!;
const TODAY = '2026-09-29'; // dinsdag
const MON = '2026-09-28';
const s = (id: string, templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: date < MON ? '2026-09-21' : MON, status: 'planned', order: 0, ...extra });
const args = { logged: false, today: TODAY, caughtUp: false };
const lock = { by: 'user' as const, at: '2026-09-29T08:00:00.000Z' };
const change = (toDate: string, over = {}) => ({ sessionId: 'old', templateId: 'tpl_easy_run', templateName: 'x', fromDate: '2026-09-28', toDate, ...over });

describe('catchUpEligibility', () => {
  it('een gemiste training van gisteren mag', () => {
    expect(catchUpEligibility(s('a', 'tpl_easy_run', '2026-09-28'), t('tpl_easy_run'), args)).toEqual({ ok: true });
  });
  it('een gemiste training van de week ervoor mag, van twee weken terug niet', () => {
    expect(catchUpEligibility(s('a', 'tpl_easy_run', '2026-09-23'), t('tpl_easy_run'), args).ok).toBe(true);
    expect(catchUpEligibility(s('a', 'tpl_easy_run', '2026-09-18'), t('tpl_easy_run'), args)).toEqual({ ok: false, reason: 'old' });
  });
  it('vandaag en later is gewoon verplaatsen', () => {
    expect(catchUpEligibility(s('a', 'tpl_easy_run', TODAY), t('tpl_easy_run'), args)).toEqual({ ok: false, reason: 'future' });
  });
  it('een gelogde, overgeslagen of al ingehaalde training niet', () => {
    expect(catchUpEligibility(s('a', 'tpl_easy_run', '2026-09-28'), t('tpl_easy_run'), { ...args, logged: true })).toEqual({ ok: false, reason: 'logged' });
    expect(catchUpEligibility(s('a', 'tpl_easy_run', '2026-09-28', { status: 'skipped' }), t('tpl_easy_run'), args)).toEqual({ ok: false, reason: 'skipped' });
    expect(catchUpEligibility(s('a', 'tpl_easy_run', '2026-09-28'), t('tpl_easy_run'), { ...args, caughtUp: true })).toEqual({ ok: false, reason: 'done' });
  });
  it('geen herstelwandeling, wedstrijd, test of vakantie en tocht', () => {
    expect(catchUpEligibility(s('a', 'tpl_herstel', '2026-09-28'), t('tpl_herstel'), args)).toEqual({ ok: false, reason: 'rest' });
    expect(catchUpEligibility(s('a', 'tpl_race', '2026-09-28'), t('tpl_race'), args)).toEqual({ ok: false, reason: 'race' });
    expect(catchUpEligibility(s('a', 'tpl_test_run', '2026-09-28'), t('tpl_test_run'), args)).toEqual({ ok: false, reason: 'test' });
    expect(catchUpEligibility(s('a', 'tpl_easy_run', '2026-09-28', { leave: { periodId: 'x', role: 'placed' } }), t('tpl_easy_run'), args)).toEqual({ ok: false, reason: 'leave' });
  });
});

describe('catchUpRows', () => {
  const old = s('old', 'tpl_easy_run', '2026-09-28', { plannedMinutes: 40, order: 2 });
  const { skipped, added } = catchUpRows(old, '2026-10-01', lock, 'new1');
  it('de gemiste rij wordt overgeslagen en blijft op zijn dag', () => {
    expect(skipped).toMatchObject({ id: 'old', status: 'skipped', scheduledDate: '2026-09-28', lock });
  });
  it('de nieuwe rij heeft hetzelfde sjabloon en dezelfde lengte, jouw slot en de verwijzing', () => {
    expect(added).toMatchObject({ id: 'new1', templateId: 'tpl_easy_run', scheduledDate: '2026-10-01', weekStartDate: MON, status: 'planned', plannedMinutes: 40, lock, catchUp: { fromId: 'old', fromDate: '2026-09-28' } });
    expect(added.movedFromDate).toBeUndefined();
  });
  it('de nieuwe rij hoort bij de week van zijn dag', () => {
    expect(catchUpRows(old, '2026-10-05', lock, 'n').added.weekStartDate).toBe('2026-10-05');
  });
  it('de oude rij wordt niet aangepast, alleen een kopie', () => {
    expect(old.status).toBe('planned');
    expect(old.lock).toBeUndefined();
  });
});

describe('qualifiesForCatchUp', () => {
  const old = s('old', 'tpl_easy_run', '2026-09-28');
  it('alleen een verplaatsing naar vandaag of later', () => {
    expect(qualifiesForCatchUp(old, t('tpl_easy_run'), change('2026-10-01'), args)).toBe(true);
    expect(qualifiesForCatchUp(old, t('tpl_easy_run'), change(TODAY), args)).toBe(true);
    expect(qualifiesForCatchUp(old, t('tpl_easy_run'), change('2026-09-28'), args)).toBe(false);
    expect(qualifiesForCatchUp(old, t('tpl_easy_run'), change('2026-10-01', { restore: true }), args)).toBe(false);
  });
  it('een training van morgen is geen inhaal', () => {
    expect(qualifiesForCatchUp(s('old', 'tpl_easy_run', '2026-09-30'), t('tpl_easy_run'), change('2026-10-02', { fromDate: '2026-09-30' }), args)).toBe(false);
  });
});

describe('inhalen via dezelfde weg als verplaatsen', () => {
  it('een schone dag wordt meteen toegepast, een botsing vraagt Akkoord', () => {
    const old = s('old', 'tpl_lower_a', '2026-09-28');
    const clean = decideMove(proposeMove([old], templates, 'old', '2026-10-01', [], undefined, undefined, 'automatic', TODAY));
    expect(clean.action).toBe('apply');
    const other = s('o', 'tpl_lower_b', '2026-10-02', { lock });
    const clash = decideMove(proposeMove([old, other], templates, 'old', '2026-10-01', [], undefined, undefined, 'automatic', TODAY));
    expect(clash.action).toBe('ask');
  });
});

describe('dagen tijdens het slepen', () => {
  const ctx = (sessions: PlannedSession[]): DragContext => ({ sessions, templates, logs: [], asOf: TODAY, move: {}, sameDayPairingPreference: 'automatic' });
  it('de dagen voor vandaag kunnen niet, zijn eigen dag zegt dat hij daar stond, de rest kan', () => {
    const old = s('old', 'tpl_easy_run', '2026-09-28');
    const v = Object.fromEntries(dayVerdicts(ctx([old]), 'old', MON).map((x) => [x.date, x]));
    expect(v['2026-09-28'].kind).toBe('origin');
    expect(v['2026-09-28'].line).toContain('stond');
    expect(v['2026-10-01'].droppable).toBe(true);
    expect(v['2026-10-01'].tone).toBe('ok');
  });
  it('een dag met een zware beendag vlakbij is amber en vraagt Akkoord', () => {
    const old = s('old', 'tpl_lower_a', '2026-09-28');
    const other = s('o', 'tpl_lower_b', '2026-10-02', { lock });
    const v = dayVerdicts(ctx([old, other]), 'old', MON).find((x) => x.date === '2026-10-01')!;
    expect(v.kind).toBe('clash');
    expect(v.ask).toBe(true);
  });
});

describe('teksten en verwijzingen', () => {
  const added = s('n', 'tpl_easy_run', '2026-10-01', { catchUp: { fromId: 'old', fromDate: '2026-09-28' } });
  it('de nieuwe rij zegt waar hij vandaan komt, de oude waar hij naartoe ging', () => {
    expect(catchUpNoteFor(added)).toBe('ingehaald van ma 28');
    expect(caughtUpNoteFor(added)).toBe('ingehaald op do 1');
    expect(catchUpNoteFor(s('x', 'tpl_easy_run', '2026-10-01'))).toBeUndefined();
  });
  it('welke rijen zijn ingehaald: niet als de nieuwe rij zelf is overgeslagen', () => {
    const gone = s('m', 'tpl_easy_run', '2026-10-02', { catchUp: { fromId: 'old2', fromDate: '2026-09-27' }, status: 'skipped' });
    expect([...caughtUpMap([added, gone]).keys()]).toEqual(['old']);
  });
});
