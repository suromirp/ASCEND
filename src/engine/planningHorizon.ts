// ASCEND — Planning Horizon (Technical Architecture v0.3.1 REVISED, Phase 5,
// review point 10).
//
// Governs which weeks are Locked/Committed/Forecast — a standalone module,
// independent of `syncTemplateAndScheduleDefinitions` (static seed-content
// version sync, untouched, on its own separate version counter). Per the
// event/recompute flow: current + next week is always proposal-gated
// (SYSTEM_INVARIANTS: 'confirmation_horizon_respected' — never a silent
// change), week +2 onward is where the (Phase 6) Adaptive Replanner may
// eventually auto-apply. This module only computes the boundary — it never
// itself decides what change belongs in which proposal.

import { addDays, mondayOfWeek } from '../utils/dates';

export type HorizonZone = 'locked' | 'committed' | 'forecast';

// weekStartDate is expected to already be a Monday (PlannedSession.weekStartDate
// is always the Monday of its week — models/training.ts).
export function resolveHorizonZone(weekStartDate: string, asOf: string): HorizonZone {
  const currentWeekStart = mondayOfWeek(asOf);
  if (weekStartDate < currentWeekStart) return 'locked';
  const nextWeekStart = addDays(currentWeekStart, 7);
  if (weekStartDate === currentWeekStart || weekStartDate === nextWeekStart) return 'committed';
  return 'forecast';
}

// The two Monday week-starts that make up the committed range right now —
// the only weeks a PlanChangeProposal is ever allowed to touch (Proposal
// Engine enforces this; the Adaptive Replanner, not built until Phase 6,
// is the only thing ever allowed to touch the forecast range).
export function committedWeekStartDates(asOf: string): string[] {
  const currentWeekStart = mondayOfWeek(asOf);
  return [currentWeekStart, addDays(currentWeekStart, 7)];
}

export function isDateInCommittedRange(dateIso: string, asOf: string): boolean {
  return resolveHorizonZone(mondayOfWeek(dateIso), asOf) === 'committed';
}
