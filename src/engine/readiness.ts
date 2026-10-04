import type { PlannedSession, SessionLog } from '../models/training';
import type { PlanChangeProposal } from '../models/planChange';
import { addDays, daysBetween, formatDateNL, todayISO } from '../utils/dates';

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
  // How many sessions consistency is based on: 0 means nothing was due
  // yet (a fresh start), which the UI shows as "—" rather than a score.
  consistencyBasis: number;
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
  // Week 1 of the program. Nothing before it counts (production feedback:
  // "30% consistentie terwijl ik letterlijk in mijn eerste week zit" —
  // sessions from the schedule before a restart were read as missed).
  programStart?: string,
  // Days that never count as missed, e.g. while ill (engine/illness.ts).
  excludeDate?: (date: string) => boolean,
  extra: ReadinessExtras = {},
): ReadinessBreakdown {
  const windowStart = addDays(asOf, -windowDays);
  const since = programStart && programStart > windowStart ? programStart : windowStart;
  const recentLogs = logs.filter((l) => l.completedDate >= since && l.completedDate <= asOf);

  // Consistency: share of sessions that were due that have a log. Due =
  // on the plan (skipped ones were taken off it) and on a day that has
  // passed; today's session only counts once it's done, never as a miss
  // while the day is still running.
  const loggedPlannedIds = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  // A rest day is never "due" (production feedback: an unlogged rest day
  // read as a miss). A session dropped after it was already missed still
  // counts as missed: accepting "laten vallen" tidies the plan, it doesn't
  // rewrite what happened.
  const droppedAfterMiss = extra.droppedAfterMissIds ?? new Set<string>();
  const due = plannedSessions.filter(
    (p) => (p.status !== 'skipped' || droppedAfterMiss.has(p.id)) && !extra.isRest?.(p)
      && p.scheduledDate >= since && (p.scheduledDate < asOf || (p.scheduledDate === asOf && loggedPlannedIds.has(p.id)))
      && (loggedPlannedIds.has(p.id) || !excludeDate?.(p.scheduledDate)),
  );
  const consistency = due.length === 0
    ? 0
    : clampPct((due.filter((p) => loggedPlannedIds.has(p.id)).length / due.length) * 100);

  // Recovery: rest days actually taken vs. at least one per week. A rest
  // day is a day without training, logged or not. A placeholder until HRV
  // / sleep / Body Battery data arrives via Garmin.
  const effectiveDays = Math.max(1, daysBetween(since, asOf));
  const recoveryTarget = Math.max(1, Math.round(effectiveDays / 7));
  const trainingDays = new Set(recentLogs.filter((l) => l.type !== 'recovery' && l.completedDate < asOf).map((l) => l.completedDate));
  const restDays = Math.max(0, effectiveDays - trainingDays.size);
  const recovery = clampPct((restDays / recoveryTarget) * 100);

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

  // Nothing due yet (a fresh start) is no score, not 0%.
  const overall = due.length === 0
    ? clampPct((recovery + subjectiveSignal) / 2)
    : clampPct((recovery + consistency + subjectiveSignal) / 3);

  return { recovery, consistency, subjectiveSignal, overall, consistencyBasis: due.length };
}

export interface ReadinessExtras {
  isRest?: (p: PlannedSession) => boolean;
  droppedAfterMissIds?: Set<string>;
}

// Sessions taken off the plan by accepting the coach's "missed, let it go"
// advice: missed before they were dropped.
export function droppedAfterMissIds(planChangeLog: PlanChangeProposal[]): Set<string> {
  return new Set(
    planChangeLog
      .filter((p) => p.resolution === 'accepted')
      .flatMap((p) => p.changes.filter((c) => c.action === 'remove' && c.plannedSessionId && c.generatedBy?.includes('MISSED-CATCH-UP')).map((c) => c.plannedSessionId!)),
  );
}

export interface TrendPoint {
  label: string;
  value: number;
}

// A weekly snapshot of the same 28-day overall figure computeReadiness
// already shows, just re-run with `asOf` walked back a week at a time —
// this is the one thing that needed that param, everything else about the
// formulas is untouched.
export function computeReadinessTrend(logs: SessionLog[], plannedSessions: PlannedSession[], weeks = 8, programStart?: string, extra: ReadinessExtras = {}): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const asOf = addDays(todayISO(), -7 * i);
    // Weeks before the program existed have no score at all.
    if (programStart && asOf < programStart) continue;
    points.push({ label: formatDateNL(asOf), value: computeReadiness(logs, plannedSessions, 28, asOf, programStart, undefined, extra).overall });
  }
  return points;
}
