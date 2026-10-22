// ASCEND — Program domain models
//
// PROGRAM → PHASE (block) → WEEK → SESSION → EXERCISE
//
// Weeks are intentionally NOT a persisted entity. A week is just seven days
// starting on a Monday; which phase/week-number it belongs to is derived
// from Program.startDate + Phase.weekCount at read time (see
// utils/dates.ts#resolveProgramWeek). This avoids a second source of truth
// that could drift from the calendar.

// The training wave inside every phase: wennen, opbouw, zwaarste week,
// deload (3:1). Lives here, with the taper's id, because the position of a
// week (utils/dates.ts#resolveProgramWeek) needs both and engine/programLayout.ts
// re-exports them.
export const WAVE_LENGTH = 4;
export const PHASE_TAPER = 'phase_taper';

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
  // Weeks that carry the load of the week before instead of stepping up
  // ("Deze week nog een keer", Monday ISO dates, engine/repeatWeek.ts): the
  // build-up of the rest of that wave runs one step behind, the rest week
  // and every later wave stay on the calendar. Optional, additive: older
  // programs and backups simply don't have it.
  repeatedWeeks?: string[];
}

export interface ResolvedProgramPosition {
  phase: Phase;
  phaseIndex: number;
  weekInPhase: number; // 1-based
  weekInProgram: number; // 1-based
  totalWeeksInProgram: number;
  // The rest week of this wave is trained through (Program.skippedRestWeeks).
  restSkipped?: true;
  // The load of this week is the load of the week before: this week repeats
  // it (`repeated`), or comes after a repeat in the same wave (`loadShift`).
  // weekInPhase and weekInProgram stay the calendar's; the build-up reads
  // them through engine/programLayout.ts#loadWeekInPhase / loadWeekInProgram.
  loadShift?: 1;
  repeated?: true;
}
