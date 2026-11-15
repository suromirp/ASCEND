// ASCEND: de beginner begint heel licht (docs/visie/Ontwerp beginner heel licht.md, deel 1;
// docs/beslissingen/2026-11-15-beginner-tien-procent.md). Per week van de beginnersstart: hoe lang de
// krachttraining duurt, hoeveel werksets hij heeft, hoe lang de korte en de lange sessie
// wandelen en dribbelen zijn, en de verhouding tussen dribbelen en wandelen.
//
// Elk getal heeft een bewijslabel en een verwijzing naar het onderzoek, zoals data/directions.ts.
// De verhoudingen wandelen en dribbelen komen uit docs/onderzoek/Wandelen en dribbelen voor beginners.md
// (Couch to 5K en de twee schema's van GRONORUN). Na de ladder groeit het dribbelstuk hoogstens 2 minuten
// per week en komt twintig minuten aan één stuk niet voor week 7 of 8 (zelfde stuk, afgeleid; stap 3).
//
// Terugdraaien naar "het gewone plan in week 4": haal de vierde week weg uit BEGINNER_LADDER.
// Puur gegevens: geen React, geen IndexedDB.

import { DUUR, src, type Sourced } from './goalKinds';

const ONTWERP = 'docs/visie/Ontwerp beginner heel licht.md';
const BESLUIT = 'docs/beslissingen/2026-11-15-beginner-tien-procent.md';
const OPBOUW = 'docs/onderzoek/Opbouw hardlopen.md';
const DRIBBELEN = 'docs/onderzoek/Wandelen en dribbelen voor beginners.md';
const KRACHT = 'docs/onderzoek/notities/Aanvullend onderzoek GR5 voorbereiding/kracht_programma.md';

const s = <T>(value: T, evidence: Sourced<T>['evidence'], file: string, part: string): Sourced<T> => ({ value, evidence, source: src(file, part) });

// Dribbelen en wandelen in minuten, om de beurt. `null`: gewoon lopen (nu in geen enkele week van de ladder).
export interface WalkJog {
  jog: number;
  walk: number;
}

export interface BeginnerLadderWeek {
  // Minuten van een krachttraining deze week.
  strengthMinutes: Sourced<number>;
  // Werksets van Bovenlichaam A deze week (23 in het gewone plan, zie REFERENCE_SETS). Een ander
  // krachtsjabloon krijgt hetzelfde deel van zijn eigen sets (engine/beginnerStart.ts#beginnerWeek).
  strengthSets: Sourced<number>;
  // De kortere en de langere sessie wandelen en dribbelen (op de plek van de Rustige en de Lange duurloop).
  shortMinutes: Sourced<number>;
  longMinutes: Sourced<number>;
  walkJog: Sourced<WalkJog | null>;
}

// Wat de start nu plant voor wandelen en dribbelen, elke week (data/defaultProgram.ts, tpl_walk_jog en
// tpl_walk_jog_long), onder de loop waarvan het de plek heeft. Stap 3 van het ontwerp zet hier de ladder.
export const START_PLANNED_MINUTES: Readonly<Record<string, number>> = { tpl_easy_run: 20, tpl_long_run: 30 };

// De werksets van Bovenlichaam A in het gewone plan (data/defaultProgram.ts): de ladder is daarop gemeten.
export const REFERENCE_SETS = 23;

// De lange sessie groeit hoogstens 10% per stap, op 5 minuten afgerond zoals de rem in
// engine/substitutions.ts (SESSION_SPIKE_LIMIT): 30, 35, 40, 45.
export const BEGINNER_STEP_LIMIT = 1.1;

export const BEGINNER_LADDER: readonly BeginnerLadderWeek[] = [
  {
    // Week 1: de helft van de sets (5 oefeningen, 2 sets elk), de langste training 30 minuten.
    strengthMinutes: s(35, 'afgeleid', BESLUIT, 'besluit 2026-11-14 punt 2: kracht 30 tot 40 minuten in week 1'),
    strengthSets: s(10, 'matig', KRACHT, 'Pelland en Remmert: ongeveer 2 sets per spier per sessie voor kracht'),
    shortMinutes: s(20, 'afgeleid', ONTWERP, 'deel 1, week 1'),
    longMinutes: s(30, 'afgeleid', BESLUIT, 'besluit 2026-11-14 punt 2: de langste training 30 minuten'),
    walkJog: s({ jog: 1, walk: 2 }, 'afgeleid', DRIBBELEN, 'wat dit betekent voor de ladder, week 1: voorzichtiger dan 1 om 1,5 en 1 om 1'),
  },
  {
    strengthMinutes: s(45, 'afgeleid', ONTWERP, 'deel 1, week 2'),
    strengthSets: s(13, 'afgeleid', ONTWERP, 'deel 1, week 2'),
    shortMinutes: s(25, 'afgeleid', ONTWERP, 'deel 1, week 2'),
    longMinutes: s(35, 'matig', DUUR, 'regel 37, Frandsen 2025: hoogstens 10% boven je langste loop'),
    walkJog: s({ jog: 2, walk: 2 }, 'matig', DRIBBELEN, 'wat dit betekent voor de ladder, week 2: tussen Couch to 5K en het trage schema van GRONORUN'),
  },
  {
    // Week 3: alle oefeningen van de korte versie met hun volle sets (17 bij Bovenlichaam A).
    strengthMinutes: s(55, 'afgeleid', ONTWERP, 'deel 1, week 3'),
    strengthSets: s(17, 'afgeleid', ONTWERP, 'deel 1, week 3: de korte versie, volle sets'),
    shortMinutes: s(30, 'afgeleid', ONTWERP, 'deel 1, week 3'),
    longMinutes: s(40, 'matig', DUUR, 'regel 37, Frandsen 2025: hoogstens 10% boven je langste loop'),
    walkJog: s({ jog: 3, walk: 2 }, 'matig', DRIBBELEN, 'wat dit betekent voor de ladder, week 3: de verhouding van GRONORUN'),
  },
  {
    strengthMinutes: s(65, 'afgeleid', ONTWERP, 'deel 1, week 4'),
    strengthSets: s(20, 'afgeleid', ONTWERP, 'deel 1, week 4'),
    shortMinutes: s(35, 'afgeleid', ONTWERP, 'deel 1, week 4'),
    longMinutes: s(45, 'matig', OPBOUW, 'de 110%-regel voor één loop (Frandsen 2025)'),
    // Niet vrij dribbelen zoals het ontwerp: van stukken van 3 minuten naar 35 of 45 aan één stuk doet geen enkel
    // onderzocht schema.
    walkJog: s({ jog: 4, walk: 2 }, 'matig', DRIBBELEN, 'wat dit betekent voor de ladder, week 4: het trage schema van GRONORUN'),
  },
];
