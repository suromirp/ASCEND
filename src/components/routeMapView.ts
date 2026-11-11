// ASCEND: de regie van de kaart bij Route voorstellen, zonder React. Laadt MapLibre pas als het
// paneel opengaat, begint meteen op een effen vlak (nooit een leeg vak) en neemt dan de ondergrond:
// OpenFreeMap, valt die weg of antwoordt hij niet binnen MAP_SOURCE_LIMIT_MS dan de rastertegels van
// OpenStreetMap, en daarna weer het effen vlak. Met Luchtfoto komt eerst de luchtfoto van één bron
// (integrations/aerialImagery.ts); valt die weg, dan dezelfde trap van de kaart, met een regel.
// Alleen vooruit: geen herhaalpogingen; alleen een tik op de schakelaar begint opnieuw. Na `destroy`
// (paneel dicht) maakt dit niets meer aan en gaat er geen aanroep meer de deur uit.
// MapLibre en de klok komen binnen als deps, zodat de tests een nep-kaart geven.

import {
  AERIAL_LIMIT_MS, aerialStyle, attributionFor, baseSourcesOf, boundsOf, cameraDuration, DOT_SOURCE, dotFeatures, MAP_LOAD_LIMIT_MS, MAP_SOURCE_LIMIT_MS,
  nextStage, OPENFREEMAP_STYLE, paintOpenFreeMap, plainStyle, rasterStyle, ROUTE_HIT_LAYER, ROUTE_SOURCE, routeFeatures, stagesFor,
  type MapBase, type MapColors, type MapDot, type MapRoute, type MapStage, type StyleSpec,
} from '../engine/routeMap';
import type { RoutePoint, RouteStyle } from '../models/route';
import { aerialSourceFor, type AerialId, type AerialSource } from '../integrations/aerialImagery';
import { startFailureReason } from '../engine/routeStart';
import { locateMe, LocateError, type Position2 } from '../utils/geolocation';
import { withTimeout } from '../utils/withTimeout';

// Het deel van MapLibre dat dit gebruikt.
type Listener = (e: never) => void;
export interface MapLike {
  on(type: string, listener: Listener): unknown;
  setStyle(style: StyleSpec, options?: { diff?: boolean }): unknown;
  getSource(id: string): { setData?: (data: unknown) => unknown } | undefined;
  fitBounds(bounds: [[number, number], [number, number]], options?: Record<string, unknown>): unknown;
  easeTo(options: Record<string, unknown>): unknown;
  queryRenderedFeatures(point: unknown, options: { layers: string[] }): { properties?: Record<string, unknown> | null }[];
  remove(): void;
  touchZoomRotate?: { disableRotation(): void };
  keyboard?: { disableRotation(): void };
}
export interface MapLib {
  Map: new (options: Record<string, unknown>) => MapLike;
}

export type MapViewState =
  | { kind: 'loading' }
  // aerial: de bron van de luchtfoto (alleen bij die stap). photoFailed: Luchtfoto stond aan maar viel weg,
  // je ziet de kaart. Beide zijn afwezig als ze niets zeggen.
  | { kind: 'ready'; stage: MapStage; attribution: string; aerial?: AerialId; photoFailed?: true }
  // Geen WebGL, of MapLibre kon geen kaart maken.
  | { kind: 'unsupported' }
  // Het losse stuk met MapLibre kwam niet (geen netwerk, of niet op tijd).
  | { kind: 'failed' };

export interface MapViewData {
  routes: MapRoute[];
  chosen: RouteStyle | undefined;
  dots: Partial<Record<MapDot, RoutePoint>>;
}

export interface MapViewDeps {
  load: () => Promise<MapLib>;
  colors: () => MapColors;
  online: () => boolean;
  webgl: () => boolean;
  motion: () => 'full' | 'calm' | 'off';
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (id: unknown) => void;
  // Het stijlbestand van OpenFreeMap; standaard fetch. Gooit bij een fout of een stop.
  fetchStyle?: (url: string, signal: AbortSignal) => Promise<unknown>;
}

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export interface MapViewEvents {
  onState: (state: MapViewState) => void;
  onRouteTap: (style: RouteStyle) => void;
  onMapTap: (point: RoutePoint) => void;
}

export interface RouteMapView {
  update(data: MapViewData): void;
  // Kaart of Luchtfoto: begint de trap opnieuw, met dezelfde camera.
  setPhoto(on: boolean): void;
  fitAll(): void;
  goTo(point: RoutePoint): void;
  destroy(): void;
}

// Rechts ligt de kolom met de twee ronde knoppen (44 px en een rand): daar valt geen lus onder.
// Rechtsboven ligt ook de schakelaar Kaart of Luchtfoto: bovenaan iets meer ruimte.
export const FIT_PADDING = { top: 60, bottom: 36, left: 36, right: 60 };
const FIT_MAX_ZOOM = 16;
const POINT_ZOOM = 15;

