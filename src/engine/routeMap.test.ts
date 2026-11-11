import { describe, expect, it } from 'vitest';
import {
  attributionFor, boundsOf, cameraDuration, dotFeatures, MAP_TOKENS, nextStage, overlayLayers, overlayColors, paintOpenFreeMap,
  mapLegendLine, plainStyle, rasterStyle, readMapColors, resolveMapBase, ROUTE_HIT_LAYER, ROUTE_HIT_WIDTH, routeFeatures, stagesFor, type MapColors, type StyleSpec,
} from './routeMap';

// Nagemaakte punten bij het Drielandenpunt (een openbare plek), nooit een echte plek van de eigenaar.
const A = { lat: 50.7548, lon: 6.0207 };
const B = { lat: 50.7601, lon: 6.0302 };
const C = { lat: 50.7499, lon: 6.0111 };
// Elke kleur is de naam van zijn token: zo zie je in de test welk token waar terechtkomt.
const colors = readMapColors((token) => ` ${token} `);
const overlay = { routes: routeFeatures([{ style: 'adventure', points: [A, B, C] }], 'adventure'), dots: dotFeatures({ start: A }) };

describe('ondergrond: volgorde en terugval', () => {
  it('Donker is het advies; een onbekende waarde ook', () => {
    expect(resolveMapBase(undefined)).toBe('dark');
    expect(resolveMapBase('onzin')).toBe('dark');
    expect(resolveMapBase('light')).toBe('light');
    expect(resolveMapBase('none')).toBe('none');
  });

  it('OpenFreeMap, dan OSM-raster, dan het effen vlak; alleen vooruit', () => {
    const stages = stagesFor('dark', true);
    expect(stages).toEqual(['vector', 'raster', 'plain']);
    expect(nextStage(stages, 'vector')).toBe('raster');
    expect(nextStage(stages, 'raster')).toBe('plain');
    expect(nextStage(stages, 'plain')).toBeUndefined();
  });

  it('geen netwerk of Geen: meteen het effen vlak, zonder tegels', () => {
    expect(stagesFor('dark', false)).toEqual(['plain']);
    expect(stagesFor('light', false)).toEqual(['plain']);
    expect(stagesFor('none', true)).toEqual(['plain']);
  });

  it('naamsvermelding per bron, op de kaart', () => {
    expect(attributionFor('vector')).toContain('© OpenMapTiles');
    expect(attributionFor('vector')).toContain('© OpenStreetMap contributors');
    expect(attributionFor('raster')).toBe('© OpenStreetMap contributors');
    expect(attributionFor('plain')).toBe('');
  });
});

