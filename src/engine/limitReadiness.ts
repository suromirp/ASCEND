// ASCEND, "Klaar voor je doel" met een tijdslimiet of een cutoff: een voorwaarde.
//
// Je wilt de dag of de wedstrijd volbrengen, maar alleen binnen een tijd (de laatste lift of bus van een
// dagtocht, de cutoff van een ultra). De meter Tempo telt als een gewone meter, even zwaar als de andere.
//   verwacht   wat jouw eigen lange dagen voorspellen voor deze dag of wedstrijd
//   grens      de limiet min een marge (instelling, advies 10%: eten, pauzes, een tragere dag)
// Is verwacht binnen de grens, dan 100%. Anders het gat in weken werk (engine/goalGap.ts) en de kromme
// 10 / (10 + weken), met de groei van data/goalGrowth.ts.
//
// Dagtocht: de DIN-tijd van de dag (goalRoute.ts#estimatedHikingMinutes) keer jouw eigen factor, de mediaan
// van jouw tijd gedeeld door de DIN-tijd op wandelingen van minstens anderhalf uur in de laatste acht weken,
// minstens drie. Trail: inspanningskilometers (kilometers plus het stijgen gedeeld door 100), jouw beste tempo
// per inspanningskilometer op een loop of wandeling van minstens anderhalf uur, doorgetrokken met een
// Riegel-exponent van 1,06 tot drie uur en 1,15 daarboven. Beide zijn schattingen, zwakker dan een testloop,
// en de zin zegt dat. Zonder genoeg eigen dagen is er geen meter maar één eerlijke regel.
//
// Er komt geen groeiband tot de doeldag bij: de schatting is al zwak, nog een groeiband erop is schijnzekerheid.
//
// Puur: geen React, geen opslag. Besluit: docs/beslissingen/2026-10-28-klaar-voor-je-doel-logisch.md.

import type { TrainingGoal } from '../models/goals';
import type { SessionLog } from '../models/training';
import { GOAL_GROWTH, LIMIT_MARGINS, growthPer, type GrowthChoice, type LimitMarginChoice } from '../data/goalGrowth';
import { addDays, localDateOf } from '../utils/dates';
import { computeGoalReadiness, readinessInputOf, type ExternalValue, type GoalReadiness } from './goalReadiness';
import { fillFromWeeks, weeksOfWork } from './goalGap';
import { estimatedHikingMinutes } from './goalRoute';
import { logSport } from './sports';
import { descentOf } from './standing';

export const LIMIT_WINDOW_DAYS = 56;
export const LIMIT_MIN_MINUTES = 90;
export const LIMIT_MIN_HIKES = 3;
// Riegel-exponent voor een trail: tot drie uur en daarboven (Vickers en Vertosick 2016, matig; daarboven afgeleid, zwak).
export const TRAIL_EXPONENT = 1.06;
export const TRAIL_EXPONENT_LONG = 1.15;
export const TRAIL_LONG_MINUTES = 180;

export const NEED_HIKES_LINE = 'Na drie lange wandelingen kan ASCEND je tempo schatten.';
export const NEED_LONG_RUN_LINE = 'Na een lange loop of wandeling van minstens anderhalf uur kan ASCEND je tempo schatten.';

// "6:54" (uren en minuten), voor een dag die langer duurt dan een uur.
export function hoursMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const dataOf = (l: SessionLog) => l.outdoorData ?? l.cardioData;
const kmOf = (l: SessionLog): number => dataOf(l)?.distanceKm ?? 0;
const gainOf = (l: SessionLog): number => {
  const d = dataOf(l);
  return d && !d.estimatedElevation ? d.elevationGainM ?? 0 : 0;
};
const isHike = (l: SessionLog): boolean => {
  const sport = logSport(l);
  return sport === 'hiking' || (sport === undefined && (l.type === 'hiking' || l.type === 'adventure'));
};
const isRun = (l: SessionLog): boolean => logSport(l) === 'running';

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Jouw factor ten opzichte van de DIN-tijd, uit je eigen wandelingen. Undefined onder de drie.
export function dinFactor(logs: SessionLog[], date: string): number | undefined {
  const since = addDays(date, -LIMIT_WINDOW_DAYS);
  const ratios = logs
    .filter((l) => l.completedDate >= since && l.completedDate <= date && isHike(l) && l.durationMinutes >= LIMIT_MIN_MINUTES && kmOf(l) > 0)
    .map((l) => l.durationMinutes / estimatedHikingMinutes(kmOf(l), gainOf(l), descentOf(l)));
  return ratios.length >= LIMIT_MIN_HIKES ? median(ratios) : undefined;
}

// Het tempo per inspanningskilometer van je beste loop of wandeling, en de tijd van die dag.
export function bestEffortPace(logs: SessionLog[], date: string): { pace: number; minutes: number; effortKm: number; sport: 'run' | 'hike' } | undefined {
  const since = addDays(date, -LIMIT_WINDOW_DAYS);
  let best: { pace: number; minutes: number; effortKm: number; sport: 'run' | 'hike' } | undefined;
  for (const l of logs) {
    if (l.completedDate < since || l.completedDate > date || !(isHike(l) || isRun(l)) || l.durationMinutes < LIMIT_MIN_MINUTES) continue;
    const effortKm = kmOf(l) + gainOf(l) / 100;
    if (kmOf(l) <= 0 || effortKm <= 0) continue;
    const pace = l.durationMinutes / effortKm;
    if (!best || pace < best.pace) best = { pace, minutes: l.durationMinutes, effortKm, sport: isRun(l) ? 'run' : 'hike' };
  }
  return best;
}

