import { describe, it, expect } from 'vitest';
import { acceptConflicts, applyResolution, conflictGoalsFrom, conflictsForGoals, goalConflicts, newConflicts, conflictPairKey, type ConflictGoal } from './goalConflicts';
import type { GoalDetails, GoalKindId, GoalPriority, TrainingGoal } from '../models/goals';
import { addDays } from '../utils/dates';

// Nagemaakte doelen. Herstel en afbouw komen uit data/goalKinds.ts:
// marathon herstel 10, afbouw top 18, voortop 7; halve marathon 6, 12 en 5; 10 km 4, 8 en 4;
// tocht met hutten van 8 dagen: herstel 4, afbouw top 10, voortop 3.
const TODAY = '2027-01-04';
const BASE = '2027-03-14';
const at = (days: number) => addDays(BASE, days);

let n = 0;
const goal = (name: string, date: string, kind: GoalKindId, priority: GoalPriority, details: GoalDetails, over: Partial<ConflictGoal> = {}): ConflictGoal => ({
  id: `g${++n}-${name}`, name, date, kind, priority, details, order: n, accepted: [], ...over,
});
const marathon = (date: string, priority: GoalPriority = 'top', over: Partial<ConflictGoal> = {}) => goal('Marathon', date, 'run_race', priority, { variant: 'marathon' }, over);
const trek = (date: string, priority: GoalPriority = 'top', over: Partial<ConflictGoal> = {}) => goal('Trektocht', date, 'trek_hut', priority, { days: 8 }, over);
const tenK = (date: string, priority: GoalPriority = 'voortop', over: Partial<ConflictGoal> = {}) => goal('Tien kilometer', date, 'run_race', priority, { variant: '10k' }, over);

describe('twee Tops', () => {
  it('zeggen in gewone woorden waarom het niet past, met de som', () => {
    // Marathon (herstel 10) en een tocht van 8 dagen (afbouw 10): 10 + 21 + 10 = 41, dus de ondergrens van 42.
    const m = marathon(BASE);
    const t = trek(at(35));
    const [c] = goalConflicts([m, t], TODAY);
    expect(c).toMatchObject({ rule: 'TOP-TOP', gapDays: 35, neededDays: 42, firstId: m.id, secondId: t.id });
    expect(c.message).toContain('Je Top-doel Marathon staat op');
    expect(c.message).toContain('35 dagen ertussen');
    expect(c.message).toContain('Marathon vraagt 10 dagen herstel en 21 dagen opbouw en 10 dagen afbouw, samen 41 dagen');
    expect(c.message).toContain('Tussen twee Top-doelen zit sowieso minstens 42 dagen');
    expect(c.message).not.toMatch(/[\u2013\u2014]/);
    expect(c.suggestion).not.toMatch(/[\u2013\u2014]/);
  });

  it('passen als er genoeg dagen tussen zitten, en elk pas vanaf de grens', () => {
    expect(goalConflicts([marathon(BASE), trek(at(42))], TODAY)).toEqual([]);
    expect(goalConflicts([marathon(BASE), trek(at(41))], TODAY)).toHaveLength(1);
    // Twee marathons: 10 + 21 + 18 = 49, ver boven de 42.
    expect(goalConflicts([marathon(BASE), marathon(at(48))], TODAY)).toHaveLength(1);
    expect(goalConflicts([marathon(BASE), marathon(at(49))], TODAY)).toEqual([]);
  });

  it('de ondergrens van 42 dagen blijft, ook als de afbouw korter wordt', () => {
    // Tocht (herstel 4), dan een Top-marathon (afbouw 18): 4 + 21 + 18 = 43. Bij 40 dagen helpt een
    // kortere afbouw niet: de ondergrens van 42 geldt, dus een label lager.
    const [c] = goalConflicts([trek(BASE), marathon(at(40))], TODAY);
    expect(c.neededDays).toBe(43);
    expect(c.resolution.kind).toBe('lower_label');
  });

  it('kort de afbouw in als de som dan past en de ondergrens van 42 dagen gehaald is', () => {
    // Marathon (herstel 10), dan een halve marathon als Top (afbouw 12): 10 + 21 + 12 = 43; 43 dagen past, 42 niet.
    const m = marathon(BASE);
    const half = goal('Halve', at(42), 'run_race', 'top', { variant: 'half' });
    const [c] = goalConflicts([m, half], TODAY);
    expect(c).toMatchObject({ rule: 'TOP-TOP', gapDays: 42, neededDays: 43, goalId: half.id });
    // 10 + 21 + t <= 42 geeft t = 11.
    expect(c.resolution).toEqual({ kind: 'shorten_taper', taperDays: 11 });
    expect(c.suggestion).toContain('wordt 11 dagen in plaats van 12 dagen');
  });

  it('gaat een label lager als inkorten niet genoeg is, en zegt het eerlijk als niets helpt', () => {
    // Twee marathons 30 dagen uit elkaar: ook met afbouw 7 is 10 + 21 + 7 = 38 te veel, en onder de 42.
    const a = marathon(BASE);
    const b = marathon(at(30));
    const [c] = goalConflicts([a, b], TODAY);
    expect(c.goalId).toBe(b.id);
    // Een Voortop na een Top: niet binnen het herstel van 10 dagen plus de eigen afbouw van 7; 30 >= 17.
    expect(c.resolution).toEqual({ kind: 'lower_label', to: 'voortop' });
    expect(c.suggestion).toContain('Marathon wordt Voortop');
    // Zo dicht dat zelfs een Voortop niet past: 12 dagen ertussen, nodig 10 + 7 = 17.
    const [d] = goalConflicts([marathon(BASE), marathon(at(12))], TODAY);
    expect(d.resolution).toEqual({ kind: 'lower_label', to: 'verkenning' });
    // Binnen het herstel zelf (5 dagen) past ook een Verkenning niet: eerlijk melden.
    const [e] = goalConflicts([marathon(BASE), marathon(at(5))], TODAY);
    expect(e.resolution).toEqual({ kind: 'tell' });
    expect(e.suggestion).toContain('niet oplossen');
  });

  it('laat het doel wijken dat lager in de lijst staat, ook als dat het eerste in de tijd is', () => {
    const early = marathon(BASE, 'top', { order: 5 });
    const late = trek(at(20), 'top', { order: 1 });
    const [c] = goalConflicts([early, late], TODAY);
    expect(c.goalId).toBe(early.id);
    expect(c.otherGoalId).toBe(late.id);
    // De afbouw van het eerste doel telt niet in de som: dus meteen een label lager.
    expect(c.resolution.kind).toBe('lower_label');
  });
});

