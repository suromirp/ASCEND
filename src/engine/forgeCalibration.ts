// ASCEND: "Hoe goed kent Forge je". Forge meet zich aan je eigen trainingen, niet aan MacroFactor
// (docs/visie/Los van MacroFactor.md, docs/beslissingen/2026-11-09-hoe-goed-kent-forge-je.md). Pure, geen
// scheidsrechter en geen planning: de uitkomst is alleen tekst en verandert nooit iets in het plan of een log.
//
// Drie maten over een venster (standaard de laatste 4 weken), alleen over werksets uit Forge waarvan het log
// bewaart wat Forge vroeg (`repsAsked`, `weightKgAsked`, `forgeKg`, `rirAsked`; oudere logs hebben dat niet en
// tellen dus niet mee, nooit geraden):
//
// - Voorspelling: een set telt als je het voorgestelde gewicht pakte en zelf een RIR invulde (een afgevinkte
//   set zonder eigen RIR zegt niets). De gehaalde herhalingen omgerekend naar de gevraagde RIR zijn
//   `reps + rir - rirAsked`; raak als dat hooguit 1 naast `repsAsked` ligt. De afwijking heeft een teken:
//   positief is meer gehaald dan voorspeld (te licht voorgeschreven), negatief minder (te zwaar).
// - Bijsturen: het aandeel werksets waarin je het gewicht veranderde voor je afvinkte, of bij een afgevinkte
//   set zonder eigen RIR de herhalingen. Bij een set met eigen RIR zijn de herhalingen de uitkomst, geen bijsturing.
// - Sterker: de trend van het geschatte maximum per hoofdoefening over 6 tot 8 weken.
//
// Een oefening telt pas mee vanaf `MIN_SETS` sets; daaronder staat er "nog te weinig data" in plaats van een getal.

import type { Exercise, MovementPattern } from '../models/exercise';
import type { SessionLog, SetLog } from '../models/training';
import { addDays, daysBetween } from '../utils/dates';
import { logOrigin, REPS_ROOM } from './prescriptionCheck';
import { estimateSet, sessionStrength, type LoadContext } from './strengthModel';
import { exerciseKey } from './strengthHistory';
import { isWorkSet } from './workSets';

export const CALIBRATION_WEEKS = 4;
export const MIN_SETS = 6;
// Grenzen uit het visiedocument.
export const PREDICTION_GOAL = 0.7;
export const ADJUST_LIMIT = 0.1;
// Het trendvenster: 8 weken terug, en minstens 6 weken tussen de eerste en de laatste training.
export const TREND_DAYS = 56;
export const TREND_MIN_SPAN_DAYS = 42;
export const TREND_MIN_SESSIONS = 3;
// Binnen deze verandering over het venster heet een trend "gelijk".
export const TREND_FLAT = 0.02;
export const MAIN_LIFTS = 4;

const COMPOUND: ReadonlySet<MovementPattern> = new Set<MovementPattern>(['squat', 'hinge', 'push_horizontal', 'push_vertical', 'pull_horizontal', 'pull_vertical']);

export type Verdict = 'goed' | 'nog_niet' | 'te_weinig';
export type Trend = 'stijgt' | 'gelijk' | 'daalt';

export interface PredictionTally {
  // Sets die meetellen (meting met eigen RIR op het voorgestelde gewicht) en hoeveel daarvan raak waren.
  sets: number;
  hit: number;
  // Gemiddelde afwijking in herhalingen met teken: positief te licht voorgeschreven, negatief te zwaar.
  meanDeviation?: number;
}

export interface AdjustTally {
  sets: number;
  adjusted: number;
}

export interface ExerciseCalibration {
  key: string;
  name: string;
  // Alle werksets met een voorschrift van Forge en een uitkomst.
  sets: number;
  enough: boolean;
  prediction: PredictionTally;
  adjust: AdjustTally;
}

export interface TrendReading {
  key: string;
  name: string;
  trend: Trend;
  // Verandering over het venster als aandeel van het gemiddelde, met teken.
  change: number;
  sessions: number;
}

