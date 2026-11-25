import type { TrainingGoal } from '../models/goals';
import { mainGoal, type Ladder } from './mainGoal';
import { shortGoalName } from './settingsStatus';

// Hoe een tekst het doel noemt: het hoofddoel bij naam, of "je doel" als er
// geen is. Het hoofddoel is het doel waar de planning op draait (`mainGoal`,
// een actief doel eerst). Een lange naam wordt korter via `shortGoalName`, zodat
// de zin op 360 px blijft staan. Alleen tekst, nooit gedrag.
export const GOAL_FALLBACK = 'je doel';

export function goalRef(goals: readonly Pick<TrainingGoal, 'id' | 'status' | 'name'>[], milestones: Ladder): string {
  const goal = mainGoal(goals, milestones, 'activeFirst');
  const short = goal ? shortGoalName(goal.name) : '';
  return short || GOAL_FALLBACK;
}
