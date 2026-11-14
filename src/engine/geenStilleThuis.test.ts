import { describe, expect, it } from 'vitest';
import { locateNow, maySearch, planStart, startReady, startView, START_LINE_EXACT, type StartFailure } from './routeStart';
import { OFFLINE_LINE, SEARCH_TIMEOUT_LINE, TERRAIN_TIMEOUT_LINE, TIMEOUT_LINE, routeSheetParts, routeSheetStage, searchFailLine } from './routeSheet';

// Eigenaar 14 november, op reis: "Hij moet dus stoppen met automatisch thuis." Nagemaakte punten.
const home = { lat: 51.5, lon: 4.5 };
const reasons: StartFailure[] = ['denied', 'unavailable', 'timeout', 'coarse', 'unsupported'];

describe('je plek lukt niet: vragen, niet zoeken', () => {
  for (const reason of reasons) {
    it(`${reason}: de stand ask, geen startpunt en dus geen zoektocht`, () => {
      const plan = planStart({ mode: 'here', home, found: { ok: false, reason } });
      expect(plan.kind).toBe('ask');
      expect(startReady(plan)).toBe(false);
      expect(plan.line).not.toContain(START_LINE_EXACT);
      const stage = routeSheetStage({ hasPlace: true, consent: true, asked: true, savedKnown: true, ask: true, search: 'busy' });
      expect(stage).toBe('ask');
      expect(routeSheetParts(stage)).toEqual(['ask']);
    });
  }

  it('Thuis gekozen in de instelling blijft gewoon Thuis: een eigen keuze', () => {
    const plan = planStart({ mode: 'exact', home });
    expect(plan).toMatchObject({ kind: 'home', point: home });
    expect(startReady(plan)).toBe(true);
  });

  it('Thuis na een tik op de vraag: er wordt gezocht, bij Thuis', () => {
    const plan = planStart({ mode: 'here', home, picked: 'home', found: { ok: false, reason: 'denied' } });
    expect(plan).toMatchObject({ kind: 'home', point: home });
    expect(startReady(plan)).toBe(true);
  });
});

describe('Opnieuw: precies één nieuwe vraag om je plek', () => {
  it('bij de vraag wordt niet gevraagd; Opnieuw (een nieuwe poging) vraagt één keer, daarna niet meer', () => {
    // Poging 0: gevraagd, mislukt: de vraag (ask) vraagt zelf niet nog eens.
    expect(locateNow('ask', 0, 0)).toBe(false);
    // Opnieuw: poging 1, de plek wordt weer bepaald.
    expect(locateNow('locate', 0, 1)).toBe(true);
    // Zelfde poging, nog een render: geen tweede vraag.
    expect(locateNow('locate', 1, 1)).toBe(false);
  });
});

describe('zoeken lukte niet: welke stap, en geen verbinding', () => {
  it('offline zegt dat je geen verbinding hebt, niet "probeer het later"', () => {
    expect(searchFailLine('offline', undefined, true)).toBe(OFFLINE_LINE);
    expect(OFFLINE_LINE).toBe('Je hebt geen verbinding. Zonder netwerk is er geen route.');
    expect(OFFLINE_LINE).not.toMatch(/later/);
  });
  it('een time-out terwijl je geen verbinding hebt: ook geen verbinding', () => {
    expect(searchFailLine('timeout', 'routes', false)).toBe(OFFLINE_LINE);
  });
  it('een time-out zegt welke stap niet op tijd was', () => {
    expect(searchFailLine('timeout', 'terrain', true)).toBe(TERRAIN_TIMEOUT_LINE);
    expect(searchFailLine('timeout', 'routes', true)).toBe(TIMEOUT_LINE);
    expect(searchFailLine('timeout', undefined, true)).toBe(SEARCH_TIMEOUT_LINE);
  });
});

describe('startView en maySearch: wat de regie uit het plan haalt', () => {
  const base = { closing: false, enabled: true, asked: true, searchNeeded: true, hasPlace: true };
  it('de vraag: geen zoektocht, de reden alleen in het vak', () => {
    const view = startView(planStart({ mode: 'here', home, found: { ok: false, reason: 'denied' } }));
    expect(view.ready).toBe(false);
    expect(view.ask?.homeOffered).toBe(true);
    expect(view.line).toBe('');
    expect(maySearch({ ...base, ready: view.ready })).toBe(false);
  });
  it('een startpunt: zoeken mag, tenzij het blad sluit, de Briefing het nog niet toestaat of het antwoord er al is', () => {
    const view = startView(planStart({ mode: 'exact', home }));
    expect(maySearch({ ...base, ready: view.ready })).toBe(true);
    expect(maySearch({ ...base, ready: view.ready, closing: true })).toBe(false);
    expect(maySearch({ ...base, ready: view.ready, enabled: false })).toBe(false);
    expect(maySearch({ ...base, ready: view.ready, asked: false })).toBe(false);
    expect(maySearch({ ...base, ready: view.ready, searchNeeded: false })).toBe(false);
    expect(maySearch({ ...base, ready: view.ready, hasPlace: false })).toBe(false);
  });
});

describe('de schermopname van de eigenaar (Briefing van een duurloop, op reis)', () => {
  it('(a) een tik op Waar je nu bent: chip en regel wisselen meteen, nooit nog "De lus begint bij Thuis."', () => {
    const plan = planStart({ mode: 'exact', home, picked: 'here' });
    expect(plan).toEqual({ kind: 'locate', chip: 'here', line: '' });
    expect(startView(plan).line).not.toContain(START_LINE_EXACT);
  });
  it('(b) Je plek bepalen is alleen een stap bij een verse plek van deze poging, niet na een mislukte plek en een tik op Thuis', () => {
    expect(startView(planStart({ mode: 'here', home })).hereMode).toBe(true);
    expect(startView(planStart({ mode: 'here', home, found: { ok: true, point: home } })).hereMode).toBe(true);
    expect(startView(planStart({ mode: 'here', home, picked: 'home', found: { ok: false, reason: 'timeout' } })).hereMode).toBe(false);
    expect(startView(planStart({ mode: 'here', home, found: { ok: false, reason: 'timeout' } })).hereMode).toBe(false);
  });
  it('(b) ook na een gelukte plek: kies je daarna Thuis, een plek of een punt, dan is je plek geen stap meer (bewust)', () => {
    const ok = { ok: true as const, point: { lat: 50.1, lon: 6.2 } };
    expect(startView(planStart({ mode: 'here', home, picked: 'home', found: ok })).hereMode).toBe(false);
    expect(startView(planStart({ mode: 'here', home, place: { lat: 50.3, lon: 6.4 }, found: ok })).hereMode).toBe(false);
    expect(startView(planStart({ mode: 'here', home, tap: { lat: 50.3, lon: 6.4 }, found: ok })).hereMode).toBe(false);
    expect(startView(planStart({ mode: 'approx', home })).hereMode).toBe(false);
  });
  it('Thuis niet gelezen en je plek lukt niet: vragen, zonder Thuis in de regel en zonder stap Je plek bepalen', () => {
    const view = startView(planStart({ mode: 'here', home: null, homeUnread: true, found: { ok: false, reason: 'denied' } }));
    expect(view.ask?.homeOffered).toBe(false);
    expect(view.ask?.line).not.toContain('Thuis of Andere plek');
    expect(view.hereMode).toBe(false);
    expect(view.ready).toBe(false);
  });
});
