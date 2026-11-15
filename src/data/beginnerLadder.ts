// ASCEND: de beginner begint heel licht (docs/visie/Ontwerp beginner heel licht.md, deel 1;
// docs/beslissingen/2026-11-15-beginner-tien-procent.md). Per week van de beginnersstart: hoe lang de
// krachttraining duurt, hoeveel werksets hij heeft, hoe lang de korte en de lange sessie
// wandelen en dribbelen zijn, en de verhouding tussen dribbelen en wandelen.
//
// Elk getal heeft een bewijslabel en een verwijzing naar het onderzoek, zoals data/directions.ts.
// De verhoudingen wandelen en dribbelen hebben nog geen bron in docs/onderzoek: ze staan als
// "afgeleid" tot Scout ze aanvult (stap 0 van het ontwerp).
//
// Terugdraaien naar "het gewone plan in week 4": haal de vierde week weg uit BEGINNER_LADDER.
// Puur gegevens: geen React, geen IndexedDB.

import { DUUR, src, type Sourced } from './goalKinds';

const ONTWERP = 'docs/visie/Ontwerp beginner heel licht.md';
const BESLUIT = 'docs/beslissingen/2026-11-15-beginner-tien-procent.md';
const OPBOUW = 'docs/onderzoek/Opbouw hardlopen.md';
const KRACHT = 'docs/onderzoek/notities/Aanvullend onderzoek GR5 voorbereiding/kracht_programma.md';

const s = <T>(value: T, evidence: Sourced<T>['evidence'], file: string, part: string): Sourced<T> => ({ value, evidence, source: src(file, part) });

// Dribbelen en wandelen in minuten, om de beurt. `null`: gewoon lopen, een wandelpauze mag.
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
    walkJog: s({ jog: 1, walk: 2 }, 'afgeleid', ONTWERP, 'deel 1, wandelen en dribbelen (nog zonder bron)'),
  },
  {
    strengthMinutes: s(45, 'afgeleid', ONTWERP, 'deel 1, week 2'),
    strengthSets: s(13, 'afgeleid', ONTWERP, 'deel 1, week 2'),
    shortMinutes: s(25, 'afgeleid', ONTWERP, 'deel 1, week 2'),
    longMinutes: s(35, 'matig', DUUR, 'regel 37, Frandsen 2025: hoogstens 10% boven je langste loop'),
    walkJog: s({ jog: 2, walk: 2 }, 'afgeleid', ONTWERP, 'deel 1, wandelen en dribbelen (nog zonder bron)'),
  },
  {
    // Week 3: alle oefeningen van de korte versie met hun volle sets (17 bij Bovenlichaam A).
    strengthMinutes: s(55, 'afgeleid', ONTWERP, 'deel 1, week 3'),
    strengthSets: s(17, 'afgeleid', ONTWERP, 'deel 1, week 3: de korte versie, volle sets'),
    shortMinutes: s(30, 'afgeleid', ONTWERP, 'deel 1, week 3'),
    longMinutes: s(40, 'matig', DUUR, 'regel 37, Frandsen 2025: hoogstens 10% boven je langste loop'),
    walkJog: s({ jog: 3, walk: 2 }, 'afgeleid', ONTWERP, 'deel 1, wandelen en dribbelen (nog zonder bron)'),
  },
  {
    strengthMinutes: s(65, 'afgeleid', ONTWERP, 'deel 1, week 4'),
    strengthSets: s(20, 'afgeleid', ONTWERP, 'deel 1, week 4'),
    shortMinutes: s(35, 'afgeleid', ONTWERP, 'deel 1, week 4'),
    longMinutes: s(45, 'matig', OPBOUW, 'de 110%-regel voor één loop (Frandsen 2025)'),
    walkJog: s(null, 'afgeleid', ONTWERP, 'deel 1, week 4: lopen, een wandelpauze als je wilt'),
  },
];
