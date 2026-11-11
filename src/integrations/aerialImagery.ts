// ASCEND: welke luchtfoto onder de kaart bij Route voorstellen ligt. Eén bron per kaart, gekozen op
// alles wat de kaart in beeld brengt (de lussen, het startpunt, je plek) met een rand eromheen:
// ligt dat helemaal in Nederland, dan PDOK; helemaal in Europees Frankrijk, dan IGN; anders de
// wereldlaag van EOX (Sentinel-2 cloudless 2016). Puur: geen netwerk, geen DOM.
//
// Waarom vlakken en geen rechthoeken: PDOK en IGN geven buiten hun land een witte tegel (getest op
// 11 november 2026: Antwerpen, Wallis, de zee voor Nice), en JPEG is niet doorzichtig. Een route die
// over de grens loopt zou dan half wit zijn. De vlakken hieronder komen uit echte grensdata met een vaste
// inzet en zijn met echte tegels nagemeten: twijfel geeft EOX, nooit een halve luchtfoto.
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

// De zin over waar de luchtfoto vandaan komt: in de eerste vraag, de uitleg en het zoeken van de instellingen.
export const PHOTO_SOURCES_LINE = 'Met Luchtfoto haalt de kaart tegels bij PDOK, IGN of EOX, afhankelijk van waar je loopt.';

// De hosts van de tegels, voor de runtime-cache in vite.config.ts.
export const AERIAL_HOSTS = ['service.pdok.nl', 'data.geopf.fr', 'tiles.maps.eox.at'] as const;
// De runtime-cache per host: alleen tegels die je zelf zag, hoogstens zoveel en zo lang. Nooit vooraf.
export const AERIAL_CACHE = { maxEntries: 300, maxAgeDays: 30 } as const;

type Ring = [number, number][];
// Een vlak: de buitenrand en daarna de gaten.
type Area = Ring[];

