// ASCEND: the best moment of the day for an outdoor training. Pure: the same
// forecast, logs and clock always give the same answer, and every number is on
// this page (BEST_MOMENT_RULES).
//
// The question: the weather at the hour you usually train is not good, but is
// there a block later or earlier on the same day, as long as the training,
// where it is clearly better? If so, one calm line: "Beste moment: 16 tot
// 17.30 uur, droog". If the usual hour is fine already, or no block is better,
// there is nothing at all (no noise).
//
// "Better" means exactly what weather.ts means: the same blocks are judged by
// the same function (sessionWeather), so Vandaag, Weer and the swap proposal
// never disagree about what a good hour is. A block is better when
//   1. its verdict is a class higher (slecht -> let op -> prima), or
//   2. the verdict is the same but a reason is gone and none is new: rain or
//      wind that is under the threshold of weather.ts now, or fog, heat, cold.
// So "better" is always a threshold of WEATHER_RULES that the usual hour
// crosses and the block does not. Less rain that still counts as rain (6 mm
// against 3 mm) is no reason to speak up: a window that slides one hour into
// the end of a shower would always halve it, and that is noise.
// A block that is itself "slecht" is never offered. Dark does not make the
// usual hour worse (an evening runner would get a noon suggestion all winter);
// it only limits where a block may be: whole in daylight, between sunrise and
// sunset, or without those times in the forecast 7.00 to 21.00.
//
// Not planning: nothing moves. It only tells you when the day is best; moving
// a training to another day is still the swap proposal (weatherSwap.ts).

import type { SessionLog, SessionTemplate } from '../models/training';
import type { WeatherForecast } from '../models/weather';
import { daysBetween, toISODate } from '../utils/dates';
import { VERDICT_RANK, sessionWeather, weatherForTraining, type SessionWeather, type WeatherVerdict } from './weather';

export const BEST_MOMENT_RULES = {
  // BEST-HORIZON: a forecast further ahead than this changes too often to
  // point at an hour (the same three days as the swap proposal).
  horizonDays: 3,
  // BEST-WINDOW: without sunrise and sunset in the forecast.
  fallbackFromHour: 7,
  fallbackToHour: 21,
  // The end of the block is shown rounded up to this many minutes.
  roundEndToMinutes: 5,
} as const;

export interface BestMoment {
  date: string;
  startHour: number; // a whole hour
  startMinutes: number; // since midnight
  endMinutes: number; // since midnight, rounded up to 5 minutes
  verdict: WeatherVerdict; // of the block: 'prima' or 'let_op'
  // What is better than at the usual hour, in two words at most: "droog", "droog en minder wind".
  reason: string;
  // The whole line: "Beste moment: 16 tot 17.30 uur, droog".
  text: string;
  weather: SessionWeather;
}

export interface BestMomentInput {
  forecast: WeatherForecast | undefined;
  template: SessionTemplate;
  logs: SessionLog[];
  date: string;
  durationMinutes: number;
  now: Date;
}

const pad = (n: number) => String(n).padStart(2, '0');

// 990 -> "16.30", 960 -> "16": a whole hour has no minutes, as people say it.
export function hourNL(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? String(h) : `${h}.${pad(m)}`;
}

const has = (w: SessionWeather, ...reasons: string[]) => reasons.some((r) => w.reasons.includes(r));

// Rule BEST-BETTER (see the top of this file).
function isClearlyBetter(usual: SessionWeather, cand: SessionWeather): boolean {
  const gap = VERDICT_RANK[usual.verdict] - VERDICT_RANK[cand.verdict];
  if (gap > 0) return true;
  if (gap < 0) return false;
  // The same class: nothing new may come in.
  if (cand.reasons.some((r) => !usual.reasons.includes(r))) return false;
  return cand.reasons.length < usual.reasons.length;
}