export interface Calibration {
  from: string;
  to: string;
  perExercise: ExerciseCalibration[];
  // Samen: alleen oefeningen met genoeg sets.
  prediction: PredictionTally & { verdict: Verdict };
  adjust: AdjustTally & { verdict: Verdict };
  strength: { readings: TrendReading[]; verdict: Verdict };
  // Alle drie goed: het kracht-punt van "Los van MacroFactor Workouts" is waar (de rest staat in de backlog).
  allGood: boolean;
  lines: CalibrationLines;
}

export interface CalibrationLines {
  prediction: string;
  adjust: string;
  strength: string;
  // Eén zin over de kant waarop Forge ernaast zit, alleen bij een duidelijke scheefheid.
  bias?: string;
}

export interface CalibrationInput {
  logs: SessionLog[];
  today: string;
  bodyKg?: number;
  maxToFailure?: number;
  weeks?: number;
  minSets?: number;
}

const near = (a: number | undefined, b: number | undefined): boolean => a !== undefined && b !== undefined && Math.abs(a - b) < 1e-6;

interface AskedSet {
  set: SetLog;
  // Het gewicht dat Forge in de rij had toen je afvinkte.
  forgeKg: number | undefined;
}

// Heeft de set een voorschrift van Forge en een uitkomst? Zonder `repsAsked` en `weightKgAsked` weten we niet wat
// Forge vroeg (alleen sets uit Forge dragen ze); een houding of een set met band zegt hier niets.
function asked(set: SetLog): AskedSet | undefined {
  if (!isWorkSet(set) || set.reps <= 0 || set.seconds !== undefined || set.band !== undefined) return undefined;
  if (set.repsAsked === undefined && set.weightKgAsked === undefined) return undefined;
  return { set, forgeKg: set.forgeKg ?? set.weightKgAsked };
}

// Was het gewicht dat je pakte wat Forge in de rij had? Zonder bekend gewicht (eigen gewicht) telt het als ja.
const followedWeight = (a: AskedSet): boolean => a.forgeKg === undefined || near(a.set.weightKg ?? 0, a.forgeKg);

export function wasAdjusted(a: AskedSet): boolean {
  if (!followedWeight(a)) return true;
  // Bij een afgevinkte set zonder eigen RIR staan de herhalingen zoals je ze invulde; bij een eigen RIR zijn het de uitkomst.
  return !!a.set.rirAssumed && a.set.repsAsked !== undefined && a.set.reps !== a.set.repsAsked;
}

// De afwijking van een voorspelling in herhalingen, of undefined als de set geen meting is.
export function predictionDeviation(a: AskedSet): number | undefined {
  const s = a.set;
  if (s.rirAssumed || s.rir === undefined || s.rirAsked === undefined || s.repsAsked === undefined) return undefined;
  if (!followedWeight(a)) return undefined;
  return s.reps + s.rir - s.rirAsked - s.repsAsked;
}

function tallyPrediction(devs: number[]): PredictionTally {
  const hit = devs.filter((d) => Math.abs(d) <= REPS_ROOM + 1e-9).length;
  return { sets: devs.length, hit, ...(devs.length > 0 ? { meanDeviation: devs.reduce((a, b) => a + b, 0) / devs.length } : {}) };
}

export function windowStart(today: string, weeks = CALIBRATION_WEEKS): string {
  return addDays(today, -7 * weeks);
}

function logsInWindow(logs: SessionLog[], from: string, to: string): SessionLog[] {
  return logs.filter((l) => l.strengthData && l.strengthData.length > 0 && logOrigin(l) === 'forge' && l.completedDate > from && l.completedDate <= to);
}

export function exerciseCalibration(input: CalibrationInput): ExerciseCalibration[] {
  const to = input.today;
  const from = windowStart(to, input.weeks);
  const min = input.minSets ?? MIN_SETS;
  const byKey = new Map<string, { name: string; sets: AskedSet[] }>();
  for (const log of logsInWindow(input.logs, from, to)) {
    for (const entry of log.strengthData ?? []) {
      const { key, exercise } = exerciseKey(entry.exerciseId, entry.exerciseName);
      let g = byKey.get(key);
      if (!g) byKey.set(key, (g = { name: exercise?.name ?? entry.exerciseName, sets: [] }));
      for (const s of entry.sets) {
        const a = asked(s);
        if (a) g.sets.push(a);
      }
    }
  }
  return [...byKey.entries()]
    .filter(([, g]) => g.sets.length > 0)
    .map(([key, g]) => {
      const devs = g.sets.map(predictionDeviation).filter((d): d is number => d !== undefined);
      return {
        key,
        name: g.name,
        sets: g.sets.length,
        enough: g.sets.length >= min,
        prediction: tallyPrediction(devs),
        adjust: { sets: g.sets.length, adjusted: g.sets.filter(wasAdjusted).length },
      };
    })
    .sort((a, b) => b.sets - a.sets || a.name.localeCompare(b.name, 'nl'));
}

