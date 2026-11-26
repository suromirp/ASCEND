// ASCEND: twee lussen voor een training vanaf een startpunt. Simpel: dezelfde helling op en af tot
// de hoogtemeters er zijn (of, bij een vlakke training, heen en terug over hetzelfde pad).
// Avontuurlijk: één lange lus langs zoveel mogelijk verschillende hellingen en onverharde paden,
// liefst zonder stukken twee keer. De hellingen en paden komen uit wat ASCEND al via OpenStreetMap
// vindt (models/nearbyTerrain.ts); de stukken ertussen komen van een routeplanner die de aanroeper
// meegeeft (RouteFn). De engine kiest de punten en weegt de antwoorden: zelfde invoer en zelfde
// antwoorden geven dezelfde lus. Het is een voorstel om te lopen: het plant niets en bewaart niets.
// Zie docs/beslissingen/2026-11-09-routeplanner.md.

import type { NearbyTerrain, TerrainFeature } from '../models/nearbyTerrain';
import type { AvoidArea, RouteAnswer, RouteFailure, RouteFn, RoutePoint, RouteProposal, RouteTarget, RoutedLine, WalkRates } from '../models/route';
import { crossesAny, insideAny, tooTiny } from './routeAdjust';
import { isNearlyFlat, modelThresholdM } from './elevation';
import { ASCENT_DEAD_BAND_M, ascentOf, bearing, bigRoadMeters, cumulative, deadEnds, lineLength, loopDeadEnds, metersBetween, offsetPoint, repeatedShare, withoutDeadEnds } from './routeGeometry';
import { formatNumberNL } from '../utils/number';
import { hikeMinutes, NORM_WALK_RATES, walkTimeText } from './hikeTarget';
import { driveMinutes, roadKm, walkMinutes, WALKABLE_ROAD_KM } from './trainingSpots';

// Hoogstens zoveel aanroepen van de routeplanner per soort lus: de openbare dienst is van vrijwilligers.
export const MAX_ROUTE_CALLS = 3;
// Onder deze hoogte is een helling geen helling om herhalingen op te lopen.
export const MIN_CLIMB_M = 10;
// Onder deze stijging vraagt de training geen hoogtemeters: dan zoekt Simpel geen helling.
export const MIN_ASCENT_TARGET_M = 20;
export const MAX_REPEATS = 20;
export const MAX_VIAS = 8;
// Een lus over paden is langer dan hemelsbreed: een schatting, de routeplanner geeft de echte lengte.
const DETOUR = 1.3;
// Binnen deze afwijking van de afstand is een lus goed genoeg en vraagt de planner niets meer op.
export const CLOSE_ENOUGH = 0.12;
// Onder dit deel van de hoogtemeters van de training haalt een lus de hoogte niet.
export const SHORT_ASCENT = 0.75;
// De afstand van de training is het doel: een lus die er meer dan dit deel onder blijft telt als
// mislukt, en de planner zoekt verder. Langer mag tot CLOSE_ENOUGH.
export const SHORT_LIMIT = 0.1;
// Onder dit deel van de gevraagde afstand is een voorstel te ver af om naast een ander voorstel te tonen.
export const FAR_OFF = 0.7;
// Ligt het eerste punt van de lijn verder dan dit van het startpunt (de routeplanner begint op het
// dichtstbijzijnde pad), dan krijgt de lus een recht stukje van en naar het startpunt.
export const START_SNAP_M = 10;
// Vanaf deze afstand tot het dichtstbijzijnde pad zegt de lus het erbij.
export const START_GAP_NOTE_M = 100;
// Een helling zonder bekende hoogte: de planner rekent met deze schatting en zet hem achteraan.
const UNKNOWN_HILL_M = 20;
// Na een lus die niet past mikt de volgende poging hier (deel van de afstand): net erboven.
const AIM_LONG = 1.03;
const NEAR_START_M = 250;
const SAME_SPOT_M = 200;

export interface PlanInput {
  start: RoutePoint;
  target: RouteTarget;
  terrain?: NearbyTerrain;
  // Het startpunt is een echt punt van de gebruiker (Precies): de lus begint en eindigt er precies.
  anchor?: boolean;
  // Stukken die de lus moet mijden (Vermijd dit stuk). Een punt erin wordt geen doel, de routeplanner
  // krijgt ze mee, en een lus die er toch doorheen gaat telt niet (dan is er geen weg omheen).
  avoid?: AvoidArea[];
  // De klok, voor de leeftijd van de kaart; standaard nu.
  now?: Date;
  // Simpel met een keuze (I-160): begint op de voet van de steilste helling en geeft beide uitkomsten,
  // Hoogtemeters halen en Afstand houden (RoutePlans.choices). Zonder: de oude som (het kleinste van beide).
  loop?: LoopOptions;
}

// Wat voorgaat in een lus met één helling: de hoogtemeters van de training (langer) of de afstand (minder hm).
export type LoopPriority = 'ascent' | 'distance';
export interface LoopOptions {
  priority: LoopPriority;
  // Zoveel minuten rijden mag de voet van de helling liggen (instelling Rijtijd naar heuvels). 0: niet
  // rijden, alleen lopen; undefined: geen grens.
  driveLimitMin?: number;
}
// Ligt de voet van de helling verder dan dit van je plek, dan begint Simpel op de voet (I-160).
export const FOOT_START_M = 1000;

const routeOptions = (input: PlanInput) => (input.avoid && input.avoid.length > 0 ? { avoid: input.avoid } : undefined);
// Een lus die door een vermeden stuk gaat, of na bijsturen onder 1 km komt, is geen lus.
const usable = (input: PlanInput, p: RouteProposal) => !crossesAny(p.points, input.avoid) && !tooTiny(p);

// `at: 'start'`: bij het startpunt zelf ligt geen pad; een andere lus proberen heeft dan geen zin.
// `farOff`: er was wel een lus, maar hij zat ver onder de afstand en een ander voorstel past (zie proposeRoutes).
export type PlanOutcome = { ok: true; proposal: RouteProposal } | { ok: false; reason: RouteFailure | 'nothing'; at?: 'start'; farOff?: true };

// Wat er in het zoekgebied op de kaart ligt: het aantal hellingen waar de planner mee werkt, en de
// hoogste (hoeveel hoger dan de plek). Alleen in het geheugen, voor de uitleg in het paneel.
export interface TerrainFound {
  // Hellingen met een bekende hoogte van minstens MIN_CLIMB_M.
  hills: number;
  // Hellingen waarvan de kaart de hoogte niet kent: ze tellen niet mee als helling.
  unknown: number;
  // Hellingen met een bekende hoogte die lager liggen dan MIN_CLIMB_M boven de plek (ook onder de plek).
  lower: number;
  tallestM?: number;
  radiusM: number;
}

export interface RoutePlans {
  simple: PlanOutcome;
  adventure: PlanOutcome;
  // Ontbreekt als de kaart niet antwoordde: dan is er niets geteld, ook geen nul.
  found?: TerrainFound;
  // De kaart van de omgeving ontbrak ('none') of was ouder dan MAP_OLD_DAYS ('old'); ontbreekt als hij actueel was.
  map?: 'none' | 'old';
  // Een melding over de hele zoektocht (bijvoorbeeld geen pad bij het startpunt).
  notice?: string;
  // Met PlanInput.loop: Simpel voor beide keuzes en Avontuurlijk zoals hij kwam, voor plansWithPriority.
  choices?: { simple: Record<LoopPriority, PlanOutcome>; adventure: PlanOutcome };
}

const knownHill = (f: TerrainFeature) => f.kind === 'hill' && f.heightM !== undefined && f.heightM >= MIN_CLIMB_M;
const unknownHill = (f: TerrainFeature) => f.kind === 'hill' && f.heightM === undefined;
const usableHill = (f: TerrainFeature) => knownHill(f) || unknownHill(f);
const reversed = (points: RoutePoint[]) => [...points].reverse();

// Hoe ver een lus van de training af zit: afstand en, als de training hoogtemeters vraagt, de stijging.
export function missScore(p: Pick<RouteProposal, 'distanceM' | 'ascentM'>, target: RouteTarget): number {
  const d = target.distanceKm * 1000;
  const dist = d > 0 ? Math.abs(p.distanceM - d) / d : 0;
  const asc = target.ascentM >= MIN_ASCENT_TARGET_M ? Math.abs(p.ascentM - target.ascentM) / target.ascentM : 0;
  // Vlak gekozen (Wandeling plannen): elke 20 m stijgen per kilometer weegt als een lus die de helft te lang is.
  const flat = target.flat && target.distanceKm > 0 ? p.ascentM / target.distanceKm / FLAT_ASCENT_PER_KM : 0;
  return dist + asc + flat;
}

// Bij Vlak: zoveel meter stijgen per kilometer telt als een afstand die een hele afstand mis zit (missScore).
export const FLAT_ASCENT_PER_KM = 40;

// "je training", of "je wandeling" bij een wandeling die je zelf plant (engine/walkPlan.ts).
export const aimWord = (target: Pick<RouteTarget, 'plannedWalk'> | undefined): string => (target?.plannedWalk ? 'je wandeling' : 'je training');

export const tooShort = (p: Pick<RouteProposal, 'distanceM'>, target: RouteTarget): boolean => p.distanceM < target.distanceKm * 1000 * (1 - SHORT_LIMIT);
// De afstand past: niet meer dan SHORT_LIMIT korter en niet meer dan CLOSE_ENOUGH langer.
export const fitsDistance = (p: Pick<RouteProposal, 'distanceM'>, target: RouteTarget): boolean => !tooShort(p, target) && p.distanceM <= target.distanceKm * 1000 * (1 + CLOSE_ENOUGH);

