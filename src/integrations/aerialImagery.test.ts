import { describe, expect, it } from 'vitest';
import { AERIAL_CACHE, AERIAL_HOSTS, AERIAL_SOURCES, aerialMarginKm, aerialSourceFor, inRing, insideCountry } from './aerialImagery';

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

describe('waar Warden wit vond (review 11 november, gemeten met echte tegels)', () => {
  it('Frankrijk bij België, Saarland en de Jura: EOX', () => {
    expect(id(line([49.95, 4.2], [49.978, 4.2]))).toBe('eox'); // Momignies
    expect(id([{ lat: 49.182, lon: 6.75 }])).toBe('eox'); // Saarland
    expect(id([{ lat: 46.934, lon: 6.468 }])).toBe('eox'); // Jura
    expect(id([{ lat: 46.942, lon: 6.48 }])).toBe('eox');
  });

  it('zee bij de Franse kust: Nice geeft EOX', () => {
    expect(id(loop(43.7, 7.26))).toBe('eox');
  });

  it('Nederland steekt niet meer in Duitsland of België', () => {
    expect(id([{ lat: 52.5, lon: 6.8 }])).toBe('eox'); // Itterbeck
    expect(id([{ lat: 52.04, lon: 6.83 }])).toBe('eox'); // Vreden
    expect(id([{ lat: 51.45, lon: 4.79 }])).toBe('eox'); // Meersel-Dreef
    expect(id([{ lat: 51.465, lon: 4.47 }])).toBe('eox'); // Essen
  });

  it('de rand groeit met de route: een lange smalle lijn kijkt verder opzij', () => {
    expect(aerialMarginKm(loop(52.09, 5.12))).toBe(1);
    // 20 km noord-zuid: 5 km opzij.
    expect(aerialMarginKm(line([52.0, 5.12], [52.18, 5.12]))).toBeCloseTo(5, 0);
    // Door Utrecht ligt dat ruim binnen het land.
    expect(id(line([52.0, 5.12], [52.18, 5.12]))).toBe('pdok');
  });
});

describe('een vlak is niet bol: ook de zijden van het vak tellen (herreview 11 november)', () => {
  // De vier hoeken van het vak met de rand, zoals de bronkeuze van vóór deze herstel ze toetste.
  const corners = (pts: { lat: number; lon: number }[]) => {
    const km = aerialMarginKm(pts);
    const lats = pts.map((p) => p.lat), lons = pts.map((p) => p.lon);
    const s = Math.min(...lats), n = Math.max(...lats), w = Math.min(...lons), e = Math.max(...lons);
    const dLat = km / 111.32, dLon = km / (111.32 * Math.cos((((s + n) / 2) * Math.PI) / 180));
    return [...pts, { lat: s - dLat, lon: w - dLon }, { lat: s - dLat, lon: e + dLon }, { lat: n + dLat, lon: w - dLon }, { lat: n + dLat, lon: e + dLon }];
  };

  it('bij Genève: alle hoeken in Frankrijk, maar een zijde door Zwitserland, dus EOX', () => {
    const route = line([45.95, 5.9], [46.2, 6.3], 20);
    expect(insideCountry('ign', corners(route))).toBe(true);
    expect(id(route)).toBe('eox');
  });

  it('bij Meersel-Dreef en Essen: alle hoeken in Nederland, maar een zijde door België, dus EOX', () => {
    const route = line([51.5, 4.4], [51.75, 4.8], 20);
    expect(insideCountry('pdok', corners(route))).toBe(true);
    expect(id(route)).toBe('eox');
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
