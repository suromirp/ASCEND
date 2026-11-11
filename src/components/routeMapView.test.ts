import { describe, expect, it, vi } from 'vitest';
import { createRouteMapView, whereAmI, type MapLib, type MapLike, type MapViewDeps, type MapViewState } from './routeMapView';
import { MAP_LOAD_LIMIT_MS, MAP_SOURCE_LIMIT_MS, OPENFREEMAP_STYLE, readMapColors, type MapBase } from '../engine/routeMap';
import { LocateError } from '../utils/geolocation';
import type { RouteStyle } from '../models/route';

// Nagemaakte punten bij het Drielandenpunt (een openbare plek).
const A = { lat: 50.7548, lon: 6.0207 };
const B = { lat: 50.7601, lon: 6.0302 };

type Handler = (e: unknown) => void;
class FakeMap implements MapLike {
  static made: FakeMap[] = [];
  handlers: Record<string, Handler[]> = {};
  styles: unknown[] = [];
  fits: unknown[] = [];
  eases: Record<string, unknown>[] = [];
  removed = false;
  hit: string | string[] | undefined;
  rotationOff = 0;
  data: Record<string, unknown> = {};
  options: Record<string, unknown>;
  constructor(options: Record<string, unknown>) {
    this.options = options;
    FakeMap.made.push(this);
  }
  touchZoomRotate = { disableRotation: () => { this.rotationOff++; } };
  keyboard = { disableRotation: () => { this.rotationOff++; } };
  on(type: string, listener: unknown) {
    (this.handlers[type] ??= []).push(listener as Handler);
  }
  emit(type: string, e: unknown) {
    for (const h of this.handlers[type] ?? []) h(e);
  }
  setStyle(style: unknown) {
    this.styles.push(style);
  }
  getSource(id: string) {
    return { setData: (d: unknown) => { this.data[id] = d; } };
  }
  fitBounds(b: unknown, o?: Record<string, unknown>) {
    this.fits.push([b, o]);
  }
  easeTo(o: Record<string, unknown>) {
    this.eases.push(o);
  }
  queryRenderedFeatures() {
    return (Array.isArray(this.hit) ? this.hit : this.hit ? [this.hit] : []).map((style) => ({ properties: { style } }));
  }
  remove() {
    this.removed = true;
  }
}

// Een klok in de hand: timers lopen pas als de test ze laat lopen.
function clock() {
  let now = 0;
  let timers: { at: number; fn: () => void; id: number }[] = [];
  let next = 1;
  return {
    setTimer: (fn: () => void, ms: number) => { const id = next++; timers.push({ at: now + ms, fn, id }); return id; },
    clearTimer: (id: unknown) => { timers = timers.filter((t) => t.id !== id); },
    advance(ms: number) {
      now += ms;
      const due = timers.filter((t) => t.at <= now);
      timers = timers.filter((t) => t.at > now);
      due.forEach((t) => t.fn());
    },
    pending: () => timers.length,
  };
}

const lib: MapLib = { Map: FakeMap as unknown as MapLib['Map'] };
const flush = () => new Promise((r) => setTimeout(r, 0));

// Het stijlbestand van OpenFreeMap, nagemaakt en klein.
const OFM_STYLE = { version: 8, sources: { openmaptiles: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } }, layers: [{ id: 'background', type: 'background', paint: {} }] };

