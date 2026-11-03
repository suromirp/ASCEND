// ASCEND: een gewicht onder de lege stang. Pure; geen React.
// Besluit: docs/beslissingen/2026-11-03-forge-na-de-eerste-vergelijking.md.
//
// Bij een oefening met een stang kan een gewicht onder de lichtste passende stang niet (10 kg bij de
// back-squat met een stang van 20). Forge blokkeert niets: onder de rij staat een zachte regel ("Lege stang
// is 20 kg. Klopt 10?"), het gewicht blijft zoals je het typte en wordt zo bewaard. Wel rekent Forge in de
// training niet stil met zo'n set als je kracht van vandaag (forgeReckon.ts#strengthFor).

import { exerciseOf, type WorkoutExercise } from './forgeWorkout';
import type { GymProfile } from './strengthSettings';
import { barFor } from './strengthWeights';
import { formatNumberNL } from '../utils/number';

// De stang van deze oefening als het gewicht van deze rij eronder ligt, anders undefined. De stang is die
// van het werkgewicht (de zwaarste stang die er niet boven ligt), zoals bij de schijven.
export function underBar(ex: WorkoutExercise, rowId: string, profile: GymProfile): number | undefined {
  if (exerciseOf(ex)?.resistance !== 'barbell') return undefined;
  const row = ex.rows.find((r) => r.id === rowId);
  const kg = row?.weightKg;
  if (kg === undefined || !(kg > 0)) return undefined;
  const top = Math.max(0, ...ex.rows.filter((r) => r.kind === 'work').map((r) => r.target.weightKg ?? r.weightKg ?? 0));
  const bar = barFor(profile, top > 0 ? top : undefined);
  return kg < bar - 1e-9 ? bar : undefined;
}

// "Lege stang is 20 kg. Klopt 10?"
export function barNote(ex: WorkoutExercise, rowId: string, profile: GymProfile): string | undefined {
  const bar = underBar(ex, rowId, profile);
  const kg = ex.rows.find((r) => r.id === rowId)?.weightKg;
  if (bar === undefined || kg === undefined) return undefined;
  return `Lege stang is ${formatNumberNL(bar, 2)} kg. Klopt ${formatNumberNL(kg, 2)}?`;
}
