// ASCEND — how long a strength training really takes.
//
// A strength session has no week-by-week minutes of its own (the content
// lives in MacroFactor), so its planned duration is an estimate. The user
// sets a starting estimate per training (Settings → Training), and ASCEND
// learns from how long the full training actually took: once there are
// enough logs, the prediction follows the recent typical duration instead.
// The predicted minutes are what Today, Week and the daily time budget use.
//
// Pure: no React, no IndexedDB.

import type { SessionLog, SessionTemplate } from '../models/training';

// Logs needed before the learned value replaces the estimate, and how many
// of the most recent ones count. The median, so one session where you
// forgot to stop the timer does not pull the prediction away.
export const MIN_LOGS_TO_LEARN = 3;
const RECENT_LOGS = 6;

export interface DurationPrediction {
  minutes: number;
  source: 'learned' | 'estimate' | 'default';
  basedOn: number; // logs used, 0 when not learned
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function predictDuration(template: SessionTemplate, logs: SessionLog[], estimate: number | undefined): DurationPrediction {
  const recent = logs
    .filter((l) => l.templateId === template.id && l.variant === 'full' && l.durationMinutes >= 10 && l.durationMinutes <= 240)
    .sort((a, b) => (a.completedDate < b.completedDate ? 1 : -1))
    .slice(0, RECENT_LOGS)
    .map((l) => l.durationMinutes);
  if (recent.length >= MIN_LOGS_TO_LEARN) {
    return { minutes: Math.max(10, Math.round(median(recent) / 5) * 5), source: 'learned', basedOn: recent.length };
  }
  if (estimate && estimate > 0) return { minutes: estimate, source: 'estimate', basedOn: 0 };
  return { minutes: template.durationVariants.full, source: 'default', basedOn: 0 };
}

// The predicted minutes for every strength training, for
// engine/substitutions.ts#setLearnedDurations.
export function learnedStrengthDurations(templates: SessionTemplate[], logs: SessionLog[], estimates: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of templates) {
    if (t.type !== 'strength' || t.weeklyProgression) continue;
    out[t.id] = predictDuration(t, logs, estimates?.[t.id]).minutes;
  }
  return out;
}
