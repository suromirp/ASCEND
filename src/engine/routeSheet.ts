// ASCEND: het blad Route voorstellen, het pure deel. In welke stand het blad staat, in welke volgorde
// de delen staan (de kaart bovenaan, dan de gekozen lus en de hoofdknop, dan de lussen als rijen), welke
// regels van een lus een melding zijn (amber) en welke uitleg, en de vaste hoogte van de kaart. Geen
// React, geen netwerk; components/RoutePanel.tsx rendert alleen. Plant niets en bewaart niets.
// Docs: docs/visie/Ontwerp Route en trainingsscherm.md (hoofdstuk 6 en 7, spoor 2), besluit
// docs/beslissingen/2026-11-11-briefing.md.

import type { RouteProposal, RouteStyle, RouteTarget } from '../models/route';
import { formatNumberNL } from '../utils/number';
import { BIG_ROAD_LEAD, BIG_ROAD_NOTE_M, LONGER_WALK_LEAD, ascentOverLead, ascentOverLine, bigRoadLine, deadEndLine, longerWalkLine, loopMinutes, proposalFacts, proposalTitle, shortLine, tooShort, walkTooLong } from './routePlanner';
import { routeActionLine, type RouteFileLine, type RouteSendOutcome, type SendLine } from './routeSend';

// Zoveel regels in amber hoogstens in één rij van een lus.
export const MAX_WARN_LINES = 2;

// De kaart en de zoekstand hebben dezelfde vaste hoogte, zodat er niets verspringt als de lussen er zijn.
// Laag genoeg dat op 360 px (een scherm van 640 px hoog) de gekozen lus en de hoofdknop eronder nog in
// beeld staan; nooit hoger dan 340 px.
export const ROUTE_MAP_HEIGHT = 'clamp(180px, 34vh, 340px)';
// De lagere stand in de Briefing (spoor 5): kaart, lus en de vier vakken boven de vouw op 390 en 412 px
// (een scherm van ongeveer 800 px hoog); nooit hoger dan 240 px. Groter opent het blad met de volle kaart.
export const BRIEFING_MAP_HEIGHT = 'clamp(150px, 28vh, 240px)';

// Zonder verbinding zegt de regel dat, en niet "probeer het later" (eigenaar 14 november, op reis).
export const OFFLINE_LINE = 'Je hebt geen verbinding. Zonder netwerk is er geen route.';
export const TIMEOUT_LINE = 'De routeplanner antwoordde niet op tijd. Probeer het later nog eens.';
export const TERRAIN_TIMEOUT_LINE = 'Heuvels en paden zoeken duurde te lang. Probeer het later nog eens.';
export const SEARCH_TIMEOUT_LINE = 'Lussen zoeken duurde te lang. Probeer het later nog eens.';

// De regel als zoeken niet lukte: zonder verbinding dat, anders welke stap niet op tijd was (de stap
// waar findRoutes was, routeSearchSteps.ts). Je plek die niet op tijd kwam is de vraag (`ask`).
export function searchFailLine(kind: 'offline' | 'timeout', step: 'terrain' | 'routes' | undefined, online: boolean): string {
  if (kind === 'offline' || !online) return OFFLINE_LINE;
  if (step === 'terrain') return TERRAIN_TIMEOUT_LINE;
  if (step === 'routes') return TIMEOUT_LINE;
  return SEARCH_TIMEOUT_LINE;
}
// Achter de i: hoe de kaart werkt (stond eerder onder de kaart).
export const MAP_HINT = 'De ring is de start. Tik op de kaart voor een ander startpunt: Start hier geldt alleen voor deze zoektocht. Bewaar als plek maakt er Thuis van; je routes bij Thuis blijven.';
export const PICK_HINT = 'De gekozen lus is doorgetrokken, de andere gestreept. Tik een lus op de kaart of in de lijst om hem te kiezen.';

// Achter de i: bijsturen, per stuk en Groter (besluit 2026-11-14-route-kaart-vervolg.md).
export const ADJUST_HINT = 'Bijsturen geldt alleen voor deze lus; lukt het niet, dan blijft de lus zoals hij was.';

export const NO_PLACE_LINE = 'Kies eerst een plaats bij Instellingen, Vandaag en meldingen, Plaats. Daar begint de lus.';

export type RouteSheetStage =
  // Geen plaats ingesteld: de bestaande regel.
  | 'no-place'
  // De toestemming of het startpunt wordt nog gelezen: een lege regel met vaste hoogte.
  | 'reading'
  // De eerste keer: de bestaande eerste vraag, ongewijzigd.
  | 'first-question'
  // Je plek lukte niet: de vraag waar de lus begint (Opnieuw, Thuis, Andere plek); er wordt niet gezocht.
  | 'ask'
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
  // Je plek lukte niet en er is nog niets gekozen (engine/routeStart.ts#planStart, `ask`).
  ask?: boolean;
  search: 'busy' | { kind: 'offline' | 'timeout' | 'plans' };
}

