// ASCEND: what the planning puts on a period of free days or a trek
// (engine/leave.ts). The step between the race block and the week check
// (engine/planPass.ts). Taking things out of a holiday is the week check's
// job (rules LEAVE-OFF and LEAVE-LIGHT); this step only puts things in:
//
// - Trek: every day of the trek gets a mountain hike, unless that day already
//   has a walk (the Sunday hike, a hike you placed yourself) or a walk of this
//   trek that you skipped or moved. Not on a test or race day, a day with
//   something logged, the past, or on and after the goal's day.
// - Free days: in a build week, once per week and period, on a free day:
//   1. the week's long training moves there when its own day is tight (it
//      shares the day with another training), or
//   2. an easy backpack walk is added, when nothing hard, long or heavy for
//      the legs sits next to it.
//   Both only when the weeks around it get no new finding from the week check
//   and no more findings than before: otherwise nothing changes. Never in a
//   rest week or the taper, never on the rest day, never where hiking is off.
//
// Everything is deterministic and idempotent: a second run finds the walks
// there and changes nothing. What is logged, past or locked by you is never
// moved here.
//
// Pure: no React, no IndexedDB.

import type { LeavePeriod } from '../models/leave';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { addDays, isoWeekday, mondayOfWeek, resolveProgramWeek } from '../utils/dates';
import { leaveDays } from './leave';
import { findingKey, lockLevel, validateWeeks, type CheckInput, type Repair } from './weekValidator';
import { isHardRun, isLegHeavyTemplate } from './scheduler';
import { templateSport } from './sports';
import { restWeekState } from './restWeek';
import { PHASE_TAPER } from './programLayout';

export const TREK_TEMPLATE_ID = 'tpl_mountain_hike';
export const FREE_DAY_WALK_TEMPLATE_ID = 'tpl_ruck_walk';
const LONG = new Set(['tpl_long_run', 'tpl_mountain_hike']);
const ANCHORS = new Set(['tpl_test_run', 'tpl_race']);

export interface LeaveStepInput {
  // The week check's own input without the sessions: a placement is only kept
  // when this check likes the weeks around it.
  check: Omit<CheckInput, 'sessions'>;
  newId: () => string;
  // Hiking switched off (Instellingen, Sporten): no extra walk on a free day.
  hikingEnabled?: boolean;
}

export interface LeaveStepResult {
  sessions: PlannedSession[];
  repairs: Repair[];
}

const isHikingTemplate = (t: SessionTemplate | undefined): t is SessionTemplate => !!t && t.type === 'hiking' && templateSport(t) === 'hiking';

