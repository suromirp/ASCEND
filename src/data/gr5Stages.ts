// ASCEND — de 36 officiële etappes van de Grande Traversée des Alpes (GR5),
// van het Meer van Genève naar Nice, als vaste data in de bundel zodat het
// etappeplan ook zonder bereik werkt.
//
// Herkomst: de vier tronçon-pagina's van grande-traversee-alpes.com, op
// 22 oktober 2026 overgenomen uit de samenvattingslijst bovenaan elke pagina
// ("12 km / 5h30 / + 1701 m / - 573 m") en gecontroleerd tegen de uitgewerkte
// etappes eronder. Waar de site zichzelf tegenspreekt, staat de
// samenvattingslijst in de velden en het verschil in `alt`. Een waarde die de
// site niet geeft staat als `null` (onbekend), nooit als gok.
//
// De site wijzigt de route af en toe (bij etappe 5 van het tweede stuk ligt
// nu een omleiding naar Peisey). Controleer de GPX voor vertrek en
// vernieuw deze lijst jaarlijks.
//
// Water en winkel staan er alleen bij waar de officiële tekst of het rapport
// (docs/visie/GR5-reis en coaching.md, 2b) er iets over zegt. De officiële
// pagina's geven daar per etappe verder niets over.

import type { BivouacAreaId } from './gr5Bivouac';

export const STAGES_SOURCE = 'grande-traversee-alpes.com';
export const STAGES_SOURCE_URL = 'https://www.grande-traversee-alpes.com/en/litineraire-par-troncons/';
export const STAGES_TAKEN_ON = '2026-10-22';

export type SectionId = 1 | 2 | 3 | 4;

export interface Gr5Section {
  id: SectionId;
  name: string;
  // Aantal etappes volgens de site.
  count: number;
  url: string;
}

export const GR5_SECTIONS: Gr5Section[] = [
  { id: 1, name: 'Léman naar Mont-Blanc', count: 7, url: 'https://www.grande-traversee-alpes.com/gr5-du-leman-au-mont-blanc/' },
  { id: 2, name: 'Mont-Blanc naar Maurienne', count: 10, url: 'https://www.grande-traversee-alpes.com/gr5-troncon-2-du-mont-blanc-maurienne/' },
  { id: 3, name: 'Maurienne naar Haute-Ubaye', count: 10, url: 'https://www.grande-traversee-alpes.com/gr5-troncon-3-de-la-maurienne-a-lubaye/' },
  { id: 4, name: 'Haute-Ubaye naar Nice', count: 9, url: 'https://www.grande-traversee-alpes.com/gr5-troncon-4-ubaye-mediterranee/' },
];

// Een feit met zijn bron: 'gta' is de officiële site, 'rapport' het
// onderzoek in docs/visie/GR5-reis en coaching.md (met de bronnen daarin).
export interface StageFact {
  text: string;
  source: 'gta' | 'rapport';
}

export interface Gr5Stage {
  // "t2e6": stuk 2, etappe 6.
  id: string;
  section: SectionId;
  // Nummer binnen het stuk, zoals de site telt.
  number: number;
  // 1 tot en met 36.
  overall: number;
  from: string;
  to: string;
  // null = de site geeft deze waarde niet.
  km: number | null;
  up: number | null;
  down: number | null;
  minutes: number | null;
  // Waar de site zichzelf tegenspreekt, de andere waarden.
  alt?: { label: string; km?: number; up?: number; down?: number; minutes?: number };
  // Een pas boven 2.400 m (naam en hoogte uit de officiële etappetekst):
  // een dag om vroeg te vertrekken.
  highPass?: { name: string; m: number };
  // Gebieden waar de bivakregels van gelden (data/gr5Bivouac.ts).
  bivouac: BivouacAreaId[];
  water?: StageFact;
  shop?: StageFact;
  // Wat de officiële tekst bij de etappe zegt over omleidingen en varianten.
  notes: StageFact[];
  gpx: string;
}

const GPX = (section: number, n: number) => `https://www.grande-traversee-alpes.com/wp-content/uploads/2026/02/GTA_troncon${section}_etape${n}.gpx`;
const t = (h: number, m = 0) => h * 60 + m;

