import { describe, expect, it } from 'vitest';
import { locateNow, planStart, startReady, START_LINE_EXACT, type StartFailure } from './routeStart';
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
