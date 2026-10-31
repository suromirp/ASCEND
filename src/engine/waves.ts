// ASCEND: golven van weken zonder doel (docs/visie/Zonder doel.md, 3.2). Drie weken
// opbouwen en een lichte week. Een golf is afgeleid uit de startdatum van je richting en
// nooit per week opgeslagen. Puur: geen React, geen IndexedDB.

import { DIRECTIONS, type DirectionId, type WaveShape } from '../data/directions';
import { addDays, daysBetween, mondayOfWeek } from '../utils/dates';

export interface WaveWeek {
  // 1 tot en met het aantal weken van de golf.
  week: number;
  length: number;
  // Het nummer van de golf, vanaf 1.
  wave: number;
  // De maandag waarop deze golf begon.
  startsOn: string;
  // De laatste week van de golf is de lichte.
  light: boolean;
}

// Waar je bent in de golf op `date`. Zonder startdatum, voor de start of zonder golf: niets.
export function waveWeek(start: string | undefined, date: string, length: number): WaveWeek | undefined {
  if (!start || length < 2) return undefined;
  const first = mondayOfWeek(start);
  const since = Math.floor(daysBetween(first, mondayOfWeek(date)) / 7);
  if (since < 0) return undefined;
  const week = (since % length) + 1;
  const wave = Math.floor(since / length) + 1;
  return { week, length, wave, startsOn: addDays(first, (wave - 1) * length * 7), light: week === length };
}

// De instelling Golven (AppSettings.waves): de lengte van een golf en of de laatste week lichter is.
// Defensief gelezen; wat ontbreekt is het advies (4 weken, met een lichte week).
export const WAVE_LENGTHS = [3, 4, 6] as const;
export const ADVICE_WAVE_LENGTH = 4;
export interface WaveSettings {
  length: number;
  lightWeek: boolean;
}
export function resolveWaveSettings(raw: unknown): WaveSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const length = WAVE_LENGTHS.find((n) => n === r.length) ?? ADVICE_WAVE_LENGTH;
  return { length, lightWeek: r.lightWeek !== false };
}

// De golf van een richting met jouw instelling erover: Rustig aan heeft geen golf.
export function waveShapeFor(id: DirectionId, raw: unknown): WaveShape | null {
  const shape = DIRECTIONS[id].wave.value;
  if (!shape) return null;
  const w = resolveWaveSettings(raw);
  return { ...shape, weeks: w.length, lightCut: w.lightWeek ? shape.lightCut : 0 };
}

const ceil5 = (n: number) => Math.ceil(n / 5) * 5;
const round5 = (n: number) => Math.round(n / 5) * 5;

// De tel-minuten van een week in de golf, bij een basis van `base` minuten voor week 1.
// De opbouwweken groeien met `step` per week; de lichte week is de laatste opbouwweek min
// `lightCut`, afgerond op 5. Bij een vlakke golf (step 0) is dat de basis min de snede.
export function waveMinutes(base: number, shape: WaveShape, week: number): number {
  const build = shape.weeks - 1;
  if (week >= shape.weeks) return round5(base * (1 + shape.step) ** (build - 1) * (1 - shape.lightCut));
  return round5(base * (1 + shape.step) ** (Math.max(1, week) - 1));
}

export type WaveVerdict = 'goed' | 'rustig' | 'zwaar';

export interface WaveReview {
  verdict: WaveVerdict;
  weeks: number;
  weeksHit: number;
  averageMinutes: number;
  // Genoeg weken gehaald voor een stap omhoog.
  stepUp: boolean;
}

// Een week "gehaald" is minstens dit deel van het budget.
export const HIT_RATIO = 0.9;
// Gemiddeld meer dan dit deel van het budget heet zwaar: je deed meer dan voorgesteld.
export const HEAVY_RATIO = 1.15;
export const DEFAULT_WEEKS_FOR_STEP = 3;

// De terugblik op een golf. `weekMinutes` en `budgets` zijn per week van de golf, in volgorde.
export function waveReview(weekMinutes: readonly number[], budgets: readonly number[], weeksForStep = DEFAULT_WEEKS_FOR_STEP): WaveReview {
  const weeks = Math.min(weekMinutes.length, budgets.length);
  let hit = 0;
  let done = 0;
  let planned = 0;
  for (let i = 0; i < weeks; i++) {
    if (budgets[i] > 0 && weekMinutes[i] >= budgets[i] * HIT_RATIO) hit++;
    done += weekMinutes[i];
    planned += budgets[i];
  }
  const stepUp = hit >= weeksForStep;
  const verdict: WaveVerdict = planned > 0 && done > planned * HEAVY_RATIO ? 'zwaar' : stepUp ? 'goed' : 'rustig';
  return { verdict, weeks, weeksHit: hit, averageMinutes: weeks > 0 ? Math.round(done / weeks) : 0, stepUp };
}

// Het basisbudget van de volgende golf: een stap omhoog na een goede golf, anders gelijk.
export function nextWaveLevel(base: number, review: WaveReview, shape: WaveShape, ceiling: number): number {
  if (!review.stepUp) return Math.min(base, ceiling);
  return Math.min(ceil5(base * (1 + Math.max(shape.step, 0.05))), ceiling);
}
