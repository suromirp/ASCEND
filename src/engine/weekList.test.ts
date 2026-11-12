import { describe, expect, it } from 'vitest';
import type { Advice } from './adviceShared';
import type { LeavePeriod } from '../models/leave';
import { leaveRowSub, proposalRow, replanSub, REPLAN_SUB, SEASON_ROW, weekBox, weekLoadRow, weekSkyLine, weekSoFarRow } from './weekList';

// Week minimaal (docs/visie/Ontwerp Week minimaal.md, hoofdstuk 2 en 4): het ene vak boven de dagen en de lijst
// eronder. Nagemaakte adviezen, geen echte data.
const advice = (id: string, title: string): Advice => ({ id, trigger: 'plan_update', ruleId: id, title, effect: '', why: '', priority: 1 });
const rest = advice('REST-PULL', 'Rustdag naar donderdag');
const extra = advice('EXTRA-SESSION', 'Een extra rustige loop');

describe('het ene vak boven de dagen', () => {
  it('niets te melden: geen vak, de dagen staan direct onder de lucht', () => {
    expect(weekBox({ notice: false, rest: [], extra: [] })).toEqual({ box: null, waiting: [] });
  });

  it('Let op heeft voorrang; een voorstel dat wacht wordt een rij Voorstel', () => {
    const r = weekBox({ notice: true, rest: [rest], extra: [extra] });
    expect(r.box).toEqual({ kind: 'notice' });
    expect(r.waiting.map((a) => a.id)).toEqual(['REST-PULL', 'EXTRA-SESSION']);
    expect(proposalRow(rest)).toEqual({ title: 'Voorstel', sub: 'Rustdag naar donderdag' });
  });

  it('zonder Let op krijgt de rustdag het vak en wacht de extra training als rij; nooit twee kaarten', () => {
    expect(weekBox({ notice: false, rest: [rest], extra: [extra] })).toEqual({ box: { kind: 'rest', advice: [rest] }, waiting: [extra] });
    expect(weekBox({ notice: false, rest: [], extra: [extra] })).toEqual({ box: { kind: 'extra', advice: [extra] }, waiting: [] });
  });
});

describe('de lijst onder de dagen', () => {
  it('een rustweek, overgeslagen, herhaald en een stap achter; een gewone week geen rij', () => {
    expect(weekLoadRow({ rest: true, restSkipped: false, repeated: false, shifted: false })).toEqual({ title: 'Rustweek', sub: 'Minder uren, zo is je plan opgebouwd' });
    expect(weekLoadRow({ rest: true, restSkipped: true, repeated: false, shifted: false })?.title).toBe('Rustweek overgeslagen');
    expect(weekLoadRow({ rest: false, restSkipped: false, repeated: true, shifted: true })?.title).toBe('Deze week nog een keer');
    expect(weekLoadRow({ rest: false, restSkipped: false, repeated: false, shifted: true })?.title).toBe('Een stap achter');
    expect(weekLoadRow({ rest: false, restSkipped: false, repeated: false, shifted: false })).toBeUndefined();
  });

  it('de rij naar de terugblik heet zoals het blad: deze week en een voorbije week', () => {
    expect(weekSoFarRow({ current: true, done: 2, total: 5, doneMinutes: 64 })).toEqual({ title: 'Je week tot nu', sub: '2 van 5 gedaan · 1:04 uur' });
    expect(weekSoFarRow({ current: false, done: 0, total: 4, doneMinutes: 0 })).toEqual({ title: 'Je week', sub: '0 van 4 gedaan' });
  });

  it('een week zonder programma of trainingen zegt dat in de lucht', () => {
    expect(weekSkyLine('', 0)).toBe('Niets gepland deze week.');
    expect(weekSkyLine('Basisfase van 4 weken', 0)).toBe('Niets gepland deze week.');
    expect(weekSkyLine('Basisfase van 4 weken', 3)).toBe('Basisfase van 4 weken');
  });

  it('vrije dagen: de periode die loopt of als eerste komt, anders Niets gepland', () => {
    const p = (id: string, startDate: string, endDate: string): LeavePeriod => ({ id, kind: 'no_training', startDate, endDate } as LeavePeriod);
    expect(leaveRowSub([], '2026-11-12')).toBe('Niets gepland');
    expect(leaveRowSub([p('oud', '2026-11-01', '2026-11-03')], '2026-11-12')).toBe('Niets gepland');
    expect(leaveRowSub([p('later', '2026-12-20', '2026-12-27'), p('nu', '2026-11-10', '2026-11-14')], '2026-11-12')).toMatch(/^Vakantie zonder training · 10/);
  });

  it('Week opnieuw plannen zegt na een gemiste training waarom', () => {
    expect(replanSub(0)).toBe(REPLAN_SUB);
    expect(replanSub(1)).toBe('Je hebt 1 training gemist. Zet de rest terug naar het plan.');
    expect(replanSub(2)).toBe('Je hebt 2 trainingen gemist. Zet de rest terug naar het plan.');
  });

  it('vaste woorden in zinsletters', () => {
    expect(SEASON_ROW).toEqual({ title: 'Jaaroverzicht', sub: 'Alle weken tot je doel' });
    expect(REPLAN_SUB).toBe('Zet de rest van je week terug naar het plan');
  });
});
