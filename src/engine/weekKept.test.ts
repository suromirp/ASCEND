import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { MorningCheckIn } from '../models/checkIn';
import type { PlannedSession } from '../models/training';
import { addDays } from '../utils/dates';
import { weekConcerns } from './weekConcerns';
import { freshLegsToday, markKept, onlyKept, resolveWeekAfterChoice } from './weekKept';
import type { CheckInput } from './weekValidator';

const { templates } = buildDefaultProgramData();
const MONDAY = '2026-10-26';
const NEXT = addDays(MONDAY, 7);

const week = (monday: string, id: string): PlannedSession[] =>
  ['tpl_lower_a', 'tpl_hills_descent', 'tpl_herstel', 'tpl_herstel', 'tpl_herstel', 'tpl_herstel', 'tpl_herstel'].map((templateId, i) => ({
    id: `${id}-${i}`, templateId, scheduledDate: addDays(monday, i), weekStartDate: monday, status: 'planned' as const, order: i,
  }));
const input = (sessions: PlannedSession[], today = MONDAY): CheckInput => ({ sessions, logs: [], templates, today, restDay: 7, goalDay: '2027-08-01' });
const fresh = (date: string): MorningCheckIn => ({ date, legs: 'fris' });

function run(over: { today?: string; checkIns?: MorningCheckIn[]; setting?: 'mine' | 'plain'; sessions?: PlannedSession[]; monday?: string } = {}) {
  const today = over.today ?? MONDAY;
  const sessions = over.sessions ?? week(MONDAY, 'a');
  const concerns = weekConcerns(input(sessions, today), over.monday ?? MONDAY);
  return markKept(concerns, { today, checkIns: over.checkIns, sessions, templates, setting: over.setting ?? 'mine' });
}

describe('markKept', () => {
  it('Benen fris vandaag: de melding zegt dat jij koos, het oude feit blijft staan', () => {
    const [c] = run({ checkIns: [fresh(MONDAY)] }).filter((x) => x.rule === 'LEG-SPACING');
    expect(c.kept).toBe(true);
    expect(c.headline).toBe('Benen fris, je liet Benen A (zwaar) staan.');
    expect(c.fact).toBe('Benen A (zwaar) en Heuvelsprints en afdalen liggen te dicht op elkaar. Er zit geen dag tussen, liefst 1 dag ertussen (48 uur).');
    expect(c.notes).toEqual({ 'a-0': '1 dag voor Heuvelsprints en afdalen', 'a-1': '1 dag na Benen A (zwaar)' });
    expect(`${c.headline}${c.fact}`).not.toMatch(/[–—]/);
  });

  it('zonder antwoord van vandaag, na Ongedaan maken, blijft de gewone melding', () => {
    // Ongedaan maken haalt het antwoord uit morningCheckIns weg.
    const c = run({ checkIns: [] }).find((x) => x.rule === 'LEG-SPACING')!;
    expect(c.kept).toBeUndefined();
    expect(c.headline).toBe('Benen A (zwaar) en Heuvelsprints en afdalen liggen te dicht op elkaar.');
    expect(run({ checkIns: undefined }).find((x) => x.rule === 'LEG-SPACING')!.kept).toBeUndefined();
  });

  it('het antwoord van gisteren telt niet (rond middernacht)', () => {
    const c = run({ checkIns: [fresh(addDays(MONDAY, -1))] }).find((x) => x.rule === 'LEG-SPACING')!;
    expect(c.kept).toBeUndefined();
  });

  it('een gelijke training volgende week waarschuwt gewoon', () => {
    const sessions = [...week(MONDAY, 'a'), ...week(NEXT, 'b')];
    const list = run({ sessions, monday: NEXT, checkIns: [fresh(MONDAY)] });
    const c = list.find((x) => x.rule === 'LEG-SPACING')!;
    expect(c).toBeDefined();
    expect(c.kept).toBeUndefined();
    expect(c.headline).toContain('liggen te dicht op elkaar');
  });

  it('een ander paar in dezelfde week houdt zijn gewone melding', () => {
    // Woensdag Benen A en donderdag Heuvelsprints: ook te dicht, maar niet van vandaag.
    const extra: PlannedSession[] = [
      { id: 'x-2', templateId: 'tpl_lower_a', scheduledDate: addDays(MONDAY, 3), weekStartDate: MONDAY, status: 'planned', order: 5 },
      { id: 'x-3', templateId: 'tpl_hills_descent', scheduledDate: addDays(MONDAY, 4), weekStartDate: MONDAY, status: 'planned', order: 6 },
    ];
    const list = run({ sessions: [...week(MONDAY, 'a'), ...extra], checkIns: [fresh(MONDAY)] }).filter((x) => x.rule === 'LEG-SPACING');
    expect(list.some((c) => c.kept)).toBe(true);
    const other = list.find((c) => c.finding.sessionIds.includes('x-2'))!;
    expect(other.kept).toBeUndefined();
    expect(other.headline).toContain('liggen te dicht op elkaar');
    const all = new Set(list.map((c) => c.key));
    expect(onlyKept(list, all)).toBe(false);
  });

  it('de instelling Gewone melding geeft het oude gedrag', () => {
    const c = run({ checkIns: [fresh(MONDAY)], setting: 'plain' }).find((x) => x.rule === 'LEG-SPACING')!;
    expect(c.kept).toBeUndefined();
    expect(c.headline).toBe('Benen A (zwaar) en Heuvelsprints en afdalen liggen te dicht op elkaar.');
  });

  it('andere waarschuwingen blijven ongemoeid', () => {
    const plain = run({ checkIns: [], sessions: week(MONDAY, 'a') });
    const kept = run({ checkIns: [fresh(MONDAY)], sessions: week(MONDAY, 'a') });
    expect(kept.filter((c) => c.rule !== 'LEG-SPACING')).toEqual(plain.filter((c) => c.rule !== 'LEG-SPACING'));
  });

  it('onlyKept: alleen als elke open melding gekozen is', () => {
    const list = run({ checkIns: [fresh(MONDAY)] }).filter((x) => x.rule === 'LEG-SPACING');
    expect(onlyKept(list, new Set(list.map((c) => c.key)))).toBe(true);
    expect(onlyKept(list, new Set())).toBe(false);
  });
});

describe('freshLegsToday en resolveWeekAfterChoice', () => {
  it('alleen Benen fris van vandaag telt', () => {
    expect(freshLegsToday([fresh(MONDAY)], MONDAY)).toBe(true);
    expect(freshLegsToday([{ date: MONDAY, legs: 'spierpijn' }], MONDAY)).toBe(false);
    expect(freshLegsToday([{ date: MONDAY, allNormal: true }], MONDAY)).toBe(false);
    expect(freshLegsToday([{ date: MONDAY, legs: 'fris', soreWhere: 'upper' }], MONDAY)).toBe(false);
  });
  it('een ontbrekende of kapotte waarde is het advies', () => {
    expect(resolveWeekAfterChoice(undefined)).toBe('mine');
    expect(resolveWeekAfterChoice({})).toBe('mine');
    expect(resolveWeekAfterChoice({ weekAfterChoice: 'plain' })).toBe('plain');
    expect(resolveWeekAfterChoice({ weekAfterChoice: 'x' as 'plain' })).toBe('mine');
  });
});