export function createRouteMapView(container: HTMLElement, base: MapBase, data: MapViewData, events: MapViewEvents, deps: MapViewDeps, photo = false): RouteMapView {
  const setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? ((id) => clearTimeout(id as ReturnType<typeof setTimeout>));
  let destroyed = false;
  let map: MapLike | undefined;
  let current: MapStage | undefined;
  let settled = false;
  let timer: unknown;
  let latest = data;
  let colors: MapColors | undefined;
  let loadTimer: unknown;
  let styleStop: AbortController | undefined;
  const fetchStyle = deps.fetchStyle ?? fetchJson;
  let stages = stagesFor(base, deps.online(), photo);
  let aerial: AerialSource | undefined;
  let photoFailed = false;

  const overlay = () => ({ routes: routeFeatures(latest.routes, latest.chosen), dots: dotFeatures(latest.dots) });
  const allPoints = () => [...latest.routes.flatMap((r) => r.points), ...Object.values(latest.dots).filter((p): p is RoutePoint => !!p)];
  const report = (state: MapViewState) => {
    if (!destroyed) events.onState(state);
  };
  const stopTimer = () => {
    if (timer !== undefined) clearTimer(timer);
    timer = undefined;
  };
  const stopStyleFetch = () => {
    styleStop?.abort();
    styleStop = undefined;
  };

  function settle() {
    if (settled || !current) return;
    settled = true;
    stopTimer();
    report({
      kind: 'ready', stage: current, attribution: attributionFor(current, aerial),
      ...(current === 'aerial' && aerial ? { aerial: aerial.id } : {}),
      ...(photoFailed ? { photoFailed: true as const } : {}),
    });
  }

  // De ondergrond van deze stap viel weg: door naar de volgende, nooit terug.
  function fallBack() {
    if (destroyed || settled || !current) return;
    const next = nextStage(stages, current);
    if (current === 'aerial') photoFailed = true;
    if (next) show(next);
  }

  function show(stage: MapStage) {
    if (destroyed || !map || !colors) return;
    stopTimer();
    stopStyleFetch();
    current = stage;
    settled = false;
    const c = colors;
    try {
      if (stage === 'plain') {
        map.setStyle(plainStyle(c, overlay()), { diff: false });
        settle();
        return;
      }
      timer = setTimer(fallBack, stage === 'aerial' ? AERIAL_LIMIT_MS : MAP_SOURCE_LIMIT_MS);
      if (stage === 'aerial') {
        aerial = aerialSourceFor(allPoints());
        map.setStyle(aerialStyle(c, aerial, overlay()), { diff: false });
      } else if (stage === 'raster') map.setStyle(rasterStyle(c, base, overlay()), { diff: false });
      else {
        // Het stijlbestand zelf ophalen (binnen dezelfde grens): een adres aan setStyle haalt de oude
        // stijl meteen weg, en dan staan de lussen en de ring even nergens.
        const stop = new AbortController();
        styleStop = stop;
        const m = map;
        fetchStyle(OPENFREEMAP_STYLE[base === 'light' ? 'light' : 'dark'], stop.signal).then((json) => {
          if (destroyed || stop.signal.aborted || current !== 'vector') return;
          if (!json || typeof json !== 'object' || !Array.isArray((json as StyleSpec).layers)) throw new Error('geen stijl');
          m.setStyle(paintOpenFreeMap(json as StyleSpec, c, base, overlay()), { diff: false });
        }).catch(() => {
          if (!stop.signal.aborted && current === 'vector') fallBack();
        });
      }
    } catch {
      fallBack();
    }
  }

  function fit(animate: boolean) {
    if (!map) return;
    const b = boundsOf(allPoints());
    if (!b) return;
    const duration = animate ? cameraDuration(deps.motion()) : 0;
    try {
      if (b[0][0] === b[1][0] && b[0][1] === b[1][1]) map.easeTo({ center: b[0], zoom: POINT_ZOOM, duration });
      else map.fitBounds(b, { padding: FIT_PADDING, maxZoom: FIT_MAX_ZOOM, duration });
    } catch {
      // Een kaart zonder maat (nog niet in beeld): de volgende tik op Alles in beeld probeert het.
    }
  }

  async function start() {
    if (!deps.webgl()) {
      report({ kind: 'unsupported' });
      return;
    }
    report({ kind: 'loading' });
    let lib: MapLib;
    try {
      lib = await new Promise<MapLib>((resolve, reject) => {
        loadTimer = setTimer(() => reject(new Error('timeout')), MAP_LOAD_LIMIT_MS);
        const done = () => { clearTimer(loadTimer); loadTimer = undefined; };
        deps.load().then((l) => { done(); resolve(l); }, (err: unknown) => { done(); reject(err); });
      });
    } catch {
      report({ kind: 'failed' });
      return;
    }
    // Het paneel ging dicht tijdens het laden: geen kaart, geen tegels.
    if (destroyed) return;
    try {
      colors = deps.colors();
      const b = boundsOf(allPoints());
      const center = b ? [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2] : [0, 0];
      map = new lib.Map({
        container,
        style: plainStyle(colors, overlay()),
        center,
        zoom: b ? 13 : 1,
        attributionControl: false,
        dragRotate: false,
        touchPitch: false,
        pitchWithRotate: false,
        rollEnabled: false,
        maxPitch: 0,
        fadeDuration: deps.motion() === 'full' ? 300 : 0,
      });
      map.touchZoomRotate?.disableRotation();
      map.keyboard?.disableRotation();
    } catch {
      map = undefined;
      report({ kind: 'unsupported' });
      return;
    }
    const m = map;
    m.on('sourcedata', ((e: { sourceId?: string; tile?: unknown }) => {
      if (current && e.tile !== undefined && e.sourceId && baseSourcesOf(current).includes(e.sourceId)) settle();
    }) as Listener);
    m.on('error', ((e: { sourceId?: string }) => {
      // Een fout van een oude stap telt niet; zonder bron (stijl, lettertype) wel.
      if (!current || settled) return;
      if (e.sourceId && !baseSourcesOf(current).includes(e.sourceId)) return;
      fallBack();
    }) as Listener);
    m.on('click', ((e: { point: unknown; lngLat: { lat: number; lng: number; wrap?: () => { lat: number; lng: number } } }) => {
      let hit: RouteStyle | undefined;
      try {
        // Raakt de tik twee lussen (waar ze dicht bij elkaar lopen), dan wint de lus die nog niet gekozen is:
        // wie op een lus tikt, wil wisselen.
        const styles = m.queryRenderedFeatures(e.point, { layers: [ROUTE_HIT_LAYER] })
          .map((f) => f.properties?.style)
          .filter((st): st is RouteStyle => st === 'simple' || st === 'adventure');
        hit = styles.find((st) => st !== latest.chosen) ?? styles[0];
      } catch {
        // De laag is er even niet (de stijl wisselt): dan is het een tik op de kaart.
      }
      if (hit) events.onRouteTap(hit);
      else {
        // Een tik na een paar keer rond de aarde slepen: terug naar -180 tot 180.
        const p = typeof e.lngLat.wrap === 'function' ? e.lngLat.wrap() : e.lngLat;
        events.onMapTap({ lat: p.lat, lon: p.lng });
      }
    }) as Listener);
    fit(false);
    show(stages[0]);
  }

  void start();

  return {
    update(next) {
      latest = next;
      if (!map || destroyed) return;
      // Een nieuw startpunt of nieuwe lussen in een ander land: de luchtfoto van de bron die daar past.
      if (current === 'aerial' && aerial && aerialSourceFor(allPoints()).id !== aerial.id) {
        show('aerial');
        return;
      }
      const o = overlay();
      try {
        map.getSource(ROUTE_SOURCE)?.setData?.(o.routes);
        map.getSource(DOT_SOURCE)?.setData?.(o.dots);
      } catch {
        // De stijl wisselt: de nieuwe stijl neemt de laatste lussen zelf mee.
      }
    },
    setPhoto(on) {
      photoFailed = false;
      stages = stagesFor(base, deps.online(), on);
      // Nog aan het laden: start() neemt de nieuwe trap mee.
      if (!map || destroyed) return;
      show(stages[0]);
    },
    fitAll: () => fit(true),
    goTo(point) {
      if (!map) return;
      try {
        map.easeTo({ center: [point.lon, point.lat], zoom: POINT_ZOOM, duration: cameraDuration(deps.motion()) });
      } catch {
        // Zonder maat geen beweging.
      }
    },
    destroy() {
      destroyed = true;
      stopTimer();
      stopStyleFetch();
      if (loadTimer !== undefined) clearTimer(loadTimer);
      loadTimer = undefined;
      const m = map;
      map = undefined;
      try {
        m?.remove();
      } catch {
        // Al weg.
      }
    },
  };
}

export const MAP_LOCATE_LIMIT_MS = 15_000;

// Je plek voor de stip en Naar mijn plek: een grove plek is genoeg, zonder de vraag om je precieze plek,
// met een grens in tijd. Gooit nooit: een plek of een regel. Wordt niet bewaard. Een startpunt loopt
// niet hierlangs maar via storage/routeStart.ts#startFromMap, met de strengere grens.
export async function whereAmI(
  locate: () => Promise<Position2> = () => locateMe({ precise: true, timeoutMs: 10_000, maximumAge: 30_000 }),
  limitMs = MAP_LOCATE_LIMIT_MS,
): Promise<{ ok: true; point: RoutePoint } | { ok: false; line: string }> {
  try {
    const p = await withTimeout(locate(), limitMs);
    return { ok: true, point: { lat: p.lat, lon: p.lon } };
  } catch (err) {
    return { ok: false, line: startFailureReason(err instanceof LocateError ? err.reason : 'timeout') };
  }
}
