// Het blok met de route in de Briefing, minimaal (besluit 2026-11-12-route-blok.md): twee chips, een
// stille kaart met één lijn die Groter opent, en genoeg ruimte boven de vaste knop. Nagemaakte lus.
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { RouteProposal, RouteTarget } from '../models/route';
import type { BriefingView } from '../engine/briefing';
import type { RouteSearchModel } from './useRouteSearch';
import { MapPlace } from './TrainingBriefing';
import { briefingRoutes, footerRoom, otherLoopLine } from '../engine/routeSheet';
import { planStart, START_LINE_NO_HOME_NO_PLACE } from '../engine/routeStart';
import { START_LOCATE_LIMIT_MS } from '../storage/routeStart';

const motion = vi.hoisted(() => ({ mode: 'full' as 'full' | 'calm' | 'off' }));
vi.mock('./motion', () => ({ useMotionMode: () => motion.mode }));

const target: RouteTarget = { distanceKm: 7, ascentM: 40 };
const loop = (over: Partial<RouteProposal> = {}): RouteProposal => ({ style: 'adventure', source: 'brouter', points: [{ lat: 0, lon: 0 }, { lat: 0.01, lon: 0 }], distanceM: 7_200, ascentM: 50, repeatedShare: 0, hills: 1, ...over });
const a = loop();
const s = loop({ style: 'simple', distanceM: 7_000, ascentM: 0, hills: 0 });

function model(over: Partial<RouteSearchModel> = {}): RouteSearchModel {
  return {
    stage: 'plans', lat: 52, lon: 5, target, startLine: '', choose: async () => undefined,
    startChips: [{ kind: 'here', label: 'Waar je nu bent' }, { kind: 'home', label: 'Thuis', placeId: 'h' }, { kind: 'other', label: 'Andere plek' }], startChip: 'here', savedStarts: [], pickStart: () => undefined,
    mePoint: { lat: 0.002, lon: 0.001 }, hasHome: true, makeHome: async () => false, tapPoint: undefined,
    order: ['adventure', 'simple'], plans: { adventure: { ok: true, proposal: a }, simple: { ok: true, proposal: s } }, okStyles: ['adventure', 'simple'], picked: 'adventure', pickedOutcome: { ok: true, proposal: a },
    setChosen: () => undefined, mapRoutes: [{ style: 'adventure', points: a.points }, { style: 'simple', points: s.points }], mapStartPoint: { lat: 0, lon: 0 }, base: 'dark', photo: 'map', setPhoto: () => undefined, hereMode: false, noMap: false, markNoMap: () => undefined,
    startOnMap: async () => ({ ok: false, line: '' }), steps: ['terrain', 'routes'], currentStep: 'terrain', limitLine: '', limitMs: 30_000, searchKey: 'k',
    foundLines: [], sources: [], parts: [], retry: () => undefined, sender: null, ...over,
  } as RouteSearchModel;
}

const view: BriefingView = {
  head: { eyebrow: 'HARDLOPEN', purpose: 'Rustig.', dayLine: 'Zo 15 november' },
  heart: { facts: [{ value: '40 min', label: 'totaal' }], zone: 2, steps: false },
  stand: { kind: 'watch', line: 'Vinkt zelf af', manualLabel: 'Zelf invullen' },
  places: [], place: 'run_outdoor', map: { kind: 'route', target, line: '7 km, 40 m stijgen', search: 'open' }, rows: [], hills: false, stopSignals: [], footer: { kind: 'route', label: 'Route naar Garmin Connect', fallback: { kind: 'none' } },
};

const render = (m: RouteSearchModel, v: BriefingView = view) =>
  renderToStaticMarkup(createElement(MapPlace, { view: v, model: m, searchOn: true, declined: false, onTap: () => undefined, onDecline: () => undefined, onBigger: () => undefined }));

