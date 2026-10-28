import { useState } from 'react';
import { exerciseById } from '../data/exercises';
import { muscleMarks } from '../engine/muscleMap';
import { resolveExerciseArt, showsExerciseArt } from '../engine/exerciseArtSettings';
import { resolveFigure } from '../engine/figureSettings';
import { useAppData } from '../state/AppDataContext';
import { ExerciseArtSheet } from './ExerciseArtSheet';
import { MuscleThumb } from './MuscleFigure';

// Het kaartje van 44 bij 44 px links in de kop van een oefening: de spieren die werken, klein.
// Een tik opent het blad van de oefening (ExerciseArtSheet). Zonder kaartje (de instelling
// "Plaatjes bij oefeningen" staat op Uit, of ASCEND kent de oefening niet) komt er niets te staan.
// De naam staat ernaast, dus het kaartje is een knop met een eigen naam voor de schermlezer.
export function ExerciseArtButton({ exerciseId, name }: { exerciseId: string; name: string }) {
  const { settings } = useAppData();
  const [open, setOpen] = useState(false);
  const exercise = exerciseById(exerciseId);
  if (!exercise || !showsExerciseArt(resolveExerciseArt(settings))) return null;
  const { figure } = resolveFigure(settings);
  return (
    <>
      <button
        type="button"
        data-sheet-from
        aria-label={`Uitleg van ${name}`}
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-card-border)' }}
      >
        <MuscleThumb marks={muscleMarks(exercise)} size={42} figure={figure} />
      </button>
      {open && <ExerciseArtSheet exerciseId={exerciseId} onClose={() => setOpen(false)} />}
    </>
  );
}
