import type { TerrainContext } from './goals';

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
  // Set when this period is a tocht of your own (see TrekDetails).
  trek?: TrekDetails;
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

// A tocht: a trek you set up yourself as a goal next to the GR5 (a snow hike,
// a weekend with a tent). It is a trek period with the details of the tocht
// on it, so the tocht and its period are one record: changing or removing the
// tocht changes or removes the period, always through a proposal with Akkoord
// (engine/trek.ts). Optional and additive: older data has none.
// - training: training on the way, no taper. The day before and after stay light.
// - goal: "Doel, ik wil fris zijn": extra light days before it (engine/trekTaper.ts).
export type TrekImportance = 'training' | 'goal';
export type TrekTerrain = Extract<TerrainContext, 'flat_trail' | 'uneven_trail' | 'mountain' | 'snow'>;

export interface TrekDetails {
  name: string;
  terrain: TrekTerrain;
  packKg?: number;
  tent: boolean; // with tent and sleeping bag
  importance: TrekImportance;
}
