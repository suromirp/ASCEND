// ASCEND: het blad Route voorstellen, het pure deel. In welke stand het blad staat, in welke volgorde
// de delen staan (de kaart bovenaan, dan de gekozen lus en de hoofdknop, dan de lussen als rijen), welke
// regels van een lus een melding zijn (amber) en welke uitleg, en de vaste hoogte van de kaart. Geen
// React, geen netwerk; components/RoutePanel.tsx rendert alleen. Plant niets en bewaart niets.
// Docs: docs/visie/Ontwerp Route en trainingsscherm.md (hoofdstuk 6 en 7, spoor 2), besluit
// docs/beslissingen/2026-11-11-briefing.md.

import type { RouteProposal, RouteTarget } from '../models/route';
import { formatNumberNL } from '../utils/number';
import { tooShort } from './routePlanner';

// De kaart en de zoekstand hebben dezelfde vaste hoogte, zodat er niets verspringt als de lussen er zijn.
// Laag genoeg dat op 360 px (een scherm van 640 px hoog) de gekozen lus en de hoofdknop eronder nog in
// beeld staan; nooit hoger dan 340 px.
export const ROUTE_MAP_HEIGHT = 'clamp(180px, 34vh, 340px)';

export const OFFLINE_LINE = 'Zonder netwerk is er geen route. Probeer het later nog eens.';
export const TIMEOUT_LINE = 'De routeplanner antwoordde niet op tijd. Probeer het later nog eens.';
// Achter de i: hoe de kaart werkt (stond eerder onder de kaart).
export const MAP_HINT = 'De ring is de start. Tik op de kaart voor een ander startpunt; Start hier bewaart dat punt als je vaste punt en zet Startpunt van je lus op Vast punt.';
export const PICK_HINT = 'De gekozen lus is doorgetrokken, de andere gestreept. Tik een lus op de kaart of in de lijst om hem te kiezen.';

export const NO_PLACE_LINE = 'Kies eerst een plaats bij Instellingen, Vandaag en meldingen, Plaats. Daar begint de lus.';

export type RouteSheetStage =
  // Geen plaats ingesteld: de bestaande regel.
  | 'no-place'
  // De toestemming of het startpunt wordt nog gelezen: een lege regel met vaste hoogte.
  | 'reading'
  // De eerste keer: de bestaande eerste vraag, ongewijzigd.
  | 'first-question'
  // Vast punt zonder punt: eerst een punt.
  | 'needs-point'
  | 'searching'
  | 'offline'
  | 'timeout'
  | 'plans';

export interface StageInput {
  hasPlace: boolean;
  consent: boolean | undefined;
  // Ja gezegd en een keuze voor het startpunt gemaakt.
  asked: boolean;
  savedKnown: boolean;
  waitingForPoint: boolean;
  search: 'busy' | { kind: 'offline' | 'timeout' | 'plans' };
}

export function routeSheetStage(i: StageInput): RouteSheetStage {
  if (!i.hasPlace) return 'no-place';
  if (i.consent === undefined) return 'reading';
  if (!i.asked) return 'first-question';
  if (!i.savedKnown) return 'reading';
  if (i.waitingForPoint) return 'needs-point';
  if (i.search === 'busy') return 'searching';
  return i.search.kind;
}

// De delen onder de kop, van boven naar onder. De kaart (of wat op haar plek staat) altijd eerst, dan
// de gekozen lus met de hoofdknop: dat staat boven de vouw. Daarna de lussen als rijen om te kiezen,
// wat er op de kaart lag, Opnieuw zoeken en de bronnen. Nergens een uitklap.
export type RouteSheetPart = 'searching' | 'failure' | 'map' | 'chosen' | 'loops' | 'found' | 'retry' | 'sources';

export function routeSheetParts(stage: RouteSheetStage, plans?: { anyOk: boolean; anyFailed: boolean }): RouteSheetPart[] {
  if (stage === 'searching') return ['searching'];
  // De regel en Opnieuw zoeken staan in een vak op de plek van de kaart.
  if (stage === 'offline' || stage === 'timeout') return ['failure'];
  if (stage !== 'plans' || !plans) return [];
  const parts: RouteSheetPart[] = ['map'];
  if (plans.anyOk) parts.push('chosen');
  parts.push('loops', 'found');
  if (plans.anyFailed) parts.push('retry');
  parts.push('sources');
  return parts;
}

// Wat er staat als de telefoon de kaart niet kan tekenen; de lussen staan dan als tekst in de rijen.
export function mapFallbackLine(kind: 'unsupported' | 'failed', hasRoutes: boolean): string {
  const first = kind === 'unsupported' ? 'Deze telefoon kan de kaart niet tekenen.' : 'De kaart kon niet laden.';
  return hasRoutes ? `${first} De lussen staan hieronder.` : first;
}

// De regels van een lus, gesplitst: een melding (te kort, of de hoogtemeters niet gehaald) staat in
// een eigen regel in amber; de rest is uitleg. De zinnen zelf komen uit engine/routePlanner.ts.
export function loopLines(p: RouteProposal, target: RouteTarget, notes: string[]): { warn: string[]; info: string[] } {
  const short = tooShort(p, target) ? `${formatNumberNL(Math.round(p.distanceM / 100) / 10, 1)} km, korter dan` : undefined;
  const warn: string[] = [];
  const info: string[] = [];
  for (const note of notes) {
    if ((p.notice && note === p.notice) || (short && note.startsWith(short))) warn.push(note);
    else info.push(note);
  }
  return { warn, info };
}

// Een andere lus kiezen: in Vol een overgang van 150 ms, in Rustig en Uit meteen op de eindstand.
export const pickTransition = (motion: 'full' | 'calm' | 'off'): string =>
  motion === 'full' ? 'border-color 150ms ease-out, background-color 150ms ease-out' : 'none';