describe('lussen en stippen', () => {
  it('geen lus: geen lijnen, wel de start', () => {
    expect(routeFeatures([], undefined).features).toEqual([]);
    expect(dotFeatures({ start: A }).features.map((f) => f.properties.kind)).toEqual(['start']);
  });

  it('één lus: hij is de gekozen', () => {
    const f = routeFeatures([{ style: 'simple', points: [A, B] }], 'simple').features;
    expect(f).toHaveLength(1);
    expect(f[0].properties).toEqual({ style: 'simple', chosen: true });
    expect(f[0].geometry.coordinates[0]).toEqual([A.lon, A.lat]);
  });

  it('twee lussen: de gekozen ligt bovenop, een lijn van één punt valt weg', () => {
    const f = routeFeatures([{ style: 'adventure', points: [A, B, C] }, { style: 'simple', points: [A, C] }, { style: 'simple', points: [A] }], 'adventure').features;
    expect(f.map((x) => x.properties.style)).toEqual(['simple', 'adventure']);
    expect(f.at(-1)?.properties.chosen).toBe(true);
  });

  it('je plek boven de start, een gekozen punt eronder', () => {
    expect(dotFeatures({ me: B, start: A, pick: C }).features.map((f) => f.properties.kind)).toEqual(['pick', 'start', 'me']);
  });

  it('het vak om alles heen', () => {
    expect(boundsOf([])).toBeUndefined();
    expect(boundsOf([A, B, C])).toEqual([[C.lon, C.lat], [B.lon, B.lat]]);
  });

  it('de tiklaag is breed en onzichtbaar', () => {
    const hit = overlayLayers(overlayColors(colors, 'dark', 'vector')).find((l) => l.id === ROUTE_HIT_LAYER) as { paint: Record<string, unknown> };
    expect(ROUTE_HIT_WIDTH).toBeGreaterThanOrEqual(24);
    expect(hit.paint['line-width']).toBe(ROUTE_HIT_WIDTH);
    expect(hit.paint['line-opacity']).toBe(0);
  });

  it('gekozen in mint, de andere gedempt en gestreept, stippen in ijsblauw', () => {
    const layers = overlayLayers(overlayColors(colors, 'dark', 'vector')) as { id: string; paint: Record<string, unknown> }[];
    const by = (id: string) => layers.find((l) => l.id === id)!.paint;
    expect(by('ascend-route-chosen')['line-color']).toBe(MAP_TOKENS.action);
    // De andere lus heeft een eigen token, een donkere rand en ligt iets naast de gekozen lus.
    expect(by('ascend-route-other')['line-color']).toBe(MAP_TOKENS.routeOther);
    expect(by('ascend-route-other')['line-dasharray']).toBeDefined();
    expect(by('ascend-route-other')['line-width']).toBeGreaterThan(3);
    expect(by('ascend-route-other-casing')['line-color']).toBe(MAP_TOKENS.bg);
    expect(by('ascend-route-other-casing')['line-offset']).toBe(by('ascend-route-other')['line-offset']);
    expect(overlayColors(colors, 'light', 'vector').other).toBe(MAP_TOKENS.routeOtherOnLight);
    // Eén mint accent: alleen de gekozen lus is mint.
    expect(layers.filter((l) => JSON.stringify(l.paint).includes(MAP_TOKENS.action)).map((l) => l.id)).toEqual(['ascend-route-chosen']);
    expect(JSON.stringify(by('ascend-dots'))).toContain(MAP_TOKENS.status);
  });

  it('op Licht de varianten voor licht', () => {
    expect(overlayColors(colors, 'light', 'vector').chosen).toBe(MAP_TOKENS.actionOnLight);
    // Het effen vlak is altijd donker.
    expect(overlayColors(colors, 'light', 'plain').chosen).toBe(MAP_TOKENS.action);
  });
});