// Water per stuk, uit het rapport: in het noorden is water ruim, in het
// zuiden liggen bronnen soms uren uit elkaar (Townsend; randonner-leger.org).
const WATER_NORTH: StageFact = { text: 'In het noorden is water ruim.', source: 'rapport' };
const WATER_SOUTH: StageFact = {
  text: 'In het zuiden liggen bronnen soms uren uit elkaar en staan ze in een droge zomer vaak droog. Vul laat in de middag en draag water mee voor het laatste uur naar een droge kampplek. Op alpenweiden met vee altijd filteren.',
  source: 'rapport',
};
const SHOP_CHAMONIX: StageFact = { text: 'Les Houches en Chamonix zijn grote plaatsen vlak bij de route. Koop daar gas.', source: 'rapport' };
const SHOP_MODANE: StageFact = { text: 'Modane is een grote plaats op de route. Koop daar gas.', source: 'rapport' };
const SHOP_BRIANCON: StageFact = { text: 'Briançon is een grote plaats op de route. Koop daar gas.', source: 'rapport' };

type StageInput = Omit<Gr5Stage, 'overall' | 'gpx' | 'id'>;

function build(inputs: StageInput[]): Gr5Stage[] {
  return inputs.map((s, i) => ({ ...s, id: `t${s.section}e${s.number}`, overall: i + 1, gpx: GPX(s.section, s.number) }));
}

