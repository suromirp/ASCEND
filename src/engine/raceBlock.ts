// ASCEND — a running race as a tussendoel (secondary goal) inside the plan
// toward the main goal (production feedback: "dit is leuk om voor te
// trainen en draagt ook gewoon bij aan de GR5").
//
// The main goal (the one with the ascent ladder, engine/programLayout.ts)
// keeps deciding the phases. A race before it, with role 'secondary' (the
// default for a running goal with a distance or target time), gets a block
// of RACE_BLOCK_WEEKS weeks:
// - in those weeks the easy run becomes a tempo run (threshold blocks),
//   except in race week itself;
// - a 5 km test run in the week before the block and four weeks before the
//   race, in the easy/tempo run's place: an easy run says nothing about
//   race pace, a test does (and ASCEND asks for it, so you don't have to);
// - the race is put in the plan on its date;
// - on race day nothing else, and no hill intervals or heavy leg strength
//   in the two days before it;
// - race week is a short taper: the trainings before the race in that week
//   are their short version (volume down, intensity and frequency kept;
//   Bosquet et al. 2007; for 5-10 km a taper of about 1 to 2 weeks with the
//   hardest session 5 to 10 days before the race, which is the last tempo
//   run on the Thursday of the week before);
// - the day after, the long run (or mountain hike) is the short version.
// Everything else of the main plan stays as it is. Outside a block a tempo
// run goes back to an easy run, so moving or removing the goal undoes it.
//
// Pure: no React, no IndexedDB.

import type { TrainingGoal } from '../models/goals';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { addDays, mondayOfWeek } from '../utils/dates';

export const RACE_BLOCK_WEEKS = 8;
export const TEMPO_TEMPLATE_ID = 'tpl_tempo_run';
export const RACE_TEMPLATE_ID = 'tpl_race';
export const TEST_TEMPLATE_ID = 'tpl_test_run';
// Weeks before race week with a 5 km test: just before the block starts,
// and halfway, four weeks before the race.
const TEST_WEEKS_BEFORE_RACE = [RACE_BLOCK_WEEKS + 1, 4];
const EASY_TEMPLATE_ID = 'tpl_easy_run';
const BEFORE_RACE_TAKEN_OUT = ['tpl_hill_intervals', 'tpl_lower_a', 'tpl_lower_b'];
const AFTER_RACE_SHORT = ['tpl_long_run', 'tpl_mountain_hike'];

export type GoalPlanRole = 'main' | 'secondary' | 'track';

export interface RaceBlock {
  goalId: string;
  name: string;
  raceDate: string;
  blockStart: string; // Monday
  raceWeek: string; // Monday of race week
  distanceKm?: number;
  targetMinutes?: number;
}

export function isRaceGoal(goal: TrainingGoal): boolean {
  return goal.requirements.some((r) => (r.kind === 'distance' || r.kind === 'targetTime') && r.discipline === 'running');
}

// The role a goal plays in the plan: the main goal is fixed; any other
// running race defaults to a tussendoel, everything else to "only follow".
export function goalPlanRole(goal: TrainingGoal, mainGoalId: string | undefined): GoalPlanRole {
  if (goal.id === mainGoalId) return 'main';
  return goal.planRole ?? (isRaceGoal(goal) ? 'secondary' : 'track');
}

export function raceBlocks(goals: TrainingGoal[], mainGoalId: string | undefined, anchor: string | undefined, today: string): RaceBlock[] {
  return goals
    .filter((g): g is TrainingGoal & { targetDate: string } => g.status === 'active' && !!g.targetDate && g.targetDate >= today && (!anchor || g.targetDate < anchor))
    .filter((g) => isRaceGoal(g) && goalPlanRole(g, mainGoalId) === 'secondary')
    .map((g) => {
      const distance = g.requirements.find((r) => r.kind === 'distance' && r.target?.unit === 'km')?.target?.amount;
      const time = g.requirements.find((r) => r.kind === 'targetTime' && r.target?.unit === 'min')?.target?.amount;
      const raceWeek = mondayOfWeek(g.targetDate);
      return { goalId: g.id, name: g.name, raceDate: g.targetDate, raceWeek, blockStart: addDays(raceWeek, -7 * RACE_BLOCK_WEEKS), distanceKm: distance, targetMinutes: time };
    });
}

