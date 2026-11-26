// ASCEND: wie al in een beginnersstart zit, krijgt de ladder van heel licht alleen na zijn Akkoord
// (docs/visie/Ontwerp beginner rest.md, deel 3; docs/visie/Ontwerp beginner heel licht.md, deel 5). Een voorstel op
// Vandaag, met een id per start (de startmaandag van de richting, niet de dag van vragen): Liever niet laat alles staan
// en het komt niet terug, want het antwoord staat bij de adviezen. Het geldt voor een lopende start zonder keuze voor
// de opbouw en voor een start op heel licht van voor de ladder: dat Akkoord noemde wandelen en dribbelen, niet kortere
// kracht. Tot het Akkoord blijft zo'n start zoals hij is (engine/beginnerStart.ts#resolveStartBuild).
// Puur: geen React, geen IndexedDB.

import { REST_DAY_COPY } from '../data/restDayCopy';
import type { Advice } from './adviceShared';
import type { Program } from '../models/program';
import { BEGINNER_LADDER } from '../data/beginnerLadder';
import { beginnerWeek, resolveStartBuild, WALK_JOG_LINE, LADDER_CONSENT } from './beginnerStart';
import { startWeekOn } from './beginnerPlan';
import { mondayOfWeek } from '../utils/dates';

export const BEGINNER_LADDER_RULE = 'BEGINNER-LADDER';
export const BEGINNER_LADDER_TITLE = 'Je start wordt lichter';
export const beginnerLadderOfferId = (startMonday: string): string => `beginner-ladder:${startMonday}`;

// Het Akkoord, zoals het in de instellingen komt.
export const ladderConsentPatch = LADDER_CONSENT;

export const BEGINNER_LADDER_EXPLANATION =
  'Je start wordt lichter: kortere krachttrainingen, en wandelen en dribbelen dat elke week iets langer wordt. Eerst een voorstel, pas na Akkoord verandert er iets. Wat je al deed en wat je zelf vastzette blijft staan.';

interface OfferSettings {
  beginnerBuild?: unknown;
  beginnerLadder?: unknown;
  restDayMode?: 'rest' | 'active';
}

// Wat er verandert, voor het voorstel met de planningsronde. De getallen komen uit de ladder (data/beginnerLadder.ts).
export function beginnerLadderLines(settings: OfferSettings, week: number): string[] {
  const rung = beginnerWeek(Math.min(Math.max(1, week), BEGINNER_LADDER.length))!;
  const last = beginnerWeek(BEGINNER_LADDER.length)!;
  return [
    ...(settings.beginnerBuild === 'licht' ? [] : [WALK_JOG_LINE]),
    `Deze week: kracht ${rung.strengthMinutes} minuten, met minder sets.`,
    `Wandelen en dribbelen: ${rung.shortMinutes} en ${rung.longMinutes} minuten.`,
    `Wandelen op je ${REST_DAY_COPY[settings.restDayMode ?? 'rest'].title.toLowerCase()}: hoogstens ${rung.shortMinutes} minuten.`,
    ...(rung.week < last.week
      ? [`Elke week iets meer, tot kracht ${last.strengthMinutes} minuten en wandelen en dribbelen ${last.shortMinutes} en ${last.longMinutes} minuten.`]
      : []),
  ];
}

// De regels voor het voorstel op de dag van Akkoord: de week van de start van vandaag.
export function beginnerLadderLinesOn(settings: OfferSettings, program: Pick<Program, 'startDate' | 'phases'> | null | undefined, today: string): string[] {
  return beginnerLadderLines(settings, startWeekOn(program, today)?.week ?? 1);
}

// Het voorstel op Vandaag, zolang de ladder nog weken heeft in je start. `responded`: de ids met een antwoord
// (Akkoord of Liever niet); dan komt het niet terug.
export function beginnerLadderAdvice(input: {
  settings: OfferSettings & { directionStart?: unknown };
  program: Pick<Program, 'startDate' | 'phases'> | null | undefined;
  today: string;
  responded?: (id: string) => boolean;
}): Advice[] {
  const { settings } = input;
  if (settings.beginnerBuild === 'gewoon' || resolveStartBuild(settings) === 'ladder') return [];
  const at = startWeekOn(input.program, input.today);
  if (!at || at.week > BEGINNER_LADDER.length) return [];
  const startMonday = typeof settings.directionStart === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(settings.directionStart) ? mondayOfWeek(settings.directionStart) : at.startsOn;
  const id = beginnerLadderOfferId(startMonday);
  if (input.responded?.(id)) return [];
  const rung = beginnerWeek(at.week)!;
  const first = beginnerWeek(1)!;
  const last = beginnerWeek(BEGINNER_LADDER.length)!;
  return [{
    id,
    trigger: 'plan_update',
    ruleId: BEGINNER_LADDER_RULE,
    title: BEGINNER_LADDER_TITLE,
    brief: 'Kortere trainingen in je eerste weken. Je plan blijft zoals het is tot je kiest.',
    effect: `Je start wordt lichter. Kracht ${rung.strengthMinutes} minuten, wandelen en dribbelen ${rung.shortMinutes} en ${rung.longMinutes} minuten. Daarna elke week iets meer. Met Liever niet blijft je start zoals hij is en krijg je er geen vraag meer over.`,
    why: `Wie net begint, raakt sneller geblesseerd als het te snel gaat. Daarom groeit je start elke week een beetje: kracht van ${first.strengthMinutes} naar ${last.strengthMinutes} minuten, je langste wandelen en dribbelen hoogstens 10% per week. Omdat dit je planning verandert, gebeurt het alleen na jouw Akkoord.`,
    priority: 2,
    beginnerLadder: true,
  }];
}
