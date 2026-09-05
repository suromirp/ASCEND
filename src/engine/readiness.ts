import type { PlannedSession, SessionLog } from '../models/training';
import { addDays, formatDateNL, todayISO } from '../utils/dates';

export interface ReadinessBreakdown {
  strength: number;
  cardio: number;
  climbing: number;
  endurance: number;
  recovery: number;
  consistency: number;
  packCapability: number;
  overall: number;
}

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// V1 heuristics only. Every formula here is intentionally simple and
// isolated so it can be swapped for a real calculation (HRV-adjusted
// recovery, actual 1RM-based strength trend, etc.) once Garmin / Health
// Connect / MacroFactor data is available — nothing outside this file needs
// to change when that happens.
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

  // Strength: completed strength sessions vs. a 3x/week target for the window.
  const strengthTarget = Math.max(1, Math.round((windowDays / 7) * 3));
  const strengthDone = recentLogs.filter((l) => l.type === 'strength').length;
  const strength = clampPct((strengthDone / strengthTarget) * 100);

  // Cardio: completed cardio sessions vs. a 2x/week target for the window.
  const cardioTarget = Math.max(1, Math.round((windowDays / 7) * 2));
  const cardioDone = recentLogs.filter((l) => l.type === 'cardio').length;
  const cardio = clampPct((cardioDone / cardioTarget) * 100);

  // Climbing / D+: total elevation gained (outdoor + incline) vs. a
  // 1000 D+ per 4 weeks reference target, scaled to the window.
  const elevationTarget = (windowDays / 28) * 1000;
  const elevationDone = recentLogs.reduce(
    (sum, l) => sum + (l.outdoorData?.elevationGainM ?? l.cardioData?.elevationGainM ?? 0),
    0,
  );
  const climbing = clampPct((elevationDone / elevationTarget) * 100);

  // Endurance: total cardio + hiking distance vs. a 40 km per 4 weeks
  // reference target, scaled to the window.
  const distanceTarget = (windowDays / 28) * 40;
  const distanceDone = recentLogs.reduce(
    (sum, l) => sum + (l.outdoorData?.distanceKm ?? l.cardioData?.distanceKm ?? 0),
    0,
  );
  const endurance = clampPct((distanceDone / distanceTarget) * 100);

  // Recovery: completed recovery sessions vs. a 1x/week target. This is a
  // placeholder until HRV / sleep / Body Battery data arrives via Garmin.
  const recoveryTarget = Math.max(1, Math.round(windowDays / 7));
  const recoveryDone = recentLogs.filter((l) => l.type === 'recovery').length;
  const recovery = clampPct((recoveryDone / recoveryTarget) * 100);

  // Pack capability: heaviest backpack carried vs. a 15 kg reference target.
  const packTarget = 15;
  const maxPack = recentLogs.reduce((max, l) => Math.max(max, l.outdoorData?.backpackWeightKg ?? 0), 0);
  const packCapability = clampPct((maxPack / packTarget) * 100);

  const overall = clampPct(
    (strength + cardio + climbing + endurance + recovery + consistency + packCapability) / 7,
  );

  return { strength, cardio, climbing, endurance, recovery, consistency, packCapability, overall };
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
