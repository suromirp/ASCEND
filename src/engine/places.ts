// ASCEND: Plekken en bewaarde routes, het pure deel (docs/visie/Ontwerp Plekken en routes.md, hoofdstuk 3).
// Zonder React, IndexedDB of netwerk; twee keer dezelfde invoer geeft twee keer hetzelfde. Bovenaan wat
// de opslag nodig heeft (spoor 1), daaronder de rest van hoofdstuk 3 (spoor 2, besluit
// docs/beslissingen/2026-11-11-plekken-engine.md). Niets hier verandert de planning.

import { ascentOf, lineLength, metersBetween } from './routeGeometry';
import { MIN_ASCENT_TARGET_M, fitsDistance, missScore } from './routePlanner';
import { roundExact, validStartPoint, type RouteStartMode } from './routeStart';
import { hasRole } from './templateRoles';
import { formatNumberNL } from '../utils/number';
import { ROUTE_MAX_POINTS, type Place, type PlaceSource, type SavedRoute } from '../models/place';
import type { RoutePoint, RouteTarget } from '../models/route';
import type { SessionLog, SessionTemplate } from '../models/training';

// Het vaste id en de naam van de plek Thuis. Eén vast id: twee keer migreren of twee keer hetzelfde
// punt zetten kan zo nooit twee keer Thuis geven.
export const HOME_PLACE_ID = 'place_home';
export const HOME_NAME = 'Thuis';

// Een route is een lus als het eindpunt binnen deze afstand van het begin ligt.
export const LOOP_WITHIN_M = 150;

// De plek Thuis, of geen. Er is er hoogstens één; staan er door een fout twee, dan telt de eerste.
export function homeOf(places: readonly Place[]): Place | undefined {
  return places.find((p) => p.home === true);
}

// De plek Thuis uit een punt: uit een oud Vast punt (de migratie), of uit je plek van nu of een tik op
// de kaart zolang Startpunt van je lus dat punt nog zet. Geen bruikbaar punt: geen plek.
export function homeFromStartPoint(point: unknown, today: string, source: PlaceSource = 'fixed-point'): Place | undefined {
  const valid = validStartPoint(point);
  if (!valid) return undefined;
  const { lat, lon } = roundExact(valid);
  return { id: HOME_PLACE_ID, name: HOME_NAME, lat, lon, home: true, source, createdAt: today };
}

// Thuis op een nieuw punt: naam, kenmerken, herkomst en dag blijven. Zonder Thuis komt er een nieuwe.
export function withHomePoint(places: readonly Place[], point: RoutePoint, today: string, source: PlaceSource): Place[] | undefined {
  const fresh = homeFromStartPoint(point, today, source);
  if (!fresh) return undefined;
  const home = homeOf(places);
  if (!home) return [fresh, ...places.filter((p) => p.id !== fresh.id)];
  return places.map((p) => (p === home ? { ...p, lat: fresh.lat, lon: fresh.lon } : p));
}

// Het punt van een plek, voor Startpunt van je lus.
export const placePoint = (place: Place): RoutePoint => ({ lat: place.lat, lon: place.lon });

// Of een bewaarde route een lus is. Een route van A naar B mag, en zegt dat in zijn regel.
export function isLoopRoute(route: Pick<SavedRoute, 'points'>): boolean {
  const { points } = route;
  if (points.length < 2) return false;
  return metersBetween(points[0], points[points.length - 1]) <= LOOP_WITHIN_M;
}

// ---------- Spoor 2: wat de training vraagt ----------

// Een training vraagt hoogte bij een heuveltraining of een doel van minstens zoveel hoogtemeters.
export const PLACE_ASCENT_NEED_M = 100;
// Vanaf zoveel minuten is een training lang, en geldt de ingestelde grens in plaats van de korte.
export const LONG_TRAINING_MIN = 90;
// De grenzen hemelsbreed (besluit 2026-11-11-plekken-antwoorden.md, punt 4): standaard 75 km,
// instelbaar tot onbeperkt; korter dan 90 minuten (of zonder bekende duur) nooit verder dan 25 km.
export const PLACE_REACH_DEFAULT_KM = 75;
export const SHORT_TRAINING_REACH_KM = 25;
// Een bewaarde route komt pas in een voorstel als hij minstens dit deel haalt van wat de training vraagt.
export const SUGGEST_SHARE = 0.8;
// Bij welke plek een route hoort: binnen 300 m van zijn begin.
export const NEAR_PLACE_M = 300;
// Ligt de gekozen plek verder dan 10 km van huis, dan toont de Briefing het weer daar (punt 5).
export const WEATHER_AT_PLACE_KM = 10;

