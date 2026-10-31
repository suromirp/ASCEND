// ASCEND: de richtingen zonder doel als gegevens (docs/visie/Zonder doel.md,
// docs/beslissingen/2026-10-27-zonder-doel-stap-1.md). Een richting zegt hoeveel minuten
// en hoeveel keer kracht een week vraagt als je naar niets met een datum toewerkt, en of
// de weken in golven lopen. "Naar een doel" staat hier niet in: dat is wat er al is.
//
// Elk getal heeft een bewijslabel en een verwijzing naar het onderzoek, zoals in
// data/goalKinds.ts. Dit bestand importeert alleen typen en hulpjes daaruit.

import { src, type Sourced } from './goalKinds';

export const DIRECTION_IDS = ['maintain', 'improve', 'stronger', 'easy'] as const;
export type DirectionId = (typeof DIRECTION_IDS)[number];

const VOOR_IEDEREEN = 'docs/onderzoek/ASCEND voor iedereen.md';
const sourced = <T>(value: T, evidence: Sourced<T>['evidence'], part: string): Sourced<T> => ({ value, evidence, source: src(VOOR_IEDEREEN, part) });

// Een golf: een paar weken opbouwen en dan een lichtere week. `step` is de groei per week
// (0 = vlak), `lightCut` het deel dat de lichte week eraf gaat, bij dezelfde intensiteit.
export interface WaveShape {
  weeks: number;
  step: number;
  lightCut: number;
}

export interface DirectionSpec {
  id: DirectionId;
  label: string;
  // Eén zin voor de kaart en het blad.
  line: string;
  // Wat het in je week doet, één regel.
  effect: string;
  // Tel-minuten per week (een matige minuut telt 1, een pittige 2). Bij Fitter worden is dit
  // de ondergrens zonder geschiedenis; de start volgt anders uit je laatste vier weken.
  minutes: Sourced<number>;
  strength: Sourced<number>;
  // Hoogstens dit deel van de minuten mag pittig zijn.
  hardShare: Sourced<number>;
  wave: Sourced<WaveShape | null>;
}

const WAVE_OF_FOUR = (step: number): WaveShape => ({ weeks: 4, step, lightCut: 0.35 });

export const DIRECTIONS: Readonly<Record<DirectionId, DirectionSpec>> = {
  maintain: {
    id: 'maintain',
    label: 'Fit blijven',
    line: 'Een vaste week die je kunt volhouden. Geen opbouw, geen eindpunt.',
    effect: '150 minuten en 2 keer kracht. Elke vierde week is lichter.',
    minutes: sourced(150, 'sterk', 'deel 3, de ondergrens van fit'),
    strength: sourced(2, 'sterk', 'deel 3, de ondergrens van fit'),
    hardShare: sourced(0.2, 'expert', 'deel 3, een standaardschema'),
    // Geen opbouw, wel elke vierde week een lichtere (docs/visie/Zonder doel.md, 3.3).
    wave: sourced(WAVE_OF_FOUR(0), 'expert', 'deel 3, opbouw zonder doel'),
  },
  improve: {
    id: 'improve',
    label: 'Fitter worden',
    line: 'Elke vier weken een stapje meer, en dan een lichtere week.',
    effect: 'Drie weken opbouwen met hoogstens 10% erbij per week, dan een lichte week.',
    minutes: sourced(120, 'afgeleid', 'deel 3, opbouw zonder doel'),
    strength: sourced(2, 'sterk', 'deel 3, de ondergrens van fit'),
    hardShare: sourced(0.2, 'expert', 'deel 3, een standaardschema'),
    wave: sourced(WAVE_OF_FOUR(0.1), 'expert', 'deel 3, opbouw zonder doel'),
  },
  stronger: {
    id: 'stronger',
    label: 'Sterker worden',
    line: 'Kracht staat voorop, duur loopt rustig mee.',
    effect: '3 keer kracht en 120 minuten rustige duur. In de vierde week loop je minder.',
    minutes: sourced(120, 'afgeleid', 'deel 3, onderhouden is goedkoop'),
    strength: sourced(3, 'matig', 'deel 3, onderhouden is goedkoop'),
    hardShare: sourced(0.1, 'afgeleid', 'deel 3, sporten combineren'),
    wave: sourced(WAVE_OF_FOUR(0), 'expert', 'deel 3, opbouw zonder doel'),
  },
  easy: {
    id: 'easy',
    label: 'Rustig aan',
    line: 'Kort en zacht. Liever iets dan niets.',
    effect: '90 minuten en 1 keer kracht, elke week hetzelfde.',
    minutes: sourced(90, 'afgeleid', 'deel 3, de ondergrens van fit (minder doen heeft ook nut)'),
    strength: sourced(1, 'afgeleid', 'deel 3, onderhouden is goedkoop'),
    hardShare: sourced(0, 'afgeleid', 'deel 3, een standaardschema'),
    wave: sourced(null, 'expert', 'deel 3, opbouw zonder doel'),
  },
};

// De beweegrichtlijn: de lat waaronder een week "onder de richtlijn" heet.
export const GUIDELINE_MINUTES = 150;
export const GUIDELINE_STRENGTH = 2;
// Daarboven vraagt de richtlijn niets meer (docs/visie/Zonder doel.md, 3.3).
export const MINUTES_CEILING = 300;
// Fitter worden begint nooit onder dit aantal minuten.
export const IMPROVE_FLOOR = 100;
// De richting die de kaart toont zolang je er geen koos.
export const ADVICE_DIRECTION: DirectionId = 'maintain';
