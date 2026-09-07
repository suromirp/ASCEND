import type { PlannedSession, SessionLog } from '../models/training';
import { addDays, formatDateNL, todayISO } from '../utils/dates';

// ASCEND — Readiness (sports-science review, September 2026, item B1).
//
// Narrowed from the original 7-sub-score ReadinessBreakdown: the 5
// fitness/exposure scores (strength, cardio, climbing, endurance,
// packCapability) moved to engine/capacity.ts, which answers a genuinely
// different question ("what have you demonstrably been building lately").
// This file keeps only the acute "are you ready for more training right
// now" signals: recovery, consistency, and a new subjectiveSignal reading
// (recent subjective session response) — see engine/capacity.ts's header
// for the full rationale.
export interface ReadinessBreakdown {
  recovery: number;
  consistency: number;
  subjectiveSignal: number;
  overall: number;
}

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// V1 heuristics only. Every formula here is intentionally simple and
// isolated so it can be swapped for a real calculation (HRV-adjusted
// recovery, etc.) once Garmin / Health Connect data is available — nothing
// outside this file needs to change when that happens.
export function computeReadiness(
  logs: SessionLog[],
  plannedSessions: PlannedSession[],
  windowDays = 28,
  asOf: string = todayISO(),
): ReadinessBreakdown {
  const since = addDays(asOf, -windowDays);
  const recentLogs = logs.filter((l) => l.completedDate >= since && l.completedDate <= asOf);
  const recentPlanned = plannedSessions.filter((p) => p.scheduledDate >= since && p.scheduledDate <= asOf);

  // Consistency: share of planned sessions in the window that have a log.
  const loggedPlannedIds = new Set(recentLogs.map((l) => l.plannedSessionId).filter(Boolean));
  const consistency = recentPlanned.length === 0
    ? 0
    : clampPct((loggedPlannedIds.size / recentPlanned.length) * 100);

  // Recovery: completed recovery sessions vs. a 1x/week target. This is a
  // placeholder until HRV / sleep / Body Battery data arrives via Garmin.
  const recoveryTarget = Math.max(1, Math.round(windowDays / 7));
  const recoveryDone = recentLogs.filter((l) => l.type === 'recovery').length;
  const recovery = clampPct((recoveryDone / recoveryTarget) * 100);

  // Subjective signal (new, B1): share of recent logged sessions that did
  // NOT come back "worse than normal" — the review's recommendation to read
  // acute readiness from recent subjective response (SessionLog.subjectiveFeel)
  // rather than treat capacity/consistency as if they measured the same
  // thing. No subjective data yet is never read as a bad signal (matches
  // this codebase's "missing data is never interpreted as bad" convention
  // — see engine/capability.ts) — it simply doesn't move the number down.
  const subjectiveLogs = recentLogs.filter((l) => l.subjectiveFeel !== undefined);
  const subjectiveSignal = subjectiveLogs.length === 0
    ? 100
    : clampPct((subjectiveLogs.filter((l) => l.subjectiveFeel !== 'worse').length / subjectiveLogs.length) * 100);

  const overall = clampPct((recovery + consistency + subjectiveSignal) / 3);

  return { recovery, consistency, subjectiveSignal, overall };
}

export interface TrendPoint {
  label: string;
  value: number;
}

// A weekly snapshot of the same 28-day overall figure computeReadiness
// already shows, just re-run with `asOf` walked back a week at a time —
// this is the one thing that needed that param, everything else about the
// formulas is untouched.
export function computeReadinessTrend(logs: SessionLog[], plannedSessions: PlannedSession[], weeks = 8): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const asOf = addDays(todayISO(), -7 * i);
    points.push({ label: formatDateNL(asOf), value: computeReadiness(logs, plannedSessions, 28, asOf).overall });
  }
  return points;
}
