// ASCEND — your own heart rate zones in beats per minute.
//
// With a lactate threshold heart rate (LTHR) the zones follow Joe Friel's
// running zones as a percentage of LTHR, the same basis Garmin offers as
// "Based on %LTHR". Without LTHR but with a maximum, Garmin's default
// %Max HR zones. Without either, the training screens keep showing the
// zone number only. Heart rate stays a guide next to effort (RPE) and the
// talk test, never the only truth.
//
// Pure: no React, no IndexedDB.

import type { Intensity } from '../data/workoutStructure';

export interface HeartRateSettings {
  maxHr?: number;
  lthr?: number;
  restingHr?: number;
}

type Band = [number, number]; // fractions

// Friel, running, % of LTHR.
const LTHR_ZONES: Record<Intensity, Band> = {
  1: [0.65, 0.84],
  2: [0.85, 0.89],
  3: [0.9, 0.94],
  4: [0.95, 1.02],
};

// Garmin default, % of max HR.
const MAX_ZONES: Record<Intensity, Band> = {
  1: [0.5, 0.6],
  2: [0.6, 0.7],
  3: [0.7, 0.8],
  4: [0.8, 0.95],
};

const valid = (n: number | undefined, min: number, max: number): n is number => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;

export function zoneBpm(intensity: Intensity, hr: HeartRateSettings | undefined): [number, number] | undefined {
  if (!hr) return undefined;
  const [base, bands] = valid(hr.lthr, 100, 220) ? [hr.lthr, LTHR_ZONES] : valid(hr.maxHr, 120, 230) ? [hr.maxHr, MAX_ZONES] : [undefined, undefined];
  if (!base || !bands) return undefined;
  const [lo, hi] = bands[intensity];
  return [Math.round(base * lo), Math.round(base * hi)];
}

// "zone 2, 151 tot 158 bpm", or just "zone 2".
export function zoneText(intensity: Intensity, zone: string, hr: HeartRateSettings | undefined): string {
  const bpm = zoneBpm(intensity, hr);
  return bpm ? `${zone}, ${bpm[0]} tot ${bpm[1]} bpm` : zone;
}