// What is better, in words: only what was wrong at the usual hour and is
// gone or a class lighter now. At most two, the weather first, then "licht".
function reasonWords(usual: SessionWeather, cand: SessionWeather): string {
  const words: string[] = [];
  const rain = has(usual, 'regen', 'zware regen');
  if (rain && (!has(cand, 'regen', 'zware regen') || usual.bad.includes('zware regen'))) {
    words.push(cand.precipMm < 0.1 ? 'droog' : 'minder regen');
  }
  const wind = has(usual, 'harde wind', 'storm');
  if (wind && (!has(cand, 'harde wind', 'storm') || usual.bad.includes('storm'))) words.push('minder wind');
  if (has(usual, 'onweer') && !has(cand, 'onweer')) words.push('geen onweer');
  if (has(usual, 'ijzel') && !has(cand, 'ijzel')) words.push('geen ijzel');
  if (has(usual, 'sneeuw', 'zware sneeuw') && !has(cand, 'sneeuw', 'zware sneeuw')) words.push('geen sneeuw');
  if (has(usual, 'mist') && !has(cand, 'mist')) words.push('geen mist');
  if (has(usual, 'warm', 'extreme hitte') && !has(cand, 'warm', 'extreme hitte')) words.push('koeler');
  if (has(usual, 'koud', 'strenge kou') && !has(cand, 'koud', 'strenge kou')) words.push('milder');
  if (usual.daylight?.lampNeeded) words.push('licht');
  return (words.length ? words.slice(0, 2) : ['beter weer']).join(' en ');
}

export function bestMomentForTraining({ forecast, template, logs, date, durationMinutes, now }: BestMomentInput): BestMoment | undefined {
  const R = BEST_MOMENT_RULES;
  if (!forecast || durationMinutes <= 0) return undefined;
  const ahead = daysBetween(toISODate(now), date);
  if (ahead < 0 || ahead > R.horizonDays) return undefined;
  // Already done: there is nothing left to choose a moment for.
  if (logs.some((l) => l.templateId === template.id && l.completedDate === date)) return undefined;

  // The weather as the weather line shows it: at the usual hour, from now on when that hour has passed today.
  const usual = weatherForTraining({ forecast, template, logs, date, durationMinutes, now });
  if (!usual) return undefined;
  if (usual.verdict === 'prima') return undefined;

  const length = Math.max(1, Math.ceil(durationMinutes / 60));
  const nowMinutes = ahead === 0 ? now.getHours() * 60 + now.getMinutes() : 0;
  const found: SessionWeather[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const startMinutes = hour * 60;
    if (startMinutes < nowMinutes || hour === usual.startHour) continue;
    const w = sessionWeather({ forecast, date, startHour: hour, durationMinutes });
    if (!w || w.hours !== length) continue;
    if (w.daylight) {
      if (w.daylight.lampNeeded) continue;
    } else if (hour < R.fallbackFromHour || startMinutes + durationMinutes > R.fallbackToHour * 60) continue;
    if (w.verdict === 'slecht' || !isClearlyBetter(usual, w)) continue;
    found.push(w);
  }
  if (found.length === 0) return undefined;

  // The best class and the fewest reasons first; among equals the block nearest to the usual hour.
  found.sort((a, b) =>
    VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict]
    || a.reasons.length - b.reasons.length
    || Math.abs(a.startHour - usual.startHour) - Math.abs(b.startHour - usual.startHour)
    || a.startHour - b.startHour);
  const best = found[0];
  const startMinutes = best.startHour * 60;
  const endMinutes = Math.ceil((startMinutes + durationMinutes) / R.roundEndToMinutes) * R.roundEndToMinutes;
  const reason = reasonWords(usual, best);
  return {
    date,
    startHour: best.startHour,
    startMinutes,
    endMinutes,
    verdict: best.verdict,
    reason,
    text: `Beste moment: ${hourNL(startMinutes)} tot ${hourNL(endMinutes)} uur, ${reason}`,
    weather: best,
  };
}
