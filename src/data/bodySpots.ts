// ASCEND: de plekken op het figuur van Lichaam (docs/beslissingen/2026-10-24-lichaam-als-figuur.md).
// Pure gegevens, geen React. Elke plek is een spier of een gewricht dat je kunt
// aanwijzen, op de voorkant of de achterkant, met een middelpunt en een grootte op
// het vlak van 200 bij 440 (links en rechts zijn die van de persoon, niet van wie
// kijkt). Wat erbij hoort staat op de plek zelf: welke blessurenaam (data/bodyAreas.ts),
// welke rekoefeningen (data/stretches.ts) en welke zorg (data/bodyCare.ts).
// engine/bodyMap.ts zoekt er in.

export type BodyView = 'front' | 'back';
export type BodySide = 'links' | 'rechts';

export interface BodySpot {
  id: string;
  view: BodyView;
  // "Rechterknie".
  name: string;
  // De spier of het gewricht, in één regel.
  muscle: string;
  // Waar op het lichaam, voor onder de titel van de plek: "Voorkant, rond de knieschijf".
  where: string;
  side?: BodySide;
  // Middelpunt en halve breedte en hoogte op het vlak van 200 bij 440.
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  // Namen uit BODY_PART_OPTIONS (data/bodyAreas.ts). De eerste is de naam waaronder
  // een klacht van deze plek wordt opgeslagen; de andere horen er ook bij.
  injuryParts: string[];
  // Rekoefeningen: groepen uit PROBLEM_AREAS (data/stretches.ts) en losse oefeningen
  // met hun naam uit de andere lijsten van dat bestand.
  stretchAreaIds: string[];
  extraStretches?: string[];
  // De sleutel van de zorg in data/bodyCare.ts.
  care: string;
}

type Half = Omit<BodySpot, 'id' | 'name' | 'side' | 'cx'>;

// Een plek die links en rechts bestaat: de rechter staat links in beeld op de voorkant
// (dat is de rechterkant van de persoon), op de achterkant juist andersom.
function pair(id: string, view: BodyView, label: string, cxRight: number, half: Half): BodySpot[] {
  const mirror = 200 - cxRight;
  const rightX = view === 'front' ? cxRight : mirror;
  const leftX = view === 'front' ? mirror : cxRight;
  return [
    { ...half, id: `${id}-r`, name: `Rechter${label}`, side: 'rechts', cx: rightX },
    { ...half, id: `${id}-l`, name: `Linker${label}`, side: 'links', cx: leftX },
  ];
}

const FRONT: BodySpot[] = [
  {
    id: 'nek', view: 'front', name: 'Nek', muscle: 'Kopdraaiers en trapezius', where: 'Voorkant, de hals en de zijkant van de nek',
    cx: 100, cy: 56, rx: 9, ry: 7, injuryParts: ['Nek'], stretchAreaIds: ['nek'], care: 'nek',
  },
  ...pair('schouder', 'front', 'schouder', 62, {
    view: 'front', muscle: 'Deltaspier', where: 'Voorkant, rond het schoudergewricht',
    cy: 82, rx: 9, ry: 13, injuryParts: ['Schouder'], stretchAreaIds: ['schouders'], care: 'schouder',
  }),
  {
    id: 'borst', view: 'front', name: 'Borst', muscle: 'Grote borstspier', where: 'Voorkant, de borstspier',
    cx: 100, cy: 94, rx: 22, ry: 10, injuryParts: ['Borst'], stretchAreaIds: ['schouders'], extraStretches: ['Deurpost borststretch'], care: 'borst',
  },
  {
    id: 'buik', view: 'front', name: 'Buik en romp', muscle: 'Rechte en schuine buikspieren', where: 'Voorkant, buik en zijkant van de romp',
    cx: 100, cy: 150, rx: 13, ry: 30, injuryParts: ['Buik'], stretchAreaIds: ['onderrug'], extraStretches: ['Staande zijwaartse rek (side-bend)'], care: 'buik',
  },
  ...pair('pols', 'front', 'pols en onderarm', 47, {
    view: 'front', muscle: 'Onderarmbuigers en -strekkers', where: 'Voorkant, de onderarm tot de pols',
    cy: 186, rx: 6, ry: 18, injuryParts: ['Pols', 'Onderarm'], stretchAreaIds: ['polsen'], care: 'onderarm',
  }),
  ...pair('heup', 'front', 'heup en lies', 80, {
    view: 'front', muscle: 'Heupbuigers en liezen', where: 'Voorkant, de heup en de lies',
    cy: 212, rx: 10, ry: 8, injuryParts: ['Heup'], stretchAreaIds: ['heup'], extraStretches: ['Hip flexor-stretch (lunge-stretch)'], care: 'heup',
  }),
  ...pair('dij', 'front', 'dij', 83, {
    view: 'front', muscle: 'Quadriceps', where: 'Voorkant, het bovenbeen',
    cy: 258, rx: 11, ry: 26, injuryParts: ['Quadriceps'], stretchAreaIds: ['quadriceps'], care: 'dij',
  }),
  ...pair('knie', 'front', 'knie', 85, {
    view: 'front', muscle: 'Knieschijf en kniepees', where: 'Voorkant, rond de knieschijf',
    cy: 305, rx: 8, ry: 9, injuryParts: ['Knie'], stretchAreaIds: ['quadriceps', 'kuiten', 'heup'], care: 'knie',
  }),
  ...pair('scheen', 'front', 'scheen', 83, {
    view: 'front', muscle: 'Voorste scheenbeenspier', where: 'Voorkant, het onderbeen langs het scheenbeen',
    cy: 352, rx: 6, ry: 22, injuryParts: ['Scheen'], stretchAreaIds: ['kuiten'], care: 'scheen',
  }),
  ...pair('enkel', 'front', 'enkel en voet', 86, {
    view: 'front', muscle: 'Enkelbanden en voetboog', where: 'Voorkant, de enkel en de voet',
    cy: 404, rx: 10, ry: 8, injuryParts: ['Enkel', 'Voet'], stretchAreaIds: ['kuiten'], care: 'enkel',
  }),
];

