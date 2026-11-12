import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { RouteProposal, RouteTarget } from '../models/route';
import type { BriefingView } from '../engine/briefing';
import type { RouteSearchModel } from './useRouteSearch';
import { CHOOSE_PLACE, MapPlace, NO_PLACE_BRIEFING } from './TrainingBriefing';
import { BRIEFING_MAP_HEIGHT, NO_PLACE_LINE, OFFLINE_LINE } from '../engine/routeSheet';

// De beweging leest de instellingen van de app; hier staat hij vast op Vol.
vi.mock('./motion', () => ({ useMotionMode: () => 'full' }));

// De plek van de kaart in de Briefing (spoor 5), echt gerenderd zonder DOM. Nagemaakte lus en training.
const target: RouteTarget = { distanceKm: 7, ascentM: 40 };
const loop = (over: Partial<RouteProposal> = {}): RouteProposal => ({ style: 'adventure', source: 'brouter', points: [{ lat: 0, lon: 0 }, { lat: 0.01, lon: 0 }], distanceM: 7_200, ascentM: 50, repeatedShare: 0, hills: 1, ...over });

function model(over: Partial<RouteSearchModel> = {}): RouteSearchModel {
  return {
    stage: 'searching', lat: 52, lon: 5, target, startLine: '', choose: async () => undefined,
    startChips: [{ kind: 'here', label: 'Waar je nu bent' }], startChip: 'here', savedStarts: [], placeStart: undefined, homePoint: undefined, pickStart: () => undefined, mePoint: undefined, hasHome: false, makeHome: async () => false, tapPoint: undefined,
    order: ['adventure', 'simple'], plans: undefined, okStyles: [], picked: undefined, pickedOutcome: undefined,
    setChosen: () => undefined, mapRoutes: [], mapStartPoint: undefined, base: 'none', photo: 'map', setPhoto: () => undefined, hereMode: false, noMap: false, markNoMap: () => undefined,
    startOnMap: async () => ({ ok: false, line: '' }), steps: ['terrain', 'routes'], currentStep: 'terrain', limitLine: 'Hoogstens een halve minuut.', limitMs: 30_000, searchKey: 'k',
    foundLines: [], sources: [], parts: [], retry: () => undefined, sender: null, ...over,
  };
}

const routeView = (search: 'open' | 'tap' = 'open'): BriefingView => ({
  head: { eyebrow: 'HARDLOPEN', purpose: 'Rustig.', dayLine: 'Zo 15 november' },
  heart: { facts: [{ value: '40 min', label: 'totaal' }], zone: 2, steps: false },
  stand: { kind: 'watch', line: 'Vinkt zelf af', manualLabel: 'Zelf invullen' },
  places: [], place: 'run_outdoor', map: { kind: 'route', target, line: '7 km, 40 m stijgen', search }, rows: [], stopSignals: [], footer: { kind: 'route', label: 'Route naar Garmin Connect', fallback: { kind: 'none' } },
});

const render = (view: BriefingView, m: RouteSearchModel, { searchOn = true, declined = false } = {}) =>
  renderToStaticMarkup(createElement(MapPlace, { view, model: m, searchOn, declined, onTap: () => undefined, onDecline: () => undefined, onBigger: () => undefined }));

describe('de plek van de kaart in de Briefing', () => {
  it('zoeken: de zoekstand in de lagere vaste hoogte, met je training eronder', () => {
    const html = render(routeView(), model());
    expect(html).toContain('Lussen zoeken');
    expect(html).toContain(`height:${BRIEFING_MAP_HEIGHT}`);
    expect(html).toContain('Je training: 7 km, 40 m stijgen.');
  });
  it('geen netwerk: de regel en Opnieuw zoeken op de plek van de kaart, in de lagere hoogte', () => {
    const html = render(routeView(), model({ stage: 'offline' }));
    expect(html).toContain(OFFLINE_LINE);
    expect(html).toContain('>Opnieuw zoeken<');
    expect(html).toContain(`height:${BRIEFING_MAP_HEIGHT}`);
  });
  it('Lus zoeken op Na een tik (of later dan morgen): nog geen zoekstand, wel Zoek een lus', () => {
    const html = render(routeView('tap'), model(), { searchOn: false });
    expect(html).toContain('Zoek een lus');
    expect(html).not.toContain('Lussen zoeken');
  });
  it('Na een tik en nog geen ja: eerst Zoek een lus, nog niet de eerste vraag', () => {
    const html = render(routeView('tap'), model({ stage: 'first-question' }), { searchOn: false });
    expect(html).toContain('Zoek een lus');
    expect(html).not.toContain('Liever niet');
  });
  it('de eerste keer: de eerste vraag ongewijzigd; na Liever niet één rij Zoek een lus', () => {
    expect(render(routeView(), model({ stage: 'first-question' }))).toContain('>Liever niet<');
    const declined = render(routeView(), model({ stage: 'first-question' }), { declined: true });
    expect(declined).toContain('Zoek een lus');
    expect(declined).not.toContain('Liever niet');
  });
  it('geen plaats: geen doodlopende zin, maar de weg naar de plaatskeuze', () => {
    const html = renderToStaticMarkup(createElement(MapPlace, { view: routeView(), model: model({ stage: 'no-place' }), searchOn: true, declined: false, onTap: () => undefined, onDecline: () => undefined, onBigger: () => undefined, onPlace: () => undefined }));
    expect(html).toContain(NO_PLACE_BRIEFING);
    expect(html).toContain(`>${CHOOSE_PLACE}`);
    expect(html).not.toContain(NO_PLACE_LINE);
  });
  it('een lus: de soort, titel en feiten, de andere als één regel met Kies, en Groter', () => {
    const a = loop();
    const s = loop({ style: 'simple', distanceM: 7_000, ascentM: 0, hills: 0, repeats: undefined });
    const html = render(routeView(), model({ stage: 'plans', plans: { adventure: { ok: true, proposal: a }, simple: { ok: true, proposal: s } }, okStyles: ['adventure', 'simple'], picked: 'adventure', pickedOutcome: { ok: true, proposal: a } }));
    expect(html).toContain('Avontuurlijk');
    expect(html).toContain('Eén lus langs een helling · 7,2 km · 50 hoogtemeters');
    expect(html).toContain('Simpel, heen en terug: 7 km · vrijwel vlak');
    expect(html).toContain('>Kies<');
    expect(html).toContain('Groter');
  });
  // Spoor 4 van docs/visie/Ontwerp trainingsscherm minimaal.md: wat je op de band instelt staat in de
  // regel onder de chips (engine/briefing.ts#placeLine), niet meer in een eigen kaart.
  it('Loopband of binnen: niets op de plek van de kaart, geen zoektocht', () => {
    const view: BriefingView = { ...routeView(), place: 'run_treadmill', map: { kind: 'place' } };
    const html = render(view, model());
    expect(html).toBe('');
  });
  it('Route voorstellen uit: niets op de plek van de kaart', () => {
    expect(render({ ...routeView(), map: { kind: 'none' } }, model())).toBe('');
  });
});
