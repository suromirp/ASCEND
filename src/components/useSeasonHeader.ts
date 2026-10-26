import { useAppData } from '../state/AppDataContext';
import { programAnchorDate } from '../engine/programLayout';
import { daysBetween, formatDateNL, todayISO } from '../utils/dates';
import { mainGoal as findMainGoal } from '../engine/mainGoal';

// Title and line for the header of the Jaaroverzicht: the main goal and how far away it is.
export function useSeasonHeader(): { title: string; line?: string } {
  const { trainingGoals, goalMilestones } = useAppData();
  const today = todayISO();
  const goalDate = programAnchorDate(trainingGoals, goalMilestones, today);
  const ladder = new Set(goalMilestones.map((m) => m.goalId));
  const mainGoal = findMainGoal(trainingGoals, ladder);
  const weeksLeft = goalDate ? Math.max(0, Math.ceil(daysBetween(today, goalDate) / 7)) : undefined;
  return {
    title: mainGoal ? mainGoal.name : 'Je programma',
    line: goalDate ? `${formatDateNL(goalDate)} · nog ${weeksLeft} ${weeksLeft === 1 ? 'week' : 'weken'}` : undefined,
  };
}
