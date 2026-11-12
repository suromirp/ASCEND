// ASCEND: het blad Route voorstellen, het pure deel. In welke stand het blad staat, in welke volgorde
// de delen staan (de kaart bovenaan, dan de gekozen lus en de hoofdknop, dan de lussen als rijen), welke
// regels van een lus een melding zijn (amber) en welke uitleg, en de vaste hoogte van de kaart. Geen
// React, geen netwerk; components/RoutePanel.tsx rendert alleen. Plant niets en bewaart niets.
// Docs: docs/visie/Ontwerp Route en trainingsscherm.md (hoofdstuk 6 en 7, spoor 2), besluit
// docs/beslissingen/2026-11-11-briefing.md.

import type { RouteProposal, RouteTarget } from '../models/route';
import { formatNumberNL } from '../utils/number';
import { tooShort } from './routePlanner';
import { routeActionLine, type RouteFileLine, type RouteSendOutcome, type SendLine } from './routeSend';

// De kaart en de zoekstand hebben dezelfde vaste hoogte, zodat er niets verspringt als de lussen er zijn.
// Laag genoeg dat op 360 px (een scherm van 640 px hoog) de gekozen lus en de hoofdknop eronder nog in
// beeld staan; nooit hoger dan 340 px.
export const ROUTE_MAP_HEIGHT = 'clamp(180px, 34vh, 340px)';
// De lagere stand in de Briefing (spoor 5): kaart, lus en de vier vakken boven de vouw op 390 en 412 px
// (een scherm van ongeveer 800 px hoog); nooit hoger dan 240 px. Groter opent het blad met de volle kaart.
export const BRIEFING_MAP_HEIGHT = 'clamp(150px, 28vh, 240px)';

export const OFFLINE_LINE = 'Zonder netwerk is er geen route. Probeer het later nog eens.';
export const TIMEOUT_LINE = 'De routeplanner antwoordde niet op tijd. Probeer het later nog eens.';
// Achter de i: hoe de kaart werkt (stond eerder onder de kaart).
export const MAP_HINT = 'De ring is de start. Tik op de kaart voor een ander startpunt: Start hier geldt alleen voor deze zoektocht. Bewaar als plek maakt er Thuis van; je routes bij Thuis blijven.';
export const PICK_HINT = 'De gekozen lus is doorgetrokken, de andere gestreept. Tik een lus op de kaart of in de lijst om hem te kiezen.';

export const NO_PLACE_LINE = 'Kies eerst een plaats bij Instellingen, Vandaag en meldingen, Plaats. Daar begint de lus.';

export type RouteSheetStage =
  // Geen plaats ingesteld: de bestaande regel.
  | 'no-place'
  // De toestemming of het startpunt wordt nog gelezen: een lege regel met vaste hoogte.
  | 'reading'
  // De eerste keer: de bestaande eerste vraag, ongewijzigd.
  | 'first-question'
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
  search: 'busy' | { kind: 'offline' | 'timeout' | 'plans' };
}

export function routeSheetStage(i: StageInput): RouteSheetStage {
  if (!i.hasPlace) return 'no-place';
  if (i.consent === undefined) return 'reading';
  if (!i.asked) return 'first-question';
  if (!i.savedKnown) return 'reading';
  if (i.search === 'busy') return 'searching';
  return i.search.kind;
}

// De delen onder de kop, van boven naar onder. De kaart (of wat op haar plek staat) altijd eerst, dan
// de lussen als rijen om te kiezen en de hoofdknop voor de gekozen lus: dat staat boven de vouw op 390
// en 412 px. Daarna wat er op de kaart lag, Opnieuw zoeken en de bronnen. Nergens een uitklap.
export type RouteSheetPart = 'searching' | 'failure' | 'map' | 'chosen' | 'loops' | 'found' | 'retry' | 'sources';

export function routeSheetParts(stage: RouteSheetStage, plans?: { anyOk: boolean; anyFailed: boolean }): RouteSheetPart[] {
  if (stage === 'searching') return ['searching'];
  // De regel en Opnieuw zoeken staan in een vak op de plek van de kaart.
  if (stage === 'offline' || stage === 'timeout') return ['failure'];
  if (stage !== 'plans' || !plans) return [];
  // Kaart, dan de rijen (de gekozen met vinkje), dan de hoofdknop direct eronder: titel en feiten van
  // een lus staan alleen in zijn rij (Pathfinder, 11 november).
  const parts: RouteSheetPart[] = ['map', 'loops'];
  if (plans.anyOk) parts.push('chosen');
  parts.push('found');
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

// Onder de hoofdknop alleen de uitkomst van een tik; voor een tik niets. Wat je daarna in Garmin
// Connect doet (SEND_HINT, SAVE_HINT) staat achter de i, niet nog eens onder de knop.
export function routeOutcomeLine(hasSender: boolean, done?: { send: RouteSendOutcome } | { file: RouteFileLine }): SendLine | undefined {
  if (!done) return undefined;
  if ('file' in done && done.file.ok) {
    return { text: done.file.where === 'folder' ? `Opgeslagen als ${done.file.name} in ${done.file.label}.` : `Gedownload als ${done.file.name}.`, warn: false };
  }
  return routeActionLine(hasSender, done);
}