// Een tijd doortrekken met een Riegel-exponent die boven drie uur oploopt.
export function stretchTime(minutes: number, ratio: number): number {
  if (!(minutes > 0) || !(ratio > 0)) return minutes;
  if (minutes >= TRAIL_LONG_MINUTES) return minutes * Math.pow(ratio, TRAIL_EXPONENT_LONG);
  const at180 = Math.pow(TRAIL_LONG_MINUTES / minutes, 1 / TRAIL_EXPONENT);
  return ratio <= at180 ? minutes * Math.pow(ratio, TRAIL_EXPONENT) : TRAIL_LONG_MINUTES * Math.pow(ratio / at180, TRAIL_EXPONENT_LONG);
}

export interface LimitRead {
  kind: 'hike' | 'trail';
  expected: number;
  limit: number;
  edge: number;
  weeks: number;
  share: number;
  text: string;
  // De droge regel van nu: wat de schatting is naast de limiet.
  line: string;
}

export type LimitResult = { read: LimitRead } | { need: string } | undefined;

export interface LimitChoices {
  growth?: GrowthChoice;
  margin?: LimitMarginChoice;
}

export function readLimit(goal: TrainingGoal, logs: SessionLog[], date: string, choices: LimitChoices = {}): LimitResult {
  const d = goal.details;
  if (!d) return undefined;
  const hike = goal.kind === 'day_hike' && d.timeLimitMinutes && d.timeLimitMinutes > 0;
  // Een cutoff hoort bij een ultra: een korte trail heeft er geen (zoals het formulier ook zegt).
  const trail = goal.kind === 'trail' && d.variant === 'ultra' && d.cutoffMinutes && d.cutoffMinutes > 0;
  if (!hike && !trail) return undefined;
  const limit = (hike ? d.timeLimitMinutes : d.cutoffMinutes) as number;
  let expected: number;
  let refSport: 'run' | 'hike' | undefined;
  if (hike) {
    if (!d.distanceKm) return { need: 'Vul de afstand van je dag in, dan kan ASCEND je tempo naast je tijdslimiet leggen.' };
    const factor = dinFactor(logs, date);
    if (factor === undefined) return { need: NEED_HIKES_LINE };
    expected = estimatedHikingMinutes(d.distanceKm, d.gainM ?? 0, d.lossM ?? 0) * factor;
  } else {
    if (!d.distanceKm) return { need: 'Vul de afstand van je wedstrijd in, dan kan ASCEND je tempo naast je cutoff leggen.' };
    const ref = bestEffortPace(logs, date);
    if (!ref) return { need: NEED_LONG_RUN_LINE };
    const raceEffort = d.distanceKm + (d.gainM ?? 0) / 100;
    refSport = ref.sport;
    expected = stretchTime(ref.minutes, raceEffort / ref.effortKm);
  }
  const margin = LIMIT_MARGINS[choices.margin ?? 'ten'];
  const edge = limit * (1 - margin);
  const weeks = weeksOfWork({ now: expected, need: edge, lowerIsBetter: true, weeklyGain: growthPer(GOAL_GROWTH[hike ? 'walk' : 'trail'], choices.growth) });
  const name = hike ? 'tijdslimiet' : 'cutoff';
  const kind = hike ? 'je wandelingen' : refSport === 'run' ? 'je lange lopen' : 'je lange wandelingen';
  const marginText = margin > 0 ? `met ${Math.round(margin * 100)}% marge ligt de grens op ${hoursMinutes(edge)} uur` : 'zonder marge is de limiet zelf de grens';
  return {
    read: {
      kind: hike ? 'hike' : 'trail', expected, limit, edge, weeks, share: fillFromWeeks(weeks),
      text: `${hoursMinutes(expected)} uur verwacht, ${name} ${hoursMinutes(limit)} uur`,
      line: `${kind[0].toUpperCase()}${kind.slice(1)} passen bij ongeveer ${hoursMinutes(expected)} uur; de ${name} is ${hoursMinutes(limit)} uur, ${marginText}. Een schatting uit je eigen dagen, minder zeker dan een testloop.`,
    },
  };
}

export interface LimitReadinessOptions extends LimitChoices {
  naming: { the: string; your: string };
  since?: string;
}

// "Klaar voor je doel" van een dagtocht of trailrun. Zonder limiet of cutoff geeft dit wat computeGoalReadiness gaf.
export function computeLimitReadiness(goal: TrainingGoal, logs: SessionLog[], today: string, options: LimitReadinessOptions): GoalReadiness | undefined {
  const input = readinessInputOf(goal);
  if (!input) return undefined;
  const external = (id: string, date: string): ExternalValue | undefined => {
    if (id !== 'tempo') return undefined;
    const res = readLimit(goal, logs, date, options);
    return res && 'read' in res ? { share: res.read.share, text: res.read.text } : undefined;
  };
  const r = computeGoalReadiness(input, logs, today, { naming: options.naming, since: options.since ?? localDateOf(goal.createdAt), external });
  const now = readLimit(goal, logs, today, options);
  if (!now) return r;
  const line = 'read' in now ? now.read.line : now.need;
  return { ...r, derivedNote: [r.derivedNote, line].filter(Boolean).join(' ') };
}
