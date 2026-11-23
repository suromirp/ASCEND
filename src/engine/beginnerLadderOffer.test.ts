import { describe, expect, it } from 'vitest';
import { BEGINNER_LADDER_RULE, beginnerLadderAdvice, beginnerLadderLines, beginnerLadderOfferId } from './beginnerLadderOffer';
import { layoutWaves } from './programLayout';
import { WALK_JOG_LINE } from './beginnerStart';
import type { Program } from '../models/program';
import { addDays } from '../utils/dates';

// Stap 4 van docs/visie/Ontwerp beginner rest.md: wie al in een start zit, krijgt een voorstel op Vandaag.
// Nagemaakt programma, geen echte data.
const START = '2026-10-26';
const program = (beginnerWeeks = 4, length = 4): Program => ({
  id: 'p', name: 'P', startDate: START,
  phases: layoutWaves(START, START, 12, START, beginnerWeeks, { length, light: true }),
});
const day = (week: number, weekday = 3) => addDays(START, (week - 1) * 7 + weekday - 1);
const offer = (settings: Record<string, unknown>, today = day(1), p: Program | null = program()) =>
  beginnerLadderAdvice({ settings: { directionStart: START, ...settings }, program: p, today });
const NO_GHOST_HYPHENS = /[–—]/;

describe('het voorstel voor wie al in een start zit', () => {
  it('een lopende start zonder keuze en een start op heel licht van voor de ladder krijgen het', () => {
    for (const settings of [{}, { beginnerBuild: 'licht' }]) {
      const a = offer(settings);
      expect(a).toHaveLength(1);
      expect(a[0].ruleId).toBe(BEGINNER_LADDER_RULE);
      expect(a[0].beginnerLadder).toBe(true);
      expect(a[0].effect).toMatch(/^Je start wordt lichter\. Kracht 35 minuten, wandelen en dribbelen 20 en 30 minuten\./);
    }
  });

  it('niet bij Gewoon, niet met Akkoord op de ladder, niet buiten de start of na de ladder', () => {
    expect(offer({ beginnerBuild: 'gewoon' })).toEqual([]);
    expect(offer({ beginnerBuild: 'licht', beginnerLadder: 'agreed' })).toEqual([]);
    expect(offer({}, day(5))).toEqual([]);
    expect(offer({}, day(5), program(4, 3))).toEqual([]);
    expect(offer({}, addDays(START, -1))).toEqual([]);
    expect(offer({}, day(1), null)).toEqual([]);
    expect(offer({}, day(1), program(0))).toEqual([]);
  });

  it('een id per start: de startmaandag van de richting, niet de dag van vragen', () => {
    const ids = [1, 2, 3, 4].flatMap((w) => [1, 4, 7].map((d) => offer({}, day(w, d))[0].id));
    expect(new Set(ids)).toEqual(new Set([beginnerLadderOfferId(START)]));
    // Een richting die op een woensdag begon: dezelfde maandag.
    expect(offer({ directionStart: addDays(START, 2) })[0].id).toBe(beginnerLadderOfferId(START));
  });

  it('Liever niet of Akkoord: het komt niet terug, ook niet in een latere week van dezelfde start', () => {
    const answered = new Set([beginnerLadderOfferId(START)]);
    for (const w of [1, 2, 3, 4]) {
      expect(beginnerLadderAdvice({ settings: { directionStart: START }, program: program(), today: day(w), responded: (id) => answered.has(id) })).toEqual([]);
    }
    // Een antwoord op een andere start houdt dit voorstel niet tegen.
    const other = new Set([beginnerLadderOfferId(addDays(START, -70))]);
    expect(beginnerLadderAdvice({ settings: { directionStart: START }, program: program(), today: day(1), responded: (id) => other.has(id) })).toHaveLength(1);
  });

  it('de getallen komen uit de ladder van deze week', () => {
    expect(offer({}, day(3))[0].effect).toMatch(/Kracht 55 minuten, wandelen en dribbelen 30 en 40 minuten/);
  });

  it('wat er verandert: wandelen en dribbelen alleen als dat nieuw is, en de Herstelwandeling', () => {
    const fromGewoon = beginnerLadderLines({}, 1);
    const fromLicht = beginnerLadderLines({ beginnerBuild: 'licht' }, 1);
    expect(fromGewoon).toContain(WALK_JOG_LINE);
    expect(fromLicht).not.toContain(WALK_JOG_LINE);
    expect(fromLicht.join(' ')).toMatch(/kracht 35 minuten/);
    expect(fromLicht.join(' ')).toMatch(/herstelwandeling duurt hoogstens 20 minuten/);
    expect(beginnerLadderLines({}, 4).join(' ')).not.toMatch(/Elke week iets meer/);
  });

  it('teksten zonder gedachtestreepjes', () => {
    const a = offer({})[0];
    for (const text of [a.title, a.brief ?? '', a.effect, a.why, ...beginnerLadderLines({}, 1)]) expect(text).not.toMatch(NO_GHOST_HYPHENS);
  });
});
