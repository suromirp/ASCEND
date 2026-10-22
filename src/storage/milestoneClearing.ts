// When a log clears the front-of-ladder milestone of a goal, the moment it was
// cleared is written to GoalMilestoneProgress (append-only, never rewritten).
//
// Progress and logs are read from the database here, at the moment of the
// write, never taken from React state: when several trainings are saved one
// after the other (vanzelf afvinken, MacroFactor "Alles opslaan"), a copy from
// before the first save would still call the same milestone the front of the
// ladder and write it twice. And a milestone that already has a line never
// gets a second one.

import { GoalMilestoneProgressRepo, GoalMilestonesRepo, SessionLogsRepo, TrainingGoalsRepo } from './database';
import { computeGoalProgress, requirementAutoSatisfied } from '../engine/progression';
import type { SessionLog } from '../models/training';
import { makeId } from '../utils/id';

// Resolves the title of the milestone this log cleared (the last one when
// several goals each had one), or undefined when it cleared none.
export async function recordClearedMilestones(log: SessionLog): Promise<string | undefined> {
  const [goals, milestones, progress, logs] = await Promise.all([
    TrainingGoalsRepo.getAll(),
    GoalMilestonesRepo.getAll(),
    GoalMilestoneProgressRepo.getAll(),
    SessionLogsRepo.getAll(),
  ]);
  // The log itself is already stored; the ladder is judged on what came before it.
  const before = logs.filter((l) => l.id !== log.id);
  const written = new Set(progress.map((p) => p.milestoneId));
  let clearedTitle: string | undefined;
  for (const goal of goals) {
    const forGoal = milestones.filter((m) => m.goalId === goal.id);
    if (forGoal.length === 0) continue;
    const current = computeGoalProgress(goal.id, goal.name, forGoal, progress, before).currentMilestone;
    if (!current || written.has(current.definition.id)) continue;
    if (!requirementAutoSatisfied(current.definition.requirement, [log])) continue;
    await GoalMilestoneProgressRepo.put({
      id: makeId('progress'),
      goalId: goal.id,
      milestoneId: current.definition.id,
      clearedDate: log.completedDate,
      sourceSessionLogId: log.id,
    });
    written.add(current.definition.id);
    clearedTitle = current.definition.title;
  }
  return clearedTitle;
}