export type PlaceNeed =
  | { kind: 'ascent'; ascentM: number; distanceKm: number; minutes?: number }
  | { kind: 'long'; distanceKm: number; ascentM: number; minutes: number }
  | { kind: 'none'; minutes?: number };

// Een bruikbaar aantal minuten, of geen: nul, negatief of geen getal is een training zonder duur.
const knownMinutes = (raw: unknown): number | undefined => (typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : undefined);

// Wat de training van een plek vraagt: hoogte, lang, of niets. `minutes` is de duur van deze ene
// training als die afwijkt (de stap van de week of een vaste lengte); anders telt het sjabloon.
// Hoogte gaat voor lang: een lange heuveltraining zoekt eerst hoogtemeters.
export function placeNeed(template: Pick<SessionTemplate, 'id' | 'roles' | 'durationVariants'>, target: RouteTarget, minutes?: number): PlaceNeed {
  const mins = knownMinutes(minutes) ?? knownMinutes(template.durationVariants?.full);
  const ascentM = Math.max(0, target.ascentM);
  if (ascentM >= PLACE_ASCENT_NEED_M || (hasRole(template, 'hills') && ascentM >= MIN_ASCENT_TARGET_M)) {
    return { kind: 'ascent', ascentM, distanceKm: target.distanceKm, minutes: mins };
  }
  if (mins !== undefined && mins >= LONG_TRAINING_MIN) return { kind: 'long', distanceKm: target.distanceKm, ascentM, minutes: mins };
  return { kind: 'none', minutes: mins };
}

// Hoe ver een voorgestelde plek mag liggen, in km. `settingKm` is de instelling Hoe ver (null is Geen
// grens). Korter dan 90 minuten of zonder duur: hoogstens 25 km, ook als de instelling ruimer is.
export function placeReachKm(need: PlaceNeed, settingKm: number | null = PLACE_REACH_DEFAULT_KM): number {
  const setting = settingKm === null ? Infinity : Number.isFinite(settingKm) && settingKm > 0 ? settingKm : PLACE_REACH_DEFAULT_KM;
  const long = need.minutes !== undefined && need.minutes >= LONG_TRAINING_MIN;
  return long ? setting : Math.min(setting, SHORT_TRAINING_REACH_KM);
}

// ---------- Gelopen, afgeleid uit de logs ----------

// De dagen waarop een route gelopen is: een SessionLog bij een geplande training waarvoor hij gekozen
// was. Niets wordt als vlag bewaard. Oplopend, elke dag één keer.
export function routeRunDates(route: Pick<SavedRoute, 'chosenFor'>, logs: readonly Pick<SessionLog, 'plannedSessionId' | 'completedDate'>[]): string[] {
  const ids = new Set((route.chosenFor ?? []).map((c) => c.plannedSessionId));
  if (ids.size === 0) return [];
  const days = new Set<string>();
  for (const log of logs) if (log.plannedSessionId && ids.has(log.plannedSessionId)) days.add(log.completedDate);
  return [...days].sort();
}

// ---------- Bewaarde routes op volgorde ----------

const kmText = (meters: number) => `${formatNumberNL(Math.round(meters / 100) / 10, 1)} km`;
const round10 = (m: number) => Math.round(m / 10) * 10;

export interface RankedRoute {
  route: SavedRoute;
  score: number;
  fits: boolean;
  runs: number;
  line: string;
}

// Of een route past: de afstand past (routePlanner.ts#fitsDistance) en hij haalt de hoogtemeters
// voor minstens SUGGEST_SHARE, als de training hoogtemeters vraagt.
function routeFits(route: SavedRoute, target: RouteTarget): boolean {
  if (!fitsDistance(route, target)) return false;
  return target.ascentM < MIN_ASCENT_TARGET_M || route.ascentM >= target.ascentM * SUGGEST_SHARE;
}