describe('het blok met de route in de Briefing', () => {
  it('de kaart is stil: geen Kaart of Luchtfoto, geen ronde knoppen, geen Bewaar als plek; de hele kaart opent Groter', () => {
    const html = render(model());
    for (const word of ['>Kaart<', '>Luchtfoto<', 'Naar mijn plek', 'Alles in beeld', 'Bewaar als plek', 'Start hier']) expect(html).not.toContain(word);
    expect(html).toContain('aria-label="Groter: de kaart met je lus"');
    expect(html).toContain('touch-action:pan-y');
    expect(html).toContain('>Groter<');
  });
  it('twee chips bij Start bij, ook met een Thuis: geen chip valt af', () => {
    const html = render(model());
    const group = html.slice(html.indexOf('aria-label="Start bij"'));
    expect((group.slice(0, group.indexOf('</div>')).match(/<button/g) ?? []).length).toBe(2);
  });
  it('één lijn: op de kaart alleen de gekozen lus; zonder keuze alle lussen', () => {
    const routes = [{ style: 'adventure' as const, points: [] }, { style: 'simple' as const, points: [] }];
    expect(briefingRoutes(routes, 'simple').map((r) => r.style)).toEqual(['simple']);
    expect(briefingRoutes(routes, undefined)).toHaveLength(2);
    expect(briefingRoutes([routes[0]], 'simple')).toHaveLength(1);
  });
  it('de andere lus in één regel met zijn vorm, direct onder de gekozen lus', () => {
    expect(otherLoopLine('Simpel', s)).toBe('Simpel, heen en terug: 7 km · vrijwel vlak');
    expect(otherLoopLine('Simpel', { ...s, repeats: 3, ascentM: 120 })).toBe('Simpel, 3 × de helling op en af: 7 km · 120 hoogtemeters');
    expect(otherLoopLine('Simpel', { ...s, repeats: 1 })).toBe('Simpel, heen en terug: 7 km · vrijwel vlak');
    expect(otherLoopLine('Avontuurlijk', a)).toBe('Avontuurlijk, één lus langs een helling: 7,2 km · 50 hoogtemeters');
    const html = render(model({ picked: 'simple', pickedOutcome: { ok: true, proposal: s } }));
    expect(html).toContain('Avontuurlijk, één lus langs een helling: 7,2 km · 50 hoogtemeters');
    expect(html).toMatch(/class="-mt-1 flex items-center justify-between gap-3"/);
  });
  it('op de stille kaart opent een tik op de korte vermelding van de luchtfoto Groter, nooit de volle vermelding over de lus', async () => {
    const src = (await import('./RouteMap.tsx?raw')).default as string;
    expect(src).toContain('onClick={() => (quiet ? onOpen?.() : setFullCredit(true))}');
  });
  it('de pagina scrolt zo ver dat de laatste regel boven de vaste knop staat: knop plus 16 px', () => {
    expect(footerRoom(77)).toBe('93px');
    expect(footerRoom(110.4)).toBe('127px');
    expect(footerRoom(undefined)).toBe('128px');
  });
  it('geen route gevonden: per soort de reden en Opnieuw zoeken, geen kaart', () => {
    const fail = { ok: false as const, reason: 'nothing' as const };
    const html = render(model({ plans: { adventure: fail, simple: fail } , okStyles: [], picked: undefined, pickedOutcome: undefined }));
    expect(html).toContain('>Opnieuw zoeken<');
    expect(html).not.toContain('Groter: de kaart met je lus');
  });
  it('geen toestemming voor je locatie: de regel van de terugval staat zichtbaar onder de chips, de lus komt er toch', () => {
    const html = render(model({ startLine: START_LINE_NO_HOME_NO_PLACE }));
    expect(html).toContain(`role="status" class="text-sm leading-snug" style="color:var(--color-ink-dim)">${START_LINE_NO_HOME_NO_PLACE}<`);
    expect(planStart({ mode: 'here', home: null, found: { ok: false, reason: 'denied' } }).line).toBe(START_LINE_NO_HOME_NO_PLACE);
    expect(START_LOCATE_LIMIT_MS).toBeLessThanOrEqual(15_000);
  });
  it('Loopband of Afwisselen: geen kaart en geen Start bij', () => {
    expect(render(model(), { ...view, place: 'run_treadmill', map: { kind: 'place' } })).toBe('');
  });
  it('Rustig en Uit: het blok staat meteen op de eindstand, dezelfde opmaak als in Vol', () => {
    motion.mode = 'full';
    const full = render(model());
    for (const m of ['calm', 'off'] as const) {
      motion.mode = m;
      expect(render(model())).toBe(full);
    }
    motion.mode = 'full';
    expect(full).not.toMatch(/animation:|animate-/);
  });
  it('Groter is een blad door useSheetClose met het greepje: de terugknop sluit alleen dat blad', async () => {
    const src = (await import('./TrainingBriefing.tsx?raw')).default as string;
    const big = src.slice(src.indexOf('function BigRouteSheet'), src.indexOf('function FuelDetail'));
    expect(big).toContain('useSheetClose(onClose)');
    expect(big).toContain('ref={sheetRef}');
    expect(big).toContain('<SheetGrip />');
  });
});
