// ASCEND: waar een voorgestelde lus begint. Drie keuzes: Waar je nu bent (bij elke zoektocht één keer
// de plek van het toestel; de standaard), Thuis (een eigen startpunt, de plek Thuis, dat op dit toestel
// staat en meegaat in de back-up, zoals je deur; in de opslag heet het nog 'exact', eerder Vast punt) en Ongeveer (je plaats, afgerond op twee
// decimalen, ongeveer een kilometer). Bij een precies punt ligt ook de zoektocht naar heuvels en paden
// bij OpenStreetMap om dat punt (besluit 2026-11-11-route-verfijnen.md).
// Puur: de opslag en de locatievraag staan in storage/routeStart.ts. Docs: docs/beslissingen/2026-11-09-startpunt-lus.md,
// docs/beslissingen/2026-11-11-route-kaart-2.md.

import type { RoutePoint } from '../models/route';

export type RouteStartMode = 'here' | 'exact' | 'approx';

// Wie nooit zelf koos, of een onbekende waarde heeft, krijgt Waar je nu bent.
export const ROUTE_START_DEFAULT: RouteStartMode = 'here';
export const resolveRouteStart = (raw: unknown): RouteStartMode => (raw === 'exact' || raw === 'approx' || raw === 'here' ? raw : ROUTE_START_DEFAULT);

// Een punt dat bruikbaar is: twee eindige getallen binnen de grenzen van de aarde. Alles anders (een
// kapotte of oude waarde op het toestel) telt als geen punt.
export function validStartPoint(raw: unknown): RoutePoint | undefined {
  const p = raw as { lat?: unknown; lon?: unknown } | null | undefined;
  if (!p || typeof p.lat !== 'number' || typeof p.lon !== 'number') return undefined;
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return undefined;
  if (Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180) return undefined;
  return { lat: p.lat, lon: p.lon };
}

// Een plek van het toestel die ruwer is dan dit telt niet als startpunt. Het was 250 m: daarmee
// kon "precies" een paar straten naast je deur liggen. Buiten bij de deur geeft een telefoon
// meestal 5 tot 20 m, binnen via wifi tot ongeveer 40 m (besluit 2026-11-11-route-verfijnen.md).
export const MAX_START_ACCURACY_M = 50;

// Een bewaard punt heeft vijf decimalen (ongeveer een meter): genoeg voor een deur, geen schijnprecisie.
export const roundExact = (p: RoutePoint): RoutePoint => ({ lat: Math.round(p.lat * 1e5) / 1e5, lon: Math.round(p.lon * 1e5) / 1e5 });

export type StartChoice =
  | { kind: 'approx' }
  // Waar je nu bent: het paneel vraagt bij elke zoektocht eerst de plek.
  | { kind: 'here' }
  | { kind: 'exact'; point: RoutePoint }
  // Precies gekozen, maar er is nog geen punt op dit toestel.
  | { kind: 'needs-point' };

export function chooseStart(mode: RouteStartMode, saved: unknown): StartChoice {
  if (mode === 'here') return { kind: 'here' };
  if (mode !== 'exact') return { kind: 'approx' };
  const point = validStartPoint(saved);
  return point ? { kind: 'exact', point } : { kind: 'needs-point' };
}

export type StartFailure = 'denied' | 'unavailable' | 'timeout' | 'unsupported' | 'coarse';

export function startFailureReason(reason: StartFailure): string {
  switch (reason) {
    case 'denied':
      return 'ASCEND mag je locatie niet gebruiken.';
    case 'timeout':
      return 'Je locatie kwam niet op tijd.';
    case 'coarse':
      return 'ASCEND krijgt je precieze plek niet.';
    default:
      return 'Je locatie is nu niet beschikbaar.';
  }
}

export const startFailureLine = (reason: StartFailure): string => `${startFailureReason(reason)} De lus begint bij je plek, afgerond op ongeveer een kilometer.`;

// De regel bovenaan het paneel Route voorstellen.
export const START_LINE_HERE = 'De lus begint waar je nu bent.';
export const START_LINE_EXACT = 'De lus begint bij Thuis.';
export const START_LINE_TAP = 'De lus begint bij het punt dat je koos.';
export const START_LINE_NO_HOME = 'Je hebt nog geen Thuis. De lus begint waar je nu bent.';
export const START_LINE_NO_HOME_NO_PLACE = 'Geen Thuis en geen locatie: de lus begint bij je plek, afgerond op ongeveer een kilometer.';
export const START_LINE_HOME_UNREAD = 'Thuis kon niet gelezen worden. De lus begint waar je nu bent.';
export const START_LINE_APPROX = 'De lus begint bij je plek, afgerond op ongeveer een kilometer.';

// Waar je nu bent, na de ene vraag om de plek: die plek, of terug op Thuis als dat er is, en
// anders op Ongeveer. Een terugval draagt de reden, voor één regel.
export type HereStart =
  | { kind: 'here'; point: RoutePoint }
  | { kind: 'fixed'; point: RoutePoint; reason: StartFailure }
  | { kind: 'approx'; reason: StartFailure };

export function hereStart(found: { ok: true; point: RoutePoint } | { ok: false; reason: StartFailure }, saved: unknown): HereStart {
  if (found.ok) return { kind: 'here', point: found.point };
  const fixed = validStartPoint(saved);
  return fixed ? { kind: 'fixed', point: fixed, reason: found.reason } : { kind: 'approx', reason: found.reason };
}

