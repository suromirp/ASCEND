// ASCEND — Program domain models
//
// PROGRAM → PHASE (block) → WEEK → SESSION → EXERCISE
//
// Weeks are intentionally NOT a persisted entity. A week is just seven days
// starting on a Monday; which phase/week-number it belongs to is derived
// from Program.startDate + Phase.weekCount at read time (see
// utils/dates.ts#resolveProgramWeek). This avoids a second source of truth
// that could drift from the calendar.

export interface Phase {
  id: string;
  name: string; // e.g. "FOUNDATION"
  order: number;
  weekCount: number;
  description?: string;
}

export interface Program {
  id: string;
  name: string;
  startDate: string; // ISO date, Monday of program week 1
  phases: Phase[];
  // Rest weeks you chose to train through (Monday ISO dates): that week
  // counts as a normal build week (engine/restWeek.ts). Optional,
  // additive: older programs and backups simply don't have it.
  skippedRestWeeks?: string[];
}

export interface ResolvedProgramPosition {
  phase: Phase;
  phaseIndex: number;
  weekInPhase: number; // 1-based
  weekInProgram: number; // 1-based
  totalWeeksInProgram: number;
  // The rest week of this wave is trained through (Program.skippedRestWeeks).
  restSkipped?: true;
}