describe('een Voortop voor een Top', () => {
  it('niet in de afbouw van de Top en niet binnen 10 dagen ervoor', () => {
    // 10 km (herstel 4) voor een tocht met afbouw 10: 4 + 7 + 10 = 21 dagen.
    const t = trek(BASE);
    const v = tenK(at(-20));
    expect(goalConflicts([t, v], TODAY)).toHaveLength(1);
    expect(goalConflicts([t, tenK(at(-21))], TODAY)).toEqual([]);
    const [c] = goalConflicts([t, v], TODAY);
    expect(c).toMatchObject({ rule: 'VOORTOP-VOOR-TOP', neededDays: 21, goalId: v.id });
    expect(c.resolution).toEqual({ kind: 'lower_label', to: 'verkenning' });
  });

  it('met de ondergrens van 10 dagen als de som kleiner is', () => {
    // Een tocht met afbouw 3 (Voortop-label op de Top? nee): een 5 km (herstel 3) voor een 10 km Top: 3 + 7 + 8 = 18.
    const top = tenK(BASE, 'top');
    const early = goal('Vijf', at(-17), 'run_race', 'voortop', { variant: '5k' });
    expect(goalConflicts([top, early], TODAY)).toHaveLength(1);
    expect(goalConflicts([top, goal('Vijf', at(-18), 'run_race', 'voortop', { variant: '5k' })], TODAY)).toEqual([]);
  });

  it('een Verkenning mag overal, behalve in de afbouw van een Top', () => {
    const top = trek(BASE);
    expect(goalConflicts([top, tenK(at(-9), 'verkenning')], TODAY)).toHaveLength(1);
    expect(goalConflicts([top, tenK(at(-10), 'verkenning')], TODAY)).toEqual([]);
    const [c] = goalConflicts([top, tenK(at(-5), 'verkenning')], TODAY);
    expect(c.rule).toBe('IN-AFBOUW');
    expect(c.message).toContain('heeft 10 dagen afbouw');
  });
});

describe('na een doel', () => {
  it('een Voortop niet binnen het herstel van het doel ervoor, het herstel volgt de soort en niet het label', () => {
    // Een marathon als Top: 10 dagen herstel plus de afbouw van 4 dagen van de Voortop.
    const [c] = goalConflicts([marathon(BASE), tenK(at(9))], TODAY);
    expect(c).toMatchObject({ rule: 'NA-HERSTEL', gapDays: 9, neededDays: 14, goalId: expect.stringContaining('Tien') });
    // Dezelfde marathon als Verkenning: rustig meedoen, de helft van het herstel (5 + 4 = 9 dagen).
    expect(goalConflicts([marathon(BASE, 'verkenning'), tenK(at(9))], TODAY)).toEqual([]);
    expect(goalConflicts([marathon(BASE, 'verkenning'), tenK(at(8))], TODAY)).toHaveLength(1);
  });

  it('korter inkorten van de afbouw van een Voortop tot 3 dagen', () => {
    // Herstel 10 + afbouw 4 (10 km voortop) = 14; bij 13 dagen: afbouw 3 past.
    const m = marathon(BASE, 'top');
    const v = tenK(at(13));
    const [c] = goalConflicts([m, v], TODAY);
    expect(c.resolution).toEqual({ kind: 'shorten_taper', taperDays: 3 });
    expect(applyResolution({ id: 'x', taperDays: undefined } as unknown as TrainingGoal, c.resolution).taperDays).toBe(3);
  });
});

