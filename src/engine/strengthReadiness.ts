// ASCEND, "Klaar voor je doel" voor Sterker worden met een doelgewicht.
//
// De meter Krachttrend is per hoofdoefening het gat in weken werk (engine/goalGap.ts): het geschatte
// maximum van je beste set van de laatste 4 weken (KR-2, Epley, zoals KR-1) naast het geschatte maximum van
// je doel (gewicht en herhalingen). De groei per week hangt af van het niveau op die oefening
// (data/goalGrowth.ts). Het niveau komt uit de lengte van je eigen krachtgeschiedenis op die oefening:
//   meer dan twee jaar   ervaren
//   anders               gevorderd
// Beginner kiest ASCEND nooit zelf: een korte geschiedenis in de app zegt niet dat je net begint, en de
// voorzichtige afleiding gaat niet uit van beginnerswinst. Het blad zegt waar het op rust.
//
// Sets met een aangenomen RIR, opwarmsets en sets ver van falen tellen niet (estimateSet). Er wordt nooit
// van de ene oefening naar de andere omgerekend. De zin blijft "nog 10 kg voor 5 herhalingen", nooit "je max is".
//
// Puur: geen React, geen opslag. Besluit: docs/beslissingen/2026-10-28-klaar-voor-je-doel-logisch.md.

import type { TrainingGoal } from '../models/goals';
import type { SessionLog } from '../models/training';
import { STRENGTH_GROWTH, growthPer, type GrowthChoice, type StrengthLevel } from '../data/goalGrowth';
import { EXERCISES } from '../data/exercises';
import { matchExercise } from './exerciseMatch';
import { addDays, daysBetween } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { computeGoalReadiness, readinessInputOf, type ExternalValue, type GoalReadiness, type ReadinessOptions } from './goalReadiness';
import { fillFromWeeks, weeksOfWork } from './goalGap';
import { EPLEY_DIVISOR, estimateSet } from './strengthModel';

export const STRENGTH_WINDOW_DAYS = 28;
// Vanaf zoveel dagen geschiedenis op een oefening geldt "ervaren".
export const EXPERIENCED_DAYS = 730;

// Krachttrend 60%, harde sets 40% (zoals het document); Volhouden weegt hier zoals voorheen.
export const STRENGTH_WEIGHTS: Record<string, number> = { krachttrend: 0.6, hardeSets: 0.4 };

export function strengthLevelFor(historyDays: number): StrengthLevel {
  return historyDays > EXPERIENCED_DAYS ? 'ervaren' : 'gevorderd';
}

const norm = (s: string) => s.trim().toLowerCase();

// Een oefening herkend aan haar id in de lijst, aan haar naam of aan een alias (engine/exerciseMatch.ts), zodat een
// log onder een andere naam ("Barbell Back Squat") toch bij het doel "Kniebuiging" telt. Een oude opgeslagen naam
// die de lijst niet kent blijft op de gewone naamvergelijking werken.
function listId(name: string): string | undefined {
  const byId = EXERCISES.find((e) => e.id === name.trim());
  return byId?.id ?? matchExercise(name);
}
const epley = (kg: number, reps: number) => kg * (1 + reps / EPLEY_DIVISOR);

interface ExerciseRead {
  exercise: string;
  text: string;
  share: number;
  weeks: number;
  level: StrengthLevel;
  historyDays: number;
}

function readExercise(target: { exercise: string; kg: number; reps: number }, logs: SessionLog[], date: string, growth: GrowthChoice): ExerciseRead | undefined {
  const name = norm(target.exercise);
  const targetId = listId(target.exercise);
  const from = addDays(date, -STRENGTH_WINDOW_DAYS);
  let best: number | undefined;
  let first: string | undefined;
  for (const log of logs) {
    if (log.completedDate > date || !log.strengthData) continue;
    for (const ex of log.strengthData) {
      const same = norm(ex.exerciseName) === name || norm(ex.exerciseId) === name
        || (targetId !== undefined && (listId(ex.exerciseId) === targetId || listId(ex.exerciseName) === targetId));
      if (!same) continue;
      if (!first || log.completedDate < first) first = log.completedDate;
      if (log.completedDate < from) continue;
      for (const set of ex.sets) {
        if (set.rirAssumed) continue;
        const est = estimateSet(set, {});
        if (!est || est.weight < 1) continue;
        if (best === undefined || est.strengthKg > best) best = est.strengthKg;
      }
    }
  }
  if (best === undefined || !first) return undefined;
  const historyDays = Math.max(0, daysBetween(first, date));
  const level = strengthLevelFor(historyDays);
  const need = epley(target.kg, target.reps);
  const weeks = weeksOfWork({ now: best, need, lowerIsBetter: false, weeklyGain: growthPer(STRENGTH_GROWTH[level], growth) });
  const kgNow = best / (1 + target.reps / EPLEY_DIVISOR);
  const missingKg = Math.round((target.kg - kgNow) * 2) / 2;
  // "Gehaald" komt uit dezelfde bron als de meter: alleen als er geen weken werk meer zijn. Zit er nog werk in
  // maar rondt het gat af op nul, dan zeggen we dat eerlijk in plaats van "gehaald".
  const text = weeks === 0
    ? `${target.exercise}: gehaald`
    : missingKg <= 0
    ? `${target.exercise} nog minder dan een halve kilo voor ${target.reps} herhalingen`
    : `${target.exercise} nog ${formatNumberNL(missingKg, 1)} kg voor ${target.reps} herhalingen`;
  return { exercise: target.exercise, text, share: fillFromWeeks(weeks), weeks, level, historyDays };
}

