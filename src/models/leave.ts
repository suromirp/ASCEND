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
// - no_gym: you are away and can run, but have no gym. Runs stay, shorter and
//   easier; a gym session becomes a short one with your own weight, or goes
//   (engine/noGym.ts).
export type LeaveKind = 'free_days' | 'no_training' | 'trek' | 'no_gym';

// The choices of a period without a gym (engine/noGym.ts). Optional and additive:
// a period without them, or with damaged ones, reads as the advice
// (engine/noGym.ts#resolveNoGym, storage/migrationsPlanning.ts#migrateLeavePeriods).
export interface NoGymDetails {
  // 'light': two runs a week (the advice). 'normal': what was planned, without the gym.
  amount: 'light' | 'normal';
  // 'bodyweight': a gym session becomes a short one with your own weight (the advice). 'drop': it goes.
  strength: 'bodyweight' | 'drop';
  // Hills nearby: a run goes easy up the hills and controlled down. Words only, it plans nothing.
  hills: boolean;
}

export interface LeavePeriod {
  id: string;
  kind: LeaveKind;
  startDate: string; // ISO date, first day
  endDate: string; // ISO date, last day (inclusive)
  note?: string;
  // Set when this period is a tocht of your own (see TrekDetails).
  trek?: TrekDetails;
  // Set on a period without a gym (see NoGymDetails).
  noGym?: NoGymDetails;
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
  // Set on a heavy leg day the tocht made short (rest after a tocht, soft).
  // Only such a day goes back to its full length when the tocht goes away.
  shortened?: boolean;
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
  // The highest point of the tocht in metres, for the mountain weather at that height
  // (engine/mountainWeather.ts). Only for terrain mountain or snow. Optional and additive: older
  // data has none, and a damaged value is dropped on import without losing the tocht
  // (storage/migrations.ts#migrateLeavePeriods).
  highestM?: number;
  // A place of its own for the mountain weather, so the card can come the day before and does not
  // depend on where you are (engine/mountainWeather.ts). Name and coordinates rounded to two
  // decimals (engine/trek.ts#parseTrekPlace). Optional and additive: older data has none, and a
  // damaged value is dropped on import without losing the tocht (storage/migrations.ts#migrateLeavePeriods).
  place?: { name: string; lat: number; lon: number };
  tent: boolean; // with tent and sleeping bag
  importance: TrekImportance;
}