function routeLine(route: SavedRoute, fits: boolean, runs: number): string {
  const climb = round10(route.ascentM);
  const facts = climb >= MIN_ASCENT_TARGET_M ? `${kmText(route.distanceM)} en ${formatNumberNL(climb, 0)} hoogtemeters` : kmText(route.distanceM);
  const ran = runs === 0 ? 'Nog niet gelopen.' : runs === 1 ? 'Je liep hem 1 keer.' : `Je liep hem ${runs} keer.`;
  return `${fits ? 'Past' : 'Wijkt af'}: ${facts}. ${ran}`;
}

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// De bewaarde routes van een plek, best passend bovenaan. Een route die past gaat voor; daarna de score
// van routePlanner.ts#missScore (dezelfde maat als een nieuwe lus, lager is beter); bij gelijke stand
// de route die het vaakst gelopen is, dan de naam, dan het id.
export function rankSavedRoutes(routes: readonly SavedRoute[], target: RouteTarget, logs: readonly Pick<SessionLog, 'plannedSessionId' | 'completedDate'>[] = []): RankedRoute[] {
  return routes
    .map((route) => {
      const fits = routeFits(route, target);
      const runs = routeRunDates(route, logs).length;
      return { route, score: missScore(route, target), fits, runs, line: routeLine(route, fits, runs) };
    })
    .sort((a, b) => (a.fits !== b.fits ? (a.fits ? -1 : 1) : a.score - b.score || b.runs - a.runs || byText(a.route.name, b.route.name) || byText(a.route.id, b.route.id)));
}

// ---------- Bij welke plek ----------

// De dichtstbijzijnde plek binnen `withinM` (standaard 300 m), of geen. Bij gelijke afstand de naam,
// dan het id.
export function nearestPlace(point: RoutePoint, places: readonly Place[], withinM = NEAR_PLACE_M): Place | undefined {
  let best: { place: Place; m: number } | undefined;
  for (const place of places) {
    const m = metersBetween(point, placePoint(place));
    if (m > withinM) continue;
    if (!best || m < best.m || (m === best.m && (byText(place.name, best.place.name) || byText(place.id, best.place.id)) < 0)) best = { place, m };
  }
  return best?.place;
}

// ---------- Een plek voorstellen ----------

// Wat er bij het startpunt van nu kan, als dat bekend is (een gevonden lus of de cache met heuvels).
export interface StartCapacity {
  ascentM?: number;
  distanceM?: number;
}

export interface PlaceSuggestion {
  place: Place;
  route: SavedRoute;
  // Hemelsbreed van het startpunt van nu, in meters.
  distanceM: number;
  line: string;
}

const wholeKm = (meters: number) => `${formatNumberNL(Math.max(1, Math.round(meters / 1000)), 0)} km`;

// Hoeveel een route haalt van wat de training vraagt (0 tot ruim 1), op de maat van de vraag.
function share(need: Extract<PlaceNeed, { kind: 'ascent' | 'long' }>, value: { ascentM?: number; distanceM?: number }): number | undefined {
  if (need.kind === 'ascent') return value.ascentM === undefined ? undefined : value.ascentM / need.ascentM;
  return value.distanceM === undefined || need.distanceKm <= 0 ? undefined : value.distanceM / (need.distanceKm * 1000);
}