// Zoveel doodlopende stukken hoort een lus te hebben: heen en terug (Simpel) één, een lus geen.
export const allowedDeadEnds = (style: RouteProposal['style']): number => (style === 'simple' ? 1 : 0);
export const extraDeadEnds = (p: Pick<RouteProposal, 'style' | 'deadEnds'>): number => Math.max(0, (p.deadEnds ?? 0) - allowedDeadEnds(p.style));

// Een lus zonder tak mag zoveel van de gevraagde afstand afwijken (naar beide kanten) en toch winnen van een lus met een tak.
export const SPUR_FREE_MARGIN = 0.15;
export const withinMargin = (p: Pick<RouteProposal, 'distanceM'>, target: RouteTarget): boolean => Math.abs(p.distanceM - target.distanceKm * 1000) <= target.distanceKm * 1000 * SPUR_FREE_MARGIN;

// Een lus waarvan de afstand past gaat voor op een die niet past; dan een met minder doodlopende stukken
// dan bij zijn soort hoort (een Y valt af als er een betere is); daarna de score (lager is beter).
function better(a: RouteProposal, b: RouteProposal | undefined, target: RouteTarget, score: (p: RouteProposal) => number): boolean {
  if (!b) return true;
  const ea = extraDeadEnds(a);
  const eb = extraDeadEnds(b);
  // Avontuurlijk: een lus zonder tak gaat voor, ook als zijn afstand tot SPUR_FREE_MARGIN afwijkt.
  if (a.style === 'adventure' && ea !== eb) {
    const clean = ea < eb ? a : b;
    if (withinMargin(clean, target)) return clean === a;
  }
  const fa = fitsDistance(a, target);
  if (fa !== fitsDistance(b, target)) return fa;
  if (ea !== eb) return ea < eb;
  return score(a) < score(b);
}

// De lijn van de routeplanner begint op het dichtstbijzijnde pad, niet bij het startpunt zelf. Met
// een recht stukje ervoor (en erachter als de lijn bij het startpunt eindigt) begint en eindigt de
// lus bij het startpunt. Geeft ook hoe ver het pad van het startpunt ligt.
export function anchorLine(points: RoutePoint[], start: RoutePoint, both: boolean): { points: RoutePoint[]; gapM: number } {
  if (points.length === 0) return { points, gapM: 0 };
  const stub = (near: RoutePoint): RoutePoint => (near.ele === undefined ? { lat: start.lat, lon: start.lon } : { lat: start.lat, lon: start.lon, ele: near.ele });
  const first = points[0];
  const last = points[points.length - 1];
  const gapM = metersBetween(start, first);
  const out = gapM > START_SNAP_M ? [stub(first), ...points] : [...points];
  if (both && metersBetween(start, last) > START_SNAP_M) out.push(stub(last));
  return { points: out, gapM };
}

// ---------- Simpel ----------

// De hellingen om te proberen, de best passende eerst: de geschatte lus (heen, herhalingen, terug)
// ligt het dichtst bij de afstand van de training.
export function simpleCandidates(input: PlanInput): RoutePoint[] {
  const { start, target, terrain } = input;
  const d = target.distanceKm * 1000;
  if (target.ascentM < MIN_ASCENT_TARGET_M) return flatCandidates(input);
  const hills = (terrain?.features ?? []).filter(usableHill).map((f) => {
    const crow = metersBetween(start, f);
    const height = f.heightM ?? UNKNOWN_HILL_M;
    const repeats = Math.max(1, Math.round(target.ascentM / height));
    const estimate = 2 * DETOUR * crow + 2 * repeats * (height / 0.06);
    return { f, crow, known: f.heightM !== undefined, miss: Math.abs(estimate - d) / d };
  });
  // Een helling met een bekende hoogte gaat altijd voor op een zonder: die kost anders een van de
  // drie aanroepen aan een plek die misschien vlak is.
  return hills
    .sort((a, b) => Number(b.known) - Number(a.known) || a.miss - b.miss || a.crow - b.crow || a.f.lat - b.f.lat || a.f.lon - b.f.lon)
    .slice(0, MAX_ROUTE_CALLS)
    .map(({ f }) => ({ lat: f.lat, lon: f.lon }));
}

// Vlak: een keerpunt op de helft van de afstand, liefst op een onverhard pad. Het laatste keerpunt
// ligt hemelsbreed op de volle helft: de weg ernaartoe is dan nooit korter dan de helft, en de lus
// wordt op de helft afgeknipt.
function flatCandidates({ start, target, terrain }: PlanInput): RoutePoint[] {
  const full = (target.distanceKm * 1000) / 2;
  const half = full / DETOUR;
  const paths = (terrain?.features ?? [])
    .filter((f) => f.kind === 'dirt_path')
    .map((f) => ({ f, off: Math.abs(metersBetween(start, f) - half) }))
    .sort((a, b) => a.off - b.off || a.f.lat - b.f.lat || a.f.lon - b.f.lon)
    .slice(0, MAX_ROUTE_CALLS - 1)
    .map(({ f }) => ({ lat: f.lat, lon: f.lon }));
  return [...paths, offsetPoint(start, 0, full)];
}

export interface Climb {
  foot: number;
  top: number;
  heightM: number;
  lengthM: number;
}

// De helling op een lijn van het startpunt naar een heuvel: van de voet (het laatste dal voor de
// top) tot de top. De top is het hoogste punt, of `topAt` als de aanroeper hem al weet. Een punt
// zonder hoogte telt nergens mee. Zonder hoogte of met een te lage helling: undefined.
export function climbOnLine(points: RoutePoint[], topAt?: number): Climb | undefined {
  const eleAt = (i: number) => points[i]?.ele;
  let top = topAt ?? -1;
  if (topAt === undefined) {
    for (let i = 0; i < points.length; i++) {
      const e = eleAt(i);
      if (e !== undefined && (top < 0 || e > (eleAt(top) as number))) top = i;
    }
  }
  const max = eleAt(top);
  if (top <= 0 || max === undefined) return undefined;
  let low = max;
  let foot = top;
  for (let i = top - 1; i >= 0; i--) {
    const e = eleAt(i);
    if (e === undefined) continue;
    if (e < low) {
      low = e;
      foot = i;
    } else if (e > low + 2 * ASCENT_DEAD_BAND_M) {
      break; // voorbij het dal: daar begint een andere helling
    }
  }
  if (max - low < MIN_CLIMB_M) return undefined;
  // Een lange vlakke aanloop hoort niet bij de helling: de voet en de top schuiven naar waar het echt stijgt.
  const edge = 1;
  for (let i = foot; i < top; i++) {
    const e = eleAt(i);
    if (e !== undefined && e <= low + edge) foot = i;
  }
  for (let i = foot + 1; i <= top; i++) {
    const e = eleAt(i);
    if (e !== undefined && e >= max - edge) {
      top = i;
      break;
    }
  }
  const heightM = (eleAt(top) as number) - (eleAt(foot) as number);
  const lengthM = lineLength(points.slice(foot, top + 1));
  if (!Number.isFinite(heightM) || heightM < MIN_CLIMB_M || !(lengthM > 0)) return undefined;
  return { foot, top, heightM, lengthM };
}

// De hoogste helling ergens op een lijn: elke top (een punt waarna het meer dan de dode band zakt,
// en het eind) is een kandidaat, met zijn eigen voet. Bij gelijke hoogte de eerste. Geeft de lijn
// tot die top.
export function tallestClimbLine(points: RoutePoint[]): RoutePoint[] | undefined {
  const tops: number[] = [];
  let high = -1;
  for (let i = 0; i < points.length; i++) {
    const e = points[i].ele;
    if (e === undefined) continue;
    if (high < 0 || e > (points[high].ele as number)) high = i;
    else if (e <= (points[high].ele as number) - ASCENT_DEAD_BAND_M) {
      tops.push(high);
      high = i;
    }
  }
  if (high >= 0) tops.push(high);
  let best: { top: number; height: number } | undefined;
  for (const top of tops) {
    const climb = climbOnLine(points, top);
    if (climb && (!best || climb.heightM > best.height)) best = { top: climb.top, height: climb.heightM };
  }
  return best ? points.slice(0, best.top + 1) : undefined;
}

// Het eerste stuk van een lijn tot `meters`, met een punt precies op die afstand.
export function cutAt(points: RoutePoint[], meters: number): RoutePoint[] {
  const cum = cumulative(points);
  if (points.length < 2 || meters >= cum[cum.length - 1]) return points;
  const i = cum.findIndex((c) => c >= meters);
  const span = cum[i] - cum[i - 1];
  const t = span > 0 ? (meters - cum[i - 1]) / span : 0;
  const a = points[i - 1];
  const b = points[i];
  const mid: RoutePoint = { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t };
  if (a.ele !== undefined && b.ele !== undefined) mid.ele = a.ele + (b.ele - a.ele) * t;
  if (b.bigRoad) mid.bigRoad = true;
  if (b.surface) mid.surface = b.surface;
  return [...points.slice(0, i), mid];
}

function proposal(style: RouteProposal['style'], line: RoutedLine, points: RoutePoint[], extra: Partial<RouteProposal> = {}): RouteProposal {
  // Eén drempel per lijn van de routeplanner, ook als de lus er een stuk van is.
  const ascentM = ascentOf(points, modelThresholdM(line.points.map((p) => p.ele)));
  // Een lus telt zijn takken zonder de aanloop (het pad naar de eerste kruising); heen en terug telt alles.
  const ends = (style === 'adventure' ? loopDeadEnds(points) : deadEnds(points)).length;
  const bigRoadM = bigRoadMeters(points);
  return {
    style, source: line.source, points, distanceM: lineLength(points), ascentM, repeatedShare: repeatedShare(points),
    ...(ends > 0 ? { deadEnds: ends } : {}), ...(bigRoadM > 0 ? { bigRoadM } : {}), ...extra,
  };
}

