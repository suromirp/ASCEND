// De trainingsgids van een training, met de woorden van jouw doel (engine/guideWording.ts): "je tocht" alleen als je
// doel een tocht is.

import { useMemo } from 'react';
import { getTrainingGuide, type TrainingDayGuide } from '../data/trainingGuide';
import { guideForGoal } from '../engine/guideWording';
import { hasTrekGoal } from '../engine/journeyAccess';
import { todayISO } from '../utils/dates';
import { useAppData } from './AppDataContext';

export function useTrainingGuide(templateId: string): TrainingDayGuide | undefined {
  // Zonder doelen (een leeg toestel) is er geen tocht.
  const { trainingGoals = [], goalMilestones = [] } = useAppData();
  const trek = hasTrekGoal(trainingGoals, new Set(goalMilestones.map((m) => m.goalId)), todayISO());
  return useMemo(() => guideForGoal(getTrainingGuide(templateId), trek), [templateId, trek]);
}
