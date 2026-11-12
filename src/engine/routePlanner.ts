// ASCEND: twee lussen voor een training vanaf een startpunt. Simpel: dezelfde helling op en af tot
// de hoogtemeters er zijn (of, bij een vlakke training, heen en terug over hetzelfde pad).
// Avontuurlijk: één lange lus langs zoveel mogelijk verschillende hellingen en onverharde paden,
// liefst zonder stukken twee keer. De hellingen en paden komen uit wat ASCEND al via OpenStreetMap
// vindt (models/nearbyTerrain.ts); de stukken ertussen komen van een routeplanner die de aanroeper
// meegeeft (RouteFn). De engine kiest de punten en weegt de antwoorden: zelfde invoer en zelfde
// antwoorden geven dezelfde lus. Het is een voorstel om te lopen: het plant niets en bewaart niets.
// Zie docs/beslissingen/2026-11-09-routeplanner.md.

import type { NearbyTerrain, TerrainFeature } from '../models/nearbyTerrain';
import type { RouteAnswer, RouteFailure, RouteFn, RoutePoint, RouteProposal, RouteTarget, RoutedLine } from '../models/route';
import { isNearlyFlat, modelThresholdM } from './elevation';
import { ASCENT_DEAD_BAND_M, ascentOf, bearing, cumulative, lineLength, metersBetween, offsetPoint, repeatedShare } from './routeGeometry';
import { formatNumberNL } from '../utils/number';

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
}

// `at: 'start'`: bij het startpunt zelf ligt geen pad; een andere lus proberen heeft dan geen zin.
export type PlanOutcome = { ok: true; proposal: RouteProposal } | { ok: false; reason: RouteFailure | 'nothing'; at?: 'start' };

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
  // Een melding over de hele zoektocht (bijvoorbeeld geen pad bij het startpunt).
  notice?: string;
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
  return dist + asc;
}

export const tooShort = (p: Pick<RouteProposal, 'distanceM'>, target: RouteTarget): boolean => p.distanceM < target.distanceKm * 1000 * (1 - SHORT_LIMIT);
// De afstand past: niet meer dan SHORT_LIMIT korter en niet meer dan CLOSE_ENOUGH langer.
export const fitsDistance = (p: Pick<RouteProposal, 'distanceM'>, target: RouteTarget): boolean => !tooShort(p, target) && p.distanceM <= target.distanceKm * 1000 * (1 + CLOSE_ENOUGH);

// Een lus waarvan de afstand past gaat voor op een die niet past; daarna telt de score (lager is beter).
function better(a: RouteProposal, b: RouteProposal | undefined, target: RouteTarget, score: (p: RouteProposal) => number): boolean {
  if (!b) return true;
  const fa = fitsDistance(a, target);
  if (fa !== fitsDistance(b, target)) return fa;
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
  return [...points.slice(0, i), mid];
}

function proposal(style: RouteProposal['style'], line: RoutedLine, points: RoutePoint[], extra: Partial<RouteProposal> = {}): RouteProposal {
  return { style, source: line.source, points, distanceM: lineLength(points), ascentM: ascentOf(points), repeatedShare: repeatedShare(points), ...extra };
}