// Van een lijn naar een heuvel een lus met herhalingen: heen naar de voet, zo vaak op en af als de
// hoogtemeters vragen (en de afstand toelaat), en terug.
// Met `loop` (I-160): ligt de voet verder dan FOOT_START_M en is hij te bereiken (footReachable), dan begint
// de lus op de voet, zonder aanloop. Hoogtemeters halen herhaalt tot de hoogtemeters er zijn (hoogstens
// MAX_REPEATS), Afstand houden zo vaak als in de afstand past. Zonder `loop` de oude som.
export function composeSimple(line: RoutedLine, target: RouteTarget, loop?: LoopOptions): RouteProposal | undefined {
  const climb = climbOnLine(line.points, line.points.length - 1) ?? climbOnLine(line.points);
  if (!climb) return undefined;
  // Een tak in de aanloop (de routeplanner liep een doodlopend pad in en uit) is alleen omweg: weg ermee,
  // anders tekent de lus een Y met twee doodlopende takken.
  const fullApproach = withoutDeadEnds(line.points.slice(0, climb.foot + 1));
  const footM = metersBetween(line.points[0], line.points[climb.foot]);
  const fromFoot = !!loop && lineLength(fullApproach) > FOOT_START_M && footReachable(footM, loop.driveLimitMin);
  const approach = fromFoot ? [line.points[climb.foot]] : fullApproach;
  const up = line.points.slice(climb.foot, climb.top + 1);
  const down = reversed(up);
  // De drempel van de hele lijn, ook voor de stukken: anders telt de som van de delen anders dan het geheel.
  const threshold = modelThresholdM(line.points.map((p) => p.ele));
  const base = ascentOf(approach, threshold) + ascentOf(reversed(approach), threshold);
  const perRepeat = Math.max(climb.heightM, ascentOf(up, threshold) + ascentOf(down, threshold));
  const repeats = loop
    ? chosenRepeats(loop.priority, target, base, perRepeat, lineLength(approach), climb.lengthM)
    : oldRepeats(target, base, perRepeat, lineLength(approach), climb.lengthM);
  const points = [...approach];
  for (let i = 0; i < repeats; i++) points.push(...up.slice(1), ...down.slice(1));
  points.push(...reversed(approach).slice(1));
  // Elke herhaling telt voor de hele helling: de dode band zou anders per keer een paar meter van de top afhalen.
  const climbFromM = lineLength(approach);
  // Bij Hoogtemeters halen kapte de afstandsgrens de herhalingen af: de lus zegt dat er minder hoogtemeters in zitten.
  const capped = !!loop && loop.priority === 'ascent' && target.ascentM > base + repeats * perRepeat && repeats === ascentRepeatsCap(target, lineLength(approach), climb.lengthM);
  return proposal('simple', line, points, { ...(capped ? { ascentCapped: true } : {}), ascentM: base + repeats * perRepeat, repeats, climbM: climb.heightM, climbLengthM: climb.lengthM, climbFromM, climbToM: climbFromM + climb.lengthM, repeatedShare: 1, ...(fromFoot ? { footStartM: footM } : {}) });
}

// De oude som: het kleinste van wat de hoogtemeters vragen en wat in anderhalf keer de afstand past.
function oldRepeats(target: RouteTarget, base: number, perRepeat: number, approachM: number, climbLengthM: number): number {
  const byAscent = Math.round((target.ascentM - base) / perRepeat);
  const room = 1.5 * target.distanceKm * 1000 - 2 * approachM;
  const byDistance = Math.floor(room / (2 * climbLengthM));
  return Math.max(1, Math.min(byAscent, byDistance, MAX_REPEATS));
}

// Hoogtemeters halen: naar boven afgerond, zodat de lus de hoogtemeters haalt. Afstand houden: zo vaak als het
// dichtst bij de afstand ligt, en nooit vaker dan de hoogtemeters vragen.
// Hoogtemeters halen mag de lus niet veel langer maken dan de training (I-163): hoogstens zoveel keer de afstand,
// anders de beste lus binnen die grens, met een zin dat er minder hoogtemeters in zitten.
export const MAX_LOOP_DISTANCE_FACTOR = 1.3;
export function ascentRepeatsCap(target: RouteTarget, approachM: number, climbLengthM: number): number {
  const room = MAX_LOOP_DISTANCE_FACTOR * target.distanceKm * 1000 - 2 * approachM;
  return Math.max(1, Math.floor(room / (2 * climbLengthM)));
}
export const ascentCappedLine = (target: RouteTarget): string =>
  `Minder hoogtemeters dan de ${formatNumberNL(Math.round(target.ascentM), 0)} die je vroeg: met meer herhalingen werd de lus meer dan ${formatNumberNL(MAX_LOOP_DISTANCE_FACTOR, 1)} keer zo lang als je training.`;
export function chosenRepeats(priority: LoopPriority, target: RouteTarget, base: number, perRepeat: number, approachM: number, climbLengthM: number): number {
  const byAscent = Math.ceil(Math.max(0, target.ascentM - base) / perRepeat);
  if (priority === 'ascent') return Math.max(1, Math.min(byAscent, MAX_REPEATS, ascentRepeatsCap(target, approachM, climbLengthM)));
  const byDistance = Math.round((target.distanceKm * 1000 - 2 * approachM) / (2 * climbLengthM));
  return Math.max(1, Math.min(byAscent, byDistance, MAX_REPEATS));
}

// Is de voet te bereiken? Lopend altijd (tot WALKABLE_ROAD_KM over de weg), rijdend binnen de rijtijd
// (trainingSpots.ts#driveMinutes, dezelfde schatting als de gids); 0 is niet rijden, undefined geen grens.
export function footReachable(footM: number, driveLimitMin: number | undefined): boolean {
  if (roadKm(footM / 1000) <= WALKABLE_ROAD_KM) return true;
  if (driveLimitMin === undefined) return true;
  return driveLimitMin > 0 && driveMinutes(footM / 1000) <= driveLimitMin;
}

// Vlak: heen tot de helft van de afstand en over hetzelfde pad terug.
export function composeOutAndBack(line: RoutedLine, target: RouteTarget): RouteProposal | undefined {
  if (line.points.length < 2) return undefined;
  const out = cutAt(line.points, (target.distanceKm * 1000) / 2);
  return proposal('simple', line, [...out, ...reversed(out).slice(1)], { repeatedShare: 1 });
}

const failed = (a: RouteAnswer): a is Extract<RouteAnswer, { ok: false }> => !a.ok;
// Zonder netwerk of na de tijdgrens heeft nog een keer vragen geen zin.
const stops = (reason: RouteFailure) => reason === 'offline' || reason === 'timeout';

// `spare`: een lijn die er al is (de avontuurlijke lus). Vindt de kaart geen helling die past, dan
// komt de helling uit die lijn: het stuk van het startpunt tot het hoogste punt, zonder nieuwe aanroep.
export async function proposeSimple(input: PlanInput, route: RouteFn, spare?: RoutedLine): Promise<PlanOutcome> {
  const flat = input.target.ascentM < MIN_ASCENT_TARGET_M;
  const score = (p: RouteProposal) => missScore(p, input.target);
  let best: RouteProposal | undefined;
  let lastFailure: RouteFailure | undefined;
  for (const candidate of simpleCandidates(input).filter((c) => !insideAny(c, input.avoid))) {
    const answer = await route([input.start, candidate], routeOptions(input));
    if (failed(answer)) {
      lastFailure = answer.reason;
      if (stops(answer.reason)) break;
      // Geen pad bij het startpunt zelf: een andere helling verandert daar niets aan.
      if (answer.reason === 'unmapped' && answer.waypoint === 0) return { ok: false, reason: 'unmapped', at: 'start' };
      continue;
    }
    const anchored = input.anchor ? anchorLine(answer.line.points, input.start, false) : { points: answer.line.points, gapM: 0 };
    const line: RoutedLine = { source: answer.line.source, points: anchored.points };
    const made = flat ? composeOutAndBack(line, input.target) : composeSimple(line, input.target);
    if (!made || !usable(input, made)) continue;
    if (anchored.gapM >= START_GAP_NOTE_M) made.startGapM = anchored.gapM;
    if (better(made, best, input.target, score)) best = made;
    // Past de afstand en zit de lus dicht genoeg bij de training, dan vraagt de planner niets meer.
    // Een lus met meer doodlopende stukken dan bij Simpel hoort (een Y) is nog geen reden om te stoppen.
    if (best && fitsDistance(best, input.target) && score(best) <= CLOSE_ENOUGH && extraDeadEnds(best) === 0) break;
  }
  if (!best && !flat && spare) {
    // De lus in beide richtingen: de helling met de kortste aanloop past meestal het best.
    for (const points of [spare.points, reversed(spare.points)]) {
      const line = tallestClimbLine(points);
      const made = line ? composeSimple({ source: spare.source, points: line }, input.target) : undefined;
      if (made && usable(input, made) && better(made, best, input.target, score)) best = made;
    }
  }
  if (best) return { ok: true, proposal: best };
  return { ok: false, reason: lastFailure ?? 'nothing' };
}

// Simpel met een keuze (I-160): de hellingen met een bekende hoogte, de hoogste eerst (Simpel begint aan de
// voet, dus de afstand tot je plek weegt pas daarna); zonder genoeg ook die zonder hoogte.
export function steepCandidates(input: PlanInput): RoutePoint[] {
  const { start, terrain } = input;
  if (input.target.ascentM < MIN_ASCENT_TARGET_M) return flatCandidates(input);
  return (terrain?.features ?? [])
    .filter(usableHill)
    .map((f) => ({ f, crow: metersBetween(start, f), height: f.heightM ?? -1 }))
    .sort((a, b) => b.height - a.height || a.crow - b.crow || a.f.lat - b.f.lat || a.f.lon - b.f.lon)
    .slice(0, MAX_ROUTE_CALLS)
    .map(({ f }) => ({ lat: f.lat, lon: f.lon }));
}

