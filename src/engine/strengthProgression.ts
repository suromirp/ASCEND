import type { SessionLog } from '../models/training';
import { formatDateNL } from '../utils/dates';
import type { TrendPoint } from './readiness';

export interface LoggedExercise {
  id: string;
  name: string;
}

// Every distinct exercise that has ever been logged, in first-seen order —
// feeds the exercise picker next to the progression chart.
export function listLoggedExercises(logs: SessionLog[]): LoggedExercise[] {
  const seen = new Map<string, string>();
  for (const log of logs) {
    for (const entry of log.strengthData ?? []) {
      if (!seen.has(entry.exerciseId)) seen.set(entry.exerciseId, entry.exerciseName);
    }
  }
  return Array.from(seen, ([id, name]) => ({ id, name }));
}

// Top set (heaviest logged weight) for one exercise, per session it
// appeared in, oldest first — the "did the weight actually go up" figure,
// not average or volume.
export function computeExerciseProgression(logs: SessionLog[], exerciseId: string): TrendPoint[] {
  return logs
    .map((log) => {
      const entry = log.strengthData?.find((e) => e.exerciseId === exerciseId);
      if (!entry) return null;
      const topWeight = entry.sets.reduce((max, s) => Math.max(max, s.weightKg ?? 0), 0);
      return topWeight > 0 ? { date: log.completedDate, value: topWeight } : null;
    })
    .filter((p): p is { date: string; value: number } => p !== null)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((p) => ({ label: formatDateNL(p.date), value: p.value }));
}
