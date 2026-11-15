import { useMemo } from 'react';
import { Card, Eyebrow, SecondaryButton } from '../ui';
import { useAppData } from '../../state/AppDataContext';
import { useShelterChange } from '../settings/useShelterChange';
import { SHELTER_CHECK, shelterCheckGoal, withShelterAsked, type TrekShelter } from '../../engine/trekShelter';
import { todayISO } from '../../utils/dates';

// De vraag bij een doel dat de migratie op hutten zette (engine/trekShelter.ts#needsShelterCheck), op de
// Reisplanner en de Paklijst: daar zie je wat de keuze doet. Eén keer: elk antwoord legt vast dat het
// gevraagd is. Klopt laat alles staan; Tent en Beide gaan als voorstel met Akkoord, en Liever niet laat
// doel en planning zoals ze waren.
export function ShelterCheck() {
  const { trainingGoals, goalMilestones, settings, updateSettings } = useAppData();
  const change = useShelterChange();
  const today = todayISO();
  const goal = useMemo(
    () => shelterCheckGoal(trainingGoals, new Set(goalMilestones.map((m) => m.goalId)), today, settings.shelterAsked),
    [trainingGoals, goalMilestones, today, settings.shelterAsked],
  );

  const answer = (shelter: TrekShelter | 'klopt') => {
    if (!goal) return;
    void updateSettings({ shelterAsked: withShelterAsked(settings.shelterAsked, goal.id) });
    if (shelter !== 'klopt') void change.choose(shelter);
  };

  return (
    <>
      {goal && (
        <Card className="flex flex-col gap-2">
          <Eyebrow>{SHELTER_CHECK.eyebrow}</Eyebrow>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{SHELTER_CHECK.question}</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{SHELTER_CHECK.line}</p>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => answer('klopt')}>{SHELTER_CHECK.keep}</SecondaryButton>
            <SecondaryButton onClick={() => answer('tent')}>{SHELTER_CHECK.tent}</SecondaryButton>
            <SecondaryButton onClick={() => answer('both')}>{SHELTER_CHECK.both}</SecondaryButton>
          </div>
        </Card>
      )}
      {!goal && change.note && <p className="text-sm" role="status" style={{ color: 'var(--color-ink)' }}>{change.note}</p>}
      {change.sheet}
    </>
  );
}
