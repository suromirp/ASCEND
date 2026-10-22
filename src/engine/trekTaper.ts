// ASCEND: how many light days come before a tocht (engine/trek.ts). The one
// place for these numbers; the planning reads them through engine/leave.ts
// (rule LEAVE-LIGHT), there is no second planner.
//
// The reasoning, not a study: a longer or heavier effort asks for more fresh
// legs at the start, and the legs recover from hard training in about two to
// four days (the same span the scheduler uses between leg-heavy sessions, 48
// hours, extended for a multi-day effort). So:
//   - a tocht of 1 day: 2 light days before,
//   - 2 or 3 days: 3 light days before,
//   - 4 days or more: 4 light days before.
// "Training onderweg" is no taper: it keeps the single light day that every
// trek has. After the tocht one light day always follows.
//
// Pure: no React, no IndexedDB.

import type { TrekImportance } from '../models/leave';

export const TREK_LIGHT_DAYS_BEFORE_DEFAULT = 1;

export function trekLightDaysBefore(days: number, importance: TrekImportance | undefined): number {
  if (importance !== 'goal') return TREK_LIGHT_DAYS_BEFORE_DEFAULT;
  if (days <= 1) return 2;
  if (days <= 3) return 3;
  return 4;
}