function setup(opts: { base?: MapBase; online?: boolean; webgl?: boolean; load?: () => Promise<MapLib>; routes?: number; fetchStyle?: MapViewDeps['fetchStyle'] } = {}) {
  FakeMap.made = [];
  const c = clock();
  const states: MapViewState[] = [];
  const taps: { route: RouteStyle[]; map: unknown[] } = { route: [], map: [] };
  const load = vi.fn(opts.load ?? (() => Promise.resolve(lib)));
  const deps: MapViewDeps = {
    load,
    colors: () => readMapColors((t) => t),
    online: () => opts.online ?? true,
    webgl: () => opts.webgl ?? true,
    motion: () => 'off',
    setTimer: c.setTimer,
    clearTimer: c.clearTimer,
    fetchStyle: vi.fn(opts.fetchStyle ?? (async () => OFM_STYLE)),
  };
  const routes = [{ style: 'adventure' as const, points: [A, B] }, { style: 'simple' as const, points: [B, A] }].slice(0, opts.routes ?? 2);
  const view = createRouteMapView({} as HTMLElement, opts.base ?? 'dark', { routes, chosen: routes[0]?.style, dots: { start: A } }, {
    onState: (s) => states.push(s),
    onRouteTap: (s) => taps.route.push(s),
    onMapTap: (p) => taps.map.push(p),
  }, deps);
  return { view, states, taps, c, load, deps, map: () => FakeMap.made[0] };
}

describe('de kaart laden', () => {
  it('begint op het effen vlak en neemt dan OpenFreeMap; draaien en kantelen uit, geen eigen vermelding van MapLibre', async () => {
    const t = setup();
    await flush();
    const m = t.map();
    expect(m.options.dragRotate).toBe(false);
    expect(m.options.touchPitch).toBe(false);
    expect(m.options.maxPitch).toBe(0);
    expect(m.options.attributionControl).toBe(false);
    expect(m.rotationOff).toBe(2);
    expect((m.options.style as { sources: object }).sources).not.toHaveProperty('openmaptiles');
    expect(t.deps.fetchStyle).toHaveBeenCalledWith(OPENFREEMAP_STYLE.dark, expect.anything());
    // De stijl gaat als object naar de kaart, met de lussen erin: zo verdwijnen ze nooit even.
    const given = m.styles[0] as { sources: Record<string, unknown>; layers: { id: string }[] };
    expect(given.sources).toHaveProperty('openmaptiles');
    expect(given.layers.map((l) => l.id)).toContain('ascend-route-chosen');
    // Nog geen tegel: nog niet klaar.
    expect(t.states.at(-1)).toEqual({ kind: 'loading' });
    m.emit('sourcedata', { sourceId: 'openmaptiles', tile: {} });
    expect(t.states.at(-1)).toEqual({ kind: 'ready', stage: 'vector', attribution: '© OpenMapTiles © OpenStreetMap contributors' });
    expect(t.c.pending()).toBe(0);
  });

  it('bron antwoordt niet binnen de grens: OSM-raster, daarna het effen vlak, en dan stil', async () => {
    const t = setup();
    await flush();
    const m = t.map();
    t.c.advance(MAP_SOURCE_LIMIT_MS);
    expect((m.styles[1] as { sources: object }).sources).toHaveProperty('osm-raster');
    t.c.advance(MAP_SOURCE_LIMIT_MS);
    expect(m.styles).toHaveLength(3);
    expect(t.states.at(-1)).toEqual({ kind: 'ready', stage: 'plain', attribution: '' });
    // Geen lus van herhaalpogingen: er wacht niets meer.
    t.c.advance(MAP_SOURCE_LIMIT_MS * 10);
    expect(m.styles).toHaveLength(3);
    expect(t.c.pending()).toBe(0);
  });

  it('een fout van de bron: meteen de volgende stap; een fout van een oude bron telt niet', async () => {
    const t = setup();
    await flush();
    const m = t.map();
    m.emit('error', { sourceId: 'openmaptiles' });
    expect(m.styles).toHaveLength(2);
    m.emit('error', { sourceId: 'openmaptiles' });
    expect(m.styles).toHaveLength(2);
    m.emit('sourcedata', { sourceId: 'osm-raster', tile: {} });
    expect(t.states.at(-1)).toMatchObject({ kind: 'ready', stage: 'raster', attribution: '© OpenStreetMap contributors' });
    // Na klaar: een losse tegelfout laat de kaart staan.
    m.emit('error', { sourceId: 'osm-raster' });
    expect(m.styles).toHaveLength(2);
  });

  it('geen netwerk: alleen het effen vlak, geen tegels', async () => {
    const t = setup({ online: false });
    await flush();
    expect(t.map().styles).toHaveLength(1);
    expect(JSON.stringify(t.map().styles)).not.toContain('http');
    expect(t.states.at(-1)).toMatchObject({ kind: 'ready', stage: 'plain' });
  });

  it('Geen: nooit een tegel', async () => {
    const t = setup({ base: 'none' });
    await flush();
    expect(JSON.stringify(t.map().styles)).not.toContain('http');
  });

  it('geen WebGL: een nette regel, MapLibre wordt niet eens geladen', async () => {
    const t = setup({ webgl: false });
    await flush();
    expect(t.states).toEqual([{ kind: 'unsupported' }]);
    expect(t.load).not.toHaveBeenCalled();
  });

  it('MapLibre kan geen kaart maken: dezelfde nette regel', async () => {
    const t = setup({ load: () => Promise.resolve({ Map: class { constructor() { throw new Error('webgl'); } } } as unknown as MapLib) });
    await flush();
    expect(t.states.at(-1)).toEqual({ kind: 'unsupported' });
  });

  it('het losse stuk komt niet (geen netwerk) of niet op tijd: een regel, geen herhaling', async () => {
    const failed = setup({ load: () => Promise.reject(new Error('offline')) });
    await flush();
    expect(failed.states.at(-1)).toEqual({ kind: 'failed' });
    const slow = setup({ load: () => new Promise<MapLib>(() => {}) });
    slow.c.advance(MAP_LOAD_LIMIT_MS);
    await flush();
    expect(slow.states.at(-1)).toEqual({ kind: 'failed' });
    expect(slow.load).toHaveBeenCalledTimes(1);
  });
});

