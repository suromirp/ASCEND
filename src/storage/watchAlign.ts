// ASCEND: "Garmin is leidend" in storage: a typed-in training takes over the
// watch's numbers, or gives them back (engine/watchAlign.ts,
// docs/beslissingen/2026-10-22-garmin-is-leidend.md).
//
// Every step reads the logs fresh from the database at the moment of the write,
// never from a screen's copy, and one step runs after the other (a queue), so a
// second tap or the automatic route running twice cannot tie two logs to one
// activity or write a milestone twice. What is already tied (a log with an
// externalId) is never touched again, so a second run writes nothing.
//
// The milestones: one the hand-made numbers cleared stays cleared. One that
// only the watch's numbers clear is recorded afterwards through the usual route
// (storage/milestoneClearing.ts), and the log remembers which rows that were,
// so putting the hand-made numbers back takes exactly those away again.

import { GoalMilestoneProgressRepo, SessionLogsRepo, SessionTemplatesRepo } from './database';
import { recordClearedMilestonesDetailed } from './milestoneClearing';
import { declineAlignment } from './externalActivities';
import { alignItemFor, applyAlignment, describeAlignLine, restoreManual } from '../engine/watchAlign';
import { undoTrim } from '../engine/trimLog';
import type { ExternalActivity } from '../engine/activityImport';
import { formatDateNL } from '../utils/dates';
import { inTurn } from './turn';

export interface AlignRequest {
  logId: string;
  activity: ExternalActivity;
}

export interface AlignOutcome {
  // The logs that were changed, and one line each for the notice.
  logIds: string[];
  lines: string[];
  // Milestones the watch's numbers cleared.
  clearedTitles: string[];
}

// Shared with storage/macrofactorLead.ts, storage/trim.ts and storage/sourceCorrection.ts: all of
// them replace numbers of a log, so they wait for each other (storage/turn.ts).
export { inTurn };

export function applyAlignments(requests: AlignRequest[], now: Date = new Date()): Promise<AlignOutcome> {
  return inTurn(async () => {
    const outcome: AlignOutcome = { logIds: [], lines: [], clearedTitles: [] };
    if (requests.length === 0) return outcome;
    const templates = await SessionTemplatesRepo.getAll();
    for (const { logId, activity } of requests) {
      const logs = await SessionLogsRepo.getAll();
      const log = logs.find((l) => l.id === logId);
      if (!log) continue;
      // The activity belongs to another log already: never twice.
      if (logs.some((l) => l.externalId === activity.externalId)) continue;
      const item = alignItemFor(log, activity);
      if (!item) continue;
      const updated = applyAlignment(log, activity, now);
      await SessionLogsRepo.put(updated);
      const cleared = await recordClearedMilestonesDetailed(updated, log);
      if (cleared.progressIds.length > 0 && updated.manualMeasured) {
        await SessionLogsRepo.put({ ...updated, manualMeasured: { ...updated.manualMeasured, clearedProgressIds: cleared.progressIds } });
      }
      if (cleared.title) outcome.clearedTitles.push(cleared.title);
      outcome.logIds.push(log.id);
      outcome.lines.push(describeAlignLine(item, templates.find((t) => t.id === log.templateId)?.name ?? 'Training', formatDateNL(log.completedDate)));
    }
    return outcome;
  });
}

// "Terugzetten" / "Ongedaan maken": the hand-made numbers come back, the log
// is a hand-made log again, and the activity is not matched with it again
// (declineAlignment). Returns how many logs were put back.
export function restoreAlignments(logIds: string[]): Promise<number> {
  return inTurn(async () => {
    const externalIds: string[] = [];
    let restored = 0;
    for (const id of logIds) {
      const log = (await SessionLogsRepo.getAll()).find((l) => l.id === id);
      if (!log?.manualMeasured) continue;
      for (const progressId of log.manualMeasured.clearedProgressIds ?? []) await GoalMilestoneProgressRepo.delete(progressId);
      if (log.externalId) externalIds.push(log.externalId);
      // A cut made after the watch took over is taken back first: the hand-made
      // numbers come back on top of the watch's, as they were before it.
      await SessionLogsRepo.put(restoreManual(undoTrim(log)));
      restored++;
    }
    if (externalIds.length > 0) await declineAlignment(externalIds);
    return restored;
  });
}
