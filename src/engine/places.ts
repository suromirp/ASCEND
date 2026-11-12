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
// En hoogstens dit veelvoud van de gevraagde hoogtemeters: 900 voor een training van 300 past niet.
export const MAX_ASCENT_SHARE = 1.25;
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
  // Een doel dat geen getal is vraagt niets: zo komt een NaN nooit in een zin of een grens.
  if (!Number.isFinite(target.ascentM) || !Number.isFinite(target.distanceKm)) return { kind: 'none', minutes: mins };
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
  const setting = settingKm === null || settingKm === Infinity ? Infinity : Number.isFinite(settingKm) && settingKm > 0 ? settingKm : PLACE_REACH_DEFAULT_KM;
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

// Of een route past: de afstand past (routePlanner.ts#fitsDistance) en, als de training hoogtemeters
// vraagt, ligt de stijging tussen SUGGEST_SHARE en MAX_ASCENT_SHARE daarvan. Getoetst als
// !(x <= grens), zodat een NaN nooit past.
function routeFits(route: SavedRoute, target: RouteTarget): boolean {
  if (!fitsDistance(route, target) || !Number.isFinite(route.distanceM)) return false;
  if (target.ascentM < MIN_ASCENT_TARGET_M) return true;
  return route.ascentM >= target.ascentM * SUGGEST_SHARE && route.ascentM <= target.ascentM * MAX_ASCENT_SHARE;
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
      const raw = missScore(route, target);
      return { route, score: Number.isFinite(raw) ? raw : Infinity, fits, runs, line: routeLine(route, fits, runs) };
    })
    .sort((a, b) => (a.fits !== b.fits ? (a.fits ? -1 : 1) : (a.score - b.score || 0) || b.runs - a.runs || byText(a.route.name, b.route.name) || byText(a.route.id, b.route.id)));
}

// ---------- Bij welke plek ----------

