import { useMemo } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { journeyTrekGoal, shelterOfGoal, SHELTER_ADVICE, type TrekShelter } from '../../engine/trekShelter';
import { todayISO } from '../../utils/dates';

// Waar je slaapt op je tocht (engine/trekShelter.ts): hutten, tent of beide, en de dag van vertrek.
// De Reisplanner en de Paklijst volgen dezelfde keuze als de doelkop.
export function useTrekShelter(): { shelter: TrekShelter; departure?: string } {
  const { trainingGoals, goalMilestones } = useAppData();
  const today = todayISO();
  return useMemo(() => {
    const pick = journeyTrekGoal(trainingGoals, new Set(goalMilestones.map((m) => m.goalId)), today);
    if (!pick) return { shelter: SHELTER_ADVICE };
    return { shelter: shelterOfGoal(pick.goal, pick.isMain), ...(pick.goal.status === 'active' ? { departure: pick.goal.targetDate } : {}) };
  }, [trainingGoals, goalMilestones, today]);
}
