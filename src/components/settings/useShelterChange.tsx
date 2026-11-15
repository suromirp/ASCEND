import type { ReactNode } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { useHorizonChange } from '../useHorizonChange';
import { journeyTrekGoal, shelterShort, withShelter, type TrekShelter } from '../../engine/trekShelter';
import { todayISO } from '../../utils/dates';

// Slapen onderweg in Instellingen: een andere keuze verandert de soort van je tocht en daarmee de
// opbouw, dus het gaat als voorstel met Akkoord, net als Doel aanpassen op Ascend
// (docs/beslissingen/2026-11-14-keuzes-avond.md). Liever niet laat doel en planning zoals ze waren.
export function useShelterChange(): { choose: (shelter: TrekShelter) => Promise<void>; note: string | null; sheet: ReactNode } {
  const { trainingGoals, goalMilestones, planHorizonChange } = useAppData();
  const horizon = useHorizonChange();

  async function choose(shelter: TrekShelter) {
    const pick = journeyTrekGoal(trainingGoals, new Set(goalMilestones.map((m) => m.goalId)), todayISO());
    if (!pick) return;
    const next = withShelter(pick.goal, shelter, new Date().toISOString());
    await horizon.propose(
      () => planHorizonChange({
        title: `Slapen onderweg: ${shelterShort(shelter).toLowerCase()}`,
        why: 'Volgt je keuze voor slapen onderweg.',
        explanation: 'Hutten of tent verandert je rugzak en je opbouw. Eerst een voorstel, pas na Akkoord verandert er iets. De paklijst en de Reisplanner volgen je keuze.',
        trigger: 'goal_changed',
        goals: [next],
      }),
      { eyebrow: 'Slapen onderweg', ask: 'always', alwaysAsk: true, declined: 'Je doel en je planning blijven zoals ze waren.' },
    );
  }

  return { choose, note: horizon.note, sheet: horizon.sheet };
}
