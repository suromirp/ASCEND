// ASCEND: Andere lus, het pure deel (besluit 2026-11-22-andere-lus.md). Onder de lus staat een knop met
// vijf keuzes: Andersom (dezelfde lus achterstevoren, geen aanroep), Een andere kant op (de planner slaat de
// kant over waar de vorige lus heen ging), Noord, Oost, Zuid of West (een lus die die kant op gaat) en Zonder
// heen en terug (zo min mogelijk stukken twee keer). Alles gaat door proposeAdventure, dus binnen
// MAX_ROUTE_CALLS: elke keuze behalve Andersom is één zoektocht. Deterministisch: dezelfde invoer en
// dezelfde antwoorden geven dezelfde lus. Plant niets en bewaart niets; de lus geldt zolang het blad open is.

import type { RoutePoint, RouteFn, RouteProposal } from '../models/route';
import { formatNumberNL } from '../utils/number';
import { reverseProposal } from './routeAdjust';
import { bearing, metersBetween } from './routeGeometry';
import { REPEAT_OK, adventureVias, notedOutcome, proposeAdventure, terrainFound, type Arc, type PlanInput } from './routePlanner';

const DIRECTION_LINE = 'Een nieuwe lus die die kant op gaat. Ligt daar niets, dan staat dat erbij.';

export type OtherLoopChoice = 'reverse' | 'otherSide' | 'north' | 'east' | 'south' | 'west' | 'noRepeat';

// De keuzes in het blad, met één regel uitleg per rij. De vier richtingen delen één regel (`DIRECTION_LINE`).
export const OTHER_LOOP_CHOICES: { choice: OtherLoopChoice; label: string; line: string }[] = [
  { choice: 'reverse', label: 'Andersom', line: 'Dezelfde lus achterstevoren. Geen nieuwe zoektocht.' },
  { choice: 'otherSide', label: 'Een andere kant op', line: 'Een nieuwe lus die de kant van deze lus overslaat.' },
  { choice: 'north', label: 'Noord', line: DIRECTION_LINE },
  { choice: 'east', label: 'Oost', line: DIRECTION_LINE },
  { choice: 'south', label: 'Zuid', line: DIRECTION_LINE },
  { choice: 'west', label: 'West', line: DIRECTION_LINE },
  { choice: 'noRepeat', label: 'Zonder heen en terug', line: 'Een nieuwe lus met zo min mogelijk stukken die je twee keer loopt.' },
];

// Een nieuwe zoektocht gaat naar dezelfde routeplanner en dezelfde kaartbron als de lus zelf.
export const OTHER_LOOP_SOURCES_LINE = 'Een nieuwe lus vraagt dezelfde routeplanner en dezelfde kaartgegevens als de eerste, met dezelfde afgeronde plek.';

const DIRECTION: Record<'north' | 'east' | 'south' | 'west', { deg: number; where: string }> = {
  north: { deg: 0, where: 'het noorden' },
  east: { deg: 90, where: 'het oosten' },
  south: { deg: 180, where: 'het zuiden' },
  west: { deg: 270, where: 'het westen' },
};

// Een richting houdt punten binnen zoveel graden rond die richting.
export const DIRECTION_HALF_WIDTH = 90;
// De kant van de vorige lus die Een andere kant op overslaat: zoveel graden aan elke kant van zijn verste punt.
export const SKIP_HALF_WIDTH = 60;
// Zo ver zoekt de eerste ronde van de planner (deel van de afstand, zoals adventureVias).
const FIRST_REACH = 0.25;

export const isDirection = (c: OtherLoopChoice): c is 'north' | 'east' | 'south' | 'west' => c === 'north' || c === 'east' || c === 'south' || c === 'west';

// Andersom: de punten in omgekeerde volgorde; afstand blijft, het stijgen telt opnieuw (omhoog wordt omlaag).
export const reverseLoop = (p: RouteProposal): RouteProposal => reverseProposal(p);

// De richting waar een lus heen ging: die van zijn verste punt vanaf de start.
export function loopHeading(points: readonly RoutePoint[], start: RoutePoint): number | undefined {
  let far: RoutePoint | undefined;
  let farM = 0;
  for (const p of points) {
    const m = metersBetween(start, p);
    if (m > farM) {
      farM = m;
      far = p;
    }
  }
  return far ? bearing(start, far) : undefined;
}