const steepness = (p: RouteProposal) => (p.climbM ?? 0) / Math.max(1, p.climbLengthM ?? 1);
// De steilste helling gaat voor, dan de hoogste; bij gelijk de eerste.
function steeper(a: RouteProposal, b: RouteProposal | undefined): boolean {
  if (!b) return true;
  const d = steepness(a) - steepness(b);
  if (Math.abs(d) > 1e-9) return d > 0;
  return (a.climbM ?? 0) > (b.climbM ?? 0);
}

function bothFrom(line: RoutedLine, input: PlanInput & { loop: LoopOptions }): Record<LoopPriority, RouteProposal> | undefined {
  const ascent = composeSimple(line, input.target, { ...input.loop, priority: 'ascent' });
  const distance = composeSimple(line, input.target, { ...input.loop, priority: 'distance' });
  if (!ascent || !distance || !usable(input, ascent) || !usable(input, distance)) return undefined;
  return { ascent, distance };
}

// Simpel voor beide keuzes, uit dezelfde helling: de steilste van de hoogstens MAX_ROUTE_CALLS die gevraagd
// zijn. Zonder hoogtemeters in de training: heen en terug zoals altijd, voor beide keuzes hetzelfde.
export async function proposeSimpleChoices(input: PlanInput & { loop: LoopOptions }, route: RouteFn, spare?: RoutedLine): Promise<Record<LoopPriority, PlanOutcome>> {
  if (input.target.ascentM < MIN_ASCENT_TARGET_M) {
    const { loop: _loop, ...plain } = input;
    const o = await proposeSimple(plain, route, spare);
    return { ascent: o, distance: o };
  }
  let best: Record<LoopPriority, RouteProposal> | undefined;
  let lastFailure: RouteFailure | undefined;
  for (const candidate of steepCandidates(input).filter((c) => !insideAny(c, input.avoid))) {
    const answer = await route([input.start, candidate], routeOptions(input));
    if (failed(answer)) {
      lastFailure = answer.reason;
      if (stops(answer.reason)) break;
      if (answer.reason === 'unmapped' && answer.waypoint === 0) {
        const o: PlanOutcome = { ok: false, reason: 'unmapped', at: 'start' };
        return { ascent: o, distance: o };
      }
      continue;
    }
    const anchored = input.anchor ? anchorLine(answer.line.points, input.start, false) : { points: answer.line.points, gapM: 0 };
    const both = bothFrom({ source: answer.line.source, points: anchored.points }, input);
    if (!both) continue;
    // Begint de lus op de voet, dan ligt het pad bij je plek niet op de lus: geen regel erover.
    if (anchored.gapM >= START_GAP_NOTE_M) {
      for (const p of [both.ascent, both.distance]) if (p.footStartM === undefined) p.startGapM = anchored.gapM;
    }
    if (steeper(both.distance, best?.distance)) best = both;
  }
  if (!best && spare) {
    // Geen helling van de kaart (of geen kaart): de hoogste helling op de avontuurlijke lus, in beide richtingen.
    for (const points of [spare.points, reversed(spare.points)]) {
      const line = tallestClimbLine(points);
      const both = line ? bothFrom({ source: spare.source, points: line }, input) : undefined;
      if (both && steeper(both.distance, best?.distance)) best = both;
    }
  }
  if (best) return { ascent: { ok: true, proposal: best.ascent }, distance: { ok: true, proposal: best.distance } };
  const o: PlanOutcome = { ok: false, reason: lastFailure ?? 'nothing' };
  return { ascent: o, distance: o };
}

// Het stuk van de lus tussen twee afstanden (meters vanaf de start), met een punt precies op elke grens.
export function stretchOf(points: RoutePoint[], fromM: number, toM: number): RoutePoint[] {
  if (points.length < 2 || !(toM > fromM)) return [];
  const head = cutAt(points, toM);
  const tail = reversed(cutAt(reversed(head), Math.max(0, lineLength(head) - fromM)));
  return tail.length >= 2 ? tail : [];
}

// Simpel met herhalingen: het stuk dat je steeds weer op loopt, om op de kaart te markeren. Anders undefined.
// Per lus één keer uitgerekend: dezelfde lus geeft dezelfde lijst, zodat de kaart niet bij elke render bijwerkt.
const stretchMemo = new WeakMap<RouteProposal, RoutePoint[] | undefined>();
export function climbStretch(p: RouteProposal): RoutePoint[] | undefined {
  // Alleen bij herhalingen: één keer op en af is gewoon heen en terug.
  if (p.style !== 'simple' || !p.repeats || p.repeats < 2 || p.climbFromM === undefined || p.climbToM === undefined) return undefined;
  if (stretchMemo.has(p)) return stretchMemo.get(p);
  const stretch = stretchOf(p.points, p.climbFromM, p.climbToM);
  const out = stretch.length >= 2 ? stretch : undefined;
  stretchMemo.set(p, out);
  return out;
}

// ---------- Avontuurlijk ----------

export interface Via extends RoutePoint {
  hill: boolean;
  value: number;
  angle: number;
  // Een aanvulpunt (geen helling of pad van de kaart): alleen om de lus de lengte te geven.
  pad?: true;
}

// Een deel van de kompasroos waar de lus heen mag (Andere lus, engine/routeOtherLoop.ts): vanaf `from` graden,
// met de klok mee, `span` graden breed. In een boog is `angle` van een punt de hoek vanaf `from`, zodat de lus
// van het begin naar het eind van de boog loopt en terug, ook als de boog over noord heen gaat.
export interface Arc {
  from: number;
  span: number;
}
export const relativeAngle = (angle: number, arc: Arc): number => (((angle - arc.from) % 360) + 360) % 360;
export const inArc = (angle: number, arc: Arc): boolean => relativeAngle(angle, arc) <= arc.span;

const perimeter = (start: RoutePoint, vias: RoutePoint[]) => lineLength([start, ...vias, start]);

// De punten voor de lus: hellingen en onverharde paden binnen bereik, op volgorde van richting rond
// het startpunt (zo kruist de lus zichzelf niet), en uitgedund tot de geschatte lengte past. Een
// helling weegt zwaarder dan een pad, een hoge zwaarder dan een lage. `reach`: hoe ver van het
// startpunt, als deel van de afstand van de training. Zonder iets in de buurt: drie punten op een cirkel.
// Andere lus, Soort (engine/routeOtherLoop.ts): alleen punten van die soort uit dezelfde kaartvraag.
export type LoopKind = 'water' | 'wood' | 'unpaved';
const KIND_FEATURES: Record<LoopKind, (f: TerrainFeature) => boolean> = {
  water: (f) => f.kind === 'water',
  wood: (f) => f.kind === 'wood',
  unpaved: (f) => f.kind === 'dirt_path',
};

export function adventureVias(input: PlanInput, reach = 0.25, arc?: Arc, kind?: LoopKind): Via[] {
  const { start, target, terrain } = input;
  const d = target.distanceKm * 1000;
  // De lengte waar de schatting op mikt: de afstand van de training, na een te korte of te lange
  // lus naar verhouding meer of minder.
  const aim = d * (reach / 0.25);
  const all: Via[] = (terrain?.features ?? [])
    .filter((f) => (kind ? KIND_FEATURES[kind](f) : usableHill(f) || f.kind === 'dirt_path'))
    .filter((f) => {
      const crow = metersBetween(start, f);
      return crow >= NEAR_START_M && crow <= d * reach && (!arc || inArc(bearing(start, f), arc));
    })
    // Een helling zonder bekende hoogte weegt net boven een pad, niet als een helling van twintig meter.
    .map((f) => ({ lat: f.lat, lon: f.lon, hill: knownHill(f), value: knownHill(f) ? 2 + (f.heightM as number) / 20 : unknownHill(f) ? 1.5 : 1, angle: arc ? relativeAngle(bearing(start, f), arc) : bearing(start, f) }))
    .sort((a, b) => b.value - a.value || a.lat - b.lat || a.lon - b.lon);
  // Twee dingen op dezelfde plek: de waardevolste blijft.
  const spread: Via[] = [];
  for (const v of all) {
    if (!spread.some((s) => metersBetween(s, v) < SAME_SPOT_M)) spread.push(v);
  }
  if (spread.length === 0) return arc ? padInArc(start, [], aim, arc) : ring(start, aim);

  let vias = spread.sort((a, b) => a.angle - b.angle || a.lat - b.lat);
  const tooLong = () => vias.length > MAX_VIAS || DETOUR * perimeter(start, vias) > aim;
  while (vias.length > 1 && tooLong()) {
    const whole = perimeter(start, vias);
    let drop = 0;
    let worst = Infinity;
    vias.forEach((v, i) => {
      const saved = whole - perimeter(start, vias.filter((_, j) => j !== i));
      const worth = v.value / Math.max(1, saved);
      if (worth < worst) {
        worst = worth;
        drop = i;
      }
    });
    vias = vias.filter((_, i) => i !== drop);
  }
  return arc ? padInArc(start, vias, aim, arc) : startAtWidestGap(padVias(start, vias, aim));
}

