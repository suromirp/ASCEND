// ASCEND: welke luchtfoto onder de kaart bij Route voorstellen ligt. Eén bron per kaart, gekozen op
// alles wat de kaart in beeld brengt (de lussen, het startpunt, je plek) met een rand eromheen:
// ligt dat helemaal in Nederland, dan PDOK; helemaal in Europees Frankrijk, dan IGN; anders de
// wereldlaag van EOX (Sentinel-2 cloudless 2016). Puur: geen netwerk, geen DOM.
//
// Waarom vlakken en geen rechthoeken: PDOK en IGN geven buiten hun land een witte tegel (getest op
// 11 november 2026: Antwerpen, Wallis, de zee voor Nice), en JPEG is niet doorzichtig. Een route die
// over de grens loopt zou dan half wit zijn. De vlakken hieronder liggen daarom aan de binnenkant van
// de grens (een paar kilometer erin) en zijn grof: twijfel geeft EOX, nooit een halve luchtfoto.
// PDOK: de laag van 25 cm (zomer), want die dekt ook het water; de laag van 8 cm is wit op de
// Waddenzee en het IJsselmeer. Geen sleutel, nergens. Docs: docs/beslissingen/2026-11-11-luchtfoto.md,
// docs/onderzoek/Luchtfoto op de kaart.md.

export type AerialId = 'pdok' | 'ign' | 'eox';

export interface AerialSource {
  id: AerialId;
  // Tegeladres voor MapLibre ({z}/{x}/{y}); bij EOX staat de rij voor de kolom.
  tiles: string;
  // Boven deze zoom rekt MapLibre de laatste tegel op in plaats van nieuwe te vragen.
  maxzoom: number;
  // [west, zuid, oost, noord]: buiten dit vak vraagt MapLibre geen tegels.
  bounds: [number, number, number, number];
  // De naamsvermelding die de licentie vraagt, zichtbaar op de kaart (na een tik op de korte vorm).
  attribution: string;
  // De korte vorm die op de kaart staat, zodat de vermelding de lus niet bedekt; een tik toont de volle.
  short: string;
  // Waar de naamsvermelding heen wijst.
  href: string;
}

export const AERIAL_SOURCES: Record<AerialId, AerialSource> = {
  pdok: {
    id: 'pdok',
    tiles: 'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_ortho25/EPSG:3857/{z}/{x}/{y}.jpeg',
    maxzoom: 19,
    bounds: [3.2, 50.7, 7.3, 53.7],
    attribution: 'Luchtfoto: Beeldmateriaal Nederland, via PDOK, CC BY 4.0',
    short: 'Beeldmateriaal Nederland, PDOK',
    href: 'https://www.pdok.nl/introductie/-/article/pdok-luchtfoto-rgb-open-',
  },
  ign: {
    id: 'ign',
    tiles: 'https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
    maxzoom: 19,
    bounds: [-5.2, 41.3, 9.6, 51.1],
    attribution: 'Luchtfoto: IGN, Géoplateforme, Licence Ouverte 2.0',
    short: 'IGN, Géoplateforme',
    href: 'https://cartes.gouv.fr/cgu',
  },
  eox: {
    id: 'eox',
    tiles: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg',
    maxzoom: 13,
    bounds: [-180, -85.05, 180, 85.05],
    // Letterlijk zoals EOX het vraagt voor de laag van 2016 (CC BY 4.0).
    attribution: 'Sentinel-2 cloudless - https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016 & 2017)',
    short: 'Sentinel-2 cloudless, EOX',
    href: 'https://s2maps.eu',
  },
};

// De hosts van de tegels, voor de runtime-cache in vite.config.ts.
export const AERIAL_HOSTS = ['service.pdok.nl', 'data.geopf.fr', 'tiles.maps.eox.at'] as const;
// De runtime-cache per host: alleen tegels die je zelf zag, hoogstens zoveel en zo lang. Nooit vooraf.
export const AERIAL_CACHE = { maxEntries: 300, maxAgeDays: 30 } as const;

type Ring = [number, number][];

