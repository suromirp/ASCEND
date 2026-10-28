import { useEffect, useMemo } from 'react';
import { artSlugsForNames } from '../engine/exerciseArtData';
import { resolveExerciseArt, showsDrawing } from '../engine/exerciseArtSettings';
import { prefetchDrawings } from '../utils/exerciseArtLoader';
import { useAppData } from '../state/AppDataContext';

// De tekeningen van de oefeningen in je eigen trainingen alvast ophalen, op de achtergrond, een voor
// een en een paar seconden na het openen, zodat het opstarten er niet op wacht. De service worker
// bewaart ze (cache "exercise-art"); daarna werken ze ook zonder netwerk. Niet bij "Alleen spierkaart"
// of "Uit", niet zonder verbinding en niet als je telefoon data wil sparen.
const START_AFTER_MS = 4000;

export function useExerciseArtPrefetch(): void {
  const { templates, settings, loading } = useAppData();
  const mode = resolveExerciseArt(settings);
  const slugKey = useMemo(
    () => artSlugsForNames(templates.flatMap((t) => (t.exercises ?? []).map((e) => e.exerciseName))).join('|'),
    [templates],
  );

  useEffect(() => {
    if (loading || !showsDrawing(mode) || slugKey === '') return;
    if (typeof navigator !== 'undefined') {
      if (navigator.onLine === false) return;
      if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    }
    let stop = false;
    const timer = setTimeout(() => {
      void prefetchDrawings(slugKey.split('|'), () => stop);
    }, START_AFTER_MS);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [loading, mode, slugKey]);
}
