// ASCEND — the last two steps of every planning run, in one place: the race
// block (engine/raceBlock.ts) and then the week check (engine/weekValidator.ts).
// The daily sync runs them over the stored plan (storage/database.ts
// #syncProgramHorizon), and a proposal runs them over the week it would give
// before you see it (engine/proposalPreview.ts): what "Zo ziet je week
// eruit" shows is what you get (docs/onderzoek/Planning op een lijn.md,
// step 7).
//
// Pure: no React, no IndexedDB.

import type { Program } from '../models/program';
import type { LeavePeriod } from '../models/leave';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { DailyTimeBudget, TrainingStrategyProfile, Weekday } from '../models/goalEngineConfig';
import { applyRaceBlocks, type RaceBlock } from './raceBlock';
import { applyLeaveBlocks } from './leaveBlock';
import { repairWeeks, type Finding, type Repair } from './weekValidator';
import { arrangeWeekForRestDay, type RestWeekday } from './restDay';
import { DEFAULT_ENABLED_SPORTS, parseWeekShape, weeklyPatternTemplates, type PatternSettings } from './sports';
import { PATTERN_SWAPS } from './programLayout';

export interface PlanPassContext {
  today: string;
  logs: SessionLog[];
  templates: SessionTemplate[];
  program: Program | null;
  blocks: RaceBlock[];
  restDay: number;
  goalDay?: string;
  dailyTimeBudget?: Partial<Record<Weekday, DailyTimeBudget>>;
  sameDayPairingPreference?: TrainingStrategyProfile['sameDayPairingPreference'];
  slotDays?: Map<string, number>;
  minutesOf?: (session: PlannedSession, template: SessionTemplate) => number;
  newId: () => string;
  until?: string;
  // Periods of free days, holidays and treks (engine/leave.ts). Taken into
  // account by the leave step and the week check, like the race block.
  leave?: LeavePeriod[];
  // Hiking switched off: no extra walk on a free day.
  hikingEnabled?: boolean;
  // Rest after a tocht: soft (default) or strict (engine/weekValidator.ts).
  trekRest?: 'soft' | 'strict';
}

export interface PlanPassResult {
  sessions: PlannedSession[];
  repairs: Repair[];
  remaining: Finding[];
  // The plan after the race block, before the week check changed anything:
  // what undoing the check's repairs puts back.
  beforeCheck: PlannedSession[];
}

// Race block, leave step and week check take turns until none changes
// anything: each may act on what the other did, and a second run of the whole
// pass must change nothing. Bounded; in practice the second round is quiet.
const MAX_TURNS = 4;

export function planPass(all: PlannedSession[], ctx: PlanPassContext): PlanPassResult {
  const logged = new Set(ctx.logs.map((l) => l.plannedSessionId).filter(Boolean));
  let current = all;
  let beforeCheck: PlannedSession[] | undefined;
  const repairs: Repair[] = [];
  let remaining: Finding[] = [];
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const open = current.filter((s) => s.scheduledDate >= ctx.today && !logged.has(s.id) && s.status !== 'skipped');
    const race = applyRaceBlocks(open, ctx.blocks, ctx.templates, ctx.newId, ctx.program, current);
    const updated = new Map(race.update.map((u) => [u.id, u]));
    const gone = new Set(race.remove.map((r) => r.id));
    const afterRace = [...current.filter((s) => !gone.has(s.id)).map((s) => updated.get(s.id) ?? s), ...race.add];
    const checkInput = {
      logs: ctx.logs, templates: ctx.templates, today: ctx.today, restDay: ctx.restDay, goalDay: ctx.goalDay,
      raceDays: ctx.blocks.map((b) => b.raceDate), program: ctx.program, dailyTimeBudget: ctx.dailyTimeBudget,
      sameDayPairingPreference: ctx.sameDayPairingPreference, slotDays: ctx.slotDays, minutesOf: ctx.minutesOf, until: ctx.until,
      leave: ctx.leave, trekRest: ctx.trekRest,
    };
    // Walks on a trek, a long walk on a free day: what the periods put in.
    const placed = applyLeaveBlocks(afterRace, { check: checkInput, newId: ctx.newId, hikingEnabled: ctx.hikingEnabled });
    beforeCheck ??= placed.sessions;
    const check = repairWeeks({ ...checkInput, sessions: placed.sessions });
    repairs.push(...placed.repairs, ...check.repairs);
    remaining = check.remaining;
    current = check.sessions;
    // The race block is stable on its own result; only a repair or a placement
    // can give it something new to act on.
    if (check.repairs.length === 0 && placed.repairs.length === 0) break;
  }
  return { sessions: current, repairs, remaining, beforeCheck: beforeCheck ?? all };
}

// The weekday of each pattern session for a rest day; the phase variants
// (mountain hike, first hike day) on the day of the session they replace.
export function patternDays(templates: SessionTemplate[], settings: PatternSettings, restDay: number): Map<string, number> {
  const pattern = arrangeWeekForRestDay(weeklyPatternTemplates(templates, { ...settings, enabledSports: { ...DEFAULT_ENABLED_SPORTS, ...settings.enabledSports } }), templates, restDay as RestWeekday, parseWeekShape(settings.weekShape)?.allowed);
  const map = new Map(pattern.map((t) => [t.id, t.defaultDayOfWeek as number]));
  for (const sw of PATTERN_SWAPS) if (map.has(sw.from)) map.set(sw.to, map.get(sw.from)!);
  return map;
}
