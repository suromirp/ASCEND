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
const CLOSE_ENOUGH = 0.12;
const NEAR_START_M = 250;
const SAME_SPOT_M = 200;

export interface PlanInput {
  start: RoutePoint;
  target: RouteTarget;
  terrain?: NearbyTerrain;
}

export type PlanOutcome = { ok: true; proposal: RouteProposal } | { ok: false; reason: RouteFailure | 'nothing' };

export interface RoutePlans {
  simple: PlanOutcome;
  adventure: PlanOutcome;
}

const usableHill = (f: TerrainFeature) => f.kind === 'hill' && (f.heightM === undefined || f.heightM >= MIN_CLIMB_M);
const reversed = (points: RoutePoint[]) => [...points].reverse();

// Hoe ver een lus van de training af zit: afstand en, als de training hoogtemeters vraagt, de stijging.
export function missScore(p: Pick<RouteProposal, 'distanceM' | 'ascentM'>, target: RouteTarget): number {
  const d = target.distanceKm * 1000;
  const dist = d > 0 ? Math.abs(p.distanceM - d) / d : 0;
  const asc = target.ascentM >= MIN_ASCENT_TARGET_M ? Math.abs(p.ascentM - target.ascentM) / target.ascentM : 0;
  return dist + asc;
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
    const height = f.heightM ?? 20;
    const repeats = Math.max(1, Math.round(target.ascentM / height));
    const estimate = 2 * DETOUR * crow + 2 * repeats * (height / 0.06);
    return { f, crow, miss: Math.abs(estimate - d) / d };
  });
  return hills
    .sort((a, b) => a.miss - b.miss || a.crow - b.crow || a.f.lat - b.f.lat || a.f.lon - b.f.lon)
    .slice(0, MAX_ROUTE_CALLS)
    .map(({ f }) => ({ lat: f.lat, lon: f.lon }));
}

// Vlak: een keerpunt op de helft van de afstand, liefst op een onverhard pad.
function flatCandidates({ start, target, terrain }: PlanInput): RoutePoint[] {
  const half = (target.distanceKm * 1000) / 2 / DETOUR;
  const paths = (terrain?.features ?? [])
    .filter((f) => f.kind === 'dirt_path')
    .map((f) => ({ f, off: Math.abs(metersBetween(start, f) - half) }))
    .sort((a, b) => a.off - b.off || a.f.lat - b.f.lat || a.f.lon - b.f.lon)
    .slice(0, MAX_ROUTE_CALLS - 1)
    .map(({ f }) => ({ lat: f.lat, lon: f.lon }));
  return [...paths, offsetPoint(start, 0, half)];
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
  const base = ascentOf(approach) + ascentOf(reversed(approach));
  const perRepeat = Math.max(climb.heightM, ascentOf(up) + ascentOf(down));
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
  let best: RouteProposal | undefined;
  let lastFailure: RouteFailure | undefined;
  for (const candidate of simpleCandidates(input)) {
    const answer = await route([input.start, candidate]);
    if (failed(answer)) {
      lastFailure = answer.reason;
      if (stops(answer.reason)) break;
      continue;
    }
    const made = flat ? composeOutAndBack(answer.line, input.target) : composeSimple(answer.line, input.target);
    if (!made) continue;
    if (!best || missScore(made, input.target) < missScore(best, input.target)) best = made;
    if (missScore(best, input.target) <= CLOSE_ENOUGH) break;
  }
  if (!best && !flat && spare) {
    // De lus in beide richtingen: de helling met de kortste aanloop past meestal het best.
    for (const points of [spare.points, reversed(spare.points)]) {
      const line = tallestClimbLine(points);
      const made = line ? composeSimple({ source: spare.source, points: line }, input.target) : undefined;
      if (made && (!best || missScore(made, input.target) < missScore(best, input.target))) best = made;
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
  const all: Via[] = (terrain?.features ?? [])
    .filter((f) => usableHill(f) || f.kind === 'dirt_path')
    .filter((f) => {
      const crow = metersBetween(start, f);
      return crow >= NEAR_START_M && crow <= d * reach;
    })
    .map((f) => ({ lat: f.lat, lon: f.lon, hill: f.kind === 'hill', value: f.kind === 'hill' ? 2 + (f.heightM ?? 20) / 20 : 1, angle: bearing(start, f) }))
    .sort((a, b) => b.value - a.value || a.lat - b.lat || a.lon - b.lon);
  // Twee dingen op dezelfde plek: de waardevolste blijft.
  const spread: Via[] = [];
  for (const v of all) {
    if (!spread.some((s) => metersBetween(s, v) < SAME_SPOT_M)) spread.push(v);
  }
  if (spread.length === 0) return ring(start, d * (reach / 0.25));

  let vias = spread.sort((a, b) => a.angle - b.angle || a.lat - b.lat);
  const tooLong = () => vias.length > MAX_VIAS || DETOUR * perimeter(start, vias) > d;
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
  return startAtWidestGap(vias);
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
      // Een punt zonder pad in de buurt valt weg; zegt de bron niet welk, dan het laatste.
      const i = answer.reason === 'unmapped' && answer.waypoint !== undefined && answer.waypoint >= 1 && answer.waypoint <= vias.length ? answer.waypoint - 1 : vias.length - 1;
      dropped.push(vias[i]);
      vias = vias.filter((_, j) => j !== i);
      continue;
    }
    const made = proposal('adventure', answer.line, answer.line.points, { hills: vias.filter((v) => v.hill).length });
    if (!best || score(made) < score(best)) best = made;
    const off = made.distanceM / d;
    if (Math.abs(off - 1) <= CLOSE_ENOUGH) break;
    reach = Math.min(0.6, Math.max(0.08, reach * Math.min(1.6, Math.max(0.6, 1 / off))));
    const next = kept(adventureVias(input, reach));
    // Dezelfde punten geven dezelfde lus: dan is er niets beters te halen.
    if (next.length === vias.length && next.every((v, i) => v.lat === vias[i].lat && v.lon === vias[i].lon)) break;
    vias = next;
  }
  if (best) return { ok: true, proposal: best };
  return { ok: false, reason: lastFailure ?? 'nothing' };
}