// --- sterker -----------------------------------------------------------------------------------

// Een kleinste-kwadraten lijn door (dag, kracht); de verandering over het venster als aandeel van het gemiddelde.
function relativeChange(points: { day: number; value: number }[]): number {
  const n = points.length;
  const mx = points.reduce((a, p) => a + p.day, 0) / n;
  const my = points.reduce((a, p) => a + p.value, 0) / n;
  const sxx = points.reduce((a, p) => a + (p.day - mx) ** 2, 0);
  if (sxx === 0 || my === 0) return 0;
  const slope = points.reduce((a, p) => a + (p.day - mx) * (p.value - my), 0) / sxx;
  const span = Math.max(...points.map((p) => p.day)) - Math.min(...points.map((p) => p.day));
  return (slope * span) / my;
}

export const trendOf = (change: number): Trend => (change > TREND_FLAT ? 'stijgt' : change < -TREND_FLAT ? 'daalt' : 'gelijk');

// Het geschatte maximum (de kracht van die dag, dezelfde schatting als de rest van Forge) per hoofdoefening
// over de laatste 8 weken. Hoofdoefeningen zijn de samengestelde bewegingen met de meeste trainingen; ze hebben
// minstens 3 trainingen over minstens 6 weken nodig, anders staat er geen trend.
export function strengthTrends(input: CalibrationInput): TrendReading[] {
  const to = input.today;
  const from = addDays(to, -TREND_DAYS);
  const groups = new Map<string, { name: string; exercise?: Exercise; points: { day: number; value: number }[] }>();
  for (const log of [...logsInWindow(input.logs, from, to)].sort((a, b) => a.completedAt.localeCompare(b.completedAt))) {
    for (const entry of log.strengthData ?? []) {
      const { key, exercise } = exerciseKey(entry.exerciseId, entry.exerciseName);
      if (!exercise || !COMPOUND.has(exercise.pattern) || exercise.measure === 'hold') continue;
      const ctx: LoadContext = { exercise, bodyKg: input.bodyKg, maxToFailure: input.maxToFailure };
      if (!entry.sets.some((s) => estimateSet(s, ctx))) continue;
      const value = sessionStrength(entry.sets, ctx);
      if (value === undefined) continue;
      let g = groups.get(key);
      if (!g) groups.set(key, (g = { name: exercise.name, exercise, points: [] }));
      g.points.push({ day: daysBetween(from, log.completedDate), value });
    }
  }
  const eligible = [...groups.entries()]
    .filter(([, g]) => g.points.length >= TREND_MIN_SESSIONS && Math.max(...g.points.map((p) => p.day)) - Math.min(...g.points.map((p) => p.day)) >= TREND_MIN_SPAN_DAYS)
    .sort((a, b) => b[1].points.length - a[1].points.length || a[1].name.localeCompare(b[1].name, 'nl'))
    .slice(0, MAIN_LIFTS);
  return eligible.map(([key, g]) => {
    const change = relativeChange(g.points);
    return { key, name: g.name, trend: trendOf(change), change, sessions: g.points.length };
  });
}

// --- het geheel --------------------------------------------------------------------------------

