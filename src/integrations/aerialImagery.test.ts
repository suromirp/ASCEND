import { describe, expect, it } from 'vitest';
import { AERIAL_CACHE, AERIAL_HOSTS, AERIAL_SOURCES, aerialSourceFor, inRing } from './aerialImagery';

// Nagemaakte lussen rond openbare plekken (stadscentra, toppen, grensovergangen), nooit een plek van de eigenaar.
// Een lus van ongeveer 2 km rond een punt.
const loop = (lat: number, lon: number, d = 0.008) => [
  { lat, lon }, { lat: lat + d, lon }, { lat: lat + d, lon: lon + d }, { lat, lon: lon + d }, { lat, lon },
];
const line = (a: [number, number], b: [number, number], n = 10) =>
  Array.from({ length: n + 1 }, (_, i) => ({ lat: a[0] + ((b[0] - a[0]) * i) / n, lon: a[1] + ((b[1] - a[1]) * i) / n }));
const id = (pts: { lat: number; lon: number }[]) => aerialSourceFor(pts).id;

describe('welke luchtfoto: midden in een land', () => {
  it('Nederland: PDOK', () => {
    expect(id(loop(52.09, 5.12))).toBe('pdok'); // Utrecht
    expect(id(loop(52.37, 4.89))).toBe('pdok'); // Amsterdam
    expect(id(loop(53.21, 6.56))).toBe('pdok'); // Groningen
    expect(id(loop(51.84, 5.85))).toBe('pdok'); // Nijmegen
    expect(id(loop(50.86, 5.82))).toBe('pdok'); // Valkenburg, Zuid-Limburg
    expect(id(loop(53.06, 4.80))).toBe('pdok'); // Texel
  });

  it('Frankrijk: IGN', () => {
    expect(id(loop(48.85, 2.34))).toBe('ign'); // Parijs
    expect(id(loop(45.90, 6.12))).toBe('ign'); // Annecy
    expect(id(loop(45.92, 6.86))).toBe('ign'); // Chamonix
    expect(id(loop(44.89, 6.63))).toBe('ign'); // Briançon
    expect(id(loop(43.07, -0.05))).toBe('ign'); // Lourdes
    expect(id(loop(48.11, -1.68))).toBe('ign'); // Rennes
  });

  it('daarbuiten: EOX', () => {
    expect(id(loop(50.85, 4.35))).toBe('eox'); // Brussel
    expect(id(loop(49.61, 6.13))).toBe('eox'); // Luxemburg
    expect(id(loop(46.02, 7.75))).toBe('eox'); // Zermatt
    expect(id(loop(42.70, 9.45))).toBe('eox'); // Corsica valt buiten het vlak
    expect(id(loop(51.23, 6.78))).toBe('eox'); // Düsseldorf
  });
});

describe('welke luchtfoto: over of bij een grens, nooit half wit', () => {
  it('Nederland en België: Breda naar Hoogstraten, en Baarle: EOX', () => {
    expect(id(line([51.55, 4.78], [51.40, 4.77]))).toBe('eox');
    expect(id(loop(51.44, 4.93))).toBe('eox');
    // Zeeuws-Vlaanderen tot over de grens bij Sluis.
    expect(id(line([51.31, 3.39], [51.25, 3.40]))).toBe('eox');
  });

  it('Zuid-Limburg naar Brabant loopt door België: niet één vlak, dus EOX', () => {
    expect(id(line([50.86, 5.82], [51.30, 5.60]))).toBe('eox');
  });

  it('het Drielandenpunt: EOX', () => {
    expect(id(loop(50.7548, 6.0207, 0.004))).toBe('eox');
  });

  it('Frankrijk en Zwitserland: Le Tour over de Col de Balme naar Trient, en Annemasse naar Genève: EOX', () => {
    expect(id(line([45.99, 6.95], [46.05, 7.00]))).toBe('eox');
    expect(id(line([46.19, 6.24], [46.20, 6.14]))).toBe('eox');
  });

  it('Chamonix naar de top van de Mont Blanc (de grens ligt op de kam): EOX', () => {
    expect(id(line([45.92, 6.87], [45.833, 6.865]))).toBe('eox');
  });

  it('een kilometer rand: een lus die net binnen de grens ligt maar er met de rand overheen gaat, krijgt EOX', () => {
    // Bij Venlo, een paar honderd meter van Duitsland.
    expect(id(loop(51.37, 6.19, 0.004))).toBe('eox');
  });

  it('je plek ver weg in een ander land telt mee, want de kaart brengt hem in beeld', () => {
    expect(id([...loop(52.09, 5.12), { lat: 48.85, lon: 2.34 }])).toBe('eox');
  });
});

describe('geen route', () => {
  it('alleen een startpunt (je plek of Thuis): de bron van die plek', () => {
    expect(id([{ lat: 52.09, lon: 5.12 }])).toBe('pdok');
    expect(id([{ lat: 45.90, lon: 6.12 }])).toBe('ign');
  });

  it('niets of onzin: de wereldlaag', () => {
    expect(id([])).toBe('eox');
    expect(id([{ lat: Number.NaN, lon: 5 }])).toBe('eox');
  });
});

describe('de bronnen', () => {
  it('elk een eigen maxzoom, een naamsvermelding en een link; nergens een sleutel', () => {
    expect(AERIAL_SOURCES.pdok.maxzoom).toBe(19);
    expect(AERIAL_SOURCES.ign.maxzoom).toBe(19);
    expect(AERIAL_SOURCES.eox.maxzoom).toBe(13);
    for (const s of Object.values(AERIAL_SOURCES)) {
      expect(s.attribution.length).toBeGreaterThan(10);
      // De korte vorm op de kaart past op één regel naast de lus.
      expect(s.short.length).toBeLessThanOrEqual(32);
      expect(s.href).toMatch(/^https:\/\//);
      expect(s.tiles).toMatch(/^https:\/\//);
      expect(s.tiles.toLowerCase()).not.toMatch(/key|token/);
      expect(AERIAL_HOSTS).toContain(new URL(s.tiles.replace(/\{[xyz]\}/g, '0')).hostname);
    }
  });

  it('PDOK de laag van 25 cm (dekt ook water), IGN de orthofoto in PM, EOX 2016 met de rij voor de kolom', () => {
    expect(AERIAL_SOURCES.pdok.tiles).toContain('/Actueel_ortho25/EPSG:3857/{z}/{x}/{y}.jpeg');
    expect(AERIAL_SOURCES.ign.tiles).toContain('LAYER=ORTHOIMAGERY.ORTHOPHOTOS');
    expect(AERIAL_SOURCES.ign.tiles).toContain('TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}');
    expect(AERIAL_SOURCES.eox.tiles).toContain('/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg');
    expect(AERIAL_SOURCES.eox.attribution).toContain('Copernicus Sentinel data 2016 & 2017');
  });

  it('de cache is begrensd', () => {
    expect(AERIAL_CACHE.maxEntries).toBeLessThanOrEqual(500);
    expect(AERIAL_CACHE.maxAgeDays).toBeLessThanOrEqual(30);
  });

  it('een punt in een ring', () => {
    const square: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
    expect(inRing(0.5, 0.5, square)).toBe(true);
    expect(inRing(1.5, 0.5, square)).toBe(false);
  });
});
