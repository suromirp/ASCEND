// ASCEND: de instelling "Plaatjes bij oefeningen" (docs/beslissingen/2026-10-28-plaatjes-bij-oefeningen.md).
// Optioneel en zonder migratie: ontbreekt de sleutel of staat er iets geks, dan geldt het advies.
//
// - 'beide': het spierkaartje en, waar er een is, de tekening van de beweging (het advies).
// - 'spierkaart': alleen het spierkaartje, de tekeningen worden niet geladen.
// - 'uit': geen plaatjes; het kaartje in Forge en het blad van een oefening verdwijnen.
export type ExerciseArtMode = 'beide' | 'spierkaart' | 'uit';
export const EXERCISE_ART_MODES: ExerciseArtMode[] = ['beide', 'spierkaart', 'uit'];
export const DEFAULT_EXERCISE_ART: ExerciseArtMode = 'beide';

export function resolveExerciseArt(raw: { exerciseArt?: unknown } | undefined | null): ExerciseArtMode {
  return EXERCISE_ART_MODES.find((m) => m === raw?.exerciseArt) ?? DEFAULT_EXERCISE_ART;
}

// Mag de tekening getoond (en geladen) worden?
export const showsDrawing = (mode: ExerciseArtMode) => mode === 'beide';
// Is er een kaartje en een blad?
export const showsExerciseArt = (mode: ExerciseArtMode) => mode !== 'uit';
