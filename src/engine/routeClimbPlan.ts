// ASCEND: hoogtemeters halen in Route voorstellen (I-160). De keuze onder de lussen (Hoogtemeters halen of
// Afstand houden, elk met de som), en als buiten niet genoeg hoogte geeft een derde rij: buiten plus een
// helling of trap uit de gids Trainingsplekken, binnen de rijtijd, of anders de loopband op helling.
// Deterministisch en zonder netwerk: de plekken komen uit data/trainingSpots.ts, de rijtijd uit de schatting
// van de gids (engine/trainingSpots.ts#driveMinutes). Alleen een voorstel voor deze training: het verandert
// de planning niet, de PlannedSession blijft zoals hij is. Ontwerp: docs/visie/Ontwerp route per training.md.

import type { RoutePoint, RouteProposal, RouteTarget } from '../models/route';
import type { TrainingSpot } from '../data/trainingSpots';
import { formatNumberNL } from '../utils/number';
import { MIN_ASCENT_TARGET_M, MIN_CLIMB_M, SHORT_ASCENT, askedAscent, type LoopPriority, type RoutePlans } from './routePlanner';
import { driveMinutes, roadKm, straightKm, walkMinutes, WALKABLE_ROAD_KM } from './trainingSpots';

// ---------- Instellingen ----------

// Wat gaat voor in een lus: advies is hoogtemeters als de training ze vraagt, anders de afstand.
export type LoopPrioritySetting = 'auto' | LoopPriority;
export const resolveLoopPrioritySetting = (raw: unknown): LoopPrioritySetting => (raw === 'ascent' || raw === 'distance' ? raw : 'auto');

export function resolveLoopPriority(setting: unknown, target: RouteTarget): LoopPriority {
  const s = resolveLoopPrioritySetting(setting);
  if (s !== 'auto') return s;
  return askedAscent(target) >= MIN_ASCENT_TARGET_M ? 'ascent' : 'distance';
}

// Rijtijd naar heuvels, in minuten: 0 is niet rijden, 'free' is geen grens. Advies 30.
export type DriveLimitSetting = 0 | 15 | 30 | 45 | 'free';
export const DRIVE_LIMIT_ADVICE: DriveLimitSetting = 30;
export const resolveDriveLimit = (raw: unknown): DriveLimitSetting => (raw === 0 || raw === 15 || raw === 30 || raw === 45 || raw === 'free' ? raw : DRIVE_LIMIT_ADVICE);
export const driveLimitMinutes = (s: DriveLimitSetting): number | undefined => (s === 'free' ? undefined : s);

// ---------- Hoogtemeters halen of afstand houden ----------

const km = (meters: number) => `${formatNumberNL(Math.round(meters / 100) / 10, 1)} km`;
const round10 = (m: number) => Math.round(m / 10) * 10;
const hm = (m: number) => `${formatNumberNL(round10(m), 0)} hoogtemeters`;

export const CHOICE_LABEL: Record<LoopPriority, string> = { ascent: 'Hoogtemeters halen', distance: 'Afstand houden' };

// "14 km, 300 hoogtemeters: 4 keer op en neer"; het aantal altijd als getal, want het is een som.
export function choiceSum(p: Pick<RouteProposal, 'distanceM' | 'ascentM' | 'repeats'>): string {
  const base = `${km(p.distanceM)}, ${hm(p.ascentM)}`;
  return p.repeats ? `${base}: ${p.repeats} keer op en neer` : base;
}

export interface LoopChoiceRow {
  priority: LoopPriority;
  label: string;
  sum: string;
  advised: boolean;
  picked: boolean;
}

// De twee rijen onder de lussen, alleen als de training hoogtemeters vraagt en de twee keuzes echt verschillen
// (anders is er niets te kiezen). Uit dezelfde helling als Simpel, zonder nieuwe zoektocht.
export function loopChoiceRows(plans: RoutePlans | undefined, target: RouteTarget, advised: LoopPriority, picked: LoopPriority): LoopChoiceRow[] {
  const simple = plans?.choices?.simple;
  if (!simple || askedAscent(target) < MIN_ASCENT_TARGET_M) return [];
  const { ascent, distance } = simple;
  if (!ascent.ok || !distance.ok || ascent.proposal.repeats === distance.proposal.repeats) return [];
  return (['ascent', 'distance'] as const).map((priority) => {
    const o = simple[priority] as Extract<typeof ascent, { ok: true }>;
    return { priority, label: CHOICE_LABEL[priority], sum: choiceSum(o.proposal), advised: priority === advised, picked: priority === picked };
  });
}

// ---------- Buiten plus een helling, trap of de loopband ----------

// Zoveel keer op en neer hoogstens op een helling of trap uit de gids.
export const MAX_SPOT_REPEATS = 30;
// ASCEND_HEURISTIC(LOOPBAND-HELLING): stevig wandelen op 5 km/u bij 10 procent helling is 500 m stijgen per
// uur; vuistregel van de bouwer, geen onderzoek (docs/onderhoud/sherpa-route-hoogtemeters.md).
export const TREADMILL_GRADE_PCT = 10;
export const TREADMILL_KMH = 5;
const treadmillMetersPerMin = (TREADMILL_KMH * 1000 * (TREADMILL_GRADE_PCT / 100)) / 60;
export const TREADMILL_LINE = 'Op de loopband tel je de helling, niet de meters van je horloge.';
export const PLUS_INFO = 'Een trap of helling telt per keer op en neer; de hoogte staat in de gids Trainingsplekken.';