// Liggen de punten te dicht bij het startpunt om de afstand te halen, dan komen er in het grootste
// gat tussen twee richtingen een of twee punten bij, zo ver weg dat de geschatte lengte past. Zonder
// dit bleef een lus met alleen dichtbije hellingen te kort, hoe vaak de planner ook zocht.
function padVias(start: RoutePoint, vias: Via[], aim: number): Via[] {
  const estimate = (list: RoutePoint[]) => DETOUR * perimeter(start, list);
  if (vias.length === 0 || estimate(vias) >= aim * (1 - SHORT_LIMIT)) return vias;
  // Een volle lijst van dichtbije punten laat geen plek voor een aanvulpunt, en dan bleef de lus te
  // kort. De punten met de laagste waarde (bij gelijke waarde het dichtst bij het startpunt) maken plek.
  if (vias.length > MAX_VIAS - 2) {
    const keep = [...vias]
      .sort((a, b) => b.value - a.value || metersBetween(start, b) - metersBetween(start, a) || a.lat - b.lat || a.lon - b.lon)
      .slice(0, MAX_VIAS - 2);
    vias = vias.filter((v) => keep.includes(v));
  }
  let from = vias[vias.length - 1].angle;
  let gap = 360;
  if (vias.length > 1) {
    gap = -1;
    vias.forEach((v, i) => {
      const prev = vias[(i - 1 + vias.length) % vias.length];
      const g = (v.angle - prev.angle + 360) % 360;
      if (g > gap) {
        gap = g;
        from = prev.angle;
      }
    });
  }
  const count = gap >= 180 ? 2 : 1;
  const angles = Array.from({ length: count }, (_, i) => (from + (gap * (i + 1)) / (count + 1)) % 360);
  const withPad = (radius: number): Via[] =>
    [...vias, ...angles.map((angle) => ({ ...offsetPoint(start, angle, radius), hill: false, value: 1, angle, pad: true as const }))].sort((a, b) => a.angle - b.angle || a.lat - b.lat);
  // De straal waarbij de schatting op de afstand uitkomt, door halveren (vast aantal stappen).
  let lo = NEAR_START_M;
  let hi = Math.max(NEAR_START_M, aim / 2);
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (estimate(withPad(mid)) < aim) lo = mid;
    else hi = mid;
  }
  return withPad((lo + hi) / 2);
}

// Als padVias, maar binnen een boog: de aanvulpunten komen in het grootste gat van de boog (zonder punten op een
// kwart en driekwart), nooit erbuiten. Zo gaat een lus die één kant op moet ook echt die kant op, ook zonder paden.
function padInArc(start: RoutePoint, vias: Via[], aim: number, arc: Arc): Via[] {
  const estimate = (list: RoutePoint[]) => DETOUR * perimeter(start, list);
  if (vias.length > 0 && estimate(vias) >= aim * (1 - SHORT_LIMIT)) return vias;
  if (vias.length > MAX_VIAS - 1) {
    const keep = [...vias].sort((a, b) => b.value - a.value || a.angle - b.angle).slice(0, MAX_VIAS - 1);
    vias = vias.filter((v) => keep.includes(v));
  }
  const edges = [0, ...vias.map((v) => v.angle), arc.span];
  let from = 0;
  let gap = -1;
  for (let i = 1; i < edges.length; i++) {
    if (edges[i] - edges[i - 1] > gap) {
      gap = edges[i] - edges[i - 1];
      from = edges[i - 1];
    }
  }
  const rels = vias.length === 0 ? [arc.span / 4, (arc.span * 3) / 4] : [from + gap / 2];
  const withPad = (radius: number): Via[] =>
    [...vias, ...rels.map((rel) => ({ ...offsetPoint(start, (arc.from + rel) % 360, radius), hill: false, value: 1, angle: rel, pad: true as const }))].sort((a, b) => a.angle - b.angle || a.lat - b.lat);
  let lo = NEAR_START_M;
  let hi = Math.max(NEAR_START_M, aim / 2);
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (estimate(withPad(mid)) < aim) lo = mid;
    else hi = mid;
  }
  return withPad((lo + hi) / 2);
}

// De lus begint na het grootste gat tussen twee richtingen: zo liggen heen- en terugweg uit elkaar.
function startAtWidestGap(vias: Via[]): Via[] {
  if (vias.length < 3) return vias;
  let at = 0;
  let widest = -1;
  vias.forEach((v, i) => {
    const prev = vias[(i - 1 + vias.length) % vias.length];
    const gap = (v.angle - prev.angle + 360) % 360;
    if (gap > widest) {
      widest = gap;
      at = i;
    }
  });
  return [...vias.slice(at), ...vias.slice(0, at)];
}

// Drie punten op een cirkel waar het startpunt zelf ook op ligt, met de omtrek van de afstand.
function ring(start: RoutePoint, distanceM: number): Via[] {
  const radius = distanceM / (2 * Math.PI * DETOUR);
  const centre = offsetPoint(start, 0, radius);
  return [270, 0, 90].map((angle) => ({ ...offsetPoint(centre, angle, radius), hill: false, value: 1, angle, pad: true as const }));
}

// Zo dicht bij het keerpunt van een doodlopend stuk ligt het punt dat de lus daarheen trok.
const VIA_AT_DEAD_END_M = 300;

// Het punt van de lus dat het dichtst bij een keerpunt ligt (binnen VIA_AT_DEAD_END_M), of -1.
export function viaAtDeadEnd(p: RouteProposal, vias: readonly RoutePoint[]): number {
  if (!p.deadEnds || vias.length < 2) return -1;
  let at = -1;
  let near = VIA_AT_DEAD_END_M;
  for (const end of p.style === 'adventure' ? loopDeadEnds(p.points) : deadEnds(p.points)) {
    vias.forEach((v, i) => {
      const d = metersBetween(v, end.tip);
      if (d <= near) {
        near = d;
        at = i;
      }
    });
  }
  return at;
}

// Hoe een andere lus eruit moet zien (engine/routeOtherLoop.ts): binnen een boog van de kompasroos, en/of met zo
// min mogelijk stukken twee keer gelopen. Zonder dit is het de gewone Avontuurlijke lus.
export interface AdventureShape {
  arc?: Arc;
  noRepeat?: boolean;
  // Alleen water, bos of onverharde paden als punten (Soort).
  kind?: LoopKind;
  // Een punt waar de lus langs moet (Via een punt); begint en eindigt bij de start.
  via?: RoutePoint;
}
// Een lus gaat langs het gekozen punt als hij er zo dichtbij komt; de routeplanner zet het punt op het dichtstbijzijnde pad.
export const VIA_TOUCH_M = 250;
const VIA_SIDE_DEG = 70;

// De punten voor een lus langs één punt: het punt zelf en een aanvulpunt opzij, zo ver dat de geschatte
// lengte op de afstand uitkomt. Ligt het punt al zo ver dat heen en terug de afstand haalt, dan alleen het punt.
export function viaLoopVias(start: RoutePoint, via: RoutePoint, aim: number): Via[] {
  const angle = bearing(start, via);
  const point: Via = { lat: via.lat, lon: via.lon, hill: false, value: 1, angle };
  const estimate = (list: RoutePoint[]) => DETOUR * perimeter(start, list);
  if (estimate([point]) >= aim * (1 - SHORT_LIMIT)) return [point];
  const side = (radius: number): Via => {
    const a = (angle + VIA_SIDE_DEG) % 360;
    return { ...offsetPoint(start, a, radius), hill: false, value: 1, angle: a, pad: true };
  };
  let lo = NEAR_START_M;
  let hi = Math.max(NEAR_START_M, aim / 2);
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (estimate([point, side(mid)]) < aim) lo = mid;
    else hi = mid;
  }
  return [point, side((lo + hi) / 2)];
}
// Tot dit deel van de lus over een stuk dat je eerder liep, telt hij als zonder heen en terug.
export const REPEAT_OK = 0.03;

