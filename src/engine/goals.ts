import type { TrainingGoal, GoalRequirement } from '../models/goals';

export function findRequirement(goal: TrainingGoal, kind: GoalRequirement['kind']): GoalRequirement | undefined {
  return goal.requirements.find((r) => r.kind === kind);
}
