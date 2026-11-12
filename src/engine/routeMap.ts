// ASCEND: de kaart bij Route voorstellen, het pure deel. Welke ondergrond in welke volgorde
// (OpenFreeMap, dan de rastertegels van OpenStreetMap, dan een effen vlak), de stijlen voor MapLibre
// met de kleuren uit de tokens, en de lussen en stippen als GeoJSON. Geen DOM, geen netwerk: de
// regie van de kaart staat in components/routeMapView.ts. Docs: docs/beslissingen/2026-11-11-route-kaart.md.
//
// Er staat hier geen enkele kleur: elke kleur komt binnen als `MapColors`, gelezen uit `src/index.css`.

import type { RoutePoint, RouteStyle } from '../models/route';
import type { AerialSource } from '../integrations/aerialImagery';

export type MapBase = 'dark' | 'light' | 'none';
export const resolveMapBase = (raw: unknown): MapBase => (raw === 'light' || raw === 'none' ? raw : 'dark');

// Kaart of Luchtfoto (veld `routeMapPhoto`, onthouden van de schakelaar op de kaart). Afwezig is Kaart.
export type MapPhoto = 'map' | 'photo';
export const resolveMapPhoto = (raw: unknown): MapPhoto => (raw === 'photo' ? 'photo' : 'map');

// De instelling Ondergrond, met vier standen: Donker (advies), Licht, Luchtfoto, Geen. Bewaard in twee
// velden: `routeMapBase` (welke kaart: Donker, Licht of Geen) en `routeMapPhoto` (Luchtfoto aan), zodat de
// schakelaar op de kaart terug kan naar de kaart die je koos. Geen wint: dan geen tegels, ook geen foto.
// Een oude back-up met alleen `routeMapPhoto` leest zo vanzelf als Luchtfoto; geen migratie nodig.
export type MapGround = 'dark' | 'light' | 'photo' | 'none';
export function resolveMapGround(s: { routeMapBase?: unknown; routeMapPhoto?: unknown }): MapGround {
  const base = resolveMapBase(s.routeMapBase);
  if (base === 'none') return 'none';
  return resolveMapPhoto(s.routeMapPhoto) === 'photo' ? 'photo' : base;
}
// Wat er bewaard wordt bij een keuze in Ondergrond. Luchtfoto vanuit Geen zet de kaart terug op het advies.
export function groundSettings(ground: MapGround, current: { routeMapBase?: unknown }): { routeMapBase?: 'dark' | 'light' | 'none'; routeMapPhoto?: 'photo' } {
  if (ground === 'photo') return { routeMapPhoto: 'photo', ...(resolveMapBase(current.routeMapBase) === 'none' ? { routeMapBase: undefined } : {}) };
  return { routeMapBase: ground, routeMapPhoto: undefined };
}
// Bij Ondergrond Geen haalt de kaart geen tegels op, dus ook geen luchtfoto: dan staat er geen schakelaar.
export const photoOffered = (base: MapBase): boolean => base !== 'none';

// Een stap van de ondergrond. 'plain' haalt niets op en kan dus niet wegvallen.
// 'aerial' is de luchtfoto; valt die weg, dan volgt de kaart (de stappen van Kaart erachter).
export type MapStage = 'aerial' | 'vector' | 'raster' | 'plain';

// Zonder netwerk probeert de luchtfoto het nog wel: tegels die je eerder zag staan in de runtime-cache.
// Is die leeg, dan valt hij weg naar het effen vlak, met een regel.
export function stagesFor(base: MapBase, online: boolean, photo: boolean = false): MapStage[] {
  if (base === 'none') return ['plain'];
  const map: MapStage[] = online ? ['vector', 'raster', 'plain'] : ['plain'];
  return photo ? ['aerial', ...map] : map;
}

// De regel als de luchtfoto niet laadt en de kaart het overneemt; leeg als er niets te zeggen is.
export function photoFallbackLine(photoFailed: boolean, online: boolean): string {
  if (!photoFailed) return '';
  return online ? 'De luchtfoto laadt niet. Je ziet de kaart.' : 'Zonder netwerk is er geen luchtfoto.';
}