// Hoogstens één plek met zijn beste route, de afstand hemelsbreed en één zin waarom, of niets.
// - Alleen als de training iets vraagt (placeNeed) en de plek binnen `maxKm` ligt (op de grens telt mee).
// - Alleen als de beste route daar minstens SUGGEST_SHARE haalt van wat de training vraagt, en het
//   startpunt van nu daar ruim onder blijft: onder SUGGEST_SHARE. Wat het startpunt kan is het beste van
//   `here` en de routes van een plek binnen NEAR_PLACE_M van het startpunt. Onbekend telt als niet genoeg.
// - Een plek bij het startpunt zelf wordt nooit voorgesteld: daar begin je al.
// - Van de plekken die passen komt de dichtstbijzijnde eerst; bij gelijke afstand de beste route
//   (missScore), dan de naam, dan het id.
export function suggestPlace(
  need: PlaceNeed,
  places: readonly Place[],
  routes: readonly SavedRoute[],
  start: RoutePoint,
  maxKm: number,
  here: StartCapacity = {},
  logs: readonly Pick<SessionLog, 'plannedSessionId' | 'completedDate'>[] = [],
): PlaceSuggestion | undefined {
  if (need.kind === 'none' || places.length === 0 || routes.length === 0) return undefined;
  const target: RouteTarget = { distanceKm: need.distanceKm, ascentM: need.ascentM };
  const atStart = nearestPlace(start, places);
  let hereShare = share(need, here) ?? 0;
  if (atStart) {
    for (const r of routes) if (r.placeId === atStart.id) hereShare = Math.max(hereShare, share(need, r) ?? 0);
  }
  if (hereShare >= SUGGEST_SHARE) return undefined;
  const maxM = maxKm * 1000;
  const candidates: { place: Place; route: SavedRoute; distanceM: number; score: number }[] = [];
  for (const place of places) {
    if (atStart && place.id === atStart.id) continue;
    const distanceM = metersBetween(start, placePoint(place));
    if (distanceM <= NEAR_PLACE_M || distanceM > maxM) continue;
    const own = routes.filter((r) => r.placeId === place.id && (share(need, r) ?? 0) >= SUGGEST_SHARE);
    const best = rankSavedRoutes(own, target, logs)[0];
    if (best) candidates.push({ place, route: best.route, distanceM, score: best.score });
  }
  candidates.sort((a, b) => a.distanceM - b.distanceM || a.score - b.score || byText(a.place.name, b.place.name) || byText(a.place.id, b.place.id));
  const pick = candidates[0];
  if (!pick) return undefined;
  return { ...pick, line: suggestLine(need, pick, here.ascentM !== undefined || hereShare > 0 ? hereShare : undefined) };
}

function suggestLine(need: Extract<PlaceNeed, { kind: 'ascent' | 'long' }>, pick: { place: Place; route: SavedRoute; distanceM: number }, hereShare: number | undefined): string {
  const away = `${wholeKm(pick.distanceM)} hemelsbreed.`;
  if (need.kind === 'ascent') {
    const got = formatNumberNL(round10(pick.route.ascentM), 0);
    const asked = formatNumberNL(round10(need.ascentM), 0);
    const hereText = hereShare === undefined ? '' : `, hier ${formatNumberNL(round10(hereShare * need.ascentM), 0)}`;
    return `${pick.place.name} haalt ${got} van je ${asked} hoogtemeters${hereText}. ${away}`;
  }
  const target: RouteTarget = { distanceKm: need.distanceKm, ascentM: need.ascentM };
  const fit = fitsDistance(pick.route, target) ? 'past precies' : `haalt ${kmText(pick.route.distanceM)} van je ${kmText(need.distanceKm * 1000)}`;
  return `Je route van ${kmText(pick.route.distanceM)} bij ${pick.place.name} ${fit}. ${away}`;
}

// Of het weer-vak het weer bij de gekozen plek toont: verder dan 10 km van Thuis. Zonder Thuis telt de
// afstand tot het startpunt van nu.
export const weatherAtPlace = (place: RoutePoint, home: RoutePoint): boolean => metersBetween(place, home) > WEATHER_AT_PLACE_KM * 1000;

// ---------- Start bij: de chips ----------

export type StartChipKind = 'here' | 'home' | 'place' | 'other';
export interface StartChip {
  kind: StartChipKind;
  label: string;
  placeId?: string;
}
export interface StartChoices {
  chips: StartChip[];
  chosen: StartChip;
}

const HERE_CHIP: StartChip = { kind: 'here', label: 'Waar je nu bent' };
const OTHER_CHIP: StartChip = { kind: 'other', label: 'Andere plek' };

