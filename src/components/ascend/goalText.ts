import type { GoalKindId } from '../../models/goals';
import type { GoalView } from './useGoalViews';

// Een tocht (hutten of tent) heeft de tochtmodule; de andere soorten niet.
export const isTrekGoal = (kind: GoalKindId) => kind === 'trek_hut' || kind === 'trek_tent';

// Het aantal weken tot het doel, of waar je onderweg bent, of "doorlopend" zonder datum.
export function whenText(view: GoalView): { text: string; tone: 'status' | 'dim' } {
  const t = view.timing;
  if (t.state === 'ahead') return { text: `${t.weeksLeft} ${t.weeksLeft === 1 ? 'week' : 'weken'}`, tone: 'status' };
  if (t.state === 'underway') return { text: `onderweg, dag ${t.day} van ${t.days}`, tone: 'status' };
  return { text: 'loopt gewoon door', tone: 'dim' };
}
