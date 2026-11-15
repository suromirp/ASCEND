import { useEffect, useMemo, useRef } from 'react';
import { answerShelterCheck } from './shelterCheckAnswer';
import { Card, Eyebrow, SecondaryButton } from '../ui';
import { useAppData } from '../../state/AppDataContext';
import { useShelterChange } from '../settings/useShelterChange';
import { SHELTER_CHECK, shelterCheckGoal, withShelterAsked, type TrekShelter } from '../../engine/trekShelter';
import { todayISO } from '../../utils/dates';

// De vraag bij een tocht op hutten zonder vastgelegde eigen keuze (engine/trekShelter.ts#needsShelterCheck), op de
// Reisplanner en de Paklijst: daar zie je wat de keuze doet. Eén keer: Klopt legt het antwoord meteen
// vast; Tent en Beide gaan als voorstel met Akkoord en leggen het pas vast bij Akkoord of Liever niet
// (shelterCheckAnswer.ts). Mislukt het voorstel, dan blijven de knoppen staan en zegt de regel wat er gebeurde.
export function ShelterCheck() {
  const { trainingGoals, goalMilestones, settings, updateSettings } = useAppData();
  const change = useShelterChange();
  const latestAsked = useRef<unknown>(settings.shelterAsked);
  useEffect(() => { latestAsked.current = settings.shelterAsked; }, [settings.shelterAsked]);
  const today = todayISO();
  const goal = useMemo(
    () => shelterCheckGoal(trainingGoals, new Set(goalMilestones.map((m) => m.goalId)), today, settings.shelterAsked),
    [trainingGoals, goalMilestones, today, settings.shelterAsked],
  );

  const answer = (shelter: TrekShelter | 'klopt') => {
    if (!goal) return;
    const id = goal.id;
    answerShelterCheck(shelter, {
      // Leest de instellingen van het moment zelf: na een Akkoord zijn ze intussen ververst.
      recordAsked: () => void updateSettings({ shelterAsked: withShelterAsked(latestAsked.current, id) }),
      choose: change.choose,
    });
  };

  return (
    <>
      {goal && (
        <Card className="flex flex-col gap-2">
          <Eyebrow>{SHELTER_CHECK.eyebrow}</Eyebrow>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{SHELTER_CHECK.question}</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{SHELTER_CHECK.line}</p>
          <div className="flex gap-2">
            <SecondaryButton disabled={change.busy} onClick={() => answer('klopt')}>{SHELTER_CHECK.keep}</SecondaryButton>
            <SecondaryButton disabled={change.busy} onClick={() => answer('tent')}>{SHELTER_CHECK.tent}</SecondaryButton>
            <SecondaryButton disabled={change.busy} onClick={() => answer('both')}>{SHELTER_CHECK.both}</SecondaryButton>
          </div>
          {change.note && <p className="text-sm" role="status" style={{ color: 'var(--color-ink)' }}>{change.note}</p>}
        </Card>
      )}
      {!goal && change.note && <p className="text-sm" role="status" style={{ color: 'var(--color-ink)' }}>{change.note}</p>}
      {change.sheet}
    </>
  );
}
