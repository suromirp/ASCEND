import type { TrainingGoal } from '../models/goals';

// The goal with its target time (minutes) set to another value: what Akkoord
// does on a goal-time proposal (engine/adviceEngine.ts, TARGET-TIME). Only an
// existing target time is changed, nothing else about the goal.
export function withTargetMinutes(goal: TrainingGoal, minutes: number, now: string): TrainingGoal {
  return {
    ...goal,
    requirements: goal.requirements.map((r) => (r.kind === 'targetTime' && r.target?.unit === 'min' ? { ...r, target: { ...r.target, amount: minutes } } : r)),
    // De ingevulde gegevens gaan voor de eis (goalDetailsOf), dus die veranderen mee.
    ...(goal.details?.targetMinutes !== undefined ? { details: { ...goal.details, targetMinutes: minutes } } : {}),
    updatedAt: now,
  };
}
