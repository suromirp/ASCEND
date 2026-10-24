// ASCEND: the 1RM that another source reports, next to ASCEND's own estimate.
//
// Stored per exercise and source in `AppSettings.externalOneRm`
// (models/metrics.ts#ExternalOneRm), read from the MacroFactor export by
// engine/macrofactorOneRm.ts. Nothing here calculates a 1RM: ASCEND's own number
// is engine/strengthOneRm.ts, from the logs. The two are shown side by side on
// Forge and never mixed or averaged
// (docs/beslissingen/2026-10-24-1rm-uit-macrofactor.md).
//
// Pure.

import type { ExternalOneRm, OneRmReading } from '../models/metrics';
import type { MetricSource } from '../models/training';
import { exerciseKey } from './strengthHistory';

// The key Forge uses for an exercise (strengthHistory.ts#exerciseKey): the
// exercise id when the name is one of ours, else the tidied name. Worked out on
// every read, so a stored series follows the exercise list as it changes.
export const externalKey = (exerciseName: string): string => exerciseKey('', exerciseName).key;

const byDate = (a: OneRmReading, b: OneRmReading) => a.date.localeCompare(b.date);

function mergePoints(base: OneRmReading[], over: OneRmReading[]): OneRmReading[] {
  const days = new Map<string, number>(base.map((p) => [p.date, p.kg]));
  for (const p of over) days.set(p.date, p.kg);
  return [...days].map(([date, kg]) => ({ date, kg })).sort(byDate);
}

// The stored series with the incoming ones put in, per exercise and source. On a
// day both have, `incoming` wins; a day only the stored series has is kept, so an
// export that covers a shorter period never takes history away.
export function mergeExternalOneRm(stored: ExternalOneRm[] | undefined, incoming: ExternalOneRm[]): ExternalOneRm[] {
  const out = new Map<string, ExternalOneRm>();
  const slot = (s: ExternalOneRm) => `${s.source}|${externalKey(s.exerciseName)}`;
  for (const s of stored ?? []) {
    const id = slot(s);
    const known = out.get(id);
    out.set(id, known ? { ...known, points: mergePoints(known.points, s.points) } : { ...s, points: [...s.points].sort(byDate) });
  }
  for (const s of incoming) {
    const id = slot(s);
    const known = out.get(id);
    // The name of the newest file is the one kept.
    out.set(id, known ? { ...s, points: mergePoints(known.points, s.points) } : { ...s, points: [...s.points].sort(byDate) });
  }
  return [...out.values()];
}

// How many readings in `incoming` are new for the stored ones (a day that was
// not there yet), and for how many exercises.
export function countNewReadings(stored: ExternalOneRm[] | undefined, incoming: ExternalOneRm[]): { exercises: number; added: number } {
  const known = new Map<string, Set<string>>();
  for (const s of stored ?? []) {
    const id = `${s.source}|${externalKey(s.exerciseName)}`;
    known.set(id, new Set([...(known.get(id) ?? []), ...s.points.map((p) => p.date)]));
  }
  let added = 0;
  const exercises = new Set<string>();
  for (const s of incoming) {
    const id = `${s.source}|${externalKey(s.exerciseName)}`;
    const have = known.get(id);
    const fresh = s.points.filter((p) => !have?.has(p.date)).length;
    if (fresh > 0) {
      added += fresh;
      exercises.add(id);
    }
  }
  return { exercises: exercises.size, added };
}

// The readings of one source per Forge exercise key, oldest first: worked out
// once for the whole page.
export function externalOneRmByKey(stored: ExternalOneRm[] | undefined, source: MetricSource = 'macrofactor'): Map<string, OneRmReading[]> {
  const out = new Map<string, OneRmReading[]>();
  for (const s of stored ?? []) {
    if (s.source !== source) continue;
    const key = externalKey(s.exerciseName);
    out.set(key, mergePoints(out.get(key) ?? [], s.points));
  }
  return out;
}

export const latestReading = (points: OneRmReading[] | undefined): OneRmReading | undefined => points?.[points.length - 1];
