// ASCEND — Objective & Ascent Ladder domain models
//
// Mirrors the SessionTemplate / PlannedSession / SessionLog split: an
// Objective + its MilestoneDefinitions are the static template ("what would
// it take"), while MilestoneProgress rows are the append-only historical
// record of when a milestone was actually cleared. This means editing the
// objective (e.g. changing a target) never rewrites what was already earned.

// Sports-science review (Fase 5, item G1): a single milestone can now
// accept more than one activity type as valid evidence — e.g. the aerobic-
// base milestone no longer requires running specifically, since a
// comparable cardio or hiking session builds the same base fitness.
// Running/hiking-only milestones still just supply a single value.
export type MilestoneActivityType = 'cardio' | 'hiking' | 'strength';

export type MilestoneRequirement =
  | { kind: 'duration'; activityType: MilestoneActivityType | MilestoneActivityType[]; minMinutes: number }
  // minMeters (D+) and minLossMeters (D-) are independently optional (Fase
  // 5, item G1) — descent is its own axis with its own pace of progression
  // now, not a value silently mirrored from ascent. At least one of the two
  // is expected to be set; a definition with neither is meaningless but not
  // type-prevented, same as the rest of this union.
  | { kind: 'elevation'; minMeters?: number; minLossMeters?: number }
  | { kind: 'distance'; minKm: number }
  | { kind: 'distanceAndElevation'; minKm: number; minMeters: number; minLossMeters?: number }
  | { kind: 'backpack'; minWeightKg: number; minKm?: number }
  | { kind: 'consecutiveDays'; days: number }
  | { kind: 'manual' };

export interface MilestoneDefinition {
  id: string;
  objectiveId: string;
  order: number;
  title: string; // e.g. "750 D+"
  requirement: MilestoneRequirement;
}

export interface Objective {
  id: string;
  name: string; // e.g. "GR5 / ALPINE READINESS"
  description?: string;
  targetDate?: string; // ISO date
  // Total trip distance in km, filled in by the user once they know it —
  // purely a display/countdown figure for now, not wired into scheduling or
  // the readiness formulas. Feeding actual training volume off this (e.g.
  // scaling endurance targets to trip length) is a deliberate future step,
  // not something this field silently implies today.
  targetDistanceKm?: number;
  milestones: MilestoneDefinition[];
}

// Append-only: a milestone is "cleared" the moment one of these exists.
export interface MilestoneProgress {
  id: string;
  objectiveId: string;
  milestoneId: string;
  clearedDate: string; // ISO date
  sourceSessionLogId?: string;
  note?: string;
}

export type MilestoneStatus = 'completed' | 'current' | 'upcoming' | 'future';
