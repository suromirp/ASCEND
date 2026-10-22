// ASCEND: "MacroFactor is leidend voor kracht" in storage: a strength log that
// exists already takes over the numbers of a MacroFactor workout, or gives them
// back (engine/macrofactorLead.ts,
// docs/beslissingen/2026-10-22-macrofactor-leidend-voor-kracht.md).
//
// Built the way storage/watchAlign.ts is: every step reads the logs fresh from
// the database at the moment of the write, never from a screen's copy, and one
// step runs after the other (the same queue), so a second tap cannot tie one
// workout to two logs or write a milestone twice.
//
// The milestones: one the log's own numbers already cleared stays cleared. One
// that only MacroFactor's numbers clear is recorded afterwards through the usual
// route (storage/milestoneClearing.ts, fresh and never twice), and the log
// remembers which rows that were, so putting the old numbers back takes exactly
// those away again.

import { GoalMilestoneProgressRepo, SessionLogsRepo, SessionTemplatesRepo } from './database';
import { recordClearedMilestonesDetailed } from './milestoneClearing';
import { inTurn } from './watchAlign';
import { dismissWorkouts } from './macrofactor';
import { applyStrengthTakeover, describeStrengthChange, strengthChangeFor } from '../engine/macrofactorLead';
import type { MacroFactorWorkout } from '../engine/macrofactorImport';
import { restoreManual } from '../engine/watchAlign';
import { formatDateNL } from '../utils/dates';

export interface TakeoverRequest {
  logId: string;
  workout: MacroFactorWorkout;
  templateId: string;
}

export interface TakeoverOutcome {
  // The logs that were changed, with the milestone each one cleared (if any).
  moments: { logId: string; clearedTitle?: string }[];
  // One line each: "Benen A 14 oktober: duur 75 min wordt 62 min".
  lines: string[];
}

export function applyStrengthTakeovers(requests: TakeoverRequest[], now: Date = new Date()): Promise<TakeoverOutcome> {
  return inTurn(async () => {
    const outcome: TakeoverOutcome = { moments: [], lines: [] };
    if (requests.length === 0) return outcome;
    const templates = await SessionTemplatesRepo.getAll();
    for (const { logId, workout, templateId } of requests) {
      const template = templates.find((t) => t.id === templateId);
      const logs = await SessionLogsRepo.getAll();
      const log = logs.find((l) => l.id === logId);
      if (!log || !template) continue;
      // The workout belongs to another log already: never twice.
      if (logs.some((l) => l.externalId === workout.externalId || l.manualMeasured?.strength?.workoutId === workout.externalId)) continue;
      const change = strengthChangeFor(log, workout, template);
      const updated = applyStrengthTakeover(log, workout, template, now);
      if (!change || updated === log) continue;
      await SessionLogsRepo.put(updated);
      const cleared = await recordClearedMilestonesDetailed(updated, log);
      if (cleared.progressIds.length > 0 && updated.manualMeasured) {
        await SessionLogsRepo.put({ ...updated, manualMeasured: { ...updated.manualMeasured, clearedProgressIds: cleared.progressIds } });
      }
      outcome.moments.push({ logId: log.id, clearedTitle: cleared.title });
      outcome.lines.push(`${template.name} ${formatDateNL(log.completedDate)}: ${describeStrengthChange(change)}`);
    }
    return outcome;
  });
}

// "Terugzetten": the log's own numbers come back, it is a hand-made log again,
// and the workout is not offered again. Returns how many logs were put back.
export function restoreStrengthTakeovers(logIds: string[]): Promise<number> {
  return inTurn(async () => {
    const workoutIds: string[] = [];
    let restored = 0;
    for (const id of logIds) {
      const log = (await SessionLogsRepo.getAll()).find((l) => l.id === id);
      const strength = log?.manualMeasured?.strength;
      if (!log || !strength) continue;
      for (const progressId of log.manualMeasured?.clearedProgressIds ?? []) await GoalMilestoneProgressRepo.delete(progressId);
      workoutIds.push(strength.workoutId);
      await SessionLogsRepo.put(restoreManual(log));
      restored++;
    }
    await dismissWorkouts(workoutIds);
    return restored;
  });
}