// De chips onder Start bij: Waar je nu bent, Thuis (als die er is), de voorgestelde plek (als die er
// is) en Andere plek. Gekozen volgt Startpunt van je lus (`exact` is Thuis; zonder Thuis Waar je nu
// bent; Ongeveer valt onder Waar je nu bent), tenzij je voor deze training zelf een chip tikte
// (`picked`, het placeId of de soort). Een voorstel wordt nooit vanzelf gekozen.
export function startChoices(setting: RouteStartMode, places: readonly Place[], suggestion?: Pick<PlaceSuggestion, 'place'>, picked?: string): StartChoices {
  const home = homeOf(places);
  const chips: StartChip[] = [HERE_CHIP];
  if (home) chips.push({ kind: 'home', label: home.name, placeId: home.id });
  if (suggestion && suggestion.place.id !== home?.id) chips.push({ kind: 'place', label: suggestion.place.name, placeId: suggestion.place.id });
  chips.push(OTHER_CHIP);
  const tapped = picked === undefined ? undefined : chips.find((c) => c.placeId === picked || (c.kind === picked && c.kind !== 'place'));
  const byMode = setting === 'exact' ? chips.find((c) => c.kind === 'home') : undefined;
  return { chips, chosen: tapped ?? byMode ?? HERE_CHIP };
}

// ---------- Een spoor dun maken ----------

// Ongeveer vijf meter nauwkeurig (ontwerp, hoofdstuk 1).
export const SIMPLIFY_TOLERANCE_M = 5;

// Afstand van p tot het stuk a-b in meters, in een plat vlak rond a; met hoogte als die er bij alle
// drie is, zodat een bult in een rechte weg blijft.
function offsetFromSegment(p: RoutePoint, a: RoutePoint, b: RoutePoint): number {
  const k = Math.cos((a.lat * Math.PI) / 180);
  const toXY = (q: RoutePoint) => [(q.lon - a.lon) * 111_320 * k, (q.lat - a.lat) * 110_574] as const;
  const [bx, by] = toXY(b);
  const [px, py] = toXY(p);
  const withEle = p.ele !== undefined && a.ele !== undefined && b.ele !== undefined;
  const bz = withEle ? b.ele! - a.ele! : 0;
  const pz = withEle ? p.ele! - a.ele! : 0;
  const len2 = bx * bx + by * by + bz * bz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by + pz * bz) / len2));
  return Math.hypot(px - t * bx, py - t * by, pz - t * bz);
}

// Douglas-Peucker zonder recursie: welke punten blijven bij deze tolerantie.
function keepMask(points: readonly RoutePoint[], tolerance: number): boolean[] {
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [from, to] = stack.pop()!;
    let worst = -1;
    let at = -1;
    for (let i = from + 1; i < to; i++) {
      const d = offsetFromSegment(points[i], points[from], points[to]);
      if (d > worst) {
        worst = d;
        at = i;
      }
    }
    if (at !== -1 && worst > tolerance) {
      keep[at] = true;
      stack.push([from, at], [at, to]);
    }
  }
  return keep;
}

// Een spoor dun maken: eerst tot ongeveer vijf meter nauwkeurig; zijn het dan nog meer dan `maxPoints`
// punten, dan wordt de tolerantie verdubbeld tot het past. Begin en eind blijven altijd. Leeg blijft
// leeg, één punt blijft één punt. Het spoor zelf verandert niet.
export function simplifyTrack(points: readonly RoutePoint[], maxPoints = ROUTE_MAX_POINTS): RoutePoint[] {
  const max = Math.max(2, Math.floor(maxPoints));
  const clean = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  if (clean.length <= 2) return clean.map((p) => ({ ...p }));
  let tolerance = SIMPLIFY_TOLERANCE_M;
  for (let round = 0; round < 40; round++) {
    const keep = keepMask(clean, tolerance);
    const out = clean.filter((_, i) => keep[i]);
    if (out.length <= max) return out.map((p) => ({ ...p }));
    tolerance *= 2;
  }
  // Komt in de praktijk niet voor; dan begin en eind.
  return [{ ...clean[0] }, { ...clean[clean.length - 1] }];
}

export interface TrackFacts {
  distanceM: number;
  ascentM: number;
  loop: boolean;
}

// Afstand en hoogtemeters (met de dode band van routeGeometry.ts#ascentOf) en of het een lus is.
export function trackFacts(points: readonly RoutePoint[]): TrackFacts {
  const list = [...points];
  return { distanceM: Math.round(lineLength(list)), ascentM: Math.round(ascentOf(list)), loop: isLoopRoute({ points: list }) };
}
