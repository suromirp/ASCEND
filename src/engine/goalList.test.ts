import { describe, it, expect } from 'vitest';
import { conflictGoalsFrom } from './goalConflicts';
import type { TrainingGoal } from '../models/goals';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import {
  goalsSentence, labelEffectLines, labelLine, listedGoals, marathonSettingsFor, landingIndex, moveGoal, moveOutcome, nextKeySession, orderForRestored, orderPatch, stepAvailability, seasonStrip, weeksWord, PRIORITY_RULE,
} from './goalList';

const TODAY = '2026-10-26';
const mk = (id: string, date: string | undefined, over: Partial<TrainingGoal> = {}): TrainingGoal => ({
  id, name: `Doel ${id}`, requirements: [], createdAt: '', updatedAt: '',
  ...(date ? { status: 'active', targetDate: date } : { status: 'paused' }),
  ...over,
}) as TrainingGoal;
const run10 = (id: string, date: string, over: Partial<TrainingGoal> = {}) =>
  mk(id, date, { kind: 'run_race', details: { distanceKm: 10 }, requirements: [{ id: 'r', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 10, unit: 'km' }, discipline: 'running' }], ...over });

describe('de lijst met doelen', () => {
  it('groepeert op label en houdt binnen een label de gekozen volgorde', () => {
    const goals = [run10('a', '2027-03-14', { priority: 'voortop', order: 1 }), mk('b', '2027-07-10', { kind: 'trek_tent', priority: 'top', order: 0 }), run10('c', '2027-09-18', { priority: 'verkenning', order: 2 }), run10('d', '2027-04-01', { priority: 'voortop', order: 0 })];
    expect(listedGoals(goals, new Set(), TODAY).map((g) => g.goal.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('zonder volgorde geldt de plek van opslag, en het hoofddoel met mijlpalen staat altijd bovenaan als Top', () => {
    const goals = [run10('a', '2027-03-14', { priority: 'voortop' }), mk('gr5', '2027-07-01', { kind: 'trek_hut' })];
    const listed = listedGoals(goals, new Set(['gr5']), TODAY);
    expect(listed.map((g) => g.goal.id)).toEqual(['gr5', 'a']);
    expect(listed[0]).toMatchObject({ priority: 'top', isMain: true });
  });

  it('laat gearchiveerde, afgeronde en voorbije doelen weg; die staan onder Eerder', () => {
    const goals = [mk('a', '2027-03-14'), mk('b', undefined, { status: 'archived' }), mk('c', '2026-09-01', { status: 'active' }), mk('d', '2027-01-01', { status: 'completed' })];
    const listed = listedGoals(goals, new Set(), TODAY);
    expect(listed.map((g) => g.goal.id)).toEqual(['a']);
    expect(listedGoals(goals, new Set(), TODAY, { earlier: true }).map((g) => g.goal.id).sort()).toEqual(['b', 'c', 'd']);
  });

  it('een doel zonder datum (fit blijven) blijft in de lijst', () => {
    expect(listedGoals([mk('f', undefined, { kind: 'fit', priority: 'verkenning' })], new Set(), TODAY)).toHaveLength(1);
  });
});

describe('de zin onder de titel', () => {
  it('telt de doelen en noemt het eerste in de tijd', () => {
    const goals = [mk('b', '2027-07-10'), run10('a', '2027-03-14')];
    const listed = listedGoals(goals, new Set(), TODAY);
    expect(goalsSentence(listed, TODAY)).toBe('2 doelen, en het eerste is over 20 weken.');
  });

  it('enkelvoud en zonder datum', () => {
    expect(goalsSentence(listedGoals([run10('a', '2026-11-02')], new Set(), TODAY), TODAY)).toBe('1 doel, en dat is al over 1 week.');
    expect(goalsSentence(listedGoals([mk('f', undefined, { kind: 'fit' })], new Set(), TODAY), TODAY)).toBe('1 doel.');
    expect(goalsSentence([], TODAY)).toBe('Nog geen doel.');
  });

  it('weken in woorden', () => {
    expect(weeksWord(1)).toBe('1 week');
    expect(weeksWord(37)).toBe('37 weken');
  });
});

describe('de seizoensstrook', () => {
  const goals = [run10('a', '2027-03-14', { priority: 'voortop' }), mk('b', '2027-07-10', { kind: 'trek_tent', priority: 'top' }), run10('c', '2027-09-18', { priority: 'verkenning' })];
  const strip = seasonStrip(listedGoals(goals, new Set(), TODAY), TODAY)!;

  it('loopt van nu tot na het laatste doel, met een vlag per doel op volgorde van datum', () => {
    expect(strip.start).toBe(TODAY);
    expect(strip.flags.map((f) => f.id)).toEqual(['a', 'b', 'c']);
    expect(strip.flags.every((f, i, all) => f.fraction > 0 && f.fraction < 1 && (i === 0 || f.fraction > all[i - 1].fraction))).toBe(true);
    expect(strip.end >= '2027-09-18').toBe(true);
  });

  it('zet de weken tussen twee vlaggen', () => {
    expect(strip.gaps.map((g) => g.weeks)).toEqual([17, 10]);
    expect(strip.gaps[0].from).toBeCloseTo(strip.flags[0].fraction, 5);
    expect(strip.gaps[0].to).toBeCloseTo(strip.flags[1].fraction, 5);
  });

  it('geeft maanden als letter op hun plek', () => {
    expect(strip.months.length).toBeGreaterThan(8);
    expect(strip.months[0].fraction).toBeGreaterThanOrEqual(0);
    expect(strip.months.every((m) => m.letter.length === 1)).toBe(true);
  });

  it('er is geen strook zonder een doel met datum, en een enkel doel krijgt toch een strook', () => {
    expect(seasonStrip(listedGoals([mk('f', undefined)], new Set(), TODAY), TODAY)).toBeUndefined();
    const one = seasonStrip(listedGoals([run10('a', '2026-12-05')], new Set(), TODAY), TODAY)!;
    expect(one.flags).toHaveLength(1);
    expect(one.gaps).toEqual([]);
    expect(one.flags[0].fraction).toBeLessThan(1);
  });
});

describe('het label in gewone woorden', () => {
  it('Top, Voortop en Verkenning, met de afbouw van de soort', () => {
    const g = run10('a', '2027-03-14');
    expect(labelLine(g, 'top')).toMatch(/^Hier doe je het voor\./);
    expect(labelLine(g, 'voortop')).toBe('Een goede dag, geen alles of niets. Vier dagen rustiger ervoor.');
    expect(labelLine(g, 'verkenning')).toBe('Gewoon meedoen als training. Geen rust ervoor.');
  });

  it('een lange afbouw in weken', () => {
    const trek = mk('t', '2027-07-10', { kind: 'trek_tent', details: { days: 9 } });
    expect(labelLine(trek, 'top')).toMatch(/weken rustiger ervoor/);
  });

  it('elke regel van het label is er', () => {
    expect(Object.keys(PRIORITY_RULE)).toEqual(['top', 'voortop', 'verkenning']);
  });

  it('wat het label voor dit doel doet: afbouw, herstel en eigen blok', () => {
    const g = run10('a', '2027-03-14', { priority: 'voortop' });
    const top = labelEffectLines(g, 'top', 'voortop');
    expect(top[0]).toBe('8 dagen rustiger, in plaats van 4');
    expect(top.some((l) => /opbouw/.test(l))).toBe(true);
    const ver = labelEffectLines(g, 'verkenning', 'voortop');
    expect(ver.some((l) => /geen eigen blok/i.test(l))).toBe(true);
    expect(ver.some((l) => /Geen afbouw/.test(l))).toBe(true);
    expect(labelEffectLines(g, 'voortop', 'voortop')[0]).toBe('4 dagen rustiger ervoor');
  });
});

describe('slepen, hoger en lager', () => {
  const listed = () => listedGoals([
    mk('t', '2027-07-10', { priority: 'top', order: 0 }), run10('v1', '2027-03-14', { priority: 'voortop', order: 1 }), run10('v2', '2027-04-14', { priority: 'voortop', order: 2 }), run10('e', '2027-09-18', { priority: 'verkenning', order: 3 }),
  ], new Set(), TODAY);

  it('naar boven neemt het label van wie nu eronder staat, naar beneden dat van wie erboven staat', () => {
    expect(moveGoal(listed(), 'v1', 0)).toMatchObject({ ids: ['v1', 't', 'v2', 'e'], priority: 'top', changesLabel: true });
    expect(moveGoal(listed(), 'v2', 3)).toMatchObject({ ids: ['t', 'v1', 'e', 'v2'], priority: 'verkenning', changesLabel: true });
    expect(moveGoal(listed(), 'v2', 1)).toMatchObject({ ids: ['t', 'v2', 'v1', 'e'], priority: 'voortop', changesLabel: false });
  });

  it('een doel op dezelfde plek verandert niets', () => {
    expect(moveGoal(listed(), 'v1', 1)).toMatchObject({ ids: ['t', 'v1', 'v2', 'e'], priority: 'voortop', changed: false });
  });

  it('Hoger en Lager zijn een stap', () => {
    const r = moveGoal(listed(), 'v2', 'up');
    expect(r.ids).toEqual(['t', 'v2', 'v1', 'e']);
    expect(r.priority).toBe('voortop');
    expect(moveGoal(listed(), 'e', 'down').changed).toBe(false);
    expect(moveGoal(listed(), 'e', 'up').priority).toBe('voortop');
  });

  it('het hoofddoel met mijlpalen blijft Top en blijft in de groep van Tops', () => {
    const l = listedGoals([mk('gr5', '2027-07-01', { kind: 'trek_hut', order: 0 }), run10('v', '2027-03-14', { priority: 'voortop', order: 1 })], new Set(['gr5']), TODAY);
    const r = moveGoal(l, 'gr5', 1);
    expect(r.priority).toBe('top');
    expect(r.ids).toEqual(['gr5', 'v']);
    expect(r.changed).toBe(false);
  });

  it('de volgorde wordt als getallen opgeslagen, alleen waar ze verschillen', () => {
    expect(orderPatch(listed(), ['t', 'v2', 'v1', 'e'])).toEqual([{ id: 'v2', order: 1 }, { id: 'v1', order: 2 }]);
  });
});

describe('Hoger en Lager die niets kunnen doen', () => {
  const l = listedGoals([
    mk('gr5', '2027-07-01', { kind: 'trek_hut', order: 0 }), run10('v', '2027-03-14', { priority: 'voortop', order: 1 }), run10('e', '2027-09-18', { priority: 'verkenning', order: 2 }),
  ], new Set(['gr5']), TODAY);

  it('het eerste doel kan niet hoger en het laatste niet lager, met een reden', () => {
    expect(stepAvailability(l, 'gr5', 'up')).toEqual({ can: false, reason: 'Dit doel staat al bovenaan.' });
    expect(stepAvailability(l, 'e', 'down')).toEqual({ can: false, reason: 'Dit doel staat al onderaan.' });
  });

  it('het hoofddoel kan niet lager zolang daaronder geen Top staat', () => {
    const r = stepAvailability(l, 'gr5', 'down');
    expect(r.can).toBe(false);
    expect(r).toMatchObject({ reason: expect.stringContaining('Top') });
  });

  it('een doel direct onder het hoofddoel kan hoger, want het krijgt het label van het hoofddoel', () => {
    expect(stepAvailability(l, 'v', 'up')).toEqual({ can: true });
    expect(moveGoal(l, 'v', 'up').priority).toBe('top');
  });

  it('wat kan, kan ook echt: de knop volgt moveGoal', () => {
    for (const x of l) {
      for (const dir of ['up', 'down'] as const) {
        expect(stepAvailability(l, x.goal.id, dir).can).toBe(moveGoal(l, x.goal.id, dir).changed);
      }
    }
  });

  it('het hoofddoel belandt bij slepen nooit onder een doel dat geen Top is', () => {
    expect(landingIndex(l, 'gr5', 2)).toBe(0);
    expect(landingIndex(l, 'v', 0)).toBe(0);
    expect(landingIndex(l, 'v', 2)).toBe(2);
  });
});

describe('een teruggehaald doel', () => {
  it('komt achteraan de zichtbare lijst', () => {
    const goals = [mk('a', '2027-03-14', { order: 0 }), mk('b', '2027-04-14', { order: 1 }), mk('x', undefined, { status: 'archived', order: 0 })];
    expect(orderForRestored(goals, new Set(), TODAY)).toBe(2);
    expect(orderForRestored([], new Set(), TODAY)).toBe(0);
  });

  it('zonder volgorde telt de plek van opslag', () => {
    expect(orderForRestored([mk('a', '2027-03-14'), mk('b', '2027-04-14')], new Set(), TODAY)).toBe(2);
  });
});

describe('slepen met doelen van een ander label in de opslag', () => {
  // Opslag: X en Y (Verkenning) staan vooraan, dan A, B en C (Top) zonder volgorde.
  const goals = () => [
    run10('x', '2027-05-01', { priority: 'verkenning' }), run10('y', '2027-06-01', { priority: 'verkenning' }),
    run10('a', '2027-03-14', { priority: 'top' }), run10('b', '2027-07-10', { priority: 'top' }), run10('c', '2027-09-18', { priority: 'top' }),
  ];

  it('C tussen A en B geeft A, C, B en schrijft elk doel van de lijst weg', () => {
    const g = goals();
    const l = listedGoals(g, new Set(), TODAY);
    expect(l.map((x) => x.goal.id)).toEqual(['a', 'b', 'c', 'x', 'y']);
    const r = moveGoal(l, 'c', 1);
    expect(r.ids).toEqual(['a', 'c', 'b', 'x', 'y']);
    const patch = orderPatch(l, r.ids);
    expect(patch).toHaveLength(5);
    const after = g.map((x) => ({ ...x, order: patch.find((p) => p.id === x.id)?.order }));
    expect(listedGoals(after, new Set(), TODAY).map((x) => x.goal.id)).toEqual(['a', 'c', 'b', 'x', 'y']);
  });

  it('de botsingen lezen dezelfde volgorde als de lijst', () => {
    const g = goals().map((x, i) => ({ ...x, order: [4, 3, 2, 0, 1][i] }));
    const listedIds = listedGoals(g, new Set(), TODAY).map((x) => x.goal.id);
    const byOrder = conflictGoalsFrom(g, undefined).sort((p, q) => p.order - q.order).map((x) => x.id);
    expect(byOrder.filter((id) => ['a', 'b', 'c'].includes(id))).toEqual(listedIds.filter((id) => ['a', 'b', 'c'].includes(id)));
  });

  it('een verplaatsing zonder gevolg voor botsingen wordt alleen bewaard, een ander label is een voorstel', () => {
    const l = listedGoals(goals(), new Set(), TODAY);
    expect(moveOutcome(goals(), l, moveGoal(l, 'c', 1), new Set(), TODAY)).toMatchObject({ kind: 'save' });
    const ordered = goals().map((x, i) => ({ ...x, order: [3, 4, 0, 1, 2][i] }));
    const lo = listedGoals(ordered, new Set(), TODAY);
    expect(moveOutcome(ordered, lo, moveGoal(lo, 'a', 0), new Set(), TODAY)).toEqual({ kind: 'nothing' });
    expect(moveOutcome(goals(), l, moveGoal(l, 'x', 0), new Set(), TODAY)).toEqual({ kind: 'label' });
  });
});

describe('het marathondoel en de instellingen', () => {
  it('geeft niets voor een doel dat geen marathondoel is', () => {
    const g = run10('a', '2027-03-14');
    expect(marathonSettingsFor(g, g)).toBeUndefined();
  });
});

describe('de volgende stap', () => {
  const tpl = (id: string, name: string, type: SessionTemplate['type'] = 'hiking'): SessionTemplate => ({ id, name, type } as SessionTemplate);
  const sess = (id: string, templateId: string, date: string, minutes?: number): PlannedSession => ({ id, templateId, scheduledDate: date, status: 'planned', ...(minutes ? { plannedMinutes: minutes } : {}) } as PlannedSession);
  const templates = [tpl('long', 'Lange loop', 'cardio'), tpl('str', 'Bovenlichaam', 'strength'), tpl('rest', 'Rustig', 'recovery')];

  it('kiest de langste training van de komende twee weken die nog niet gedaan is', () => {
    const sessions = [sess('1', 'str', '2026-10-27', 45), sess('2', 'long', '2026-11-01', 75), sess('3', 'long', '2026-11-08', 60), sess('4', 'rest', '2026-10-28', 120)];
    expect(nextKeySession(sessions, templates, [], TODAY)).toMatchObject({ date: '2026-11-01', name: 'Lange loop', minutes: 75 });
  });

  it('slaat een training over die al een log heeft', () => {
    const sessions = [sess('2', 'long', '2026-11-01', 75), sess('3', 'long', '2026-11-08', 60)];
    const logs = [{ id: 'l', plannedSessionId: '2', completedDate: '2026-11-01' } as SessionLog];
    expect(nextKeySession(sessions, templates, logs, TODAY)?.date).toBe('2026-11-08');
  });

  it('niets te plannen is geen stap', () => {
    expect(nextKeySession([], templates, [], TODAY)).toBeUndefined();
  });
});