const isStair = (s: TrainingSpot) => /^Trap\b/.test(s.kind) || /met trap/.test(s.kind);
// Een echte helling of trap met een bekende hoogte per keer.
const climbable = (s: TrainingSpot) => (s.climbM ?? 0) >= MIN_CLIMB_M && (s.uses.includes('bergop') || s.uses.includes('trap'));

export function spotReachable(from: RoutePoint, spot: TrainingSpot, limitMin: number | undefined): boolean {
  const straight = straightKm(from, spot);
  if (roadKm(straight) <= WALKABLE_ROAD_KM) return true;
  if (limitMin === undefined) return true;
  return limitMin > 0 && driveMinutes(straight) <= limitMin;
}

// "18 minuten rijden" of, dichtbij, "24 minuten lopen".
function travelText(from: RoutePoint, spot: TrainingSpot): string {
  const straight = straightKm(from, spot);
  return roadKm(straight) <= WALKABLE_ROAD_KM ? `${Math.max(1, walkMinutes(straight))} minuten lopen` : `${Math.max(1, driveMinutes(straight))} minuten rijden`;
}

export type OutdoorPlus =
  | { kind: 'spot'; title: string; facts: string; sum: string; spotLine: string; spotId: string; info: string }
  | { kind: 'treadmill'; title: string; facts: string; sum: string; noSpotLine: string; info: string };

export interface OutdoorPlusInput {
  // De lus buiten die nu gekozen is.
  outdoor: Pick<RouteProposal, 'distanceM' | 'ascentM'> | undefined;
  target: RouteTarget;
  from: RoutePoint;
  spots: readonly TrainingSpot[];
  driveLimitMin: number | undefined;
}

// De derde rij: alleen als de training hoogtemeters vraagt en de lus buiten minder dan SHORT_ASCENT haalt.
// Eerst een echte helling uit de gids binnen de rijtijd, dan een trap, de dichtstbijzijnde eerst; een plek die
// het tekort binnen MAX_SPOT_REPEATS keer haalt gaat voor. Geen plek binnen de rijtijd: de loopband.
export function outdoorPlus(i: OutdoorPlusInput): OutdoorPlus | undefined {
  const asked = askedAscent(i.target);
  if (asked < MIN_ASCENT_TARGET_M || i.target.plannedWalk) return undefined;
  const outKm = i.outdoor?.distanceM ?? 0;
  const outUp = i.outdoor?.ascentM ?? 0;
  if (outUp >= asked * SHORT_ASCENT) return undefined;
  const missing = asked - round10(outUp);
  const outside = i.outdoor ? `Buiten ${km(outKm)}, ${hm(outUp)}.` : 'Buiten vind je geen lus.';
  const candidates = i.spots
    .filter((s) => climbable(s) && spotReachable(i.from, s, i.driveLimitMin))
    .map((s) => ({ s, dist: straightKm(i.from, s), reps: Math.ceil(missing / (s.climbM as number)) }))
    .sort((a, b) => Number(isStair(a.s)) - Number(isStair(b.s)) || Number(a.reps > MAX_SPOT_REPEATS) - Number(b.reps > MAX_SPOT_REPEATS) || a.dist - b.dist || a.s.id.localeCompare(b.s.id));
  const pick = candidates[0];
  if (pick) {
    const reps = Math.min(MAX_SPOT_REPEATS, pick.reps);
    const up = reps * (pick.s.climbM as number);
    const climbLen = pick.s.climbs?.[0]?.lengthM;
    const extraM = climbLen ? reps * 2 * climbLen : 0;
    return {
      kind: 'spot',
      title: isStair(pick.s) ? 'Buiten plus een trap' : 'Buiten plus een helling',
      facts: `${outside} Daarna ${pick.s.name}, ${reps} keer op en neer, ${hm(up)}.`,
      sum: `Samen ${km(outKm + extraM)} en ${hm(outUp + up)}.`,
      spotLine: `${pick.s.name}, ${formatNumberNL(pick.s.climbM as number, 0)} m per keer, ${travelText(i.from, pick.s)}.`,
      spotId: pick.s.id,
      info: PLUS_INFO,
    };
  }
  const minutes = Math.ceil(missing / treadmillMetersPerMin / 5) * 5;
  const limit = i.driveLimitMin;
  return {
    kind: 'treadmill',
    title: 'Buiten plus de loopband',
    facts: `${outside} Daarna ${minutes} minuten op de loopband op ${TREADMILL_GRADE_PCT} procent, ${hm(missing)}.`,
    sum: `Samen ${km(outKm)} buiten en ${hm(outUp + missing)}.`,
    noSpotLine: limit === undefined ? 'In de gids staat geen trap of helling.' : limit === 0 ? 'Lopend te bereiken staat geen trap of helling in de gids.' : `Binnen ${limit} minuten rijden staat geen trap of helling in de gids.`,
    info: TREADMILL_LINE,
  };
}