// Van een lijn naar een heuvel een lus met herhalingen: heen naar de voet, zo vaak op en af als de
// hoogtemeters vragen (en de afstand toelaat), en terug.
export function composeSimple(line: RoutedLine, target: RouteTarget): RouteProposal | undefined {
  const climb = climbOnLine(line.points, line.points.length - 1) ?? climbOnLine(line.points);
  if (!climb) return undefined;
  const approach = line.points.slice(0, climb.foot + 1);
  const up = line.points.slice(climb.foot, climb.top + 1);
  const down = reversed(up);
  // De drempel van de hele lijn, ook voor de stukken: anders telt de som van de delen anders dan het geheel.
  const threshold = modelThresholdM(line.points.map((p) => p.ele));
  const base = ascentOf(approach, threshold) + ascentOf(reversed(approach), threshold);
  const perRepeat = Math.max(climb.heightM, ascentOf(up, threshold) + ascentOf(down, threshold));
  const byAscent = Math.round((target.ascentM - base) / perRepeat);
  const room = 1.5 * target.distanceKm * 1000 - 2 * lineLength(approach);
  const byDistance = Math.floor(room / (2 * climb.lengthM));
  const repeats = Math.max(1, Math.min(byAscent, byDistance, MAX_REPEATS));
  const points = [...approach];
  for (let i = 0; i < repeats; i++) points.push(...up.slice(1), ...down.slice(1));
  points.push(...reversed(approach).slice(1));
  // Elke herhaling telt voor de hele helling: de dode band zou anders per keer een paar meter van de top afhalen.
  return proposal('simple', line, points, { ascentM: base + repeats * perRepeat, repeats, climbM: climb.heightM, climbLengthM: climb.lengthM, repeatedShare: 1 });
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
  for (const candidate of simpleCandidates(input)) {
    const answer = await route([input.start, candidate]);
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
    if (!made) continue;
    if (anchored.gapM >= START_GAP_NOTE_M) made.startGapM = anchored.gapM;
    if (better(made, best, input.target, score)) best = made;
    // Past de afstand en zit de lus dicht genoeg bij de training, dan vraagt de planner niets meer.
    if (best && fitsDistance(best, input.target) && score(best) <= CLOSE_ENOUGH) break;
  }
  if (!best && !flat && spare) {
    // De lus in beide richtingen: de helling met de kortste aanloop past meestal het best.
    for (const points of [spare.points, reversed(spare.points)]) {
      const line = tallestClimbLine(points);
      const made = line ? composeSimple({ source: spare.source, points: line }, input.target) : undefined;
      if (made && better(made, best, input.target, score)) best = made;
    }
  }
  if (best) return { ok: true, proposal: best };
  return { ok: false, reason: lastFailure ?? 'nothing' };
}

// ---------- Avontuurlijk ----------

interface Via extends RoutePoint {
  hill: boolean;
  value: number;
  angle: number;
}

const perimeter = (start: RoutePoint, vias: RoutePoint[]) => lineLength([start, ...vias, start]);

// De punten voor de lus: hellingen en onverharde paden binnen bereik, op volgorde van richting rond
// het startpunt (zo kruist de lus zichzelf niet), en uitgedund tot de geschatte lengte past. Een
// helling weegt zwaarder dan een pad, een hoge zwaarder dan een lage. `reach`: hoe ver van het
// startpunt, als deel van de afstand van de training. Zonder iets in de buurt: drie punten op een cirkel.
export function adventureVias(input: PlanInput, reach = 0.25): Via[] {
  const { start, target, terrain } = input;
  const d = target.distanceKm * 1000;
  // De lengte waar de schatting op mikt: de afstand van de training, na een te korte of te lange
  // lus naar verhouding meer of minder.
  const aim = d * (reach / 0.25);
  const all: Via[] = (terrain?.features ?? [])
    .filter((f) => usableHill(f) || f.kind === 'dirt_path')
    .filter((f) => {
      const crow = metersBetween(start, f);
      return crow >= NEAR_START_M && crow <= d * reach;
    })
    // Een helling zonder bekende hoogte weegt net boven een pad, niet als een helling van twintig meter.
    .map((f) => ({ lat: f.lat, lon: f.lon, hill: knownHill(f), value: knownHill(f) ? 2 + (f.heightM as number) / 20 : unknownHill(f) ? 1.5 : 1, angle: bearing(start, f) }))
    .sort((a, b) => b.value - a.value || a.lat - b.lat || a.lon - b.lon);
  // Twee dingen op dezelfde plek: de waardevolste blijft.
  const spread: Via[] = [];
  for (const v of all) {
    if (!spread.some((s) => metersBetween(s, v) < SAME_SPOT_M)) spread.push(v);
  }
  if (spread.length === 0) return ring(start, aim);

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
  return startAtWidestGap(padVias(start, vias, aim));
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
    [...vias, ...angles.map((angle) => ({ ...offsetPoint(start, angle, radius), hill: false, value: 1, angle }))].sort((a, b) => a.angle - b.angle || a.lat - b.lat);
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
  return [270, 0, 90].map((angle) => ({ ...offsetPoint(centre, angle, radius), hill: false, value: 1, angle }));
}