export async function proposeAdventure(input: PlanInput, route: RouteFn, shape: AdventureShape = {}): Promise<PlanOutcome> {
  const d = input.target.distanceKm * 1000;
  const score = (p: RouteProposal) => missScore(p, input.target) * (input.target.ascentM >= MIN_ASCENT_TARGET_M ? 0.75 : 1) + 0.5 * p.repeatedShare;
  // Zonder heen en terug: bij lussen die allebei binnen de marge van de afstand vallen wint de kleinste herhaling.
  const prefer = (a: RouteProposal, b: RouteProposal | undefined) =>
    shape.noRepeat && b && Math.abs(a.repeatedShare - b.repeatedShare) > REPEAT_OK && withinMargin(a, input.target) && withinMargin(b, input.target)
      ? a.repeatedShare < b.repeatedShare
      : better(a, b, input.target, score);
  let reach = 0.25;
  const viasAt = (r: number) => (shape.via ? viaLoopVias(input.start, shape.via, d * (r / 0.25)) : adventureVias(input, r, shape.arc, shape.kind)).filter((v) => !insideAny(v, input.avoid));
  const isVia = (v: RoutePoint) => !!shape.via && v.lat === shape.via.lat && v.lon === shape.via.lon;
  const touches = (p: RouteProposal) => !shape.via || p.points.some((pt) => metersBetween(pt, shape.via as RoutePoint) <= VIA_TOUCH_M);
  let vias = viasAt(reach);
  let best: RouteProposal | undefined;
  let lastFailure: RouteFailure | undefined;
  // Een punt zonder pad in de buurt komt in een volgende ronde niet terug.
  const dropped: RoutePoint[] = [];
  const kept = (list: Via[]) => list.filter((v) => !dropped.some((x) => x.lat === v.lat && x.lon === v.lon));
  for (let call = 0; call < MAX_ROUTE_CALLS && vias.length > 0; call++) {
    const answer = await route([input.start, ...vias, input.start], routeOptions(input));
    if (failed(answer)) {
      lastFailure = answer.reason;
      if (stops(answer.reason)) break;
      // Geen pad bij het startpunt zelf: een punt weglaten verandert daar niets aan.
      if (answer.reason === 'unmapped' && (answer.waypoint === 0 || answer.waypoint === vias.length + 1)) return { ok: false, reason: 'unmapped', at: 'start' };
      // Een punt zonder pad in de buurt valt weg; zegt de bron niet welk, dan het laatste.
      const i = answer.reason === 'unmapped' && answer.waypoint !== undefined && answer.waypoint >= 1 && answer.waypoint <= vias.length ? answer.waypoint - 1 : vias.length - 1;
      // Het punt dat de gebruiker koos laat de planner niet vallen: zonder pad erbij geen lus langs dat punt.
      if (isVia(vias[i])) return { ok: false, reason: 'unmapped' };
      dropped.push(vias[i]);
      vias = vias.filter((_, j) => j !== i);
      continue;
    }
    const anchored = input.anchor ? anchorLine(answer.line.points, input.start, true) : { points: answer.line.points, gapM: 0 };
    const made = proposal('adventure', answer.line, anchored.points, { hills: vias.filter((v) => v.hill).length });
    // Door een vermeden stuk: de routeplanner vond er geen weg omheen; nog een keer vragen geeft hetzelfde.
    if (crossesAny(made.points, input.avoid)) break;
    if (anchored.gapM >= START_GAP_NOTE_M) made.startGapM = anchored.gapM;
    if (!tooTiny(made) && touches(made) && prefer(made, best)) best = made;
    const fits = fitsDistance(made, input.target);
    const repeats = !!shape.noRepeat && made.repeatedShare > REPEAT_OK;
    if (fits || ((extraDeadEnds(made) > 0 || repeats) && withinMargin(made, input.target))) {
      // Past de afstand (of ligt hij binnen SPUR_FREE_MARGIN) maar loopt de lus een doodlopend stuk in, dan nog
      // een poging zonder het punt dat daar ligt; de oude lus blijft als er niets beters komt.
      const loose = viaAtDeadEnd(made, vias);
      if (loose >= 0 && !isVia(vias[loose])) {
        dropped.push(vias[loose]);
        vias = vias.filter((_, j) => j !== loose);
        continue;
      }
      if (fits && !repeats) break;
    }
    // Iets boven de afstand mikken: te kort telt als mislukt, iets te lang niet.
    const off = made.distanceM / d;
    reach = Math.min(0.6, Math.max(0.08, reach * Math.min(1.6, Math.max(0.6, AIM_LONG / off))));
    const next = kept(viasAt(reach));
    // Dezelfde punten geven dezelfde lus: dan is er niets beters te halen.
    if (next.length === vias.length && next.every((v, i) => v.lat === vias[i].lat && v.lon === vias[i].lon)) break;
    vias = next;
  }
  if (best) return { ok: true, proposal: best };
  return { ok: false, reason: lastFailure ?? 'nothing' };
}

// De hellingen op de kaart: met een bekende hoogte (daar werkt de planner mee) en zonder. Zonder kaart: undefined.
export function terrainFound(terrain: NearbyTerrain | undefined): TerrainFound | undefined {
  if (!terrain) return undefined;
  const heights = terrain.features.filter(knownHill).map((f) => f.heightM as number);
  const lower = terrain.features.filter((f) => f.kind === 'hill' && f.heightM !== undefined && f.heightM < MIN_CLIMB_M).length;
  const base = { hills: heights.length, unknown: terrain.features.filter(unknownHill).length, lower, radiusM: terrain.radiusM };
  return heights.length > 0 ? { ...base, tallestM: Math.max(...heights) } : base;
}

export const NO_PATH_AT_START = 'Bij je startpunt ligt geen pad of weg die de routeplanner kent. Kies een startpunt aan een weg.';

// Wat de training aan hoogtemeters vraagt, voor elke zin. Bij een wandeltraining kan dat meer zijn dan
// waar de planner op mikt (`ascentM`, wat in de duur past; engine/hikeTarget.ts): een zin noemt nooit het
// ingekorte getal als wat de training vraagt.
export const askedAscent = (target: RouteTarget): number => target.askedAscentM ?? target.ascentM;

// Een lus met zijn melding over de hoogtemeters en het getal dat de training vraagt.
export function notedOutcome(o: PlanOutcome, target: RouteTarget, found?: TerrainFound): PlanOutcome {
  if (!o.ok) return o;
  const notice = ascentNotice(o.proposal, target, found);
  // Vraagt de training hoogtemeters, dan weet de lus dat: zijn getal staat er dan altijd bij.
  const asked = askedAscent(target);
  const asks = asked >= MIN_ASCENT_TARGET_M ? { targetAscentM: asked } : {};
  return notice || asks.targetAscentM !== undefined ? { ok: true, proposal: { ...o.proposal, ...asks, ...(notice ? { notice } : {}) } } : o;
}

// Een omgekeerde lus (wind, Andersom, Andere kant op): het stijgen telt opnieuw, dus de amber regel "Deze lus stijgt
// X m" en het getal dat de training vraagt worden uitgerekend voor de lus zoals hij nu staat. Dezelfde regel als bij
// het zoeken (notedOutcome), op de omgedraaide feiten; een melding die niet meer geldt verdwijnt.
export function renotedProposal(p: RouteProposal, target: RouteTarget, found?: TerrainFound): RouteProposal {
  const { notice: _notice, targetAscentM: _asked, ...bare } = p;
  const o = notedOutcome({ ok: true, proposal: bare }, target, found);
  return o.ok ? o.proposal : p;
}

// Zoveel dagen is de kaart van de omgeving actueel (zoals storage/nearbyTerrain.ts#TERRAIN_FETCH_DAYS).
export const MAP_OLD_DAYS = 30;

function mapAge(terrain: NearbyTerrain | undefined, now: Date): 'none' | 'old' | undefined {
  if (!terrain) return 'none';
  const at = Date.parse(terrain.fetchedAt);
  return Number.isFinite(at) && now.getTime() - at > MAP_OLD_DAYS * 86_400_000 ? 'old' : undefined;
}

// Eén regel bij het voorstel als de kaart van de omgeving ontbrak of oud was; leeg zonder lus (dan zegt de
// fout genoeg) en bij een actuele kaart. Alleen tekst: het plant niets.
export function mapAgeLine(plans: RoutePlans): string {
  if (!plans.map || ![plans.simple, plans.adventure].some((o) => o.ok)) return '';
  return plans.map === 'none'
    ? 'Er is geen actuele kaart van de omgeving, dus de lus is zonder heuvels, paden, water en bos gezocht.'
    : 'De kaart van de omgeving is een oude kaart, dus heuvels, paden, water en bos kunnen veranderd zijn.';
}

// Beide lussen, de avontuurlijke eerst (zijn lijn is de reserve voor Simpel). Gooit nooit: elke
// uitkomst is een lus of een reden.
export async function proposeRoutes(input: PlanInput, route: RouteFn): Promise<RoutePlans> {
  const safe = (p: Promise<PlanOutcome>) => p.catch((): PlanOutcome => ({ ok: false, reason: 'error' }));
  const found = terrainFound(input.terrain);
  const noted = (o: PlanOutcome): PlanOutcome => notedOutcome(o, input.target, found);
  const adventure = await safe(proposeAdventure(input, route));
  // Geen pad bij het startpunt: Simpel vraagt hetzelfde punt en krijgt hetzelfde antwoord.
  const noStart = !adventure.ok && adventure.at === 'start';
  const spare: RoutedLine | undefined = adventure.ok ? { source: adventure.proposal.source, points: adventure.proposal.points } : undefined;
  const { loop } = input;
  const errorBoth = (): Record<LoopPriority, PlanOutcome> => ({ ascent: { ok: false, reason: 'error' }, distance: { ok: false, reason: 'error' } });
  const choices = loop && !noStart ? await proposeSimpleChoices({ ...input, loop }, route, spare).catch(errorBoth) : undefined;
  const simple = noStart ? adventure : choices && loop ? choices[loop.priority] : await safe(proposeSimple(input, route, spare));
  const plans: RoutePlans = { simple: noted(simple), adventure: noted(adventure) };
  if (choices && loop) {
    plans.choices = { simple: { ascent: noted(choices.ascent), distance: noted(choices.distance) }, adventure: plans.adventure };
    plans.simple = plans.choices.simple[loop.priority];
  }
  dropFarOff(plans, input.target);
  if (found) plans.found = found;
  const age = mapAge(input.terrain, input.now ?? new Date());
  if (age) plans.map = age;
  if (noStart || (!simple.ok && simple.at === 'start' && !adventure.ok)) plans.notice = NO_PATH_AT_START;
  return plans;
}

// Een voorstel ver onder de afstand komt alleen als er geen ander voorstel binnen de afstand is.
function dropFarOff(plans: RoutePlans, target: RouteTarget): void {
  for (const [style, other] of [['simple', 'adventure'], ['adventure', 'simple']] as const) {
    const mine = plans[style];
    const rival = plans[other];
    if (mine.ok && rival.ok && mine.proposal.distanceM < target.distanceKm * 1000 * FAR_OFF && fitsDistance(rival.proposal, target)) plans[style] = { ok: false, reason: 'nothing', farOff: true };
  }
}

// De lussen bij een keuze (Hoogtemeters halen of Afstand houden), zonder nieuwe zoektocht: Simpel uit
// `choices`, Avontuurlijk zoals hij kwam, met dezelfde regel voor een voorstel ver onder de afstand.
export function plansWithPriority(plans: RoutePlans, priority: LoopPriority, target: RouteTarget): RoutePlans {
  if (!plans.choices) return plans;
  const next: RoutePlans = { ...plans, simple: plans.choices.simple[priority], adventure: plans.choices.adventure };
  dropFarOff(next, target);
  return next;
}

