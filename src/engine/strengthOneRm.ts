// ASCEND: the estimated 1RM per training, for the chart on Forge.
//
// No new formula: this is the same smoothed estimate the model already
// calculates after every training (SessionPoint.smoothed, rules KR-2 and KR-3 in
// engine/strengthModel.ts), the number that is called "geschatte kracht" and that
// the proposals count with. It only picks it out per training, so the numbers
// on Forge agree everywhere. Warm-up sets never count: the points are made from
// work sets (engine/workSets.ts#isWorkSet) by the model.

import { addDays } from '../utils/dates';
import type { SessionPoint } from './strengthModel';

export interface OneRmPoint {
  date: string;
  kg: number;
}

export const ONE_RM_WINDOW_DAYS = 28;

// One point per training that has an estimate, oldest first.
export function oneRmSeries(points: SessionPoint[]): OneRmPoint[] {
  const out: OneRmPoint[] = [];
  for (const p of points) if (p.smoothed !== undefined) out.push({ date: p.date, kg: p.smoothed });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// The change over the last four weeks: the last point against the last point that
// is at least four weeks older. Without such a point there is nothing to compare.
export function oneRmChange(series: OneRmPoint[]): { deltaKg: number; fromDate: string } | undefined {
  if (series.length < 3) return undefined;
  const last = series[series.length - 1];
  const limit = addDays(last.date, -ONE_RM_WINDOW_DAYS);
  let base: OneRmPoint | undefined;
  for (const p of series) if (p.date <= limit) base = p;
  if (!base) return undefined;
  return { deltaKg: Math.round((last.kg - base.kg) * 10) / 10, fromDate: base.date };
}