// De dichtstbijzijnde plek binnen `withinM` (standaard 300 m), of geen. Bij gelijke afstand de naam,
// dan het id.
export function nearestPlace(point: RoutePoint, places: readonly Place[], withinM = NEAR_PLACE_M): Place | undefined {
  let best: { place: Place; m: number } | undefined;
  for (const place of places) {
    const m = metersBetween(point, placePoint(place));
    if (!(m <= withinM)) continue;
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
// Alleen een eindig getal van minstens nul telt als bekend.
const known = (x: number | undefined): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;

// Hoeveel een route haalt van wat de training vraagt (0 tot ruim 1), op de maat van de vraag; of
// onbekend.
function share(need: Extract<PlaceNeed, { kind: 'ascent' | 'long' }>, value: { ascentM?: number; distanceM?: number }): number | undefined {
  if (need.kind === 'ascent') return known(value.ascentM) && need.ascentM > 0 ? value.ascentM / need.ascentM : undefined;
  return known(value.distanceM) && need.distanceKm > 0 ? value.distanceM / (need.distanceKm * 1000) : undefined;
}

// Hoogstens één plek met zijn beste route, de afstand hemelsbreed en één zin waarom, of niets.
// - Alleen als de training iets vraagt (placeNeed) en de plek binnen `maxKm` ligt (op de grens telt mee).
// - Alleen een route die past (routeFits, dezelfde regel als Past in rankSavedRoutes): de afstand past,
//   en gevraagde hoogtemeters haalt hij tussen SUGGEST_SHARE en MAX_ASCENT_SHARE. 40 km voor een
//   training van 8 km, of 900 hoogtemeters voor 300, is geen voorstel.
// - Alleen als het startpunt van nu ruim onder blijft: onder SUGGEST_SHARE. Wat het startpunt kan is het
//   beste van `here` en de routes met een passende afstand van een plek binnen NEAR_PLACE_M van het
//   startpunt. Onbekend telt als niet genoeg; de zin noemt dan niets over hier.
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
  let hereShare = share(need, here);
  if (atStart) {
    for (const r of routes) {
      if (r.placeId !== atStart.id || !fitsDistance(r, target)) continue;
      const s = share(need, r);
      if (s !== undefined) hereShare = Math.max(hereShare ?? 0, s);
    }
  }
  if (hereShare !== undefined && hereShare >= SUGGEST_SHARE) return undefined;
  const maxM = maxKm * 1000;
  const candidates: { place: Place; route: SavedRoute; distanceM: number; score: number }[] = [];
  for (const place of places) {
    if (atStart && place.id === atStart.id) continue;
    const distanceM = metersBetween(start, placePoint(place));
    // Een grens die geen getal is, is geen grens maar geen voorstel.
    if (!(distanceM > NEAR_PLACE_M) || !(distanceM <= maxM)) continue;
    const own = routes.filter((r) => r.placeId === place.id && routeFits(r, target));
    const best = rankSavedRoutes(own, target, logs)[0];
    if (best) candidates.push({ place, route: best.route, distanceM, score: best.score });
  }
  candidates.sort((a, b) => a.distanceM - b.distanceM || a.score - b.score || byText(a.place.name, b.place.name) || byText(a.place.id, b.place.id));
  const pick = candidates[0];
  if (!pick) return undefined;
  return { ...pick, line: suggestLine(need, pick, hereShare) };
}

function suggestLine(need: Extract<PlaceNeed, { kind: 'ascent' | 'long' }>, pick: { place: Place; route: SavedRoute; distanceM: number }, hereShare: number | undefined): string {
  const away = `${wholeKm(pick.distanceM)} hemelsbreed.`;
  if (need.kind === 'ascent') {
    const got = formatNumberNL(round10(pick.route.ascentM), 0);
    const asked = formatNumberNL(round10(need.ascentM), 0);
    const hereText = hereShare === undefined ? '' : `, hier ${formatNumberNL(round10(hereShare * need.ascentM), 0)}`;
    return `${pick.place.name} haalt ${got} van je ${asked} hoogtemeters${hereText}. ${away}`;
  }
  return `Je route van ${kmText(pick.route.distanceM)} bij ${pick.place.name} past. ${away}`;
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

// Hoogstens zoveel chips onder Start bij (Pathfinder, eis 1).
export const START_CHIPS_MAX = 4;

// De chips onder Start bij: Waar je nu bent, Thuis (als die er is), de voorgestelde plek (als die er
// is), je bewaarde plekken (de recentste eerst) en Andere plek, samen hoogstens vier. Een plek die je
// voor deze training tikte blijft erbij, ook als hij niet bij de recentste hoort. Gekozen volgt
// Startpunt van je lus (`exact` is Thuis; zonder Thuis Waar je nu bent; Ongeveer valt onder Waar je nu
// bent), tenzij je voor deze training zelf een chip tikte (`picked`, het placeId of de soort). Een
// voorstel wordt nooit vanzelf gekozen. `otherLabel`: de naam van een gezochte plek op Andere plek.
export function startChoices(setting: RouteStartMode, places: readonly Place[], suggestion?: Pick<PlaceSuggestion, 'place'>, picked?: string, otherLabel?: string): StartChoices {
  const home = homeOf(places);
  const chips: StartChip[] = [HERE_CHIP];
  if (home) chips.push({ kind: 'home', label: home.name, placeId: home.id });
  if (suggestion && suggestion.place.id !== home?.id) chips.push({ kind: 'place', label: suggestion.place.name, placeId: suggestion.place.id });
  const room = START_CHIPS_MAX - chips.length - 1;
  const shown = new Set(chips.map((c) => c.placeId));
  const recent = places
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => !p.home && !shown.has(p.id))
    .sort((a, b) => (a.p.createdAt === b.p.createdAt ? b.i - a.i : a.p.createdAt < b.p.createdAt ? 1 : -1))
    .map(({ p }) => p);
  const keep = recent.slice(0, Math.max(0, room));
  const tappedPlace = recent.find((p) => p.id === picked);
  if (tappedPlace && room > 0 && !keep.includes(tappedPlace)) keep[keep.length - 1] = tappedPlace;
  for (const p of keep) chips.push({ kind: 'place', label: p.name, placeId: p.id });
  chips.push(otherLabel ? { ...OTHER_CHIP, label: otherLabel } : OTHER_CHIP);
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
  const withEle = Number.isFinite(p.ele) && Number.isFinite(a.ele) && Number.isFinite(b.ele);
  const bz = withEle ? b.ele! - a.ele! : 0;
  const pz = withEle ? p.ele! - a.ele! : 0;
  const len2 = bx * bx + by * by + bz * bz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by + pz * bz) / len2));
  return Math.hypot(px - t * bx, py - t * by, pz - t * bz);
}

