import { describe, expect, it } from 'vitest';
import { locateAnswerCounts, planStart, resolveRouteStart, START_LINE_APPROX, START_LINE_EXACT, START_LINE_HOME_UNREAD, START_LINE_NO_HOME, START_LINE_NO_HOME_NO_PLACE, START_LINE_TAP, startFailureReason, type StartFailure } from './routeStart';
import { homeFromStartPoint, startChoices } from './places';

// Start bij (docs/onderhoud/2026-11-11-pathfinder-route-start.md). Nagemaakte punten, geen echte plek.
const home = { lat: 51.5, lon: 4.5 };
const here = { lat: 50.1, lon: 6.2 };
const tap = { lat: 50.2, lon: 6.3 };
const fail = (reason: StartFailure) => ({ ok: false as const, reason });

describe('Start bij: welke chip en welk punt', () => {
  it('bij openen Waar je nu bent (advies), ook als er een Thuis is', () => {
    const p = planStart({ mode: 'here', home });
    expect(p).toEqual({ kind: 'locate', chip: 'here', line: '' });
    expect(planStart({ mode: 'here', home, found: { ok: true, point: here } })).toEqual({ kind: 'here', chip: 'here', point: here, line: '' });
  });
  it('Thuis alleen bij de instelling Thuis of na een tik, en dan zonder regel (de chip zegt het)', () => {
    expect(planStart({ mode: 'exact', home })).toEqual({ kind: 'home', chip: 'home', point: home, line: '' });
    expect(planStart({ mode: 'here', home, picked: 'home' })).toEqual({ kind: 'home', chip: 'home', point: home, line: '' });
  });
  it('een tik op Waar je nu bent wint van de instelling Thuis', () => {
    expect(planStart({ mode: 'exact', home, picked: 'here' }).chip).toBe('here');
  });
  it('oude back-up met routeStart exact leest als Thuis gekozen', () => {
    const mode = resolveRouteStart('exact');
    expect(planStart({ mode, home }).chip).toBe('home');
    expect(startChoices(mode, [homeFromStartPoint(home, '2026-11-11')!]).chosen.kind).toBe('home');
  });
});

describe('locatie lukt niet: nooit stil terugvallen', () => {
  for (const reason of ['denied', 'coarse', 'timeout'] as const) {
    it(`${reason}, met Thuis: de chip Thuis staat gekozen en de regel zegt de reden en dat hij bij Thuis begint`, () => {
      const p = planStart({ mode: 'here', home, found: fail(reason) });
      expect(p).toEqual({ kind: 'home', chip: 'home', point: home, line: `${startFailureReason(reason)} ${START_LINE_EXACT}` });
      expect(p.line).toContain('Thuis');
      expect(p.line).not.toMatch(/vast punt/i);
    });
    it(`${reason}, zonder Thuis: Ongeveer, in één zin`, () => {
      const p = planStart({ mode: 'here', home: undefined, found: fail(reason) });
      expect(p).toEqual({ kind: 'approx', chip: 'here', line: START_LINE_NO_HOME_NO_PLACE });
      expect(p.line).toBe('Geen Thuis en geen locatie: de lus begint bij je plek, afgerond op ongeveer een kilometer.');
    });
  }
  it('te grof (meer dan 50 m) heeft een eigen reden', () => {
    expect(startFailureReason('coarse')).toBe('ASCEND krijgt je precieze plek niet.');
  });
});

describe('geen Thuis', () => {
  it('instelling Thuis zonder Thuis: Waar je nu bent, met één regel', () => {
    expect(planStart({ mode: 'exact', home: undefined })).toEqual({ kind: 'locate', chip: 'here', line: '' });
    expect(planStart({ mode: 'exact', home: null, found: { ok: true, point: here } }).line).toBe(START_LINE_NO_HOME);
  });
  it('instelling Thuis zonder Thuis en je plek lukt niet: de regel noemt beide', () => {
    const p = planStart({ mode: 'exact', home: undefined, found: fail('denied') });
    expect(p).toEqual({ kind: 'approx', chip: 'here', line: START_LINE_NO_HOME_NO_PLACE });
  });
  it('een tik op Thuis zonder Thuis kiest Waar je nu bent', () => {
    expect(planStart({ mode: 'here', home: undefined, picked: 'home' }).chip).toBe('here');
  });
  it('een kapot punt telt als geen Thuis', () => {
    expect(planStart({ mode: 'exact', home: { lat: 'x' } }).chip).toBe('here');
  });
});

describe('Ongeveer en een getikt punt wijken af: dan wel een regel', () => {
  it('instelling Ongeveer: onder de chip Waar je nu bent, zonder vraag om je plek', () => {
    expect(planStart({ mode: 'approx', home })).toEqual({ kind: 'approx', chip: 'here', line: START_LINE_APPROX });
  });
  it('bij Ongeveer blijft een tik op Waar je nu bent afgerond: de precieze plek gaat niet de deur uit', () => {
    expect(planStart({ mode: 'approx', home, picked: 'here' })).toEqual({ kind: 'approx', chip: 'here', line: START_LINE_APPROX });
    // Ook met een plek die er al is (Thuis en terug): nog steeds afgerond.
    expect(planStart({ mode: 'approx', home, picked: 'here', found: { ok: true, point: here } }).kind).toBe('approx');
  });
  it('bij Ongeveer kiest een tik op Thuis wel Thuis', () => {
    expect(planStart({ mode: 'approx', home, picked: 'home' }).kind).toBe('home');
  });
  it('Start hier: het getikte punt, met een regel', () => {
    expect(planStart({ mode: 'exact', home, tap })).toEqual({ kind: 'tap', chip: 'home', point: tap, line: START_LINE_TAP });
  });
});

describe('Thuis niet gelezen (trage of kapotte opslag)', () => {
  it('niet raden dat er geen Thuis is: een eigen regel, ook bij de instelling Thuis', () => {
    expect(planStart({ mode: 'exact', home: null, homeUnread: true })).toEqual({ kind: 'locate', chip: 'here', line: START_LINE_HOME_UNREAD });
    expect(planStart({ mode: 'here', home: null, homeUnread: true, found: { ok: true, point: here } })).toEqual({ kind: 'here', chip: 'here', point: here, line: START_LINE_HOME_UNREAD });
    expect(START_LINE_HOME_UNREAD).toBe('Thuis kon niet gelezen worden. De lus begint waar je nu bent.');
  });
  it('en je plek lukt ook niet: afgerond, de regel noemt beide', () => {
    const p = planStart({ mode: 'exact', home: null, homeUnread: true, found: fail('timeout') });
    expect(p.kind).toBe('approx');
    expect(p.line).toContain('Thuis kon niet gelezen worden.');
    expect(p.line).toContain(startFailureReason('timeout'));
  });
  it('nooit "Je hebt nog geen Thuis" als Thuis niet gelezen is', () => {
    for (const found of [undefined, { ok: true as const, point: here }, fail('denied')]) {
      expect(planStart({ mode: 'exact', home: null, homeUnread: true, found }).line).not.toContain('nog geen Thuis');
    }
  });
});

describe('een antwoord op de vraag om je plek telt alleen voor de poging die hem stelde', () => {
  it('een laat antwoord van poging 1 telt niet meer als poging 2 vroeg', () => {
    expect(locateAnswerCounts(2, 1)).toBe(false);
    expect(locateAnswerCounts(2, 2)).toBe(true);
    expect(locateAnswerCounts(undefined, 0)).toBe(false);
  });
});