// De vlakken komen uit Natural Earth (1:10m, publiek domein), uitgerekend in een vlakke projectie
// (EPSG:3035) en daarna vereenvoudigd. Opnieuw maken en nameten: scripts/meten/luchtfoto/.
// Nederland: het land met een zoom van 1,5 km (het IJsselmeer, de oostelijke Waddenzee en een strook zee:
// de laag van 25 cm dekt water), minus 2,9 km rond België en Duitsland, vereenvoudigd binnen 400 m. Dus
// minstens 2,5 km van elke landsgrens. Het gat in het eerste vlak is de westelijke Waddenzee (tussen
// ongeveer 4,9 en 5,5 oost, 52,95 en 53,4 noord), die de zoom niet sluit: daar geeft het EOX. Zuid-Limburg
// is een eigen vlak.
const NL: Area[] = [
  [
    [
      [3.41, 51.402], [3.452, 51.422], [3.475, 51.459], [3.466, 51.491], [3.43, 51.526], [3.431, 51.555], [3.444, 51.566], [3.547, 51.605],
      [3.602, 51.614], [3.636, 51.628], [3.666, 51.662], [3.673, 51.734], [3.716, 51.752], [3.797, 51.768], [3.826, 51.788], [3.848, 51.826],
      [3.934, 51.852], [3.991, 51.878], [4.014, 51.914], [4.013, 51.933], [3.988, 51.979], [4.003, 52.0], [4.019, 52.008], [4.091, 52.007],
      [4.145, 52.029], [4.27, 52.124], [4.385, 52.228], [4.483, 52.337], [4.576, 52.514], [4.647, 52.798], [4.698, 52.893], [4.713, 52.977],
      [4.686, 53.027], [4.692, 53.058], [4.738, 53.114], [4.792, 53.148], [4.86, 53.228], [4.905, 53.263], [4.969, 53.299], [5.045, 53.326],
      [5.11, 53.342], [5.138, 53.361], [5.163, 53.395], [5.244, 53.419], [5.381, 53.433], [5.431, 53.449], [5.599, 53.469], [5.657, 53.485],
      [5.915, 53.487], [5.985, 53.468], [6.039, 53.467], [6.08, 53.476], [6.135, 53.506], [6.178, 53.518], [6.368, 53.533], [6.404, 53.548],
      [6.427, 53.567], [6.456, 53.571], [6.526, 53.553], [6.545, 53.503], [6.572, 53.483], [6.599, 53.473], [6.652, 53.467], [6.732, 53.474],
      [6.835, 53.464], [6.863, 53.456], [6.888, 53.439], [6.917, 53.373], [6.95, 53.347], [7.06, 53.313], [7.108, 53.311], [7.127, 53.285],
      [7.166, 53.265], [7.152, 53.249], [7.153, 53.19], [7.129, 53.14], [7.142, 53.101], [7.15, 53.001], [7.123, 52.944], [7.041, 52.866],
      [7.02, 52.83], [6.996, 52.658], [6.969, 52.663], [6.922, 52.659], [6.865, 52.668], [6.766, 52.667], [6.716, 52.657], [6.663, 52.63],
      [6.661, 52.582], [6.669, 52.568], [6.642, 52.56], [6.629, 52.543], [6.655, 52.467], [6.692, 52.439], [6.731, 52.428], [6.81, 52.421],
      [6.865, 52.409], [6.903, 52.406], [6.963, 52.412], [7.005, 52.363], [6.998, 52.336], [6.97, 52.288], [6.978, 52.243], [6.95, 52.231],
      [6.905, 52.194], [6.854, 52.178], [6.81, 52.138], [6.757, 52.134], [6.726, 52.124], [6.684, 52.089], [6.642, 52.073], [6.631, 52.05],
      [6.642, 52.019], [6.764, 51.972], [6.717, 51.929], [6.615, 51.922], [6.511, 51.9], [6.454, 51.874], [6.366, 51.885], [6.338, 51.867],
      [6.313, 51.87], [6.281, 51.89], [6.229, 51.89], [6.145, 51.92], [6.118, 51.922], [6.06, 51.902], [6.054, 51.876], [5.977, 51.853],
      [5.932, 51.847], [5.895, 51.829], [5.887, 51.8], [5.922, 51.772], [5.899, 51.749], [5.901, 51.721], [5.923, 51.708], [5.974, 51.701],
      [5.967, 51.681], [5.973, 51.667], [6.004, 51.643], [6.048, 51.63], [6.04, 51.607], [6.048, 51.585], [6.154, 51.498], [6.163, 51.458],
      [6.152, 51.419], [6.151, 51.395], [6.161, 51.382], [6.155, 51.356], [6.113, 51.333], [6.029, 51.245], [6.016, 51.216], [6.012, 51.189],
      [6.022, 51.162], [6.055, 51.143], [5.954, 51.094], [5.924, 51.065], [5.885, 51.078], [5.849, 51.071], [5.878, 51.087], [5.887, 51.103],
      [5.873, 51.123], [5.881, 51.144], [5.858, 51.175], [5.836, 51.182], [5.794, 51.181], [5.775, 51.197], [5.744, 51.208], [5.673, 51.205],
      [5.641, 51.221], [5.589, 51.231], [5.571, 51.276], [5.545, 51.296], [5.512, 51.31], [5.461, 51.313], [5.383, 51.285], [5.257, 51.286],
      [5.252, 51.306], [5.221, 51.33], [5.155, 51.334], [5.138, 51.364], [5.104, 51.388], [5.118, 51.418], [5.119, 51.448], [5.09, 51.48],
      [5.038, 51.502], [5.002, 51.5], [4.981, 51.492], [4.958, 51.458], [4.912, 51.42], [4.858, 51.432], [4.868, 51.461], [4.861, 51.487],
      [4.837, 51.506], [4.786, 51.521], [4.752, 51.521], [4.705, 51.506], [4.621, 51.444], [4.573, 51.448], [4.571, 51.479], [4.537, 51.501],
      [4.476, 51.5], [4.415, 51.486], [4.353, 51.464], [4.337, 51.449], [4.34, 51.402], [4.364, 51.378], [4.295, 51.395], [4.201, 51.391],
      [4.183, 51.377], [4.171, 51.343], [4.138, 51.315], [4.097, 51.294], [3.976, 51.256], [3.92, 51.232], [3.822, 51.231], [3.815, 51.263],
      [3.799, 51.276], [3.771, 51.287], [3.616, 51.316], [3.501, 51.306], [3.469, 51.288], [3.46, 51.263], [3.417, 51.268], [3.395, 51.293],
      [3.399, 51.34], [3.39, 51.381], [3.377, 51.395],
    ],
    [
      [4.935, 53.106], [4.887, 53.04], [4.883, 53.014], [4.892, 52.994], [4.917, 52.973], [4.955, 52.959], [4.998, 52.954], [5.05, 52.961],
      [5.296, 53.092], [5.337, 53.104], [5.368, 53.122], [5.428, 53.227], [5.501, 53.275], [5.517, 53.292], [5.522, 53.325], [5.502, 53.356],
      [5.469, 53.373], [5.438, 53.381], [5.363, 53.378], [5.173, 53.331], [5.147, 53.318], [5.117, 53.292], [5.041, 53.275], [4.975, 53.237],
      [4.926, 53.192], [4.92, 53.166],
    ],
  ],
  [
    [
      [5.817, 51.015], [5.832, 50.986], [5.834, 50.96], [5.846, 50.947], [5.875, 50.939], [5.931, 50.951], [5.955, 50.946], [5.967, 50.914],
      [6.013, 50.891], [6.02, 50.871], [5.977, 50.857], [5.961, 50.838], [5.96, 50.82], [5.93, 50.804], [5.934, 50.774], [5.807, 50.778],
      [5.781, 50.794], [5.741, 50.799], [5.726, 50.816], [5.665, 50.839], [5.719, 50.882], [5.748, 50.891], [5.771, 50.911], [5.804, 50.953],
      [5.803, 50.968], [5.791, 50.979],
    ],
  ],
];