export function hereStartLine(start: HereStart): string {
  if (start.kind === 'here') return START_LINE_HERE;
  if (start.kind === 'fixed') return `${startFailureReason(start.reason)} ${START_LINE_EXACT}`;
  return startFailureLine(start.reason);
}

// Heuvels en paden rond je plek van nu: op drie decimalen (ongeveer 100 m), zodat dezelfde plek de
// bewaarde heuvels terugvindt en niet elke zoektocht een nieuwe vraag aan OpenStreetMap is.
export const roundHere = (p: RoutePoint): RoutePoint => ({ lat: Math.round(p.lat * 1e3) / 1e3, lon: Math.round(p.lon * 1e3) / 1e3 });

// ---------- Start bij: welke chip, welk punt, welke regel ----------
// De chips (engine/places.ts#startChoices) zeggen waar de lus begint; de regel eronder staat er alleen bij
// een terugval of een afwijking (Pathfinder, docs/onderhoud/2026-11-11-pathfinder-route-start.md). Een tik
// op een chip geldt voor deze training en wordt niet bewaard; een getikt punt op de kaart (Start hier) ook
// niet. Docs: docs/beslissingen/2026-11-11-route-start.md.

export type StartPick = 'here' | 'home';

export type StartPlan =
  // Waar je nu bent: de plek wordt nog bepaald.
  | { kind: 'locate'; chip: StartPick; line: string }
  | { kind: 'here' | 'home' | 'tap' | 'place'; chip: StartPick; point: RoutePoint; line: string }
  | { kind: 'approx'; chip: StartPick; line: string };

export interface StartPlanInput {
  mode: RouteStartMode;
  // Thuis, als die er is (een kapotte waarde telt als geen Thuis).
  home: unknown;
  // Een tik op een chip, voor deze training.
  picked?: StartPick;
  // Start hier: een getikt punt op de kaart, voor deze zoektocht.
  tap?: RoutePoint;
  // Een bewaarde of gezochte plek (een chip of Andere plek), voor deze training. De chip zelf zegt welke.
  place?: RoutePoint;
  // Thuis kon niet gelezen worden (de opslag antwoordde niet op tijd of gaf een fout): niet raden dat er geen is.
  homeUnread?: boolean;
  // De ene vraag om je plek van deze poging, als die al antwoordde.
  found?: { ok: true; point: RoutePoint } | { ok: false; reason: StartFailure };
}

export function planStart(i: StartPlanInput): StartPlan {
  // Thuis niet gelezen (trage of kapotte opslag): geen Thuis gebruiken, geen chip Thuis, en dat zegt de regel.
  if (i.homeUnread) return planUnread(i);
  const home = validStartPoint(i.home);
  const picked: StartPick = i.picked === 'home' && home ? 'home' : i.picked === 'here' ? 'here' : i.mode === 'exact' && home ? 'home' : 'here';
  const tap = i.tap ? validStartPoint(i.tap) : undefined;
  if (tap) return { kind: 'tap', chip: picked, point: tap, line: START_LINE_TAP };
  const place = i.place ? validStartPoint(i.place) : undefined;
  if (place) return { kind: 'place', chip: picked, point: place, line: '' };
  if (picked === 'home' && home) return { kind: 'home', chip: 'home', point: home, line: '' };
  // Ongeveer valt onder de chip Waar je nu bent en blijft afgerond, ook na een tik: de precieze plek gaat dan nooit de deur uit.
  if (i.mode === 'approx') return { kind: 'approx', chip: 'here', line: START_LINE_APPROX };
  if (!i.found) return { kind: 'locate', chip: 'here', line: '' };
  // Thuis gekozen in de instelling, maar er is geen Thuis: dat zegt de regel, nooit stil.
  const noHome = i.mode === 'exact' && !home && i.picked === undefined;
  if (i.found.ok) return { kind: 'here', chip: 'here', point: i.found.point, line: noHome ? START_LINE_NO_HOME : '' };
  // Je plek lukte niet: terug op Thuis, en dan staat de chip Thuis gekozen; zonder Thuis Ongeveer.
  if (home) return { kind: 'home', chip: 'home', point: home, line: `${startFailureReason(i.found.reason)} ${START_LINE_EXACT}` };
  return { kind: 'approx', chip: 'here', line: START_LINE_NO_HOME_NO_PLACE };
}

function planUnread(i: StartPlanInput): StartPlan {
  const tap = i.tap ? validStartPoint(i.tap) : undefined;
  if (tap) return { kind: 'tap', chip: 'here', point: tap, line: START_LINE_TAP };
  const place = i.place ? validStartPoint(i.place) : undefined;
  if (place) return { kind: 'place', chip: 'here', point: place, line: '' };
  if (i.mode === 'approx') return { kind: 'approx', chip: 'here', line: START_LINE_APPROX };
  if (!i.found) return { kind: 'locate', chip: 'here', line: START_LINE_HOME_UNREAD };
  if (i.found.ok) return { kind: 'here', chip: 'here', point: i.found.point, line: START_LINE_HOME_UNREAD };
  return { kind: 'approx', chip: 'here', line: `${startFailureReason(i.found.reason)} Thuis kon niet gelezen worden. ${START_LINE_APPROX}` };
}

// Of een antwoord op de vraag om je plek nog telt: alleen voor de poging die hem stelde. Een laat
// antwoord van een oude poging overschrijft het nieuwe nooit.
export const locateAnswerCounts = (askedFor: number | undefined, answerFor: number): boolean => askedFor === answerFor;