describe('toch allebei', () => {
  const stored = (g: ConflictGoal): TrainingGoal => ({
    id: g.id, name: g.name, status: 'active', targetDate: g.date, kind: g.kind, priority: g.priority, details: g.details, requirements: [], createdAt: '', updatedAt: '',
  });

  it('wordt bewaard als het paar van beide datums, en de melding komt dan niet terug', () => {
    const a = marathon(BASE);
    const b = trek(at(30));
    const conflicts = goalConflicts([a, b], TODAY);
    expect(conflicts).toHaveLength(1);
    const patched = acceptConflicts([stored(a), stored(b)], conflicts);
    expect(patched).toHaveLength(1);
    expect(patched[0].id).toBe(conflicts[0].goalId);
    expect(patched[0].conflictAccepted).toEqual([conflictPairKey(a.date, b.date)]);
    const goals = [stored(a), stored(b)].map((g) => patched.find((p) => p.id === g.id) ?? g);
    expect(conflictsForGoals(goals, new Set(), TODAY)).toEqual([]);
  });

  it('geldt niet meer als een van beide doelen van datum verandert, welk doel ook', () => {
    const a = marathon(BASE);
    const b = trek(at(30));
    const [c] = goalConflicts([a, b], TODAY);
    const patched = acceptConflicts([stored(a), stored(b)], [c])[0];
    const accepted = [stored(a), stored(b)].map((g) => (g.id === patched.id ? patched : g)) as TrainingGoal[];
    for (const moving of [a.id, b.id]) {
      const goals = accepted.map((g) => (g.id === moving ? { ...g, targetDate: addDays(g.targetDate!, 1) } : g));
      expect(conflictsForGoals(goals, new Set(), TODAY), `verschoven: ${moving}`).toHaveLength(1);
    }
    expect(conflictsForGoals(accepted, new Set(), TODAY)).toEqual([]);
  });

  it('vindt alleen de nieuwe botsingen na een verandering', () => {
    const a = marathon(BASE);
    const before = goalConflicts([a, trek(at(60))], TODAY);
    const after = goalConflicts([a, trek(at(60)), tenK(at(5))], TODAY);
    expect(before).toEqual([]);
    expect(newConflicts(before, after).length).toBeGreaterThan(0);
    expect(newConflicts(after, after)).toEqual([]);
  });
});

describe('van doelen naar botsingen', () => {
  const base = { createdAt: '', updatedAt: '' };
  const runRequirement = (km: number) => [{ id: 'r', kind: 'distance' as const, scope: 'SINGLE_EVENT' as const, target: { amount: km, unit: 'km' as const }, discipline: 'running' }];

  it('leest een hardloopwedstrijd zonder soort als run_race, het label uit de oude rol, en slaat doelen zonder datum over', () => {
    const goals: TrainingGoal[] = [
      { ...base, id: 'a', name: 'Marathon', status: 'active', targetDate: BASE, requirements: runRequirement(42.2), priority: 'top' },
      { ...base, id: 'b', name: 'Tien', status: 'active', targetDate: at(8), requirements: runRequirement(10) },
      { ...base, id: 'c', name: 'Zonder datum', status: 'paused', requirements: [] },
      { ...base, id: 'd', name: 'Gearchiveerd', status: 'archived', requirements: runRequirement(10) },
    ];
    const list = conflictGoalsFrom(goals, undefined);
    expect(list.map((g) => [g.id, g.kind, g.priority])).toEqual([['a', 'run_race', 'top'], ['b', 'run_race', 'voortop']]);
    expect(conflictsForGoals(goals, new Set(), TODAY)).toHaveLength(1);
  });

  it('negeert doelen in het verleden', () => {
    expect(goalConflicts([marathon('2026-12-01'), trek('2026-12-10')], TODAY)).toEqual([]);
  });

  it('de gekozen volgorde van de tab (TrainingGoal.order) gaat voor de plek van opslag', () => {
    const goals: TrainingGoal[] = [
      { ...base, id: 'a', name: 'Eerste in opslag', status: 'active', targetDate: BASE, requirements: runRequirement(10), order: 1 },
      { ...base, id: 'b', name: 'Tweede in opslag', status: 'active', targetDate: at(8), requirements: runRequirement(10), order: 0 },
    ];
    expect(conflictGoalsFrom(goals, undefined).map((g) => [g.id, g.order])).toEqual([['b', 0], ['a', 1]]);
  });
});
