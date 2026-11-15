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

// `coarse`: na de grens alleen een grove plek (binnen, wifi of zendmast). `approximate`: Android gaf ASCEND
// alleen je plek bij benadering; dan wordt er niet gewacht, want scherper komt hij nooit (besluit
// 2026-11-15-waar-je-nu-bent-scherp.md).
export type StartFailure = 'denied' | 'unavailable' | 'timeout' | 'unsupported' | 'coarse' | 'approximate';

// Het droge feit, één zin.
function failureFact(reason: StartFailure): string {
  switch (reason) {
    case 'denied':
      return 'Geen toegang tot je locatie.';
    case 'timeout':
      return 'Je locatie kwam niet op tijd.';
    case 'coarse':
      return 'Je plek is nog niet scherp genoeg.';
    case 'approximate':
      return 'Android geeft alleen je plek bij benadering. Zet Precieze locatie aan voor ASCEND in de instellingen van je telefoon.';
    default:
      return 'Je locatie is nu niet beschikbaar.';
  }
}

// Hoe opnieuw: een grove plek wordt binnen zelden scherper, buiten of bij een raam wel.
const retryHint = (reason: StartFailure): string => (reason === 'coarse' ? 'Probeer het buiten of bij een raam opnieuw' : 'Probeer het opnieuw');

export function startFailureReason(reason: StartFailure): string {
  return reason === 'coarse' ? `${failureFact(reason)} ${retryHint(reason)}.` : failureFact(reason);
}

// Je plek lukte niet: nooit stil terug op Thuis of op Ongeveer (eigenaar 14 november, op reis: "Hij moet
// dus stoppen met automatisch thuis"). Thuis kan duizenden kilometers verderop liggen. De regel zegt
// waarom, en jij kiest: Opnieuw in het vak, of Thuis of Andere plek in de chips erboven (besluit
// 2026-11-14-geen-stille-thuis.md). Thuis alleen als die er is.
export const askStartLine = (reason: StartFailure, homeOffered: boolean): string =>
  `${failureFact(reason)} ${retryHint(reason)}, of kies hierboven ${homeOffered ? 'Andere plek of Thuis' : 'Andere plek'}.`;

// Thuis kon niet gelezen worden en je plek lukte niet: dezelfde regel, zonder Thuis.
export const askStartLineHomeUnread = (reason: StartFailure): string =>
  `${failureFact(reason)} Thuis kon niet gelezen worden. ${retryHint(reason)}, of kies hierboven Andere plek.`;

// De regel bovenaan het paneel Route voorstellen.
// Alleen nog als bewaker in de tests: deze zin komt na een mislukte plek nooit meer voor (geen stille Thuis).
export const START_LINE_EXACT = 'De lus begint bij Thuis.';
export const START_LINE_TAP = 'De lus begint bij het punt dat je koos.';
export const START_LINE_NO_HOME = 'Je hebt nog geen Thuis. De lus begint waar je nu bent.';
export const START_LINE_HOME_UNREAD = 'Thuis kon niet gelezen worden. De lus begint waar je nu bent.';
export const START_LINE_APPROX = 'De lus begint bij je plek, afgerond op ongeveer een kilometer.';

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
  | { kind: 'approx'; chip: StartPick; line: string }
  // Je plek lukte niet: geen zoektocht tot je kiest. `homeOffered`: er is een Thuis om te kiezen.
  | { kind: 'ask'; chip: 'here'; line: string; reason: StartFailure; homeOffered: boolean };

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
  // Je plek lukte niet: vragen, nooit stil terug op Thuis of Ongeveer.
  return { kind: 'ask', chip: 'here', line: askStartLine(i.found.reason, !!home), reason: i.found.reason, homeOffered: !!home };
}

function planUnread(i: StartPlanInput): StartPlan {
  const tap = i.tap ? validStartPoint(i.tap) : undefined;
  if (tap) return { kind: 'tap', chip: 'here', point: tap, line: START_LINE_TAP };
  const place = i.place ? validStartPoint(i.place) : undefined;
  if (place) return { kind: 'place', chip: 'here', point: place, line: '' };
  if (i.mode === 'approx') return { kind: 'approx', chip: 'here', line: START_LINE_APPROX };
  if (!i.found) return { kind: 'locate', chip: 'here', line: START_LINE_HOME_UNREAD };
  if (i.found.ok) return { kind: 'here', chip: 'here', point: i.found.point, line: START_LINE_HOME_UNREAD };
  return { kind: 'ask', chip: 'here', line: askStartLineHomeUnread(i.found.reason), reason: i.found.reason, homeOffered: false };
}

