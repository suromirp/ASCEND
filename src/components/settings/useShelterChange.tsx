import type { ReactNode } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { useHorizonChange } from '../useHorizonChange';
import { journeyTrekGoal, shelterShort, withShelter, type TrekShelter } from '../../engine/trekShelter';
import { todayISO } from '../../utils/dates';

// Slapen onderweg in Instellingen: een andere keuze verandert de soort van je tocht en daarmee de
// opbouw, dus het gaat als voorstel met Akkoord, net als Doel aanpassen op Ascend
// (docs/beslissingen/2026-11-14-keuzes-avond.md). Liever niet laat doel en planning zoals ze waren.
// `outcome`: wat er gebeurt als het voorstel een uitkomst heeft (Akkoord en opgeslagen, of Liever niet). Mislukt
// of veroudert het, dan wordt geen van beide aangeroepen en zegt `note` wat er gebeurde.
export function useShelterChange(): {
  choose: (shelter: TrekShelter, outcome?: { onStored?: () => void; onDeclined?: () => void }) => Promise<void>;
  note: string | null;
  busy: boolean;
  sheet: ReactNode;
} {
  const { trainingGoals, goalMilestones, planHorizonChange } = useAppData();
  const horizon = useHorizonChange();

  async function choose(shelter: TrekShelter, outcome: { onStored?: () => void; onDeclined?: () => void } = {}) {
    const pick = journeyTrekGoal(trainingGoals, new Set(goalMilestones.map((m) => m.goalId)), todayISO());
    if (!pick) return;
    const next = withShelter(pick.goal, shelter, new Date().toISOString());
    await horizon.propose(
      () => planHorizonChange({
        title: `Slapen onderweg: ${shelterShort(shelter).toLowerCase()}`,
        why: 'Volgt je keuze voor slapen onderweg.',
        explanation: 'Hutten of tent verandert de soort van je tocht en daarmee de afbouw. De paklijst en de Reisplanner volgen je keuze. Je rugzakgewicht blijft wat bij je doel staat. Eerst een voorstel, pas na Akkoord verandert er iets.',
        trigger: 'goal_changed',
        goals: [next],
      }),
      { eyebrow: 'Slapen onderweg', ask: 'always', alwaysAsk: true, declined: 'Je doel en je planning blijven zoals ze waren.', ...(outcome.onStored ? { onStored: outcome.onStored } : {}), ...(outcome.onDeclined ? { onDeclined: outcome.onDeclined } : {}) },
    );
  }

  return { choose, note: horizon.note, busy: horizon.busy, sheet: horizon.sheet };
}
