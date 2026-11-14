import { useMemo } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { hasTrekGoal } from '../../engine/journeyAccess';
import { todayISO } from '../../utils/dates';

// Heeft de gebruiker een doel dat een tocht is (engine/journeyAccess.ts)?
export function useHasTrekGoal(): boolean {
  const { trainingGoals, goalMilestones } = useAppData();
  const today = todayISO();
  return useMemo(
    () => hasTrekGoal(trainingGoals, new Set(goalMilestones.map((m) => m.goalId)), today),
    [trainingGoals, goalMilestones, today],
  );
}
