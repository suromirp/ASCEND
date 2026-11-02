import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import { proposeMove } from './scheduler';
import { applyPlanChangeItems } from './proposalEngine';
import { weekConcerns } from './weekConcerns';
import { planWeekFix, weekNotice } from './weekFixProposal';
import { validateWeeks, type CheckInput } from './weekValidator';
import { decideMove, LEGS_ASK, legsCloseAfterMove } from './weekDrag';

const { templates } = buildDefaultProgramData();

// Nagemaakt voorbeeld: in de week van maandag 5 oktober 2026 sleepte je zelf de heuvelsprints naar maandag en
// de lange duurloop naar dinsdag. In het schema horen die twee bewust bij elkaar op zaterdag en zondag.
const MONDAY = '2026-10-05';
const TODAY = MONDAY;
const userLock = { by: 'user' as const, at: '2026-10-04T18:00:00Z' };
const row = (id: string, templateId: string, scheduledDate: string, over: Partial<PlannedSession> = {}): PlannedSession => ({
  id, templateId, scheduledDate, weekStartDate: MONDAY, status: 'planned', order: 0, ...over,
});
const mine = { status: 'moved' as const, lock: userLock };

const week = (hillsDay = '2026-10-05', longDay = '2026-10-06', own = true): PlannedSession[] => [
  row('hills', 'tpl_hills_descent', hillsDay, own ? { ...mine, movedFromDate: '2026-10-10' } : {}),
  row('long', 'tpl_long_run', longDay, own ? { ...mine, movedFromDate: '2026-10-11', plannedMinutes: 45 } : { plannedMinutes: 45 }),
  row('upperA', 'tpl_upper_a', '2026-10-07'),
  row('easy', 'tpl_easy_run', '2026-10-08'),
  row('long2', 'tpl_long_run', '2026-10-11'),
];
const input = (sessions: PlannedSession[], over: Partial<CheckInput> = {}): CheckInput => ({ sessions, logs: [], templates, today: TODAY, restDay: 6, goalDay: '2027-08-01', ...over });
const legs = (sessions: PlannedSession[], over: Partial<CheckInput> = {}) => weekConcerns(input(sessions, over), MONDAY).filter((c) => c.rule === 'LEG-SPACING');

describe('twee zware beendagen achter elkaar die je zelf zo neerzette', () => {
  it('de planning ziet het niet als fout en verplaatst niets (zonder reportYours geen melding)', () => {
    expect(validateWeeks(input(week())).filter((f) => f.rule === 'LEG-SPACING')).toEqual([]);
  });

  it('Week meldt het wel, met één rustige zin, een droog feit en een tekst per rij', () => {
    const list = legs(week());
    expect(list).toHaveLength(1);
    const c = list[0];
    expect(c.headline).toBe('Twee zware beendagen achter elkaar.');
    expect(c.fact).toBe('Heuvelsprints en afdalen op maandag 5 en Lange duurloop op dinsdag 6, zonder dag ertussen. Liefst 48 uur ertussen.');
    expect(c.notes).toEqual({ hills: '1 dag voor Lange duurloop', long: '1 dag na Heuvelsprints en afdalen' });
    expect(`${c.headline}${c.fact}${c.why}${c.title}`).not.toMatch(/[\u2013\u2014]/);
  });

  it('op hun eigen dagen in het weekend horen ze bewust bij elkaar: geen melding', () => {
    expect(legs(week('2026-10-10', '2026-10-11').filter((x) => x.id !== 'long2'))).toEqual([]);
  });

  it('wat het systeem zelf zo plande, meldt Week niet', () => {
    expect(legs(week('2026-10-05', '2026-10-06', false))).toEqual([]);
  });

  it('volgt de eigen dagen van je weekpatroon (slotDays)', () => {
    const slotDays = new Map([['tpl_hill_intervals', 1], ['tpl_long_run', 2]]);
    expect(legs(week(), { slotDays })).toEqual([]);
  });

  it('één voorstel met Akkoord verschuift één van de twee, en de week klopt daarna', () => {
    const c = legs(week())[0];
    const fix = planWeekFix(input(week()), c, MONDAY)!;
    expect(fix).not.toBeNull();
    expect(fix.id.startsWith('weekfix:LEG-SPACING:hills,long:')).toBe(true);
    expect(fix.ruleId).toBe('WEEK-CHECK');
    for (const option of [fix.proposal!, ...(fix.options ?? []).map((o) => o.proposal)]) {
      const ids = option.changes.map((ch) => ch.plannedSessionId);
      expect(ids.filter((id) => id === 'hills' || id === 'long')).toHaveLength(1);
      const { sessions } = applyPlanChangeItems(option.changes, week(), undefined, { by: 'proposal', at: 'x' });
      expect(validateWeeks({ ...input(sessions), reportYours: true }).filter((f) => f.rule === 'LEG-SPACING')).toEqual([]);
    }
  });

  it('in een volle week ruilt één van de twee met een training van het systeem, nooit met iets van jou', () => {
    const budget = { preferredMinutes: 60, softFlexMinutes: 15 };
    const dailyTimeBudget = { mon: budget, tue: budget, wed: budget, thu: budget, fri: budget, sat: budget, sun: budget };
    const full = [...week(), row('upperB', 'tpl_upper_b', '2026-10-09', { ...mine, movedFromDate: '2026-10-10' })];
    const c = legs(full, { dailyTimeBudget })[0];
    const fix = planWeekFix(input(full, { dailyTimeBudget }), c, MONDAY)!;
    expect(fix).not.toBeNull();
    const changed = fix.proposal!.changes.map((ch) => ch.plannedSessionId);
    expect(changed).toHaveLength(2);
    expect(changed.filter((id) => id === 'hills' || id === 'long')).toHaveLength(1);
    const other = full.find((x) => x.id === changed.find((id) => id !== 'hills' && id !== 'long'))!;
    expect(other.lock).toBeUndefined();
    const { sessions } = applyPlanChangeItems(fix.proposal!.changes, full, undefined, { by: 'proposal', at: 'x' });
    expect(validateWeeks({ ...input(sessions, { dailyTimeBudget }), reportYours: true }).filter((f) => f.rule === 'LEG-SPACING')).toEqual([]);
    // Staat die training al in een voorstel op Vandaag, dan ruilt de week hem niet ook nog.
    const again = planWeekFix(input(full, { dailyTimeBudget }), c, MONDAY, new Set([other.id]));
    expect((again?.proposal?.changes ?? []).some((ch) => ch.plannedSessionId === other.id)).toBe(false);
    // Zo ook via Week: wat een open voorstel op Vandaag al raakt, ruilt viaRoom nooit.
    const notice = weekNotice(input(full, { dailyTimeBudget }), MONDAY, true, new Set([other.id]));
    for (const f of Object.values(notice.fixes)) {
      for (const p of [f.proposal!, ...(f.options ?? []).map((o) => o.proposal)]) expect(p.changes.some((ch) => ch.plannedSessionId === other.id)).toBe(false);
    }
  });
});