export const GR5_STAGES: Gr5Stage[] = build([
  // --- 1. Léman naar Mont-Blanc ---------------------------------------------
  { section: 1, number: 1, from: 'Saint-Gingolph', to: 'chalets de Bise', km: 12, up: 1701, down: 573, minutes: t(5, 30), bivouac: [], water: WATER_NORTH, notes: [] },
  { section: 1, number: 2, from: 'chalets de Bise', to: 'refuge de Trébentaz', km: 12.8, up: 1171, down: 810, minutes: t(6, 10), bivouac: [], water: WATER_NORTH, notes: [] },
  { section: 1, number: 3, from: 'refuge de Trébentaz', to: 'refuge de Chésery', km: 13.5, up: 609, down: 495, minutes: t(4, 34), bivouac: ['zwitserland'], water: WATER_NORTH, notes: [{ text: 'Het refuge de Chésery ligt in het Zwitserse Chablais, aan het Lac Vert.', source: 'gta' }] },
  { section: 1, number: 4, from: 'refuge de Chésery', to: 'refuge de la Golèse', km: 15.1, up: 652, down: 964, minutes: t(5, 20), bivouac: ['zwitserland'], water: WATER_NORTH, notes: [{ text: 'De etappe loopt tussen Zwitserland en Frankrijk, van het Lac Vert naar de col de Coux (1.920 m).', source: 'gta' }] },
  { section: 1, number: 5, from: 'refuge de la Golèse', to: 'gîte de Salvagny', km: 15.1, up: 299, down: 1119, minutes: t(4, 42), bivouac: [], water: WATER_NORTH, notes: [{ text: 'Eerst een lange afdaling van ongeveer 950 m naar het dorp Samoëns. Het gîte de Salvagny ligt bij het Cirque du Fer-à-Cheval.', source: 'gta' }] },
  { section: 1, number: 6, from: 'hameau de Salvagny', to: 'refuge de Moëde Anterne', km: 14.8, up: 1587, down: 422, minutes: t(6), bivouac: ['sixt-passy'], water: WATER_NORTH, notes: [{ text: 'De alpage d\'Anterne ligt in het hart van het reservaat Sixt-Passy.', source: 'gta' }] },
  { section: 1, number: 7, from: 'refuge de Moëde Anterne', to: 'Chamonix-Les Houches', km: 18.2, up: 1082, down: 2069, minutes: t(7, 13), bivouac: ['sixt-passy', 'aiguilles-rouges'], water: WATER_NORTH, shop: SHOP_CHAMONIX, notes: [{ text: 'Over het Brévent (2.368 m), aan het zuidelijke eind van de Aiguilles Rouges.', source: 'gta' }] },

  // --- 2. Mont-Blanc naar Maurienne ------------------------------------------
  { section: 2, number: 1, from: 'Chamonix-Les Houches', to: 'refuge du Fioux', km: 7, up: 695, down: 168, minutes: t(3, 5), bivouac: [], water: WATER_NORTH, shop: SHOP_CHAMONIX, notes: [{ text: 'Een alpiener alternatief loopt via de col du Tricot.', source: 'gta' }] },
  { section: 2, number: 2, from: 'refuge du Fioux', to: 'refuge de Nant-Borrant', km: 15.4, up: 663, down: 713, minutes: t(5, 20), bivouac: ['contamines'], water: WATER_NORTH, notes: [{ text: 'Je loopt door het reservaat Contamines-Montjoie.', source: 'gta' }] },
  {
    section: 2, number: 3, from: 'refuge de Nant-Borrant', to: 'refuge du Plan de la Lai (ook Plan-Mya)', km: 14.8, up: 1135, down: 779, minutes: t(5, 41),
    alt: { label: 'De uitgewerkte etappe op de site noemt andere waarden', km: 14.5, up: 609, down: 495, minutes: t(4, 40) },
    highPass: { name: 'col de la Croix du Bonhomme', m: 2412 },
    bivouac: ['contamines'], water: WATER_NORTH,
    notes: [
      { text: 'Drie cols: Bonhomme (2.329 m), Croix du Bonhomme (2.412 m) en de Sauce (2.307 m).', source: 'gta' },
      { text: 'Onderweg passeer je het refuge de la Balme in Haute-Savoie.', source: 'gta' },
    ],
  },
  { section: 2, number: 4, from: 'refuge du Plan de la Lai (ook Plan-Mya)', to: 'refuge de la Balme (Tarentaise)', km: 12.8, up: 991, down: 807, minutes: t(5, 4), highPass: { name: 'col du Bresson', m: 2469 }, bivouac: [], water: WATER_NORTH, notes: [{ text: 'Niet te verwarren met het refuge de la Balme in Haute-Savoie, bij Les Contamines.', source: 'gta' }] },
  {
    section: 2, number: 5, from: 'refuge de la Balme (Tarentaise)', to: 'Peisey-Nancroix', km: 22.2, up: 825, down: 1398, minutes: t(7, 40), bivouac: ['vanoise'], water: WATER_NORTH,
    notes: [
      { text: 'Het oude GR5-pad naar Peisey is niet meer begaanbaar. Een omleiding brengt je vanaf Bellentre naar het dorp.', source: 'gta' },
      { text: 'In Peisey-Nancroix kun je terecht in camping Les Lanchettes en refuge de Rosuel.', source: 'gta' },
      { text: 'Na de Isère begint het nationaal park Vanoise.', source: 'gta' },
    ],
  },
  { section: 2, number: 6, from: 'Peisey-Nancroix', to: 'refuge du col du Palet', km: 14.7, up: 1297, down: null, minutes: t(5, 29), bivouac: ['vanoise'], water: WATER_NORTH, notes: [{ text: 'De site geeft geen waarde voor het dalen (de lijst zegt 0). Onbekend.', source: 'gta' }, { text: 'Je gaat het kerngebied van het park in. Het refuge ligt vlak onder de col du Palet (2.652 m).', source: 'gta' }] },
  { section: 2, number: 7, from: 'refuge du col du Palet', to: 'refuge de la Leisse', km: 20.5, up: 847, down: 957, minutes: t(6, 40), highPass: { name: 'col du Palet', m: 2652 }, bivouac: ['vanoise'], water: WATER_NORTH, notes: [{ text: 'Via het meer van Tignes naar de col de la Leisse.', source: 'gta' }] },
  {
    section: 2, number: 8, from: 'refuge de la Leisse', to: 'refuge de l\'Arpont', km: 18.5, up: 675, down: 855, minutes: t(6, 10),
    alt: { label: 'De uitgewerkte etappe op de site noemt 8,5 km', km: 8.5 },
    bivouac: ['vanoise'], water: WATER_NORTH,
    notes: [{ text: 'De site geeft twee afstanden. De lijst zegt 18,5 km, de uitgewerkte etappe 8,5 km bij dezelfde tijd. Bekijk de GPX.', source: 'gta' }],
  },
  { section: 2, number: 9, from: 'refuge de l\'Arpont', to: 'refuge de Plan Sec', km: 16, up: 801, down: 784, minutes: t(6, 20), bivouac: ['vanoise'], water: WATER_NORTH, notes: [{ text: 'Een balkonpad aan de voet van de Dent Parrachée, met één kort blootgesteld stuk. Bij de meren liggen het refuge de Plan Sec en het Chalet Montana.', source: 'gta' }] },
  { section: 2, number: 10, from: 'refuge de Plan Sec', to: 'Modane', km: 16.2, up: 412, down: 1656, minutes: t(5, 51), bivouac: ['vanoise'], water: WATER_NORTH, shop: SHOP_MODANE, notes: [{ text: 'Hier verlaat je het nationaal park Vanoise. Je daalt naar Modane in de Maurienne.', source: 'gta' }] },

  // --- 3. Maurienne naar Haute-Ubaye -----------------------------------------
  {
    section: 3, number: 1, from: 'Modane', to: 'refuge du Thabor', km: 15.8, up: 1422, down: null, minutes: t(6, 5), highPass: { name: 'col de la Vallée Étroite', m: 2434 }, bivouac: [], shop: SHOP_MODANE,
    notes: [
      { text: 'De site geeft "-0" voor het dalen. Dat is onbekend, geen nul.', source: 'gta' },
      { text: 'Het refuge du Thabor ligt 20 minuten lopen west van het GR5-pad.', source: 'gta' },
    ],
  },
  { section: 3, number: 2, from: 'refuge du Thabor', to: 'Plampinet', km: 22.6, up: 624, down: 1633, minutes: t(7, 38), highPass: { name: 'col de la Vallée Étroite', m: 2434 }, bivouac: [], notes: [{ text: 'Overgang van de Noordelijke naar de Zuidelijke Alpen, via de Vallée Étroite naar de vallei van Névache.', source: 'gta' }] },
  { section: 3, number: 3, from: 'Plampinet', to: 'Montgenèvre', km: 16.4, up: 1073, down: 693, minutes: t(5, 54), highPass: { name: 'col de la Lauze', m: 2529 }, bivouac: [], shop: { text: 'In Montgenèvre kun je je bevoorraden.', source: 'gta' }, notes: [{ text: 'Over de cols de Dormillouse (2.444 m) en de la Lauze (2.529 m).', source: 'gta' }] },
  { section: 3, number: 4, from: 'Montgenèvre', to: 'Briançon', km: 8.9, up: 162, down: 684, minutes: t(2, 50), bivouac: [], shop: SHOP_BRIANCON, notes: [{ text: 'Een korte overgangsetappe langs de Durance naar de Vauban-vestingstad.', source: 'gta' }] },
  { section: 3, number: 5, from: 'Briançon', to: 'Brunissard', km: 21.2, up: 1426, down: 974, minutes: t(7, 50), highPass: { name: 'col des Ayes', m: 2447 }, bivouac: ['queyras'], shop: SHOP_BRIANCON, notes: [{ text: 'Over de col des Ayes. De site noemt 2.447 m en 2.477 m. Daarna begint het regionaal natuurpark Queyras.', source: 'gta' }] },
  { section: 3, number: 6, from: 'Brunissard', to: 'Château-Queyras', km: 8.9, up: 289, down: 669, minutes: t(3, 6), bivouac: ['queyras'], shop: { text: 'In Château-Queyras kun je je bevoorraden, voor je het hart van het park in gaat.', source: 'gta' }, notes: [{ text: 'Volgens de site maken zeer goede lopers hier één dag van met de vorige of de volgende etappe.', source: 'gta' }] },
  { section: 3, number: 7, from: 'Château-Queyras', to: 'Ceillac', km: 13.5, up: 958, down: 698, minutes: t(5, 15), bivouac: ['queyras'], notes: [{ text: 'Over de col Fromage (2.300 m) naar Ceillac.', source: 'gta' }] },
  { section: 3, number: 8, from: 'Ceillac', to: 'Maljasset', km: 13.6, up: 1055, down: 814, minutes: t(5, 22), highPass: { name: 'col Girardin', m: 2699 }, bivouac: ['queyras'], notes: [{ text: 'De col Girardin (2.699 m) is het hoogste punt van de route. Hij kan laat in het seizoen sneeuw hebben. Dan ga je onder de Tête de Girardin door en loop je over de kam terug naar de col.', source: 'gta' }] },
  { section: 3, number: 9, from: 'Maljasset', to: 'Fouillouse', km: 10.5, up: 383, down: 352, minutes: t(3, 25), bivouac: [], notes: [{ text: 'Een nieuwe oversteek van de Ubaye voorkomt dat je langs de asfaltweg loopt.', source: 'gta' }] },
  { section: 3, number: 10, from: 'Fouillouse', to: 'Larche', km: 13.3, up: 814, down: 1035, minutes: t(4, 52), bivouac: [], notes: [{ text: 'Larche ligt aan de poort van het nationaal park Mercantour.', source: 'gta' }] },

  // --- 4. Haute-Ubaye naar Nice ----------------------------------------------
  { section: 4, number: 1, from: 'Larche', to: 'Bousiéyas', km: 20.3, up: 1233, down: 1011, minutes: t(7, 25), highPass: { name: 'Pas de la Cavale', m: 2671 }, bivouac: ['mercantour'], water: WATER_SOUTH, notes: [{ text: 'Deze etappe voert het nationaal park Mercantour in.', source: 'gta' }] },
  { section: 4, number: 2, from: 'Bousiéyas', to: 'Saint-Étienne-de-Tinée', km: 16.8, up: 661, down: 1369, minutes: t(6, 5), bivouac: ['mercantour'], water: WATER_SOUTH, notes: [{ text: 'In Saint-Dalmas-le-Selvage kun je lunchen in een restaurant.', source: 'gta' }] },
  {
    section: 4, number: 3, from: 'Saint-Étienne-de-Tinée', to: 'Roya', km: 13.8, up: 1023, down: 672, minutes: t(5, 17),
    alt: { label: 'De uitgewerkte etappe op de site noemt andere waarden', km: 16.4, up: 1073, down: 693, minutes: t(5, 54) },
    bivouac: ['mercantour'], water: WATER_SOUTH,
    notes: [{ text: 'Roya is een afgelegen gehucht. Het gîte d\'étape is de oude school.', source: 'gta' }],
  },
  { section: 4, number: 4, from: 'Roya', to: 'refuge de Longon', km: 19.2, up: 1322, down: 941, minutes: t(7), highPass: { name: 'col de la Croussette', m: 2480 }, bivouac: ['mercantour'], water: WATER_SOUTH, notes: [] },
  { section: 4, number: 5, from: 'refuge de Longon', to: 'Saint-Sauveur-sur-Tinée', km: 12.3, up: 47, down: 1445, minutes: t(4, 21), bivouac: ['mercantour'], water: { text: 'In Saint-Sauveur-sur-Tinée staan fonteinen die wandelaars waarderen, in een drogere streek. Vul daar je flessen.', source: 'gta' }, notes: [{ text: 'Een bus brengt je van Saint-Sauveur-sur-Tinée naar Saint-Dalmas-Valdeblore.', source: 'gta' }] },
  { section: 4, number: 6, from: 'Saint-Sauveur-sur-Tinée', to: 'Saint-Dalmas-Valdeblore', km: 12.3, up: 1077, down: 282, minutes: t(4, 51), bivouac: [], water: WATER_SOUTH, notes: [{ text: 'Hier verlaat je het Mercantour definitief en kom je in het achterland van Nice.', source: 'gta' }] },
  {
    section: 4, number: 7, from: 'Saint-Dalmas-Valdeblore', to: 'Utelle', km: 25.1, up: 1013, down: 1499, minutes: t(9, 30), bivouac: [], water: WATER_SOUTH,
    notes: [
      { text: 'De lange dag van de route. De hoofdroute volgt de kam tussen Tinée en Vésubie.', source: 'gta' },
      { text: 'Vanaf hier kun je kiezen voor de alpiener GR52 door de Vallée des Merveilles, die eindigt in Menton.', source: 'gta' },
      { text: 'In de Vallée des Merveilles mag bivak alleen op de plekken bij de refuges des Merveilles en Fontanalba.', source: 'rapport' },
    ],
  },
  { section: 4, number: 8, from: 'Utelle', to: 'Levens', km: 12.2, up: 727, down: 968, minutes: t(5), bivouac: [], water: WATER_SOUTH, notes: [] },
  {
    section: 4, number: 9, from: 'Levens', to: 'Nice', km: 24.5, up: 644, down: 1195, minutes: t(7, 30), bivouac: [], water: WATER_SOUTH,
    notes: [
      { text: 'De lijst noemt 644 m omhoog en 1.195 m omlaag, de etappetekst "800 m D+/D-". Bekijk de GPX.', source: 'gta' },
      { text: 'Het officiële eindpunt is de Maison de l\'environnement in Nice, 31 avenue Castellane.', source: 'gta' },
    ],
  },
]);

export function stagesOfSection(section: SectionId): Gr5Stage[] {
  return GR5_STAGES.filter((s) => s.section === section);
}

// Het deel van het rapport dat bij de pas hoort: onweer komt in de zomer
// vooral laat op de middag, dus vroeg vertrekken en de hoge col voor de
// middag over zijn (partir.com, via het rapport). De drempel van 2.400 m is
// die van de app, niet van de bron.
export const HIGH_PASS_THRESHOLD_M = 2400;
export const EARLY_START_NOTE = 'Hoge pas: vertrek vroeg en wees er voor de middag over. Onweer komt in de zomer vooral laat op de middag.';
