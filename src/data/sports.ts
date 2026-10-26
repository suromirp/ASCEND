// ASCEND: de sporten als gegevens. Eén bron voor wat een sport heet, welk
// pictogram en welke kleur erbij horen, welke kenmerken hij heeft en welke
// intervals.icu-types erbij horen. De lijsten elders (engine/sports.ts, de
// instellingen, de import, het logboek) zijn hiervan afgeleid.
//
// Dit bestand importeert niets uit engine/ of models/, zodat iedereen het kan lezen
// zonder kringverwijzing. Een nieuwe sport komt hier bij (ronde 4); zwemmen, padel,
// voetbal en yoga staan er bewust nog niet in, het model kan ze wel dragen.

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
  },
] as const satisfies readonly SportDefinition[];

export type SportId = (typeof SPORTS)[number]['id'];

export const SPORT_IDS: SportId[] = SPORTS.map((s) => s.id);

export function sportDefinition(id: SportId): SportDefinition {
  return SPORTS.find((s) => s.id === id) as SportDefinition;
}

export function isSportId(value: unknown): value is SportId {
  return SPORT_IDS.some((id) => id === value);
}

// Het intervals.icu-type naar de sport, of undefined (kracht en al het andere).
export function sportOfExternalType(type: string): SportId | undefined {
  return SPORTS.find((s) => (s.externalKinds as readonly string[]).includes(type))?.id;
}