export async function proposeAdventure(input: PlanInput, route: RouteFn): Promise<PlanOutcome> {
  const d = input.target.distanceKm * 1000;
  const score = (p: RouteProposal) => missScore(p, input.target) * (input.target.ascentM >= MIN_ASCENT_TARGET_M ? 0.75 : 1) + 0.5 * p.repeatedShare;
  let reach = 0.25;
  let vias = adventureVias(input, reach);
  let best: RouteProposal | undefined;
  let lastFailure: RouteFailure | undefined;
  // Een punt zonder pad in de buurt komt in een volgende ronde niet terug.
  const dropped: RoutePoint[] = [];
  const kept = (list: Via[]) => list.filter((v) => !dropped.some((x) => x.lat === v.lat && x.lon === v.lon));
  for (let call = 0; call < MAX_ROUTE_CALLS && vias.length > 0; call++) {
    const answer = await route([input.start, ...vias, input.start]);
    if (failed(answer)) {
      lastFailure = answer.reason;
      if (stops(answer.reason)) break;
      // Geen pad bij het startpunt zelf: een punt weglaten verandert daar niets aan.
      if (answer.reason === 'unmapped' && (answer.waypoint === 0 || answer.waypoint === vias.length + 1)) return { ok: false, reason: 'unmapped', at: 'start' };
      // Een punt zonder pad in de buurt valt weg; zegt de bron niet welk, dan het laatste.
      const i = answer.reason === 'unmapped' && answer.waypoint !== undefined && answer.waypoint >= 1 && answer.waypoint <= vias.length ? answer.waypoint - 1 : vias.length - 1;
      dropped.push(vias[i]);
      vias = vias.filter((_, j) => j !== i);
      continue;
    }
    const anchored = input.anchor ? anchorLine(answer.line.points, input.start, true) : { points: answer.line.points, gapM: 0 };
    const made = proposal('adventure', answer.line, anchored.points, { hills: vias.filter((v) => v.hill).length });
    if (anchored.gapM >= START_GAP_NOTE_M) made.startGapM = anchored.gapM;
    if (better(made, best, input.target, score)) best = made;
    if (fitsDistance(made, input.target)) break;
    // Iets boven de afstand mikken: te kort telt als mislukt, iets te lang niet.
    const off = made.distanceM / d;
    reach = Math.min(0.6, Math.max(0.08, reach * Math.min(1.6, Math.max(0.6, AIM_LONG / off))));
    const next = kept(adventureVias(input, reach));
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

// Beide lussen, de avontuurlijke eerst (zijn lijn is de reserve voor Simpel). Gooit nooit: elke
// uitkomst is een lus of een reden.
export async function proposeRoutes(input: PlanInput, route: RouteFn): Promise<RoutePlans> {
  const safe = (p: Promise<PlanOutcome>) => p.catch((): PlanOutcome => ({ ok: false, reason: 'error' }));
  const found = terrainFound(input.terrain);
  const noted = (o: PlanOutcome): PlanOutcome => {
    if (!o.ok) return o;
    const notice = ascentNotice(o.proposal, input.target, found);
    // Vraagt de training hoogtemeters, dan weet de lus dat: zijn getal staat er dan altijd bij.
    const asks = input.target.ascentM >= MIN_ASCENT_TARGET_M ? { targetAscentM: input.target.ascentM } : {};
    return notice || asks.targetAscentM !== undefined ? { ok: true, proposal: { ...o.proposal, ...asks, ...(notice ? { notice } : {}) } } : o;
  };
  const adventure = await safe(proposeAdventure(input, route));
  // Geen pad bij het startpunt: Simpel vraagt hetzelfde punt en krijgt hetzelfde antwoord.
  const noStart = !adventure.ok && adventure.at === 'start';
  const spare: RoutedLine | undefined = adventure.ok ? { source: adventure.proposal.source, points: adventure.proposal.points } : undefined;
  const simple = noStart ? adventure : await safe(proposeSimple(input, route, spare));
  const plans: RoutePlans = { simple: noted(simple), adventure: noted(adventure) };
  if (found) plans.found = found;
  if (noStart || (!simple.ok && simple.at === 'start' && !adventure.ok)) plans.notice = NO_PATH_AT_START;
  return plans;
}

// ---------- Tekst ----------

const km = (meters: number) => `${formatNumberNL(Math.round(meters / 100) / 10, 1)} km`;
const round10 = (m: number) => Math.round(m / 10) * 10;

export function proposalTitle(p: RouteProposal): string {
  if (p.style === 'simple') return p.repeats ? `${p.repeats} × de helling op en af` : 'Heen en terug over hetzelfde pad';
  if (!p.hills) return 'Eén lus';
  return p.hills === 1 ? 'Eén lus langs een helling' : `Eén lus langs ${p.hills} hellingen`;
}

export function proposalFacts(p: RouteProposal): string {
  // Onder ongeveer 40 m weet niemand het op 20 m na: dan geen getal met schijnprecisie. Vraagt de
  // training hoogtemeters, dan staat het getal er altijd: een lus heet nooit vrijwel vlak naast een doel.
  const flat = p.targetAscentM === undefined && isNearlyFlat(p.ascentM);
  return `${km(p.distanceM)} · ${flat ? 'vrijwel vlak' : `${formatNumberNL(round10(p.ascentM), 0)} hoogtemeters`}`;
}

// Wat je over deze lus moet weten naast de getallen: het droge feit, in korte zinnen.
export function proposalNotes(p: RouteProposal, target: RouteTarget): string[] {
  const notes: string[] = [];
  if (p.style === 'simple' && p.climbM && p.climbLengthM) {
    notes.push(`De helling: ${formatNumberNL(Math.round(p.climbM), 0)} m omhoog over ${formatNumberNL(Math.round(p.climbLengthM / 10) * 10, 0)} m.`);
  }
  if (p.style === 'simple' && (p.repeats ?? 0) > 1) notes.push('Op dezelfde helling kan je horloge naar het verkeerde stuk springen.');
  if (p.startGapM !== undefined) notes.push(`Het dichtstbijzijnde pad ligt ${formatNumberNL(round10(p.startGapM), 0)} m van je startpunt; dat stuk is een rechte lijn.`);
  const d = target.distanceKm * 1000;
  // Korter op de getallen die je ziet (op 100 m): 10,5 km tegen 10,5 km is niet korter.
  const shortBy = Math.round(d / 100) - Math.round(p.distanceM / 100);
  if (tooShort(p, target)) notes.push(`${km(p.distanceM)}, korter dan de ${formatNumberNL(target.distanceKm, 1)} km van je training.`);
  else if (shortBy > 0) notes.push(`${km(shortBy * 100)} korter dan je training. Tot ${formatNumberNL(Math.round(SHORT_LIMIT * 100), 0)} procent korter is goed genoeg.`);
  else if (p.distanceM > d * (1 + CLOSE_ENOUGH)) notes.push(`Langer dan de ${formatNumberNL(target.distanceKm, 1)} km van je training.`);
  if (p.notice) notes.push(p.notice);
  if (p.style === 'adventure' && p.repeatedShare > 0.15) notes.push('Een deel loop je twee keer.');
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
  if (target.ascentM < MIN_ASCENT_TARGET_M || p.ascentM >= target.ascentM * SHORT_ASCENT) return undefined;
  const m = (v: number) => `${formatNumberNL(round10(v), 0)} m`;
  const loop = `Deze lus stijgt ${m(p.ascentM)}; de training vraagt ${m(target.ascentM)}.`;
  if (!found) return loop;
  if (found.hills > 0 && found.tallestM !== undefined) return `De hoogste helling dichtbij ligt ${formatNumberNL(Math.round(found.tallestM), 0)} m boven je plek. ${loop}`;
  return `${noHillLine(found)} ${loop}`;
}

// De zin in het blok van een lus die er niet kwam. Zonder pad bij het startpunt zegt de regel
// bovenaan het al (NO_PATH_AT_START): dan hier geen zin over hellingen, want Simpel is niet gezocht.
export function failureLine(style: RouteProposal['style'], outcome: Extract<PlanOutcome, { ok: false }>, flat: boolean): string {
  if (outcome.at === 'start') return 'Geen lus zonder pad bij je startpunt.';
  if (outcome.reason === 'nothing' || outcome.reason === 'unmapped') return style === 'simple' ? (flat ? 'Geen pad gevonden vanaf je plek.' : 'Geen helling gevonden die bij je training past.') : 'Geen lus gevonden vanaf je plek.';
  return 'De routeplanner antwoordde niet.';
}

export const SUBSTITUTE_LINE = 'Hoogtemeters bergop haal je ook op een trap, een brug of de loopband op helling.';

// Wat er in de buurt gevonden is, in één regel, en zonder genoeg hoogte waar je die anders haalt
// (de vervangers die de app al noemt bij Geen heuvel in de buurt). Alleen bij een training met
// hoogtemeters; zonder kaart geen telling. Alleen tekst: het plant niets. Zie
// docs/beslissingen/2026-11-10-route-uitleg.md.
export function searchLines(plans: RoutePlans, target: RouteTarget): string[] {
  if (plans.notice) return [plans.notice];
  if (target.ascentM < MIN_ASCENT_TARGET_M) return [];
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
  if (!made.some((p) => p.ascentM >= target.ascentM * SHORT_ASCENT)) lines.push(SUBSTITUTE_LINE);
  return lines;
}