describe('het stijlbestand', () => {
  it('komt het niet of is het kapot: meteen OSM-raster, en de oude stijl met de lussen bleef staan', async () => {
    const t = setup({ fetchStyle: async () => { throw new Error('offline'); } });
    await flush();
    const m = t.map();
    expect(m.styles).toHaveLength(1);
    expect((m.styles[0] as { sources: object }).sources).toHaveProperty('osm-raster');
    const broken = setup({ fetchStyle: async () => ({ nee: true }) });
    await flush();
    expect((broken.map().styles[0] as { sources: object }).sources).toHaveProperty('osm-raster');
  });

  it('hangt het: na de grens wordt het afgebroken en komt het raster', async () => {
    let signal: AbortSignal | undefined;
    const t = setup({ fetchStyle: (_url, s) => { signal = s; return new Promise(() => {}); } });
    await flush();
    t.c.advance(MAP_SOURCE_LIMIT_MS);
    expect(signal?.aborted).toBe(true);
    expect((t.map().styles[0] as { sources: object }).sources).toHaveProperty('osm-raster');
  });
});

describe('het paneel sluiten', () => {
  it('tijdens het laden: geen kaart, geen tegels, geen melding meer', async () => {
    let resolve: (l: MapLib) => void = () => {};
    const t = setup({ load: () => new Promise<MapLib>((r) => { resolve = r; }) });
    const before = t.states.length;
    t.view.destroy();
    resolve(lib);
    await flush();
    expect(FakeMap.made).toHaveLength(0);
    expect(t.states).toHaveLength(before);
    // Ook de grens van het laden loopt niet meer.
    expect(t.c.pending()).toBe(0);
  });

  it('terwijl het stijlbestand onderweg is: afgebroken, en een laat antwoord doet niets', async () => {
    let signal: AbortSignal | undefined;
    let answer: (v: unknown) => void = () => {};
    const t = setup({ fetchStyle: (_url, s) => { signal = s; return new Promise((r) => { answer = r; }); } });
    await flush();
    t.view.destroy();
    expect(signal?.aborted).toBe(true);
    answer(OFM_STYLE);
    await flush();
    expect(t.map().styles).toHaveLength(0);
  });

  it('terwijl de bron laadt: de kaart gaat weg en de grens loopt niet meer af', async () => {
    const t = setup();
    await flush();
    const m = t.map();
    t.view.destroy();
    expect(m.removed).toBe(true);
    expect(t.c.pending()).toBe(0);
    m.emit('error', { sourceId: 'openmaptiles' });
    expect(m.styles).toHaveLength(1);
  });
});