// De volgende stap na een bron die wegviel; undefined: er is geen volgende (het effen vlak blijft).
export function nextStage(stages: MapStage[], current: MapStage): MapStage | undefined {
  const i = stages.indexOf(current);
  return i >= 0 && i < stages.length - 1 ? stages[i + 1] : undefined;
}

// Antwoordt een bron niet binnen deze tijd, dan neemt de kaart de volgende stap.
export const MAP_SOURCE_LIMIT_MS = 6_000;
// De luchtfoto krijgt korter: valt hij weg, dan moet de kaart nog laden, en je wacht liever niet twee keer zes seconden.
export const AERIAL_LIMIT_MS = 4_000;
// Het losse stuk met MapLibre: laadt het niet binnen deze tijd, dan staat er een regel in plaats van de kaart.
export const MAP_LOAD_LIMIT_MS = 15_000;

export const OPENFREEMAP_STYLE: Record<'dark' | 'light', string> = {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  light: 'https://tiles.openfreemap.org/styles/positron',
};
export const OSM_RASTER_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// De naamsvermelding per stap, zichtbaar op de kaart. Bij de luchtfoto die van de gekozen bron.
export function attributionFor(stage: MapStage | undefined, aerial?: AerialSource): string {
  if (stage === 'aerial') return aerial?.attribution ?? '';
  if (stage === 'vector') return '© OpenMapTiles © OpenStreetMap contributors';
  if (stage === 'raster') return '© OpenStreetMap contributors';
  return '';
}

// De naamsvermelding op de stille kaart van de Briefing: kort, in de hoek. "© OpenStreetMap" is de vorm die
// OpenStreetMap op een kleine kaart toestaat; de volle vorm staat op de grote kaart (Groter).
export const quietAttribution = (full: string): string => full.replace(/ contributors$/, '');

// De kleuren van de kaart, uit de tokens. `on-light` voor een lichte ondergrond.
export const MAP_TOKENS = {
  bg: '--color-bg',
  charcoal: '--color-charcoal',
  surface: '--color-surface',
  card: '--color-card',
  raised: '--color-raised',
  border: '--color-card-border',
  control: '--color-control-border',
  ink: '--color-ink',
  inkDim: '--color-ink-dim',
  action: '--color-action',
  status: '--color-status',
  actionOnLight: '--color-action-on-light',
  statusOnLight: '--color-status-on-light',
  onLight: '--color-on-light',
  onLightDim: '--color-on-light-dim',
  lightCard: '--color-light-card',
  routeOther: '--color-route-other',
  routeOtherOnLight: '--color-route-other-on-light',
} as const;
export type MapColors = Record<keyof typeof MAP_TOKENS, string>;

export function readMapColors(read: (token: string) => string): MapColors {
  const out = {} as MapColors;
  for (const [k, token] of Object.entries(MAP_TOKENS)) out[k as keyof MapColors] = read(token).trim();
  return out;
}

// De kleuren van de lijnen en stippen: op een lichte ondergrond de varianten voor licht.
// Op een luchtfoto altijd de donkere rand: een mint lus met een donkere rand blijft leesbaar op bos, akker en water.
export function overlayColors(c: MapColors, base: MapBase, stage: MapStage) {
  const light = base === 'light' && stage !== 'plain' && stage !== 'aerial';
  return light
    ? { chosen: c.actionOnLight, other: c.routeOtherOnLight, otherCasing: c.lightCard, casing: c.lightCard, status: c.statusOnLight, ring: c.lightCard, pick: c.onLight }
    : { chosen: c.action, other: c.routeOther, otherCasing: c.bg, casing: c.bg, status: c.status, ring: c.bg, pick: c.ink };
}

// ── GeoJSON ──────────────────────────────────────────────────────────────

export interface MapRoute {
  style: RouteStyle;
  points: RoutePoint[];
}

