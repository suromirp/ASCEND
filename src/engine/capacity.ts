// ASCEND — Capacity (sports-science review, September 2026, item B1).
//
// Split out of what was previously engine/readiness.ts's ReadinessBreakdown
// (v1: one flat, unweighted average of 7 sub-scores). The review's core
// critique: strength/cardio/climbing/endurance/packCapability all answer
// "how much have you demonstrably been doing/building lately" — that's
// CAPACITY (slow-changing, exposure-based fitness), a genuinely different
// question from "are you acutely ready to take on more right now"
// (recovery/consistency/subjective response — what stays in
// engine/readiness.ts). Averaging both kinds of signal into one number let
// a low pack-carrying exposure and a bad night's sleep read identically,
// which the review specifically flagged as the wrong model.
//
// Every formula below is UNCHANGED from readiness.ts's original v1
// heuristics — this file only relocates them, it doesn't recalibrate them.
// Still V1/ASCEND_HEURISTIC: simple, isolated, meant to be swapped for a
// real calculation (actual 1RM trend, GPS-verified distance, etc.) once
// Garmin/Health Connect/MacroFactor data is available.

import type { SessionLog } from '../models/training';
import { addDays, todayISO } from '../utils/dates';

export interface CapacityBreakdown {
  strength: number;
  cardio: number;
  climbing: number;
  endurance: number;
  packCapability: number;
  overall: number;
}

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function computeCapacity(logs: SessionLog[], windowDays = 28, asOf: string = todayISO()): CapacityBreakdown {
  const since = addDays(asOf, -windowDays);
  const recentLogs = logs.filter((l) => l.completedDate >= since && l.completedDate <= asOf);

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

  // Pack capability: heaviest backpack carried vs. a 15 kg reference target.
  const packTarget = 15;
  const maxPack = recentLogs.reduce((max, l) => Math.max(max, l.outdoorData?.backpackWeightKg ?? 0), 0);
  const packCapability = clampPct((maxPack / packTarget) * 100);

  const overall = clampPct((strength + cardio + climbing + endurance + packCapability) / 5);

  return { strength, cardio, climbing, endurance, packCapability, overall };
}
