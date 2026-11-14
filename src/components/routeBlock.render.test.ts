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
import { askStartLine, planStart, START_LINE_EXACT } from '../engine/routeStart';
import { START_LOCATE_LIMIT_MS } from '../storage/routeStart';
import briefingSource from './TrainingBriefing.tsx?raw';

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
  it('vaste chips bij Start bij: Waar je nu bent, Thuis (als die er is) en Andere plek, met vaste namen', () => {
    const chipsIn = (html: string) => {
      const group = html.slice(html.indexOf('aria-label="Start bij"'));
      return group.slice(0, group.indexOf('</div>'));
    };
    const withHome = chipsIn(render(model()));
    expect((withHome.match(/<button/g) ?? []).length).toBe(3);
    expect(withHome.indexOf('Waar je nu bent')).toBeLessThan(withHome.indexOf('>Thuis<'));
    expect(withHome.indexOf('>Thuis<')).toBeLessThan(withHome.indexOf('Andere plek'));
    // Thuis gekozen: de namen blijven gelijk, alleen de keuze verschuift.
    const homeChosen = chipsIn(render(model({ startChip: 'home' })));
    expect(homeChosen.replace(/aria-pressed="[a-z]+"/g, '')).toBe(withHome.replace(/aria-pressed="[a-z]+"/g, ''));
    // Zonder Thuis: twee chips, Andere plek op dezelfde plaats achteraan.
    const noHome = chipsIn(render(model({ startChips: [{ kind: 'here', label: 'Waar je nu bent' }, { kind: 'other', label: 'Andere plek' }] })));
    expect((noHome.match(/<button/g) ?? []).length).toBe(2);
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
  it('geen toestemming voor je locatie: de vraag op de plek van de kaart (Opnieuw, Thuis, Andere plek), geen lus en geen stille Thuis', () => {
    const plan = planStart({ mode: 'here', home: { lat: 51.5, lon: 4.5 }, found: { ok: false, reason: 'denied' } });
    expect(plan.kind).toBe('ask');
    const html = render(model({ stage: 'ask', ask: { line: askStartLine('denied', true), homeOffered: true }, plans: undefined, okStyles: [], picked: undefined, pickedOutcome: undefined, mapRoutes: [] }));
    expect(html).toContain(askStartLine('denied', true));
    expect(html).toContain('>Opnieuw<');
    // Thuis en Andere plek staan één keer: als chip boven de vraag, niet nog eens in het vak.
    expect(html.split('>Thuis<').length - 1).toBe(1);
    expect(html.split('Andere plek<').length - 1).toBe(1);
    expect(html).not.toContain(START_LINE_EXACT);
    expect(html).not.toContain('Groter: de kaart met je lus');
    // Zonder Thuis: geen knop Thuis.
    expect(render(model({ stage: 'ask', startChips: [{ kind: 'here', label: 'Waar je nu bent' }, { kind: 'other', label: 'Andere plek' }], ask: { line: askStartLine('timeout', false), homeOffered: false }, plans: undefined, okStyles: [], picked: undefined, pickedOutcome: undefined, mapRoutes: [] }))).not.toContain('>Thuis<');
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
  it('de andere lus: te kort staat één keer in amber in zijn ingeklapte rij, anders niets (routes-vorm)', () => {
    const short = loop({ style: 'simple', distanceM: 5_000, ascentM: 0, hills: 0 });
    const html = render(model({ plans: { adventure: { ok: true, proposal: a }, simple: { ok: true, proposal: short } } }));
    const warn = '5 km, korter dan de 7 km van je training.';
    expect(html.split(warn).length - 1).toBe(1);
    expect(html).toContain(`color:var(--color-warning)">${warn}`);
    expect(render(model())).not.toContain('korter dan de 7 km');
  });
  it('de Briefing geeft de helling bij herhalingen als gemarkeerd stuk aan de kaart (routes-vorm)', () => {
    expect(briefingSource).toContain('piece={pickedOutcome?.ok ? climbStretch(pickedOutcome.proposal) : undefined}');
  });
});