// Beide lussen, de avontuurlijke eerst (zijn lijn is de reserve voor Simpel). Gooit nooit: elke
// uitkomst is een lus of een reden.
export async function proposeRoutes(input: PlanInput, route: RouteFn): Promise<RoutePlans> {
  const safe = (p: Promise<PlanOutcome>) => p.catch((): PlanOutcome => ({ ok: false, reason: 'error' }));
  const adventure = await safe(proposeAdventure(input, route));
  const spare: RoutedLine | undefined = adventure.ok ? { source: adventure.proposal.source, points: adventure.proposal.points } : undefined;
  const simple = await safe(proposeSimple(input, route, spare));
  return { simple, adventure };
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
  const climb = round10(p.ascentM);
  return `${km(p.distanceM)} · ${climb >= MIN_ASCENT_TARGET_M ? `${formatNumberNL(climb, 0)} hoogtemeters` : 'vrijwel vlak'}`;
}

// Wat je over deze lus moet weten naast de getallen: het droge feit, in korte zinnen.
export function proposalNotes(p: RouteProposal, target: RouteTarget): string[] {
  const notes: string[] = [];
  if (p.style === 'simple' && p.climbM && p.climbLengthM) {
    notes.push(`De helling: ${formatNumberNL(Math.round(p.climbM), 0)} m omhoog over ${formatNumberNL(Math.round(p.climbLengthM / 10) * 10, 0)} m.`);
  }
  if (p.style === 'simple' && (p.repeats ?? 0) > 1) notes.push('Op dezelfde helling kan je horloge naar het verkeerde stuk springen.');
  const d = target.distanceKm * 1000;
  if (p.distanceM < d * 0.85) notes.push(`Korter dan de ${formatNumberNL(target.distanceKm, 1)} km van je training.`);
  else if (p.distanceM > d * 1.15) notes.push(`Langer dan de ${formatNumberNL(target.distanceKm, 1)} km van je training.`);
  if (target.ascentM >= MIN_ASCENT_TARGET_M && p.ascentM < target.ascentM * 0.75) {
    notes.push(`Minder dan de ${formatNumberNL(round10(target.ascentM), 0)} hoogtemeters van je training.`);
  }
  if (p.style === 'adventure' && p.repeatedShare > 0.15) notes.push('Een deel loop je twee keer.');
  return notes;
}