// Nederland aan de binnenkant van de grens met België en Duitsland; de kust volgt de lijn van het land
// (de laag van 25 cm dekt de Waddenzee en een strook zee). Zuid-Limburg is een eigen vlak, want
// tussen Belgie en de Selfkant is Nederland bij Susteren maar een paar kilometer breed.
const NL: Ring[] = [
  [
    [3.42, 51.40], [3.50, 51.31], [3.80, 51.26], [4.05, 51.29], [4.22, 51.36], [4.35, 51.41], [4.50, 51.49],
    [4.75, 51.47], [4.93, 51.48], [5.08, 51.48], [5.18, 51.39], [5.33, 51.31], [5.55, 51.30], [5.70, 51.23],
    [5.82, 51.20], [5.88, 51.17], [6.00, 51.17], [6.10, 51.25], [6.15, 51.38], [6.05, 51.55], [5.98, 51.65],
    [5.92, 51.78], [5.93, 51.83], [6.00, 51.87],
    [6.10, 51.88], [6.25, 51.89], [6.48, 51.88], [6.78, 51.97], [6.82, 52.08], [6.88, 52.16],
    [7.00, 52.24], [7.02, 52.37], [6.92, 52.47], [6.70, 52.62], [6.75, 52.68], [7.00, 52.69], [7.02, 52.72],
    [7.03, 52.90], [7.15, 53.05], [7.18, 53.18], [7.15, 53.28], [6.95, 53.36], [6.88, 53.45], [6.30, 53.52],
    [5.60, 53.47], [4.90, 53.22], [4.70, 53.05], [4.58, 52.60], [4.40, 52.25], [4.05, 51.97], [3.65, 51.70],
    [3.42, 51.55], [3.38, 51.42],
  ],
  [
    [5.72, 50.87], [5.73, 50.79], [5.98, 50.78], [6.03, 50.85], [5.98, 50.92], [5.86, 50.97], [5.78, 50.96],
  ],
];

// Europees Frankrijk zonder Corsica, aan de binnenkant van elke landsgrens en een paar kilometer van de
// kust (IGN is wit op zee). Rond Genève en het Meer van Genève loopt het vlak eromheen; bij de Mont
// Blanc ligt de grens met Italië en Zwitserland op de kam, dus een route over de top krijgt EOX.
const FR: Ring[] = [
  [
    // Noordzee en de grens met België.
    [2.40, 51.00], [2.50, 50.97], [2.55, 50.85], [2.75, 50.72], [2.85, 50.66], [3.15, 50.65], [3.20, 50.58],
    [3.38, 50.45], [3.65, 50.35], [3.95, 50.25], [4.05, 50.15], [4.10, 50.05], [4.25, 49.97], [4.40, 49.93],
    [4.55, 49.90], [4.80, 49.80], [4.85, 49.75], [5.10, 49.67], [5.20, 49.60], [5.45, 49.50], [5.60, 49.47],
    // Luxemburg en Duitsland.
    [5.80, 49.48], [6.00, 49.43], [6.30, 49.43], [6.35, 49.38], [6.50, 49.30], [6.70, 49.20], [6.90, 49.14],
    [7.10, 49.07], [7.40, 49.02], [7.90, 48.99], [8.10, 48.92], [8.00, 48.78], [7.77, 48.58], [7.66, 48.38],
    [7.56, 48.18], [7.50, 47.95], [7.47, 47.75], [7.45, 47.60],
    // Zwitserland: de Jura, om Genève heen, langs het meer en naar de Mont Blanc.
    [7.15, 47.54], [6.95, 47.50], [6.88, 47.38], [6.85, 47.22], [6.60, 47.02], [6.36, 46.86], [6.33, 46.74],
    [6.13, 46.62], [6.06, 46.58], [6.02, 46.46], [6.04, 46.30], [5.92, 46.22], [5.95, 46.10], [6.10, 46.10],
    [6.22, 46.15], [6.30, 46.20], [6.33, 46.32], [6.45, 46.36], [6.75, 46.36], [6.80, 46.27], [6.75, 46.18],
    [6.82, 46.10], [6.90, 46.02], [6.93, 45.92], [6.85, 45.86], [6.80, 45.80], [6.74, 45.75],
    // Italië.
    [6.82, 45.65], [6.92, 45.55], [7.00, 45.42], [7.05, 45.32], [6.90, 45.20], [6.60, 45.12], [6.55, 45.00],
    [6.68, 44.92], [6.85, 44.80], [6.92, 44.75], [6.88, 44.60], [6.82, 44.42], [6.95, 44.25], [7.20, 44.15],
    [7.45, 44.08], [7.62, 44.05], [7.50, 43.85], [7.45, 43.80],
    // De Middellandse Zee.
    [7.20, 43.73], [6.95, 43.58], [6.60, 43.30], [6.20, 43.17], [5.90, 43.16], [5.55, 43.24], [5.42, 43.33],
    [5.20, 43.40], [4.80, 43.50], [4.30, 43.55], [3.90, 43.58], [3.45, 43.33], [3.10, 43.15], [3.00, 42.85],
    [2.98, 42.70], [3.00, 42.50],
    // Spanje en Andorra.
    [2.90, 42.50], [2.70, 42.48], [2.45, 42.43], [2.10, 42.47], [2.05, 42.52], [1.85, 42.58], [1.75, 42.70],
    [1.40, 42.76], [1.05, 42.85], [0.75, 42.92], [0.55, 42.78], [0.10, 42.76], [-0.05, 42.75], [-0.40, 42.85],
    [-0.58, 42.87], [-0.90, 42.98], [-1.25, 43.15], [-1.35, 43.25], [-1.50, 43.33], [-1.70, 43.38],
    // De Atlantische kust en Bretagne.
    [-1.50, 43.45], [-1.38, 43.70], [-1.25, 44.20], [-1.10, 44.62], [-1.10, 45.10], [-0.98, 45.70],
    [-1.05, 46.10], [-1.10, 46.32], [-1.70, 46.55], [-2.00, 46.85], [-2.05, 47.12], [-2.15, 47.32],
    [-2.50, 47.40], [-2.95, 47.65], [-3.35, 47.80], [-3.90, 47.93], [-4.25, 47.92], [-4.50, 48.05],
    [-4.20, 48.25], [-4.40, 48.45], [-4.68, 48.52], [-4.30, 48.62], [-3.95, 48.66], [-3.40, 48.75],
    [-3.00, 48.72], [-2.70, 48.47], [-2.30, 48.58], [-1.95, 48.58], [-1.55, 48.58],
    // Het Kanaal.
    [-1.50, 48.85], [-1.55, 49.30], [-1.80, 49.65], [-1.60, 49.60], [-1.30, 49.58], [-1.25, 49.38],
    [-0.80, 49.30], [0.05, 49.30], [0.35, 49.40], [0.35, 49.55], [0.30, 49.70], [1.05, 49.88], [1.50, 50.05],
    [1.65, 50.40], [1.68, 50.70], [1.90, 50.90],
  ],
];

