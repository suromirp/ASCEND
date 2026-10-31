// ASCEND: de sporten als gegevens. Eén bron voor wat een sport heet, welk
// pictogram en welke kleur erbij horen, welke kenmerken hij heeft en welke
// intervals.icu-types erbij horen. De lijsten elders (engine/sports.ts, de
// instellingen, de import, het logboek) zijn hiervan afgeleid.
//
// Dit bestand importeert niets uit engine/ of models/, zodat iedereen het kan lezen
// zonder kringverwijzing. Een nieuwe sport komt hier bij (ronde 4). Zwemmen, padel en voetbal
// staan in COUNTED_SPORTS (docs/visie/Sporten die meetellen.md, stap 2): sporten die ASCEND niet
// plant maar die later mee kunnen tellen. Ze horen nog niet bij SPORT_IDS, zodat de instellingen,
// de import en de planning er niets van merken tot er een keuze voor is. Yoga staat er bewust niet in.

import type { PictogramName } from '../components/pictograms';

// 0 = geen, 1 = laag, 2 = middel, 3 = hoog.
export type TraitLevel = 0 | 1 | 2 | 3;

// De vijf kenmerken. AFGELEID uit docs/onderzoek (wetenschap, deel 2) en niet
// getoetst: het zijn startwaarden die de gebruiker en de ijking later bijsturen.
export interface SportTraits {
  impact: TraitLevel; // grondreactiekracht per stap, springen, landen
  eccentric: TraitLevel; // remmen, afdalen: spierschade
  stopStart: TraitLevel; // richtingsveranderingen en sprints
  upperBody: TraitLevel;
  technique: TraitLevel;
}

// Wat een gebruiker met een sport kan doen: 'plan' (ASCEND plant hem), 'fixed' (een vaste
// afspraak in de week), 'count' (alleen meetellen), 'off' (niets mee).
export type SportRole = 'plan' | 'fixed' | 'count' | 'off';

export interface SportDefinition {
  id: string;
  label: string;
  // Het werkwoord in lopende tekst ("hardlopen") en de naam als discipline in een doel.
  verb: string;
  disciplineLabel: string;
  pictogram: PictogramName | undefined; // undefined = bewust geen eigen pictogram
  colorToken: string; // var(--color-sport-...)
  traits: SportTraits;
  typicalIntensity: 'low' | 'moderate' | 'high';
  plannable: boolean; // kan ASCEND hem plannen
  roles: readonly SportRole[];
  // Welke intervals.icu-types bij deze sport horen.
  externalKinds: readonly string[];
  // Een eigen belastingsprofiel als de omrekening uit de kenmerken niet klopt
  // (engine/sportStress.ts#stressProfileOf). Fietsen: de benen werken, zonder impact.
  stressOverride?: Partial<SportStress>;
}

// Het belastingsprofiel zoals models/prescription.ts#SessionStressProfile het kent, hier zonder import
// zodat dit bestand niets uit models/ leest.
type Load = 'none' | 'light' | 'moderate' | 'heavy';
export interface SportStress {
  lowerBodyLoad: Load;
  impact: Load;
  eccentricLoad: Load;
  intensity: 'low' | 'moderate' | 'high';
  upperBodyLoad?: Load;
  cardioLoad?: Load;
}

export const SPORTS = [
  {
    id: 'running',
    label: 'Hardlopen',
    verb: 'hardlopen',
    disciplineLabel: 'Hardlopen',
    pictogram: 'lopen',
    colorToken: 'var(--color-sport-run)',
    traits: { impact: 3, eccentric: 2, stopStart: 0, upperBody: 0, technique: 1 },
    typicalIntensity: 'low',
    plannable: true,
    roles: ['plan', 'fixed', 'count', 'off'],
    externalKinds: ['Run', 'TrailRun', 'VirtualRun'],
  },
  {
    id: 'hiking',
    label: 'Wandelen',
    verb: 'wandelen',
    disciplineLabel: 'Wandelen / hiken',
    pictogram: 'wandelen',
    colorToken: 'var(--color-sport-walk)',
    traits: { impact: 1, eccentric: 1, stopStart: 0, upperBody: 0, technique: 0 },
    typicalIntensity: 'moderate',
    plannable: true,
    roles: ['plan', 'fixed', 'count', 'off'],
    externalKinds: ['Hike', 'Walk'],
  },
  {
    id: 'cycling',
    label: 'Fietsen',
    verb: 'fietsen',
    disciplineLabel: 'Fietsen',
    pictogram: 'fietsen',
    colorToken: 'var(--color-sport-stretch)',
    traits: { impact: 0, eccentric: 0, stopStart: 0, upperBody: 0, technique: 1 },
    typicalIntensity: 'moderate',
    plannable: true,
    roles: ['plan', 'fixed', 'count', 'off'],
    externalKinds: ['Ride', 'GravelRide', 'MountainBikeRide', 'EBikeRide', 'EMountainBikeRide', 'Cyclocross', 'TrackRide', 'VirtualRide', 'Velomobile'],
    // Het profiel van de fietstocht (data/defaultProgram.ts, tpl_bike), zodat de beenindex voor wie nu fietst gelijk blijft.
    stressOverride: { lowerBodyLoad: 'moderate', impact: 'none', eccentricLoad: 'none', upperBodyLoad: 'none' },
  },
] as const satisfies readonly SportDefinition[];

