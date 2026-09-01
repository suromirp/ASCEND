// ASCEND — Objective & Ascent Ladder domain models
//
// Mirrors the SessionTemplate / PlannedSession / SessionLog split: an
// Objective + its MilestoneDefinitions are the static template ("what would
// it take"), while MilestoneProgress rows are the append-only historical
// record of when a milestone was actually cleared. This means editing the
// objective (e.g. changing a target) never rewrites what was already earned.

export type MilestoneRequirement =
  | { kind: 'duration'; activityType: 'cardio' | 'hiking' | 'strength'; minMinutes: number }
  | { kind: 'elevation'; minMeters: number; minLossMeters?: number }
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