// Een punt in een ring (lon, lat), met de straal naar het oosten.
export function inRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Alle punten in één en hetzelfde vlak: een route die van Zuid-Limburg naar Brabant loopt, gaat door
// België (de vlakken raken elkaar niet), en krijgt dus EOX.
function allInOne(points: { lat: number; lon: number }[], rings: Ring[]): boolean {
  return rings.some((ring) => points.every((p) => inRing(p.lon, p.lat, ring)));
}

// De rand om wat in beeld komt: ook de hoeken van het vak een kilometer verder moeten in het land liggen.
export const AERIAL_MARGIN_KM = 1;

function withMargin(points: { lat: number; lon: number }[]): { lat: number; lon: number }[] {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const p of points) {
    w = Math.min(w, p.lon); e = Math.max(e, p.lon);
    s = Math.min(s, p.lat); n = Math.max(n, p.lat);
  }
  const dLat = AERIAL_MARGIN_KM / 111.32;
  const dLon = AERIAL_MARGIN_KM / (111.32 * Math.max(0.1, Math.cos(((s + n) / 2) * (Math.PI / 180))));
  const corners = [
    { lat: s - dLat, lon: w - dLon }, { lat: s - dLat, lon: e + dLon },
    { lat: n + dLat, lon: w - dLon }, { lat: n + dLat, lon: e + dLon },
  ];
  return [...points, ...corners];
}

// De bron voor deze kaart. Zonder punten (nog niets om te tonen): de wereldlaag.
export function aerialSourceFor(points: { lat: number; lon: number }[]): AerialSource {
  const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  if (valid.length === 0) return AERIAL_SOURCES.eox;
  const all = withMargin(valid);
  if (allInOne(all, NL)) return AERIAL_SOURCES.pdok;
  if (allInOne(all, FR)) return AERIAL_SOURCES.ign;
  return AERIAL_SOURCES.eox;
}