const BACK: BodySpot[] = [
  {
    id: 'nek-a', view: 'back', name: 'Nek', muscle: 'Trapezius en nekstrekkers', where: 'Achterkant, de nek',
    cx: 100, cy: 58, rx: 9, ry: 7, injuryParts: ['Nek'], stretchAreaIds: ['nek'], care: 'nek',
  },
  {
    id: 'bovenrug', view: 'back', name: 'Schouders en bovenrug', muscle: 'Trapezius en schouderbladen', where: 'Achterkant, tussen en boven de schouderbladen',
    cx: 100, cy: 96, rx: 26, ry: 16, injuryParts: ['Bovenrug', 'Schouder'], stretchAreaIds: ['schouders'], care: 'bovenrug',
  },
  {
    id: 'onderrug', view: 'back', name: 'Onderrug', muscle: 'Rugstrekkers', where: 'Achterkant, onder de ribben tot het bekken',
    cx: 100, cy: 168, rx: 16, ry: 16, injuryParts: ['Onderrug'], stretchAreaIds: ['onderrug'], care: 'onderrug',
  },
  ...pair('bil', 'back', 'bil', 84, {
    view: 'back', muscle: 'Bilspieren en piriformis', where: 'Achterkant, de bil',
    cy: 216, rx: 13, ry: 13, injuryParts: ['Bil', 'Heup'], stretchAreaIds: ['bilspieren'], care: 'bil',
  }),
  ...pair('ham', 'back', 'hamstring', 84, {
    view: 'back', muscle: 'Hamstrings', where: 'Achterkant, het bovenbeen',
    cy: 268, rx: 10, ry: 24, injuryParts: ['Hamstring'], stretchAreaIds: ['hamstrings'], care: 'hamstring',
  }),
  ...pair('kuit', 'back', 'kuit', 84, {
    view: 'back', muscle: 'Kuitspieren', where: 'Achterkant, het onderbeen',
    cy: 336, rx: 10, ry: 20, injuryParts: ['Kuit'], stretchAreaIds: ['kuiten'], care: 'kuit',
  }),
  ...pair('achilles', 'back', 'achillespees', 87, {
    view: 'back', muscle: 'Achillespees', where: 'Achterkant, boven de hiel',
    cy: 390, rx: 4, ry: 10, injuryParts: ['Achillespees'], stretchAreaIds: ['kuiten'], care: 'achilles',
  }),
];

export const BODY_SPOTS: BodySpot[] = [...FRONT, ...BACK];

// Waar een oude link naar een groep rekoefeningen (/stretches/:areaId) nu heen gaat.
export const STRETCH_AREA_SPOT: Record<string, string> = {
  nek: 'nek',
  schouders: 'bovenrug',
  onderrug: 'onderrug',
  kuiten: 'kuit-r',
  heup: 'heup-r',
  bilspieren: 'bil-r',
  hamstrings: 'ham-r',
  quadriceps: 'dij-r',
  polsen: 'pols-r',
};