export function routeSheetStage(i: StageInput): RouteSheetStage {
  if (!i.hasPlace) return 'no-place';
  if (i.consent === undefined) return 'reading';
  if (!i.asked) return 'first-question';
  if (!i.savedKnown) return 'reading';
  if (i.ask) return 'ask';
  if (i.search === 'busy') return 'searching';
  return i.search.kind;
}

// De delen onder de kop, van boven naar onder. De kaart (of wat op haar plek staat) altijd eerst, dan
// de lussen als rijen om te kiezen en de hoofdknop voor de gekozen lus: dat staat boven de vouw op 390
// en 412 px. Daarna wat er op de kaart lag, Opnieuw zoeken en de bronnen. Nergens een uitklap.
// 'adjust': bijsturen en de gekozen lus per stuk (engine/routeAdjust.ts), onder de hoofdknop.
// I-160: 'mapMissing' de amberregel bovenaan als de kaart van de omgeving ontbrak, met Opnieuw proberen;
// 'priority' Hoogtemeters halen of Afstand houden onder de lussen; 'plus' buiten plus een trap of de loopband.
export type RouteSheetPart = 'ask' | 'searching' | 'failure' | 'mapMissing' | 'map' | 'chosen' | 'adjust' | 'loops' | 'priority' | 'plus' | 'found' | 'retry' | 'sources';

export function routeSheetParts(stage: RouteSheetStage, plans?: { anyOk: boolean; anyFailed: boolean; mapMissing?: boolean; priority?: boolean; plus?: boolean }): RouteSheetPart[] {
  if (stage === 'ask') return ['ask'];
  if (stage === 'searching') return ['searching'];
  // De regel en Opnieuw zoeken staan in een vak op de plek van de kaart.
  if (stage === 'offline' || stage === 'timeout') return ['failure'];
  if (stage !== 'plans' || !plans) return [];
  // Kaart, dan de rijen (de gekozen met vinkje), dan de hoofdknop direct eronder: titel en feiten van
  // een lus staan alleen in zijn rij (Pathfinder, 11 november).
  const parts: RouteSheetPart[] = plans.mapMissing ? ['mapMissing', 'map', 'loops'] : ['map', 'loops'];
  if (plans.priority) parts.push('priority');
  if (plans.plus) parts.push('plus');
  if (plans.anyOk) parts.push('chosen', 'adjust');
  parts.push('found');
  if (plans.anyFailed) parts.push('retry');
  parts.push('sources');
  return parts;
}

// Ontbrak de kaart van de omgeving (heuvels en paden van OpenStreetMap), dan staat dat bovenaan in amber, met
// Opnieuw proberen: dat haalt alleen die kaart opnieuw op en zoekt daarna opnieuw (I-160). "Opnieuw zoeken"
// blijft het woord voor de lussen zelf.
export const MAP_MISSING_LINE = 'Er is geen actuele kaart van de omgeving, dus de lussen zijn zonder heuvels gezocht. Probeer het opnieuw voor je een route kiest.';
export const MAP_FETCHING_LINE = 'De kaart ophalen.';
export const MAP_FAILED_LINE = 'De kaart kwam niet binnen. Probeer het later nog eens.';
export type MapRetryState = 'idle' | 'busy' | 'failed';
export const mapRetryLine = (state: MapRetryState): string => (state === 'busy' ? MAP_FETCHING_LINE : state === 'failed' ? MAP_FAILED_LINE : MAP_MISSING_LINE);
// De kaart van de omgeving ontbrak echt (geen kaart, niet een oude): alleen dan de regel bovenaan.
export const mapMissing = (plans: { map?: 'none' | 'old' } | undefined): boolean => plans?.map === 'none';

// Wat er staat als de telefoon de kaart niet kan tekenen; de lussen staan dan als tekst in de rijen.
export function mapFallbackLine(kind: 'unsupported' | 'failed', hasRoutes: boolean): string {
  const first = kind === 'unsupported' ? 'Deze telefoon kan de kaart niet tekenen.' : 'De kaart kon niet laden.';
  return hasRoutes ? `${first} De lussen staan hieronder.` : first;
}