// Sporten die meetellen maar die ASCEND niet plant (docs/visie/Sporten die meetellen.md, 3.2). De
// kenmerken zijn AFGELEID uit het onderzoek en niet getoetst (impact, remmen, stop en start,
// bovenlichaam, techniek): startwaarden, bij te stellen met je eigen logs. Nog geen pictogram in
// stijl C: dan toont de app niets, nooit een emoji. De kleur is de rustige salie: geen eigen sportkleur zolang ze niet gepland worden. De typenamen van intervals.icu worden gecontroleerd
// zodra het importeren aan gaat; Tennis hoort bewust niet bij padel.
export const COUNTED_SPORTS = [
  {
    id: 'swimming',
    label: 'Zwemmen',
    verb: 'zwemmen',
    disciplineLabel: 'Zwemmen',
    pictogram: undefined,
    colorToken: 'var(--color-sage)',
    traits: { impact: 0, eccentric: 0, stopStart: 0, upperBody: 3, technique: 3 },
    typicalIntensity: 'moderate',
    plannable: false,
    roles: ['fixed', 'count', 'off'],
    externalKinds: ['Swim', 'OpenWaterSwim'],
  },
  {
    id: 'padel',
    label: 'Padel',
    verb: 'padel spelen',
    disciplineLabel: 'Padel',
    pictogram: undefined,
    colorToken: 'var(--color-sage)',
    traits: { impact: 2, eccentric: 2, stopStart: 3, upperBody: 2, technique: 2 },
    typicalIntensity: 'moderate',
    plannable: false,
    roles: ['fixed', 'count', 'off'],
    externalKinds: ['Padel'],
  },
  {
    id: 'football',
    label: 'Voetbal',
    verb: 'voetballen',
    disciplineLabel: 'Voetbal',
    pictogram: undefined,
    colorToken: 'var(--color-sage)',
    traits: { impact: 3, eccentric: 3, stopStart: 3, upperBody: 1, technique: 2 },
    typicalIntensity: 'high',
    plannable: false,
    roles: ['fixed', 'count', 'off'],
    externalKinds: ['Soccer'],
  },
] as const satisfies readonly SportDefinition[];

export type CountedSportId = (typeof COUNTED_SPORTS)[number]['id'];
// Elke sport die ASCEND kent: de drie die hij plant en de drie die alleen kunnen meetellen.
export type AnySportId = SportId | CountedSportId;
export const ALL_SPORTS: readonly SportDefinition[] = [...SPORTS, ...COUNTED_SPORTS];
export const ALL_SPORT_IDS = ALL_SPORTS.map((s) => s.id) as AnySportId[];

export function anySportDefinition(id: AnySportId): SportDefinition {
  return ALL_SPORTS.find((s) => s.id === id) as SportDefinition;
}

// Het intervals.icu-type naar een sport die alleen kan meetellen, of undefined. Los van
// sportOfExternalType, zodat het importeren van deze sporten pas aangaat als jij een keuze maakt.
export function countedSportOfExternalType(type: string): CountedSportId | undefined {
  return COUNTED_SPORTS.find((s) => (s.externalKinds as readonly string[]).includes(type))?.id;
}

export type SportId = (typeof SPORTS)[number]['id'];

export const SPORT_IDS: SportId[] = SPORTS.map((s) => s.id);

export function sportDefinition(id: SportId): SportDefinition {
  return SPORTS.find((s) => s.id === id) as SportDefinition;
}

// Het intervals.icu-type naar de sport, of undefined (kracht en al het andere).
export function sportOfExternalType(type: string): SportId | undefined {
  return SPORTS.find((s) => (s.externalKinds as readonly string[]).includes(type))?.id;
}
