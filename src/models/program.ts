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
  // A rest week skipped or put back, or a repeat set or taken back, in the
  // middle of a week: the days of that week before `until` keep how the week
  // stood then, so a training that is done or past never changes
  // (engine/weekLoadChange.ts, docs/beslissingen/2026-10-24-rustweek-via-voorstel.md).
  // Optional, additive: older programs and backups simply don't have it.
  heldWeekDays?: HeldWeekDays[];
  // The rucksack target (kg) of the main goal, copied here by
  // storage/database.ts#syncProgramHorizon like the phases are laid out from
  // its date: the pack ladder of the hikes and rucksack walks climbs toward
  // it (engine/packLadder.ts). Absent = the default with a tent. Optional,
  // additive: older programs and backups simply don't have it.
  packTargetKg?: number;
  // The next running race of a Top or Voortop goal, copied here by
  // storage/database.ts#syncProgramHorizon like the pack target: until that race the long run
  // grows every `stepWeeks` weeks by 10% (the 110% cap of the session still holds) instead of 10%
  // per wave of four weeks (engine/runGrowth.ts, docs/beslissingen/2026-10-26-planning-met-labels.md).
  // Absent = the usual build-up. Optional, additive: older programs and backups don't have it.
  runBuild?: { raceDate: string; stepWeeks: number; peakMinutes: number };
}

// For the days of `week` (a Monday) before `until`: whether the rest week was
// trained through and whether the week repeated the one before, as it stood
// before a change in the middle of that week.
export interface HeldWeekDays {
  week: string;
  until: string;
  restSkipped?: true;
  repeated?: true;
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