describe('tikken en camera', () => {
  it('tik op een lus kiest hem; tik ernaast geeft een punt', async () => {
    const t = setup();
    await flush();
    const m = t.map();
    m.hit = 'simple';
    m.emit('click', { point: {}, lngLat: { lat: 1, lng: 2 } });
    m.hit = undefined;
    m.emit('click', { point: {}, lngLat: { lat: 50.75, lng: 6.02 } });
    // Na een paar keer rond de aarde: terug binnen -180 tot 180.
    m.emit('click', { point: {}, lngLat: { lat: 50.75, lng: 366.02, wrap: () => ({ lat: 50.75, lng: 6.02 }) } });
    expect(t.taps.route).toEqual(['simple']);
    expect(t.taps.map).toEqual([{ lat: 50.75, lon: 6.02 }, { lat: 50.75, lon: 6.02 }]);
  });

  it('raakt een tik twee lussen, dan wint de lus die nog niet gekozen is', async () => {
    const t = setup();
    await flush();
    // De gekozen lus (Avontuurlijk) ligt bovenop en komt als eerste terug.
    t.map().hit = ['adventure', 'simple'];
    t.map().emit('click', { point: {}, lngLat: { lat: 1, lng: 2 } });
    t.map().hit = ['adventure'];
    t.map().emit('click', { point: {}, lngLat: { lat: 1, lng: 2 } });
    expect(t.taps.route).toEqual(['simple', 'adventure']);
  });

  it('nieuwe lussen gaan naar de kaart; Alles in beeld past ze erin, zonder beweging in Uit', async () => {
    const t = setup({ routes: 1 });
    await flush();
    const m = t.map();
    t.view.update({ routes: [], chosen: undefined, dots: { start: A, me: B } });
    expect((m.data['ascend-routes'] as { features: unknown[] }).features).toEqual([]);
    expect((m.data['ascend-dots'] as { features: unknown[] }).features).toHaveLength(2);
    t.view.fitAll();
    expect(m.fits.at(-1)).toEqual([[[A.lon, A.lat], [B.lon, B.lat]], { padding: 36, maxZoom: 16, duration: 0 }]);
    t.view.goTo(B);
    expect(m.eases.at(-1)).toMatchObject({ center: [B.lon, B.lat], duration: 0 });
  });

  it('geen lus en alleen een start: inzoomen op dat punt', async () => {
    const t = setup({ routes: 0 });
    await flush();
    t.view.fitAll();
    expect(t.map().eases.at(-1)).toMatchObject({ center: [A.lon, A.lat] });
  });
});

describe('je plek voor de kaart', () => {
  it('geeft een punt', async () => {
    expect(await whereAmI(() => Promise.resolve({ lat: A.lat, lon: A.lon, accuracyM: 8 }))).toEqual({ ok: true, point: A });
  });

  it('toestemming geweigerd of geen locatie: een regel, nooit een fout', async () => {
    expect(await whereAmI(() => Promise.reject(new LocateError('denied')))).toEqual({ ok: false, line: 'ASCEND mag je locatie niet gebruiken.' });
    expect(await whereAmI(() => Promise.reject(new LocateError('unsupported')))).toEqual({ ok: false, line: 'Je locatie is nu niet beschikbaar.' });
  });

  it('komt niet op tijd: een regel na de grens', async () => {
    expect(await whereAmI(() => new Promise(() => {}), 5)).toEqual({ ok: false, line: 'Je locatie kwam niet op tijd.' });
  });
});