// ---------- Tekst ----------

const km = (meters: number) => `${formatNumberNL(Math.round(meters / 100) / 10, 1)} km`;
const round10 = (m: number) => Math.round(m / 10) * 10;

const COUNT_WORD: Record<number, string> = { 2: 'twee', 3: 'drie', 4: 'vier' };
const countWord = (n: number) => COUNT_WORD[n] ?? String(n);

// De naam zegt de vorm: "Eén lus" alleen zonder doodlopend stuk, heen en terug over meer dan één tak zegt
// dat erbij (de Y van 14 november).
// `spurWarned`: de amberregel "Deze lus heeft ... heen en terug." staat er al bij (routeSheet.ts#loopTitle),
// dan zegt de titel de stukken niet nog eens.
export function proposalTitle(p: RouteProposal, spurWarned = false): string {
  const ends = p.deadEnds ?? 0;
  if (p.style === 'simple') {
    const branches = ends > 1 ? ` over ${countWord(ends)} takken` : '';
    if (p.repeats) return `${p.repeats} × de helling op en af${branches ? `,${branches}` : ''}`;
    return branches ? `Heen en terug${branches}` : 'Heen en terug over hetzelfde pad';
  }
  if (ends > 0) {
    const base = !p.hills ? 'Lus' : p.hills === 1 ? 'Lus langs een helling' : `Lus langs ${p.hills} hellingen`;
    if (spurWarned && deadEndLine(p)) return base;
    return `${base} met ${ends === 1 ? 'een stuk' : `${countWord(ends)} stukken`} heen en terug`;
  }
  if (!p.hills) return 'Eén lus';
  return p.hills === 1 ? 'Eén lus langs een helling' : `Eén lus langs ${p.hills} hellingen`;
}

// De tijd van een lus bij een wandeltraining, op zijn echte afstand en stijging (een lus daalt evenveel als
// hij stijgt), zonder pauzes (engine/hikeTarget.ts#hikeMinutes). Een looptraining: undefined.
export function loopMinutes(p: Pick<RouteProposal, 'distanceM' | 'ascentM'>, target: RouteTarget | undefined): number | undefined {
  if (target?.minutes === undefined) return undefined;
  return hikeMinutes({ km: p.distanceM / 1000, up: p.ascentM, down: p.ascentM }, target.rates);
}

// "8,4 km · 360 hoogtemeters", en bij een wandeltraining de tijd erbij: "· ongeveer 3 uur 5".
export function proposalFacts(p: RouteProposal, target?: RouteTarget): string {
  // Onder ongeveer 40 m weet niemand het op 20 m na: dan geen getal met schijnprecisie. Vraagt de
  // training hoogtemeters, dan staat het getal er altijd: een lus heet nooit vrijwel vlak naast een doel.
  const flat = p.targetAscentM === undefined && isNearlyFlat(p.ascentM);
  const facts = `${km(p.distanceM)} · ${flat ? 'vrijwel vlak' : `${formatNumberNL(round10(p.ascentM), 0)} hoogtemeters`}`;
  const minutes = loopMinutes(p, target);
  return minutes === undefined ? facts : `${facts} · ongeveer ${walkTimeText(minutes)}`;
}

// routeSheet.ts#loopLines herkent de amber regel van een te lange wandeling aan dit begin: verander ze samen.
export const LONGER_WALK_LEAD = 'Deze lus duurt ongeveer';
// "Deze lus duurt ongeveer 3 uur 40, langer dan de 3 uur van je training." (ontwerp hoofdstuk 4)
export const longerWalkLine = (loop: number, training: number): string => `${LONGER_WALK_LEAD} ${walkTimeText(loop)}, langer dan de ${walkTimeText(training)} van je training.`;

// Een wandeling is te lang als zijn tijd meer dan CLOSE_ENOUGH boven de duur van de training ligt, ook op de
// getallen die je ziet (op 5 minuten).
export function walkTooLong(p: Pick<RouteProposal, 'distanceM' | 'ascentM'>, target: RouteTarget): boolean {
  const loop = loopMinutes(p, target);
  if (loop === undefined || target.minutes === undefined) return false;
  return loop > target.minutes * (1 + CLOSE_ENOUGH) && walkTimeText(loop) !== walkTimeText(target.minutes);
}

// Waar het getal van een wandeling op rust, in één gedempte regel (ontwerp hoofdstuk 4).
export function walkBasisLine(rates: WalkRates | undefined): string {
  if (!rates || rates.basis === 'norm') {
    return `Gerekend op de wandelnorm: ${formatNumberNL(NORM_WALK_RATES.flatKmh, 0)} km per uur, ${formatNumberNL(NORM_WALK_RATES.upMph, 0)} m per uur omhoog en ${formatNumberNL(NORM_WALK_RATES.downMph, 0)} omlaag. Zonder pauzes en zonder rugzak.`;
  }
  const up = `${formatNumberNL(round10(rates.upMph), 0)} m per uur omhoog`;
  const pack = rates.packKg !== undefined ? `, met ${formatNumberNL(rates.packKg, 1)} kg rugzak` : '';
  return `Op je eigen klimtempo: ${up}${pack}. Zonder pauzes.`;
}

// Past wat de training vraagt niet in de duur (duur eerst), dan één gedempte regel met wat het kost en wat
// past: "500 m op en af kost op de wandelnorm 2 uur 40. In 3 uur past 375 m." Anders undefined.
export function walkFitLine(target: RouteTarget): string | undefined {
  const asked = askedAscent(target);
  if (target.minutes === undefined || !(asked > target.ascentM) || asked < MIN_ASCENT_TARGET_M) return undefined;
  const cost = hikeMinutes({ km: 0, up: asked, down: asked }, target.rates);
  const on = target.rates?.basis === 'own' ? 'op je eigen klimtempo' : 'op de wandelnorm';
  return `${formatNumberNL(asked, 0)} m op en af kost ${on} ${walkTimeText(cost)}. In ${walkTimeText(target.minutes)} past ${formatNumberNL(target.ascentM, 0)} m.`;
}

// De melding van een lus die meer dan SHORT_LIMIT korter is dan de training (routeSheet.ts#loopLines herkent hem).
export const shortLine = (p: Pick<RouteProposal, 'distanceM'>, target: RouteTarget): string => `${km(p.distanceM)}, korter dan de ${formatNumberNL(target.distanceKm, 1)} km van ${aimWord(target)}.`;

// De hoogtemeters van een lus zijn buiten de vraag als ze meer dan het dubbele zijn van wat de training of
// wandeling vroeg, of bij Vlak meer dan FLAT_ASCENT_NOTE_M (te weinig melden ascentNotice en SHORT_ASCENT al).
export const ASCENT_OVER_FACTOR = 2;
export const FLAT_ASCENT_NOTE_M = 100;
// "160 hoogtemeters, meer dan de 50 van je wandeling." Dezelfde vorm als shortLine; routeSheet.ts#loopLines
// herkent hem aan het begin ("160 hoogtemeters,"): verander ze samen via ascentOverLead.
export const ascentOverLead = (p: Pick<RouteProposal, 'ascentM'>): string => `${formatNumberNL(round10(p.ascentM), 0)} hoogtemeters,`;
export function ascentOverLine(p: Pick<RouteProposal, 'ascentM'>, target: RouteTarget): string | undefined {
  const asked = askedAscent(target);
  if (asked >= MIN_ASCENT_TARGET_M) {
    if (!(p.ascentM > asked * ASCENT_OVER_FACTOR) || round10(p.ascentM) <= asked) return undefined;
    return `${ascentOverLead(p)} meer dan de ${formatNumberNL(asked, 0)} van ${aimWord(target)}.`;
  }
  if (target.flat && p.ascentM > FLAT_ASCENT_NOTE_M) return `${ascentOverLead(p)} terwijl je een vlakke wandeling vroeg.`;
  return undefined;
}

// Een lus met een stuk heen en terug (een tak die je in en uit loopt, zonder de aanloop): amber, zoals te kort.
// routeSheet.ts#loopLines herkent hem aan dit begin.
export const DEAD_END_LEAD = 'Deze lus heeft';
export const deadEndLine = (p: Pick<RouteProposal, 'style' | 'deadEnds'>): string | undefined =>
  p.style === 'adventure' && (p.deadEnds ?? 0) > 0 ? `${DEAD_END_LEAD} ${p.deadEnds === 1 ? 'een stuk' : `${countWord(p.deadEnds as number)} stukken`} heen en terug.` : undefined;

// Vanaf zoveel meter langs een grote weg zegt de lus het erbij: de aanvraag mijdt ze al, dit is wat overblijft.
export const BIG_ROAD_NOTE_M = 300;
// routeSheet.ts#loopLines herkent de regel aan dit begin: verander ze samen via deze constante.
export const BIG_ROAD_LEAD = 'Langs een grote weg:';
export const bigRoadLine = (meters: number): string => `${BIG_ROAD_LEAD} ${km(meters)}.`;

// Begint Simpel op de voet van de helling (composeSimple, I-160), dan zegt één regel hoe je er komt: lopend
// te bereiken met lopen en rijden, verder alleen rijden. Met de schatting van de gids (trainingSpots.ts).
export function footStartLine(p: Pick<RouteProposal, 'footStartM'>): string | undefined {
  if (p.footStartM === undefined) return undefined;
  const straight = p.footStartM / 1000;
  const drive = Math.max(1, driveMinutes(straight));
  if (roadKm(straight) <= WALKABLE_ROAD_KM) {
    const walk = Math.max(1, walkMinutes(straight));
    return `Begint bij de voet van de helling, ${km(p.footStartM)} van je plek: ${walk} minuten lopen of ${drive} minuten rijden.`;
  }
  return `Begint bij de voet van de helling, ${drive} minuten rijden van je plek.`;
}