// De regels van een lus, gesplitst: een melding (te kort, of de hoogtemeters niet gehaald) staat in
// een eigen regel in amber; de rest is uitleg. De zinnen zelf komen uit engine/routePlanner.ts.
export function loopLines(p: RouteProposal, target: RouteTarget, notes: string[]): { warn: string[]; info: string[] } {
  const short = tooShort(p, target) ? `${formatNumberNL(Math.round(p.distanceM / 100) / 10, 1)} km, korter dan` : undefined;
  const high = ascentOverLine(p, target) ? ascentOverLead(p) : undefined;
  const spur = deadEndLine(p);
  const warn: string[] = [];
  const info: string[] = [];
  for (const note of notes) {
    // Te kort, de melding van de lus en een stuk langs een grote weg zijn let op (amber), hoogstens
    // MAX_WARN_LINES in een rij; wat overblijft staat bij de uitleg.
    // De grote weg gaat voor: hij raakt je veiligheid en valt nooit weg.
    // Een wandeling die langer duurt dan de training is ook let op (LONGER_WALK_LEAD).
    const isWarn = (p.notice && note === p.notice) || (short && note.startsWith(short)) || (high && note.startsWith(high)) || (spur && note === spur) || note.startsWith(BIG_ROAD_LEAD) || note.startsWith(LONGER_WALK_LEAD);
    if (isWarn) warn.push(note);
    else info.push(note);
  }
  const ordered = [...warn.filter((n) => n.startsWith(BIG_ROAD_LEAD)), ...warn.filter((n) => !n.startsWith(BIG_ROAD_LEAD))];
  return { warn: ordered.slice(0, MAX_WARN_LINES), info: [...ordered.slice(MAX_WARN_LINES), ...info] };
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

// De Briefing toont op de kaart alleen de gekozen lus: één duidelijke lijn. De andere lus staat als regel
// met Kies onder de kaart, en gestreept op de grote kaart (besluit 2026-11-12-route-blok.md).
export function briefingRoutes<T extends { style: RouteStyle }>(routes: T[], picked: RouteStyle | undefined): T[] {
  if (!picked) return routes;
  const chosen = routes.filter((r) => r.style === picked);
  return chosen.length > 0 ? chosen : routes;
}

// De ruimte onder de pagina met een vaste knop: zijn hoogte en een marge, zodat de laatste regel (de lus
// en Groter) volledig boven de knop komt. Voor de eerste meting de oude 128 px.
export const footerRoom = (height: number | undefined): string => (height ? `${Math.ceil(height) + 16}px` : '128px');

// De titel van een lus naast zijn regels: staat de amberregel over het stuk heen en terug erbij
// (loopLines), dan noemt de titel het stuk niet nog eens.
export function loopTitle(p: RouteProposal, target: RouteTarget, notes: string[]): string {
  const spur = deadEndLine(p);
  return proposalTitle(p, !!spur && loopLines(p, target, notes).warn.includes(spur));
}

// De andere lus in één regel onder de gekozen lus in de Briefing, met zijn vorm: "Simpel, heen en
// terug: 6 km · vrijwel vlak" of "Simpel, 3 × de helling op en af: ...". Simpel is altijd over hetzelfde
// pad terug; Avontuurlijk is een lus (besluit 2026-11-12-route-blok.md).
export function otherLoopLine(name: string, p: RouteProposal, target?: RouteTarget): string {
  const spur = deadEndLine(p);
  // De amberregel eronder (otherLoopWarn) zegt het stuk heen en terug al: dan de titel zonder.
  const title = proposalTitle(p, !!spur && !!target && otherLoopWarn(p, target) === spur);
  const shape = p.style === 'simple'
    ? ((p.repeats ?? 0) > 1 ? title : (p.deadEnds ?? 0) > 1 ? title.replace(/^Heen/, 'heen') : 'heen en terug')
    : title.replace(/^Eén/, 'één').replace(/^Lus/, 'lus');
  return `${name}, ${shape}: ${proposalFacts(p, target)}`;
}

// De waarschuwing in de ingeklapte rij van de andere lus, in amber zoals bij de gekozen lus: een stuk
// langs een grote weg (dat weet je voor je op Kies tikt), anders te kort voor de training, veel meer hoogtemeters
// dan gevraagd of een stuk heen en terug. Anders niets.
// Te lang voor de wandeling alleen als de gekozen lus dat niet al in amber zegt: de tijd staat al in de
// regel zelf, en twee keer dezelfde waarschuwing op één kaart is ruis (Lookout, 15 november).
export function otherLoopWarn(p: RouteProposal, target: RouteTarget, picked?: RouteProposal): string | undefined {
  if ((p.bigRoadM ?? 0) >= BIG_ROAD_NOTE_M) return bigRoadLine(p.bigRoadM as number);
  if (tooShort(p, target)) return shortLine(p, target);
  const over = ascentOverLine(p, target);
  if (over) return over;
  const spur = deadEndLine(p);
  if (spur) return spur;
  if (picked && walkTooLong(picked, target)) return undefined;
  return walkTooLong(p, target) ? longerWalkLine(loopMinutes(p, target) as number, target.minutes as number) : undefined;
}