// Europees Frankrijk zonder Corsica en zonder meren: 4,5 km van elke grens, kust en meeroever (IGN is wit op zee,
// op het Meer van Genève en over de grens),
// vereenvoudigd binnen 1,5 km. Dus minstens 3 km van elke grens en kust.
const FR: Area[] = [
  [
    [
      [-4.488, 48.056], [-4.243, 48.083], [-4.223, 48.169], [-4.255, 48.222], [-4.329, 48.255], [-4.164, 48.263], [-4.129, 48.319], [-4.209, 48.358],
      [-4.25, 48.401], [-4.233, 48.446], [-4.277, 48.471], [-4.617, 48.39], [-4.708, 48.401], [-4.695, 48.521], [-4.648, 48.541], [-4.555, 48.531],
      [-4.472, 48.59], [-4.358, 48.619], [-4.312, 48.601], [-4.176, 48.612], [-4.128, 48.659], [-4.064, 48.645], [-4.016, 48.66], [-3.988, 48.624],
      [-3.854, 48.589], [-3.791, 48.616], [-3.777, 48.677], [-3.567, 48.644], [-3.47, 48.728], [-3.488, 48.789], [-3.404, 48.766], [-3.288, 48.8],
      [-3.26, 48.763], [-3.187, 48.761], [-3.149, 48.723], [-3.061, 48.746], [-3.008, 48.734], [-2.882, 48.636], [-2.862, 48.574], [-2.689, 48.469],
      [-2.528, 48.558], [-2.382, 48.608], [-2.33, 48.581], [-2.279, 48.586], [-2.219, 48.542], [-2.149, 48.546], [-2.078, 48.583], [-2.032, 48.492],
      [-1.983, 48.473], [-1.879, 48.529], [-1.904, 48.602], [-1.957, 48.637], [-1.938, 48.651], [-1.876, 48.592], [-1.802, 48.576], [-1.321, 48.611],
      [-1.295, 48.645], [-1.323, 48.685], [-1.453, 48.725], [-1.501, 48.776], [-1.52, 48.851], [-1.482, 48.93], [-1.495, 48.988], [-1.447, 49.038],
      [-1.541, 49.107], [-1.508, 49.144], [-1.539, 49.179], [-1.494, 49.2], [-1.489, 49.237], [-1.597, 49.278], [-1.647, 49.378], [-1.754, 49.423],
      [-1.808, 49.532], [-1.788, 49.647], [-1.603, 49.61], [-1.485, 49.626], [-1.397, 49.672], [-1.315, 49.663], [-1.3, 49.639], [-1.359, 49.598],
      [-1.366, 49.546], [-1.237, 49.405], [-1.233, 49.333], [-1.131, 49.305], [-1.065, 49.317], [-1.041, 49.355], [-0.954, 49.352], [-0.832, 49.323],
      [-0.424, 49.302], [-0.211, 49.24], [0.039, 49.298], [0.188, 49.378], [0.44, 49.416], [0.55, 49.477], [0.524, 49.529], [0.34, 49.498],
      [0.152, 49.523], [0.23, 49.674], [0.626, 49.821], [1.202, 49.925], [1.436, 50.047], [1.552, 50.174], [1.652, 50.146], [1.728, 50.174],
      [1.718, 50.242], [1.606, 50.298], [1.611, 50.33], [1.673, 50.367], [1.627, 50.42], [1.674, 50.547], [1.627, 50.682], [1.669, 50.786],
      [1.651, 50.846], [1.766, 50.91], [1.929, 50.955], [2.48, 51.029], [2.541, 50.952], [2.513, 50.915], [2.529, 50.828], [2.75, 50.69],
      [2.904, 50.658], [2.989, 50.717], [3.098, 50.741], [3.172, 50.672], [3.221, 50.502], [3.344, 50.451], [3.445, 50.462], [3.571, 50.443],
      [3.602, 50.306], [3.658, 50.266], [3.722, 50.261], [3.797, 50.308], [3.891, 50.285], [3.99, 50.301], [4.046, 50.27], [4.095, 50.222],
      [4.066, 50.116], [4.135, 50.079], [4.066, 50.011], [4.102, 49.939], [4.19, 49.913], [4.487, 49.898], [4.701, 49.961], [4.741, 50.065],
      [4.774, 50.086], [4.721, 49.957], [4.797, 49.9], [4.772, 49.853], [4.796, 49.773], [4.849, 49.747], [4.956, 49.755], [5.137, 49.653],
      [5.233, 49.648], [5.241, 49.595], [5.28, 49.575], [5.353, 49.577], [5.429, 49.463], [5.486, 49.455], [5.756, 49.5], [5.95, 49.401],
      [6.085, 49.411], [6.194, 49.459], [6.307, 49.418], [6.398, 49.422], [6.457, 49.403], [6.503, 49.306], [6.701, 49.118], [6.841, 49.109],
      [6.908, 49.166], [7.02, 49.07], [7.103, 49.085], [7.277, 49.065], [7.393, 49.12], [7.482, 49.052], [7.61, 49.001], [7.913, 48.995],
      [8.104, 48.936], [8.045, 48.836], [7.926, 48.785], [7.903, 48.739], [7.756, 48.633], [7.744, 48.534], [7.679, 48.414], [7.689, 48.355],
      [7.521, 48.126], [7.516, 48.048], [7.56, 47.982], [7.501, 47.893], [7.452, 47.707], [7.516, 47.609], [7.368, 47.516], [7.358, 47.472],
      [7.25, 47.463], [7.219, 47.519], [7.11, 47.537], [7.001, 47.539], [6.928, 47.515], [6.919, 47.465], [6.807, 47.357], [6.839, 47.318],
      [6.913, 47.317], [6.893, 47.264], [6.645, 47.104], [6.621, 47.049], [6.393, 46.966], [6.368, 46.777], [6.068, 46.605], [6.07, 46.551],
      [6.005, 46.477], [5.996, 46.417], [6.074, 46.362], [6.037, 46.284], [5.923, 46.244], [5.897, 46.204], [5.925, 46.098], [6.124, 46.1],
      [6.331, 46.219], [6.332, 46.273], [6.296, 46.301], [6.324, 46.331], [6.392, 46.308], [6.534, 46.371], [6.708, 46.381], [6.695, 46.332],
      [6.761, 46.268], [6.718, 46.193], [6.72, 46.121], [6.791, 46.091], [6.807, 46.023], [6.891, 46.007], [6.952, 45.937], [6.917, 45.892],
      [6.751, 45.847], [6.725, 45.796], [6.741, 45.707], [6.778, 45.666], [6.9, 45.614], [6.934, 45.49], [7.09, 45.39], [7.037, 45.334],
      [7.037, 45.268], [6.929, 45.245], [6.82, 45.181], [6.736, 45.198], [6.645, 45.177], [6.573, 45.143], [6.546, 45.096], [6.606, 45.011],
      [6.671, 44.988], [6.673, 44.918], [6.704, 44.88], [6.828, 44.821], [6.947, 44.814], [6.963, 44.73], [6.894, 44.689], [6.88, 44.635],
      [6.779, 44.535], [6.831, 44.438], [6.818, 44.348], [6.928, 44.225], [7.318, 44.086], [7.595, 44.121], [7.63, 44.085], [7.584, 44.016],
      [7.429, 43.885], [7.436, 43.812], [7.354, 43.79], [7.298, 43.732], [7.118, 43.687], [7.071, 43.607], [6.953, 43.584], [6.902, 43.552],
      [6.87, 43.48], [6.694, 43.438], [6.67, 43.387], [6.546, 43.299], [6.54, 43.253], [6.585, 43.228], [6.383, 43.185], [6.325, 43.148],
      [6.244, 43.161], [6.126, 43.123], [6.063, 43.121], [5.948, 43.174], [5.835, 43.144], [5.672, 43.224], [5.594, 43.215], [5.542, 43.251],
      [5.418, 43.251], [5.387, 43.355], [5.31, 43.394], [5.222, 43.369], [5.07, 43.37], [5.209, 43.397], [5.282, 43.485], [5.254, 43.538],
      [5.167, 43.526], [5.139, 43.566], [5.044, 43.598], [4.97, 43.565], [4.954, 43.513], [4.98, 43.465], [4.915, 43.48], [4.814, 43.439],
      [4.772, 43.58], [4.714, 43.617], [4.658, 43.61], [4.64, 43.565], [4.712, 43.387], [4.639, 43.394], [4.624, 43.454], [4.529, 43.495],
      [4.2, 43.502], [4.177, 43.559], [4.117, 43.592], [3.933, 43.578], [3.711, 43.448], [3.587, 43.406], [3.486, 43.322], [3.378, 43.324],
      [3.287, 43.297], [3.067, 43.128], [2.984, 42.945], [2.992, 42.584], [3.043, 42.505], [2.915, 42.508], [2.769, 42.451], [2.689, 42.451],
      [2.591, 42.39], [2.502, 42.375], [2.451, 42.418], [2.278, 42.469], [2.119, 42.454], [2.015, 42.388], [2.004, 42.403], [2.054, 42.445],
      [2.012, 42.51], [1.95, 42.524], [1.898, 42.484], [1.779, 42.524], [1.819, 42.572], [1.748, 42.646], [1.624, 42.658], [1.55, 42.69],
      [1.436, 42.675], [1.362, 42.747], [1.172, 42.751], [1.111, 42.809], [0.735, 42.885], [0.612, 42.862], [0.583, 42.728], [0.426, 42.724],
      [0.357, 42.758], [0.285, 42.732], [0.167, 42.767], [-0.031, 42.726], [-0.103, 42.773], [-0.127, 42.827], [-0.201, 42.827], [-0.313, 42.883],
      [-0.441, 42.83], [-0.569, 42.839], [-0.686, 42.916], [-0.736, 42.983], [-0.955, 42.994], [-1.243, 43.084], [-1.232, 43.118], [-1.261, 43.146],
      [-1.366, 43.139], [-1.349, 43.251], [-1.405, 43.301], [-1.532, 43.324], [-1.598, 43.314], [-1.72, 43.352], [-1.637, 43.363], [-1.556, 43.415],
      [-1.424, 43.567], [-1.291, 44.013], [-1.198, 44.437], [-1.199, 44.545], [-1.157, 44.624], [-1.047, 44.621], [-0.989, 44.662], [-1.023, 44.744],
      [-1.11, 44.802], [-1.18, 44.818], [-1.083, 45.48], [-0.948, 45.415], [-0.819, 45.309], [-0.769, 45.119], [-0.728, 45.052], [-0.617, 44.974],
      [-0.61, 44.904], [-0.565, 44.86], [-0.487, 44.873], [-0.487, 44.958], [-0.437, 44.999], [-0.48, 45.059], [-0.602, 45.114], [-0.664, 45.371],
      [-0.724, 45.474], [-1.049, 45.693], [-0.968, 45.679], [-0.929, 45.719], [-1.074, 45.828], [-1.083, 45.859], [-1.019, 45.891], [-1.02, 45.986],
      [-0.991, 46.033], [-1.066, 46.148], [-1.127, 46.193], [-1.047, 46.26], [-1.06, 46.323], [-1.117, 46.363], [-1.236, 46.349], [-1.353, 46.393],
      [-1.406, 46.389], [-1.476, 46.455], [-1.567, 46.465], [-1.718, 46.523], [-1.864, 46.717], [-2.069, 46.847], [-2.071, 46.879], [-1.932, 47.039],
      [-1.973, 47.11], [-2.108, 47.158], [-2.11, 47.247], [-1.965, 47.241], [-1.783, 47.172], [-1.691, 47.179], [-1.674, 47.23], [-1.874, 47.329],
      [-2.003, 47.36], [-2.169, 47.351], [-2.288, 47.289], [-2.418, 47.359], [-2.338, 47.405], [-2.339, 47.442], [-2.387, 47.465], [-2.311, 47.488],
      [-2.327, 47.538], [-2.521, 47.569], [-2.565, 47.594], [-2.639, 47.582], [-2.628, 47.637], [-2.693, 47.682], [-2.883, 47.659], [-2.935, 47.698],
      [-2.986, 47.703], [-3.028, 47.682], [-3.031, 47.645], [-3.068, 47.628], [-3.109, 47.64], [-3.129, 47.654], [-3.053, 47.695], [-3.065, 47.751],
      [-3.122, 47.791], [-3.222, 47.782], [-3.265, 47.826], [-3.315, 47.821], [-3.437, 47.755], [-3.501, 47.816], [-3.713, 47.853], [-3.816, 47.843],
      [-3.933, 47.936], [-4.005, 47.942], [-4.048, 47.91], [-4.129, 47.964], [-4.237, 47.895], [-4.242, 47.843], [-4.284, 47.845], [-4.336, 47.956],
    ],
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

const inArea = (lon: number, lat: number, [outer, ...holes]: Area): boolean =>
  inRing(lon, lat, outer) && !holes.some((h) => inRing(lon, lat, h));

// Alle punten in één en hetzelfde vlak: een route die van Zuid-Limburg naar Brabant loopt, gaat door
// België (de vlakken raken elkaar niet), en krijgt dus EOX.
function allInOne(points: { lat: number; lon: number }[], areas: Area[]): boolean {
  return areas.some((area) => points.every((p) => inArea(p.lon, p.lat, area)));
}

// Liggen deze punten (zonder rand) allemaal in één vlak van Nederland of Frankrijk? Voor de tests.
export const insideCountry = (country: 'pdok' | 'ign', points: { lat: number; lon: number }[]): boolean =>
  allInOne(points, country === 'pdok' ? NL : FR);

// De rand om wat in beeld komt: de hoeken van het vak, zoveel verder, moeten ook in het land liggen. Een
// kilometer, en bij een grotere route een kwart van de langste zijde: Alles in beeld laat naast een lange
// smalle route meer zien. Een grens: op een brede telefoon kan aan de korte kant nog meer in beeld komen.
export const AERIAL_MARGIN_KM = 1;
export const AERIAL_MARGIN_SHARE = 0.25;
// Om de hoeveel kilometer de zijden van het vak getoetst worden.
export const AERIAL_EDGE_STEP_KM = 1;

function boxOf(points: { lat: number; lon: number }[]) {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const p of points) {
    w = Math.min(w, p.lon); e = Math.max(e, p.lon);
    s = Math.min(s, p.lat); n = Math.max(n, p.lat);
  }
  const kmLon = 111.32 * Math.max(0.1, Math.cos(((s + n) / 2) * (Math.PI / 180)));
  return { w, s, e, n, kmLon };
}

// Hoe ver de rand reikt: een kilometer, of een kwart van de langste zijde als dat meer is.
export function aerialMarginKm(points: { lat: number; lon: number }[]): number {
  const { w, s, e, n, kmLon } = boxOf(points);
  return Math.max(AERIAL_MARGIN_KM, Math.max((n - s) * 111.32, (e - w) * kmLon) * AERIAL_MARGIN_SHARE);
}

function withMargin(points: { lat: number; lon: number }[]): { lat: number; lon: number }[] {
  const { w, s, e, n, kmLon } = boxOf(points);
  const km = aerialMarginKm(points);
  const dLat = km / 111.32;
  const dLon = km / kmLon;
  // Een vlak is niet bol: vier hoeken in het land zeggen niets over de zijden ertussen. Daarom ook elke
  // kilometer langs de vier zijden van het vak.
  const S = s - dLat, N = n + dLat, W = w - dLon, E = e + dLon;
  const steps = (km: number) => Math.max(1, Math.ceil(km / AERIAL_EDGE_STEP_KM));
  const nLon = steps((E - W) * kmLon);
  const nLat = steps((N - S) * 111.32);
  const edge: { lat: number; lon: number }[] = [];
  for (let i = 0; i <= nLon; i++) {
    const lon = W + ((E - W) * i) / nLon;
    edge.push({ lat: S, lon }, { lat: N, lon });
  }
  for (let i = 1; i < nLat; i++) {
    const lat = S + ((N - S) * i) / nLat;
    edge.push({ lat, lon: W }, { lat, lon: E });
  }
  return [...points, ...edge];
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
