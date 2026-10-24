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
// - the day after, the long run (or mountain hike) is the short version;
// - the Saturday hill intervals become long intervals (4 x 4 min) in the
//   block, except block week 3, which keeps the hills with descending;
// - but a week with only three runs gets ONE quality session, the one that
//   matters most for that phase of the block (KEY_BY_BLOCK_WEEK); the other
//   becomes an easy run (Thursday) or a quiet run with strides (Saturday).
//   Two quality sessions only from four runs a week (the owner's decision,
//   docs/visie/Trainingswetenschap.md, knelpunt 9 and idea 11: with three
//   runs, a long run and heavy leg strength next to it, a second hard session
//   buys less than one more easy run). A session that is yours, logged or
//   past counts: it is the week's quality session and nothing is added to it;
// - a tempo run or test may not sit within 48 hours (a test 72) after
//   heavy leg strength: the leg day swaps with an upper body day earlier
//   in the week, and in a test week it is also the short version.
//
// Outside a block the Saturday alternates too: every second week of the
// four-week wave "Heuvelsprints en afdalen" (hills, then controlled descending) in
// the basis and Opbouw, so the legs never go long without a descent
// stimulus (docs/onderzoek/Trainingsvormen en varianten.md). From
// Bergcapaciteit the Sunday mountain hike does the descending.
// Everything else of the main plan stays as it is. Outside a block a tempo
// run goes back to an easy run, so moving or removing the goal undoes it.
//
// Pure: no React, no IndexedDB.

