import { useEffect, useMemo, useState } from 'react';
import { exerciseArt } from '../data/exerciseArt';
import { exerciseById } from '../data/exercises';
import { thumbFrame } from '../engine/exerciseArtThumb';
import { loadedDrawing, onDrawingReady, readCachedDrawing } from '../utils/exerciseArtLoader';
import { muscleMarks } from '../engine/muscleMap';
import { resolveExerciseArt, showsDrawing, showsExerciseArt } from '../engine/exerciseArtSettings';
import { resolveFigure } from '../engine/figureSettings';
import { useAppData } from '../state/AppDataContext';
import { ExerciseArtSheet } from './ExerciseArtSheet';
import { MuscleThumb } from './MuscleFigure';

// Het kaartje van 44 bij 44 px links in de kop van een oefening: de spieren die werken, klein.
// Een tik opent het blad van de oefening (ExerciseArtSheet). Zonder kaartje (de instelling
// "Plaatjes bij oefeningen" staat op Uit, of ASCEND kent de oefening niet) komt er niets te staan.
// Is de tekening er al (geladen of bewaard door de service worker), dan toont het kaartje het middelste
// beeld ervan in plaats van de spieren; anders, bij "Alleen spierkaart" en als laden mislukt, blijft het
// spierkaartje. Het kaartje haalt zelf nooit iets op (docs/beslissingen/2026-10-28-plaatjes-bij-oefeningen-kaartje.md).
// De naam staat ernaast, dus het kaartje is een knop met een eigen naam voor de schermlezer.
// Het beeld van het kaartje zelf: het middelste beeld van de tekening als die er al is, anders het
// spierkaartje. Null als er geen kaartje hoort (onbekende oefening of de instelling op Uit). Ook voor
// de strook bovenaan een training met een oefening per scherm.
export function ExerciseArtThumb({ exerciseId, size = 42 }: { exerciseId: string; size?: number }) {
  const { settings } = useAppData();
  const exercise = exerciseById(exerciseId);
  const slug = exerciseArt(exerciseId)?.slug;
  const wantsDrawing = !!slug && showsDrawing(resolveExerciseArt(settings));
  const [drawing, setDrawing] = useState(() => (wantsDrawing && slug ? loadedDrawing(slug) : undefined));
  useEffect(() => {
    if (!wantsDrawing || !slug || drawing) return;
    let live = true;
    void readCachedDrawing(slug).then((d) => { if (live && d) setDrawing(d); });
    const off = onDrawingReady((ready) => { if (live && ready === slug) setDrawing(loadedDrawing(slug)); });
    return () => { live = false; off(); };
  }, [wantsDrawing, slug, drawing]);
  const frame = useMemo(() => (wantsDrawing && drawing ? thumbFrame(drawing) : null), [wantsDrawing, drawing]);
  if (!exercise || !showsExerciseArt(resolveExerciseArt(settings))) return null;
  const { figure } = resolveFigure(settings);
  return frame ? (
    <svg viewBox={frame.viewBox.join(' ')} width={size - 2} height={size - 2} className="ea-thumb-draw" fill="currentColor" style={{ color: 'var(--color-ink)' }} aria-hidden="true" data-testid="art-thumb-drawing">
      <path fillRule="evenodd" d={frame.d} />
    </svg>
  ) : (
    <MuscleThumb marks={muscleMarks(exercise)} size={size} figure={figure} />
  );
}

export function ExerciseArtButton({ exerciseId, name }: { exerciseId: string; name: string }) {
  const { settings } = useAppData();
  const [open, setOpen] = useState(false);
  const exercise = exerciseById(exerciseId);
  if (!exercise || !showsExerciseArt(resolveExerciseArt(settings))) return null;
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
        <ExerciseArtThumb exerciseId={exerciseId} />
      </button>
      {open && <ExerciseArtSheet exerciseId={exerciseId} onClose={() => setOpen(false)} />}
    </>
  );
}
