// ASCEND: which heart rate numbers the watch gets, ASCEND's or intervals.icu's.
//
// Until now a heart rate target went to intervals.icu as a zone name ("Z2 HR").
// intervals.icu turns that into beats per minute with its own threshold and
// its own zone split, so "zone 2" on the watch could differ from zone 2 in
// ASCEND (seen: 158 to 167 on the watch against 143 to 159 in ASCEND), while
// ASCEND judges the run afterwards with its own zones. Decision:
// docs/beslissingen/2026-10-25-hartslag-op-het-horloge.md.
//
// With the choice "Zones van ASCEND" the step is written as a percentage that
// intervals.icu turns into exactly ASCEND's beats: "75-85% LTHR" (percent of
// the threshold heart rate) or "70-80% HR" (percent of the maximum), both in
// the workout builder syntax (forum: Workout Builder Syntax Quick Guide). The
// percentage is the beats of ASCEND divided by the threshold (or maximum) that
// intervals.icu itself holds for running (its sport settings). Whole percents
// only, because nothing says decimals are accepted; a result that would be more
// than 1 bpm off falls back to the zone name.
//
// Pure: no React, no IndexedDB, no network.

import type { Intensity } from '../data/workoutStructure';
import { zoneBpm, type HeartRateSettings } from './heartRateZones';

export type WatchHrMode = 'ascend' | 'intervals';
export const DEFAULT_WATCH_HR_MODE: WatchHrMode = 'ascend';
export const DEFAULT_WATCH_CALM_RUN = true;

// The most the written percentage may be off from the beats of ASCEND.
export const MAX_BPM_ERROR = 1;

// What intervals.icu holds for running, as last read (storage/watchWorkouts.ts).
export interface IntervalsHrBasis {
  lthr?: number;
  maxHr?: number;
  // ISO timestamp of the last successful read.
  readAt?: string;
  // The last attempt failed (what is here may be older).
  failed?: boolean;
}

export interface WatchHrSettings {
  mode?: WatchHrMode;
  calmRun?: boolean;
}

export type WatchHrFallback = 'no-ascend' | 'no-intervals';

export type WatchHrPlan =
  | { kind: 'zones'; reason?: WatchHrFallback }
  | { kind: 'bpm'; base: 'LTHR' | 'HR'; baseBpm: number; heartRate: HeartRateSettings; calm: boolean };

const ok = (n: number | undefined, min: number, max: number): n is number => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;

export function resolveWatchHrMode(s: WatchHrSettings | undefined): WatchHrMode {
  return s?.mode === 'intervals' ? 'intervals' : 'ascend';
}

export function resolveCalmRun(s: WatchHrSettings | undefined): boolean {
  return s?.calmRun !== false;
}

export function hasAscendHeartRate(hr: HeartRateSettings | undefined): boolean {
  return !!hr && (ok(hr.lthr, 100, 220) || ok(hr.maxHr, 120, 230));
}

// What the build uses: the zone names as before, or percentages of the
// threshold of intervals.icu. `reason` says why it is not ASCEND's beats.
export function resolveWatchHr(settings: WatchHrSettings | undefined, heartRate: HeartRateSettings | undefined, basis: IntervalsHrBasis | undefined): WatchHrPlan {
  if (resolveWatchHrMode(settings) === 'intervals') return { kind: 'zones' };
  if (!heartRate || !hasAscendHeartRate(heartRate)) return { kind: 'zones', reason: 'no-ascend' };
  const calm = resolveCalmRun(settings);
  if (ok(basis?.lthr, 100, 220)) return { kind: 'bpm', base: 'LTHR', baseBpm: basis.lthr, heartRate, calm };
  if (ok(basis?.maxHr, 120, 230)) return { kind: 'bpm', base: 'HR', baseBpm: basis.maxHr, heartRate, calm };
  return { kind: 'zones', reason: 'no-intervals' };
}

// The plan from the stored settings (AppSettings.watchHeartRate, watchCalmRun,
// heartRate) and what was last read at intervals.icu. The one place the send
// and the status line both go through, so their fingerprints agree.
export function watchHrPlanFromSettings(
  s: { watchHeartRate?: WatchHrMode; watchCalmRun?: boolean; heartRate?: HeartRateSettings },
  basis: IntervalsHrBasis | undefined,
): WatchHrPlan {
  return resolveWatchHr({ mode: s.watchHeartRate, calmRun: s.watchCalmRun }, s.heartRate, basis);
}

// The beats ASCEND wants for a step of this intensity.
// - A calm step (intensity 1 or 2, with "Rustige loop: ruime grens") runs from the
//   start of zone 1 to the end of its own zone: zone 1 for 1, zones 1 to 2 for 2.
//   Running you hardly ever drop below zone 1, so the watch only beeps when you
//   go too high.
// - Intensity 4 runs from the start of zone 4 to the maximum heart rate of ASCEND
//   when known, else to 110 percent of the threshold.
export function stepBpm(intensity: Intensity, heartRate: HeartRateSettings, calm: boolean): [number, number] | undefined {
  if (calm && intensity <= 2) {
    const low = zoneBpm(1, heartRate);
    const high = zoneBpm(intensity, heartRate);
    return low && high ? [low[0], high[1]] : undefined;
  }
  const zone = zoneBpm(intensity, heartRate);
  if (!zone || intensity !== 4) return zone;
  const top = ok(heartRate.maxHr, 120, 230) ? heartRate.maxHr : ok(heartRate.lthr, 100, 220) ? Math.round(heartRate.lthr * 1.1) : zone[1];
  return top > zone[0] ? [zone[0], top] : zone;
}

// A whole percent of `base` that lands within MAX_BPM_ERROR of `bpm`.
export function percentFor(bpm: number, base: number): number | undefined {
  const p = Math.round((bpm / base) * 100);
  return p > 0 && Math.abs(bpmOfPercent(p, base) - bpm) <= MAX_BPM_ERROR ? p : undefined;
}

// What intervals.icu makes of "70-80% HR" or "75-85% LTHR": the beats.
export function bpmOfPercent(p: number, base: number): number {
  return Math.round((p * base) / 100);
}

// "75-85% LTHR", or undefined when the step has no usable beats or the
// percentage cannot be written within the tolerance (the caller then writes
// the zone name).
export function hrPercentTarget(plan: Extract<WatchHrPlan, { kind: 'bpm' }>, intensity: Intensity): string | undefined {
  const bpm = stepBpm(intensity, plan.heartRate, plan.calm);
  if (!bpm) return undefined;
  const lo = percentFor(bpm[0], plan.baseBpm);
  const hi = percentFor(bpm[1], plan.baseBpm);
  if (lo === undefined || hi === undefined || lo > hi) return undefined;
  return `${lo === hi ? lo : `${lo}-${hi}`}% ${plan.base}`;
}

// One short line (at most 40 characters) for the settings row when the watch
// does not get ASCEND's beats although that was chosen.
export const HR_FALLBACK_TEXT: Record<WatchHrFallback, string> = {
  'no-ascend': 'Zonder drempel: de zonenaam',
  'no-intervals': 'Drempel intervals.icu onbekend',
};