// Het verste punt van het stuk from-to, en hoe ver het ligt. Liggen er meer even ver (op hele meters),
// dan het punt het dichtst bij het midden: anders pelt een zigzag alleen de uiteinden af.
function worstOf(points: readonly RoutePoint[], from: number, to: number): { at: number; d: number } {
  const mid = (from + to) / 2;
  let at = -1;
  let d = -1;
  for (let i = from + 1; i < to; i++) {
    const di = offsetFromSegment(points[i], points[from], points[to]);
    const ri = Math.round(di);
    const rd = Math.round(d);
    if (ri > rd || (ri === rd && Math.abs(i - mid) < Math.abs(at - mid))) {
      d = di;
      at = i;
    }
  }
  return { at, d };
}

interface Piece {
  from: number;
  to: number;
  at: number;
  d: number;
}

// Een kleine heap: het stuk met de grootste afwijking bovenaan, afgerond op hele meters. Bij gelijke
// afwijking het langste stuk, dan het eerste: anders komen bij een zigzag (overal dezelfde afwijking)
// alle punten aan het begin en blijft de rest van het spoor een rechte lijn.
const above = (a: Piece, b: Piece) => {
  const da = Math.round(a.d);
  const db = Math.round(b.d);
  if (da !== db) return da > db;
  const span = a.to - a.from - (b.to - b.from);
  return span !== 0 ? span > 0 : a.from < b.from;
};
function push(heap: Piece[], piece: Piece) {
  heap.push(piece);
  let i = heap.length - 1;
  while (i > 0) {
    const up = (i - 1) >> 1;
    if (!above(heap[i], heap[up])) break;
    [heap[i], heap[up]] = [heap[up], heap[i]];
    i = up;
  }
}
function pop(heap: Piece[]): Piece {
  const top = heap[0];
  const last = heap.pop()!;
  if (heap.length > 0) {
    heap[0] = last;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < heap.length && above(heap[l], heap[m])) m = l;
      if (r < heap.length && above(heap[r], heap[m])) m = r;
      if (m === i) break;
      [heap[i], heap[m]] = [heap[m], heap[i]];
      i = m;
    }
  }
  return top;
}

// Een spoor dun maken: Douglas-Peucker die steeds het stuk met de grootste afwijking eerst splitst. Hij
// stopt als elke afwijking binnen ongeveer vijf meter ligt, of bij `maxPoints` punten; dan blijven de
// punten met de grootste afwijking, verspreid over het hele spoor. Begin en eind blijven altijd. Punten
// zonder geldige breedte of lengte vallen weg; een hoogte die geen getal is telt als geen hoogte. Leeg
// blijft leeg, één punt blijft één punt. Het spoor zelf verandert niet.
export function simplifyTrack(points: readonly RoutePoint[], maxPoints = ROUTE_MAX_POINTS): RoutePoint[] {
  const max = Number.isFinite(maxPoints) ? Math.max(2, Math.floor(maxPoints)) : ROUTE_MAX_POINTS;
  const clean = points
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
    .map((p): RoutePoint => (Number.isFinite(p.ele) ? { lat: p.lat, lon: p.lon, ele: p.ele } : { lat: p.lat, lon: p.lon }));
  if (clean.length <= 2) return clean;
  const keep = new Array<boolean>(clean.length).fill(false);
  keep[0] = true;
  keep[clean.length - 1] = true;
  let count = 2;
  const heap: Piece[] = [];
  const add = (from: number, to: number) => {
    if (to - from < 2) return;
    const { at, d } = worstOf(clean, from, to);
    if (at !== -1 && d > SIMPLIFY_TOLERANCE_M) push(heap, { from, to, at, d });
  };
  add(0, clean.length - 1);
  while (heap.length > 0 && count < max) {
    const piece = pop(heap);
    keep[piece.at] = true;
    count++;
    add(piece.from, piece.at);
    add(piece.at, piece.to);
  }
  return clean.filter((_, i) => keep[i]);
}

export interface TrackFacts {
  distanceM: number;
  ascentM: number;
  loop: boolean;
}

// Afstand en hoogtemeters (met de teller van engine/elevation.ts via routeGeometry.ts#ascentOf) en of het een lus is.
// Een punt zonder geldige breedte of lengte telt niet mee; een hoogte die geen getal is telt als geen hoogte.
export function trackFacts(points: readonly RoutePoint[]): TrackFacts {
  const list = points
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
    .map((p): RoutePoint => (Number.isFinite(p.ele) ? { lat: p.lat, lon: p.lon, ele: p.ele } : { lat: p.lat, lon: p.lon }));
  return { distanceM: Math.round(lineLength(list)), ascentM: Math.round(ascentOf(list)), loop: isLoopRoute({ points: list }) };
}