function readAll(goal: TrainingGoal, logs: SessionLog[], date: string, growth: GrowthChoice): ExerciseRead[] {
  const targets = (goal.details?.strengthTargets ?? []).filter((t) => t.kg > 0 && t.reps > 0);
  return targets.flatMap((t) => readExercise(t, logs, date, growth) ?? []);
}

// Waar het tempo op rust, in gewone woorden: per niveau één zin, plus de weken per oefening.
// "ongeveer 1 week werk", "ongeveer 6 weken werk", "minder dan een week werk".
export function weeksWorkSaid(weeks: number): string {
  const n = Math.round(weeks);
  return n < 1 ? 'minder dan een week werk' : `ongeveer ${n} ${n === 1 ? 'week' : 'weken'} werk`;
}

function noteOf(reads: ExerciseRead[], growth: GrowthChoice): string | undefined {
  if (reads.length === 0) return undefined;
  const parts: string[] = [];
  for (const level of ['ervaren', 'gevorderd', 'beginner'] as const) {
    const list = reads.filter((r) => r.level === level);
    if (list.length === 0) continue;
    const pct = formatNumberNL(growthPer(STRENGTH_GROWTH[level], growth) * 100, 2);
    parts.push(level === 'ervaren'
      ? `Voor het tempo rekent ASCEND met ervaren (${pct}% per week) voor ${list.map((r) => r.exercise).join(' en ')}, omdat je die oefening al meer dan twee jaar logt.`
      : `Voor het tempo rekent ASCEND met gevorderd (${pct}% per week) voor ${list.map((r) => r.exercise).join(' en ')}: je geschiedenis daarop is korter dan twee jaar, en ASCEND gaat dan niet uit van beginnerswinst. Begin je net, dan gaat het sneller.`);
  }
  const weeks = reads.filter((r) => r.weeks > 0).map((r) => `${r.exercise} ${weeksWorkSaid(r.weeks)}`);
  if (weeks.length > 0) parts.push(`Bij ${growth === 'careful' ? 'voorzichtige' : 'gemiddelde'} groei: ${weeks.join(', ')}. Een schatting, geen voorspelling.`);
  return parts.join(' ');
}

export type StrengthReadiness = GoalReadiness;

export interface StrengthReadinessOptions {
  naming: { the: string; your: string };
  since?: string;
  // Zoals "Weging bij een doeltijd" (instelling): 'equal' laat de meters even zwaar wegen, anders 60% en 40%.
  weighting?: 'speed' | 'equal';
  // "Groei bij het rekenen": gemiddeld (advies) of voorzichtig.
  growth?: GrowthChoice;
}

// "Klaar voor je doel" voor Sterker worden. Zonder doelgewichten of zonder set in de laatste 4 weken is de
// meter Krachttrend ontbrekend, en dat wordt gezegd.
export function computeStrengthReadiness(goal: TrainingGoal, logs: SessionLog[], today: string, options: StrengthReadinessOptions): StrengthReadiness | undefined {
  const input = readinessInputOf(goal);
  if (!input) return undefined;
  const growth = options.growth ?? 'average';
  const external: ReadinessOptions['external'] = (id, date): ExternalValue | undefined => {
    if (id !== 'krachttrend') return undefined;
    const reads = readAll(goal, logs, date, growth);
    if (reads.length === 0) return undefined;
    return { share: reads.reduce((s, r) => s + r.share, 0) / reads.length, text: reads.map((r) => r.text).join(', ') };
  };
  const r = computeGoalReadiness(input, logs, today, {
    naming: options.naming, since: options.since ?? goal.createdAt.slice(0, 10), external, weights: options.weighting === 'equal' ? undefined : STRENGTH_WEIGHTS,
  });
  // Volhouden wordt op de Ascend-tab nooit gevuld, dus dat noemen we niet als ontbrekend (zoals bij een wedstrijd).
  const missing = r.missing.filter((m) => m.key !== 'volhouden');
  const missingSentence = missing.length > 0
    ? `Hier is nog niets van gemeten: ${missing.map((m) => `je ${m.label.toLowerCase()}`).join(', ').replace(/, ([^,]*)$/, ' en $1')}.`
    : undefined;
  const note = noteOf(readAll(goal, logs, today, growth), growth);
  return { ...r, missing, missingSentence: r.meters.length > 0 ? missingSentence : r.missingSentence, derivedNote: note ?? r.derivedNote };
}