// Of er gezocht mag worden: er is een startpunt. Niet zolang je plek nog bepaald wordt, en niet bij de
// vraag (`ask`): dan wacht de zoektocht op je tik.
export const startReady = (plan: StartPlan | undefined): boolean => plan !== undefined && plan.kind !== 'locate' && plan.kind !== 'ask';

// Wat de regie van Route uit een plan haalt, in één pure functie (Warden 14 november): of er gezocht mag
// worden, de vraag als je plek niet lukte, de regel onder de chips, en of de stap Je plek bepalen erbij
// hoort. Die stap staat er alleen zolang je plek bepaald wordt of als er een verse plek van deze poging
// is (`here`): na een mislukte plek en een tik op Thuis is er geen plek die je afgevinkt ziet staan.
export interface StartView {
  ready: boolean;
  ask: { line: string; homeOffered: boolean } | undefined;
  line: string;
  hereMode: boolean;
}
export function startView(plan: StartPlan | undefined): StartView {
  const ask = plan?.kind === 'ask' ? { line: plan.line, homeOffered: plan.homeOffered } : undefined;
  return {
    ready: startReady(plan),
    ask,
    // De reden staat in het vak van de vraag, niet nog eens onder de chips.
    line: ask ? '' : plan?.line ?? '',
    hereMode: plan?.kind === 'locate' || plan?.kind === 'here',
  };
}

// Of er nu gezocht mag worden: niet bij sluiten, niet voor de Briefing het toestaat, niet zonder ja op de
// eerste vraag, niet zonder startpunt (ook niet bij de vraag), niet als het antwoord er al is, en niet zonder plaats.
export const maySearch = (i: { closing: boolean; enabled: boolean; asked: boolean; ready: boolean; searchNeeded: boolean; hasPlace: boolean }): boolean =>
  !i.closing && i.enabled && i.asked && i.ready && i.searchNeeded && i.hasPlace;

// Of de plek nu gevraagd wordt: alleen bij `locate` en hoogstens één keer per poging. Opnieuw is een
// nieuwe poging, dus precies één nieuwe vraag.
export const locateNow = (kind: StartPlan['kind'] | undefined, askedFor: number | undefined, attempt: number): boolean => kind === 'locate' && askedFor !== attempt;

// Of een antwoord op de vraag om je plek nog telt: alleen voor de poging die hem stelde. Een laat
// antwoord van een oude poging overschrijft het nieuwe nooit.
export const locateAnswerCounts = (askedFor: number | undefined, answerFor: number): boolean => askedFor === answerFor;

// ---------- De kaart zonder lus (eigenaar 15 november: "soms wil je gewoon een startpunt selecteren") ----------
// Lukt je plek niet, dan staat de kaart er toch, zonder lussen: een tik zet de ring en Start hier zoekt vanaf
// dat punt (storage/routeStart.ts#startFromMap). Het midden van de kaart is nooit een startpunt: geen ring,
// geen zoektocht, nooit stil Thuis (besluit 2026-11-14-geen-stille-thuis.md). Volgorde: de laatste grove plek
// van het toestel van deze poging (op drie decimalen), dan Thuis, dan je plaats voor het weer (afgerond op
// twee decimalen, zoals Ongeveer);
// zonder iets een overzicht met een regel.
export const ASK_MAP_HINT = 'Tik op de kaart waar je wilt beginnen.';
export const ASK_MAP_OVERVIEW = 'Tik op de kaart waar je wilt beginnen, of kies hierboven Andere plek.';

export type AskMapCenter = { kind: 'device' | 'home' | 'town'; point: RoutePoint; line: string } | { kind: 'overview'; line: string };

export function askMapCenter(i: { rough?: unknown; home?: unknown; town?: unknown }): AskMapCenter {
  const rough = validStartPoint(i.rough);
  if (rough) return { kind: 'device', point: roundHere(rough), line: ASK_MAP_HINT };
  const home = validStartPoint(i.home);
  if (home) return { kind: 'home', point: home, line: ASK_MAP_HINT };
  const town = validStartPoint(i.town);
  if (town) return { kind: 'town', point: { lat: Math.round(town.lat * 100) / 100, lon: Math.round(town.lon * 100) / 100 }, line: ASK_MAP_HINT };
  return { kind: 'overview', line: ASK_MAP_OVERVIEW };
}