describe('stijlen', () => {
  const tokenOnly = (style: StyleSpec) => {
    // Elke kleurwaarde is een token, nooit een hex of rgba uit de code.
    const json = JSON.stringify(style);
    expect(json).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
  };

  it('effen vlak: geen bron van buiten, lussen erop', () => {
    const s = plainStyle(colors, overlay);
    expect(Object.keys(s.sources)).toEqual(['ascend-routes', 'ascend-dots']);
    expect(JSON.stringify(s)).not.toContain('http');
    tokenOnly(s);
  });

  it('OSM-raster: donker omgekeerd, met naamsvermelding', () => {
    const s = rasterStyle(colors, 'dark', overlay);
    const src = s.sources['osm-raster'] as { tiles: string[]; attribution: string };
    expect(src.tiles[0]).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(src.attribution).toBe('© OpenStreetMap contributors');
    const raster = s.layers.find((l) => l.id === 'osm-raster') as { paint: Record<string, number> };
    expect(raster.paint['raster-brightness-min']).toBeGreaterThan(raster.paint['raster-brightness-max']);
    tokenOnly(s);
    expect(JSON.stringify(rasterStyle(colors, 'light', overlay))).not.toContain('raster-brightness');
  });

  it('OpenFreeMap Dark in de tokens, paden zichtbaar, onbekende lagen ongemoeid, lussen erbovenop', () => {
    const ofm: StyleSpec = {
      version: 8,
      sources: { openmaptiles: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } },
      layers: [
        { id: 'background', type: 'background', paint: { 'background-color': 'rgb(12,12,12)' } },
        { id: 'water', type: 'fill', paint: { 'fill-color': 'rgb(27,27,29)' } },
        { id: 'highway_path', type: 'line', paint: { 'line-color': 'rgb(27,27,29)', 'line-dasharray': [1.5, 1.5] } },
        { id: 'place_city', type: 'symbol', layout: { 'text-size': 10 }, paint: { 'text-color': 'rgb(101,101,101)' } },
        { id: 'landcover_wood', type: 'fill', paint: { 'fill-color': 'rgb(32,32,32)', 'fill-pattern': 'wood-pattern', 'fill-opacity': 0.4 } },
        { id: 'iets_nieuws', type: 'heatmap', paint: { a: 1 } },
      ],
    };
    const s = paintOpenFreeMap(ofm, colors, 'dark', overlay);
    const paint = (id: string) => (s.layers.find((l) => l.id === id) as { paint: Record<string, unknown> }).paint;
    expect(paint('background')['background-color']).toBe(MAP_TOKENS.bg);
    expect(paint('water')['fill-color']).toBe(MAP_TOKENS.surface);
    expect(paint('highway_path')['line-color']).toBe(MAP_TOKENS.control);
    expect(paint('highway_path')['line-dasharray']).toEqual([1.5, 1.5]);
    expect(paint('iets_nieuws')).toEqual({ a: 1 });
    expect(paint('landcover_wood')).toEqual({ 'fill-color': MAP_TOKENS.charcoal, 'fill-opacity': 0.4 });
    expect((s.layers.find((l) => l.id === 'place_city') as { layout: Record<string, unknown> }).layout['text-size']).toBe(12);
    expect(s.layers.at(-1)?.id).toBe('ascend-dots');
    expect(s.sources.openmaptiles).toBeDefined();
  });

  it('een stijl zonder lagen breekt niet', () => {
    const s = paintOpenFreeMap({ version: 8 } as unknown as StyleSpec, colors as MapColors, 'dark', overlay);
    expect(s.layers.map((l) => l.id)).toContain(ROUTE_HIT_LAYER);
  });

  it('Licht laat de kleuren van OpenFreeMap staan', () => {
    const s = paintOpenFreeMap({ version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': 'x' } }] }, colors, 'light', overlay);
    expect((s.layers[0] as { paint: Record<string, unknown> }).paint['background-color']).toBe('x');
  });
});

describe('beweging', () => {
  it('alleen in Vol beweegt de camera, binnen 150 tot 400 ms', () => {
    expect(cameraDuration('full')).toBeGreaterThanOrEqual(150);
    expect(cameraDuration('full')).toBeLessThanOrEqual(400);
    expect(cameraDuration('calm')).toBe(0);
    expect(cameraDuration('off')).toBe(0);
  });
});

describe('de regel boven de kaart', () => {
  const names = { simple: 'Simpel', adventure: 'Avontuurlijk' } as const;
  it('twee lussen: welke doorgetrokken en welke gestreept, in de woorden van de blokken', () => {
    expect(mapLegendLine(['adventure', 'simple'], 'adventure', names)).toBe('2 lussen: Avontuurlijk (doorgetrokken) en Simpel (gestreept). Tik er een om te kiezen.');
    expect(mapLegendLine(['adventure', 'simple'], 'simple', names)).toBe('2 lussen: Simpel (doorgetrokken) en Avontuurlijk (gestreept). Tik er een om te kiezen.');
  });
  it('één of geen lus: geen regel', () => {
    expect(mapLegendLine(['simple'], 'simple', names)).toBe('');
    expect(mapLegendLine([], undefined, names)).toBe('');
  });
});