type LineFeature = { type: 'Feature'; properties: { style: RouteStyle; chosen: boolean }; geometry: { type: 'LineString'; coordinates: [number, number][] } };
type PointFeature = { type: 'Feature'; properties: { kind: MapDot }; geometry: { type: 'Point'; coordinates: [number, number] } };
export type MapDot = 'start' | 'me' | 'pick';

// Een lijn met minder dan twee punten is geen lijn. De gekozen lus komt als laatste, dan ligt hij bovenop.
export function routeFeatures(routes: MapRoute[], chosen: RouteStyle | undefined): { type: 'FeatureCollection'; features: LineFeature[] } {
  const lines = routes
    .filter((r) => r.points.length >= 2)
    .map((r): LineFeature => ({ type: 'Feature', properties: { style: r.style, chosen: r.style === chosen }, geometry: { type: 'LineString', coordinates: r.points.map((p) => [p.lon, p.lat]) } }));
  lines.sort((a, b) => Number(a.properties.chosen) - Number(b.properties.chosen));
  return { type: 'FeatureCollection', features: lines };
}

export function dotFeatures(dots: Partial<Record<MapDot, RoutePoint>>): { type: 'FeatureCollection'; features: PointFeature[] } {
  const order: MapDot[] = ['pick', 'start', 'me'];
  return {
    type: 'FeatureCollection',
    features: order.flatMap((kind) => {
      const p = dots[kind];
      return p ? [{ type: 'Feature', properties: { kind }, geometry: { type: 'Point', coordinates: [p.lon, p.lat] } } as PointFeature] : [];
    }),
  };
}

// Het vak om alle lussen en stippen heen: [[west, zuid], [oost, noord]]. Undefined zonder punten.
export function boundsOf(points: RoutePoint[]): [[number, number], [number, number]] | undefined {
  if (points.length === 0) return undefined;
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const p of points) {
    w = Math.min(w, p.lon); e = Math.max(e, p.lon);
    s = Math.min(s, p.lat); n = Math.max(n, p.lat);
  }
  return [[w, s], [e, n]];
}

// Eén regel boven de kaart als er meer dan één lus is: welke doorgetrokken is en welke gestreept, in de
// woorden van de blokken eronder. Leeg bij één of geen lus.
export function mapLegendLine(styles: RouteStyle[], chosen: RouteStyle | undefined, names: Record<RouteStyle, string>): string {
  if (styles.length < 2 || !chosen || !styles.includes(chosen)) return '';
  const others = styles.filter((s) => s !== chosen).map((s) => names[s]);
  return `${styles.length} lussen: ${names[chosen]} (doorgetrokken) en ${others.join(' en ')} (gestreept). Tik er een om te kiezen.`;
}

// Hoe lang een beweging van de camera duurt: alleen in Vol, en binnen 150 tot 400 ms.
export const cameraDuration = (motion: 'full' | 'calm' | 'off'): number => (motion === 'full' ? 300 : 0);

// ── Stijlen ──────────────────────────────────────────────────────────────

export const ROUTE_SOURCE = 'ascend-routes';
export const DOT_SOURCE = 'ascend-dots';
export const ROUTE_HIT_LAYER = 'ascend-route-hit';
// Een lijn van 4 px is geen tikdoel: een onzichtbare brede lijn eronder vangt de tik.
export const ROUTE_HIT_WIDTH = 28;

type Json = Record<string, unknown>;
export interface StyleSpec extends Json {
  version: 8;
  sources: Record<string, Json>;
  layers: Json[];
}

type Overlay = { routes: ReturnType<typeof routeFeatures>; dots: ReturnType<typeof dotFeatures> };

// De andere lus: breedte van de streepjes, van de donkere rand eronder, en hoeveel px hij naast de lijn ligt.
export const OTHER_WIDTH = 3.5;
export const OTHER_CASING_WIDTH = 7.5;
export const OTHER_OFFSET = 5;