export function applyLeaveBlocks(all: PlannedSession[], input: LeaveStepInput): LeaveStepResult {
  const periods: LeavePeriod[] = input.check.leave ?? [];
  if (periods.length === 0) return { sessions: all, repairs: [] };
  const { today, goalDay, restDay, templates, logs, program } = input.check;
  const raceDays = new Set(input.check.raceDays ?? []);
  const byId = new Map(templates.map((t) => [t.id, t]));
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const days = leaveDays(periods);
  let sessions = all;
  const repairs: Repair[] = [];

  const usable = (date: string) => date >= today && (!goalDay || date < goalDay) && !raceDays.has(date);
  const open = (s: PlannedSession) => s.status !== 'skipped';
  const on = (date: string) => sessions.filter((s) => s.scheduledDate === date);
  const blocked = (date: string) => on(date).some((s) => ANCHORS.has(s.templateId) || logged.has(s.id));
  const isWalk = (s: PlannedSession) => isHikingTemplate(byId.get(s.templateId));
  const sorted = [...days.entries()].sort(([a], [b]) => a.localeCompare(b));

  // --- trek: a walk on every day -------------------------------------------------
  const trekTemplate = byId.has(TREK_TEMPLATE_ID) ? TREK_TEMPLATE_ID : templates.find((t) => isHikingTemplate(t))?.id;
  for (const [date, day] of sorted) {
    if (day.kind !== 'trek' || !trekTemplate || !usable(date) || blocked(date)) continue;
    const served = sessions.some((s) =>
      (s.leave?.periodId === day.period.id && s.leave.role === 'placed' && (s.leave.from ?? s.scheduledDate) === date) ||
      (s.scheduledDate === date && open(s) && isWalk(s)));
    if (served) continue;
    const added: PlannedSession = {
      id: input.newId(), templateId: trekTemplate, scheduledDate: date, weekStartDate: mondayOfWeek(date), status: 'planned', order: 0,
      leave: { periodId: day.period.id, role: 'placed', from: date },
    };
    sessions = [...sessions, added];
    repairs.push({ sessionId: added.id, rule: 'LEAVE-PLACE', from: date, to: date, added: true });
  }

  // --- free days: a long walk where the week gets better -----------------------------
  const buildWeek = (week: string) => {
    if (!program) return true;
    const position = resolveProgramWeek(program, week);
    if (!position || position.phase.id === PHASE_TAPER) return false;
    const rest = restWeekState(program, week, [], today);
    return !rest.isRestWeek || rest.skipped;
  };
  // A placement stays when the weeks around it get no new finding.
  const acceptable = (week: string, trial: PlannedSession[]) => {
    const weeks = new Set([-7, 0, 7].map((o) => addDays(week, o)));
    const before = validateWeeks({ ...input.check, sessions }, weeks);
    const known = new Set(before.map(findingKey));
    const after = validateWeeks({ ...input.check, sessions: trial }, weeks);
    return after.length <= before.length && after.every((f) => known.has(findingKey(f)));
  };
  // The easy walk takes no place next to a key day: a long training or a
  // hike the day before or after, hard running that day, or a test or race
  // within two days (the week check judges the legs on top of this).
  const keyDayNear = (date: string) =>
    [-2, -1, 0, 1, 2].some((o) => on(addDays(date, o)).some((s) => open(s) && ANCHORS.has(s.templateId))) ||
    [-1, 0, 1].some((o) => on(addDays(date, o)).some((s) => {
      const t = byId.get(s.templateId);
      return open(s) && !!t && (LONG.has(s.templateId) || isWalk(s) || isHardRun(t) || (o === 0 && isLegHeavyTemplate(t)));
    }));

  const done = new Set<string>();
  for (const [date, day] of sorted) {
    if (day.kind !== 'free') continue;
    const week = mondayOfWeek(date);
    const slot = `${day.period.id}|${week}`;
    if (done.has(slot) || !usable(date) || isoWeekday(date) === restDay || blocked(date)) continue;
    const weekSessions = sessions.filter((s) => mondayOfWeek(s.scheduledDate) === week && open(s));
    const longOnFree = weekSessions.some((s) => LONG.has(s.templateId) && !s.plannedMinutes && days.get(s.scheduledDate)?.kind === 'free');
    // This period already did something in this week (also when you moved or skipped it since).
    const placedHere = sessions.some((s) => s.leave?.periodId === day.period.id && (mondayOfWeek(s.scheduledDate) === week || (!!s.leave.from && mondayOfWeek(s.leave.from) === week)));
    if (longOnFree || placedHere || !buildWeek(week)) { done.add(slot); continue; }

    // 1. The long training of the week moves to this day when its own day is tight.
    const tight = weekSessions
      .filter((s) => LONG.has(s.templateId) && !s.plannedMinutes && !s.raceBlock && lockLevel(s, logged, today) === 3 && s.scheduledDate !== date)
      .filter((s) => weekSessions.some((o) => o.id !== s.id && o.scheduledDate === s.scheduledDate && byId.get(o.templateId)?.type !== 'recovery'))
      .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))[0];
    if (tight) {
      const trial = sessions.map((s) => (s.id === tight.id ? { ...s, scheduledDate: date, weekStartDate: week, leave: { periodId: day.period.id, role: 'moved' as const, from: tight.scheduledDate } } : s));
      if (acceptable(week, trial)) {
        sessions = trial;
        repairs.push({ sessionId: tight.id, rule: 'LEAVE-PLACE', from: tight.scheduledDate, to: date });
        done.add(slot);
        continue;
      }
    }

    // 2. Otherwise an easy backpack walk, when nothing heavy sits next to it.
    if (input.hikingEnabled === false || !byId.has(FREE_DAY_WALK_TEMPLATE_ID) || keyDayNear(date)) continue;
    const others = on(date).filter((s) => open(s) && byId.get(s.templateId)?.type !== 'strength' && byId.get(s.templateId)?.type !== 'recovery');
    if (others.length > 0) continue;
    const added: PlannedSession = {
      id: input.newId(), templateId: FREE_DAY_WALK_TEMPLATE_ID, scheduledDate: date, weekStartDate: week, status: 'planned', order: 0,
      leave: { periodId: day.period.id, role: 'placed', from: date },
    };
    if (acceptable(week, [...sessions, added])) {
      sessions = [...sessions, added];
      repairs.push({ sessionId: added.id, rule: 'LEAVE-PLACE', from: date, to: date, added: true });
      done.add(slot);
    }
  }
  return { sessions, repairs };
}