import type { PlanChangeProposal } from '../models/planChange';
import type { TrainingGoal } from '../models/goals';
import type { PlannedSession, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import { addDays, daysBetween, mondayOfWeek, resolveProgramWeek } from '../utils/dates';
import { PHASE_BASIS, PHASE_OPBOUW, PHASE_ONDERHOUD, waveWeek } from './programLayout';
import { isLegHeavyTemplate } from './scheduler';
import { templateSport } from './sports';

export const RACE_BLOCK_WEEKS = 8;
export const TEMPO_TEMPLATE_ID = 'tpl_tempo_run';
export const RACE_TEMPLATE_ID = 'tpl_race';
export const TEST_TEMPLATE_ID = 'tpl_test_run';
// Weeks before race week with a 5 km test: just before the block starts,
// and halfway, four weeks before the race.
// Plus a first test 20 weeks out, at the start of Opbouw in your plan, so ASCEND knows your pace (and
// what to train) long before the block.
const TEST_WEEKS_BEFORE_RACE = [20, RACE_BLOCK_WEEKS + 1, 4];
export const INTERVALS_TEMPLATE_ID = 'tpl_intervals';
export const HILLS_TEMPLATE_ID = 'tpl_hill_intervals';
export const HILLS_DESCENT_TEMPLATE_ID = 'tpl_hills_descent';
const SATURDAY_FAMILY = [HILLS_TEMPLATE_ID, INTERVALS_TEMPLATE_ID, HILLS_DESCENT_TEMPLATE_ID];
const DESCENT_PHASES = [PHASE_BASIS, PHASE_OPBOUW, PHASE_ONDERHOUD];
const DESCENT_BLOCK_WEEK = 3;
const EASY_TEMPLATE_ID = 'tpl_easy_run';
// The quiet run a Saturday becomes in a week with one quality session only.
export const QUIET_TEMPLATE_ID = 'tpl_strides_run';
// From this many runs in a week both quality sessions stay.
export const TWO_QUALITY_MIN_RUNS = 4;
const QUALITY_TEMPLATES = new Set([TEMPO_TEMPLATE_ID, TEST_TEMPLATE_ID, INTERVALS_TEMPLATE_ID, HILLS_TEMPLATE_ID, HILLS_DESCENT_TEMPLATE_ID]);
// Which slot carries the week when there is room for one quality session, by
// block week (1 to 8). Threshold work first and last (the tempo run: the
// closest to race pace for a 10 km, and the hardest session 5 to 10 days
// before the race is the Thursday of block week 8); week 3 keeps the hills
// with descending (protects the legs against muscle damage); the long
// intervals sharpen in the middle; block week 5 is the test (four weeks
// before the race), which sits on the run slot.
const KEY_BY_BLOCK_WEEK: ('run' | 'saturday')[] = ['run', 'run', 'saturday', 'saturday', 'run', 'saturday', 'run', 'run'];
const BEFORE_RACE_TAKEN_OUT = ['tpl_hill_intervals', 'tpl_hills_descent', 'tpl_intervals', 'tpl_lower_a', 'tpl_lower_b'];
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

// What a week looks like for the quality rule: how many runs it has (all of
// them: logged, past, skipped ones left out) and whether a quality session of
// it is already beyond the block's reach (logged, past, or yours).
export interface WeekQuality {
  runs: number;
  fixed: boolean;
}

// Which of the two quality slots of a block week keeps its quality session:
// both from four runs; with fewer, only the key one, and none when a fixed
// quality session already stands in the week. Without week information (or
// outside a block) the old behaviour: both.
function qualitySlots(date: string, blocks: RaceBlock[], quality?: WeekQuality): { run: boolean; saturday: boolean } {
  const block = blocks.find((b) => date >= b.blockStart && date < b.raceWeek);
  if (!block || !quality || quality.runs >= TWO_QUALITY_MIN_RUNS) return { run: true, saturday: true };
  if (quality.fixed) return { run: false, saturday: false };
  const blockWeek = Math.floor(daysBetween(block.blockStart, mondayOfWeek(date)) / 7);
  const key = KEY_BY_BLOCK_WEEK[blockWeek] ?? 'run';
  return { run: key === 'run', saturday: key === 'saturday' };
}

// Which template a planned session should be on this date: the easy run
// becomes a tempo run inside a block (not in race week, and in a week with
// three runs only when it is the key session), and back outside. A test week
// stays a test week: the test is the measuring point, never traded away.
export function templateForRaceBlock(templateId: string, date: string, blocks: RaceBlock[], program?: Program | null, quality?: WeekQuality): string {
  if (SATURDAY_FAMILY.includes(templateId)) return saturdayTemplate(date, blocks, program, quality);
  if (![EASY_TEMPLATE_ID, TEMPO_TEMPLATE_ID, TEST_TEMPLATE_ID].includes(templateId)) return templateId;
  const week = mondayOfWeek(date);
  if (blocks.some((b) => TEST_WEEKS_BEFORE_RACE.some((n) => week === addDays(b.raceWeek, -7 * n)))) return TEST_TEMPLATE_ID;
  if (!blocks.some((b) => date >= b.blockStart && date < b.raceWeek)) return EASY_TEMPLATE_ID;
  return qualitySlots(date, blocks, quality).run ? TEMPO_TEMPLATE_ID : EASY_TEMPLATE_ID;
}

// The Saturday quality session: intervals in a race block (hills with
// descending in its third week), otherwise hills, with descending in weeks
// 2 and 4 of the wave in the basis and Opbouw. In a block week that has room
// for one quality session only and where Saturday is not the key one: a quiet
// run with strides.
export function saturdayTemplate(date: string, blocks: RaceBlock[], program?: Program | null, quality?: WeekQuality): string {
  const week = mondayOfWeek(date);
  const block = blocks.find((b) => date >= b.blockStart && date < b.raceWeek);
  if (block) {
    if (!qualitySlots(date, blocks, quality).saturday) return QUIET_TEMPLATE_ID;
    return Math.floor(daysBetween(block.blockStart, week) / 7) + 1 === DESCENT_BLOCK_WEEK ? HILLS_DESCENT_TEMPLATE_ID : INTERVALS_TEMPLATE_ID;
  }
  const position = program ? resolveProgramWeek(program, date) : null;
  if (position && DESCENT_PHASES.includes(position.phase.id) && waveWeek(position) % 2 === 0) return HILLS_DESCENT_TEMPLATE_ID;
  return HILLS_TEMPLATE_ID;
}

// Test runs the weekly prescription took out (it used to count them as
// "not part of the composition of this week": production feedback, the 5 km
// test of 29 October and both later tests were skipped without anyone asking).
// They go back to planned, once, as long as they are still ahead and
// unlogged. A test you skipped yourself afterwards carries your lock and
// stays skipped. A race is not revived: applyRaceBlocks adds a fresh one itself.
export function revivePrescriptionRemovedTests(sessions: PlannedSession[], proposals: PlanChangeProposal[], logged: Set<string | undefined>, today: string): PlannedSession[] {
  const removed = new Set(
    proposals
      .filter((p) => p.resolution === 'accepted')
      .flatMap((p) => p.changes)
      .filter((c) => c.action === 'remove' && c.plannedSessionId && (c.generatedBy ?? []).some((g) => g.includes('weeklyPrescriptionEngine')))
      .map((c) => c.plannedSessionId),
  );
  return sessions
    .filter((s) => s.templateId === TEST_TEMPLATE_ID && s.status === 'skipped' && !s.lock && s.scheduledDate >= today && !logged.has(s.id) && removed.has(s.id))
    .map((s) => ({ ...s, status: 'planned' as const }));
}

// What the race block may move, swap, shorten or retemplate: a session the
// system planned and nobody fixed in place. Not one you moved, and not one an
// accepted proposal moved or showed (PlannedSession.lock).
const free = (s: PlannedSession) => s.status === 'planned' && !s.lock;
// A tempo run or test that still happens, wherever it is now: the legs keep
// their distance from it, also when you moved it.
const isHardRun = (s: PlannedSession) => s.status !== 'skipped' && (s.templateId === TEMPO_TEMPLATE_ID || s.templateId === TEST_TEMPLATE_ID);

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
  program?: Program | null,
  // Every planned session, also the logged, past and skipped ones: the runs
  // of a week are counted over all of them. Without it, over `open`.
  all?: PlannedSession[],
): RaceBlockChanges {
  const byId = new Map(templates.map((t) => [t.id, t]));
  if (!byId.has(TEMPO_TEMPLATE_ID) || !byId.has(RACE_TEMPLATE_ID) || !byId.has(TEST_TEMPLATE_ID)) return { update: [], add: [], remove: [] };
  const known = (id: string) => byId.has(id) || !SATURDAY_FAMILY.includes(id);
  const everything = all ?? open;
  const decidable = new Set(open.filter(free).map((s) => s.id));
  const qualityCache = new Map<string, WeekQuality>();
  const qualityOf = (date: string): WeekQuality => {
    const monday = mondayOfWeek(date);
    let q = qualityCache.get(monday);
    if (!q) {
      const week = everything.filter((s) => mondayOfWeek(s.scheduledDate) === monday && s.status !== 'skipped');
      const isRun = (s: PlannedSession) => { const t = byId.get(s.templateId); return !!t && t.type !== 'strength' && t.type !== 'recovery' && templateSport(t) === 'running'; };
      q = { runs: week.filter(isRun).length, fixed: week.some((s) => QUALITY_TEMPLATES.has(s.templateId) && !decidable.has(s.id)) };
      qualityCache.set(monday, q);
    }
    return q;
  };
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
    if (!free(s)) continue;
    // A quiet Saturday run stands in for the Saturday session: it is judged as
    // that one, so it goes back to hills, intervals or hills with descending
    // when the week has room again or the block is gone.
    const asSaturday = s.templateId === QUIET_TEMPLATE_ID && s.blockQuiet;
    const target = templateForRaceBlock(asSaturday ? HILLS_TEMPLATE_ID : s.templateId, s.scheduledDate, blocks, program, byId.has(QUIET_TEMPLATE_ID) ? qualityOf(s.scheduledDate) : undefined);
    if (target !== s.templateId && known(target)) {
      const { blockQuiet: _quiet, ...rest } = s;
      void _quiet;
      update.set(s.id, target === QUIET_TEMPLATE_ID ? { ...rest, templateId: target, blockQuiet: true } : { ...rest, templateId: target });
    }
  }

  for (const b of blocks) {
    const raceMinutes = b.targetMinutes ?? (b.distanceKm ? Math.round(b.distanceKm * 6) : 60);
    if (!open.some((s) => s.templateId === RACE_TEMPLATE_ID && s.scheduledDate === b.raceDate)) {
      add.push({ id: newId(), templateId: RACE_TEMPLATE_ID, scheduledDate: b.raceDate, weekStartDate: b.raceWeek, status: 'planned', order: 0, plannedMinutes: raceMinutes });
    }
    for (const s of open) {
      if (!free(s) || s.templateId === RACE_TEMPLATE_ID) continue;
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
  const gone = new Set(remove.map((r) => r.id));
  restoreLegSwaps(open, update, byId, gone, new Set(blocks.map((b) => b.raceWeek)));
  swapLegsBeforeHardRuns(open, update, byId, gone);
  return { update: [...update.values()], add, remove };
}

// A tempo run or test too soon after heavy leg strength: the leg day swaps
// with an upper body day earlier in the same week, far enough before the
// run. In a test week the leg day is also the short version (72 hours is
// rarely possible in a full week). Applied to the sessions as they will be.
// A swap made for a run that has since moved or gone: back to the day it had.
// Only while the session is still where the swap put it and you did not move
// it yourself. When you or an accepted proposal fixed either one in place,
// the week is yours: nothing goes back, the markers go.
function restoreLegSwaps(open: PlannedSession[], update: Map<string, PlannedSession>, byId: Map<string, SessionTemplate>, removed: Set<string>, raceWeeks: Set<string>): void {
  const now = () => open.filter((s) => !removed.has(s.id)).map((s) => update.get(s.id) ?? s);
  const sessions = now();
  const runs = sessions.filter(isHardRun);
  const marked = sessions.filter((s) => s.raceBlock);

  // Swaps made before sessions carried a marker: leg strength in its short
  // version, a day before the upper body day of the same week, in a week
  // with nothing for it to keep its distance from, goes back.
  const isStrength = (s: PlannedSession, legs: boolean) => { const t = byId.get(s.templateId); return !!t && t.type === 'strength' && isLegHeavyTemplate(t) === legs; };
  // (Not one a tocht shortened: that carries the tocht's mark with `shortened`,
  // engine/weekValidator.ts. A session a holiday only moved takes part.)
  for (const legs of sessions.filter((s) => !s.raceBlock && !s.leave?.shortened && free(s) && isStrength(s, true))) {
    const short = byId.get(legs.templateId)?.durationVariants.short;
    // Race week has short versions of its own (the taper).
    if (!short || legs.plannedMinutes !== short || raceWeeks.has(legs.weekStartDate)) continue;
    const partner = sessions
      .filter((s) => !s.raceBlock && free(s) && s.weekStartDate === legs.weekStartDate && s.scheduledDate > legs.scheduledDate && isStrength(s, false))
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
    if (!partner) continue;
    const needed = runs.some((r) => { const d = daysBetween(partner.scheduledDate, r.scheduledDate); return d >= 0 && d < (r.templateId === TEST_TEMPLATE_ID ? 3 : 2); });
    if (needed) continue;
    const { plannedMinutes: _short, ...rest } = legs;
    void _short;
    update.set(legs.id, { ...rest, scheduledDate: partner.scheduledDate, weekStartDate: mondayOfWeek(partner.scheduledDate) });
    update.set(partner.id, { ...partner, scheduledDate: legs.scheduledDate, weekStartDate: mondayOfWeek(legs.scheduledDate) });
  }
  for (const legs of marked.filter((s) => s.raceBlock!.pair === s.id)) {
    const members = marked.filter((s) => s.raceBlock!.pair === legs.id);
    if (members.some((m) => m.lock)) {
      for (const m of members) {
        const { raceBlock: _drop, ...rest } = m;
        void _drop;
        update.set(m.id, rest);
      }
      continue;
    }
    const from = legs.raceBlock!.from;
    const needed = runs.some((r) => {
      const d = daysBetween(from, r.scheduledDate);
      return d >= 0 && d < (r.templateId === TEST_TEMPLATE_ID ? 3 : 2);
    });
    if (needed) continue;
    for (const m of marked.filter((s) => s.raceBlock!.pair === legs.id)) {
      const mark = m.raceBlock!;
      const { raceBlock: _drop, ...rest } = m;
      void _drop;
      const restored: PlannedSession = m.status === 'planned' && m.scheduledDate === mark.to
        ? { ...rest, scheduledDate: mark.from, weekStartDate: mondayOfWeek(mark.from) }
        : rest;
      if (mark.short && restored.plannedMinutes !== undefined && m.status === 'planned' && m.scheduledDate === mark.to) delete restored.plannedMinutes;
      update.set(m.id, restored);
    }
  }
}

function swapLegsBeforeHardRuns(open: PlannedSession[], update: Map<string, PlannedSession>, byId: Map<string, SessionTemplate>, removed: Set<string>): void {
  const now = () => open.filter((s) => !removed.has(s.id) && free(s)).map((s) => update.get(s.id) ?? s);
  const runs = open.filter((s) => !removed.has(s.id)).map((s) => update.get(s.id) ?? s).filter(isHardRun);
  for (const run of runs) {
    const need = run.templateId === TEST_TEMPLATE_ID ? 3 : 2;
    const isLegs = (s: PlannedSession) => { const t = byId.get(s.templateId); return !!t && t.type === 'strength' && isLegHeavyTemplate(t); };
    for (const legs of now().filter((s) => isLegs(s) && daysBetween(s.scheduledDate, run.scheduledDate) >= 0 && daysBetween(s.scheduledDate, run.scheduledDate) < need)) {
      const partner = now()
        .filter((s) => s.weekStartDate === legs.weekStartDate && s.scheduledDate < legs.scheduledDate && byId.get(s.templateId)?.type === 'strength' && !isLegs(s))
        .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))[0];
      let moved = legs;
      if (partner) {
        const pair = legs.raceBlock?.pair ?? legs.id;
        moved = { ...legs, scheduledDate: partner.scheduledDate, raceBlock: { pair, from: legs.raceBlock?.from ?? legs.scheduledDate, to: partner.scheduledDate, short: legs.raceBlock?.short } };
        update.set(partner.id, { ...partner, scheduledDate: legs.scheduledDate, raceBlock: { pair, from: partner.raceBlock?.from ?? partner.scheduledDate, to: legs.scheduledDate } });
        update.set(legs.id, moved);
      }
      const short = byId.get(legs.templateId)?.durationVariants.short;
      if (daysBetween(moved.scheduledDate, run.scheduledDate) < need && short && moved.plannedMinutes !== short) {
        update.set(legs.id, { ...moved, plannedMinutes: short, raceBlock: moved.raceBlock ? { ...moved.raceBlock, short: true } : { pair: legs.id, from: legs.scheduledDate, to: legs.scheduledDate, short: true } });
      }
    }
  }
}