// Wat je over deze lus moet weten naast de getallen: het droge feit, in korte zinnen.
// `climbMarked`: de helling staat nu gemarkeerd op de kaart (niet als je in Per stuk een stuk koos).
export function proposalNotes(p: RouteProposal, target: RouteTarget, climbMarked = true): string[] {
  const notes: string[] = [];
  const foot = footStartLine(p);
  if (foot) notes.push(foot);
  if (p.style === 'simple' && p.climbM && p.climbLengthM) {
    const climb = `${formatNumberNL(Math.round(p.climbM), 0)} m omhoog over ${formatNumberNL(Math.round(p.climbLengthM / 10) * 10, 0)} m`;
    // Herhalingen: de helling staat gemarkeerd op de kaart (climbStretch), de regel zegt wat je daar doet.
    const repeats = (p.repeats ?? 0) > 1 ? `hier ${p.repeats} keer op, ` : '';
    notes.push(climbMarked && climbStretch(p) ? `Gemarkeerd op de kaart: ${repeats}${climb}.` : `De helling: ${repeats}${climb}.`);
  }
  if (p.style === 'simple' && (p.repeats ?? 0) > 1) notes.push('Op dezelfde helling kan je horloge naar het verkeerde stuk springen.');
  if (p.startGapM !== undefined) notes.push(`Het dichtstbijzijnde pad ligt ${formatNumberNL(round10(p.startGapM), 0)} m van je startpunt; dat stuk is een rechte lijn.`);
  const d = target.distanceKm * 1000;
  // Korter op de getallen die je ziet (op 100 m): 10,5 km tegen 10,5 km is niet korter.
  const shortBy = Math.round(d / 100) - Math.round(p.distanceM / 100);
  const walk = target.minutes !== undefined;
  if (tooShort(p, target)) notes.push(shortLine(p, target));
  // Een wandeling is een duur: te lang zegt de tijd, in amber (loopLines), niet de kilometers.
  else if (walk && walkTooLong(p, target)) notes.push(longerWalkLine(loopMinutes(p, target) as number, target.minutes as number));
  else if (shortBy > 0) notes.push(`${km(shortBy * 100)} korter dan ${aimWord(target)}. Tot ${formatNumberNL(Math.round(SHORT_LIMIT * 100), 0)} procent korter is goed genoeg.`);
  else if (!walk && p.distanceM > d * (1 + CLOSE_ENOUGH)) notes.push(`Langer dan de ${formatNumberNL(target.distanceKm, 1)} km van ${aimWord(target)}.`);
  const over = ascentOverLine(p, target);
  if (over) notes.push(over);
  if (p.ascentCapped) notes.push(ascentCappedLine(target));
  if (p.notice) notes.push(p.notice);
  const spur = deadEndLine(p);
  if (spur) notes.push(spur);
  if ((p.bigRoadM ?? 0) >= BIG_ROAD_NOTE_M) notes.push(bigRoadLine(p.bigRoadM as number));
  if (p.style === 'adventure' && p.repeatedShare > 0.15 && !(p.deadEnds && p.deadEnds > 0)) notes.push('Een deel loop je twee keer.');
  // Een wandeling: waar de tijd op rust, en of de hoogtemeters in de duur passen (gedempt, bij de uitleg).
  if (walk) {
    const fit = walkFitLine(target);
    if (fit) notes.push(fit);
    notes.push(walkBasisLine(target.rates));
  }
  return notes;
}

const radiusText = (radiusM: number) => `${formatNumberNL(Math.round(radiusM / 100) / 10, 1)} km`;

// Wat de kaart zegt als er geen bruikbare helling is. "Geen heuvels" alleen als de kaart er geen
// enkele gaf: wie op een heuvel woont heeft hellingen onder zijn plek, en die zijn er wel.
function noHillLine(found: TerrainFound): string {
  const within = `binnen ${radiusText(found.radiusM)}`;
  if (found.lower > 0) return `Geen helling dichtbij die ${MIN_CLIMB_M} m of meer boven je plek ligt.`;
  if (found.unknown > 0) return `Geen helling met een bekende hoogte ${within}.`;
  return `Geen heuvels ${within}.`;
}

// De melding bij een lus die de hoogtemeters van de training niet haalt (onder SHORT_ASCENT): het
// droge feit over de buurt als de kaart antwoordde, en wat deze lus wel heeft, op tien meter zoals
// de feiten van de lus. Zonder hoogtemeters in de training, of bij een lus die ze haalt: geen
// melding. "Dichtbij" en niet "binnen 3 km": alleen de dichtstbijzijnde heuvels krijgen een hoogte.
export function ascentNotice(p: Pick<RouteProposal, 'ascentM'>, target: RouteTarget, found?: TerrainFound): string | undefined {
  const asked = askedAscent(target);
  if (asked < MIN_ASCENT_TARGET_M || p.ascentM >= asked * SHORT_ASCENT) return undefined;
  const m = (v: number) => `${formatNumberNL(round10(v), 0)} m`;
  const loop = target.plannedWalk ? `Deze lus stijgt ${m(p.ascentM)}; je vroeg ${m(asked)}.` : `Deze lus stijgt ${m(p.ascentM)}; de training vraagt ${m(asked)}.`;
  if (!found) return loop;
  if (found.hills > 0 && found.tallestM !== undefined) return `De hoogste helling dichtbij ligt ${formatNumberNL(Math.round(found.tallestM), 0)} m boven je plek. ${loop}`;
  // Een wandeling zonder helling dichtbij: ook waar je de meters wel haalt, in dezelfde regel (Pathfinder,
  // 15 november), zodat het bij hoogstens twee amber regels blijft. searchLines zegt hem dan niet nog eens.
  return target.minutes !== undefined ? `${noHillLine(found)} ${loop} ${SUBSTITUTE_LINE}` : `${noHillLine(found)} ${loop}`;
}

// De zin in het blok van een lus die er niet kwam. Zonder pad bij het startpunt zegt de regel
// bovenaan het al (NO_PATH_AT_START): dan hier geen zin over hellingen, want Simpel is niet gezocht.
// `target`: alleen voor het woord (je training of je wandeling).
export function failureLine(style: RouteProposal['style'], outcome: Extract<PlanOutcome, { ok: false }>, flat: boolean, target?: Pick<RouteTarget, 'plannedWalk'>): string {
  if (outcome.at === 'start') return 'Geen lus zonder pad bij je startpunt.';
  if (outcome.farOff) return `Geen tweede voorstel dat bij de afstand van ${aimWord(target)} past.`;
  if (outcome.reason === 'nothing' || outcome.reason === 'unmapped') return style === 'simple' ? (flat ? 'Geen pad gevonden vanaf je plek.' : `Geen helling gevonden die bij ${aimWord(target)} past.`) : 'Geen lus gevonden vanaf je plek.';
  // Bij zwak bereik houdt de zoektocht vlak voor zijn grens op en toont wat er al is: deze lus kwam niet op tijd.
  if (outcome.reason === 'timeout') return 'De routeplanner antwoordde niet op tijd.';
  return 'De routeplanner antwoordde niet.';
}

export const SUBSTITUTE_LINE = 'Hoogtemeters bergop haal je ook op een trap, een brug of de loopband op helling.';

// Wat er in de buurt gevonden is, in één regel, en zonder genoeg hoogte waar je die anders haalt
// (de vervangers die de app al noemt bij Geen heuvel in de buurt). Alleen bij een training met
// hoogtemeters; zonder kaart geen telling. Alleen tekst: het plant niets. Zie
// docs/beslissingen/2026-11-10-route-uitleg.md.
export function searchLines(plans: RoutePlans, target: RouteTarget): string[] {
  if (plans.notice) return [plans.notice];
  const asked = askedAscent(target);
  if (asked < MIN_ASCENT_TARGET_M) return [];
  const outcomes = [plans.simple, plans.adventure];
  const made = outcomes.flatMap((o) => (o.ok ? [o.proposal] : []));
  // Antwoordde de routeplanner niet (geen netwerk, te laat, een fout), dan blijft de rustige regel
  // van het paneel alleen: geen telling en geen vervanger.
  if (made.length === 0 && outcomes.some((o) => !o.ok && o.reason !== 'nothing' && o.reason !== 'unmapped')) return [];
  const lines: string[] = [];
  const f = plans.found;
  // Zegt een lus zelf al wat er in de buurt ligt (de melding), dan staat de telling er niet nog eens.
  if (f && !made.some((p) => p.notice)) {
    const tallest = f.tallestM === undefined ? undefined : `${formatNumberNL(Math.round(f.tallestM), 0)} m`;
    if (f.hills === 0) lines.push(f.lower > 0 ? noHillLine(f) : f.unknown > 0 ? 'Geen helling met een bekende hoogte in de buurt op de kaart.' : 'Geen helling in de buurt op de kaart.');
    else if (f.hills === 1) lines.push(tallest ? `Eén helling in de buurt op de kaart, ${tallest} boven je plek.` : 'Eén helling in de buurt op de kaart.');
    else lines.push(tallest ? `${f.hills} hellingen in de buurt op de kaart, de hoogste ${tallest} boven je plek.` : `${f.hills} hellingen in de buurt op de kaart.`);
  }
  // Wat de training vraagt, zoals de melding van de lus (askedAscent); staat de vervanger al in een melding,
  // dan niet nog eens.
  // Bij een wandeling die je zelf plant geen trap of loopband: dat is advies voor een training.
  if (!target.plannedWalk && !made.some((p) => p.ascentM >= asked * SHORT_ASCENT) && !made.some((p) => p.notice?.includes(SUBSTITUTE_LINE))) lines.push(SUBSTITUTE_LINE);
  return lines;
}