function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} en ${names[names.length - 1]}`;
}

export function strengthLine(readings: TrendReading[]): string {
  if (readings.length === 0) return 'Sterker: nog te weinig data';
  const parts: string[] = [];
  const group = (t: Trend, one: string, many: string) => {
    const names = readings.filter((r) => r.trend === t).map((r) => r.name);
    if (names.length > 0) parts.push(`${listNames(names)} ${names.length === 1 ? one : many}`);
  };
  group('stijgt', 'stijgt', 'stijgen');
  group('gelijk', 'blijft gelijk', 'blijven gelijk');
  group('daalt', 'daalt', 'dalen');
  return `Sterker: ${parts.join(', ')}`;
}

const nl = (n: number): string => String(Math.round(n * 10) / 10).replace('.', ',');

export function biasLine(mean: number | undefined): string | undefined {
  if (mean === undefined || Math.abs(mean) < 0.5) return undefined;
  const reps = nl(Math.abs(mean));
  return mean < 0 ? `Forge schreef gemiddeld ${reps} herhaling te zwaar voor.` : `Forge schreef gemiddeld ${reps} herhaling te licht voor.`;
}

export function calibrate(input: CalibrationInput): Calibration {
  const to = input.today;
  const from = windowStart(to, input.weeks);
  const min = input.minSets ?? MIN_SETS;
  const perExercise = exerciseCalibration(input);
  const counted = perExercise.filter((e) => e.enough);

  // Samen: de sets van de oefeningen met genoeg data. Voor de voorspelling tellen alleen de metingen, en die
  // moeten zelf ook genoeg zijn.
  const devs = counted.flatMap((e) => (e.prediction.sets > 0 ? [e] : []));
  const predSets = devs.reduce((a, e) => a + e.prediction.sets, 0);
  const predHit = devs.reduce((a, e) => a + e.prediction.hit, 0);
  const predMean = predSets > 0 ? devs.reduce((a, e) => a + (e.prediction.meanDeviation ?? 0) * e.prediction.sets, 0) / predSets : undefined;
  const predEnough = predSets >= min;
  const prediction = {
    sets: predSets,
    hit: predHit,
    ...(predMean !== undefined ? { meanDeviation: predMean } : {}),
    verdict: (!predEnough ? 'te_weinig' : predHit / predSets >= PREDICTION_GOAL - 1e-9 ? 'goed' : 'nog_niet') as Verdict,
  };

  const adjSets = counted.reduce((a, e) => a + e.adjust.sets, 0);
  const adjusted = counted.reduce((a, e) => a + e.adjust.adjusted, 0);
  const adjust = {
    sets: adjSets,
    adjusted,
    verdict: (adjSets < min ? 'te_weinig' : adjusted / adjSets < ADJUST_LIMIT ? 'goed' : 'nog_niet') as Verdict,
  };

  const readings = strengthTrends(input);
  const strength = {
    readings,
    verdict: (readings.length === 0 ? 'te_weinig' : readings.some((r) => r.trend === 'daalt') ? 'nog_niet' : 'goed') as Verdict,
  };

  const lines: CalibrationLines = {
    prediction: prediction.verdict === 'te_weinig' ? 'Voorspelling: nog te weinig data' : `Voorspelling: ${predHit} van de ${predSets} sets raak`,
    adjust: adjust.verdict === 'te_weinig' ? 'Bijgestuurd: nog te weinig data' : adjusted === 0 ? `Bijgestuurd: geen van de ${adjSets} sets` : `Bijgestuurd: ${adjusted} op de ${adjSets} sets`,
    strength: strengthLine(readings),
    ...(prediction.verdict !== 'te_weinig' && biasLine(predMean) ? { bias: biasLine(predMean) } : {}),
  };

  return { from, to, perExercise, prediction, adjust, strength, allGood: prediction.verdict === 'goed' && adjust.verdict === 'goed' && strength.verdict === 'goed', lines };
}

// Een regel per oefening voor in het blad: het droge feit eerst, of dat er nog te weinig data is.
export function exerciseLine(e: ExerciseCalibration, minSets = MIN_SETS): string {
  if (!e.enough) return `Nog te weinig data (${e.sets} van ${minSets} sets)`;
  const p = e.prediction.sets >= 1 ? `${e.prediction.hit} van de ${e.prediction.sets} sets raak` : 'geen sets met eigen RIR';
  const a = e.adjust.adjusted === 0 ? 'niet bijgestuurd' : `${e.adjust.adjusted} bijgestuurd`;
  return `${p}, ${a}`;
}

// Of het blok iets te zeggen heeft: zonder één set met een voorschrift van Forge blijft het weg.
export const hasAnyData = (c: Calibration): boolean => c.perExercise.length > 0 || c.strength.readings.length > 0;
