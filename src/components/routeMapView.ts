// ASCEND: de regie van de kaart bij Route voorstellen, zonder React. Laadt MapLibre pas als het
// paneel opengaat, begint meteen op een effen vlak (nooit een leeg vak) en neemt dan de ondergrond:
// OpenFreeMap, valt die weg of antwoordt hij niet binnen MAP_SOURCE_LIMIT_MS dan de rastertegels van
// OpenStreetMap, en daarna weer het effen vlak. Alleen vooruit: geen herhaalpogingen. Na `destroy`
// (paneel dicht) maakt dit niets meer aan en gaat er geen aanroep meer de deur uit.
// MapLibre en de klok komen binnen als deps, zodat de tests een nep-kaart geven.

import {
  attributionFor, baseSourcesOf, boundsOf, cameraDuration, DOT_SOURCE, dotFeatures, MAP_LOAD_LIMIT_MS, MAP_SOURCE_LIMIT_MS,
  nextStage, OPENFREEMAP_STYLE, paintOpenFreeMap, plainStyle, rasterStyle, ROUTE_HIT_LAYER, ROUTE_SOURCE, routeFeatures, stagesFor,
  type MapBase, type MapColors, type MapDot, type MapRoute, type MapStage, type StyleSpec,
} from '../engine/routeMap';
import type { RoutePoint, RouteStyle } from '../models/route';
import { startFailureReason } from '../engine/routeStart';
import { locateMe, LocateError, type Position2 } from '../utils/geolocation';
import { withTimeout } from '../utils/withTimeout';

// Het deel van MapLibre dat dit gebruikt.
type Listener = (e: never) => void;
export interface MapLike {
  on(type: string, listener: Listener): unknown;
  setStyle(style: string | StyleSpec, options?: { diff?: boolean; transformStyle?: (prev: unknown, next: StyleSpec) => StyleSpec }): unknown;
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
  | { kind: 'ready'; stage: MapStage; attribution: string }
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
}

export interface MapViewEvents {
  onState: (state: MapViewState) => void;
  onRouteTap: (style: RouteStyle) => void;
  onMapTap: (point: RoutePoint) => void;
}

export interface RouteMapView {
  update(data: MapViewData): void;
  fitAll(): void;
  goTo(point: RoutePoint): void;
  destroy(): void;
}

const FIT_PADDING = 36;
const FIT_MAX_ZOOM = 16;
const POINT_ZOOM = 15;

export function createRouteMapView(container: HTMLElement, base: MapBase, data: MapViewData, events: MapViewEvents, deps: MapViewDeps): RouteMapView {
  const setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? ((id) => clearTimeout(id as ReturnType<typeof setTimeout>));
  let destroyed = false;
  let map: MapLike | undefined;
  let current: MapStage | undefined;
  let settled = false;
  let timer: unknown;
  let latest = data;
  let colors: MapColors | undefined;
  const stages = stagesFor(base, deps.online());

  const overlay = () => ({ routes: routeFeatures(latest.routes, latest.chosen), dots: dotFeatures(latest.dots) });
  const allPoints = () => [...latest.routes.flatMap((r) => r.points), ...Object.values(latest.dots).filter((p): p is RoutePoint => !!p)];
  const report = (state: MapViewState) => {
    if (!destroyed) events.onState(state);
  };
  const stopTimer = () => {
    if (timer !== undefined) clearTimer(timer);
    timer = undefined;
  };

  function settle() {
    if (settled || !current) return;
    settled = true;
    stopTimer();
    report({ kind: 'ready', stage: current, attribution: attributionFor(current) });
  }

  // De ondergrond van deze stap viel weg: door naar de volgende, nooit terug.
  function fallBack() {
    if (destroyed || settled || !current) return;
    const next = nextStage(stages, current);
    if (next) show(next);
  }

  function show(stage: MapStage) {
    if (destroyed || !map || !colors) return;
    stopTimer();
    current = stage;
    settled = false;
    const c = colors;
    try {
      if (stage === 'plain') {
        map.setStyle(plainStyle(c, overlay()), { diff: false });
        settle();
        return;
      }
      timer = setTimer(fallBack, MAP_SOURCE_LIMIT_MS);
      if (stage === 'raster') map.setStyle(rasterStyle(c, base, overlay()), { diff: false });
      else map.setStyle(OPENFREEMAP_STYLE[base === 'light' ? 'light' : 'dark'], { diff: false, transformStyle: (_prev, next) => paintOpenFreeMap(next, c, base, overlay()) });
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
        const t = setTimer(() => reject(new Error('timeout')), MAP_LOAD_LIMIT_MS);
        deps.load().then((l) => { clearTimer(t); resolve(l); }, (err: unknown) => { clearTimer(t); reject(err); });
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
    m.on('click', ((e: { point: unknown; lngLat: { lat: number; lng: number } }) => {
      let hit: RouteStyle | undefined;
      try {
        const style = m.queryRenderedFeatures(e.point, { layers: [ROUTE_HIT_LAYER] })[0]?.properties?.style;
        if (style === 'simple' || style === 'adventure') hit = style;
      } catch {
        // De laag is er even niet (de stijl wisselt): dan is het een tik op de kaart.
      }
      if (hit) events.onRouteTap(hit);
      else events.onMapTap({ lat: e.lngLat.lat, lon: e.lngLat.lng });
    }) as Listener);
    fit(false);
    show(stages[0]);
  }

  void start();

  return {
    update(next) {
      latest = next;
      if (!map || destroyed) return;
      const o = overlay();
      try {
        map.getSource(ROUTE_SOURCE)?.setData?.(o.routes);
        map.getSource(DOT_SOURCE)?.setData?.(o.dots);
      } catch {
        // De stijl wisselt: de nieuwe stijl neemt de laatste lussen zelf mee.
      }
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

// Je plek voor de kaart (stip, Naar mijn plek, Gebruik waar ik nu ben): fijn, met een grens in tijd.
// Gooit nooit: een plek of een regel die zegt waarom niet. Wordt niet bewaard.
export async function whereAmI(
  locate: () => Promise<Position2> = () => locateMe({ precise: true, fine: true, timeoutMs: 10_000, maximumAge: 30_000 }),
  limitMs = MAP_LOCATE_LIMIT_MS,
): Promise<{ ok: true; point: RoutePoint } | { ok: false; line: string }> {
  try {
    const p = await withTimeout(locate(), limitMs);
    return { ok: true, point: { lat: p.lat, lon: p.lon } };
  } catch (err) {
    return { ok: false, line: startFailureReason(err instanceof LocateError ? err.reason : 'timeout') };
  }
}