// Which template a planned session should be on this date: the easy run
// becomes a tempo run inside a block (not in race week), and back outside.
export function templateForRaceBlock(templateId: string, date: string, blocks: RaceBlock[]): string {
  if (![EASY_TEMPLATE_ID, TEMPO_TEMPLATE_ID, TEST_TEMPLATE_ID].includes(templateId)) return templateId;
  const week = mondayOfWeek(date);
  if (blocks.some((b) => TEST_WEEKS_BEFORE_RACE.some((n) => week === addDays(b.raceWeek, -7 * n)))) return TEST_TEMPLATE_ID;
  return blocks.some((b) => date >= b.blockStart && date < b.raceWeek) ? TEMPO_TEMPLATE_ID : EASY_TEMPLATE_ID;
}

export interface RaceBlockChanges {
  update: PlannedSession[];
  add: PlannedSession[];
  remove: PlannedSession[];
}

// Applied to the planned sessions that are still open (from today on, not
// logged, not skipped). Idempotent: a second run changes nothing.
export function applyRaceBlocks(
  open: PlannedSession[],
  blocks: RaceBlock[],
  templates: SessionTemplate[],
  newId: () => string,
): RaceBlockChanges {
  const byId = new Map(templates.map((t) => [t.id, t]));
  if (!byId.has(TEMPO_TEMPLATE_ID) || !byId.has(RACE_TEMPLATE_ID) || !byId.has(TEST_TEMPLATE_ID)) return { update: [], add: [], remove: [] };
  const update = new Map<string, PlannedSession>();
  const remove: PlannedSession[] = [];
  const add: PlannedSession[] = [];
  const raceDates = new Set(blocks.map((b) => b.raceDate));

  for (const s of open) {
    // A race whose goal moved or went: out of the plan.
    if (s.templateId === RACE_TEMPLATE_ID && !raceDates.has(s.scheduledDate)) {
      remove.push(s);
      continue;
    }
    const target = templateForRaceBlock(s.templateId, s.scheduledDate, blocks);
    if (target !== s.templateId) update.set(s.id, { ...s, templateId: target });
  }

  for (const b of blocks) {
    const raceMinutes = b.targetMinutes ?? (b.distanceKm ? Math.round(b.distanceKm * 6) : 60);
    if (!open.some((s) => s.templateId === RACE_TEMPLATE_ID && s.scheduledDate === b.raceDate)) {
      add.push({ id: newId(), templateId: RACE_TEMPLATE_ID, scheduledDate: b.raceDate, weekStartDate: b.raceWeek, status: 'planned', order: 0, plannedMinutes: raceMinutes });
    }
    for (const s of open) {
      if (s.status !== 'planned' || s.templateId === RACE_TEMPLATE_ID) continue;
      const t = byId.get(s.templateId);
      if (!t || t.type === 'recovery') continue;
      const current = update.get(s.id) ?? s;
      const before = s.scheduledDate < b.raceDate && s.scheduledDate >= addDays(b.raceDate, -2);
      // Race day itself: only the race. Two days before: nothing heavy for the legs.
      if (s.scheduledDate === b.raceDate || (before && BEFORE_RACE_TAKEN_OUT.includes(current.templateId))) {
        update.delete(s.id);
        remove.push(s);
        continue;
      }
      // Race week, before the race: the short version (a taper).
      const short = byId.get(current.templateId)?.durationVariants.short;
      if (s.scheduledDate >= b.raceWeek && s.scheduledDate < b.raceDate && short && current.plannedMinutes !== short) {
        update.set(s.id, { ...current, plannedMinutes: short });
        continue;
      }
      // The day after: the long training short.
      if (s.scheduledDate === addDays(b.raceDate, 1) && AFTER_RACE_SHORT.includes(current.templateId) && short && current.plannedMinutes !== short) {
        update.set(s.id, { ...current, plannedMinutes: short });
      }
    }
  }
  return { update: [...update.values()], add, remove };
}