// De lussen en stippen bovenop elke ondergrond, als bronnen en lagen in dezelfde stijl.
export function overlayLayers(colors: ReturnType<typeof overlayColors>): Json[] {
  const isChosen = ['==', ['get', 'chosen'], true];
  return [
    { id: ROUTE_HIT_LAYER, type: 'line', source: ROUTE_SOURCE, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': colors.casing, 'line-width': ROUTE_HIT_WIDTH, 'line-opacity': 0 } },
    // De andere lus: licht gestreept op een donkere rand, iets naast de lijn gelegd, zodat hij ook te zien
    // is waar hij met de gekozen lus samenloopt (het eerste stuk vanaf de start).
    { id: 'ascend-route-other-casing', type: 'line', source: ROUTE_SOURCE, filter: ['!', isChosen], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': colors.otherCasing, 'line-width': OTHER_CASING_WIDTH, 'line-offset': OTHER_OFFSET } },
    { id: 'ascend-route-other', type: 'line', source: ROUTE_SOURCE, filter: ['!', isChosen], layout: { 'line-join': 'round' }, paint: { 'line-color': colors.other, 'line-width': OTHER_WIDTH, 'line-offset': OTHER_OFFSET, 'line-dasharray': [2, 1.25] } },
    { id: 'ascend-route-casing', type: 'line', source: ROUTE_SOURCE, filter: isChosen, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': colors.casing, 'line-width': 8 } },
    { id: 'ascend-route-chosen', type: 'line', source: ROUTE_SOURCE, filter: isChosen, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': colors.chosen, 'line-width': 4.5 } },
    // Startpunt en een gekozen punt: een ring. Je plek: een volle stip.
    {
      id: 'ascend-dots', type: 'circle', source: DOT_SOURCE,
      paint: {
        'circle-radius': ['match', ['get', 'kind'], 'me', 6, 7],
        'circle-color': ['match', ['get', 'kind'], 'me', colors.status, colors.ring],
        'circle-stroke-width': 3,
        'circle-stroke-color': ['match', ['get', 'kind'], 'me', colors.ring, 'pick', colors.pick, colors.status],
      },
    },
  ];
}

function withOverlay(style: StyleSpec, overlay: Overlay, colors: ReturnType<typeof overlayColors>): StyleSpec {
  return {
    ...style,
    sources: { ...style.sources, [ROUTE_SOURCE]: { type: 'geojson', data: overlay.routes }, [DOT_SOURCE]: { type: 'geojson', data: overlay.dots } },
    layers: [...style.layers, ...overlayLayers(colors)],
  };
}

// Het effen vlak: geen bron van buiten, alleen een achtergrond in een token-kleur.
export function plainStyle(c: MapColors, overlay: Overlay): StyleSpec {
  return withOverlay({ version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': c.charcoal } }] }, overlay, overlayColors(c, 'none', 'plain'));
}

// De rastertegels van OpenStreetMap. Donker: grijs gemaakt en omgekeerd, half doorzichtig op de achtergrond.
export function rasterStyle(c: MapColors, base: MapBase, overlay: Overlay): StyleSpec {
  const dark = base !== 'light';
  return withOverlay(
    {
      version: 8,
      sources: { 'osm-raster': { type: 'raster', tiles: [OSM_RASTER_TILES], tileSize: 256, maxzoom: 19, attribution: '© OpenStreetMap contributors' } },
      layers: [
        { id: 'background', type: 'background', paint: { 'background-color': dark ? c.bg : c.lightCard } },
        { id: 'osm-raster', type: 'raster', source: 'osm-raster', paint: dark ? { 'raster-saturation': -1, 'raster-brightness-min': 1, 'raster-brightness-max': 0, 'raster-opacity': 0.55 } : {} },
      ],
    },
    overlay,
    overlayColors(c, base, 'raster'),
  );
}

export const AERIAL_SOURCE = 'ascend-aerial';

// De luchtfoto van één bron, iets gedempt zodat de lus en de knoppen erboven de aandacht houden.
export function aerialStyle(c: MapColors, aerial: AerialSource, overlay: Overlay): StyleSpec {
  return withOverlay(
    {
      version: 8,
      sources: { [AERIAL_SOURCE]: { type: 'raster', tiles: [aerial.tiles], tileSize: 256, maxzoom: aerial.maxzoom, bounds: aerial.bounds, attribution: aerial.attribution } },
      layers: [
        { id: 'background', type: 'background', paint: { 'background-color': c.charcoal } },
        { id: AERIAL_SOURCE, type: 'raster', source: AERIAL_SOURCE, paint: { 'raster-brightness-max': 0.85 } },
      ],
    },
    overlay,
    overlayColors(c, 'dark', 'aerial'),
  );
}

// De bronnen waar de ondergrond van een stap op wacht.
export const baseSourcesOf = (stage: MapStage): string[] => (stage === 'vector' ? ['openmaptiles'] : stage === 'raster' ? ['osm-raster'] : stage === 'aerial' ? [AERIAL_SOURCE] : []);

// De donkere stijl van OpenFreeMap in de kleuren van ASCEND. Per laag op naam en soort; een laag die
// er niet (meer) is, slaat dit over. Paden blijven zichtbaar, want daar loop je.
function darkPaint(id: string, type: string, c: MapColors): Json | undefined {
  if (type === 'background') return { 'background-color': c.bg };
  if (type === 'symbol') return { 'text-color': c.inkDim, 'text-halo-color': c.bg, 'text-opacity': 0.75 };
  if (type === 'raster') return { 'raster-opacity': 0.25 };
  if (id === 'water' || id === 'waterway') return type === 'fill' ? { 'fill-color': c.surface } : { 'line-color': c.surface };
  if (/^(landcover|landuse)/.test(id)) return { 'fill-color': c.charcoal };
  if (id === 'building') return { 'fill-color': c.charcoal, 'fill-outline-color': c.surface };
  if (id === 'highway_path') return { 'line-color': c.control };
  if (/casing|boundary|railway|aeroway/.test(id)) return type === 'fill' ? { 'fill-color': c.card } : { 'line-color': c.border };
  if (/^(highway|road)/.test(id)) return type === 'fill' ? { 'fill-color': c.card } : { 'line-color': c.raised };
  return undefined;
}

// Niets kleiner dan 12 px: een vaste tekstmaat eronder gaat naar 12. Een maat die met de zoom meegroeit
// blijft staan (die mag alleen bovenaan een expressie staan); die geldt alleen ver uitgezoomd.
const MIN_TEXT_PX = 12;
function readableText(l: Json): Json {
  const layout = l.layout as Json | undefined;
  const size = layout?.['text-size'];
  if (typeof size !== 'number' || size >= MIN_TEXT_PX) return l;
  return { ...l, layout: { ...layout, 'text-size': MIN_TEXT_PX } };
}

// Wat MapLibre van OpenFreeMap krijgt, voor het tekent: donker overgeschilderd (alleen bij Donker) en
// met de lussen erbovenop. Een onbekende vorm laat de stijl zoals hij is, met de lussen erop.
export function paintOpenFreeMap(style: StyleSpec, c: MapColors, base: MapBase, overlay: Overlay): StyleSpec {
  const layers = Array.isArray(style.layers) ? style.layers : [];
  const painted = base === 'light'
    ? layers
    : layers.map((layer) => {
      let l = layer;
      const id = String(l.id ?? '');
      const type = String(l.type ?? '');
      const paint = darkPaint(id, type, c);
      if (type === 'symbol') l = readableText(l);
      if (!paint) return l;
      // Een patroon (bos) ligt over de kleur heen en vraagt een plaatje: met een eigen kleur valt het weg.
      const { 'fill-pattern': _pattern, ...rest } = (l.paint as Json | undefined) ?? {};
      return { ...l, paint: { ...(paint['fill-color'] ? rest : (l.paint as Json | undefined) ?? {}), ...paint } };
    });
  return withOverlay({ ...style, sources: style.sources ?? {}, layers: painted }, overlay, overlayColors(c, base, 'vector'));
}