const COMPASS = ['het noorden', 'het noordoosten', 'het oosten', 'het zuidoosten', 'het zuiden', 'het zuidwesten', 'het westen', 'het noordwesten'];
export const compassWord = (deg: number): string => COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

const km = (m: number) => {
  const r = Math.round(m / 100) / 10;
  return `${formatNumberNL(r, Number.isInteger(r) ? 0 : 1)} km`;
};

export type OtherLoopResult = { ok: true; proposal: RouteProposal; note?: string } | { ok: false; line: string };

const STAYS = 'De lus blijft zoals hij was.';

export function otherLoopFailLine(reason: string): string {
  if (reason === 'offline') return `Zonder netwerk kan er geen andere lus komen. ${STAYS}`;
  if (reason === 'timeout') return `De routeplanner antwoordde niet op tijd. ${STAYS}`;
  return `Er is geen andere lus gevonden. ${STAYS}`;
}

// Een nieuwe lus voor een keuze, met één zoektocht van de planner (hoogstens MAX_ROUTE_CALLS aanroepen).
// `previous` is de lus die nu staat: Een andere kant op en Zonder heen en terug lezen hem. Andersom gebruikt
// reverseLoop en komt hier niet.
export async function proposeOtherLoop(input: PlanInput, route: RouteFn, choice: Exclude<OtherLoopChoice, 'reverse'>, previous: RouteProposal): Promise<OtherLoopResult> {
  const found = terrainFound(input.terrain);
  const finish = (o: Awaited<ReturnType<typeof proposeAdventure>>, note?: string): OtherLoopResult => {
    const noted = notedOutcome(o, input.target, found);
    if (!noted.ok) return { ok: false, line: otherLoopFailLine(noted.reason) };
    return { ok: true, proposal: noted.proposal, ...(note ? { note } : {}) };
  };

  if (choice === 'noRepeat') {
    // Deze lus loopt al niets dubbel: een nieuwe zoektocht geeft dezelfde lus, dus er gaat niets de deur uit.
    if (previous.repeatedShare <= REPEAT_OK && (previous.deadEnds ?? 0) === 0) return { ok: false, line: 'Deze lus loopt al geen stuk twee keer.' };
    const out = await proposeAdventure(input, route, { noRepeat: true });
    if (!out.ok) return finish(out);
    const p = out.proposal;
    if (p.repeatedShare > REPEAT_OK || (p.deadEnds ?? 0) > 0) {
      const share = Math.max(1, Math.round(p.repeatedShare * 100));
      return finish(out, `Een lus zonder stukken twee keer lukte hier niet. Dit is de lus met het minst: ongeveer ${formatNumberNL(share, 0)} procent loop je twee keer.`);
    }
    return finish(out);
  }

  if (choice === 'otherSide') {
    const heading = loopHeading(previous.points, input.start);
    const arc: Arc | undefined = heading === undefined ? undefined : { from: (heading + SKIP_HALF_WIDTH) % 360, span: 360 - 2 * SKIP_HALF_WIDTH };
    return finish(await proposeAdventure(input, route, arc ? { arc } : {}));
  }

  const { deg, where } = DIRECTION[choice];
  const arc: Arc = { from: (deg - DIRECTION_HALF_WIDTH + 360) % 360, span: 2 * DIRECTION_HALF_WIDTH };
  const real = adventureVias(input, FIRST_REACH, arc).filter((v) => !v.pad);
  if (real.length === 0) {
    // Niets om heen te lopen die kant op: het droge feit, met de beste lus die er wel is.
    const radius = km(input.target.distanceKm * 1000 * FIRST_REACH);
    const best = await proposeAdventure(input, route);
    const heading = best.ok ? loopHeading(best.proposal.points, input.start) : undefined;
    const differs = heading === undefined ? '' : ` De beste lus die er wel is gaat naar ${compassWord(heading)}.`;
    return finish(best, `Naar ${where} liggen binnen ${radius} geen paden of hellingen.${differs}`);
  }
  return finish(await proposeAdventure(input, route, { arc }));
}
