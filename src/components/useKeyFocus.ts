import { useMemo } from 'react';
import { useAppData } from '../state/AppDataContext';
import { keyFocusOf, type KeyFocus } from '../engine/keySession';
import { todayISO } from '../utils/dates';

// Wat de sleuteltraining is voor elk scherm (engine/keySession.ts#keyFocusOf): de soort van het doel bovenaan
// Ascend, of de richting zonder doel. Eén bron, zodat Ascend, de weekterugblik, Je stand en het inhalen
// dezelfde training bedoelen.
export function useKeyFocus(): KeyFocus {
  const { trainingGoals, goalMilestones, settings } = useAppData();
  const today = todayISO();
  const { direction } = settings;
  return useMemo(() => keyFocusOf(trainingGoals, goalMilestones, today, { direction }), [trainingGoals, goalMilestones, today, direction]);
}
