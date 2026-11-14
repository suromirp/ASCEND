import { describe, expect, it } from 'vitest';
import { locateAnswerCounts, planStart, resolveRouteStart, START_LINE_APPROX, START_LINE_EXACT, START_LINE_HOME_UNREAD, START_LINE_NO_HOME, START_LINE_TAP, askStartLine, startFailureReason, type StartFailure } from './routeStart';
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

describe('locatie lukt niet: nooit stil terug op Thuis (eigenaar 14 november, op reis)', () => {
  for (const reason of ['denied', 'unavailable', 'timeout', 'coarse', 'unsupported'] as const) {
    it(`${reason}, met Thuis: vragen (Opnieuw, Thuis, Andere plek), geen punt en dus geen zoektocht`, () => {
      const p = planStart({ mode: 'here', home, found: fail(reason) });
      expect(p).toEqual({ kind: 'ask', chip: 'here', line: askStartLine(reason), reason, homeOffered: true });
      expect('point' in p).toBe(false);
      expect(p.line).not.toContain(START_LINE_EXACT);
    });
    it(`${reason}, zonder Thuis: ook vragen, geen stille Ongeveer`, () => {
      const p = planStart({ mode: 'here', home: undefined, found: fail(reason) });
      expect(p).toEqual({ kind: 'ask', chip: 'here', line: askStartLine(reason), reason, homeOffered: false });
      expect(p.line).not.toContain('afgerond');
    });
  }
  it('Thuis na een tik op de vraag: de lus begint bij Thuis', () => {
    expect(planStart({ mode: 'here', home, picked: 'home', found: fail('denied') })).toEqual({ kind: 'home', chip: 'home', point: home, line: '' });
  });
  it('Andere plek na de vraag: de lus begint bij die plek', () => {
    expect(planStart({ mode: 'here', home, place: tap, found: fail('timeout') })).toMatchObject({ kind: 'place', point: tap });
  });
  it('de regel: de reden kort, dan de vraag', () => {
    expect(askStartLine('denied')).toBe('ASCEND mag je locatie niet gebruiken. Kies waar de lus begint.');
  });
  it('te grof (meer dan 50 m) heeft een eigen reden', () => {
    expect(startFailureReason('coarse')).toBe('ASCEND krijgt je precieze plek niet.');
  });
});

describe('geen Thuis', () => {
  it('instelling Thuis zonder Thuis: Waar je nu bent, met één regel', () => {
    expect(planStart({ mode: 'exact', home: undefined })).toEqual({ kind: 'locate', chip: 'here', line: '' });
    expect(planStart({ mode: 'exact', home: null, found: { ok: true, point: here } }).line).toBe(START_LINE_NO_HOME);
  });
  it('instelling Thuis zonder Thuis en je plek lukt niet: vragen, zonder Thuis om te kiezen', () => {
    const p = planStart({ mode: 'exact', home: undefined, found: fail('denied') });
    expect(p).toMatchObject({ kind: 'ask', homeOffered: false });
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
  it('en je plek lukt ook niet: vragen zonder Thuis om te kiezen, de regel noemt beide', () => {
    const p = planStart({ mode: 'exact', home: null, homeUnread: true, found: fail('timeout') });
    expect(p).toMatchObject({ kind: 'ask', homeOffered: false });
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

describe('een bewaarde of gezochte plek (Andere plek)', () => {
  const spot = { lat: 51.5, lon: 5.9 };
  const home = { lat: 52, lon: 5 };
  it('begint precies daar, zonder vraag om je plek en zonder regel, ook bij Ongeveer en Thuis', () => {
    for (const mode of ['here', 'exact', 'approx'] as const) {
      expect(planStart({ mode, home, place: spot })).toEqual({ kind: 'place', chip: mode === 'exact' ? 'home' : 'here', point: spot, line: '' });
    }
  });
  it('Thuis niet gelezen: de plek werkt gewoon', () => {
    expect(planStart({ mode: 'here', home: null, homeUnread: true, place: spot }).kind).toBe('place');
  });
  it('een getikt punt gaat voor de plek', () => {
    expect(planStart({ mode: 'here', home, place: spot, tap: home }).kind).toBe('tap');
  });
  it('een kapotte plek telt niet', () => {
    expect(planStart({ mode: 'here', home, place: { lat: Number.NaN, lon: 5 } }).kind).toBe('locate');
  });
});