describe('slepen naar zo\'n plek vraagt het eerst', () => {
  // De lange duurloop van zondag (van het systeem) sleep je naar dinsdag, de dag na je heuvels.
  const before = (): PlannedSession[] => week().map((s) => (s.id === 'long' ? { ...s, scheduledDate: '2026-10-11', status: 'planned' as const, lock: undefined, movedFromDate: undefined } : s)).filter((s) => s.id !== 'long2');

  it('ziet dat de plek twee zware beendagen achter elkaar geeft', () => {
    expect(legsCloseAfterMove(input(before()), 'long', '2026-10-06')).toBe(true);
    expect(legsCloseAfterMove(input(before()), 'long', '2026-10-08')).toBe(false);
  });

  it('een schone verplaatsing gaat dan niet meteen: "Toch hier" of "Annuleren"', () => {
    const proposal = proposeMove(before(), templates, 'long', '2026-10-06', [], null, {}, 'automatic', TODAY);
    expect(proposal.resolved).toBe(true);
    expect(decideMove(proposal).action).toBe('apply');
    const d = decideMove(proposal, { legsClose: true });
    expect(d.action).toBe('ask');
    expect(d.proposal.reason.startsWith(LEGS_ASK)).toBe(true);
    expect(LEGS_ASK).toBe('Twee zware beendagen achter elkaar. Toch hier?');
    expect(d.proposal.confirm).toEqual({ yes: 'Toch hier', no: 'Annuleren' });
  });

  it('met een andere reden erbij blijven de gewone knoppen, de zin over de benen staat vooraan', () => {
    const proposal = proposeMove(before(), templates, 'long', '2026-10-06', [], null, {}, 'automatic', TODAY);
    const d = decideMove(proposal, { legsClose: true, askAlways: 'Een testloop verplaats je alleen met Akkoord.' });
    expect(d.action).toBe('ask');
    expect(d.proposal.confirm).toBeUndefined();
    expect(d.proposal.reason.startsWith(LEGS_ASK)).toBe(true);
  });

  it('een cascade of botsing houdt zijn eigen vraag', () => {
    const cascade = { changes: [{ sessionId: 'a', templateId: 'tpl_long_run', templateName: 'A', fromDate: '2026-10-05', toDate: '2026-10-06' }, { sessionId: 'b', templateId: 'tpl_easy_run', templateName: 'B', fromDate: '2026-10-06', toDate: '2026-10-08' }], reason: 'Cascade.', resolved: true };
    const d = decideMove(cascade, { legsClose: true });
    expect(d.proposal.confirm).toBeUndefined();
    expect(d.proposal.reason).toBe('Cascade.');
  });
});
