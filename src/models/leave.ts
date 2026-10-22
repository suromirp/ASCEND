// ASCEND: a period you are away or free (engine/leave.ts). Kept with the
// settings (AppSettings.leavePeriods), like illness episodes: it is a fact
// about your calendar, not training history. Nothing that was trained is
// changed by it, and the planning only follows it through a proposal.

// - free_days: extra days you have time. Nothing is taken out; the planner
//   may put a long walk there when it fits the rules.
// - no_training: a holiday without training. No training on these days.
// - trek: a block of walking days with a backpack (a multi-day tour). The
//   day before and the day after stay light.
export type LeaveKind = 'free_days' | 'no_training' | 'trek';

export interface LeavePeriod {
  id: string;
  kind: LeaveKind;
  startDate: string; // ISO date, first day
  endDate: string; // ISO date, last day (inclusive)
  note?: string;
}

// Written on a planned session that a period changed or placed, so that
// removing the period can put it back. Optional and additive: older data has
// none.
// - placed: the planning put this session on the period (a day of the trek,
//   a long walk on a free day). `from` is the day it was placed for.
// - moved: moved off the period. `from` is the day it was on.
// - dropped: let go because of the period. `from` is the day it was on.
export interface PlannedLeaveMark {
  periodId: string;
  role: 'placed' | 'moved' | 'dropped';
  from?: string;
}
